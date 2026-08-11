require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function runMigration() {
    try {
        await sql.connect(config);
        console.log("Connected to database.");

        const request = new sql.Request();

        console.log("Adding mrp column to ProductVariants...");
        try {
            await request.query(`
                ALTER TABLE ProductVariants
                ADD mrp DECIMAL(10,2) NULL
            `);
            console.log("Successfully added mrp column.");
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log("mrp column already exists, skipping...");
            } else {
                throw err;
            }
        }

        console.log("Migration complete!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await sql.close();
    }
}

runMigration();
