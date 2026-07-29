const { sql, connectDB } = require('../config/db');
const bcrypt = require('bcryptjs');

const setupAdmin = async () => {
    try {
        await connectDB();

        const phone = 'admin';
        const rawPassword = 'Admin@123'; // Default password for testing

        // Generate salt and hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        // Update the dummy admin user in the database
        const request = new sql.Request();
        request.input('hashedPassword', sql.VarChar, hashedPassword);
        request.input('phone', sql.VarChar, phone);
        
        await request.query(`
            UPDATE Users 
            SET password_hash = @hashedPassword 
            WHERE phone_number = @phone
        `);

        console.log('✅ Admin password updated successfully!');
        console.log(`Login ID: ${phone}`);
        console.log(`Password: ${rawPassword}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to setup admin:', err);
        process.exit(1);
    }
};

setupAdmin();
