const { sql, connectDB } = require('./config/db');

async function addAddressColumn() {
    try {
        const pool = await connectDB();
        await pool.request().query(`
            ALTER TABLE Users
            ADD address VARCHAR(255) NULL
        `);
        console.log("Successfully added address column to Users table.");
    } catch(err) {
        if (err.message.includes("already exists")) {
            console.log("Address column already exists.");
        } else {
            console.error("SQL Error:", err.message);
        }
    }
    process.exit();
}

addAddressColumn();
