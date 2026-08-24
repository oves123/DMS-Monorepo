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

        const ledgerArray = Object.values(ledgerMap);
        ledgerArray.sort((a, b) => {
            const dateA = a.invoices.length > 0 ? new Date(a.invoices[0].created_at) : new Date(0);
            const dateB = b.invoices.length > 0 ? new Date(b.invoices[0].created_at) : new Date(0);
            return dateB - dateA;
        });

        res.json(ledgerArray);
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
            SELECT oi.order_item_id, oi.variant_id, p.name AS product_name, p.hsn_code, p.gst_percent, v.uom, c.name AS category_name, v.pack_size, v.pieces_per_box, oi.executed_qty, oi.price_at_order, (oi.executed_qty * oi.price_at_order) as item_total
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
                i.pdf_url, i.extra_discount,
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
            SELECT p.name AS product_name, p.hsn_code, p.gst_percent, v.uom, c.name AS category_name, v.pack_size, oi.executed_qty, oi.price_at_order, (oi.executed_qty * oi.price_at_order) as item_total
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

        const fs = require('fs');
        const path = require('path');
        const pdfPath = path.join(__dirname, '../', pdfUrl);

        if (fs.existsSync(pdfPath)) {
            res.download(pdfPath, `Invoice_${invoice.invoice_number}.pdf`);
        } else {
            res.status(404).json({ message: 'File not found on server' });
        }
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
        request.input('newPaidAmount', sql.Decimal(18, 2), newPaidAmount);
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
            updateReq.input('newPaidAmount', sql.Decimal(18, 2), newPaidAmount);
            updateReq.input('newStatus', sql.VarChar(20), newStatus);
            updateReq.input('invoice_id', sql.Int, inv.invoice_id);
            await updateReq.query(`
                UPDATE Invoices 
                SET paid_amount = @newPaidAmount, payment_status = @newStatus 
                WHERE invoice_id = @invoice_id
            `);
        }

        if (remainingAmount > 0) {
            const wallReq = new sql.Request(transaction);
            wallReq.input('add_amt', sql.Decimal(18, 2), remainingAmount);
            wallReq.input('dist_id', sql.Int, distributor_id);
            await wallReq.query(`
                UPDATE Users 
                SET wallet_balance = COALESCE(wallet_balance, 0) + @add_amt 
                WHERE user_id = @dist_id
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

// GET /api/ledger/payment/distributor/:distributor_id/download
exports.downloadDistributorLedger = async (req, res) => {
    try {
        const distId = req.params.distributor_id;
        const request = new sql.Request();
        request.input('dist_id', sql.Int, distId);

        // Get Settings
        const settingsRes = await request.query(`SELECT TOP 1 * FROM CompanySettings`);
        const settings = settingsRes.recordset[0] || {};

        // Get Distributor Details
        const distRes = await request.query(`
            SELECT TOP 1 u.firm_name, u.owner_name, u.address, u.phone_number, u.user_id as distributor_id
            FROM Users u WHERE u.user_id = @dist_id
        `);
        const distributorDetails = distRes.recordset[0];

        if (!distributorDetails) {
            return res.status(404).json({ message: 'Distributor not found' });
        }

        // Get Summary
        const summaryRes = await request.query(`
            SELECT SUM(grand_total) as total_billed, SUM(paid_amount) as total_paid
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            WHERE o.distributor_id = @dist_id
        `);

        const summary = summaryRes.recordset[0] || { total_billed: 0, total_paid: 0 };
        summary.total_pending = (summary.total_billed || 0) - (summary.total_paid || 0);

        // Get all Invoices (Debits)
        const invoicesRes = await request.query(`
            SELECT i.invoice_number as ref, i.grand_total as amount, i.created_at as date
            FROM Invoices i
            JOIN Orders o ON i.order_id = o.order_id
            WHERE o.distributor_id = @dist_id 
        `);

        // Get all Payments (Credits)
        const paymentsRes = await request.query(`
            SELECT p.payment_mode as ref, p.amount, p.payment_date as date
            FROM Payments p
            WHERE p.distributor_id = @dist_id
        `);

        // Merge and Sort
        let history = [];
        invoicesRes.recordset.forEach(inv => {
            history.push({
                date: inv.date,
                type: 'INVOICE',
                ref: inv.ref,
                debit: inv.amount,
                credit: null
            });
        });

        paymentsRes.recordset.forEach(pay => {
            history.push({
                date: pay.date,
                type: 'PAYMENT',
                ref: pay.ref || 'Payment',
                debit: null,
                credit: pay.amount
            });
        });

        history.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate Running Balance
        let runningBalance = 0;
        history = history.map(item => {
            if (item.type === 'INVOICE') {
                runningBalance += item.debit;
            } else {
                runningBalance -= item.credit;
            }
            return { ...item, balance: runningBalance };
        });

        const ledgerData = { summary, history };

        const { generateLedgerPdf } = require('../services/pdfService');
        const pdfPath = await generateLedgerPdf(ledgerData, distributorDetails, settings);

        res.download(pdfPath, `Ledger_${distributorDetails.firm_name.replace(/[^a-z0-9]/gi, '_')}.pdf`, (err) => {
            if (err) console.error("Error sending PDF:", err);
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error generating ledger PDF' });
    }
};

// POST /api/ledger/credit-note
exports.issueCreditNote = async (req, res) => {
    const transaction = new sql.Transaction();
    try {
        const { distributor_id, invoice_id, items, is_paid_out, payment_mode, adminId, is_direct_amount, direct_amount, reason } = req.body;

        if (!distributor_id) {
            return res.status(400).json({ message: 'Invalid data for credit note' });
        }
        if (!is_direct_amount && (!invoice_id || !items || items.length === 0)) {
            return res.status(400).json({ message: 'Invalid data for defective credit note' });
        }
        if (is_direct_amount && (!direct_amount || direct_amount <= 0)) {
            return res.status(400).json({ message: 'Invalid direct amount' });
        }

        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Fetch settings for GST
        const settingsRes = await request.query(`SELECT TOP 1 * FROM CompanySettings`);
        const settings = settingsRes.recordset[0] || {};
        const cgstRate = settings.cgst_rate || 2.5;
        const sgstRate = settings.sgst_rate || 2.5;

        // 2. Calculate Total Amount
        let totalCreditAmount = 0;
        let finalItems = [];

        if (is_direct_amount) {
            const taxable = parseFloat(direct_amount);
            totalCreditAmount = taxable;
            finalItems = [{
                variant_id: null,
                quantity: 1,
                pieces_qty: 0,
                reason: reason || 'Direct Amount / Subsidy',
                price_at_order: taxable,
                item_total: taxable,
                product_name: reason || 'Direct Amount / Subsidy',
                pack_size: '-',
                hsn_code: '-',
                total_qty: 1
            }];
        } else {
            for (let item of items) {
                const itemTaxable = item.item_total;
                const gstPct = parseFloat(item.gst_percent) || 0;
                const itemCGST = itemTaxable * ((gstPct / 2) / 100);
                const itemSGST = itemTaxable * ((gstPct / 2) / 100);
                totalCreditAmount += (itemTaxable + itemCGST + itemSGST);
            }
            finalItems = items;
        }

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        let startYear, endYear;
        if (currentMonth >= 3) {
            startYear = currentYear;
            endYear = currentYear + 1;
        } else {
            startYear = currentYear - 1;
            endYear = currentYear;
        }
        const finYearString = `${startYear}-${endYear}`;

        const seqReq = new sql.Request(transaction);
        seqReq.input('finYear', sql.VarChar, `%/${finYearString}`);
        const seqRes = await seqReq.query(`
            SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(credit_note_number, 1, CHARINDEX('/', credit_note_number) - 1) AS INT)), 0) + 1 AS next_seq
            FROM CreditNotes WITH (UPDLOCK)
            WHERE credit_note_number LIKE @finYear
              AND CHARINDEX('/', credit_note_number) > 0
        `);
        let nextSeq = seqRes.recordset[0].next_seq;

        // Offset for the current year since 31 invoices were already created externally
        if (finYearString === '2026-2027' && nextSeq === 1) {
            nextSeq = 32;
        }

        const creditNoteNumber = `${nextSeq}/${finYearString}`;

        const finalPaymentMode = is_paid_out ? payment_mode : 'Credit Note (Wallet)';

        // 3. Insert CreditNote
        request.input('credit_note_number', sql.VarChar(50), creditNoteNumber);
        request.input('distributor_id', sql.Int, distributor_id);
        request.input('invoice_id', sql.Int, is_direct_amount ? null : invoice_id);
        request.input('amount', sql.Decimal(12, 2), totalCreditAmount);
        request.input('payment_mode', sql.VarChar(50), finalPaymentMode);
        request.input('is_paid_out', sql.Bit, is_paid_out ? 1 : 0);

        const cnInsertRes = await request.query(`
            INSERT INTO CreditNotes (credit_note_number, distributor_id, invoice_id, amount, payment_mode, is_paid_out)
            OUTPUT INSERTED.credit_note_id, INSERTED.created_at
            VALUES (@credit_note_number, @distributor_id, @invoice_id, @amount, @payment_mode, @is_paid_out)
        `);
        const creditNoteId = cnInsertRes.recordset[0].credit_note_id;
        const createdAt = cnInsertRes.recordset[0].created_at;

        // 4. Insert Items
        for (let item of finalItems) {
            const itemReq = new sql.Request(transaction);
            itemReq.input('credit_note_id', sql.Int, creditNoteId);
            itemReq.input('variant_id', sql.Int, item.variant_id);
            itemReq.input('quantity', sql.Int, item.quantity);
            itemReq.input('pieces_qty', sql.Int, item.pieces_qty);
            itemReq.input('reason', sql.VarChar(255), item.reason || '');
            itemReq.input('price_at_order', sql.Decimal(10, 2), item.price_at_order);
            itemReq.input('item_total', sql.Decimal(12, 2), item.item_total);

            await itemReq.query(`
                INSERT INTO CreditNoteItems (credit_note_id, variant_id, quantity, pieces_qty, reason, price_at_order, item_total)
                VALUES (@credit_note_id, @variant_id, @quantity, @pieces_qty, @reason, @price_at_order, @item_total)
            `);
        }

        // 5. Apply Credit Note using Auto-Reconciliation
        let remainingCredit = totalCreditAmount;
        const appliedDetailsArr = [];
        let finalAppliedDetails = '';

        if (is_paid_out) {
            // Refund directly to Cash/UPI without wallet or invoices
            const payOutReq = new sql.Request(transaction);
            payOutReq.input('inv_id', sql.Int, is_direct_amount ? null : invoice_id);
            payOutReq.input('dist_id', sql.Int, distributor_id);
            payOutReq.input('amt', sql.Decimal(18, 2), -totalCreditAmount); // Note: Refund is negative in Payments normally, but since we are just logging the CN, let's keep it positive for the credit note and negative for refund? Wait, if it's paid out, we just don't add to wallet. Actually, let's just log it as a refund payment.
            payOutReq.input('pm', sql.VarChar(50), `Refund: ${payment_mode}`);
            payOutReq.input('ref', sql.VarChar(100), `CN: ${creditNoteNumber}`);
            payOutReq.input('rec_by', sql.Int, adminId || 1);
            await payOutReq.query(`
                INSERT INTO Payments (invoice_id, distributor_id, amount, payment_mode, reference_no, payment_date, recorded_by)
                VALUES (@inv_id, @dist_id, @amt, @pm, @ref, GETDATE(), @rec_by)
            `);
            appliedDetailsArr.push(`Refunded via ${payment_mode} (₹${totalCreditAmount.toFixed(2)})`);
        } else {
            // Auto-Reconciliation for Unpaid Invoices
            const unpaidReq = new sql.Request(transaction);
            unpaidReq.input('dist_id', sql.Int, distributor_id);
            const unpaidRes = await unpaidReq.query(`
                SELECT i.invoice_id, i.invoice_number, i.grand_total, ISNULL(i.paid_amount, 0) AS paid_amount, i.created_at
                FROM Invoices i WITH (UPDLOCK)
                JOIN Orders o ON i.order_id = o.order_id
                WHERE o.distributor_id = @dist_id AND i.payment_status != 'PAID'
                ORDER BY i.created_at ASC
            `);
            let pendingInvoices = unpaidRes.recordset;

            // If a specific invoice is selected (Defective Products), move it to the top of the queue
            if (!is_direct_amount && invoice_id) {
                const specificIdx = pendingInvoices.findIndex(inv => inv.invoice_id === invoice_id);
                if (specificIdx > -1) {
                    const specificInv = pendingInvoices.splice(specificIdx, 1)[0];
                    pendingInvoices.unshift(specificInv);
                } else {
                    // It might be already fully paid. 
                    // If so, the money just naturally flows to other unpaid invoices (or wallet).
                }
            }

            for (let inv of pendingInvoices) {
                if (remainingCredit <= 0.001) break; // Float tolerance

                let pendingAmount = inv.grand_total - inv.paid_amount;
                if (pendingAmount <= 0) continue;

                let amountToApply = Math.min(pendingAmount, remainingCredit);
                remainingCredit -= amountToApply;

                const newPaid = inv.paid_amount + amountToApply;
                // Add a small tolerance for floating point comparison
                const newStatus = newPaid >= (inv.grand_total - 0.01) ? 'PAID' : 'PARTIAL';

                const applyReq = new sql.Request(transaction);
                applyReq.input('inv_id', sql.Int, inv.invoice_id);
                applyReq.input('add_amt', sql.Decimal(18, 2), amountToApply);
                applyReq.input('status', sql.VarChar(20), newStatus);
                await applyReq.query(`
                    UPDATE Invoices 
                    SET paid_amount = paid_amount + @add_amt, payment_status = @status
                    WHERE invoice_id = @inv_id
                `);

                const payReq = new sql.Request(transaction);
                payReq.input('inv_id', sql.Int, inv.invoice_id);
                payReq.input('dist_id', sql.Int, distributor_id);
                payReq.input('amt', sql.Decimal(18, 2), amountToApply);
                payReq.input('pm', sql.VarChar(50), 'Credit Note Applied');
                payReq.input('ref', sql.VarChar(100), `CN: ${creditNoteNumber}`);
                payReq.input('rec_by', sql.Int, adminId || 1);
                await payReq.query(`
                    INSERT INTO Payments (invoice_id, distributor_id, amount, payment_mode, reference_no, payment_date, recorded_by)
                    VALUES (@inv_id, @dist_id, @amt, @pm, @ref, GETDATE(), @rec_by)
                `);

                appliedDetailsArr.push(`${inv.invoice_number} (₹${amountToApply.toFixed(2)})`);
            }

            // Leftover goes to wallet
            if (remainingCredit > 0.001) {
                const wallReq = new sql.Request(transaction);
                wallReq.input('dist_id', sql.Int, distributor_id);
                wallReq.input('amt', sql.Decimal(18, 2), remainingCredit);
                await wallReq.query(`
                    UPDATE Users 
                    SET wallet_balance = COALESCE(wallet_balance, 0) + @amt
                    WHERE user_id = @dist_id
                `);
                appliedDetailsArr.push(`Wallet (₹${remainingCredit.toFixed(2)})`);
            }
        }

        finalAppliedDetails = appliedDetailsArr.join(', ');

        const updateCnReq = new sql.Request(transaction);
        updateCnReq.input('cn_id', sql.Int, creditNoteId);
        updateCnReq.input('details', sql.VarChar(1000), finalAppliedDetails);
        await updateCnReq.query(`
            UPDATE CreditNotes SET applied_details = @details WHERE credit_note_id = @cn_id
        `);

        await transaction.commit();

        // 6. Generate PDF outside transaction
        try {
            const { generateCreditNotePdf } = require('../services/pdfService');

            const distReq = new sql.Request();
            distReq.input('d_id', sql.Int, distributor_id);
            const distRes = await distReq.query(`SELECT firm_name, owner_name, address, fssai_number FROM Users WHERE user_id = @d_id`);
            const distributorDetails = distRes.recordset[0];

            const creditNoteData = {
                credit_note: {
                    credit_note_number: creditNoteNumber,
                    created_at: createdAt,
                    amount: totalCreditAmount,
                    applied_details: finalAppliedDetails
                },
                items: finalItems
            };

            const pdfUrl = await generateCreditNotePdf(creditNoteData, distributorDetails, settings);

            const updatePdfReq = new sql.Request();
            updatePdfReq.input('pdf_url', sql.VarChar(255), pdfUrl);
            updatePdfReq.input('cn_id', sql.Int, creditNoteId);
            await updatePdfReq.query(`UPDATE CreditNotes SET pdf_url = @pdf_url WHERE credit_note_id = @cn_id`);
        } catch (pdfErr) {
            console.error('Error generating Credit Note PDF:', pdfErr);
        }

        res.json({ message: 'Credit Note issued successfully.' });
    } catch (err) {
        console.error(err);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to issue credit note' });
    }
};

// GET /api/ledger/credit-note
exports.getAllCreditNotes = async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query(`
            SELECT cn.credit_note_id, cn.credit_note_number, cn.invoice_id, 
                   i.invoice_number, cn.amount, cn.payment_mode, cn.is_paid_out,
                   cn.pdf_url, cn.created_at, cn.applied_details,
                   u.firm_name as distributor_name, u.user_id as distributor_id
            FROM CreditNotes cn
            LEFT JOIN Invoices i ON cn.invoice_id = i.invoice_id
            JOIN Users u ON cn.distributor_id = u.user_id
            ORDER BY cn.created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error fetching all credit notes' });
    }
};

// GET /api/ledger/credit-note/distributor/:distributor_id
exports.getCreditNotes = async (req, res) => {
    try {
        const { distributor_id } = req.params;
        const request = new sql.Request();
        request.input('distributor_id', sql.Int, distributor_id);

        const result = await request.query(`
            SELECT cn.credit_note_id, cn.credit_note_number, cn.invoice_id, 
                   i.invoice_number, cn.amount, cn.payment_mode, cn.is_paid_out,
                   cn.pdf_url, cn.created_at, cn.applied_details
            FROM CreditNotes cn
            LEFT JOIN Invoices i ON cn.invoice_id = i.invoice_id
            WHERE cn.distributor_id = @distributor_id
            ORDER BY cn.created_at DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error fetching credit notes' });
    }
};

// GET /api/ledger/credit-note/:credit_note_id/download
exports.downloadCreditNote = async (req, res) => {
    try {
        const { credit_note_id } = req.params;
        const request = new sql.Request();
        request.input('credit_note_id', sql.Int, credit_note_id);

        const cnRes = await request.query(`SELECT pdf_url FROM CreditNotes WHERE credit_note_id = @credit_note_id`);

        if (cnRes.recordset.length === 0 || !cnRes.recordset[0].pdf_url) {
            return res.status(404).json({ message: 'Credit Note PDF not found' });
        }

        const path = require('path');
        const fs = require('fs');
        const pdfPath = path.join(__dirname, '../', cnRes.recordset[0].pdf_url);

        if (fs.existsSync(pdfPath)) {
            res.download(pdfPath);
        } else {
            res.status(404).json({ message: 'File not found on server' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
// GET /api/ledger/credit-note/:credit_note_id/items
exports.getCreditNoteItems = async (req, res) => {
    try {
        const { credit_note_id } = req.params;
        const request = new sql.Request();
        request.input('credit_note_id', sql.Int, credit_note_id);

        const result = await request.query(`
            SELECT cni.quantity, cni.pieces_qty, cni.reason, cni.price_at_order, cni.item_total,
                   p.name as product_name, v.pack_size
            FROM CreditNoteItems cni
            JOIN ProductVariants v ON cni.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            WHERE cni.credit_note_id = @credit_note_id
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error fetching credit note items' });
    }
};

// GET /api/ledger/credit-note-stats
exports.getCreditNoteStats = async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query(`
            SELECT TOP 1 reason, COUNT(*) as count
            FROM CreditNoteItems
            WHERE reason IS NOT NULL AND reason != ''
            GROUP BY reason
            ORDER BY count DESC
        `);
        let topReason = 'N/A';
        if (result.recordset.length > 0) topReason = result.recordset[0].reason;
        res.json({ topReason });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error fetching credit note stats' });
    }
};
