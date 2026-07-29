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
                ISNULL(i.current_stock_qty, 0) AS current_stock
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
