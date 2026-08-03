const sql = require('mssql');

// GET /api/ledger
exports.getInvoices = async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT 
                i.invoice_number, i.subtotal, i.cgst_amount, i.sgst_amount, i.grand_total, i.created_at,
                i.credit_applied, i.extra_discount, i.discount_reason,
                o.order_id, u.firm_name
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            JOIN Users u ON o.distributor_id = u.user_id
            ORDER BY i.created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
// GET /api/ledger/invoice/:order_id
exports.getInvoiceDetail = async (req, res) => {
    try {
        const order_id = req.params.order_id;
        const request = new sql.Request();
        request.input('order_id', sql.Int, order_id);

        const invResult = await request.query(`
            SELECT 
                i.invoice_number, i.subtotal, i.cgst_amount, i.sgst_amount, i.grand_total, i.created_at,
                i.credit_applied, i.extra_discount, i.discount_reason,
                o.order_id, u.firm_name, u.gst_number, u.phone_number
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            JOIN Users u ON o.distributor_id = u.user_id
            WHERE o.order_id = @order_id
        `);

        if (invResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const itemsResult = await request.query(`
            SELECT p.name AS product_name, v.pack_size, oi.executed_qty, oi.price_at_order, (oi.executed_qty * oi.price_at_order) as item_total
            FROM OrderItems oi
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            WHERE oi.order_id = @order_id AND oi.executed_qty > 0
        `);

        res.json({
            invoice: invResult.recordset[0],
            items: itemsResult.recordset
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
