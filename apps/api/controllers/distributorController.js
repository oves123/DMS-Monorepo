const sql = require('mssql');
const bcrypt = require('bcryptjs');

// GET /api/distributors
exports.getDistributors = async (req, res) => {
    try {
        const result = await new sql.Request().query(`
            SELECT user_id, firm_name, gst_number, address, phone_number, created_at 
            FROM Users 
            WHERE role = 'DISTRIBUTOR'
            ORDER BY created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/distributors
exports.addDistributor = async (req, res) => {
    try {
        const { firm_name, gst_number, address, phone_number, password } = req.body;

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const request = new sql.Request();
        request.input('role', sql.VarChar, 'DISTRIBUTOR');
        request.input('firm_name', sql.VarChar, firm_name);
        request.input('gst_number', sql.VarChar, gst_number);
        request.input('address', sql.VarChar, address || null);
        request.input('phone_number', sql.VarChar, phone_number);
        request.input('password_hash', sql.VarChar, hashedPassword); 

        await request.query(`
            INSERT INTO Users (role, firm_name, gst_number, address, phone_number, password_hash)
            VALUES (@role, @firm_name, @gst_number, @address, @phone_number, @password_hash)
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

// PUT /api/distributors/:id
exports.updateDistributor = async (req, res) => {
    try {
        const user_id = req.params.id;
        const { firm_name, gst_number, address, phone_number } = req.body;

        const request = new sql.Request();
        request.input('user_id', sql.Int, user_id);
        request.input('firm_name', sql.VarChar, firm_name);
        request.input('gst_number', sql.VarChar, gst_number || null);
        request.input('address', sql.VarChar, address || null);
        request.input('phone_number', sql.VarChar, phone_number);

        await request.query(`
            UPDATE Users
            SET firm_name = @firm_name, gst_number = @gst_number, address = @address, phone_number = @phone_number
            WHERE user_id = @user_id AND role = 'DISTRIBUTOR'
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
        if (check.recordset.length === 0 || check.recordset[0].role !== 'DISTRIBUTOR') {
            return res.status(400).json({ message: 'Invalid operation' });
        }

        await request.query(`DELETE FROM Users WHERE user_id = @user_id`);

        res.json({ message: 'Distributor deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete distributor' });
    }
};
