# Social Automation Platform

> **Secure, NFT-gated platform for private script execution and automation**

A full-stack application combining Electron desktop client with a secure Node.js backend server. This platform enables developers to deliver encrypted automation scripts to authorized users while maintaining complete control over proprietary logic.

---

## 🎯 Overview

This project consists of two main components working together:

1. **Desktop Client** (Electron + React) - Secure execution environment for automation scripts
2. **Backend Server** (Next.js + PostgreSQL) - Script delivery and user management system

### Key Capabilities

- 🔐 **Secure Script Delivery** - Scripts encrypted with device-specific keys
- 🎨 **NFT-Based Access Control** - Blockchain-verified subscriptions via Ethereum NFTs
- 🤖 **Browser Automation** - Puppeteer-powered script execution with profile management
- 📱 **Telegram Integration** - Real-time notifications during script execution
- 🔄 **Real-Time Sync** - Continuous connection monitoring with automatic verification

---

## 📦 Project Structure

```
react-electron/
├── react-electron/          # Desktop Client (Electron + React + TypeScript)
│   ├── electron/            # Electron main process
│   ├── src/                 # React application
│   ├── build/               # Build resources (icons)
│   └── release/             # Compiled installers
│
├── backend/                 # Backend Server (Next.js + PostgreSQL)
│   ├── src/
│   │   ├── app/api/         # API routes
│   │   ├── services/        # Business logic
│   │   ├── database/        # Database models
│   │   └── utils/           # Utilities
│   └── scripts/             # Script library (gitignored)
│
└── README.md                # This file
```

---

## ✨ Features

### 🖥️ Desktop Client Features

- **MetaMask Integration** - Connect Ethereum wallet for NFT verification
- **Multi-Profile System** - Manage multiple browser profiles with different proxies/cookies
- **Advanced Fingerprinting** - Hardware-based device identification (CPU, GPU, RAM, OS)
- **Encrypted Communication** - AES-256-CBC encryption for all data transfers
- **Script Execution Engine** - Puppeteer-based browser automation with stealth plugins
- **Dark/Light Themes** - Modern UI with system preference detection
- **Multi-Language Support** - English and Russian localization

### 🔧 Backend Server Features

- **NFT Subscription Management** - Automatic blockchain verification and tier calculation
- **Script Library System** - Versioned script storage with access control
- **Device Authentication** - Multi-stage fingerprint hashing for security
- **Connection Monitoring** - 30-second ping cycle with automatic disconnection
- **PostgreSQL Database** - Robust data persistence with connection pooling
- **Admin Dashboard** - Script management and system statistics
- **Blockchain Integration** - Ethers.js for NFT ownership verification

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (includes npm)
- **PostgreSQL 12+** (for backend)
- **Git** for version control
- **MetaMask** browser extension (for wallet connection)

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/Vantana1995/react-electron.git
cd react-electron
```

#### 2. Setup Backend Server

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create PostgreSQL database
createdb social_automation

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
psql -U postgres -d social_automation -f database-init.sql

# Start server
npm run dev
```

Backend will start on `http://localhost:3000`

#### 3. Setup Desktop Client

```bash
# Navigate to client (from root)
cd react-electron

# Install dependencies
npm install

# Start development
npm run dev          # Vite dev server
npm run dev:electron # Electron app (in another terminal)
```

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Desktop Client                          │
│              (Electron + React)                         │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │   React UI   │    │  Puppeteer   │                 │
│  │   (Renderer) │    │   Scripts    │                 │
│  └──────┬───────┘    └──────┬───────┘                 │
│         │                   │                          │
│         └───────┬───────────┘                          │
│                 │                                       │
│         ┌───────▼────────┐                             │
│         │ Main Process   │                             │
│         │  (IPC Bridge)  │                             │
│         └───────┬────────┘                             │
└─────────────────┼──────────────────────────────────────┘
                  │
            HTTPS │ Encrypted Communication
                  │
┌─────────────────▼──────────────────────────────────────┐
│              Backend Server                            │
│            (Next.js + PostgreSQL)                      │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────┐ │
│  │  PostgreSQL  │    │  Ethers.js   │    │  Crypto │ │
│  │   Database   │    │  Blockchain  │    │ Node.js │ │
│  └──────────────┘    └──────────────┘    └─────────┘ │
│                                                         │
│         ┌──────────────────────────┐                   │
│         │  API Routes + Services   │                   │
│         └──────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
1. User opens desktop app
   ↓
2. Connect MetaMask wallet
   ↓
3. Collect device fingerprint (CPU, GPU, RAM, OS, IP)
   ↓
4. Send to backend: POST /api/auth/fingerprint
   ↓
5. Backend generates unique device hash (3-stage SHA-256)
   ↓
6. Verify NFT ownership on blockchain
   ↓
7. Calculate subscription tier and accessible scripts
   ↓
8. Generate encrypted session token (HMAC-signed)
   ↓
9. Return session + encrypted scripts to client
   ↓
10. Client decrypts scripts with device-specific key
   ↓
11. Start 30-second ping cycle for connection monitoring
   ↓
12. User can execute scripts with managed profiles
```

---

## 🔐 Security Features

### Multi-Layer Security

1. **Device Fingerprinting**

   - Hardware-based identification (CPU, GPU, memory, OS)
   - 3-stage SHA-256 hashing with salts
   - IP address integration for additional verification

2. **AES-256-CBC Encryption**

   - Device-specific encryption keys
   - Random IV for each encryption
   - HMAC-SHA256 verification hashes

3. **Session Management**

   - HMAC-signed tokens
   - 24-hour expiration
   - Nonce-based replay attack prevention

4. **NFT Verification**

   - Direct blockchain queries via Ethers.js
   - 30-day ownership caching
   - Multi-contract support

5. **Connection Monitoring**
   - 30-second server pings
   - Automatic disconnection on timeout
   - Nonce increment on connection loss

---

## 🎨 NFT Subscription System

### Subscription Tiers

| Tier           | Requirements       | Max Profiles | Script Access      |
| -------------- | ------------------ | ------------ | ------------------ |
| **Free**       | None               | 1            | Basic scripts only |
| **NFT Holder** | Own registered NFT | 5            | All gated scripts  |

### How It Works

1. User connects Ethereum wallet (MetaMask)
2. Backend queries blockchain for NFT ownership
3. System calculates tier based on owned NFTs
4. Scripts tied to specific NFT contracts become accessible
5. Ownership cached for 30 days to reduce API calls

### Supported Networks

- Ethereum Mainnet
- Sepolia Testnet (default for development)
- Any ERC-721 compatible network

---

## 📚 Documentation

### Detailed Documentation

- **[Desktop Client README](react-electron/README.md)** - Electron app architecture, components, and API
- **[Backend Server README](backend/README.md)** - API endpoints, database schema, and security details

### API Endpoints

#### Authentication

- `POST /api/auth/fingerprint` - Device registration and authentication
- `POST /api/auth/confirm-connection` - Connection status verification

#### Admin (IP-restricted)

- `POST /api/admin/scripts/add` - Add scripts to library
- `GET /api/admin/nft-contracts` - List NFT contracts
- `POST /api/admin/refresh-nft` - Force NFT refresh
- `GET /api/admin/system-stats` - Server statistics

#### Health

- `GET /api/health` - Health check
- `GET /api/status` - System status

---

## 🛠️ Development

### Backend Development

```bash
cd backend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Run migrations
npm run migrate

# Clear database
npm run clear-db
```

### Desktop Client Development

```bash
cd react-electron

# Start Vite dev server
npm run dev

# Start Electron in dev mode
npm run dev:electron

# Build for production
npm run build
npm run build:electron

# Platform-specific builds
npm run build:win    # Windows installer
npm run build:mac    # macOS DMG
npm run build:linux  # Linux AppImage
```

---

## 📦 Building for Production

### Backend Deployment

```bash
cd backend

# Build production bundle
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "backend" -- start
pm2 save
pm2 startup
```

### Desktop App Distribution

```bash
cd react-electron

# Build installers for all platforms
npm run build:win    # Windows: .exe installer
npm run build:mac    # macOS: .dmg image
npm run build:linux  # Linux: .AppImage

# Output: release/{version}/
```

---

## ⚙️ Configuration

### Backend Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=social_automation
DB_USER=postgres
DB_PASSWORD=your_password

# Security (CHANGE IN PRODUCTION!)
ENCRYPTION_KEY=your-64-char-hex-key
FINGERPRINT_SALT=your-64-char-hex-salt

# Blockchain
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Admin Access
ADMIN_IPS=127.0.0.1,::1,YOUR_IP

# Server
PORT=3000
NODE_ENV=production
```

### Desktop Client Configuration

Edit `src/services/serverApiService.ts`:

```typescript
private baseUrl: string = "http://localhost:3000"; // Backend URL
```

---

## 🔒 Security Best Practices

### For Production Deployment

1. ✅ Change all default encryption keys
2. ✅ Use HTTPS for all communications
3. ✅ Enable PostgreSQL SSL connections
4. ✅ Whitelist admin IPs only
5. ✅ Implement rate limiting
6. ✅ Regular security audits
7. ✅ Database backups (daily)
8. ✅ Monitor logs for suspicious activity

---

## 🤝 Contributing

This is a private project. For authorized contributors:

1. Create feature branch from `main`
2. Make changes and test thoroughly
3. Submit pull request with detailed description
4. Wait for code review approval

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🆘 Support

For issues or questions:
- Review API error messages in backend logs
- Consult detailed READMEs in component directories
- Contact development team

---

## 🎉 Technology Stack

### Frontend (Desktop Client)

- **Electron 30.0.1** - Cross-platform desktop framework
- **React 18.2.0** - UI library
- **TypeScript 5.2** - Type-safe development
- **Vite 5.1.6** - Fast build tool
- **Puppeteer 24.22** - Browser automation
- **Crypto-JS 4.2.0** - Client-side encryption

### Backend (Server)

- **Next.js 15.5.4** - React framework with API routes
- **PostgreSQL** - Relational database
- **Ethers.js 6.15.0** - Ethereum blockchain interaction
- **Node.js Crypto** - Cryptographic functions
- **Winston 3.17.0** - Logging system
- **Express** - Callback server

---

**Last Updated:** October 2025  
**Version:** 0.1.0  
