const { sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Login user (SD or ND)
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { phone_number, password } = req.body;

        if (!phone_number || !password) {
            return res.status(400).json({ message: 'Please provide phone number and password' });
        }

        // Check if user exists securely using SQL Inputs
        const request = new sql.Request();
        request.input('phone', sql.VarChar, phone_number);
        const result = await request.query(`SELECT * FROM Users WHERE phone_number = @phone`);
        
        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password (supports bcrypt hash or plain text for dev migration)
        const isMatch = await bcrypt.compare(password, user.password_hash).catch(() => false);
        if (!isMatch && password !== user.password_hash) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, firm_name: user.firm_name },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } // Token lasts for 30 days
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                role: user.role,
                firm_name: user.firm_name,
                phone_number: user.phone_number,
                wallet_balance: user.wallet_balance || 0
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Reset Password directly (Logged in user)
// @route   PUT /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const { user_id, new_password } = req.body;

        if (!user_id || !new_password) {
            return res.status(400).json({ message: 'Please provide user id and new password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        const request = new sql.Request();
        request.input('user_id', sql.Int, user_id);
        request.input('password_hash', sql.VarChar, hashedPassword);
        
        await request.query(`
            UPDATE Users 
            SET password_hash = @password_hash 
            WHERE user_id = @user_id
        `);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

module.exports = {
    loginUser,
    resetPassword
};
