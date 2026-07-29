-- Use the correct database
USE DMS;
GO

-- 1. Users Table (Handles both Admin and Normal Distributors)
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('SD_ADMIN', 'ND')),
    firm_name VARCHAR(100) NOT NULL,
    gst_number VARCHAR(15),
    address VARCHAR(255),
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- 2. Categories Table
CREATE TABLE Categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Products Table (Base Product Info)
CREATE TABLE Products (
    product_id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT FOREIGN KEY REFERENCES Categories(category_id),
    name VARCHAR(100) NOT NULL,
    hsn_code VARCHAR(20),
    gst_percent DECIMAL(5,2) DEFAULT 0
);

-- 4. ProductVariants Table (Pack Sizes & Pricing)
CREATE TABLE ProductVariants (
    variant_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT FOREIGN KEY REFERENCES Products(product_id) ON DELETE CASCADE,
    pack_size VARCHAR(50) NOT NULL,
    nd_rate DECIMAL(10,2) NOT NULL,
    retailer_rate DECIMAL(10,2) NOT NULL,
    mrp DECIMAL(10,2) NOT NULL
);

-- 5. Inventory Table (Live Stock Tracking)
CREATE TABLE Inventory (
    inventory_id INT IDENTITY(1,1) PRIMARY KEY,
    variant_id INT FOREIGN KEY REFERENCES ProductVariants(variant_id) ON DELETE CASCADE,
    current_stock_qty INT NOT NULL DEFAULT 0,
    last_updated_at DATETIME DEFAULT GETDATE()
);

-- 6. Orders Table (Header)
CREATE TABLE Orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    nd_user_id INT FOREIGN KEY REFERENCES Users(user_id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'EXECUTED', 'REJECTED')),
    order_date DATETIME DEFAULT GETDATE(),
    execution_date DATETIME NULL
);

-- 7. OrderItems Table (Items inside the order)
CREATE TABLE OrderItems (
    order_item_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT FOREIGN KEY REFERENCES Orders(order_id) ON DELETE CASCADE,
    variant_id INT FOREIGN KEY REFERENCES ProductVariants(variant_id),
    requested_qty INT NOT NULL,
    executed_qty INT NULL,
    sd_remark VARCHAR(255) NULL,
    price_at_order DECIMAL(10,2) NOT NULL
);

-- 8. Invoices Table (Final PDF Bills)
CREATE TABLE Invoices (
    invoice_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT FOREIGN KEY REFERENCES Orders(order_id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    subtotal DECIMAL(12,2) NOT NULL,
    cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL,
    pdf_url VARCHAR(255) NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Insert Default Admin User
-- (We will replace the password hash properly from Node.js later)
INSERT INTO Users (role, firm_name, phone_number, password_hash)
VALUES ('SD_ADMIN', 'Anand Enterprises Admin', 'admin', 'admin_placeholder_hash');
