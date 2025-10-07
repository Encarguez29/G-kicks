-- Migration script to add shipping_region column to addresses table
-- This script adds the shipping_region field to support regional shipping options

-- Add shipping_region column to addresses table
ALTER TABLE addresses 
ADD COLUMN shipping_region VARCHAR(50) DEFAULT 'Luzon';

-- Update existing addresses to have a default shipping region
UPDATE addresses 
SET shipping_region = 'Luzon' 
WHERE shipping_region IS NULL;