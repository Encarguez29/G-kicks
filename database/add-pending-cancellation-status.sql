-- Add 'pending_cancellation' status to orders table
-- This allows customer-initiated cancellations to be pending admin approval

-- Update the status enum to include 'pending_cancellation'
ALTER TABLE orders 
MODIFY COLUMN status ENUM(
    'pending', 
    'confirmed', 
    'processing', 
    'shipped', 
    'delivered', 
    'cancelled', 
    'refunded', 
    'returned', 
    'pending_cancellation'
) DEFAULT 'pending'
COMMENT 'Order status including pending_cancellation for customer-initiated cancellation requests';

-- Add index for pending cancellation orders for admin queries
CREATE INDEX IF NOT EXISTS idx_orders_pending_cancellation ON orders(status, created_at);

-- Add a cancellation_requested_at timestamp field to track when cancellation was requested
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMP NULL 
COMMENT 'Timestamp when customer requested order cancellation';

-- Add a cancellation_reason field to store customer's reason for cancellation
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL 
COMMENT 'Customer provided reason for order cancellation';

SELECT 'Migration completed: Added pending_cancellation status and related fields to orders table' AS status;