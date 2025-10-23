# Twitter Automation Platform

> **Secure platform for automated Twitter interactions with advanced anti-detection and multi-account management**

A full-stack application combining Electron desktop client with a secure Node.js backend server. This platform enables automated Twitter interactions through encrypted scripts that execute locally on user devices, providing scalability and security.

---

## 🎯 Overview

This project consists of two main components working together:

1. **Desktop Client** (Electron + React) - Secure execution environment for automation scripts
2. **Backend Server** (Next.js + PostgreSQL) - Script delivery and user management system

### Key Capabilities

- 🤖 **Automated Twitter Interactions** - Automatic replies to tweets with selected keywords
- 🔐 **Secure Script Delivery** - Scripts encrypted and executed only in device memory
- 🎭 **Advanced Anti-Detection System** - Browser fingerprinting, proxy rotation, and realistic behavior simulation
- 🍪 **Automatic Cookie Collection** - Realistic browsing behavior for cookie warmup
- 🔍 **Search Query Builder** - Visual interface for building complex Twitter search queries
- 👥 **Multi-Account Support** - Run multiple Twitter accounts simultaneously in headless mode
- 📱 **Notifications** - Real-time Discord and Telegram notifications
- 📸 **Smart Screenshots** - Auto-adjusted height to capture full tweet content
- 🔄 **Scalable Architecture** - Client-side execution reduces server load

---

## 🌟 Why This Platform?

### Unique Architecture

This platform uses a revolutionary **memory-only script execution** model:

1. **Server stores encrypted scripts** - Your proprietary automation logic is protected
2. **Scripts transmitted securely** - AES-256-CBC encryption with device-specific keys
3. **Executed only in RAM** - Scripts never touch the hard drive
4. **Auto-cleared on exit** - Scripts disappear from memory when app closes

**Result:** Your automation logic cannot be stolen, copied, or reverse-engineered!

### Scalability Benefits

Traditional automation platforms execute scripts on centralized servers, creating bottlenecks:
- ❌ Limited concurrent users
- ❌ High server costs
- ❌ Slow performance during peak times
- ❌ Single point of failure

**This platform executes scripts on client devices:**
- ✅ Unlimited concurrent users
- ✅ Minimal server costs (only script delivery)
- ✅ Fast performance (each user has dedicated resources)
- ✅ Distributed architecture (no single point of failure)

### Key Features Summary

**For Users:**
- 🎯 Visual search query builder - no coding required
- 🤖 Automated keyword replies
- 👥 Unlimited Twitter accounts
- 🔒 Advanced anti-detection
- 📸 Smart screenshots with auto-height
- 📱 Discord/Telegram notifications
- 🍪 Automatic cookie warmup

**For Developers:**
- 🔐 Script protection (encrypted, memory-only)
- 💰 Cost-effective (client-side execution)
- 📈 Infinite scalability
- 🎨 NFT-gated access control
- 🔧 Easy script deployment
- 📊 Usage analytics

---

## 📦 Project Structure

```
Twitter app/
├── react-electron/          # Desktop Client (Electron + React + TypeScript)
│   ├── electron/            # Electron main process
│   │   ├── main.ts          # Main process (IPC handlers, script execution)
│   │   └── preload.ts       # Preload script (secure IPC bridge)
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ProfileManager/    # Profile management UI
│   │   │   ├── SearchQueryBuilder/# Visual query builder
│   │   │   └── ...
│   │   ├── services/        # Business logic
│   │   │   ├── profileStorage.ts  # Profile & cookie management
│   │   │   ├── telegramService.ts # Telegram notifications
│   │   │   └── serverApiService.ts# Backend API client
│   │   └── types/           # TypeScript definitions
│   ├── scripts/             # Automation scripts
│   │   └── cookieCollector.cjs    # Cookie collection script
│   ├── build/               # Build resources (icons)
│   └── release/             # Compiled installers
│
├── backend/                 # Backend Server (Next.js + PostgreSQL)
│   ├── src/
│   │   ├── app/api/         # API routes
│   │   ├── services/        # Business logic
│   │   ├── database/        # Database models
│   │   └── utils/           # Utilities (encryption, fingerprinting)
│   └── scripts/             # Server-side automation scripts (encrypted)
│
└── README.md                # This file
```

---

## ✨ Features

### 🖥️ Desktop Client Features

#### Profile Management
- **Multi-Profile System** - Manage unlimited Twitter accounts with individual settings
- **Advanced Anti-Detection** - Browser fingerprint spoofing (Canvas, WebGL, User Agent, Screen Resolution)
- **Proxy Support** - HTTP/HTTPS/SOCKS5 proxy with authentication per profile
- **Cookie Management** - Import/export cookies, automatic cookie warmup
- **Profile Templates** - Quick setup with predefined configurations

#### Automation
- **Headless Mode** - Run multiple accounts simultaneously without UI
- **Smart Screenshots** - Automatically adjusts viewport height to capture full tweets
- **Search Query Builder** - Visual interface with 20+ filters for building complex Twitter searches
- **Real-Time Progress** - Live updates during script execution
- **Error Handling** - Automatic retry and graceful failure recovery

#### Cookie Collection System
- **Automatic Cookie Warmup** - Visits popular sites to collect realistic cookies
- **Human Behavior Simulation** - Realistic scrolling, mouse movements, link clicking
- **Multi-Page Collection** - Collects cookies from main pages and internal links
- **Cookie Banner Handling** - Universal banner acceptance across sites
- **Custom Sites Support** - Add any URLs for cookie collection

#### Security & Privacy
- **Encrypted Storage** - All sensitive data encrypted locally
- **Memory-Only Execution** - Scripts never saved to disk
- **Secure Communication** - AES-256-CBC encryption for all data transfers
- **Device Fingerprinting** - Hardware-based device identification (CPU, GPU, RAM, OS)

#### User Interface
- **Modern Design** - Dark/Light themes with smooth animations
- **Multi-Language Support** - English and Russian localization
- **Real-Time Logs** - Detailed execution logs for debugging
- **Discord & Telegram Notifications** - Get notified about automation events

### 🔧 Backend Server Features

#### Script Delivery System
- **Encrypted Scripts** - Server-side automation scripts delivered in encrypted form
- **Memory-Only Execution** - Scripts execute in RAM and are automatically cleared on app close
- **Version Control** - Manage multiple script versions
- **Access Control** - NFT-based or subscription-based access
- **Script Protection** - Proprietary logic never exposed to users

#### Twitter Automation Scripts
- **Keyword Reply Bot** - Automatically reply to tweets containing selected keywords
- **Search Monitoring** - Monitor Twitter search results in real-time
- **Tweet Interaction** - Like, retweet, quote tweet automation
- **Rate Limiting** - Respect Twitter rate limits to avoid detection
- **Context-Aware Replies** - Generate contextual responses based on tweet content

#### Infrastructure
- **NFT Subscription Management** - Blockchain-verified access control
- **Device Authentication** - Multi-stage fingerprint hashing for security
- **Connection Monitoring** - 30-second ping cycle with automatic disconnection
- **PostgreSQL Database** - Robust data persistence with connection pooling
- **Admin Dashboard** - Script management and system statistics
- **Scalable Architecture** - Client-side execution reduces server load

---

## 🚀 Quick Start

### For End Users

If you just want to use the platform:

1. **Download** the latest release for your OS from the releases page
2. **Install** the application
3. **Run** the app and connect your wallet (if using NFT access)
4. **Create profiles** for your Twitter accounts
5. **Start automating!**

### For Developers

If you want to set up the platform from source:

#### Prerequisites

- **Node.js 20+** (includes npm)
- **PostgreSQL 12+** (for backend server)
- **Git** for version control
- **MetaMask** browser extension (optional, for NFT-gated access)

#### Installation Steps

#### 1. Clone Repository

```bash
git clone https://github.com/Vantana1995/Twitter-app.git
cd Twitter-app
```

#### 2. Setup Backend Server (Optional - for script delivery)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create PostgreSQL database
createdb twitter_automation

# Configure environment
cp .env.example .env
# Edit .env with your configuration:
# - Database credentials
# - Encryption keys (IMPORTANT: change in production!)
# - Blockchain RPC URLs (if using NFT access)
# - Admin IPs

# Run database migrations
psql -U postgres -d twitter_automation -f database-init.sql

# Start server
npm run dev
```

Backend will start on `http://localhost:3000`

**Note:** You can use the desktop client without the backend server for local script execution.

#### 3. Setup Desktop Client

```bash
# Navigate to client (from root)
cd react-electron

# Install dependencies
npm install

# Configure backend URL (if using backend server)
# Edit src/services/serverApiService.ts and set your backend URL

# Start development
npm run dev          # Vite dev server
npm run dev:electron # Electron app (in another terminal)
```

#### 4. Build Desktop App for Distribution

```bash
cd react-electron

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux

# Output: release/{version}/
```

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Desktop Client (User's Device)                  │
│                        (Electron + React)                           │
│                                                                     │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │  Profile       │  │  Query Builder  │  │  Script Runner   │   │
│  │  Manager UI    │  │  (Visual UI)    │  │  (Memory Only)   │   │
│  └───────┬────────┘  └────────┬────────┘  └────────┬─────────┘   │
│          │                    │                     │              │
│          └────────────────────┼─────────────────────┘              │
│                               │                                    │
│                    ┌──────────▼──────────┐                         │
│                    │   Electron Main     │                         │
│                    │   (IPC + Puppeteer) │                         │
│                    └──────────┬──────────┘                         │
│                               │                                    │
│                    ┌──────────▼──────────┐                         │
│                    │  Puppeteer Browser  │                         │
│                    │  + Anti-Detection   │                         │
│                    │  + Proxy + Cookies  │                         │
│                    └──────────┬──────────┘                         │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                    Twitter.com │ (Automated Interactions)
                                │
                    ┌───────────▼───────────┐
                    │     Twitter API       │
                    │   (Public Website)    │
                    └───────────────────────┘

                    ┌───────────────────────┐
                    │  Notifications        │
                    │  Discord / Telegram   │
                    └───────────────────────┘

         Optional (for encrypted script delivery):
                                │
                          HTTPS │ Encrypted Communication
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                       Backend Server                                │
│                  (Next.js + PostgreSQL)                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐             │
│  │  Encrypted   │  │  PostgreSQL  │  │  Ethers.js  │             │
│  │   Scripts    │  │   Database   │  │ Blockchain  │             │
│  │   Storage    │  │ (User Data)  │  │   (NFTs)    │             │
│  └──────────────┘  └──────────────┘  └─────────────┘             │
│                                                                     │
│            ┌──────────────────────────────┐                        │
│            │  Script Delivery + Auth API  │                        │
│            └──────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Automation Workflow

```
1. User creates Twitter profile in desktop app
   ↓
2. Configures:
   - Proxy settings (optional)
   - Browser fingerprint (anti-detection)
   - Cookies (from cookie collection or manual import)
   - Telegram/Discord notifications (optional)
   ↓
3. Opens Search Query Builder
   - Visual interface to build Twitter search queries
   - Selects keywords, filters, date ranges, etc.
   - Preview generated query
   ↓
4. (Optional) Connects to backend server for premium scripts
   - Device fingerprint sent to server
   - NFT ownership verified on blockchain
   - Encrypted scripts downloaded to RAM (never to disk)
   ↓
5. Starts automation script
   - Puppeteer launches browser with anti-detection
   - Applies fingerprint, proxy, cookies
   - Executes Twitter search with built query
   - Monitors results in real-time
   ↓
6. Script performs actions
   - Finds tweets matching keywords
   - Takes screenshots (auto-height adjustment)
   - Posts replies (with realistic delays)
   - Sends notifications to Discord/Telegram
   ↓
7. On app close
   - All scripts cleared from memory
   - Browser sessions terminated
   - Cookies optionally saved for next run
```

### Script Protection Flow

```
Developer Side:
1. Write automation script
   ↓
2. Upload to backend (encrypted)
   ↓
3. Assign to NFT contract (access control)

User Side:
1. User authenticates with NFT
   ↓
2. Backend verifies NFT ownership
   ↓
3. Encrypted script sent to user device
   ↓
4. Script decrypted in RAM (device-specific key)
   ↓
5. Script executes in memory only
   ↓
6. On app close: Script deleted from RAM

Result: User cannot extract, copy, or reverse-engineer the script!
```

---

## 🔐 Security & Anti-Detection

### Script Protection

The platform implements a unique script protection system:

1. **Encrypted Transmission**
   - Scripts are stored on the server in encrypted form
   - Each script is encrypted with AES-256-CBC using device-specific keys
   - Scripts are transmitted over HTTPS with additional encryption layer

2. **Memory-Only Execution**
   - Scripts are never written to disk on client devices
   - Upon download, scripts are decrypted and stored only in RAM
   - Scripts execute directly from memory using Puppeteer
   - When application closes, all scripts are automatically cleared from memory

3. **Benefits of This Architecture**
   - **Protection**: Proprietary automation logic cannot be extracted or reverse-engineered
   - **Scalability**: Each user executes scripts on their own device, reducing server load
   - **Performance**: No server bottleneck - unlimited concurrent users
   - **Cost-Effective**: Server only delivers encrypted scripts, not executing them
   - **Security**: Scripts automatically disappear from device when app closes

### Anti-Detection System

1. **Browser Fingerprinting**
   - Canvas fingerprint randomization (noise injection)
   - WebGL vendor/renderer spoofing
   - User Agent rotation
   - Screen resolution customization
   - Hardware concurrency override
   - Timezone and locale matching
   - Font fingerprint masking

2. **Behavioral Anti-Detection**
   - Human-like mouse movements with Bezier curves
   - Realistic typing speed with random delays
   - Natural scrolling patterns with back-scrolling
   - Random pauses between actions
   - Internal link clicking simulation
   - Cookie banner interaction
   - Search field interaction

3. **Network-Level Protection**
   - Proxy support (HTTP/HTTPS/SOCKS5)
   - Proxy rotation per profile
   - Request throttling to match human behavior
   - Rate limiting to avoid Twitter detection

4. **Multi-Layer Security**

   **Device Fingerprinting**
   - Hardware-based identification (CPU, GPU, memory, OS)
   - 3-stage SHA-256 hashing with salts
   - IP address integration for additional verification

   **AES-256-CBC Encryption**
   - Device-specific encryption keys
   - Random IV for each encryption
   - HMAC-SHA256 verification hashes

   **Session Management**
   - HMAC-signed tokens
   - 24-hour expiration
   - Nonce-based replay attack prevention

   **NFT Verification**
   - Direct blockchain queries via Ethers.js
   - 30-day ownership caching
   - Multi-contract support

   **Connection Monitoring**
   - 30-second server pings
   - Automatic disconnection on timeout
   - Nonce increment on connection loss

---

## 🎨 NFT Subscription System

### Subscription Tiers

| Tier           | Requirements       | Max Profiles | Script Access      |
| -------------- | ------------------ | ------------ | ------------------ |
| **Free**       | None               | Unlimited    | Basic scripts only |
| **NFT Holder** | Own registered NFT | Unlimited    | All premium scripts  |

### How It Works

1. User connects Ethereum wallet (MetaMask)
2. Backend queries blockchain for NFT ownership
3. System calculates tier based on owned NFTs
4. Premium automation scripts become accessible
5. Ownership cached for 30 days to reduce API calls

### Supported Networks

- Ethereum Mainnet
- Sepolia Testnet (default for development)
- Any ERC-721 compatible network

---

## 🤖 Automation Scripts

The platform delivers encrypted automation scripts that run locally on user devices. Scripts are transmitted in encrypted form and executed only in memory.

### Available Scripts

#### Keyword Reply Bot
Automatically monitors Twitter for tweets containing selected keywords and posts replies.

**Features:**
- Custom keyword lists (exact match, partial match, regex)
- Configurable reply templates with variables
- Rate limiting to avoid detection
- Smart reply timing (random delays)
- Tweet context analysis
- Duplicate detection (avoid replying twice)
- Discord/Telegram notifications

#### Tweet Search Monitor
Continuously monitors Twitter search results based on custom queries.

**Features:**
- Visual query builder with 20+ filters
- Real-time search monitoring
- Screenshot capture of found tweets
- Like/retweet/quote automation
- Engagement tracking
- Multi-account support

#### Cookie Collection Bot
Automatically collects realistic cookies for account warmup.

**Features:**
- Visits 12+ popular websites
- Human behavior simulation (scrolling, clicking, typing)
- Multi-page browsing per site
- Cookie banner acceptance
- Customizable site list
- Progress tracking

---

## 🔍 Search Query Builder

Visual interface for building complex Twitter search queries without coding.

### Supported Filters

**Text Filters:**
- Keywords (AND/OR/NOT operators)
- Exact phrases
- Hashtags
- Mentions
- URLs

**User Filters:**
- From specific users
- To specific users
- Replies to users

**Engagement Filters:**
- Minimum likes
- Minimum retweets
- Minimum replies

**Content Filters:**
- Has media (images/videos)
- Has links
- Is retweet
- Is quote tweet
- Is reply

**Date Filters:**
- Since date
- Until date
- Date range

**Language & Location:**
- Language selection
- Near location
- Within radius

### Query Preview

Real-time preview of generated Twitter search query with syntax highlighting.

---

## 📚 Documentation

### Detailed Documentation

- **[Desktop Client README](react-electron/README.md)** - Electron app architecture, components, and API
- **[Backend Server README](backend/README.md)** - API endpoints, database schema, and security details
- **[Cookie Collection Guide](COOKIE_COLLECTION_IMPLEMENTATION_GUIDE.md)** - Cookie collection system architecture and implementation

### API Endpoints

#### Authentication

- `POST /api/auth/fingerprint` - Device registration and authentication
- `POST /api/auth/confirm-connection` - Connection status verification

#### Script Management

- `GET /api/scripts` - Get available scripts for authenticated user
- `GET /api/scripts/:id` - Download encrypted script
- `POST /api/scripts/report` - Report script execution results

#### Admin (IP-restricted)

- `POST /api/admin/scripts/add` - Add scripts to library
- `GET /api/admin/nft-contracts` - List NFT contracts
- `POST /api/admin/refresh-nft` - Force NFT refresh
- `GET /api/admin/system-stats` - Server statistics

#### Health

- `GET /api/health` - Health check
- `GET /api/status` - System status

---

## 💡 Use Cases

### 1. Marketing & Brand Monitoring
- Monitor mentions of your brand on Twitter
- Automatically respond to customer inquiries
- Track competitor activity
- Engage with relevant hashtags

### 2. Community Management
- Auto-reply to common questions
- Welcome new followers
- Share content based on trending topics
- Moderate community discussions

### 3. Research & Data Collection
- Collect tweets about specific topics
- Track sentiment over time
- Analyze engagement patterns
- Export data for analysis

### 4. Personal Brand Building
- Engage with relevant content in your niche
- Build relationships with influencers
- Share curated content automatically
- Maintain consistent presence

### 5. Lead Generation
- Find potential customers discussing relevant topics
- Engage with decision-makers
- Share valuable content to prospects
- Track conversion from engagement

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

**MIT License**

Copyright (c) 2025 Vantana1995

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Contributing

This is an open-source project. You are free to:

- ✅ Use, modify, and distribute this software
- ✅ Create your own versions and forks
- ✅ Use it for commercial purposes

**However:**

- The official version remains under the original repository
- To contribute improvements to the official version, please submit pull requests
- Your fork is your own - do what you want with it!

---

## 🆘 Support

For issues or questions:

- Check console logs (F12 in desktop app)
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
- **Puppeteer 24.22** - Browser automation with stealth plugins
- **Puppeteer-Extra-Plugin-Stealth** - Anti-detection features
- **Crypto-JS 4.2.0** - Client-side encryption
- **Axios** - HTTP client for API communication

### Backend (Server)

- **Next.js 15.5.4** - React framework with API routes
- **PostgreSQL** - Relational database
- **Ethers.js 6.15.0** - Ethereum blockchain interaction
- **Node.js Crypto** - Cryptographic functions
- **Winston 3.17.0** - Logging system

### Automation & Anti-Detection

- **Puppeteer with Stealth Plugins** - Headless browser automation
- **Canvas Fingerprint Randomization** - Canvas noise injection
- **WebGL Spoofing** - GPU fingerprint masking
- **User Agent Rotation** - Dynamic UA switching
- **Human Behavior Simulation** - Realistic mouse & keyboard actions

---

## ⚠️ Disclaimer

This software is provided for educational and research purposes only. Users are responsible for complying with Twitter's Terms of Service and all applicable laws and regulations. The developers are not responsible for any misuse of this software.

**Important Notes:**
- Always use proxies and anti-detection features to protect your accounts
- Respect Twitter's rate limits to avoid account suspension
- Use realistic delays between actions
- Start with cookie warmup before running automation scripts
- Monitor your accounts regularly for any issues
- This tool should not be used for spam or malicious activities

---

## 🔒 Privacy & Data Protection

### What Data is Collected?

**Locally (on your device):**
- Profile configurations (proxies, cookies, fingerprints)
- Script execution logs
- Browser automation data

**On the server:**
- Device fingerprint hashes (not reversible)
- NFT ownership status (public blockchain data)
- Script access logs
- Connection timestamps

### What Data is NOT Collected?

- Passwords or private keys
- Twitter account credentials
- Personal messages or DMs
- Tweet content
- Browser history
- Any PII (Personally Identifiable Information)

### Data Security

- All sensitive data is encrypted with AES-256-CBC
- Scripts execute only in memory (never saved to disk)
- Local data is encrypted with device-specific keys
- Server communication uses HTTPS
- Database credentials are never exposed

---

**Last Updated:** October 2025
**Version:** 1.0.0
**License:** MIT 
