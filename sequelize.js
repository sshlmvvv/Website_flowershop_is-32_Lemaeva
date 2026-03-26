const sequelize = require("./config/database");
const Category = require("./models/Category");
const Bouquet = require("./models/Bouquet");

Category.hasMany(Bouquet);
Bouquet.belongsTo(Category);

async function showSequelizeMagic() {
  try {
    await sequelize.authenticate();
    console.log("Успішно підключено!");

    console.log("\nCREATE");
    const rosesCategory = await Category.findOne({
      where: { name: "Тюльпани" },
    });

    let categoryId = null;
    if (rosesCategory) {
      categoryId = rosesCategory.id;
    } else {
      console.log("Категорію не знайдено (NULL)");
    }

    /*const newBouquet = await Bouquet.create({
      name: "Величезна Корзина Троянд",
      description: "Дуже велика корзина 501шт.",
      price: 35000,
      imageUrl: "./images/bouquet_3.png",
      CategoryId: categoryId,
    });
    console.log(`букет: ${newBouquet.name} за ${newBouquet.price} грн`);*/

    console.log("\nREAD");
    const foundBouquet = await Bouquet.findOne({
      where: { name: "Білі тюльпани 201шт." },
    });

    if (foundBouquet) {
      console.log(`${foundBouquet.name}`);

      console.log("\nUPDATE");
      foundBouquet.price = 40000;
      await foundBouquet.save();
      console.log(` ${foundBouquet.price} грн`);

      /* console.log("\nDELETE");
      await foundBouquet.destroy();
      console.log("Видалено"); */
    } else {
      console.log("Букет не знайдено!");
    }
  } catch (error) {
    console.error("Помилка:", error);
  } finally {
    await sequelize.close();
  }
}

showSequelizeMagic();
