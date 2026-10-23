const {Pool} = require('pg');
require('dotenv').config();

if (process.env.TEST_DB_NAME !== 'utility_payment_test') {
    throw new Error('Refusing to connect to a non-test database');
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.TEST_DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function testConnection() {
    try {
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log(result.rows);
        console.log('Test database connected successfully');
        console.log(result.rows[0]);
    } catch (error) {
        console.error('Test database connection failed:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

testConnection();
