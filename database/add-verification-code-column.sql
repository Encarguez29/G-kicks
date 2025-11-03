-- Add verification_code column to email_verification_tokens table
ALTER TABLE email_verification_tokens 
ADD COLUMN verification_code VARCHAR(6) NULL AFTER token;

-- Create index on verification_code for faster lookups
CREATE INDEX idx_verification_code ON email_verification_tokens(verification_code);