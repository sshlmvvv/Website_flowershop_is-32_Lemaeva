const mysql = require("mysql2/promise");

async function runRawSql() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "flower_shop_db",
  });

  console.log("Успішно підключено до MySQL");

  try {
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            )
        `);

    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Bouquets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                price INT NOT NULL,
                imageUrl VARCHAR(255),
                CategoryId INT,
                FOREIGN KEY (CategoryId) REFERENCES Categories(id) ON DELETE CASCADE
            )
        `);
    console.log("Таблиці 'Categories' та 'Bouquets' успішно створені");

    /*const [categoryResult] = await connection.execute(
      `INSERT INTO Categories (name) VALUES ('Тюльпани')`,
    );
    const categoryId = categoryResult.insertId;

    await connection.execute(
      `INSERT INTO Bouquets (name, description, price, imageUrl, CategoryId) VALUES ('Букет весняних тюльпанів', 'Ніжний весняний букет.', 1200, './images/bouquet_1.png', ?)`,
      [categoryId],
    );
    console.log("Букет та Категорію додано в базу");*/

    /*const [categoriesFromDb] = await connection.execute(
      `SELECT id FROM Categories WHERE name = 'Тюльпани'`,
    );

    if (categoriesFromDb.length > 0) {
      const foundCategoryId = categoriesFromDb[0].id;

      await connection.execute(
        `INSERT INTO Bouquets (name, description, price, imageUrl, CategoryId) VALUES ('Червоні тюльпани 201шт.', 'Ніжні білі тюльпани для гарного настрою.', 55000, './images/bouquet_1.png', ?)`,
        [foundCategoryId],
      );
      console.log("Букет успішно додано в базу!");
    } else {
      console.log("Категорію не знайдено!");
    }*/

    /*const [rows] = await connection.execute(`
            SELECT Bouquets.name AS BouquetName, Bouquets.price, Categories.name AS CategoryName 
            FROM Bouquets 
            JOIN Categories ON Bouquets.CategoryId = Categories.id
        `);
    console.log("Знайдено в базі:");
    console.log(rows);*/

    /*await connection.execute(
      `UPDATE Bouquets SET price = 90000 WHERE name = 'Червоні тюльпани 201шт.'`,
    );
    console.log("Ціну букета оновлено на 90000 грн");*/

    await connection.execute(
      `DELETE FROM Bouquets WHERE name = 'Червоні тюльпани 201шт.'`,
    );
    console.log("Букет успішно видалено");
  } catch (error) {
    console.error("Помилка бази даних:", error.message);
  } finally {
    await connection.end();
  }
}

runRawSql();
