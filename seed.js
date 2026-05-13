const sequelize = require("./config/database");
const Category = require("./models/Category");
const Bouquet = require("./models/Bouquet");

async function restoreOriginalData() {
  try {
    console.log("Відновлення даних...");

    Category.hasMany(Bouquet, { foreignKey: "CategoryId" });
    Bouquet.belongsTo(Category, { foreignKey: "CategoryId" });

    await sequelize.sync({ force: true });

    const tulips = await Category.create({ name: "Тюльпани" });
    const roses = await Category.create({ name: "Троянди" });

    await Bouquet.bulkCreate([
      {
        name: "Букет весняних тюльпанів",
        description: "Ніжний весняний букет для гарного настрою.",
        price: 1200,
        imageUrl: "./images/bouquet_1.png",
        CategoryId: tulips.id,
      },
      {
        name: "Червоні тюльпани 201шт.",
        description: "Ніжні білі тюльпани для гарного настрою.",
        price: 55000,
        imageUrl: "./images/bouquet_1.png",
        CategoryId: tulips.id,
      },
      {
        name: "Величезна Корзина Тюльпанів",
        description: "Дуже велика корзина 201шт.",
        price: 25000,
        imageUrl: "./images/bouquet_3.png",
        CategoryId: tulips.id,
      },
      {
        name: "Біла ніжність",
        description: "Букет із білих тюльпанів.",
        price: 1500,
        imageUrl: "./images/bouquet_2.png",
        CategoryId: tulips.id,
      },
      {
        name: "Троянди Преміум",
        description: "Червоні троянди вищого сорту.",
        price: 3200,
        imageUrl: "./images/bouquet_5.png",
        CategoryId: roses.id,
      },
    ]);

    console.log("Дані відновлено!");
    process.exit(0);
  } catch (error) {
    console.error("Помилка:", error);
    process.exit(1);
  }
}

restoreOriginalData();
