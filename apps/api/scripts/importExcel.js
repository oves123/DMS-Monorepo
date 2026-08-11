require('dotenv').config();
const sql = require('mssql');
const xlsx = require('xlsx');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function importData() {
    try {
        await sql.connect(config);
        console.log("Connected to database.");

        const workbook = xlsx.readFile('d:/cashmitra/DMS/etc files/08.08.2026 PRICE LIST FOR.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Skip header rows by finding the row where 'PRODUCT CATEGORY' is the first valid item
        let rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        let headerRowIndex = rawData.findIndex(row => row.includes('PRODUCT CATEGORY'));
        
        if (headerRowIndex === -1) {
            console.error("Could not find header row with 'PRODUCT CATEGORY'");
            return;
        }

        const keys = rawData[headerRowIndex];
        const rows = rawData.slice(headerRowIndex + 1).filter(row => row && row[1]); // Ensure PRODUCT NAME exists

        const data = rows.map(row => {
            let obj = {};
            keys.forEach((key, i) => {
                obj[key] = row[i];
            });
            return obj;
        });

        console.log(`Parsed ${data.length} rows from Excel.`);

        let successCount = 0;
        let skipCount = 0;

        for (const row of data) {
            const categoryName = row['PRODUCT CATEGORY'];
            const productName = row['PRODUCT NAME'];
            const hsnCode = row['HSN CODE'];
            const uom = row['Packing'];
            const mrpRaw = row['MRP-NEW'];
            const weightRaw = row['WEIGHT PER UNIT-GMS'];
            const pcsPerBox = row['PCS IN\r\nBox/Bag'] || row['PCS IN\nBox/Bag'] || row['PCS IN Box/Bag'] || 0;
            const dbRate = row['DB RATE\r\nWITHOUT GST'] || row['DB RATE\nWITHOUT GST'] || row['DB RATE WITHOUT GST'] || 0;
            const rtRate = row['RT RATE WITHOUT GST'] || 0;

            if (!productName || !weightRaw) {
                skipCount++;
                continue;
            }

            // Clean up MRP and Weight
            const mrp = parseFloat(mrpRaw) || 0;
            const weight = weightRaw.toString().replace(/g/i, '').trim();

            // Construct pack_size dynamically based on MRP rule
            let packSizeStr = '';
            if (mrp <= 20 && mrp > 0) {
                packSizeStr = `${mrp}Rs ${weight}g`;
            } else {
                packSizeStr = `${weight}g`;
            }

            const request = new sql.Request();

            // 1. Handle Category
            let categoryId = null;
            if (categoryName) {
                const catRes = await request.input('catName', sql.VarChar, categoryName.trim())
                    .query(`SELECT category_id FROM Categories WHERE name = @catName`);
                
                if (catRes.recordset.length > 0) {
                    categoryId = catRes.recordset[0].category_id;
                } else {
                    const insertCatRes = await new sql.Request()
                        .input('catName', sql.VarChar, categoryName.trim())
                        .query(`INSERT INTO Categories (name) OUTPUT INSERTED.category_id VALUES (@catName)`);
                    categoryId = insertCatRes.recordset[0].category_id;
                }
            }

            // 2. Handle Product
            let productId = null;
            const prodRes = await new sql.Request()
                .input('prodName', sql.VarChar, productName.trim())
                .query(`SELECT product_id FROM Products WHERE name = @prodName`);
            
            if (prodRes.recordset.length > 0) {
                productId = prodRes.recordset[0].product_id;
                // update category and HSN if changed
                await new sql.Request()
                    .input('productId', sql.Int, productId)
                    .input('catId', sql.Int, categoryId)
                    .input('hsn', sql.VarChar, hsnCode ? hsnCode.toString().trim() : '')
                    .query(`UPDATE Products SET category_id = @catId, hsn_code = @hsn WHERE product_id = @productId`);
            } else {
                const insertProdRes = await new sql.Request()
                    .input('prodName', sql.VarChar, productName.trim())
                    .input('catId', sql.Int, categoryId)
                    .input('hsn', sql.VarChar, hsnCode ? hsnCode.toString().trim() : '')
                    .query(`INSERT INTO Products (name, category_id, hsn_code, is_active) OUTPUT INSERTED.product_id VALUES (@prodName, @catId, @hsn, 1)`);
                productId = insertProdRes.recordset[0].product_id;
            }

            // 3. Handle Variant
            const variantRes = await new sql.Request()
                .input('productId', sql.Int, productId)
                .input('packSize', sql.VarChar, packSizeStr)
                .query(`SELECT variant_id FROM ProductVariants WHERE product_id = @productId AND pack_size = @packSize`);
            
            if (variantRes.recordset.length > 0) {
                // Update
                await new sql.Request()
                    .input('variantId', sql.Int, variantRes.recordset[0].variant_id)
                    .input('uom', sql.VarChar, uom ? uom.trim() : 'Box')
                    .input('pcs', sql.Int, pcsPerBox)
                    .input('dbRate', sql.Decimal(10,2), dbRate)
                    .input('rtRate', sql.Decimal(10,2), rtRate)
                    .input('mrp', sql.Decimal(10,2), mrp)
                    .query(`UPDATE ProductVariants SET uom = @uom, pieces_per_box = @pcs, distributor_rate = @dbRate, retailer_rate = @rtRate, mrp = @mrp WHERE variant_id = @variantId`);
            } else {
                // Insert
                await new sql.Request()
                    .input('productId', sql.Int, productId)
                    .input('packSize', sql.VarChar, packSizeStr)
                    .input('uom', sql.VarChar, uom ? uom.trim() : 'Box')
                    .input('pcs', sql.Int, pcsPerBox)
                    .input('dbRate', sql.Decimal(10,2), dbRate)
                    .input('rtRate', sql.Decimal(10,2), rtRate)
                    .input('mrp', sql.Decimal(10,2), mrp)
                    .query(`INSERT INTO ProductVariants (product_id, pack_size, uom, pieces_per_box, distributor_rate, retailer_rate, mrp) VALUES (@productId, @packSize, @uom, @pcs, @dbRate, @rtRate, @mrp)`);
            }
            successCount++;
        }

        console.log(`Sync Complete! Successfully processed ${successCount} products (Skipped ${skipCount})`);

    } catch (err) {
        console.error("Import failed:", err);
    } finally {
        await sql.close();
    }
}

importData();
