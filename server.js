const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const sequelize = require("./config/database");
const Category = require("./models/Category");
const Bouquet = require("./models/Bouquet");
const User = require("./models/User");

const app = express();
const PORT = 3000;
const SECRET_KEY = "super_secret_floral_key_123";
const REFRESH_SECRET_KEY = "super_refresh_floral_key_123";

app.use(express.json());
app.use(express.static(__dirname));
app.use(morgan("dev"));

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
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

// Реєстрація
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword)
      return res.status(400).json({ error: "Всі поля обов'язкові" });

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .json({
          error:
            "Пароль має містити мін. 6 символів, 1 велику літеру та 1 цифру.",
        });
    }

    if (password !== confirmPassword)
      return res.status(400).json({ error: "Паролі не співпадають" });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser)
      return res.status(400).json({ error: "Користувач вже існує" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });

    res.status(201).json({
      message: "Реєстрація успішна!",
      userId: newUser.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Помилка сервера при реєстрації" });
  }
});

// Завдання 19: Симуляція підтвердження Email
app.post("/api/auth/verify-email", async (req, res) => {
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
    res.status(500).json({ error: "Помилка сервера" });
  }
});

app.post("/api/auth/profile/verify", authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// Логін
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !user.password)
      return res.status(400).json({ error: "Користувача не знайдено." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Невірний пароль" });

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

    res.json({ message: "Вхід успішний", accessToken });
  } catch (error) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
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

app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ message: "Ви вийшли з системи" });
  } catch (error) {
    res.status(500).json({ error: "Помилка" });
  }
});

// Профіль
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["email", "role", "isVerified"],
    });
    if (!user)
      return res.status(404).json({ error: "Користувача не знайдено" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Помилка" });
  }
});

app.put("/api/auth/profile", authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: "Помилка" });
  }
});

app.put("/api/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Невірний поточний пароль" });

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res
        .status(400)
        .json({
          error:
            "Новий пароль має містити мін. 6 символів, 1 велику літеру(латиниця) та 1 цифру.",
        });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Пароль змінено!" });
  } catch (error) {
    res.status(500).json({ error: "Помилка" });
  }
});

app.delete("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const deletedRows = await User.destroy({ where: { id: req.user.id } });
    if (deletedRows > 0) {
      res.json({ message: "Ваш акаунт було успішно і назавжди видалено." });
    } else {
      res
        .status(404)
        .json({ error: "Користувача не знайдено або він вже був видалений." });
    }
  } catch (error) {
    console.error("Помилка видалення:", error);
    res.status(500).json({ error: "Внутрішня помилка сервера при видаленні." });
  }
});

app.get("/api/bouquets", async (req, res) => {
  try {
    const bouquets = await Bouquet.findAll({ include: Category });
    res.json(bouquets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  try {
    await sequelize.sync({ alter: true });
    console.log("База даних синхронізована.");
    app.listen(PORT, () =>
      console.log(`Сервер запущено: http://localhost:${PORT}`),
    );
  } catch (error) {
    console.error(error);
  }
}
startServer();
