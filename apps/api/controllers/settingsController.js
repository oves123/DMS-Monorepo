const sql = require('mssql');

// Get company settings
const getCompanySettings = async (req, res) => {
    try {
        const result = await new sql.Request()
            .query('SELECT account_name, account_no, bank_name, ifsc_code, branch, email, claim_window_days FROM CompanySettings WHERE setting_id = 1');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Settings not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update company settings
const updateCompanySettings = async (req, res) => {
    try {
        const { account_name, account_no, bank_name, ifsc_code, branch, email, claim_window_days } = req.body;
        const file = req.file;

        let query = `
            UPDATE CompanySettings SET 
                account_name = @account_name,
                account_no = @account_no,
                bank_name = @bank_name,
                ifsc_code = @ifsc_code,
                branch = @branch,
                email = @email,
                claim_window_days = @claim_window_days
        `;
        
        if (file) {
            query += `, qr_code_image = @qr_code_image, qr_code_mimetype = @qr_code_mimetype `;
        }
        
        query += ` WHERE setting_id = 1`;

        const request = new sql.Request();
        request.input('account_name', sql.VarChar, account_name);
        request.input('account_no', sql.VarChar, account_no);
        request.input('bank_name', sql.VarChar, bank_name);
        request.input('ifsc_code', sql.VarChar, ifsc_code);
        request.input('branch', sql.VarChar, branch);
        request.input('email', sql.VarChar, email);
        request.input('claim_window_days', sql.Int, parseInt(claim_window_days) || 7);

        if (file) {
            request.input('qr_code_image', sql.VarBinary, file.buffer);
            request.input('qr_code_mimetype', sql.VarChar, file.mimetype);
        }

        await request.query(query);
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get QR Code Image
const getQRCode = async (req, res) => {
    try {
        const result = await new sql.Request()
            .query('SELECT qr_code_image, qr_code_mimetype FROM CompanySettings WHERE setting_id = 1');

        if (result.recordset.length > 0 && result.recordset[0].qr_code_image) {
            res.set('Content-Type', result.recordset[0].qr_code_mimetype || 'image/jpeg');
            res.send(result.recordset[0].qr_code_image);
        } else {
            res.status(404).send('No QR Code found');
        }
    } catch (error) {
        console.error('Error fetching QR code:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getCompanySettings,
    updateCompanySettings,
    getQRCode
};
