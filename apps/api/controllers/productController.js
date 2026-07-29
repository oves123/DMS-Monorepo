const sql = require('mssql');

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
        // We need to fetch Products and their variants, joined with Categories
        const result = await new sql.Request().query(`
            SELECT 
                p.product_id, p.name as product_name, p.hsn_code, p.gst_percent,
                c.category_id, c.name as category_name,
                v.variant_id, v.pack_size, v.distributor_rate, v.retailer_rate, v.mrp
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            LEFT JOIN ProductVariants v ON p.product_id = v.product_id
            ORDER BY p.name, v.pack_size
        `);

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
                productsMap[row.product_id].variants.push({
                    variant_id: row.variant_id,
                    pack_size: row.pack_size,
                    distributor_rate: row.distributor_rate,
                    retailer_rate: row.retailer_rate,
                    mrp: row.mrp
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
        request.input('hsn_code', sql.VarChar, hsn_code);
        request.input('gst_percent', sql.Decimal(5,2), gst_percent || 0);

        // Insert Product
        const productResult = await request.query(`
            INSERT INTO Products (category_id, name, hsn_code, gst_percent)
            OUTPUT INSERTED.product_id
            VALUES (@category_id, @name, @hsn_code, @gst_percent)
        `);

        const product_id = productResult.recordset[0].product_id;

        // Insert Variants
        if (variants && variants.length > 0) {
            for (let v of variants) {
                const varReq = new sql.Request(transaction);
                varReq.input('product_id', sql.Int, product_id);
                varReq.input('pack_size', sql.VarChar, v.pack_size);
                varReq.input('distributor_rate', sql.Decimal(10,2), v.distributor_rate);
                varReq.input('retailer_rate', sql.Decimal(10,2), v.retailer_rate);
                varReq.input('mrp', sql.Decimal(10,2), v.mrp);

                await varReq.query(`
                    INSERT INTO ProductVariants (product_id, pack_size, distributor_rate, retailer_rate, mrp)
                    VALUES (@product_id, @pack_size, @distributor_rate, @retailer_rate, @mrp)
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
        const { name, category_name, hsn_code, pack_size, distributor_rate, retailer_rate } = req.body;

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

        // 3. Update Product details
        request.input('prod_id', sql.Int, productId);
        request.input('cat_id', sql.Int, categoryId);
        request.input('prod_name', sql.VarChar, name);
        request.input('hsn', sql.VarChar, hsn_code || null);
        await request.query(`
            UPDATE Products 
            SET category_id = @cat_id, name = @prod_name, hsn_code = @hsn
            WHERE product_id = @prod_id
        `);

        // 4. Update Variant details
        request.input('p_size', sql.VarChar, pack_size);
        request.input('distributor_r', sql.Decimal(10,2), distributor_rate);
        request.input('ret_r', sql.Decimal(10,2), retailer_rate);
        
        await request.query(`
            UPDATE ProductVariants
            SET pack_size = @p_size, distributor_rate = @distributor_r, retailer_rate = @ret_r
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
