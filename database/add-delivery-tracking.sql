-- Add delivery tracking fields to orders table
ALTER TABLE orders 
ADD COLUMN shipped_at TIMESTAMP NULL COMMENT 'When the order was marked as shipped',
ADD COLUMN delivered_at TIMESTAMP NULL COMMENT 'When the order was marked as delivered by customer',
ADD COLUMN tracking_number VARCHAR(100) NULL COMMENT 'Shipping tracking number',
ADD COLUMN delivery_confirmation_required BOOLEAN DEFAULT TRUE COMMENT 'Whether customer needs to confirm delivery';

-- Create delivery_notifications table for tracking notifications
CREATE TABLE IF NOT EXISTS delivery_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    notification_type ENUM('shipped', 'delivered', 'delivery_confirmation') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_notifications (user_id, is_read),
    INDEX idx_order_notifications (order_id)
);

-- Create delivery_confirmations table to track customer confirmations
CREATE TABLE IF NOT EXISTS delivery_confirmations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmation_method ENUM('web', 'email', 'sms') DEFAULT 'web',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update existing orders to set shipped_at for orders that are already shipped
UPDATE orders 
SET shipped_at = updated_at 
WHERE status IN ('shipped', 'delivered') AND shipped_at IS NULL;

-- Update existing orders to set delivered_at for orders that are already delivered
UPDATE orders 
SET delivered_at = updated_at 
WHERE status = 'delivered' AND delivered_at IS NULL;