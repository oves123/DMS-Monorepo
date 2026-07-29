const { sql, connectDB } = require('./config/db');
async function checkCols() {
    const pool = await connectDB();
    const result = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Orders'
    `);
    console.log(result.recordset);
    process.exit();
}
checkCols();
