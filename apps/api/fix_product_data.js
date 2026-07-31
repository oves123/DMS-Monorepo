const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Oves@123',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'dms_db',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

async function fixProductData() {
    try {
        await sql.connect(dbConfig);
        console.log("Connected to DB.");

        // 1. Fetch all products
        const productsResult = await sql.query(`SELECT * FROM Products`);
        const products = productsResult.recordset;

        // Group by base name
        const groups = {};

        for (const p of products) {
            let baseName = p.name;
            let priceTag = "";

            // If name has " - 5Rs" or similar
            if (p.name.includes(' - ')) {
                const parts = p.name.split(' - ');
                baseName = parts[0].trim();
                priceTag = parts[1].trim();
            }

            if (!groups[baseName]) {
                groups[baseName] = [];
            }
            groups[baseName].push({
                product_id: p.product_id,
                original_name: p.name,
                price_tag: priceTag
            });
        }

        console.log(`Found ${Object.keys(groups).length} unique base products.`);

        const transaction = new sql.Transaction();
        await transaction.begin();

        try {
            for (const baseName of Object.keys(groups)) {
                const group = groups[baseName];
                
                // Pick the first product as the Master Product
                const masterProduct = group[0];
                
                // Update master product name to baseName
                await transaction.request().query(`
                    UPDATE Products SET name = '${baseName.replace(/'/g, "''")}' WHERE product_id = ${masterProduct.product_id}
                `);

                for (let i = 0; i < group.length; i++) {
                    const item = group[i];
                    
                    // Update the pack_size of its variants
                    const variantsResult = await transaction.request().query(`
                        SELECT * FROM ProductVariants WHERE product_id = ${item.product_id}
                    `);
                    const variants = variantsResult.recordset;

                    for (const v of variants) {
                        let newPackSize = v.pack_size;
                        if (item.price_tag && !newPackSize.includes(item.price_tag)) {
                            newPackSize = `${item.price_tag} (${v.pack_size})`;
                        }

                        // Move variant to master product and update pack size
                        await transaction.request().query(`
                            UPDATE ProductVariants 
                            SET product_id = ${masterProduct.product_id},
                                pack_size = '${newPackSize.replace(/'/g, "''")}'
                            WHERE variant_id = ${v.variant_id}
                        `);
                    }

                    // If this item is NOT the master product, delete it (since variants are moved)
                    if (i > 0) {
                        await transaction.request().query(`
                            DELETE FROM Products WHERE product_id = ${item.product_id}
                        `);
                    }
                }
            }

            await transaction.commit();
            console.log("Successfully cleaned and merged product data!");

        } catch (err) {
            await transaction.rollback();
            console.error("Transaction failed, rolled back.", err);
        }

    } catch (err) {
        console.error("DB Connection Error:", err);
    } finally {
        await sql.close();
    }
}

fixProductData();
