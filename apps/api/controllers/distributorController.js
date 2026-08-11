const sql = require('mssql');
const bcrypt = require('bcryptjs');

// GET /api/distributors
exports.getDistributors = async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT user_id, firm_name, gst_number, address, phone_number, created_at,
                   owner_name, fssai_number, wallet_balance, rate_type, role,
                   CASE WHEN pan_card IS NOT NULL THEN 1 ELSE 0 END as has_pan,
                   CASE WHEN aadhar_card IS NOT NULL THEN 1 ELSE 0 END as has_aadhar,
                   CASE WHEN photo IS NOT NULL THEN 1 ELSE 0 END as has_photo
            FROM Users 
            WHERE role IN ('DISTRIBUTOR', 'ND', 'OFFLINE_CLIENT')
            ORDER BY created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// GET /api/distributors/:id
exports.getDistributorById = async (req, res) => {
    try {
        const user_id = req.params.id;
        const request = new sql.Request();
        request.input('user_id', sql.Int, user_id);
        const result = await request.query(`
            SELECT user_id, firm_name, gst_number, address, phone_number, created_at,
                   owner_name, fssai_number, wallet_balance, rate_type, role,
                   CASE WHEN pan_card IS NOT NULL THEN 1 ELSE 0 END as has_pan,
                   CASE WHEN aadhar_card IS NOT NULL THEN 1 ELSE 0 END as has_aadhar,
                   CASE WHEN photo IS NOT NULL THEN 1 ELSE 0 END as has_photo
            FROM Users 
            WHERE user_id = @user_id AND role IN ('DISTRIBUTOR', 'ND', 'OFFLINE_CLIENT')
        `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Distributor not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// GET /api/distributors/:id/wallet
exports.getWalletBalance = async (req, res) => {
    try {
        const user_id = req.params.id;
        const request = new sql.Request();
        request.input('user_id', sql.Int, user_id);
        const result = await request.query(`SELECT wallet_balance FROM Users WHERE user_id = @user_id`);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ wallet_balance: result.recordset[0].wallet_balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// GET /api/distributors/:id/file/:type
exports.getFile = async (req, res) => {
    try {
        const user_id = req.params.id;
        const type = req.params.type;
        
        let column = '';
        if (type === 'pan') column = 'pan_card';
        else if (type === 'aadhar') column = 'aadhar_card';
        else if (type === 'photo') column = 'photo';
        else return res.status(400).json({ message: 'Invalid file type' });

        const request = new sql.Request();
        request.input('user_id', sql.Int, user_id);
        const result = await request.query(`SELECT ${column} as fileData FROM Users WHERE user_id = @user_id`);
        
        if (result.recordset.length === 0 || !result.recordset[0].fileData) {
            return res.status(404).json({ message: 'File not found' });
        }
        
        const fileData = result.recordset[0].fileData;
        
        // Basic response
        res.set('Content-Type', 'image/jpeg');
        res.send(fileData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/distributors
    exports.addDistributor = async (req, res) => {
    try {
        const { firm_name, gst_number, address, phone_number, password, owner_name, fssai_number, rate_type } = req.body;

        const pan_card_buffer = req.files && req.files.panFile ? req.files.panFile[0].buffer : null;
        const aadhar_card_buffer = req.files && req.files.aadharFile ? req.files.aadharFile[0].buffer : null;
        const photo_buffer = req.files && req.files.photoFile ? req.files.photoFile[0].buffer : null;

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const request = new sql.Request();
        request.input('role', sql.VarChar, 'DISTRIBUTOR');
        request.input('firm_name', sql.VarChar, firm_name);
        request.input('gst_number', sql.VarChar, gst_number || null);
        request.input('address', sql.VarChar, address || null);
        request.input('phone_number', sql.VarChar, phone_number);
        request.input('password_hash', sql.VarChar, hashedPassword); 
        request.input('owner_name', sql.VarChar, owner_name || null);
        request.input('fssai_number', sql.VarChar, fssai_number || null);
        request.input('rate_type', sql.VarChar, rate_type || 'distributor');
        request.input('pan_card', sql.VarBinary, pan_card_buffer);
        request.input('aadhar_card', sql.VarBinary, aadhar_card_buffer);
        request.input('photo', sql.VarBinary, photo_buffer);

        await request.query(`
            INSERT INTO Users (role, firm_name, gst_number, address, phone_number, password_hash, owner_name, fssai_number, rate_type, pan_card, aadhar_card, photo)
            VALUES (@role, @firm_name, @gst_number, @address, @phone_number, @password_hash, @owner_name, @fssai_number, @rate_type, @pan_card, @aadhar_card, @photo)
        `);

        res.status(201).json({ message: 'Distributor created successfully' });
    } catch (err) {
        console.error(err);
        if (err.number === 2627) {
            return res.status(400).json({ message: 'Phone number already registered' });
        }
        res.status(500).json({ message: 'Failed to create distributor' });
    }
};

// POST /api/distributors/bulk
exports.bulkUploadDistributors = async (req, res) => {
    try {
        const distributors = req.body; // Expects an array of objects
        
        if (!Array.isArray(distributors) || distributors.length === 0) {
            return res.status(400).json({ message: 'Invalid data format. Expected a non-empty array.' });
        }

        // For simplicity and safety with hashes, we'll loop with individual requests.
        let successCount = 0;
        let skipCount = 0;

        for (const dist of distributors) {
            const firm_name = dist['Firm Name'] || dist.firm_name;
            const phone_number = dist['Mobile No'] || dist.phone_number;
            const password = dist['Password'] || dist.password || phone_number;
            const gst_number = dist['GST no'] || dist['GST No.'] || dist.gst_number;
            const address = dist['Address'] || dist.address;
            const owner_name = dist['Owner Name'] || dist.owner_name;
            const fssai_number = dist['FSSAI Number'] || dist.fssai_number;
            
            if (!firm_name || !phone_number || !password) {
                skipCount++;
                continue; // Skip invalid rows
            }

            try {
                const request = new sql.Request();
                // Check if phone number already exists
                const checkReq = new sql.Request();
                checkReq.input('phone_number', sql.VarChar, phone_number);
                const check = await checkReq.query(`SELECT user_id FROM Users WHERE phone_number = @phone_number`);
                if (check.recordset.length > 0) {
                    skipCount++;
                    continue; // Skip existing phone numbers
                }

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                request.input('role', sql.VarChar, 'DISTRIBUTOR');
                request.input('firm_name', sql.VarChar, firm_name);
                request.input('gst_number', sql.VarChar, gst_number || null);
                request.input('address', sql.VarChar, address || null);
                request.input('phone_number', sql.VarChar, phone_number);
                request.input('password_hash', sql.VarChar, hashedPassword);
                request.input('owner_name', sql.VarChar, owner_name || null);
                request.input('fssai_number', sql.VarChar, fssai_number || null);

                await request.query(`
                    INSERT INTO Users (role, firm_name, gst_number, address, phone_number, password_hash, owner_name, fssai_number)
                    VALUES (@role, @firm_name, @gst_number, @address, @phone_number, @password_hash, @owner_name, @fssai_number)
                `);
                
                successCount++;
            } catch (innerErr) {
                console.error("Row insert error:", innerErr);
                skipCount++;
            }
        }

        res.status(200).json({ 
            message: 'Bulk upload completed', 
            successCount, 
            skipCount 
        });
    } catch (err) {
        console.error("Bulk Upload Error:", err);
        res.status(500).json({ message: 'Failed to process bulk upload' });
    }
};

// PUT /api/distributors/:id
exports.updateDistributor = async (req, res) => {
    try {
        const user_id = req.params.id;
        const { firm_name, gst_number, address, phone_number, owner_name, fssai_number, password, rate_type } = req.body;

        const request = new sql.Request();
        request.input('user_id', sql.Int, user_id);
        request.input('firm_name', sql.VarChar, firm_name);
        request.input('gst_number', sql.VarChar, gst_number || null);
        request.input('address', sql.VarChar, address || null);
        request.input('phone_number', sql.VarChar, phone_number);
        request.input('owner_name', sql.VarChar, owner_name || null);
        request.input('fssai_number', sql.VarChar, fssai_number || null);
        request.input('rate_type', sql.VarChar, rate_type || 'distributor');

        let updateFields = `firm_name = @firm_name, gst_number = @gst_number, address = @address, phone_number = @phone_number, owner_name = @owner_name, fssai_number = @fssai_number, rate_type = @rate_type`;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            request.input('password_hash', sql.VarChar, hashedPassword);
            updateFields += `, password_hash = @password_hash`;
        }

        if (req.files && req.files.panFile) {
            request.input('pan_card', sql.VarBinary, req.files.panFile[0].buffer);
            updateFields += `, pan_card = @pan_card`;
        }
        if (req.files && req.files.aadharFile) {
            request.input('aadhar_card', sql.VarBinary, req.files.aadharFile[0].buffer);
            updateFields += `, aadhar_card = @aadhar_card`;
        }
        if (req.files && req.files.photoFile) {
            request.input('photo', sql.VarBinary, req.files.photoFile[0].buffer);
            updateFields += `, photo = @photo`;
        }

        await request.query(`
            UPDATE Users
            SET ${updateFields}
            WHERE user_id = @user_id AND role IN ('DISTRIBUTOR', 'ND', 'OFFLINE_CLIENT')
        `);

        res.json({ message: 'Distributor updated successfully' });
    } catch (err) {
        console.error(err);
        if (err.number === 2627) {
            return res.status(400).json({ message: 'Phone number already registered' });
        }
        res.status(500).json({ message: 'Failed to update distributor' });
    }
};

// DELETE /api/distributors/:id
exports.deleteDistributor = async (req, res) => {
    try {
        const user_id = req.params.id;
        const request = new sql.Request();
        
        request.input('user_id', sql.Int, user_id);
        
        // Ensure they aren't deleting an SD_ADMIN
        const check = await request.query(`SELECT role FROM Users WHERE user_id = @user_id`);
        if (check.recordset.length === 0 || !['DISTRIBUTOR', 'ND', 'OFFLINE_CLIENT'].includes(check.recordset[0].role)) {
            return res.status(400).json({ message: 'Invalid operation' });
        }

        await request.query(`DELETE FROM Users WHERE user_id = @user_id`);

        res.json({ message: 'Distributor deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete distributor' });
    }
};
