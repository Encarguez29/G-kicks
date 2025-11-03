-- GKICKS Complete MySQL Database Schema
-- This script creates a comprehensive database schema for the GKICKS shoe store system
-- Compatible with MySQL 8.0+

-- Create database (uncomment and run separately if needed)
-- CREATE DATABASE IF NOT EXISTS gkicks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE gkicks;

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS product_views;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS users;

-- =============================================
-- USERS AND AUTHENTICATION TABLES
-- =============================================

-- Main users table for customers
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
);

-- Admin users table (separate from regular users for security)
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('admin', 'staff', 'manager') DEFAULT 'staff',
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- User addresses table
CREATE TABLE addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('shipping', 'billing', 'both') DEFAULT 'shipping',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Philippines',
    phone VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_default (is_default)
);

-- =============================================
-- PRODUCT CATALOG TABLES
-- =============================================

-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active),
    INDEX idx_sort (sort_order)
);

-- Main products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    image_url TEXT,
    gallery_images JSON,
    rating DECIMAL(3,2) DEFAULT 0.00,
    reviews_count INT DEFAULT 0,
    colors JSON,
    color_images JSON,
    sizes JSON,
    size_chart JSON,
    materials JSON,
    features JSON,
    care_instructions TEXT,
    weight DECIMAL(8,2),
    dimensions JSON,
    is_new BOOLEAN DEFAULT FALSE,
    is_sale BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    category ENUM('men', 'women', 'kids', 'unisex') DEFAULT 'unisex',
    category_id INT,
    stock_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_slug (slug),
    INDEX idx_brand (brand),
    INDEX idx_category (category),
    INDEX idx_category_id (category_id),
    INDEX idx_price (price),
    INDEX idx_active (is_active),
    INDEX idx_deleted (is_deleted),
    INDEX idx_featured (is_featured),
    INDEX idx_new (is_new),
    INDEX idx_sale (is_sale),
    INDEX idx_sku (sku),
    INDEX idx_stock (stock_quantity),
    INDEX idx_created_at (created_at)
);

-- Product variants table (for different size/color combinations)
CREATE TABLE product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    price DECIMAL(10,2),
    stock_quantity INT DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_sku (sku),
    INDEX idx_size (size),
    INDEX idx_color (color),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_variant (product_id, size, color)
);

-- Product views tracking table
CREATE TABLE product_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    product_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_viewed_at (viewed_at),
    UNIQUE KEY unique_user_product_view (user_id, product_id)
);

-- =============================================
-- SHOPPING CART AND WISHLIST TABLES
-- =============================================

-- Shopping cart items
CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id VARCHAR(255),
    product_id INT NOT NULL,
    variant_id INT,
    quantity INT NOT NULL DEFAULT 1,
    size VARCHAR(20),
    color VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_product_id (product_id),
    INDEX idx_created_at (created_at)
);

-- Wishlist items
CREATE TABLE wishlist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_wishlist_item (user_id, product_id)
);

-- =============================================
-- ORDER MANAGEMENT TABLES
-- =============================================

-- Orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_source ENUM('online', 'walk-in') DEFAULT 'online' COMMENT 'Source of the order: online (web/app) or walk-in (physical store)',
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    shipping_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP',
    shipping_address JSON,
    billing_address JSON,
    customer_notes TEXT,
    admin_notes TEXT,
    tracking_number VARCHAR(255),
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_order_source (order_source),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at),
    INDEX idx_total_amount (total_amount)
);

-- Order items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password_hash, first_name, last_name, role, permissions) VALUES
('admin', 'admin@gkicks.com', '$2b$10$rQZ9QmjytWIeJqvGVqB5/.vGL2GoHijbHJpgLX6jEuO2yC8HuC4Iq', 'Admin', 'User', 'admin', JSON_OBJECT('all', true)),
('staff', 'staff@gkicks.com', '$2b$10$rQZ9QmjytWIeJqvGVqB5/.vGL2GoHijbHJpgLX6jEuO2yC8HuC4Iq', 'Staff', 'User', 'staff', JSON_OBJECT('inventory', true, 'orders', true));

-- Insert categories
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Men', 'men', 'Footwear for men', 1),
('Women', 'women', 'Footwear for women', 2),
('Kids', 'kids', 'Footwear for children', 3),
('Unisex', 'unisex', 'Footwear for everyone', 4),
('Running', 'running', 'Running and athletic shoes', 5),
('Casual', 'casual', 'Casual and lifestyle shoes', 6),
('Formal', 'formal', 'Formal and dress shoes', 7);

-- Insert sample products
INSERT INTO products (
    name, slug, brand, description, short_description, price, original_price, 
    image_url, colors, sizes, is_new, is_sale, category, stock_quantity, sku
) VALUES
(
    'Air Max 97 SE',
    'air-max-97-se',
    'Nike',
    'The Nike Air Max 97 SE brings the classic design with modern comfort and style. Featuring visible Air cushioning and premium materials.',
    'Classic Nike Air Max with modern comfort',
    159.99,
    179.99,
    '/images/air-max-97-se.png',
    JSON_ARRAY('Black', 'White', 'Red', 'Silver'),
    JSON_ARRAY('6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'),
    false,
    true,
    'unisex',
    50,
    'NIKE-AM97-SE-001'
),
(
    'UltraBoost 23',
    'ultraboost-23',
    'Adidas',
    'Experience ultimate comfort with the Adidas UltraBoost 23 running shoes. Featuring responsive Boost midsole and Primeknit upper.',
    'Ultimate comfort running shoes',
    189.99,
    NULL,
    '/images/ultraboost-23.png',
    JSON_ARRAY('Black', 'White', 'Blue', 'Grey'),
    JSON_ARRAY('6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'),
    true,
    false,
    'unisex',
    30,
    'ADIDAS-UB23-002'
),
(
    'Fresh Foam X',
    'fresh-foam-x',
    'New Balance',
    'New Balance Fresh Foam X delivers plush comfort for your daily runs. Engineered mesh upper provides breathability.',
    'Plush comfort for daily runs',
    129.99,
    NULL,
    '/images/fresh-foam-x.png',
    JSON_ARRAY('Pink', 'White', 'Grey', 'Purple'),
    JSON_ARRAY('5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'),
    false,
    false,
    'women',
    25,
    'NB-FFX-003'
),
(
    'Gel-Kayano 30',
    'gel-kayano-30',
    'ASICS',
    'ASICS Gel-Kayano 30 provides superior stability and cushioning for overpronators. Features FF BLAST PLUS cushioning.',
    'Superior stability and cushioning',
    169.99,
    NULL,
    '/images/gel-kayano-30.png',
    JSON_ARRAY('Navy', 'Black', 'Grey', 'Blue'),
    JSON_ARRAY('7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13'),
    false,
    false,
    'men',
    40,
    'ASICS-GK30-004'
);

-- Create additional indexes for performance
CREATE INDEX idx_products_brand_category ON products(brand, category);
CREATE INDEX idx_products_price_range ON products(price, is_active);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_date_status ON orders(created_at, status);
CREATE INDEX idx_cart_user_session ON cart_items(user_id, session_id);

-- Show all tables created
SELECT 'Database schema created successfully!' as message;
SHOW TABLES;

-- Display table counts
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 
    'admin_users' as table_name, COUNT(*) as record_count FROM admin_users
UNION ALL
SELECT 
    'categories' as table_name, COUNT(*) as record_count FROM categories
UNION ALL
SELECT 
    'products' as table_name, COUNT(*) as record_count FROM products;