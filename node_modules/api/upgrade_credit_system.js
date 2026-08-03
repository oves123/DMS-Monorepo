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

        // 1. Add wallet_balance to Users
        const checkUserCol = await sql.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'wallet_balance'
        `);
        if (checkUserCol.recordset.length === 0) {
            await sql.query(`ALTER TABLE Users ADD wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0;`);
            console.log('Added wallet_balance to Users.');
        }

        // 2. Add credit_applied, extra_discount, discount_reason to Invoices
        const checkInvCol = await sql.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Invoices' AND COLUMN_NAME = 'credit_applied'
        `);
        if (checkInvCol.recordset.length === 0) {
            await sql.query(`
                ALTER TABLE Invoices ADD credit_applied DECIMAL(12,2) NOT NULL DEFAULT 0;
                ALTER TABLE Invoices ADD extra_discount DECIMAL(12,2) NOT NULL DEFAULT 0;
                ALTER TABLE Invoices ADD discount_reason VARCHAR(255) NULL;
            `);
            console.log('Added discount columns to Invoices.');
        }

        // 3. Create Claims table
        const checkClaims = await sql.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'Claims'
        `);
        if (checkClaims.recordset.length === 0) {
            await sql.query(`
                CREATE TABLE Claims (
                    claim_id INT IDENTITY(1,1) PRIMARY KEY,
                    distributor_id INT FOREIGN KEY REFERENCES Users(user_id),
                    order_id INT FOREIGN KEY REFERENCES Orders(order_id),
                    variant_id INT FOREIGN KEY REFERENCES ProductVariants(variant_id),
                    quantity INT NOT NULL,
                    reason VARCHAR(255) NOT NULL,
                    image_url VARCHAR(255) NULL,
                    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
                    created_at DATETIME DEFAULT GETDATE()
                );
            `);
            console.log('Created Claims table.');
        }

        // 4. Create CreditNotes table
        const checkNotes = await sql.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'CreditNotes'
        `);
        if (checkNotes.recordset.length === 0) {
            await sql.query(`
                CREATE TABLE CreditNotes (
                    credit_note_id INT IDENTITY(1,1) PRIMARY KEY,
                    claim_id INT FOREIGN KEY REFERENCES Claims(claim_id) ON DELETE CASCADE,
                    distributor_id INT FOREIGN KEY REFERENCES Users(user_id),
                    amount DECIMAL(12,2) NOT NULL,
                    pdf_url VARCHAR(255) NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
            `);
            console.log('Created CreditNotes table.');
        }

        console.log('Database upgrade complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error during upgrade:', err);
        process.exit(1);
    }
}

upgrade();
