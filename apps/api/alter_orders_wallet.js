const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME || 'DMS', // fallback to DMS
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function alterOrdersTable() {
    try {
        await sql.connect(config);
        
        await sql.query(`
            ALTER TABLE Orders ADD apply_wallet BIT DEFAULT 0;
        `);
        
        console.log('Orders table updated successfully with apply_wallet!');
        process.exit(0);
    } catch (err) {
        if (err.message.includes('already has a column')) {
            console.log('Column already exists!');
            process.exit(0);
        } else {
            console.error('Error updating Orders table:', err);
            process.exit(1);
        }
    }
}

alterOrdersTable();
