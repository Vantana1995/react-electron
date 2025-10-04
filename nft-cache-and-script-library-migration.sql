-- NFT Cache and Script Library Migration
-- Run this SQL to add NFT caching and script library support

-- 1. Add wallet_address column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- 2. Create user_nft_cache table
-- This table caches NFT ownership verification to avoid repeated blockchain calls
CREATE TABLE IF NOT EXISTS user_nft_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    has_nft BOOLEAN NOT NULL DEFAULT false,
    nft_contract VARCHAR(42), -- NFT contract address
    network_name VARCHAR(100), -- Blockchain network name
    nft_count INTEGER DEFAULT 0, -- Number of NFTs owned
    verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_nft_cache_user ON user_nft_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_cache_wallet ON user_nft_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_cache_verified ON user_nft_cache(verified_at);
CREATE INDEX IF NOT EXISTS idx_nft_cache_has_nft ON user_nft_cache(has_nft);

COMMENT ON TABLE user_nft_cache IS 'Caches NFT ownership verification to reduce blockchain calls';
COMMENT ON COLUMN user_nft_cache.verified_at IS 'Last time NFT ownership was verified on blockchain';
COMMENT ON COLUMN user_nft_cache.has_nft IS 'Whether user owns the NFT (cached result)';

-- 3. Create scripts_library table
-- This table stores all available scripts with their NFT role requirements
CREATE TABLE IF NOT EXISTS scripts_library (
    id SERIAL PRIMARY KEY,
    script_id VARCHAR(100) UNIQUE NOT NULL, -- Unique identifier (e.g., 'twitter-auto-reply')
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    ipfs_hash VARCHAR(255) NOT NULL, -- IPFS hash for script content
    nft_addresses TEXT[] NOT NULL DEFAULT '{}', -- Array of NFT contract addresses (roles)
    category VARCHAR(100), -- Category (e.g., 'automation', 'analytics')
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}', -- Script configuration
    metadata JSONB DEFAULT '{}', -- Additional metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scripts_library_script_id ON scripts_library(script_id);
CREATE INDEX IF NOT EXISTS idx_scripts_library_active ON scripts_library(is_active);
CREATE INDEX IF NOT EXISTS idx_scripts_library_category ON scripts_library(category);
CREATE INDEX IF NOT EXISTS idx_scripts_library_nft_addresses ON scripts_library USING GIN(nft_addresses);

COMMENT ON TABLE scripts_library IS 'Library of all available scripts with NFT role requirements';
COMMENT ON COLUMN scripts_library.nft_addresses IS 'Array of NFT contract addresses that grant access to this script';
COMMENT ON COLUMN scripts_library.ipfs_hash IS 'IPFS hash containing the encrypted script code';

-- 4. Create script_versions table
-- This table tracks version history for each script
CREATE TABLE IF NOT EXISTS script_versions (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts_library(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    ipfs_hash VARCHAR(255) NOT NULL,
    nft_addresses TEXT[] NOT NULL DEFAULT '{}',
    changelog TEXT,
    is_current BOOLEAN DEFAULT false, -- Is this the current version?
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255) -- Admin who created this version
);

CREATE INDEX IF NOT EXISTS idx_script_versions_script ON script_versions(script_id);
CREATE INDEX IF NOT EXISTS idx_script_versions_current ON script_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_script_versions_created ON script_versions(created_at);

COMMENT ON TABLE script_versions IS 'Version history for scripts in the library';
COMMENT ON COLUMN script_versions.is_current IS 'Whether this is the currently active version';

-- 5. Create function to update user_nft_cache timestamp
CREATE OR REPLACE FUNCTION update_nft_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nft_cache_timestamp
BEFORE UPDATE ON user_nft_cache
FOR EACH ROW
EXECUTE FUNCTION update_nft_cache_timestamp();

-- 6. Create function to update scripts_library timestamp
CREATE OR REPLACE FUNCTION update_scripts_library_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scripts_library_timestamp
BEFORE UPDATE ON scripts_library
FOR EACH ROW
EXECUTE FUNCTION update_scripts_library_timestamp();

-- 7. Create function to check if NFT cache is stale (older than 24 hours)
CREATE OR REPLACE FUNCTION is_nft_cache_stale(cache_verified_at TIMESTAMP)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN cache_verified_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_nft_cache_stale IS 'Returns true if NFT cache is older than 24 hours';

-- 8. Example data - Legion NFT script (uncomment to use)
-- INSERT INTO scripts_library (
--     script_id,
--     name,
--     description,
--     version,
--     ipfs_hash,
--     nft_addresses,
--     category,
--     is_active,
--     config
-- ) VALUES (
--     'twitter-gm-commenter',
--     'Twitter GM Commenter',
--     'Automatically reply to GM tweets with customized messages',
--     '1.0.0',
--     'QmExampleHash123456789',
--     ARRAY['0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA'], -- Legion NFT
--     'automation',
--     true,
--     '{"timeout": 30000, "sandbox": true}'::jsonb
-- );

-- Grant permissions (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
