-- =============================================
-- ORDER ARCHIVING SYSTEM MIGRATION
-- =============================================
-- This script adds the necessary fields and indexes for automatic order archiving
-- Orders will be archived after 1 year and deleted after 3 years

-- Add archived_at field to orders table
ALTER TABLE orders 
ADD COLUMN archived_at TIMESTAMP NULL 
AFTER refunded_at;

-- Add index for archived_at to improve query performance
ALTER TABLE orders 
ADD INDEX idx_archived_at (archived_at);

-- Add index for delivered_at to improve archiving queries
ALTER TABLE orders 
ADD INDEX idx_delivered_at (delivered_at);

-- Add index for cancelled_at to improve archiving queries  
ALTER TABLE orders 
ADD INDEX idx_cancelled_at (cancelled_at);

-- Add composite index for archiving queries (status + created_at)
ALTER TABLE orders 
ADD INDEX idx_status_created_at (status, created_at);

-- Add composite index for archived orders cleanup (archived_at + status)
ALTER TABLE orders 
ADD INDEX idx_archived_at_status (archived_at, status);

-- Update existing completed orders that should be archived (older than 1 year)
-- This is a one-time update for existing data
UPDATE orders 
SET archived_at = CASE 
    WHEN status = 'delivered' AND delivered_at IS NOT NULL AND delivered_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN delivered_at
    WHEN status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN cancelled_at  
    WHEN status = 'refunded' AND refunded_at IS NOT NULL AND refunded_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN refunded_at
    WHEN status IN ('delivered', 'cancelled', 'refunded') AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN created_at
    ELSE NULL
END
WHERE archived_at IS NULL 
AND status IN ('delivered', 'cancelled', 'refunded')
AND (
    (status = 'delivered' AND (delivered_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) OR (delivered_at IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))))
    OR (status = 'cancelled' AND (cancelled_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) OR (cancelled_at IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))))
    OR (status = 'refunded' AND (refunded_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) OR (refunded_at IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))))
);

-- Show summary of changes
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN archived_at IS NOT NULL THEN 1 END) as archived_orders,
    COUNT(CASE WHEN status IN ('delivered', 'cancelled', 'refunded') AND archived_at IS NULL THEN 1 END) as completed_not_archived,
    COUNT(CASE WHEN status NOT IN ('delivered', 'cancelled', 'refunded') THEN 1 END) as active_orders
FROM orders;

-- Show orders that were just archived
SELECT 
    'Newly Archived Orders' as info,
    id,
    order_number,
    status,
    created_at,
    COALESCE(delivered_at, cancelled_at, refunded_at) as completion_date,
    archived_at
FROM orders 
WHERE archived_at IS NOT NULL 
ORDER BY archived_at DESC 
LIMIT 10;