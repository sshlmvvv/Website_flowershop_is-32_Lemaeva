const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("flower_shop_db", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

module.exports = sequelize;
