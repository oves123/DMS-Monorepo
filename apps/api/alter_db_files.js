const sql = require('mssql');
const dbConfig = require('./config/db');

async function alterDB() {
    try {
        const pool = await dbConfig.connectDB();
        await pool.request().query(`
            ALTER TABLE Users
            ADD owner_name VARCHAR(100) NULL,
                fssai_number VARCHAR(50) NULL,
                pan_card VARBINARY(MAX) NULL,
                aadhar_card VARBINARY(MAX) NULL,
                photo VARBINARY(MAX) NULL;
        `);
        console.log("Database altered successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error altering DB", err);
        process.exit(1);
    }
}
alterDB();
