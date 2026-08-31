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
                CONVERT(VARCHAR(10), o.order_date, 120) as date, 
                COUNT(DISTINCT o.order_id) as total_orders, 
                ISNULL(SUM(inv.grand_total), 0) as total_revenue
            FROM Orders o
            LEFT JOIN Invoices inv ON o.order_id = inv.order_id
            WHERE o.status = 'EXECUTED' 
            ${dateFilter.replace('WHERE', 'AND')}
            GROUP BY CONVERT(VARCHAR(10), o.order_date, 120)
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
            SELECT TOP 15 
                p.name as product_name, 
                ISNULL(SUM(oi.executed_qty), 0) as total_sold
            FROM OrderItems oi
            JOIN Orders o ON oi.order_id = o.order_id
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            WHERE o.status = 'EXECUTED'
            ${dateFilter.replace('WHERE', 'AND')}
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
            SELECT TOP 10 
                u.firm_name as distributor_name, 
                COUNT(DISTINCT o.order_id) as total_orders, 
                ISNULL(SUM(inv.grand_total), 0) as total_spent
            FROM Orders o
            JOIN Users u ON o.distributor_id = u.user_id
            LEFT JOIN Invoices inv ON o.order_id = inv.order_id
            WHERE o.status = 'EXECUTED'
            ${dateFilter.replace('WHERE', 'AND')}
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
            WHERE i.current_stock_qty <= ISNULL(i.low_stock_threshold, 5)
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
                    CONVERT(VARCHAR(10), o.order_date, 120) as date, 
                    COUNT(DISTINCT o.order_id) as total_orders, 
                    ISNULL(SUM(inv.grand_total), 0) as amount_spent
                FROM Orders o
                LEFT JOIN Invoices inv ON o.order_id = inv.order_id
                WHERE o.distributor_id = @user_id AND o.status = 'EXECUTED' ${dateFilter}
                GROUP BY CONVERT(VARCHAR(10), o.order_date, 120)
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
                    ISNULL(SUM(oi.executed_qty), 0) as total_bought
                FROM OrderItems oi
                JOIN Orders o ON oi.order_id = o.order_id
                JOIN ProductVariants v ON oi.variant_id = v.variant_id
                JOIN Products p ON v.product_id = p.product_id
                WHERE o.distributor_id = @user_id AND o.status = 'EXECUTED' ${dateFilter}
                GROUP BY p.name
                ORDER BY total_bought DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getDetailedTransactions = async (req, res) => {
    try {
        const { startDate, endDate, month, year } = req.query;
        let dateFilter = '';
        
        if (startDate && endDate) {
            dateFilter = `WHERE CONVERT(DATE, i.created_at) >= @startDate AND CONVERT(DATE, i.created_at) <= @endDate`;
        } else if (month && year) {
            dateFilter = `WHERE MONTH(i.created_at) = @month AND YEAR(i.created_at) = @year`;
        }

        const pool = await require('../config/db').connectDB();
        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);
        if (month) request.input('month', sql.Int, month);
        if (year) request.input('year', sql.Int, year);

        const result = await request.query(`
            SELECT 
                CONVERT(VARCHAR(10), i.created_at, 120) as date,
                i.invoice_number,
                u.firm_name,
                u.address as town,
                ISNULL(i.subtotal, 0) as taxable_amount,
                ISNULL(i.cgst_amount, 0) + ISNULL(i.sgst_amount, 0) as gst_amount,
                ISNULL(i.grand_total, 0) as total_amount
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            JOIN Users u ON o.distributor_id = u.user_id
            ${dateFilter}
            ORDER BY i.created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
