const sql = require('mssql');

// GET /api/inventory
exports.getInventory = async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT 
                v.variant_id,
                p.name AS product_name,
                c.name AS category_name,
                v.pack_size,
                ISNULL(i.current_stock_qty, 0) AS current_stock,
                ISNULL(i.low_stock_threshold, 5) AS low_stock_threshold
            FROM ProductVariants v
            INNER JOIN Products p ON v.product_id = p.product_id
            LEFT JOIN Categories c ON p.category_id = c.category_id
            LEFT JOIN Inventory i ON v.variant_id = i.variant_id
            ORDER BY p.name, v.pack_size
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/inventory/update
exports.updateStock = async (req, res) => {
    try {
        const { variant_id, added_qty } = req.body;

        if (!added_qty || isNaN(added_qty)) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        const request = new sql.Request();
        request.input('variant_id', sql.Int, variant_id);
        request.input('qty', sql.Int, parseInt(added_qty));

        // Check if row exists
        const checkRes = await request.query(`SELECT inventory_id FROM Inventory WHERE variant_id = @variant_id`);
        
        if (checkRes.recordset.length > 0) {
            // Update existing
            await request.query(`
                UPDATE Inventory 
                SET current_stock_qty = current_stock_qty + @qty, last_updated_at = GETDATE()
                WHERE variant_id = @variant_id
            `);
        } else {
            // Insert new
            await request.query(`
                INSERT INTO Inventory (variant_id, current_stock_qty)
                VALUES (@variant_id, @qty)
            `);
        }

        res.json({ message: 'Stock updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update stock' });
    }
};

// PUT /api/inventory/inline/:variant_id
exports.updateStockInline = async (req, res) => {
    try {
        const variant_id = req.params.variant_id;
        const { current_stock, low_stock_threshold } = req.body;

        const request = new sql.Request();
        request.input('variant_id', sql.Int, variant_id);

        const checkRes = await request.query(`SELECT inventory_id FROM Inventory WHERE variant_id = @variant_id`);
        
        if (checkRes.recordset.length > 0) {
            // Update
            let updateQuery = `UPDATE Inventory SET last_updated_at = GETDATE()`;
            if (current_stock !== undefined) {
                request.input('stock', sql.Int, parseInt(current_stock));
                updateQuery += `, current_stock_qty = @stock`;
            }
            if (low_stock_threshold !== undefined) {
                request.input('threshold', sql.Int, parseInt(low_stock_threshold));
                updateQuery += `, low_stock_threshold = @threshold`;
            }
            updateQuery += ` WHERE variant_id = @variant_id`;
            await request.query(updateQuery);
        } else {
            // Insert
            const stockVal = current_stock !== undefined ? parseInt(current_stock) : 0;
            const thresholdVal = low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : 5;
            
            request.input('stock', sql.Int, stockVal);
            request.input('threshold', sql.Int, thresholdVal);
            
            await request.query(`
                INSERT INTO Inventory (variant_id, current_stock_qty, low_stock_threshold)
                VALUES (@variant_id, @stock, @threshold)
            `);
        }

        res.json({ message: 'Inventory updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update inventory inline' });
    }
};
