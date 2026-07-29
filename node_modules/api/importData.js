require('dotenv').config();
const sql = require('mssql');
const xlsx = require('xlsx');
const { connectDB } = require('./config/db');

async function importData() {
    try {
        const pool = await connectDB();
        
        const workbook = xlsx.readFile('d:\\cashmitra\\DMS\\etc files\\Bill.xlsx');
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);

        for (const row of data) {
            if (!row['PRODUCT NAME']) continue;

            const categoryName = row['PRODUCT CATEGORY'] || 'Uncategorized';
            let productName = row['PRODUCT NAME'].trim();
            const hsnCode = row['HSN CODE'] ? row['HSN CODE'].toString() : null;
            const pcs = row['PCS IN BOX/BAG'] || 1;
            const ndRate = parseFloat(row['DISTRIBUTOR RATE PER BOX/BAG INCL GST']) || 0;
            const retailerRate = parseFloat(row['RETAILER RATE PER BOX/BAG INCL GST']) || 0;

            // Extract pack size and MRP roughly if it says "5Rs"
            let packSize = `${pcs} PCS`;
            let mrp = 0;
            
            // Try to guess MRP if product name ends with - 5Rs, etc.
            const match = productName.match(/-\s*(\d+)Rs/i);
            if (match) {
                mrp = parseInt(match[1]) * pcs;
            }

            // 1. Get or Create Category
            let categoryId;
            const catRes = await pool.request()
                .input('name', sql.VarChar, categoryName)
                .query(`SELECT category_id FROM Categories WHERE name = @name`);
            
            if (catRes.recordset.length > 0) {
                categoryId = catRes.recordset[0].category_id;
            } else {
                const newCat = await pool.request()
                    .input('name', sql.VarChar, categoryName)
                    .query(`INSERT INTO Categories (name) OUTPUT INSERTED.category_id VALUES (@name)`);
                categoryId = newCat.recordset[0].category_id;
            }

            // 2. Get or Create Product
            let productId;
            const prodRes = await pool.request()
                .input('name', sql.VarChar, productName)
                .query(`SELECT product_id FROM Products WHERE name = @name`);
            
            if (prodRes.recordset.length > 0) {
                productId = prodRes.recordset[0].product_id;
            } else {
                const newProd = await pool.request()
                    .input('cat_id', sql.Int, categoryId)
                    .input('name', sql.VarChar, productName)
                    .input('hsn', sql.VarChar, hsnCode)
                    .input('gst', sql.Decimal(5,2), 18.0) // default 18% if unknown
                    .query(`
                        INSERT INTO Products (category_id, name, hsn_code, gst_percent) 
                        OUTPUT INSERTED.product_id 
                        VALUES (@cat_id, @name, @hsn, @gst)
                    `);
                productId = newProd.recordset[0].product_id;
            }

            // 3. Create Variant
            await pool.request()
                .input('prod_id', sql.Int, productId)
                .input('pack_size', sql.VarChar, packSize)
                .input('nd_rate', sql.Decimal(10,2), ndRate)
                .input('retailer_rate', sql.Decimal(10,2), retailerRate)
                .input('mrp', sql.Decimal(10,2), mrp)
                .query(`
                    INSERT INTO ProductVariants (product_id, pack_size, nd_rate, retailer_rate, mrp)
                    VALUES (@prod_id, @pack_size, @nd_rate, @retailer_rate, @mrp)
                `);
            
            console.log(`Imported: ${productName} - ${packSize}`);
        }

        console.log('✅ Import Completed successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error during import:', err);
        process.exit(1);
    }
}

importData();
