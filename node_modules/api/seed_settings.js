const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

async function seedSettings() {
    try {
        await sql.connect(dbConfig);
        console.log('Connected to DB');

        // Create table
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CompanySettings' and xtype='U')
            CREATE TABLE CompanySettings (
                setting_id INT PRIMARY KEY DEFAULT 1,
                account_name VARCHAR(255),
                account_no VARCHAR(255),
                bank_name VARCHAR(255),
                ifsc_code VARCHAR(255),
                branch VARCHAR(255),
                email VARCHAR(255),
                qr_code_image VARBINARY(MAX),
                qr_code_mimetype VARCHAR(50)
            )
        `);
        console.log('CompanySettings table ensured.');

        // Check if setting exists
        const existsResult = await sql.query(`SELECT setting_id FROM CompanySettings WHERE setting_id = 1`);
        
        let qrCodeBinary = null;
        const imagePath = "D:\\cashmitra\\DMS\\etc files\\WhatsApp Image 2026-08-03 at 3.52.52 PM.jpeg";
        try {
            qrCodeBinary = fs.readFileSync(imagePath);
            console.log('QR Code image read successfully.');
        } catch (err) {
            console.error('Could not read QR Code image:', err.message);
        }

        const request = new sql.Request();
        request.input('account_name', sql.VarChar, 'Anand Enterprises');
        request.input('account_no', sql.VarChar, '317101010081769');
        request.input('bank_name', sql.VarChar, 'Union Bank of India');
        request.input('ifsc_code', sql.VarChar, 'UBIN0531715');
        request.input('branch', sql.VarChar, 'GOREGAON WEST');
        request.input('email', sql.VarChar, 'anandenterprisesmum@gmail.com');
        request.input('qr_code_image', sql.VarBinary, qrCodeBinary);
        request.input('qr_code_mimetype', sql.VarChar, 'image/jpeg');

        if (existsResult.recordset.length === 0) {
            await request.query(`
                INSERT INTO CompanySettings 
                (setting_id, account_name, account_no, bank_name, ifsc_code, branch, email, qr_code_image, qr_code_mimetype)
                VALUES (1, @account_name, @account_no, @bank_name, @ifsc_code, @branch, @email, @qr_code_image, @qr_code_mimetype)
            `);
            console.log('CompanySettings seeded.');
        } else {
            await request.query(`
                UPDATE CompanySettings SET 
                    account_name = @account_name,
                    account_no = @account_no,
                    bank_name = @bank_name,
                    ifsc_code = @ifsc_code,
                    branch = @branch,
                    email = @email,
                    qr_code_image = @qr_code_image,
                    qr_code_mimetype = @qr_code_mimetype
                WHERE setting_id = 1
            `);
            console.log('CompanySettings updated.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedSettings();
