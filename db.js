const {Pool} = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: false,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
