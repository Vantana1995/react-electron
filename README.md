# Private Script Server

> **Secure backend server for private script delivery and user management**

A Next.js-based server designed for developers who want to keep their critical application logic private while offloading computational requirements. This server manages user authentication, NFT-based subscriptions, and delivers encrypted scripts to authorized client applications.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Security Features](#security-features)
- [API Structure](#api-structure)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [NFT-Based Subscriptions](#nft-based-subscriptions)
- [Script Delivery System](#script-delivery-system)
- [Encryption Implementation](#encryption-implementation)
- [Real-Time Connection Management](#real-time-connection-management)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Security Best Practices](#security-best-practices)

---

## 🎯 Overview

This backend server enables developers to:

- **Hide Critical Logic**: Keep proprietary scripts and algorithms private on the server
- **Offload Resources**: Let the server handle heavy computational tasks instead of client machines
- **Secure Distribution**: Deliver encrypted scripts that are assembled at runtime on the client
- **Monetize Features**: Implement NFT-based subscription tiers with blockchain verification
- **Monitor Clients**: Real-time connection tracking with automatic ping/verification system

### Why Use This Server?

If you're building an application where:
- The core logic is proprietary and must remain hidden
- You want to avoid large resource requirements on client machines
- You need subscription management tied to blockchain assets (NFTs)
- Script delivery must be secure and tamper-proof

This server provides a complete solution for secure, encrypted script delivery with built-in user management.

---

## ✨ Key Features

### 🔐 Advanced Device Fingerprinting
- **Multi-stage hashing system** with device hardware characteristics
- Collects unique device data to create an extremely difficult-to-forge fingerprint
- Combines CPU, GPU, memory, OS, and network information for maximum uniqueness
- Three-stage hash generation for enhanced security

### 🎫 NFT-Based Subscription System
- Dynamic subscription tiers based on blockchain NFT ownership
- Automatic verification of ERC-721 NFT holdings on Ethereum networks
- 30-day cache for NFT ownership to minimize blockchain queries

### 🔒 Multi-Layer Encryption
- **AES-256-CBC encryption** for all script data transmission
- Device-specific encryption keys generated from hardware fingerprints
- HMAC-SHA256 verification hashes to ensure data integrity
- Session tokens with HMAC signatures

### 📡 Real-Time Connection Management
- Active connection tracking with 30-second ping intervals
- Direct HTTP callbacks to client applications for bi-directional communication
- Automatic nonce management to prevent replay attacks
- Connection loss detection and recovery

### 🗄️ Robust Database Architecture
- PostgreSQL with connection pooling for high performance
- User management with device fingerprint tracking
- Script library with version control support
- NFT ownership caching to reduce blockchain API calls

---

## 🏗️ Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 15.5.4                          │
│                    (App Router + API Routes)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │PostgreSQL│         │ Ethers.js│         │  Crypto  │
   │ Database │         │Blockchain│         │ Node.js  │
   └──────────┘         └──────────┘         └──────────┘
        │                     │                     │
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Client Apps     │
                    │ (Electron/Web)   │
                    └──────────────────┘
```

### Core Dependencies

- **Next.js 15.5.4** - Modern React framework with API routes
- **PostgreSQL (pg 8.16.3)** - Relational database for user and script management
- **Ethers.js 6.15.0** - Ethereum blockchain interaction and NFT verification
- **Crypto-js 4.2.0** - AES encryption for data protection
- **Node.js Crypto** - Native cryptographic functions for hashing
- **Winston 3.17.0** - Professional logging system
- **WS 8.18.3** - WebSocket support for real-time features

---

## 🔐 Security Features

### 1. Device Fingerprinting System

The server collects comprehensive device information to generate a unique, difficult-to-forge fingerprint:

**Collected Data:**
- CPU model, architecture, and core count
- GPU renderer, vendor, and memory
- Total system memory
- Operating system and version
- Client IP address
- WebGL fingerprint

**Hash Generation Process:**

```
Step 1: Primary Hash
SHA-256(salt + cpu.model + gpu.renderer + os.architecture + webgl + salt)
         ↓
     [64-char hash]

Step 2: Secondary Hash
SHA-256(salt + cpu.architecture + gpu.memory + os.platform + salt)
         ↓
     [64-char hash]

Step 3: Final Device Hash
SHA-256(salt + step1Hash + step2Hash + ipAddress + salt)
         ↓
     [Final Device Hash - stored in database]
```

This three-stage approach ensures that even if one component changes (e.g., IP address), the core device fingerprint remains recognizable.

### 2. Encryption Architecture

#### Script Encryption Flow

```
Server Side:
┌──────────────┐
│ Script Data  │
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────┐
│ Generate Device Key                    │
│ SHA-256(cpuModel + ":" + ipAddress)    │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ AES-256-CBC Encryption             │
│ - Random 16-byte IV                │
│ - Encrypt with device key          │
│ - Format: IV:encrypted (base64)    │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Generate HMAC-SHA256 Hash          │
│ For integrity verification         │
└──────┬─────────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Send to Client:         │
│ {                       │
│   encrypted: "...",     │
│   hash: "...",          │
│   nonce: 123            │
│ }                       │
└─────────────────────────┘

Client Side:
┌─────────────────────────────┐
│ Receive Encrypted Data      │
└──────┬──────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Regenerate Same Device Key           │
│ SHA-256(cpuModel + ":" + ipAddress)  │
└──────┬───────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Verify HMAC Hash                   │
│ Ensure data hasn't been tampered  │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ AES-256-CBC Decryption             │
│ - Extract IV from data             │
│ - Decrypt with device key          │
│ - Parse JSON                       │
└──────┬─────────────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Execute Scripts     │
└─────────────────────┘
```

**Why This Approach?**
- Device-specific keys ensure scripts can only be decrypted on authorized devices
- HMAC verification prevents man-in-the-middle attacks
- Random IV for each encryption prevents pattern analysis
- Scripts never stored unencrypted on disk

### 3. Session Management

Each authenticated user receives a signed session token:

```javascript
Token Structure:
{
  deviceHash: "abc123...",
  timestamp: 1699999999,
  random: "randomBytes"
}
  ↓
Base64 Encode
  ↓
HMAC-SHA256 Sign
  ↓
Final Token: "base64payload.signature"
```

- Tokens expire after 24 hours
- HMAC signature prevents tampering
- Includes random bytes to prevent prediction

### 4. Nonce-Based Replay Protection

```
Initial Connection:
Server → Client: nonce = 0

Ping 1:
Server → Client: nonce = 1
Server increments nonce in DB

Ping 2:
Server → Client: nonce = 2
Server increments nonce in DB

Connection Lost:
Server increments nonce (+1)
Client must re-authenticate

Replay Attack Prevention:
Old messages with old nonces are rejected
```

---

## 📡 API Structure

### Route Categories

#### Public Routes (No Authentication)
- [`/api/health`](src/app/api/health/route.ts) - Health check endpoint
- [`/api/status`](src/app/api/status/route.ts) - System status
- [`/api/auth/fingerprint`](src/app/api/auth/fingerprint/route.ts) - Device registration and authentication

#### Device Hash Routes (Device Authentication Only)
- [`/api/auth/callback`](src/app/api/auth/callback/route.ts) - Server callback registration
- [`/api/auth/confirm-connection`](src/app/api/auth/confirm-connection/route.ts) - Connection confirmation

#### Admin Routes (IP Whitelist Required)
- [`/api/admin/scripts/add`](src/app/api/admin/scripts/add/route.ts) - Add new scripts to library
- [`/api/admin/nft-contracts`](src/app/api/admin/nft-contracts/route.ts) - Manage NFT contract addresses
- [`/api/admin/refresh-nft`](src/app/api/admin/refresh-nft/route.ts) - Force NFT ownership refresh
- [`/api/admin/system-stats`](src/app/api/admin/system-stats/route.ts) - Server statistics

---

## 🗄️ Database Schema

### Core Tables

#### `users`
Stores user information and device fingerprints.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  device_hash VARCHAR(64) UNIQUE NOT NULL,      -- Final device hash (Step 3)
  device_fingerprint VARCHAR(64) UNIQUE NOT NULL, -- Primary hash (Step 1)
  ip_address VARCHAR(45) NOT NULL,
  nonce INTEGER DEFAULT 0,                       -- Replay attack prevention
  backup_emails TEXT[] DEFAULT '{}',
  wallet_address VARCHAR(42),                    -- Ethereum wallet (optional)
  device_info JSONB NOT NULL,                    -- Full device fingerprint data
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP
);
```

#### `scripts_library`
Central repository for all server-side scripts.

```sql
CREATE TABLE scripts_library (
  id SERIAL PRIMARY KEY,
  script_id VARCHAR(255) UNIQUE NOT NULL,      -- Unique script identifier
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL,
  script_content TEXT NOT NULL,                -- Actual script code
  nft_addresses TEXT[] DEFAULT '{}',           -- Required NFTs for access
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',                   -- Script configuration
  metadata JSONB DEFAULT '{}',                 -- Additional metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `user_nft_ownership`
Caches NFT ownership data to minimize blockchain queries.

```sql
CREATE TABLE user_nft_ownership (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  owned_nfts JSONB DEFAULT '[]',               -- Array of owned NFT contracts
  max_profiles INTEGER DEFAULT 1,              -- Subscription tier
  accessible_scripts TEXT[] DEFAULT '{}',      -- Scripts user can access
  last_verified TIMESTAMP DEFAULT NOW(),       -- Last blockchain check
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `script_versions`
Version history for scripts (optional, for auditing).

```sql
CREATE TABLE script_versions (
  id SERIAL PRIMARY KEY,
  script_id INTEGER REFERENCES scripts_library(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  script_content TEXT NOT NULL,
  nft_addresses TEXT[] DEFAULT '{}',
  changelog TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);
```

---

## 🔑 Authentication Flow

### Complete Device Registration Process

```
┌─────────────┐                                 ┌─────────────┐
│   Client    │                                 │   Server    │
└──────┬──────┘                                 └──────┬──────┘
       │                                               │
       │  1. Collect device fingerprint data          │
       │  (CPU, GPU, RAM, OS, IP)                     │
       ├──────────────────────────────────────────────▶
       │  POST /api/auth/fingerprint                  │
       │  {                                            │
       │    cpu: {...},                                │
       │    gpu: {...},                                │
       │    memory: {...},                             │
       │    os: {...},                                 │
       │    walletAddress: "0x..."                     │
       │  }                                            │
       │                                               │
       │              2. Generate 3-stage hash         │
       │                  Step 1: Device Hash          │
       │                  Step 2: Secondary Hash       │
       │                  Step 3: Final Hash + IP      │
       │                                               │
       │              3. Check database for user       │
       │                  Found? → Update last_active  │
       │                  Not found? → Register new    │
       │                                               │
       │              4. Verify NFT ownership          │
       │                  (if wallet provided)         │
       │                  Check blockchain             │
       │                  Calculate subscription       │
       │                                               │
       │              5. Generate session token        │
       │                  HMAC-signed JWT-like token   │
       │                                               │
       │◀──────────────────────────────────────────────┤
       │  Response:                                    │
       │  {                                            │
       │    deviceHash: "abc123...",                   │
       │    sessionToken: "token.signature",           │
       │    subscription: {                            │
       │      level: "nft_holder",                     │
       │      maxProfiles: 5,                          │
       │      accessibleScripts: 3                     │
       │    }                                          │
       │  }                                            │
       │                                               │
       │  6. Register with connection manager          │
       │     Start 30s ping cycle                      │
       │                                               │
       │  7. Send encrypted scripts to client          │
       │◀──────────────────────────────────────────────┤
       │  {                                            │
       │    encrypted: "base64...",                    │
       │    hash: "hmac-sha256...",                    │
       │    nonce: 0                                   │
       │  }                                            │
       │                                               │
       ▼                                               ▼
```

---

## 🎫 NFT-Based Subscriptions

### Subscription Tiers

| Tier | Requirements | Max Profiles | Script Access | Features |
|------|-------------|--------------|---------------|----------|
| **Free** | None | 1 | First public script only | Basic functionality |
| **NFT Holder** | Own any registered NFT | 5 | All NFT-gated scripts | Full feature set |

### How NFT Verification Works

1. **User Connects Wallet** - Ethereum wallet address provided during authentication
2. **Server Queries Blockchain** - Uses Ethers.js to check ERC-721 contract balances
3. **Cache Results** - NFT ownership cached for 30 days to reduce API calls
4. **Calculate Access** - Determines accessible scripts based on owned NFTs
5. **Update Database** - Stores ownership data in `user_nft_ownership` table

### NFT Contract Registration

```typescript
// Scripts can be tied to specific NFT contracts
{
  script_id: "premium-script-v1",
  name: "Premium Automation Script",
  nft_addresses: [
    "0x1234...abcd",  // NFT Contract 1
    "0x5678...efgh"   // NFT Contract 2
  ],
  // Only users owning NFTs from these contracts can access this script
}
```

### Blockchain Integration

The server connects to Ethereum networks (testnet/mainnet) to verify NFT ownership:

```typescript
// Check NFT ownership for user
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const contract = new ethers.Contract(nftAddress, ERC721_ABI, provider);
const balance = await contract.balanceOf(walletAddress);
// balance > 0 means user owns the NFT
```

**Supported Networks:**
- Sepolia Testnet (default for development)
- Ethereum Mainnet (configurable via environment)
- Any ERC-721 compatible network

---

## 📦 Script Delivery System

### Script Structure

Scripts in the library contain:

```json
{
  "id": 1,
  "script_id": "twitter-automation-v1",
  "name": "Twitter Automation Script",
  "description": "Automates Twitter interactions",
  "version": "1.0.0",
  "script_content": "/* JavaScript code here */",
  "nft_addresses": ["0x1234..."],
  "category": "automation",
  "config": {
    "features": ["auto-like", "auto-reply"],
    "usage": {
      "rateLimit": 100,
      "timeout": 5000
    },
    "security": {
      "requireAuth": true
    },
    "entry_point": "index.js"
  },
  "is_active": true
}
```

### Delivery Process

```
1. User Authenticates
   ↓
2. Server Checks Subscription Tier
   ↓
3. Determine Accessible Scripts
   (based on NFT ownership)
   ↓
4. Package Scripts with Metadata
   ↓
5. Generate Device-Specific Encryption Key
   ↓
6. Encrypt Entire Payload (AES-256-CBC)
   ↓
7. Generate HMAC Verification Hash
   ↓
8. Send to Client via HTTP Callback
   ↓
9. Client Decrypts and Executes
```

### NFT + Script Pairing

For NFT holders, scripts are paired with their NFT metadata:

```json
{
  "nftScriptPairs": [
    {
      "nft": {
        "address": "0x1234...",
        "image": "https://ipfs.io/...",
        "metadata": {
          "name": "NFT #1",
          "attributes": [...]
        }
      },
      "script": {
        "name": "Premium Script",
        "code": "/* script code */",
        "version": "1.0.0"
      },
      "maxProfiles": 5
    }
  ]
}
```

This allows the client UI to display NFTs alongside their associated scripts.

---

## 🔐 Encryption Implementation

### Key Generation

```typescript
// Device-specific key generation
function generateDeviceKey(cpuModel: string, ipAddress: string): Buffer {
  const combinedData = `${cpuModel}:${ipAddress}`;
  const hash = crypto.createHash('sha256');
  hash.update(combinedData);
  return hash.digest().subarray(0, 32); // 256-bit key
}
```

### Encryption Process

```typescript
// Encrypt data with device key
function encryptData(data: any, key: Buffer): string {
  const jsonData = JSON.stringify(data);
  const iv = crypto.randomBytes(16);  // Random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(jsonData, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Combine IV and encrypted data
  const combined = iv.toString('hex') + ':' + encrypted;
  return Buffer.from(combined).toString('base64');
}
```

### Decryption Process (Client Side)

```typescript
// Client must have same CPU model and IP to decrypt
function decryptData(encryptedData: string, key: Buffer): any {
  const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
  const [ivHex, encrypted] = combined.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}
```

### Integrity Verification

```typescript
// Generate HMAC for data integrity
function createVerificationHash(data: any, key: Buffer): string {
  const jsonData = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(jsonData);
  return hmac.digest('hex');
}

// Verify data hasn't been tampered with
function verifyData(data: any, hash: string, key: Buffer): boolean {
  const expectedHash = createVerificationHash(data, key);
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}
```

---

## 🌐 Real-Time Connection Management

### Connection Lifecycle

```typescript
class ClientConnectionManager {
  // 30-second ping interval
  private readonly PING_INTERVAL = 30000;

  // Active connections map
  private activeConnections: Map<string, ActiveConnection>;

  // Automatic ping service
  startPingService() {
    setInterval(() => {
      this.pingActiveConnections();
    }, this.PING_INTERVAL);
  }
}
```

### Ping System

Every 30 seconds, the server:

1. **Sends HTTP request** to client's local endpoint
2. **Includes encrypted data** with current nonce
3. **Waits for response** (5 second timeout)
4. **Validates response** from client
5. **Updates connection state** in memory

```typescript
// Ping active connection
async sendDirectCallToClient(connection, instruction) {
  // Prepare payload with verification hash
  const payload = {
    verificationHash: generateHash(deviceData, nonce),
    timestamp: Date.now(),
    instruction: {
      action: "verify_connection",
      priority: "normal",
      data: { encrypted: "...", hash: "..." }
    },
    nonce: connection.nonce
  };

  // Send HTTP POST to client
  const response = await fetch(`http://localhost:3001/api/server-callback`, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeout: 5000
  });

  return response.verified === true;
}
```

### Connection Loss Detection

```
Ping 1: ✅ Success → Reset missed count
Ping 2: ❌ Failed → Increment nonce, remove connection
```

**No retry logic** - Connection loss is handled immediately:
- Increment user's nonce in database
- Remove from active connections
- Client must re-authenticate

This prevents replay attacks from old cached messages.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up PostgreSQL database**
```bash
createdb twitter_automation
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run database migrations**
```bash
npm run migrate
```

6. **Start development server**
```bash
npm run dev
```

Server will start on [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Variables

Create a `.env` file in the backend root:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=twitter_automation
DB_USER=postgres
DB_PASSWORD=your_password

# Encryption Keys (CHANGE THESE IN PRODUCTION!)
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
FINGERPRINT_SALT=your-64-character-hex-salt-here

# Blockchain Configuration
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Admin IP Whitelist (comma-separated)
ADMIN_IPS=127.0.0.1,::1,YOUR_IP_HERE

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Important Security Notes

- **Change default encryption keys** before deploying to production
- Use strong, randomly-generated 64-character hex strings
- Never commit `.env` file to version control
- Whitelist only trusted IP addresses for admin endpoints

---

## 📚 API Endpoints

### Authentication Endpoints

#### POST `/api/auth/fingerprint`
Register or authenticate a device.

**Request:**
```json
{
  "cpu": {
    "cores": 8,
    "architecture": "x64",
    "model": "Intel Core i7"
  },
  "gpu": {
    "renderer": "ANGLE (Intel HD Graphics)",
    "vendor": "Google Inc.",
    "memory": 4096
  },
  "memory": {
    "total": 16384
  },
  "os": {
    "platform": "win32",
    "version": "10.0.19045",
    "architecture": "x64"
  },
  "walletAddress": "0x1234567890abcdef...",
  "clientIPv4": "192.168.1.100"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceHash": "abc123def456...",
    "sessionToken": "eyJ...token.signature",
    "userId": 42,
    "isRegistered": true,
    "subscription": {
      "level": "nft_holder",
      "maxProfiles": 5,
      "ownedNFTs": 2,
      "accessibleScripts": 5
    }
  }
}
```

#### POST `/api/auth/confirm-connection`
Confirm active connection status.

**Headers:**
```
X-Device-Hash: abc123def456...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "lastPing": "2024-10-09T12:34:56.789Z"
  }
}
```

### Admin Endpoints

#### POST `/api/admin/scripts/add`
Add a new script to the library.

**Request:**
```json
{
  "script_id": "my-script-v1",
  "name": "My Automation Script",
  "description": "Does something useful",
  "version": "1.0.0",
  "script_content": "console.log('Hello World');",
  "nft_addresses": ["0x1234..."],
  "category": "automation",
  "config": {
    "features": ["feature1", "feature2"]
  }
}
```

#### GET `/api/admin/nft-contracts`
List all registered NFT contracts.

**Response:**
```json
{
  "success": true,
  "data": {
    "contracts": [
      "0x1234567890abcdef...",
      "0xfedcba0987654321..."
    ]
  }
}
```

#### POST `/api/admin/refresh-nft`
Force NFT ownership refresh for a user.

**Request:**
```json
{
  "userId": 42,
  "walletAddress": "0x1234567890abcdef..."
}
```

#### GET `/api/admin/system-stats`
Get server statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "activeConnections": 48,
    "totalScripts": 12,
    "nftHolders": 856,
    "uptime": "7d 14h 23m"
  }
}
```

### Health Endpoints

#### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2024-10-09T12:34:56.789Z"
  }
}
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── app/
│   │   └── api/                      # API route handlers
│   │       ├── auth/                 # Authentication endpoints
│   │       │   ├── fingerprint/      # Device registration
│   │       │   ├── callback/         # Connection callbacks
│   │       │   └── confirm-connection/
│   │       ├── admin/                # Admin endpoints
│   │       │   ├── scripts/          # Script management
│   │       │   ├── nft-contracts/    # NFT contract management
│   │       │   ├── refresh-nft/      # Force NFT refresh
│   │       │   └── system-stats/     # Server statistics
│   │       ├── health/               # Health check
│   │       └── status/               # Status endpoint
│   │
│   ├── config/
│   │   └── database.ts               # PostgreSQL connection pool
│   │
│   ├── database/
│   │   └── models/                   # Database models
│   │       ├── User.ts               # User model and queries
│   │       └── Script.ts             # Script model and queries
│   │
│   ├── services/                     # Business logic services
│   │   ├── blockchain.ts             # NFT verification (Ethers.js)
│   │   ├── client-connection.ts      # Connection management
│   │   ├── subscription-manager.ts   # Subscription logic
│   │   ├── script-manager.ts         # Script delivery
│   │   ├── nft-event-listener.ts     # Blockchain event monitoring
│   │   ├── dynamic-nft-verifier.ts   # Dynamic NFT verification
│   │   └── dynamic-nft-listener-manager.ts
│   │
│   ├── utils/                        # Utility functions
│   │   ├── api-response.ts           # Standard API responses
│   │   ├── crypto.ts                 # Hashing and encryption
│   │   ├── crypto-edge.ts            # Edge-compatible crypto
│   │   ├── encryption.ts             # AES encryption utilities
│   │   ├── validation.ts             # Input validation
│   │   ├── cors.ts                   # CORS configuration
│   │   ├── nft-cache.ts              # NFT ownership caching
│   │   ├── nft-event-handler.ts      # NFT event processing
│   │   └── constants.ts              # Application constants
│   │
│   └── middleware.ts                 # Request authentication middleware
│
├── scripts/                          # Scripts directory (IGNORED by git)
│   └── ...                           # Your private scripts here
│
├── .env                              # Environment variables (IGNORED)
├── .env.example                      # Example environment config
├── .gitignore                        # Git ignore rules
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

### Key Files Explained

| File | Purpose |
|------|---------|
| [`middleware.ts`](src/middleware.ts) | Authenticates requests, validates device hashes and session tokens |
| [`database.ts`](src/config/database.ts) | PostgreSQL connection pooling configuration |
| [`client-connection.ts`](src/services/client-connection.ts) | Manages active connections, sends encrypted scripts |
| [`blockchain.ts`](src/services/blockchain.ts) | Verifies NFT ownership via Ethers.js |
| [`subscription-manager.ts`](src/services/subscription-manager.ts) | Calculates subscription tiers and script access |
| [`encryption.ts`](src/utils/encryption.ts) | AES-256 encryption/decryption utilities |
| [`crypto.ts`](src/utils/crypto.ts) | Device fingerprint hashing and session tokens |

---

## 🔒 Security Best Practices

### For Production Deployment

1. **Change All Default Keys**
   - Generate new `ENCRYPTION_KEY` (64-char hex)
   - Generate new `FINGERPRINT_SALT` (64-char hex)
   - Use `openssl rand -hex 32` to generate secure keys

2. **Secure Database**
   - Use strong PostgreSQL password
   - Enable SSL for database connections
   - Restrict database access to server IP only

3. **Enable HTTPS**
   - Use TLS/SSL certificates (Let's Encrypt)
   - Redirect all HTTP to HTTPS
   - Set secure cookie flags

4. **IP Whitelisting**
   - Limit admin endpoints to specific IPs
   - Use VPN for remote admin access
   - Monitor failed authentication attempts

5. **Rate Limiting**
   - Implement rate limiting on authentication endpoints
   - Limit script requests per user
   - Add DDoS protection (Cloudflare, etc.)

6. **Monitor Logs**
   - Set up Winston logging to files
   - Monitor for suspicious patterns
   - Alert on repeated failed authentications

7. **Regular Updates**
   - Keep dependencies updated
   - Patch security vulnerabilities promptly
   - Review blockchain contract changes

8. **Backup Strategy**
   - Daily database backups
   - Secure script library backups
   - Test restore procedures

---

## 📝 License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

---

## 🤝 Support

For issues or questions:
- Open an issue in the repository
- Contact the development team
- Check documentation in `/docs` folder

---

## 🎉 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [Ethers.js](https://docs.ethers.org/) - Ethereum library
- [Node.js Crypto](https://nodejs.org/api/crypto.html) - Cryptography

---

**Last Updated:** October 2024
**Version:** 1.0.0
