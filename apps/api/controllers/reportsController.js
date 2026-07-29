const sql = require('mssql');

exports.getAdminSales = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `WHERE CONVERT(DATE, order_date) >= @startDate AND CONVERT(DATE, order_date) <= @endDate`;
        }

        const pool = await require('../config/db').connectDB();
        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);

        const result = await request.query(`
            SELECT 
                CONVERT(VARCHAR(10), order_date, 120) as date, 
                COUNT(DISTINCT o.order_id) as total_orders, 
                ISNULL(SUM(oi.price_at_order * oi.requested_qty), 0) as total_revenue
            FROM Orders o
            JOIN OrderItems oi ON o.order_id = oi.order_id
            ${dateFilter}
            GROUP BY CONVERT(VARCHAR(10), order_date, 120)
            ORDER BY date ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAdminTopProducts = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `WHERE CONVERT(DATE, o.order_date) >= @startDate AND CONVERT(DATE, o.order_date) <= @endDate`;
        }

        const pool = await require('../config/db').connectDB();
        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);

        const result = await request.query(`
            SELECT TOP 5 
                p.name as product_name, 
                ISNULL(SUM(oi.requested_qty), 0) as total_sold
            FROM OrderItems oi
            JOIN Orders o ON oi.order_id = o.order_id
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            ${dateFilter}
            GROUP BY p.name
            ORDER BY total_sold DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAdminTopDistributors = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `WHERE CONVERT(DATE, o.order_date) >= @startDate AND CONVERT(DATE, o.order_date) <= @endDate`;
        }

        const pool = await require('../config/db').connectDB();
        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);

        const result = await request.query(`
            SELECT TOP 5 
                u.firm_name as distributor_name, 
                COUNT(DISTINCT o.order_id) as total_orders, 
                ISNULL(SUM(oi.price_at_order * oi.requested_qty), 0) as total_spent
            FROM Orders o
            JOIN Users u ON o.distributor_id = u.user_id
            JOIN OrderItems oi ON o.order_id = oi.order_id
            ${dateFilter}
            GROUP BY u.firm_name
            ORDER BY total_spent DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAdminInventoryAlerts = async (req, res) => {
    try {
        const pool = await require('../config/db').connectDB();
        const result = await pool.request().query(`
            SELECT p.name as product_name, v.pack_size, i.current_stock_qty
            FROM Inventory i
            JOIN ProductVariants v ON i.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            WHERE i.current_stock_qty < 50
            ORDER BY i.current_stock_qty ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getDistributorPurchases = async (req, res) => {
    try {
        const user_id = req.params.id;
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND CONVERT(DATE, o.order_date) >= @startDate AND CONVERT(DATE, o.order_date) <= @endDate`;
        }

        const pool = await require('../config/db').connectDB();
        const request = pool.request();
        request.input('user_id', sql.Int, user_id);
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);

        const result = await request.query(`
                SELECT 
                    CONVERT(VARCHAR(10), order_date, 120) as date, 
                    COUNT(DISTINCT o.order_id) as total_orders, 
                    ISNULL(SUM(oi.price_at_order * oi.requested_qty), 0) as amount_spent
                FROM Orders o
                JOIN OrderItems oi ON o.order_id = oi.order_id
                WHERE o.distributor_id = @user_id ${dateFilter}
                GROUP BY CONVERT(VARCHAR(10), order_date, 120)
                ORDER BY date ASC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getDistributorTopProducts = async (req, res) => {
    try {
        const user_id = req.params.id;
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND CONVERT(DATE, o.order_date) >= @startDate AND CONVERT(DATE, o.order_date) <= @endDate`;
        }

        const pool = await require('../config/db').connectDB();
        const request = pool.request();
        request.input('user_id', sql.Int, user_id);
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);

        const result = await request.query(`
                SELECT TOP 5 
                    p.name as product_name, 
                    ISNULL(SUM(oi.requested_qty), 0) as total_bought
                FROM OrderItems oi
                JOIN Orders o ON oi.order_id = o.order_id
                JOIN ProductVariants v ON oi.variant_id = v.variant_id
                JOIN Products p ON v.product_id = p.product_id
                WHERE o.distributor_id = @user_id ${dateFilter}
                GROUP BY p.name
                ORDER BY total_bought DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
