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
        await sql.query(`
            IF EXISTS(SELECT * FROM sys.columns WHERE Name = N'image_url' AND Object_ID = Object_ID(N'Claims'))
            BEGIN
                ALTER TABLE Claims DROP COLUMN image_url;
                ALTER TABLE Claims ADD image_binary VARBINARY(MAX);
            END
        `);
        console.log('Altered Claims table.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
upgrade();
