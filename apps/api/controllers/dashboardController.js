const sql = require('mssql');

exports.getMetrics = async (req, res) => {
    try {
        const request = new sql.Request();

        // Get Pending Orders count
        const ordersRes = await request.query(`
            SELECT COUNT(*) as count FROM Orders WHERE status = 'PENDING'
        `);
        const pendingOrders = ordersRes.recordset[0].count;

        // Get Pending Claims count
        const claimsRes = await request.query(`
            SELECT COUNT(*) as count FROM Claims WHERE status = 'PENDING'
        `);
        const pendingClaims = claimsRes.recordset[0].count;

        // Get Total Products count
        const productsRes = await request.query(`
            SELECT COUNT(*) as count FROM Products
        `);
        const totalProducts = productsRes.recordset[0].count;

        // Get Active Distributors count
        const distRes = await request.query(`
            SELECT COUNT(*) as count FROM Users WHERE role = 'DISTRIBUTOR'
        `);
        const activeDistributors = distRes.recordset[0].count;

        // Get Low Stock Count & Critical Items
        const lowStockRes = await request.query(`
            SELECT 
                v.variant_id,
                p.name AS product_name,
                v.pack_size,
                ISNULL(i.current_stock_qty, 0) AS current_stock,
                ISNULL(i.low_stock_threshold, 5) AS low_stock_threshold
            FROM ProductVariants v
            INNER JOIN Products p ON v.product_id = p.product_id
            LEFT JOIN Inventory i ON v.variant_id = i.variant_id
            WHERE ISNULL(i.current_stock_qty, 0) <= ISNULL(i.low_stock_threshold, 5)
            ORDER BY ISNULL(i.current_stock_qty, 0) ASC
        `);
        const criticalStock = lowStockRes.recordset;
        const lowStockCount = criticalStock.length;

        res.json({
            pendingOrders,
            pendingClaims,
            totalProducts,
            activeDistributors,
            lowStockCount,
            criticalStock
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching metrics' });
    }
};
