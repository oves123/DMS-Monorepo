const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // For Azure, set to true. For local, it often needs to be true in newer SSMS.
        trustServerCertificate: true, // Extremely important for local dev (bypasses SSL error)
        useUTC: false // Treats SQL Server DATETIME as local time, not UTC
    }
};

const connectDB = async () => {
    try {
        const pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server Database: ' + process.env.DB_NAME);
        return pool;
    } catch (err) {
        console.error('❌ Database Connection Failed!', err);
        process.exit(1);
    }
};

module.exports = {
    sql,
    connectDB
};
