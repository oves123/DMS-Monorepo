const sql = require('mssql');

// GET /api/orders
exports.getAdminOrders = async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT 
                o.order_id, o.status, o.order_date, o.execution_date, o.apply_wallet,
                u.firm_name as distributor_name, u.phone_number as distributor_phone, u.wallet_balance,
                oi.order_item_id, oi.requested_qty, oi.executed_qty, oi.price_at_order,
                v.pack_size, p.name as product_name, p.hsn_code, p.uom, c.name as category_name, v.variant_id,
                inv.current_stock_qty,
                i.credit_applied, i.extra_discount, i.grand_total as final_payable
            FROM Orders o
            JOIN Users u ON o.distributor_id = u.user_id
            JOIN OrderItems oi ON o.order_id = oi.order_id
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            LEFT JOIN Categories c ON p.category_id = c.category_id
            LEFT JOIN Inventory inv ON v.variant_id = inv.variant_id
            LEFT JOIN Invoices i ON o.order_id = i.order_id
            ORDER BY o.order_date DESC
        `);

        // Group items by order
        const ordersMap = {};
        result.recordset.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    order_id: row.order_id,
                    distributor_name: row.distributor_name,
                    distributor_phone: row.distributor_phone,
                    wallet_balance: row.wallet_balance,
                    status: row.status,
                    order_date: row.order_date,
                    execution_date: row.execution_date,
                    apply_wallet: row.apply_wallet,
                    credit_applied: row.credit_applied || 0,
                    extra_discount: row.extra_discount || 0,
                    final_payable: row.final_payable || 0,
                    items: []
                };
            }
            ordersMap[row.order_id].items.push({
                order_item_id: row.order_item_id,
                variant_id: row.variant_id,
                product_name: row.product_name,
                hsn_code: row.hsn_code,
                uom: row.uom,
                category_name: row.category_name,
                pack_size: row.pack_size,
                requested_qty: row.requested_qty,
                executed_qty: row.executed_qty,
                price_at_order: row.price_at_order,
                current_stock: row.current_stock_qty || 0
            });
        });

        const sortedOrders = Object.values(ordersMap).sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        res.json(sortedOrders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// PUT /api/orders/:id/execute
exports.executeOrder = async (req, res) => {
    const transaction = new sql.Transaction();
    try {
        const orderId = req.params.id;
        const { items, credit_applied = 0, extra_discount = 0, discount_reason = '' } = req.body; // Array of { order_item_id, executed_qty, variant_id }
        
        await transaction.begin();

        let subtotal = 0;

        for (let item of items) {
            const reqQty = new sql.Request(transaction);
            reqQty.input('item_id', sql.Int, item.order_item_id);
            reqQty.input('exec_qty', sql.Int, item.executed_qty);
            
            // 1. Update OrderItem executed qty
            await reqQty.query(`
                UPDATE OrderItems SET executed_qty = @exec_qty WHERE order_item_id = @item_id
            `);

            // 2. Deduct from Inventory
            const reqInv = new sql.Request(transaction);
            reqInv.input('variant_id', sql.Int, item.variant_id);
            reqInv.input('exec_qty', sql.Int, item.executed_qty);
            await reqInv.query(`
                UPDATE Inventory SET current_stock_qty = current_stock_qty - @exec_qty
                WHERE variant_id = @variant_id
            `);

            // Calculate subtotal
            // We need price and GST for this variant
            const reqPrice = new sql.Request(transaction);
            reqPrice.input('item_id', sql.Int, item.order_item_id);
            const priceRes = await reqPrice.query(`
                SELECT oi.price_at_order, p.gst_percent 
                FROM OrderItems oi
                JOIN ProductVariants v ON oi.variant_id = v.variant_id
                JOIN Products p ON v.product_id = p.product_id
                WHERE oi.order_item_id = @item_id
            `);
            
            if (priceRes.recordset.length > 0) {
                const price = priceRes.recordset[0].price_at_order;
                // Simplified calculation for demo
                subtotal += (price * item.executed_qty);
            }
        }

        // 3. Update Order Status
        const reqOrder = new sql.Request(transaction);
        reqOrder.input('order_id', sql.Int, orderId);
        await reqOrder.query(`
            UPDATE Orders SET status = 'EXECUTED', execution_date = GETDATE() WHERE order_id = @order_id
        `);

        // Fetch GST Rates
        const gstReq = new sql.Request(transaction);
        const gstRes = await gstReq.query(`SELECT cgst_rate, sgst_rate FROM CompanySettings WHERE setting_id = 1`);
        let cgst_rate = 2.50;
        let sgst_rate = 2.50;
        if (gstRes.recordset.length > 0) {
            if (gstRes.recordset[0].cgst_rate != null) cgst_rate = parseFloat(gstRes.recordset[0].cgst_rate);
            if (gstRes.recordset[0].sgst_rate != null) sgst_rate = parseFloat(gstRes.recordset[0].sgst_rate);
        }

        // 4. Generate Invoice
        const cgst = subtotal * (cgst_rate / 100);
        const sgst = subtotal * (sgst_rate / 100);
        let grand_total = subtotal + cgst + sgst;
        
        // Apply discounts
        grand_total = grand_total - credit_applied - extra_discount;
        if (grand_total < 0) grand_total = 0;

        const invoice_number = 'INV-' + new Date().getTime();

        const reqInvInsert = new sql.Request(transaction);
        reqInvInsert.input('order_id', sql.Int, orderId);
        reqInvInsert.input('inv_no', sql.VarChar, invoice_number);
        reqInvInsert.input('subtotal', sql.Decimal(12,2), subtotal);
        reqInvInsert.input('cgst', sql.Decimal(12,2), cgst);
        reqInvInsert.input('sgst', sql.Decimal(12,2), sgst);
        reqInvInsert.input('total', sql.Decimal(12,2), grand_total);
        reqInvInsert.input('credit_applied', sql.Decimal(12,2), credit_applied);
        reqInvInsert.input('extra_discount', sql.Decimal(12,2), extra_discount);
        reqInvInsert.input('discount_reason', sql.VarChar, discount_reason);

        await reqInvInsert.query(`
            INSERT INTO Invoices (order_id, invoice_number, subtotal, cgst_amount, sgst_amount, grand_total, credit_applied, extra_discount, discount_reason)
            VALUES (@order_id, @inv_no, @subtotal, @cgst, @sgst, @total, @credit_applied, @extra_discount, @discount_reason)
        `);

        // 5. Deduct Wallet Balance if credit applied
        if (credit_applied > 0) {
            // Get distributor_id
            const distReq = new sql.Request(transaction);
            distReq.input('order_id', sql.Int, orderId);
            const distRes = await distReq.query(`SELECT distributor_id FROM Orders WHERE order_id = @order_id`);
            if (distRes.recordset.length > 0) {
                const distId = distRes.recordset[0].distributor_id;
                const walletReq = new sql.Request(transaction);
                walletReq.input('dist_id', sql.Int, distId);
                walletReq.input('credit_applied', sql.Decimal(12,2), credit_applied);
                await walletReq.query(`
                    UPDATE Users SET wallet_balance = wallet_balance - @credit_applied
                    WHERE user_id = @dist_id
                `);
            }
        }

        await transaction.commit();
        res.json({ message: 'Order executed and invoice generated successfully' });
    } catch (err) {
        console.error(err);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to execute order' });
    }
};

// POST /api/orders
// Distributor submits a new order
exports.createOrder = async (req, res) => {
    const transaction = new sql.Transaction();
    try {
        const { distributor_id, items, apply_wallet } = req.body; // items is an array of { variant_id, requested_qty, price_at_order }
        
        await transaction.begin();

        // 1. Create the Order header
        const orderReq = new sql.Request(transaction);
        orderReq.input('distributor_id', sql.Int, distributor_id);
        orderReq.input('status', sql.VarChar, 'PENDING');
        orderReq.input('apply_wallet', sql.Bit, apply_wallet ? 1 : 0);
        const orderRes = await orderReq.query(`
            INSERT INTO Orders (distributor_id, status, order_date, apply_wallet)
            OUTPUT inserted.order_id
            VALUES (@distributor_id, @status, GETDATE(), @apply_wallet)
        `);
        
        const orderId = orderRes.recordset[0].order_id;

        // 2. Insert Order Items
        for (let item of items) {
            const itemReq = new sql.Request(transaction);
            itemReq.input('order_id', sql.Int, orderId);
            itemReq.input('variant_id', sql.Int, item.variant_id);
            itemReq.input('req_qty', sql.Int, item.requested_qty);
            itemReq.input('price', sql.Decimal(10,2), item.price_at_order);

            await itemReq.query(`
                INSERT INTO OrderItems (order_id, variant_id, requested_qty, price_at_order)
                VALUES (@order_id, @variant_id, @req_qty, @price)
            `);
        }

        await transaction.commit();
        res.json({ message: 'Order submitted successfully', order_id: orderId });
    } catch (err) {
        console.error(err);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to submit order' });
    }
};

// GET /api/orders/distributor/:user_id
exports.getDistributorOrders = async (req, res) => {
    try {
        const userId = req.params.user_id;
        const result = await new sql.Request()
            .input('user_id', sql.Int, userId)
            .query(`
            SELECT 
                o.order_id, o.status, o.order_date, o.execution_date, o.apply_wallet,
                oi.order_item_id, oi.requested_qty, oi.executed_qty, oi.price_at_order,
                v.pack_size, p.name as product_name, p.hsn_code, p.uom, c.name as category_name, v.variant_id,
                i.credit_applied, i.extra_discount, i.grand_total as final_payable
            FROM Orders o
            JOIN OrderItems oi ON o.order_id = oi.order_id
            JOIN ProductVariants v ON oi.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            LEFT JOIN Categories c ON p.category_id = c.category_id
            LEFT JOIN Invoices i ON o.order_id = i.order_id
            WHERE o.distributor_id = @user_id
            ORDER BY o.order_date DESC
        `);

        // Group items by order
        const ordersMap = {};
        result.recordset.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    order_id: row.order_id,
                    status: row.status,
                    order_date: row.order_date,
                    execution_date: row.execution_date,
                    apply_wallet: row.apply_wallet,
                    credit_applied: row.credit_applied || 0,
                    extra_discount: row.extra_discount || 0,
                    final_payable: row.final_payable || 0,
                    items: []
                };
            }
            ordersMap[row.order_id].items.push({
                order_item_id: row.order_item_id,
                variant_id: row.variant_id,
                product_name: row.product_name,
                hsn_code: row.hsn_code,
                uom: row.uom,
                category_name: row.category_name,
                pack_size: row.pack_size,
                requested_qty: row.requested_qty,
                executed_qty: row.executed_qty,
                price_at_order: row.price_at_order
            });
        });

        const sortedOrders = Object.values(ordersMap).sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        res.json(sortedOrders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
