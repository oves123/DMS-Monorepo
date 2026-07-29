const sql = require('mssql');

const config = {
    user: 'sa',
    password: '400102',
    server: 'localhost', 
    database: 'DMS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const updateDB = async () => {
    try {
        const pool = await sql.connect(config);
        
        // Wait, nd_rate and nd_user_id were already renamed in the first run before it crashed.
        // I should wrap them in TRY/CATCH to ignore if they already exist/were renamed.
        console.log('Renaming nd_rate to distributor_rate...');
        await pool.request().query(`
            IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'nd_rate' AND Object_ID = Object_ID(N'dbo.ProductVariants'))
            BEGIN
                EXEC sp_rename 'ProductVariants.nd_rate', 'distributor_rate', 'COLUMN';
            END
        `);
        
        console.log('Renaming nd_user_id to distributor_id...');
        await pool.request().query(`
            IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'nd_user_id' AND Object_ID = Object_ID(N'dbo.Orders'))
            BEGIN
                EXEC sp_rename 'Orders.nd_user_id', 'distributor_id', 'COLUMN';
            END
        `);
        
        console.log('Dropping role constraint...');
        await pool.request().query(`ALTER TABLE Users DROP CONSTRAINT CK__Users__role__4BAC3F29;`);

        console.log('Updating role ND to DISTRIBUTOR...');
        await pool.request().query(`UPDATE Users SET role = 'DISTRIBUTOR' WHERE role = 'ND';`);
        
        console.log('Adding new constraint...');
        await pool.request().query(`ALTER TABLE Users ADD CONSTRAINT CHK_UserRole CHECK (role IN ('SD_ADMIN', 'DISTRIBUTOR', 'SALES_REP'));`);
        
        console.log('Database updated successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateDB();
