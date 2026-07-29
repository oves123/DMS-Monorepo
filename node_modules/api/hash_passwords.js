const { sql, connectDB } = require('./config/db');
const bcrypt = require('bcryptjs');

async function hashPasswords() {
    try {
        const pool = await connectDB();
        
        // Find users whose passwords don't start with $2 (bcrypt format)
        const result = await pool.request().query(`
            SELECT user_id, password_hash 
            FROM Users 
            WHERE password_hash NOT LIKE '$2%'
        `);

        const users = result.recordset;
        console.log(`Found ${users.length} users with plaintext passwords.`);

        for (let user of users) {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(user.password_hash, salt);

            await pool.request()
                .input('hash', sql.VarChar, hashed)
                .input('id', sql.Int, user.user_id)
                .query(`UPDATE Users SET password_hash = @hash WHERE user_id = @id`);
            
            console.log(`Hashed password for user_id ${user.user_id}`);
        }

        console.log('Finished updating passwords.');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
hashPasswords();
