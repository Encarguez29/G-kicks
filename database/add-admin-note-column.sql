-- Add admin_note column to orders table
-- This column will store admin notes when approving or rejecting cancellation requests

ALTER TABLE orders 
ADD COLUMN admin_note TEXT NULL 
COMMENT 'Admin notes for cancellation approval/rejection decisions';