const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const morgan = require("morgan");
const winston = require("winston");
const multer = require("multer");
const fs = require("fs");

const sequelize = require("./config/database");
const Category = require("./models/Category");
const Bouquet = require("./models/Bouquet");
const User = require("./models/User");

const app = express();
const PORT = 3000;
const SECRET_KEY = "super_secret_floral_key_123";
const REFRESH_SECRET_KEY = "super_refresh_floral_key_123";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: "app.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Недопустимий тип файлу. Дозволено лише JPG, PNG та PDF."),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.static(__dirname));

app.use(morgan("dev"));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} - ${duration}ms`);
  });
  next();
});

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: "Забагато спроб входу. Зачекайте 1 хвилину." },
});

Category.hasMany(Bouquet);
Bouquet.belongsTo(Category);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Токен відсутній." });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err)
      return res.status(403).json({ error: "Сесія недійсна. Увійдіть знову." });
    req.user = user;
    next();
  });
};

app.get("/status", (req, res) => {
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    const err = new Error("Файл не вибрано або невірний формат");
    err.status = 400;
    throw err;
  }
  logger.info(`Завантажено файл: ${req.file.filename}`);
  res.json({ message: "Файл завантажено успішно", file: req.file });
});

app.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    const err = new Error("Файли не вибрані");
    err.status = 400;
    throw err;
  }
  logger.info(`Завантажено декілька файлів: ${req.files.length} шт.`);
  res.json({ message: "Файли завантажено успішно", files: req.files });
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      const err = new Error("Всі поля обов'язкові");
      err.status = 400;
      return next(err);
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      const err = new Error(
        "Пароль має містити мін. 6 символів, 1 велику літеру та 1 цифру.",
      );
      err.status = 400;
      return next(err);
    }

    if (password !== confirmPassword) {
      const err = new Error("Паролі не співпадають");
      err.status = 400;
      return next(err);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const err = new Error("Користувач вже існує");
      err.status = 400;
      return next(err);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });

    logger.info(`Користувач зареєструвався: ${email}`);

    res.status(201).json({
      message: "Реєстрація успішна!",
      userId: newUser.id,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !user.password) {
      const err = new Error("Користувача не знайдено.");
      err.status = 400;
      return next(err);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error("Невірний пароль");
      err.status = 400;
      return next(err);
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "15m" },
    );
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET_KEY, {
      expiresIn: "7d",
    });

    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`Вхід користувача: ${email}`);

    res.json({ message: "Вхід успішний", accessToken });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-email", async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (user) {
      user.isVerified = true;
      await user.save();
      res.json({ message: "Email успішно підтверджено!" });
    } else {
      res.status(404).json({ error: "Користувача не знайдено" });
    }
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/auth/profile/verify",
  authenticateToken,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);
      if (user) {
        user.isVerified = true;
        await user.save();
        res.json({ message: "Email успішно підтверджено!" });
      } else {
        res.status(404).json({ error: "Користувача не знайдено" });
      }
    } catch (error) {
      next(error);
    }
  },
);

app.post("/api/auth/refresh", async (req, res, next) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: "Refresh токен відсутній" });

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET_KEY);
    const user = await User.findByPk(decoded.id);

    if (!user || user.refreshToken !== token)
      return res.status(403).json({ error: "Недійсний refresh токен" });

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "15m" },
    );
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ error: "Прострочений токен" });
  }
});

app.post("/api/auth/logout", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    logger.info(`Вихід користувача: ${req.user.email}`);
    res.json({ message: "Ви вийшли з системи" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/profile", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["email", "role", "isVerified"],
    });
    if (!user)
      return res.status(404).json({ error: "Користувача не знайдено" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.put("/api/auth/profile", authenticateToken, async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user)
      return res.status(404).json({ error: "Користувача не знайдено" });

    if (email) user.email = email;
    await user.save();
    res.json({
      message: "Email успішно оновлено!",
      user: { email: user.email },
    });
  } catch (error) {
    next(error);
  }
});

app.put(
  "/api/auth/change-password",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        const err = new Error("Невірний поточний пароль");
        err.status = 400;
        return next(err);
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
      if (!passwordRegex.test(newPassword)) {
        const err = new Error(
          "Новий пароль має містити мін. 6 символів, 1 велику літеру(латиниця) та 1 цифру.",
        );
        err.status = 400;
        return next(err);
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({ message: "Пароль змінено!" });
    } catch (error) {
      next(error);
    }
  },
);

app.delete("/api/auth/profile", authenticateToken, async (req, res, next) => {
  try {
    const deletedRows = await User.destroy({ where: { id: req.user.id } });
    if (deletedRows > 0) {
      logger.info(`Користувач видалив акаунт: ID ${req.user.id}`);
      res.json({ message: "Ваш акаунт було успішно і назавжди видалено." });
    } else {
      res
        .status(404)
        .json({ error: "Користувача не знайдено або він вже був видалений." });
    }
  } catch (error) {
    next(error);
  }
});

app.get("/api/bouquets", async (req, res, next) => {
  try {
    const bouquets = await Bouquet.findAll({ include: Category });
    res.json(bouquets);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  logger.error(`Помилка: ${err.message}`);

  res.status(err.status || 500).json({
    error: err.message || "Внутрішня помилка сервера",
  });
});

async function startServer() {
  try {
    await sequelize.sync({ alter: true });
    logger.info("База даних синхронізована.");
    app.listen(PORT, () => {
      console.log(`Сервер успішно запущено: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("КРИТИЧНА ПОМИЛКА ПРИ ЗАПУСКУ СЕРВЕРА:");
    console.error(error);
    logger.error(`Помилка бази даних: ${error.message}`);
  }
}

startServer();
