const express = require("express");
const path = require("path");
const sequelize = require("./config/database");
const Category = require("./models/Category");
const Bouquet = require("./models/Bouquet");

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

Category.hasMany(Bouquet);
Bouquet.belongsTo(Category);

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
        
        const count = await Bouquet.count();
      /*  if (count === 0) {
            console.log("База порожня. Заповнюємо початковими квітами...");
            const spring = await Category.create({ name: "Весняні квіти" });
    const roses = await Category.create({ name: "Троянди" });
    const classic = await Category.create({ name: "Класика" });

    await Bouquet.bulkCreate([
      {
        name: "Малий букет",
        description:
          "Чарівний малий букет, який додасть ніжності у ваше життя.",
        price: 1600,
        imageUrl: "./images/bouquet_1.png",
        CategoryId: spring.id,
      },
      {
        name: "Нобіліс",
        description: "Справжня класика для особливих моментів.",
        price: 99,
        imageUrl: "./images/bouquet_2.png",
        CategoryId: classic.id,
      },
      {
        name: "Троянда Freedom 51 шт.",
        description: "Елегантні троянди, які завжди в моді.<br><br>",
        price: 5900,
        imageUrl: "./images/bouquet_3.png",
        CategoryId: roses.id,
      },
      {
        name: "Малий букет",
        description: "Прекрасне поєднання квітів для кожного свята.",
        price: 1200,
        imageUrl: "./images/bouquet_4.png",
        CategoryId: spring.id,
      },
      {
        name: 'Букет "Ранкова роса"',
        description:
          "Свіжий та ніжний букет із рожевих півоній та білих лілій, що нагадує світанок.",
        price: 2300,
        imageUrl: "./images/bouquet_2.png",
        CategoryId: spring.id,
      },
      {
        name: 'Букет "Захід сонця"',
        description:
          "Насичені відтінки помаранчевих троянд і червоних гербер, що передають тепло вечора.",
        price: 3100,
        imageUrl: "./images/bouquet_3.png",
        CategoryId: roses.id,
      },
      {
        name: 'Букет "Літній вітерець"',
        description:
          "Повітряна композиція з білих ромашок та блакитних ірисів, що дарує свіжість літа.",
        price: 1800,
        imageUrl: "./images/bouquet_4.png",
        CategoryId: spring.id,
      },
      {
        name: 'Букет "Ніжні почуття"',
        description:
          "Композиція з білих півоній і рожевих троянд, що символізує чисті почуття.<br>",
        price: 2700,
        imageUrl: "./images/bouquet_2.png",
        CategoryId: roses.id,
      },
    ]);
            console.log("Базу успішно заповнено!");
        } else {
            console.log(`У базі вже є ${count} букетів. Дані збережено!`);
        }*/

        app.listen(PORT, () => {
            console.log(`Сервер запущено: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Помилка запуску сервера:", error);
    }
}

startServer();
