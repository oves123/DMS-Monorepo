const { sql, connectDB } = require('./config/db');

async function testFetchOrders() {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT 
                o.order_id, o.status, o.order_date, o.execution_date,
                u.firm_name as distributor_name, u.phone_number as distributor_phone,
                oi.order_item_id, oi.requested_qty, oi.executed_qty, oi.price_at_order,
                v.pack_size, p.name as product_name, v.variant_id,
                inv.current_stock_qty
            FROM Orders o
            JOIN Users u ON o.distributor_id = u.user_id
            JOIN OrderItems oi ON o.order_id = oi.order_id
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            LEFT JOIN Inventory inv ON v.variant_id = inv.variant_id
            ORDER BY o.order_date DESC
        `);
        console.log("Success! Fetched rows:", result.recordset.length);
    } catch(err) {
        console.error("SQL Error:", err.message);
    }
    process.exit();
}

testFetchOrders();
