require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

async function upgrade() {
    try {
        await sql.connect(dbConfig);
        console.log('Connected to DB');

        // Check if column exists, if not add it
        const checkCol = await sql.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Inventory' AND COLUMN_NAME = 'low_stock_threshold'
        `);

        if (checkCol.recordset.length === 0) {
            await sql.query(`
                ALTER TABLE Inventory ADD low_stock_threshold INT NOT NULL DEFAULT 50;
            `);
            console.log('Added low_stock_threshold column to Inventory table.');
        } else {
            console.log('Column low_stock_threshold already exists.');
        }

        console.log('Database upgrade complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error during upgrade:', err);
        process.exit(1);
    }
}

upgrade();
