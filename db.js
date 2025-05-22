const {Pool} = require("pg");
require("dotenv").config();

const pool = new Pool({
    // host: process.env.DB_HOST,
    // user: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,
    // database: process.env.DB_URL,
    // port: process.env.DB_PORT || 5432,
    connectionString: process.env.DB_URL,
    ssl: false,
});

// module.exports = pool;
module.exports = {
    query: (text, params) => pool.query(text, params),
};
