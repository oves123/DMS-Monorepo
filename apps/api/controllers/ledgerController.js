const sql = require('mssql');
const { generateInvoicePdf } = require('../services/pdfService');

// GET /api/ledger
exports.getInvoices = async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT 
                i.invoice_number, i.invoice_id, i.subtotal, i.cgst_amount, i.sgst_amount, i.grand_total, i.created_at,
                i.credit_applied, i.extra_discount, i.discount_reason,
                i.paid_amount, i.payment_status,
                o.order_id, u.firm_name, u.user_id as distributor_id
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            JOIN Users u ON o.distributor_id = u.user_id
            ORDER BY i.created_at DESC
        `);
        
        const ledgerMap = {};
        result.recordset.forEach(row => {
            if (!ledgerMap[row.distributor_id]) {
                ledgerMap[row.distributor_id] = {
                    distributor_id: row.distributor_id,
                    firm_name: row.firm_name,
                    total_invoices: 0,
                    total_billed: 0,
                    total_paid: 0,
                    total_pending: 0,
                    invoices: []
                };
            }
            
            ledgerMap[row.distributor_id].total_invoices += 1;
            ledgerMap[row.distributor_id].total_billed += row.grand_total;
            ledgerMap[row.distributor_id].total_paid += (row.paid_amount || 0);
            ledgerMap[row.distributor_id].total_pending += (row.grand_total - (row.paid_amount || 0));
            
            ledgerMap[row.distributor_id].invoices.push(row);
        });
        
        res.json(Object.values(ledgerMap));
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
                i.invoice_id, i.invoice_number, i.subtotal, i.cgst_amount, i.sgst_amount, i.grand_total, i.created_at,
                i.credit_applied, i.extra_discount, i.discount_reason,
                i.paid_amount, i.payment_status,
                o.order_id, u.firm_name, u.gst_number, u.phone_number, u.address, u.owner_name
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            JOIN Users u ON o.distributor_id = u.user_id
            WHERE o.order_id = @order_id
        `);

        if (invResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const itemsResult = await request.query(`
            SELECT p.name AS product_name, p.hsn_code, v.uom, c.name AS category_name, v.pack_size, oi.executed_qty, oi.price_at_order, (oi.executed_qty * oi.price_at_order) as item_total
            FROM OrderItems oi
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            LEFT JOIN Categories c ON p.category_id = c.category_id
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

// GET /api/ledger/invoice/:order_id/download
exports.downloadInvoicePdf = async (req, res) => {
    try {
        const order_id = req.params.order_id;
        const request = new sql.Request();
        request.input('order_id', sql.Int, order_id);

        const invResult = await request.query(`
            SELECT 
                i.invoice_id, i.invoice_number, i.subtotal, i.cgst_amount, i.sgst_amount, i.grand_total, i.created_at,
                i.pdf_url,
                o.order_id, u.firm_name, u.gst_number, u.phone_number, u.address, u.owner_name
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            JOIN Users u ON o.distributor_id = u.user_id
            WHERE o.order_id = @order_id
        `);

        if (invResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const invoice = invResult.recordset[0];
        
        // If we already generated it, you could choose to return it. But for now let's just generate it fresh to ensure data is updated, or check it.
        // Let's generate it fresh so it picks up any new UOM/HSN format immediately.
        
        const itemsResult = await request.query(`
            SELECT p.name AS product_name, p.hsn_code, v.uom, c.name AS category_name, v.pack_size, oi.executed_qty, oi.price_at_order, (oi.executed_qty * oi.price_at_order) as item_total
            FROM OrderItems oi
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            LEFT JOIN Categories c ON p.category_id = c.category_id
            WHERE oi.order_id = @order_id AND oi.executed_qty > 0
        `);

        const settingsRes = await new sql.Request().query('SELECT * FROM CompanySettings WHERE setting_id = 1');
        const settings = settingsRes.recordset[0] || {};


        const invoiceData = {
            invoice: invoice,
            items: itemsResult.recordset
        };

        const pdfUrl = await generateInvoicePdf(invoiceData, settings);

        // Update the invoice with the new pdf_url
        const req2 = new sql.Request();
        req2.input('pdf_url', sql.VarChar, pdfUrl);
        req2.input('invoice_id', sql.Int, invoice.invoice_id);
        await req2.query(`UPDATE Invoices SET pdf_url = @pdf_url WHERE invoice_id = @invoice_id`);

        res.json({ pdf_url: pdfUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
};

// POST /api/ledger/payment/record
exports.recordPayment = async (req, res) => {
    const { invoice_id, amount, payment_mode, reference_no, payment_date, adminId } = req.body;
    try {
        const recordedBy = adminId || 1; // Fallback to 1 if no auth is present
        const request = new sql.Request();
        request.input('invoice_id', sql.Int, invoice_id);
        
        // get invoice and distributor info
        const invCheck = await request.query(`
            SELECT i.grand_total, i.paid_amount, o.distributor_id 
            FROM Invoices i 
            JOIN Orders o ON i.order_id = o.order_id 
            WHERE i.invoice_id = @invoice_id
        `);
        if (invCheck.recordset.length === 0) return res.status(404).json({ message: 'Invoice not found' });
        
        const invoice = invCheck.recordset[0];
        const newPaidAmount = Number(invoice.paid_amount || 0) + Number(amount);
        let newStatus = 'PARTIAL';
        // Allow a small margin of error for floating point
        if (newPaidAmount >= invoice.grand_total - 0.01) {
            newStatus = 'PAID';
        }

        // Insert payment
        request.input('distributor_id', sql.Int, invoice.distributor_id);
        request.input('amount', sql.Decimal(18, 2), amount);
        request.input('payment_mode', sql.VarChar(50), payment_mode);
        request.input('reference_no', sql.VarChar(100), reference_no || '');
        request.input('payment_date', sql.DateTime, payment_date ? new Date(payment_date) : new Date());
        request.input('recorded_by', sql.Int, recordedBy);
        
        await request.query(`
            INSERT INTO Payments (invoice_id, distributor_id, amount, payment_mode, reference_no, payment_date, recorded_by)
            VALUES (@invoice_id, @distributor_id, @amount, @payment_mode, @reference_no, @payment_date, @recorded_by)
        `);

        // Update invoice
        request.input('newPaidAmount', sql.Decimal(18,2), newPaidAmount);
        request.input('newStatus', sql.VarChar(20), newStatus);
        await request.query(`
            UPDATE Invoices 
            SET paid_amount = @newPaidAmount, payment_status = @newStatus 
            WHERE invoice_id = @invoice_id
        `);

        res.json({ message: 'Payment recorded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/ledger/payment/record-bulk
exports.recordBulkPayment = async (req, res) => {
    const transaction = new sql.Transaction();
    try {
        const { distributor_id, amount, payment_mode, reference_no, payment_date, adminId } = req.body;
        const recordedBy = adminId || 1; // Fallback to 1
        
        let remainingAmount = Number(amount);
        if (remainingAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        await transaction.begin();
        const request = new sql.Request(transaction);
        request.input('dist_id', sql.Int, distributor_id);

        // Fetch unpaid/partially paid invoices for this distributor (oldest first)
        const unpaidRes = await request.query(`
            SELECT i.invoice_id, i.grand_total, ISNULL(i.paid_amount, 0) as paid_amount
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            WHERE o.distributor_id = @dist_id
              AND i.payment_status != 'PAID'
              AND (i.grand_total - ISNULL(i.paid_amount, 0)) > 0.01
            ORDER BY i.created_at ASC
        `);

        for (let inv of unpaidRes.recordset) {
            if (remainingAmount <= 0) break;

            const pendingOnInvoice = Number(inv.grand_total) - Number(inv.paid_amount);
            const amountToApply = Math.min(remainingAmount, pendingOnInvoice);
            
            remainingAmount -= amountToApply;
            
            const newPaidAmount = Number(inv.paid_amount) + amountToApply;
            let newStatus = 'PARTIAL';
            if (newPaidAmount >= Number(inv.grand_total) - 0.01) {
                newStatus = 'PAID';
            }

            // Insert into Payments
            const payReq = new sql.Request(transaction);
            payReq.input('invoice_id', sql.Int, inv.invoice_id);
            payReq.input('distributor_id', sql.Int, distributor_id);
            payReq.input('amount', sql.Decimal(18, 2), amountToApply);
            payReq.input('payment_mode', sql.VarChar(50), payment_mode);
            payReq.input('reference_no', sql.VarChar(100), reference_no || '');
            payReq.input('payment_date', sql.DateTime, payment_date ? new Date(payment_date) : new Date());
            payReq.input('recorded_by', sql.Int, recordedBy);
            
            await payReq.query(`
                INSERT INTO Payments (invoice_id, distributor_id, amount, payment_mode, reference_no, payment_date, recorded_by)
                VALUES (@invoice_id, @distributor_id, @amount, @payment_mode, @reference_no, @payment_date, @recorded_by)
            `);

            // Update Invoice
            const updateReq = new sql.Request(transaction);
            updateReq.input('newPaidAmount', sql.Decimal(18,2), newPaidAmount);
            updateReq.input('newStatus', sql.VarChar(20), newStatus);
            updateReq.input('invoice_id', sql.Int, inv.invoice_id);
            await updateReq.query(`
                UPDATE Invoices 
                SET paid_amount = @newPaidAmount, payment_status = @newStatus 
                WHERE invoice_id = @invoice_id
            `);
        }

        await transaction.commit();
        res.json({ message: 'Bulk payment processed successfully', remaining_unapplied: remainingAmount });

    } catch (err) {
        console.error("Bulk Payment Error:", err);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to process bulk payment' });
    }
};

// GET /api/ledger/payment/invoice/:invoice_id
exports.getInvoicePayments = async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('invoice_id', sql.Int, req.params.invoice_id);
        const result = await request.query(`
            SELECT p.*, u.firm_name as recorded_by_name
            FROM Payments p
            LEFT JOIN Users u ON p.recorded_by = u.user_id
            WHERE p.invoice_id = @invoice_id
            ORDER BY p.payment_date DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// GET /api/ledger/payment/distributor/:distributor_id
exports.getDistributorLedger = async (req, res) => {
    try {
        // We will return summary + past 20 payments + all unpaid invoices
        const request = new sql.Request();
        request.input('dist_id', sql.Int, req.params.distributor_id);
        
        const summaryRes = await request.query(`
            SELECT SUM(grand_total) as total_billed, SUM(paid_amount) as total_paid
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            WHERE o.distributor_id = @dist_id
        `);
        
        const unpaidRes = await request.query(`
            SELECT i.invoice_id, i.invoice_number, i.grand_total, i.paid_amount, i.created_at, o.order_id
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            WHERE o.distributor_id = @dist_id 
              AND i.payment_status != 'PAID'
              AND (i.grand_total - ISNULL(i.paid_amount, 0)) > 0.01
            ORDER BY i.created_at ASC
        `);

        const paymentsRes = await request.query(`
            SELECT TOP 50 p.*, i.invoice_number
            FROM Payments p
            JOIN Invoices i ON p.invoice_id = i.invoice_id
            WHERE p.distributor_id = @dist_id
            ORDER BY p.payment_date DESC
        `);

        res.json({
            summary: summaryRes.recordset[0],
            unpaid_invoices: unpaidRes.recordset,
            recent_payments: paymentsRes.recordset
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// DELETE /api/ledger/invoice/:invoice_number
exports.deleteInvoice = async (req, res) => {
    try {
        const { invoice_number } = req.params;

        const result = await new sql.Request()
            .input('inv_no', sql.VarChar, invoice_number)
            .query(`
                IF EXISTS (SELECT 1 FROM Invoices WHERE invoice_number = @inv_no)
                BEGIN
                    DECLARE @inv_id INT;
                    SELECT @inv_id = invoice_id FROM Invoices WHERE invoice_number = @inv_no;
                    
                    IF OBJECT_ID('Payments', 'U') IS NOT NULL
                        DELETE FROM Payments WHERE invoice_id = @inv_id;
                        
                    DELETE FROM Invoices WHERE invoice_id = @inv_id;
                END
            `);
            
        res.json({ message: 'Invoice deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete invoice' });
    }
};
