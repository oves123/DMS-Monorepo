const sql = require('mssql');

exports.getMetrics = async (req, res) => {
    try {
        const pool = await require('../config/db').connectDB();

        // Get Pending Orders count
        const ordersRes = await pool.request().query(`
            SELECT COUNT(*) as count FROM Orders WHERE status = 'PENDING'
        `);
        const pendingOrders = ordersRes.recordset[0].count;

        // Get Total Products count
        const productsRes = await pool.request().query(`
            SELECT COUNT(*) as count FROM Products
        `);
        const totalProducts = productsRes.recordset[0].count;

        // Get Active Distributors count
        const distRes = await pool.request().query(`
            SELECT COUNT(*) as count FROM Users WHERE role = 'DISTRIBUTOR'
        `);
        const activeDistributors = distRes.recordset[0].count;

        res.json({
            pendingOrders,
            totalProducts,
            activeDistributors
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching metrics' });
    }
};
