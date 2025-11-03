-- Update delivery_notifications table to support all order status types
-- This will expand the ENUM to include pending, confirmed, processing, cancelled
ALTER TABLE delivery_notifications 
MODIFY COLUMN notification_type ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'delivery_confirmation') NOT NULL;

-- Add index for better performance on notification_type queries
CREATE INDEX IF NOT EXISTS idx_notification_type ON delivery_notifications(notification_type);

-- Update any existing notifications that might have old status values
-- This is a safety measure in case there are any inconsistencies
UPDATE delivery_notifications 
SET notification_type = 'delivered' 
WHERE notification_type = 'delivery_confirmation' AND notification_type NOT IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');