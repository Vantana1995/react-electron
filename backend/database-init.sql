-- ============================================
-- COMPLETE DATABASE SCHEMA INITIALIZATION
-- Date: 2025-10-06
-- Description: Full database schema for clean installation
-- ============================================

-- This file creates all necessary tables for the Twitter Automation Platform
-- Use this for fresh database installations

BEGIN;

-- ============================================
-- PART 1: Users Table
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  device_fingerprint VARCHAR(255) NOT NULL UNIQUE,
  device_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NOT NULL,
  nonce INTEGER NOT NULL DEFAULT 0,
  device_info JSONB,
  wallet_address VARCHAR(42),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_active TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE users IS 'Stores user authentication and device information';
COMMENT ON COLUMN users.device_fingerprint IS 'Step 1 hash - primary device identifier';
COMMENT ON COLUMN users.device_hash IS 'Final device hash combining step1+step2+IP';
COMMENT ON COLUMN users.wallet_address IS 'Ethereum wallet address (cached, immutable after first connect)';
COMMENT ON COLUMN users.nonce IS 'Incremental nonce for preventing replay attacks';

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_device_hash ON users(device_hash);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_device_fingerprint ON users(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- ============================================
-- PART 2: Scripts Library Table
-- ============================================

CREATE TABLE IF NOT EXISTS scripts_library (
  id SERIAL PRIMARY KEY,
  script_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  script_content TEXT NOT NULL,
  category VARCHAR(100),
  nft_addresses TEXT[] NOT NULL DEFAULT '{}',
  config JSONB,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scripts_library IS 'Stores all available automation scripts';
COMMENT ON COLUMN scripts_library.script_id IS 'Unique identifier for script (e.g., twitter-gm-commenter)';
COMMENT ON COLUMN scripts_library.script_content IS 'Full script code stored directly in database';
COMMENT ON COLUMN scripts_library.nft_addresses IS 'Array of NFT contract addresses required for access (empty = public/free)';
COMMENT ON COLUMN scripts_library.config IS 'JSONB configuration: features, usage, security, entry_point';
COMMENT ON COLUMN scripts_library.metadata IS 'JSONB metadata from script.json file';

-- Indexes for scripts_library
CREATE INDEX IF NOT EXISTS idx_scripts_script_id ON scripts_library(script_id);
CREATE INDEX IF NOT EXISTS idx_scripts_is_active ON scripts_library(is_active);
CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts_library(category);
CREATE INDEX IF NOT EXISTS idx_scripts_nft_addresses ON scripts_library USING GIN (nft_addresses);

-- ============================================
-- PART 3: Script Versions Table
-- ============================================

CREATE TABLE IF NOT EXISTS script_versions (
  id SERIAL PRIMARY KEY,
  script_id VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  script_content TEXT NOT NULL,
  nft_addresses TEXT[] NOT NULL DEFAULT '{}',
  config JSONB,
  changelog TEXT,
  created_by VARCHAR(255),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(script_id, version)
);

COMMENT ON TABLE script_versions IS 'Stores version history of scripts';
COMMENT ON COLUMN script_versions.script_id IS 'References scripts_library.script_id';
COMMENT ON COLUMN script_versions.script_content IS 'Script code for this version';
COMMENT ON COLUMN script_versions.nft_addresses IS 'NFT addresses for this version';
COMMENT ON COLUMN script_versions.changelog IS 'What changed in this version';
COMMENT ON COLUMN script_versions.created_by IS 'Who created this version';
COMMENT ON COLUMN script_versions.is_current IS 'Is this the current version';

-- Indexes for script_versions
CREATE INDEX IF NOT EXISTS idx_script_versions_script_id ON script_versions(script_id);
CREATE INDEX IF NOT EXISTS idx_script_versions_created_at ON script_versions(created_at DESC);

-- ============================================
-- PART 4: NFT Cache Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_nft_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  nft_contract VARCHAR(42) NOT NULL,
  has_nft BOOLEAN NOT NULL DEFAULT false,
  nft_count INTEGER NOT NULL DEFAULT 0,
  network_name VARCHAR(50) NOT NULL DEFAULT 'Sepolia Testnet',
  verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, wallet_address, nft_contract)
);

COMMENT ON TABLE user_nft_cache IS 'Caches NFT ownership verification results (30-day cache)';
COMMENT ON COLUMN user_nft_cache.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_nft_cache.wallet_address IS 'Wallet address that was checked';
COMMENT ON COLUMN user_nft_cache.nft_contract IS 'NFT contract address checked';
COMMENT ON COLUMN user_nft_cache.has_nft IS 'Whether user owns this NFT';
COMMENT ON COLUMN user_nft_cache.nft_count IS 'Number of NFTs owned';
COMMENT ON COLUMN user_nft_cache.expires_at IS 'Cache expiration timestamp (30 days from verified_at)';

-- Indexes for user_nft_cache
CREATE INDEX IF NOT EXISTS idx_nft_cache_user_id ON user_nft_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_cache_wallet ON user_nft_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_cache_contract ON user_nft_cache(nft_contract);
CREATE INDEX IF NOT EXISTS idx_nft_cache_user_contract ON user_nft_cache(user_id, nft_contract);
CREATE INDEX IF NOT EXISTS idx_nft_cache_user_wallet_contract ON user_nft_cache(user_id, wallet_address, nft_contract);
CREATE INDEX IF NOT EXISTS idx_nft_cache_wallet_contract ON user_nft_cache(wallet_address, nft_contract);
CREATE INDEX IF NOT EXISTS idx_nft_cache_verified_at ON user_nft_cache(verified_at);
CREATE INDEX IF NOT EXISTS idx_nft_cache_expires_at ON user_nft_cache(expires_at);

-- ============================================
-- PART 5: User NFT Ownership Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_nft_ownership (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  owned_nfts JSONB NOT NULL DEFAULT '[]',
  max_profiles INTEGER NOT NULL DEFAULT 1,
  accessible_scripts TEXT[] NOT NULL DEFAULT '{}',
  last_verified TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_nft_ownership IS 'Stores dynamic NFT ownership and subscription data for users';
COMMENT ON COLUMN user_nft_ownership.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_nft_ownership.owned_nfts IS 'JSONB array of owned NFT contracts with metadata';
COMMENT ON COLUMN user_nft_ownership.max_profiles IS '1 for free users, 5 for NFT holders';
COMMENT ON COLUMN user_nft_ownership.accessible_scripts IS 'Array of script_ids user can access';
COMMENT ON COLUMN user_nft_ownership.last_verified IS 'Last time NFT ownership was verified';

-- Indexes for user_nft_ownership
CREATE INDEX IF NOT EXISTS idx_user_ownership_user_id ON user_nft_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ownership_last_verified ON user_nft_ownership(last_verified);
CREATE INDEX IF NOT EXISTS idx_user_ownership_max_profiles ON user_nft_ownership(max_profiles);
CREATE INDEX IF NOT EXISTS idx_user_ownership_owned_nfts ON user_nft_ownership USING GIN (owned_nfts);
CREATE INDEX IF NOT EXISTS idx_user_ownership_scripts ON user_nft_ownership USING GIN (accessible_scripts);

-- ============================================
-- PART 6: Helper Functions
-- ============================================

-- Function to update user NFT ownership
CREATE OR REPLACE FUNCTION update_user_nft_ownership(
    p_user_id INTEGER,
    p_owned_nfts JSONB,
    p_max_profiles INTEGER,
    p_accessible_scripts TEXT[]
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_nft_ownership (
        user_id,
        owned_nfts,
        max_profiles,
        accessible_scripts,
        last_verified
    ) VALUES (
        p_user_id,
        p_owned_nfts,
        p_max_profiles,
        p_accessible_scripts,
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        owned_nfts = EXCLUDED.owned_nfts,
        max_profiles = EXCLUDED.max_profiles,
        accessible_scripts = EXCLUDED.accessible_scripts,
        last_verified = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_nft_ownership IS 'Helper function to update or insert user NFT ownership data';

-- ============================================
-- PART 7: Useful Views
-- ============================================

-- View for user subscription status
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT
    u.id as user_id,
    u.device_hash,
    u.wallet_address,
    COALESCE(o.max_profiles, 1) as max_profiles,
    CASE
        WHEN COALESCE(o.max_profiles, 1) > 1 THEN 'nft_holder'
        ELSE 'free'
    END as subscription_level,
    COALESCE(o.owned_nfts, '[]'::jsonb) as owned_nfts,
    COALESCE(o.accessible_scripts, '{}'::text[]) as accessible_scripts,
    o.last_verified,
    u.created_at,
    u.last_active
FROM users u
LEFT JOIN user_nft_ownership o ON u.id = o.user_id
WHERE u.is_active = true;

COMMENT ON VIEW user_subscription_status IS 'Consolidated view of user subscription status';

-- View for active scripts with NFT requirements
CREATE OR REPLACE VIEW active_scripts_summary AS
SELECT
    script_id,
    name,
    version,
    category,
    CASE
        WHEN cardinality(nft_addresses) = 0 THEN 'public'
        ELSE 'nft_gated'
    END as access_type,
    nft_addresses,
    cardinality(nft_addresses) as required_nfts_count,
    created_at,
    updated_at
FROM scripts_library
WHERE is_active = true
ORDER BY created_at DESC;

COMMENT ON VIEW active_scripts_summary IS 'Summary of active scripts with their access requirements';

-- ============================================
-- PART 8: Data Validation Functions
-- ============================================

-- Function to get all NFT addresses from active scripts
CREATE OR REPLACE FUNCTION get_all_nft_addresses()
RETURNS TEXT[] AS $$
DECLARE
    nft_addresses TEXT[];
BEGIN
    SELECT ARRAY(
        SELECT DISTINCT unnest(nft_addresses)
        FROM scripts_library
        WHERE is_active = true AND cardinality(nft_addresses) > 0
    ) INTO nft_addresses;

    RETURN COALESCE(nft_addresses, '{}');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_all_nft_addresses IS 'Returns array of all unique NFT addresses from active scripts';

-- Function to check if user needs NFT re-verification
CREATE OR REPLACE FUNCTION user_needs_nft_reverification(
    p_user_id INTEGER,
    p_max_cache_hours INTEGER DEFAULT 720 -- 30 days
)
RETURNS BOOLEAN AS $$
DECLARE
    last_verified TIMESTAMP;
BEGIN
    SELECT o.last_verified INTO last_verified
    FROM user_nft_ownership o
    WHERE o.user_id = p_user_id;

    IF last_verified IS NULL THEN
        RETURN true;
    END IF;

    RETURN (NOW() - last_verified) > (p_max_cache_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_needs_nft_reverification IS 'Check if user NFT ownership needs re-verification';

-- ============================================
-- PART 9: Clean Database (No Sample Data)
-- ============================================

-- Database is created clean without any sample data
-- Scripts will be added via the admin API

COMMIT;

-- ============================================
-- SCHEMA INITIALIZATION COMPLETE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '
==============================================
Database Schema Initialized Successfully!
==============================================

Tables created:
  ✅ users - User authentication and device info
  ✅ scripts_library - Script storage with NFT requirements
  ✅ script_versions - Version history
  ✅ user_nft_cache - NFT ownership cache (30 days)
  ✅ user_nft_ownership - Dynamic NFT-based subscriptions

Views created:
  ✅ user_subscription_status
  ✅ active_scripts_summary

Functions created:
  ✅ update_user_nft_ownership()
  ✅ get_all_nft_addresses()
  ✅ user_needs_nft_reverification()

Sample data:
  ✅ Clean database (no sample data)

Subscription System:
  • Free tier: 1 profile, access to public scripts
  • NFT holder: 5 profiles, access to NFT-gated scripts
  • 30-day NFT ownership cache
  • Fully dynamic - add scripts via Admin API

Next steps:
  1. Start backend server
  2. Add scripts via /api/admin/scripts/add
  3. Users will automatically get correct subscription tier
==============================================
    ';
END $$;
