-- Migration to add wallet_address field to users table
-- Run this SQL to update your PostgreSQL database

-- Add wallet_address column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);

-- Add index for wallet_address for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Add comment for documentation
COMMENT ON COLUMN users.wallet_address IS 'Ethereum wallet address associated with the user (optional)';

-- Update existing users to have NULL wallet_address (they can be updated later)
UPDATE users SET wallet_address = NULL WHERE wallet_address IS NULL;
