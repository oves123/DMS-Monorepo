const { sql, connectDB } = require('./config/db');

async function checkOrders() {
    try {
        const pool = await connectDB();
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Orders'");
        console.log('Columns:', result.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
checkOrders();
