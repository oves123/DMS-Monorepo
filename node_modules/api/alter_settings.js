const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME || 'DMS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function alterCompanySettings() {
    try {
        await sql.connect(config);
        
        await sql.query(`
            ALTER TABLE CompanySettings ADD claim_window_days INT DEFAULT 7;
        `);
        
        console.log('CompanySettings table updated successfully with claim_window_days!');
        process.exit(0);
    } catch (err) {
        if (err.message.includes('already has a column')) {
            console.log('Column already exists!');
            process.exit(0);
        } else {
            console.error('Error updating CompanySettings table:', err);
            process.exit(1);
        }
    }
}

alterCompanySettings();
