# Dynamic NFT Verification System

## Overview

The Dynamic NFT Verification System automatically manages NFT-based subscriptions by:

- Dynamically discovering all NFT contracts from the database
- Verifying ownership for each contract
- Automatically granting access to corresponding scripts
- Caching results for performance

## Key Features

### 🔄 Dynamic Discovery

- Automatically finds all NFT contracts from `scripts_library` table
- No hardcoded contract addresses
- Scales automatically as new scripts are added

### ⚡ Smart Caching

- 30-day cache for NFT ownership verification
- Reduces blockchain calls and improves performance
- Automatic cache invalidation and refresh

### 🎯 Automatic Script Access

- Free tier: Gets first public script (no NFT required)
- NFT holders: Get all scripts for owned NFTs
- Dynamic script delivery based on current ownership

## Architecture

### Core Components

1. **DynamicNFTVerifier** (`/services/dynamic-nft-verifier.ts`)

   - Main service for dynamic NFT verification
   - Handles all NFT contracts from database
   - Manages script access based on ownership

2. **NFTCacheManager** (`/utils/nft-cache.ts`)

   - Handles NFT ownership caching
   - Reduces blockchain API calls
   - Manages cache expiration

3. **SubscriptionManager** (`/services/subscription-manager.ts`)
   - Calculates user subscription levels
   - Manages script access permissions
   - Updates user ownership data

### Database Schema

```sql
-- NFT contracts are stored in scripts_library
CREATE TABLE scripts_library (
  id SERIAL PRIMARY KEY,
  script_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  nft_addresses TEXT[] NOT NULL DEFAULT '{}', -- Array of NFT contract addresses
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- User ownership is cached in user_nft_ownership
CREATE TABLE user_nft_ownership (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  owned_nfts JSONB NOT NULL DEFAULT '[]',
  max_profiles INTEGER NOT NULL DEFAULT 1,
  accessible_scripts TEXT[] NOT NULL DEFAULT '{}',
  last_verified TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NFT verification cache
CREATE TABLE user_nft_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  wallet_address VARCHAR(42) NOT NULL,
  nft_contract VARCHAR(42) NOT NULL,
  has_nft BOOLEAN NOT NULL DEFAULT false,
  nft_count INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, wallet_address, nft_contract)
);
```

## API Endpoints

### Authentication

- `POST /api/auth/fingerprint` - User authentication with dynamic NFT verification
- `POST /api/auth/confirm-connection` - Connection confirmation with NFT check

### Admin

- `GET /api/admin/system-stats` - System statistics and NFT contract info
- `POST /api/admin/refresh-nft` - Force refresh NFT verification for user

## Usage Examples

### Adding New Script with NFT Requirement

1. Add script to database:

```sql
INSERT INTO scripts_library (script_id, name, nft_addresses, is_active)
VALUES ('new-script', 'New Script', ARRAY['0x1234...', '0x5678...'], true);
```

2. System automatically:
   - Discovers new NFT contracts
   - Verifies ownership for all users
   - Grants access to users who own the NFTs

### Checking User Subscription

```typescript
import { dynamicNFTVerifier } from "@/services/dynamic-nft-verifier";

// Get user verification
const result = await dynamicNFTVerifier.verifyUserNFTs(
  userId,
  walletAddress,
  false // Don't force refresh
);

console.log(`User has ${result.ownedNFTs.length} NFTs`);
console.log(`Access to ${result.accessibleScripts.length} scripts`);
console.log(`Subscription level: ${result.subscriptionLevel}`);
```

### Getting System Statistics

```typescript
const stats = await dynamicNFTVerifier.getSystemStats();
console.log(`Total NFT contracts: ${stats.totalNFTContracts}`);
console.log(`Total scripts: ${stats.totalScripts}`);
console.log(`NFT holders: ${stats.nftHolders}`);
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/twitter_automation

# Blockchain
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Admin access
ADMIN_IPS=127.0.0.1,192.168.1.100
```

### Cache Settings

```typescript
// NFT cache duration (30 days)
const CACHE_DURATION_HOURS = 30 * 24;

// Force refresh cache
const forceRefresh = true;
```

## Subscription Levels

### Free Tier

- **Max Profiles**: 1
- **Scripts**: First public script only
- **Requirements**: None

### NFT Holder

- **Max Profiles**: 5
- **Scripts**: All scripts for owned NFTs
- **Requirements**: Own at least 1 NFT from any contract

## Monitoring

### System Statistics

- Total NFT contracts in database
- Total active scripts
- Number of NFT holders vs free users
- Cache hit rates

### Logs

- NFT verification attempts
- Cache hits/misses
- Script access grants
- Error handling

## Performance

### Caching Strategy

- 30-day cache for NFT ownership
- Reduces blockchain calls by ~95%
- Automatic cache invalidation

### Database Optimization

- Indexed queries for fast lookups
- Efficient JSONB operations
- Connection pooling

## Error Handling

### Graceful Degradation

- If NFT verification fails, user gets free tier
- If database is unavailable, cached results used
- If blockchain is down, last known state preserved

### Logging

- All errors logged with context
- Performance metrics tracked
- Admin alerts for critical issues

## Security

### Access Control

- Admin endpoints require IP whitelist
- User data encrypted in transit
- Secure wallet address validation

### Rate Limiting

- API rate limits prevent abuse
- Blockchain call throttling
- Cache-based protection

## Troubleshooting

### Common Issues

1. **"No NFT contracts found"**

   - Check if scripts are added to `scripts_library`
   - Verify `nft_addresses` array is not empty
   - Ensure scripts are marked as `is_active = true`

2. **"NFT verification failed"**

   - Check blockchain RPC endpoint
   - Verify contract addresses are valid
   - Check network connectivity

3. **"User not getting scripts"**
   - Verify NFT ownership on blockchain
   - Check cache expiration
   - Force refresh verification

### Debug Commands

```bash
# Check system stats
curl -X GET http://localhost:3000/api/admin/system-stats

# Force refresh user NFT
curl -X POST http://localhost:3000/api/admin/refresh-nft \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "forceRefresh": true}'
```

## Future Enhancements

- Multi-chain support (Ethereum, Polygon, etc.)
- Real-time NFT ownership monitoring
- Advanced caching strategies
- NFT metadata integration
- Automated script deployment
