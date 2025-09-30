-- Migration for Enhanced Device Fingerprinting with IP and Nonce
-- Run this SQL to update your PostgreSQL database

-- First, create the enhanced users table structure
-- If you already have a users table, run the ALTER statements below instead

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    device_hash VARCHAR(255) UNIQUE NOT NULL,           -- Final hash (step 2)
    device_fingerprint VARCHAR(255) NOT NULL,          -- Device-only hash (step 1)
    ip_address INET NOT NULL,                           -- IP address used for registration
    nonce INTEGER NOT NULL,                             -- Random nonce for additional security
    backup_emails TEXT[] NOT NULL DEFAULT '{}',        -- Array of 5 backup emails
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP,
    device_info JSONB NOT NULL DEFAULT '{}'             -- Device fingerprint data
);

-- If you already have a users table, run these ALTER statements:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address INET;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS nonce INTEGER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_device_hash ON users(device_hash);
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint ON users(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- Create subscriptions table (if not exists)
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subscription_type VARCHAR(100) NOT NULL,
    blockchain_tx_hash VARCHAR(255) UNIQUE,
    wallet_address VARCHAR(42), -- Ethereum wallet address
    nft_contract VARCHAR(42), -- NFT contract address
    network_name VARCHAR(100), -- Blockchain network name
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    features_access TEXT[] DEFAULT '{}',
    last_verified TIMESTAMP, -- Last time NFT ownership was verified
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tx_hash ON subscriptions(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet ON subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_contract ON subscriptions(nft_contract);

-- Create activity logs table (if not exists)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    feature_used VARCHAR(100),
    duration INTEGER, -- Session duration in seconds
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

-- Create features table (if not exists)
CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    ipfs_hash VARCHAR(255) NOT NULL,
    required_subscription VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    cache_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_features_name ON features(name);
CREATE INDEX IF NOT EXISTS idx_features_subscription ON features(required_subscription);
CREATE INDEX IF NOT EXISTS idx_features_active ON features(is_active);

-- Create nonce tracking table for additional security
CREATE TABLE IF NOT EXISTS device_nonces (
    id SERIAL PRIMARY KEY,
    device_hash VARCHAR(255) REFERENCES users(device_hash) ON DELETE CASCADE,
    nonce INTEGER NOT NULL,
    used_at TIMESTAMP DEFAULT NOW(),
    is_valid BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_device_nonces_hash ON device_nonces(device_hash);
CREATE INDEX IF NOT EXISTS idx_device_nonces_used_at ON device_nonces(used_at);

-- Create function to clean old nonces (optional)
CREATE OR REPLACE FUNCTION cleanup_old_nonces()
RETURNS void AS $$
BEGIN
    -- Remove nonces older than 7 days
    DELETE FROM device_nonces 
    WHERE used_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE users IS 'Users identified by device fingerprinting without passwords';
COMMENT ON COLUMN users.device_hash IS 'Final hash combining device fingerprint + IP + nonce';
COMMENT ON COLUMN users.device_fingerprint IS 'Hash of device data only (step 1)';
COMMENT ON COLUMN users.ip_address IS 'IP address used during registration';
COMMENT ON COLUMN users.nonce IS 'Random nonce for additional security';
COMMENT ON COLUMN users.backup_emails IS 'Array of 5 backup emails for account recovery';

COMMENT ON TABLE subscriptions IS 'User subscriptions with blockchain payment verification';
COMMENT ON TABLE activity_logs IS 'User activity tracking and analytics';
COMMENT ON TABLE features IS 'Available features with IPFS-based script delivery';
COMMENT ON TABLE device_nonces IS 'Nonce tracking for enhanced security';

-- Example data for testing (remove in production)
-- INSERT INTO features (name, ipfs_hash, required_subscription, version) VALUES
-- ('twitter_basic_automation', 'QmTestHash1234567890', 'basic', '1.0.0'),
-- ('profile_scraping', 'QmTestHash0987654321', 'basic', '1.0.0'),
-- ('advanced_automation', 'QmTestHashABCDEF1234', 'pro', '1.0.0');

-- Grant necessary permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
