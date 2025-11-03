-- Add 'returned' status to orders table
-- This allows admin/staff to mark delivered orders as returned

-- Modify the status enum to include 'returned'
ALTER TABLE orders 
MODIFY COLUMN status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned') DEFAULT 'pending'
COMMENT 'Order status including returned for products sent back by customers';

-- Add returned_at timestamp column to track when order was marked as returned
ALTER TABLE orders 
ADD COLUMN returned_at TIMESTAMP NULL 
COMMENT 'When the order was marked as returned by admin/staff'
AFTER delivered_at;

-- Add index for better query performance on returned orders
CREATE INDEX idx_orders_returned_status ON orders(status, returned_at);

-- Add index for returned orders filtering
CREATE INDEX idx_orders_returned_at ON orders(returned_at);