const sql = require('mssql');

function parsePiecesFromPackSize(packSize) {
    if (!packSize) return 1;
    const match = packSize.match(/(?:(?:\(|\s|^))(\d+)\s*(?:PCS|pcs|pieces)(?:\)|\s|$)/i);
    if (match && match[1]) return parseInt(match[1]);
    const genericMatch = packSize.match(/(\d+)\s*PCS/i);
    if (genericMatch && genericMatch[1]) return parseInt(genericMatch[1]);
    return 1;
}

// GET /api/categories
exports.getCategories = async (req, res) => {
    try {
        const result = await new sql.Request().query('SELECT * FROM Categories');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/categories
exports.addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const request = new sql.Request();
        request.input('name', sql.VarChar, name);
        
        // Return the newly created category
        const result = await request.query(`
            INSERT INTO Categories (name) 
            OUTPUT INSERTED.category_id, INSERTED.name 
            VALUES (@name)
        `);
        
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        if (err.number === 2627) { // Unique constraint error
            return res.status(400).json({ message: 'Category already exists' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// GET /api/products
exports.getProducts = async (req, res) => {
    try {
        // We need to fetch Products and their variants, joined with Categories and Inventory
        const result = await new sql.Request().query(`
            SELECT 
                p.product_id, p.name as product_name, p.hsn_code, p.gst_percent,
                c.category_id, c.name as category_name,
                v.variant_id, v.pack_size, v.uom, v.pieces_per_box, v.distributor_rate, v.retailer_rate, v.mrp, v.old_distributor_rate, v.old_retailer_rate,
                ISNULL(i.current_stock_qty, 0) as current_stock
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            LEFT JOIN ProductVariants v ON p.product_id = v.product_id
            LEFT JOIN Inventory i ON v.variant_id = i.variant_id
            ORDER BY p.name, v.pack_size
        `);

        // Determine if we need to apply retailer rate logic
        let userRateType = 'distributor';
        let userRateVersion = 'new';
        
        if (req.user && req.user.user_id) {
            const userReq = new sql.Request();
            userReq.input('uid', sql.Int, req.user.user_id);
            const userRes = await userReq.query(`SELECT rate_type, rate_version FROM Users WHERE user_id = @uid`);
            if (userRes.recordset.length > 0) {
                userRateType = userRes.recordset[0].rate_type || 'distributor';
                userRateVersion = userRes.recordset[0].rate_version || 'new';
            }
        }
        
        const isRetailer = userRateType === 'retailer';
        const isOld = userRateVersion === 'old';

        // Group the flat SQL result into a nested JSON structure
        const productsMap = {};
        result.recordset.forEach(row => {
            if (!productsMap[row.product_id]) {
                productsMap[row.product_id] = {
                    product_id: row.product_id,
                    name: row.product_name,
                    category_id: row.category_id,
                    category_name: row.category_name,
                    hsn_code: row.hsn_code,
                    gst_percent: row.gst_percent,
                    variants: []
                };
            }
            if (row.variant_id) {
                let finalRate = isRetailer ? row.retailer_rate : row.distributor_rate;
                if (isOld) {
                    finalRate = isRetailer 
                        ? (row.old_retailer_rate != null ? row.old_retailer_rate : finalRate) 
                        : (row.old_distributor_rate != null ? row.old_distributor_rate : finalRate);
                }

                productsMap[row.product_id].variants.push({
                    variant_id: row.variant_id,
                    pack_size: row.pack_size,
                    uom: row.uom,
                    pieces_per_box: row.pieces_per_box,
                    distributor_rate: finalRate,
                    retailer_rate: row.retailer_rate,
                    old_distributor_rate: row.old_distributor_rate,
                    old_retailer_rate: row.old_retailer_rate,
                    mrp: row.mrp,
                    current_stock: row.current_stock
                });
            }
        });

        res.json(Object.values(productsMap));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/products
exports.addProduct = async (req, res) => {
    // Need a transaction to insert product and variants together
    const transaction = new sql.Transaction();
    try {
        const { category_id, name, hsn_code, gst_percent, variants } = req.body;
        
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input('category_id', sql.Int, category_id);
        request.input('name', sql.VarChar, name);
        request.input('hsn_code', sql.VarChar, hsn_code || null);
        request.input('gst_percent', sql.Decimal(5,2), gst_percent !== undefined ? gst_percent : 0);

        // Check for duplicate product name
        const checkReq = new sql.Request(transaction);
        checkReq.input('check_name', sql.VarChar, name);
        const checkRes = await checkReq.query(`SELECT product_id FROM Products WHERE name = @check_name`);
        if (checkRes.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'A product with this name already exists.' });
        }

        // Insert Product
        const productResult = await request.query(`
            INSERT INTO Products (category_id, name, hsn_code, gst_percent)
            OUTPUT INSERTED.product_id
            VALUES (@category_id, @name, @hsn_code, @gst_percent)
        `);

        const product_id = productResult.recordset[0].product_id;

        // Insert Variants
        if (variants && variants.length > 0) {
            for (let [index, v] of variants.entries()) {
                const varReq = new sql.Request(transaction);
                varReq.input('product_id', sql.Int, product_id);
                varReq.input(`uom_${index}`, sql.VarChar, v.uom || 'Box');
                varReq.input(`pack_size_${index}`, sql.VarChar, v.pack_size);
                varReq.input(`pieces_per_box_${index}`, sql.Int, v.pieces_per_box || parsePiecesFromPackSize(v.pack_size));
                varReq.input(`distributor_rate_${index}`, sql.Decimal(10,2), v.distributor_rate);
                varReq.input(`retailer_rate_${index}`, sql.Decimal(10,2), v.retailer_rate);
                varReq.input(`mrp_${index}`, sql.Decimal(10,2), v.mrp);

                await varReq.query(`
                    INSERT INTO ProductVariants (product_id, uom, pack_size, pieces_per_box, distributor_rate, retailer_rate, mrp)
                    VALUES (@product_id, @uom_${index}, @pack_size_${index}, @pieces_per_box_${index}, @distributor_rate_${index}, @retailer_rate_${index}, @mrp_${index})
                `);
            }
        }

        await transaction.commit();
        res.status(201).json({ message: 'Product added successfully', product_id });

    } catch (err) {
        console.error(err);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to add product' });
    }
};

// PUT /api/products/:variant_id
exports.updateProductVariant = async (req, res) => {
    const transaction = new sql.Transaction();
    try {
        const variant_id = req.params.variant_id;
        const { name, category_name, hsn_code, uom, pack_size, pieces_per_box, distributor_rate, retailer_rate, gst_percent, mrp } = req.body;

        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Get or Create Category
        let categoryId;
        request.input('cat_name', sql.VarChar, category_name);
        const catRes = await request.query(`SELECT category_id FROM Categories WHERE name = @cat_name`);
        if (catRes.recordset.length > 0) {
            categoryId = catRes.recordset[0].category_id;
        } else {
            const newCat = await request.query(`INSERT INTO Categories (name) OUTPUT INSERTED.category_id VALUES (@cat_name)`);
            categoryId = newCat.recordset[0].category_id;
        }

        // 2. We need the product_id of this variant to update the base product info
        request.input('var_id', sql.Int, variant_id);
        const prodLookup = await request.query(`SELECT product_id FROM ProductVariants WHERE variant_id = @var_id`);
        if (prodLookup.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Variant not found' });
        }
        const productId = prodLookup.recordset[0].product_id;

        // 3. Check for duplicate name and Update Product details
        request.input('prod_id', sql.Int, productId);
        request.input('cat_id', sql.Int, categoryId);
        request.input('prod_name', sql.VarChar, name);
        request.input('hsn', sql.VarChar, hsn_code || null);
        
        request.input('gst_pct', sql.Decimal(5,2), gst_percent !== undefined ? gst_percent : 0);

        const checkNameRes = await request.query(`SELECT product_id FROM Products WHERE name = @prod_name AND product_id != @prod_id`);
        if (checkNameRes.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Another product with this name already exists.' });
        }

        await request.query(`
            UPDATE Products 
            SET category_id = @cat_id, name = @prod_name, hsn_code = @hsn, gst_percent = @gst_pct
            WHERE product_id = @prod_id
        `);

        // 4. Update Variant details
        request.input('uom', sql.VarChar, uom || 'Box');
        request.input('p_size', sql.VarChar, pack_size);
        
        // CHECK FOR DUPLICATE PACK SIZE
        const checkPackRes = await request.query(`SELECT variant_id FROM ProductVariants WHERE product_id = @prod_id AND pack_size = @p_size AND variant_id != @var_id`);
        if (checkPackRes.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Another variant with this pack size already exists for this product.' });
        }

        request.input('pieces_per_box', sql.Int, pieces_per_box || parsePiecesFromPackSize(pack_size));
        request.input('distributor_r', sql.Decimal(10,2), distributor_rate);
        request.input('ret_r', sql.Decimal(10,2), retailer_rate);
        request.input('mrp', sql.Decimal(10,2), mrp || 0);
        
        await request.query(`
            UPDATE ProductVariants
            SET uom = @uom, pack_size = @p_size, pieces_per_box = @pieces_per_box, distributor_rate = @distributor_r, retailer_rate = @ret_r, mrp = @mrp
            WHERE variant_id = @var_id
        `);

        await transaction.commit();
        res.json({ message: 'Product updated successfully' });

    } catch (err) {
        console.error(err);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to update product' });
    }
};

// DELETE /api/products/:variant_id
exports.deleteProductVariant = async (req, res) => {
    try {
        const variant_id = req.params.variant_id;
        const request = new sql.Request();
        
        request.input('var_id', sql.Int, variant_id);
        
        // 1. Find the product_id this variant belongs to
        const prodLookup = await request.query(`SELECT product_id FROM ProductVariants WHERE variant_id = @var_id`);
        if (prodLookup.recordset.length === 0) {
            return res.status(404).json({ message: 'Variant not found' });
        }
        const productId = prodLookup.recordset[0].product_id;

        // 2. Delete the variant
        await request.query(`DELETE FROM ProductVariants WHERE variant_id = @var_id`);

        // 3. Check if product has any other variants left. If not, delete the product to keep DB clean.
        request.input('prod_id', sql.Int, productId);
        const checkVariants = await request.query(`SELECT COUNT(*) as count FROM ProductVariants WHERE product_id = @prod_id`);
        if (checkVariants.recordset[0].count === 0) {
            await request.query(`DELETE FROM Products WHERE product_id = @prod_id`);
        }

        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/products/bulk
exports.bulkUploadProducts = async (req, res) => {
    try {
        const rows = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: 'Invalid data format. Expected an array of products.' });
        }

        let successCount = 0;
        let skipCount = 0;

        // Start a transaction for bulk operation safety
        const transaction = new sql.Transaction();
        await transaction.begin();

        try {
            for (const row of rows) {
                // Handle different possible key names from CSV
                const category_name = row['PRODUCT CATEGORY'] || row['Category'] || row['category_name'] || null;
                const product_name = row['PRODUCT NAME'] || row['Product Name'] || row['product_name'] || row['name'];
                const hsn_code = row['HSN CODE'] || row['HSN Code'] || row['hsn_code'] || null;
                const uom = row['UOM'] || row['uom'] || 'Box';
                const pack_size = row['Packing'] || row['Pack Size'] || row['pack_size'];
                const pieces_per_box = row['PCS IN Box/Bag'] || row['Pieces Per Box'] || row['pieces_per_box'] || parsePiecesFromPackSize(pack_size);
                const distributor_rate = row['DB RATE WITHOUT GST'] || row['Distributor Rate'] || row['distributor_rate'];
                const retailer_rate = row['RT RATE WITHOUT GST'] || row['Retailer Rate'] || row['retailer_rate'];
                const mrp = row['MRP-NEW'] || row['MRP'] || row['mrp'] || 0;
                const gst_rate = row['GST Rate'] || row['GST'] || row['gst_percent'] || 0;
                
                if (!product_name || !pack_size || distributor_rate == null || retailer_rate == null) {
                    skipCount++;
                    continue; // Skip invalid rows missing core data
                }

                // 1. Get or Create Category
                let categoryId = null;
                if (category_name) {
                    const catReq = new sql.Request(transaction);
                    catReq.input('cat_name', sql.VarChar, category_name);
                    const catRes = await catReq.query(`SELECT category_id FROM Categories WHERE name = @cat_name`);
                    if (catRes.recordset.length > 0) {
                        categoryId = catRes.recordset[0].category_id;
                    } else {
                        const newCat = await catReq.query(`INSERT INTO Categories (name) OUTPUT INSERTED.category_id VALUES (@cat_name)`);
                        categoryId = newCat.recordset[0].category_id;
                    }
                }

                // 2. Get or Create Product
                let productId;
                const pReq = new sql.Request(transaction);
                pReq.input('prod_name', sql.VarChar, product_name);
                const prodRes = await pReq.query(`SELECT product_id FROM Products WHERE name = @prod_name`);
                
                if (prodRes.recordset.length > 0) {
                    productId = prodRes.recordset[0].product_id;
                } else {
                    pReq.input('cat_id', sql.Int, categoryId);
                    pReq.input('hsn', sql.VarChar, hsn_code);
                    pReq.input('uom', sql.VarChar, uom);
                    pReq.input('gst', sql.Decimal(5,2), parseFloat(String(gst_rate).replace('%', '')) || 0);
                    const newProd = await pReq.query(`
                        INSERT INTO Products (category_id, name, hsn_code, uom, gst_percent)
                        OUTPUT INSERTED.product_id
                        VALUES (@cat_id, @prod_name, @hsn, @uom, @gst)
                    `);
                    productId = newProd.recordset[0].product_id;
                }

                // 3. Create Variant
                const vReq = new sql.Request(transaction);
                vReq.input('p_id', sql.Int, productId);
                vReq.input('p_size', sql.VarChar, pack_size);
                const varCheck = await vReq.query(`SELECT variant_id FROM ProductVariants WHERE product_id = @p_id AND pack_size = @p_size`);
                
                if (varCheck.recordset.length === 0) {
                    vReq.input('d_rate', sql.Decimal(10,2), distributor_rate);
                    vReq.input('r_rate', sql.Decimal(10,2), retailer_rate);
                    vReq.input('mrp_val', sql.Decimal(10,2), mrp);
                    vReq.input('pieces_pb', sql.Int, pieces_per_box);
                    await vReq.query(`
                        INSERT INTO ProductVariants (product_id, pack_size, pieces_per_box, distributor_rate, retailer_rate, mrp)
                        VALUES (@p_id, @p_size, @pieces_pb, @d_rate, @r_rate, @mrp_val)
                    `);
                    successCount++;
                } else {
                    skipCount++; // Skip if variant already exists
                }
            }

            await transaction.commit();
            res.status(200).json({ message: 'Bulk upload completed', successCount, skipCount });
        } catch (innerErr) {
            console.error("Bulk insert transaction error:", innerErr);
            await transaction.rollback();
            res.status(500).json({ message: 'Failed during bulk upload process' });
        }
    } catch (err) {
        console.error("Bulk Upload Error:", err);
        res.status(500).json({ message: 'Failed to process bulk upload' });
    }
};

// POST /api/products/:product_id/variants
exports.addProductVariant = async (req, res) => {
    try {
        const { product_id } = req.params;
        const { pack_size, pieces_per_box, distributor_rate, retailer_rate, mrp } = req.body;

        const request = new sql.Request();
        request.input('product_id', sql.Int, product_id);
        request.input('pack_size', sql.VarChar, pack_size);
        
        // CHECK FOR DUPLICATE PACK SIZE
        const checkReq = new sql.Request();
        checkReq.input('prod_id', sql.Int, product_id);
        checkReq.input('check_pack', sql.VarChar, pack_size);
        const checkRes = await checkReq.query(`SELECT variant_id FROM ProductVariants WHERE product_id = @prod_id AND pack_size = @check_pack`);
        if (checkRes.recordset.length > 0) {
            return res.status(400).json({ message: 'This pack size already exists for this product.' });
        }

        request.input('pieces_per_box', sql.Int, pieces_per_box || parsePiecesFromPackSize(pack_size));
        request.input('distributor_rate', sql.Decimal(10,2), distributor_rate || 0);
        request.input('retailer_rate', sql.Decimal(10,2), retailer_rate || 0);
        request.input('mrp', sql.Decimal(10,2), mrp || 0);

        const result = await request.query(`
            INSERT INTO ProductVariants (product_id, pack_size, pieces_per_box, distributor_rate, retailer_rate, mrp)
            OUTPUT INSERTED.*
            VALUES (@product_id, @pack_size, @pieces_per_box, @distributor_rate, @retailer_rate, @mrp)
        `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error("Add Variant Error:", err);
        res.status(500).json({ message: 'Failed to add variant' });
    }
};
