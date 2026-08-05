const sql = require('mssql');

exports.submitClaim = async (req, res) => {
    try {
        const { order_id, variant_id, quantity, pieces_qty, reason, distributor_id } = req.body;
        const image_binary = req.file ? req.file.buffer : null;

        const request = new sql.Request();
        request.input('distributor_id', sql.Int, distributor_id);
        request.input('order_id', sql.Int, order_id || null);
        request.input('variant_id', sql.Int, variant_id);
        request.input('quantity', sql.Int, parseInt(quantity) || 0);
        request.input('pieces_qty', sql.Int, parseInt(pieces_qty) || 0);
        request.input('reason', sql.VarChar, reason);
        request.input('image_binary', sql.VarBinary, image_binary);
        request.input('status', sql.VarChar, 'PENDING');

        await request.query(`
            INSERT INTO Claims (distributor_id, order_id, variant_id, quantity, pieces_qty, reason, image_binary, status)
            VALUES (@distributor_id, @order_id, @variant_id, @quantity, @pieces_qty, @reason, @image_binary, @status)
        `);

        res.status(201).json({ message: 'Claim submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getClaimImage = async (req, res) => {
    try {
        const claimId = req.params.claim_id;
        const result = await new sql.Request().query(`
            SELECT image_binary FROM Claims WHERE claim_id = ${claimId}
        `);
        
        if (result.recordset.length > 0 && result.recordset[0].image_binary) {
            res.setHeader('Content-Type', 'image/jpeg'); // or image/png based on your needs
            res.send(result.recordset[0].image_binary);
        } else {
            res.status(404).send('Image not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

exports.getClaims = async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT c.claim_id, c.distributor_id, u.firm_name as distributor_name, 
                   c.order_id, c.variant_id, p.name as product_name, v.pack_size, v.pieces_per_box,
                   c.quantity, c.pieces_qty, c.reason, c.status, c.created_at,
                   CASE WHEN c.image_binary IS NOT NULL THEN 1 ELSE 0 END as has_image,
                   (c.quantity * v.distributor_rate) + (c.pieces_qty * (v.distributor_rate / ISNULL(NULLIF(v.pieces_per_box, 0), 1))) as claim_amount
            FROM Claims c
            JOIN Users u ON c.distributor_id = u.user_id
            JOIN ProductVariants v ON c.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            ORDER BY c.created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateClaimStatus = async (req, res) => {
    const transaction = new sql.Transaction();
    try {
        const { claim_id } = req.params;
        const { status, amount } = req.body; // amount is required if APPROVED

        if (status !== 'APPROVED' && status !== 'REJECTED') {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await transaction.begin();
        const request = new sql.Request(transaction);
        request.input('claim_id', sql.Int, claim_id);
        request.input('status', sql.VarChar, status);

        const claimRes = await request.query(`
            SELECT distributor_id, status FROM Claims WHERE claim_id = @claim_id
        `);

        if (claimRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Claim not found' });
        }
        
        if (claimRes.recordset[0].status !== 'PENDING') {
            await transaction.rollback();
            return res.status(400).json({ message: 'Claim is already processed' });
        }

        const distributor_id = claimRes.recordset[0].distributor_id;

        await request.query(`
            UPDATE Claims SET status = @status WHERE claim_id = @claim_id
        `);

        if (status === 'APPROVED') {
            if (!amount || isNaN(amount)) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Amount is required for approval' });
            }

            request.input('amount', sql.Decimal(12,2), amount);
            request.input('distributor_id', sql.Int, distributor_id);

            // Create Credit Note
            await request.query(`
                INSERT INTO CreditNotes (claim_id, distributor_id, amount)
                VALUES (@claim_id, @distributor_id, @amount)
            `);

            // Increase Wallet Balance
            await request.query(`
                UPDATE Users SET wallet_balance = wallet_balance + @amount
                WHERE user_id = @distributor_id
            `);
        }

        await transaction.commit();
        res.json({ message: `Claim ${status.toLowerCase()} successfully` });
    } catch (err) {
        console.error(err);
        await transaction.rollback();
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getDistributorClaims = async (req, res) => {
    try {
        const distributor_id = req.params.distributor_id;
        const result = await new sql.Request().query(`
            SELECT c.claim_id, c.distributor_id, c.order_id, c.variant_id, 
                   p.name as product_name, v.pack_size, v.pieces_per_box,
                   c.quantity, c.pieces_qty, c.reason, c.status, c.created_at,
                   CASE WHEN c.image_binary IS NOT NULL THEN 1 ELSE 0 END as has_image,
                   (c.quantity * v.distributor_rate) + (c.pieces_qty * (v.distributor_rate / ISNULL(NULLIF(v.pieces_per_box, 0), 1))) as claim_amount
            FROM Claims c
            JOIN ProductVariants v ON c.variant_id = v.variant_id
            JOIN Products p ON v.product_id = p.product_id
            WHERE c.distributor_id = ${distributor_id}
            ORDER BY c.created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
