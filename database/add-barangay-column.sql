-- Add barangay column to addresses table
ALTER TABLE addresses ADD COLUMN barangay VARCHAR(100) DEFAULT NULL AFTER city;