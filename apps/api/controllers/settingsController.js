const sql = require('mssql');

// Get company settings
const getCompanySettings = async (req, res) => {
    try {
        const result = await new sql.Request()
            .query('SELECT address, mobile_number, state, gst_number, fssai_number, claim_window_days, cgst_rate, sgst_rate FROM CompanySettings WHERE setting_id = 1');
        
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
        const { address, mobile_number, state, gst_number, fssai_number, claim_window_days, cgst_rate, sgst_rate } = req.body;
        const file = req.file;

        let query = `
            UPDATE CompanySettings SET 
                address = @address,
                mobile_number = @mobile_number,
                state = @state,
                gst_number = @gst_number,
                fssai_number = @fssai_number,
                claim_window_days = @claim_window_days,
                cgst_rate = @cgst_rate,
                sgst_rate = @sgst_rate
        `;
        
        if (file) {
            query += `, qr_code_image = @qr_code_image, qr_code_mimetype = @qr_code_mimetype `;
        }
        
        query += ` WHERE setting_id = 1`;

        const request = new sql.Request();
        request.input('address', sql.VarChar, address);
        request.input('mobile_number', sql.VarChar, mobile_number);
        request.input('state', sql.VarChar, state);
        request.input('gst_number', sql.VarChar, gst_number);
        request.input('fssai_number', sql.VarChar, fssai_number);
        request.input('claim_window_days', sql.Int, parseInt(claim_window_days) || 7);
        request.input('cgst_rate', sql.Decimal(5, 2), parseFloat(cgst_rate) || 2.50);
        request.input('sgst_rate', sql.Decimal(5, 2), parseFloat(sgst_rate) || 2.50);

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
