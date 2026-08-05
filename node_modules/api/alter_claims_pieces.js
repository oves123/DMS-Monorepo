require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

async function upgrade() {
    try {
        await sql.connect(dbConfig);
        console.log('Connected to DB.');

        // 1. Alter Claims Table
        await sql.query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'pieces_qty' AND Object_ID = Object_ID(N'Claims'))
            BEGIN
                ALTER TABLE Claims ADD pieces_qty INT NOT NULL DEFAULT 0;
            END
        `);
        console.log('Added pieces_qty to Claims.');

        // 2. Alter ProductVariants Table
        await sql.query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'pieces_per_box' AND Object_ID = Object_ID(N'ProductVariants'))
            BEGIN
                ALTER TABLE ProductVariants ADD pieces_per_box INT NULL;
            END
        `);
        console.log('Added pieces_per_box to ProductVariants.');

        // 3. Auto-populate pieces_per_box based on pack_size
        const result = await sql.query(`SELECT variant_id, pack_size FROM ProductVariants WHERE pieces_per_box IS NULL`);
        
        let updatedCount = 0;
        for (const row of result.recordset) {
            let pieces = null;
            if (row.pack_size) {
                // Look for a number followed by PCS, or just a number inside parenthesis
                const match = row.pack_size.match(/(?:(?:\\(|\\s|^))(\\d+)\\s*(?:PCS|pcs|pieces)(?:\\)|\\s|$)/i);
                if (match && match[1]) {
                    pieces = parseInt(match[1]);
                } else {
                    // Try another common format, e.g., finding the highest number or just any number if it says PCS
                    const genericMatch = row.pack_size.match(/(\\d+)\\s*PCS/i);
                    if (genericMatch && genericMatch[1]) {
                        pieces = parseInt(genericMatch[1]);
                    }
                }
            }
            
            // Default to 1 if we couldn't parse it
            if (!pieces || isNaN(pieces)) {
                pieces = 1;
            }

            await sql.query(`UPDATE ProductVariants SET pieces_per_box = ${pieces} WHERE variant_id = ${row.variant_id}`);
            updatedCount++;
        }
        
        console.log(`Updated ${updatedCount} product variants with calculated pieces_per_box.`);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
upgrade();
