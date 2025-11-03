-- Add order_source column to orders table
-- This column will distinguish between online orders and walk-in/shop orders

-- Add the order_source column
ALTER TABLE orders 
ADD COLUMN order_source ENUM('online', 'walk-in') DEFAULT 'online' 
AFTER order_number;

-- Add index for better query performance
CREATE INDEX idx_order_source ON orders(order_source);

-- Update existing orders to have a default source
-- Assuming existing orders are online orders since they were placed through the web system
UPDATE orders 
SET order_source = 'online' 
WHERE order_source IS NULL;

-- Add comment to the column for documentation
ALTER TABLE orders 
MODIFY COLUMN order_source ENUM('online', 'walk-in') DEFAULT 'online' 
COMMENT 'Source of the order: online (web/app) or walk-in (physical store)';