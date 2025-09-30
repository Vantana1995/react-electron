-- NFT Subscription Migration
-- Run this SQL to add NFT and wallet support to existing subscriptions table

-- Add new columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42), -- Ethereum wallet address
ADD COLUMN IF NOT EXISTS nft_contract VARCHAR(42), -- NFT contract address  
ADD COLUMN IF NOT EXISTS network_name VARCHAR(100), -- Blockchain network name
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP; -- Last time NFT ownership was verified

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet ON subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_contract ON subscriptions(nft_contract);
CREATE INDEX IF NOT EXISTS idx_subscriptions_verified ON subscriptions(last_verified);

-- Add comments for documentation
COMMENT ON COLUMN subscriptions.wallet_address IS 'Ethereum wallet address for NFT verification';
COMMENT ON COLUMN subscriptions.nft_contract IS 'NFT contract address (e.g., Legion NFT)';
COMMENT ON COLUMN subscriptions.network_name IS 'Blockchain network name (e.g., Sepolia Testnet)';
COMMENT ON COLUMN subscriptions.last_verified IS 'Last time NFT ownership was verified';

-- Example Legion NFT subscription data
-- INSERT INTO subscriptions (
--   user_id, 
--   subscription_type, 
--   wallet_address, 
--   nft_contract, 
--   network_name,
--   start_date, 
--   end_date, 
--   is_active,
--   features_access,
--   last_verified
-- ) VALUES (
--   1, 
--   'lifetime_legion', 
--   '0x742d35Cc6634C0532925a3b8D', 
--   '0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA',
--   'Sepolia Testnet',
--   NOW(), 
--   NOW() + INTERVAL '100 years', 
--   true,
--   ARRAY['all_features', 'priority_support', 'unlimited_usage'],
--   NOW()
-- );

-- Grant permissions (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE ON subscriptions TO your_app_user;
