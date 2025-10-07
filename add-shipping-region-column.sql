-- Add shipping_region column to addresses table
ALTER TABLE addresses ADD COLUMN shipping_region VARCHAR(50) DEFAULT 'Luzon';

-- Update existing addresses to have default shipping region
UPDATE addresses SET shipping_region = 'Luzon' WHERE shipping_region IS NULL;