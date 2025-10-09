# Twitter Automation Platform - Desktop Client

> **Secure Electron-based desktop application for private script execution**

A cross-platform desktop application built with Electron, React, and TypeScript that securely receives and executes automation scripts from a private backend server. Features NFT-based subscription management, advanced device fingerprinting, and browser automation with Puppeteer.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Security Features](#security-features)
- [Application Flow](#application-flow)
- [Script Execution System](#script-execution-system)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [User Interface](#user-interface)
- [Profile Management](#profile-management)
- [Telegram Integration](#telegram-integration)
- [Build & Distribution](#build--distribution)
- [Configuration](#configuration)

---

## 🎯 Overview

This desktop application provides a secure environment for executing automation scripts delivered from a private backend server. Key capabilities include:

- **Secure Script Delivery**: Receives encrypted scripts that are decrypted and executed in memory only
- **NFT-Based Access**: Displays NFT ownership and unlocks features based on blockchain holdings
- **Browser Automation**: Executes Puppeteer-based scripts with profile management
- **Multi-Profile Support**: Manage multiple browser profiles with different proxies and cookies
- **Telegram Notifications**: Receive real-time updates about script execution
- **Advanced Fingerprinting**: Creates unique device fingerprints for secure authentication

---

## ✨ Key Features

### 🔐 Security & Authentication

- **Device Fingerprinting**: Collects CPU, GPU, memory, OS, and WebGL data for unique identification
- **Encrypted Communication**: AES-256-CBC encryption for all script data transfers
- **In-Memory Execution**: Scripts never written to disk, only executed in RAM
- **MetaMask Integration**: Connect Ethereum wallet for NFT verification
- **Session Management**: Secure session tokens with automatic timeout handling

### 🎨 User Interface

- **Modern React UI**: Built with React 18 and TypeScript
- **Dark/Light Themes**: Toggle between themes with system preference detection
- **Multi-Language Support**: English and Russian language support
- **Responsive Design**: Adapts to different screen sizes and resolutions
- **Real-Time Updates**: Live script execution status and server ping monitoring

### 🤖 Script Execution

- **Puppeteer Integration**: Full browser automation capabilities with stealth plugins
- **Profile Management**: Create and manage multiple browser profiles
- **Proxy Support**: Configure SOCKS5/HTTP proxies per profile
- **Cookie Management**: Import and manage cookies for authenticated sessions
- **Telegram Notifications**: Receive script status updates via Telegram bot

### 📊 NFT & Subscriptions

- **NFT Display**: Shows owned NFTs with metadata and images
- **Dynamic Subscriptions**: Access features based on NFT ownership
- **Multi-NFT Support**: Handle multiple NFTs with different scripts
- **Cache System**: 30-day NFT ownership cache to reduce blockchain queries

---

## 🏗️ Architecture

### Technology Stack

```
┌────────────────────────────────────────────────────────┐
│                    Electron 30.0.1                      │
│          (Main Process + Renderer Process)              │
└────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────┐        ┌──────────┐       ┌──────────┐
  │  React   │        │Puppeteer │       │  Express │
  │   UI     │        │ Scripts  │       │ Callback │
  │TypeScript│        │ Browser  │       │  Server  │
  └──────────┘        └──────────┘       └──────────┘
        │                   │                   │
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Backend Server   │
                  │  (localhost:3000)│
                  └──────────────────┘
```

### Core Technologies

- **Electron 30.0.1** - Desktop application framework
- **React 18.2.0** - UI library with hooks and context
- **TypeScript 5.2** - Type-safe development
- **Vite 5.1.6** - Fast build tool and dev server
- **Puppeteer 24.22** - Browser automation library
- **Puppeteer-Extra** - Enhanced Puppeteer with stealth plugins
- **Express 4.18** - Lightweight server for receiving backend callbacks
- **Crypto-JS 4.2.0** - Client-side encryption/decryption

### Architecture Components

#### Main Process ([`electron/main.ts`](electron/main.ts))
- Window management and lifecycle
- IPC (Inter-Process Communication) handlers
- Wallet authentication flow
- Callback server for backend communication
- Script execution orchestration
- System info collection via Node.js APIs

#### Renderer Process ([`src/App.tsx`](src/App.tsx))
- React UI components
- State management
- Device fingerprint collection
- Server API communication
- User interactions

#### Services Layer
- [`deviceFingerprint.ts`](src/services/deviceFingerprint.ts) - Hardware fingerprinting
- [`serverApiService.ts`](src/services/serverApiService.ts) - Backend communication
- [`profileStorage.ts`](src/services/profileStorage.ts) - Profile management
- [`walletService.ts`](src/services/walletService.ts) - MetaMask integration
- [`telegramService.ts`](src/services/telegramService.ts) - Telegram bot integration
- [`timerService.ts`](src/services/timerService.ts) - Connection monitoring

---

## 🔐 Security Features

### Device Fingerprinting

The application collects comprehensive hardware and software characteristics to create a unique device fingerprint:

**Hardware Data:**
```typescript
{
  cpu: {
    model: "Intel Core i7-9750H",       // Real CPU model from OS
    cores: 12,                          // Physical + logical cores
    architecture: "x64"                 // CPU architecture
  },
  gpu: {
    renderer: "ANGLE (NVIDIA GeForce)", // GPU renderer
    vendor: "Google Inc.",              // GPU vendor
    memory: 4096                        // VRAM in MB
  },
  memory: {
    total: 17179869184                  // Total RAM in bytes
  },
  os: {
    platform: "win32",                  // Operating system
    version: "10.0.19045",              // OS version
    architecture: "x64"                 // OS architecture
  }
}
```

**Software Data:**
```typescript
{
  browser: {
    userAgent: "...",                   // Browser user agent
    languages: ["en-US", "en"],         // Preferred languages
    webgl: "...",                       // WebGL fingerprint
    canvas: "..."                       // Canvas fingerprint
  },
  network: {
    timezone: "America/New_York",       // System timezone
    timezoneOffset: -240,               // UTC offset
    clientIPv4: "192.168.1.100"         // Real local IP
  }
}
```

### Encryption System

Scripts are encrypted on the server and decrypted on the client using device-specific keys:

```typescript
// Key generation (same algorithm as backend)
function generateDeviceKey(cpuModel: string, ipAddress: string): Buffer {
  const combinedData = `${cpuModel}:${ipAddress}`;
  return crypto.createHash('sha256')
    .update(combinedData)
    .digest()
    .subarray(0, 32); // 256-bit key
}

// Decryption process
const deviceKey = generateDeviceKey(cpuModel, realIPv4);
const decryptedScript = decryptData(encryptedData, deviceKey);
// Script is now ready to execute in memory
```

**Why This Works:**
- Device key is derived from hardware that doesn't change frequently
- Scripts can only be decrypted on authorized devices
- No keys are stored on disk or transmitted over network
- Each encryption uses a random IV for added security

### Anti-Tampering

- **DevTools Disabled in Production**: Prevents code inspection
- **Context Isolation**: Renderer process cannot directly access Node.js
- **Sandbox Mode**: Limits renderer process capabilities
- **No eval()**: Scripts executed through controlled Puppeteer environment
- **ASAR Packaging**: Application files bundled and harder to modify

---

## 🔄 Application Flow

### Complete User Journey

```
1. Application Launch
   ├─ Create Electron Window
   ├─ Start Express Callback Server (port 3001)
   ├─ Initialize UI (React)
   └─ Ready for user interaction

2. Wallet Connection
   ├─ User clicks "Connect Wallet"
   ├─ Open system browser with MetaMask auth page
   ├─ User approves in MetaMask
   ├─ Wallet address sent back to app via local HTTP callback
   └─ Store wallet address in session

3. Device Registration
   ├─ Collect device fingerprint:
   │  ├─ CPU model/cores/architecture (from Node.js)
   │  ├─ GPU renderer/vendor (from WebGL)
   │  ├─ Total memory (from Node.js)
   │  ├─ OS platform/version (from Node.js)
   │  ├─ WebGL fingerprint
   │  ├─ Canvas fingerprint
   │  └─ Real IPv4 address (from WebRTC)
   ├─ Send to backend: POST /api/auth/fingerprint
   ├─ Receive: deviceHash, sessionToken, userId
   └─ Store session data

4. NFT Verification (Backend)
   ├─ Backend checks NFT ownership on blockchain
   ├─ Calculate subscription tier
   ├─ Determine accessible scripts
   └─ Send encrypted scripts to client

5. Script Delivery
   ├─ Backend sends HTTP POST to localhost:3001/api/server-callback
   ├─ Payload includes:
   │  ├─ Encrypted script data (AES-256-CBC)
   │  ├─ HMAC verification hash
   │  └─ Nonce (replay protection)
   ├─ Client decrypts using device key
   ├─ Verify HMAC hash
   └─ Display scripts in UI

6. Profile Management
   ├─ User creates browser profiles:
   │  ├─ Name and description
   │  ├─ Proxy settings (IP:Port, Login:Password)
   │  ├─ Cookies (exported from browser)
   │  └─ Optional: Telegram bot for notifications
   ├─ Profiles stored in localStorage
   └─ Max profiles limited by subscription tier

7. Script Execution
   ├─ User selects profile and script
   ├─ Configure script parameters:
   │  ├─ Target URL (or use Search Query Builder)
   │  ├─ Regex patterns
   │  ├─ Comment templates
   │  ├─ Headless/visible mode
   │  └─ Custom data (JSON)
   ├─ Click "Execute Script"
   ├─ Main process:
   │  ├─ Create temporary .js file in /tmp
   │  ├─ Inject Puppeteer wrapper code
   │  ├─ Inject profile configuration
   │  ├─ Inject user script from backend
   │  ├─ Spawn Node.js child process
   │  └─ Monitor script output
   └─ Script runs in separate process

8. Script Execution Lifecycle
   ├─ Puppeteer browser launches with profile settings
   ├─ Load proxy (if configured)
   ├─ Set cookies from profile
   ├─ Navigate to target URL
   ├─ Execute automation logic
   ├─ Send Telegram notification (if configured)
   ├─ Browser closes when done
   └─ Temporary script file deleted after 10 seconds

9. Real-Time Monitoring
   ├─ Backend pings client every 30 seconds
   ├─ Client resets timeout timer on each ping
   ├─ If no ping for 40 seconds → close application
   ├─ UI shows:
   │  ├─ Ping counter (nonce)
   │  ├─ Time since last ping
   │  ├─ Active scripts count
   │  └─ Connection status
   └─ Logs all events to console
```

---

## 🤖 Script Execution System

### Puppeteer Integration

Scripts execute in isolated Node.js child processes with full Puppeteer capabilities:

```javascript
// Generated script wrapper (main.ts lines 956-1256)
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// Profile data injected from UI
const profile = {
  id: "profile-123",
  name: "My Profile",
  proxy: { ip: "1.2.3.4", port: 8080, login: "user", password: "pass" },
  cookies: [/* browser cookies */],
  viewport: { width: 1920, height: 1080 }
};

// Telegram configuration
const telegramConfig = {
  connected: true,
  httpApi: "bot123456:ABC-DEF...",
  chatId: "987654321"
};

// Launch browser with profile
async function launchBrowserWithProfile() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${profile.proxy.ip}:${profile.proxy.port}`,
      '--start-maximized'
    ],
    userDataDir: `./puppeteer_profile_${profile.id}`
  });

  const page = await browser.newPage();

  // Authenticate proxy
  await page.authenticate({
    username: profile.proxy.login,
    password: profile.proxy.password
  });

  // Set cookies
  await page.setCookie(...profile.cookies);

  // Set viewport
  await page.setViewport(profile.viewport);

  return { browser, page };
}

// Execute user script from backend
const { browser, page } = await launchBrowserWithProfile();
await executeScript({ page, browser, config, profile, telegram });
```

### Script Features

Scripts receive a comprehensive context object:

```typescript
interface ScriptContext {
  page: Page;                         // Puppeteer page instance
  browser: Browser;                   // Puppeteer browser instance
  config: {
    navigationUrl: string;            // Target URL
    regexPattern: string;             // Search pattern
    commentTemplates: string[];       // Comment templates
    regexTags: string[];              // Regex tags
    saveImagesFolder: string;         // Folder for screenshots
    enableScreenshots: boolean;       // Screenshot flag
    delayBetweenActions: number;      // Action delay (ms)
    ...customData                     // User-provided JSON data
  };
  profile: UserProfile;               // Profile data
  telegram: {
    sendNotification: (msg: string) => Promise<boolean>;
    isConfigured: boolean;
    config: TelegramConfig;
  };
}
```

### Example Script

```javascript
// Backend script example
async function executeScript(context) {
  const { page, config, telegram } = context;

  // Navigate to target
  await page.goto(config.navigationUrl);

  // Send startup notification
  await telegram.sendNotification(
    '🚀 <b>Script Started</b>\n\n' +
    `📋 Profile: ${context.profile.name}\n` +
    `⏰ Time: ${new Date().toLocaleString()}`
  );

  // Find elements matching regex
  const elements = await page.$$eval('div.tweet', (divs, pattern) => {
    const regex = new RegExp(pattern, 'i');
    return divs.filter(div => regex.test(div.textContent));
  }, config.regexPattern);

  // Process each element
  for (const el of elements) {
    await el.click();
    await page.waitForTimeout(config.delayBetweenActions);

    // Post comment using template
    const comment = config.commentTemplates[
      Math.floor(Math.random() * config.commentTemplates.length)
    ];
    await page.type('textarea', comment);
    await page.click('button[data-testid="tweetButton"]');

    // Notify via Telegram
    await telegram.sendNotification(`✅ Commented on tweet`);
  }

  // Send completion notification
  await telegram.sendNotification(
    '✅ <b>Script Completed</b>\n\n' +
    `📊 Processed: ${elements.length} tweets`
  );

  return { success: true, processed: elements.length };
}

// Export for wrapper
module.exports = executeScript;
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (includes npm)
- **Git** for version control
- **Windows/macOS/Linux** operating system
- **MetaMask** browser extension (for wallet connection)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd react-electron
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment** (optional)
   - Check [`vite.config.ts`](vite.config.ts) for build settings
   - Verify backend URL in [`src/services/serverApiService.ts`](src/services/serverApiService.ts) (default: `http://localhost:3000`)

4. **Start development server**
```bash
npm run dev
```

5. **Start Electron app (in another terminal)**
```bash
npm run dev:electron
```

### Development Workflow

```bash
# Run development server
npm run dev                  # Start Vite dev server
npm run dev:electron         # Start Electron in dev mode

# Build for production
npm run build                # Compile TypeScript + build React app
npm run build:electron       # Build Electron executable

# Platform-specific builds
npm run build:win            # Build Windows installer
npm run build:mac            # Build macOS DMG
npm run build:linux          # Build Linux AppImage

# Other commands
npm run lint                 # Run ESLint
npm run preview              # Preview production build
```

---

## 📁 Project Structure

```
react-electron/
├── electron/                       # Electron main process
│   ├── main.ts                     # Main process entry point
│   ├── preload.ts                  # Preload script for IPC
│   └── logger.ts                   # Logging utility
│
├── src/                            # React application
│   ├── components/                 # React components
│   │   ├── WalletConnection/       # Wallet connection UI
│   │   ├── NFTDisplay/             # NFT + script display
│   │   ├── ScriptManager/          # Script management
│   │   ├── ProfileManager/         # Profile CRUD operations
│   │   ├── SearchQueryBuilder/     # X.com search query builder
│   │   ├── ThemeToggle/            # Dark/light theme switcher
│   │   └── LanguageSwitcher/       # Language selection
│   │
│   ├── services/                   # Business logic services
│   │   ├── deviceFingerprint.ts    # Hardware fingerprinting
│   │   ├── serverApiService.ts     # Backend communication
│   │   ├── profileStorage.ts       # Profile localStorage
│   │   ├── walletService.ts        # MetaMask integration
│   │   ├── telegramService.ts      # Telegram bot API
│   │   └── timerService.ts         # Ping timeout monitoring
│   │
│   ├── contexts/                   # React contexts
│   │   ├── ThemeContext.tsx        # Theme state management
│   │   └── LanguageContext.tsx     # i18n management
│   │
│   ├── utils/                      # Utility functions
│   │   ├── encryption.ts           # AES encryption/decryption
│   │   └── logger.ts               # Client-side logging
│   │
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts                # Application types
│   │
│   ├── assets/                     # Static assets
│   │   └── logo.png                # Application logo
│   │
│   ├── App.tsx                     # Main React component
│   ├── App.css                     # Application styles
│   ├── main.tsx                    # React entry point
│   └── electron.d.ts               # Electron API types
│
├── build/                          # Build resources
│   ├── icon.ico                    # Windows icon
│   ├── icon.icns                   # macOS icon
│   └── icon.png                    # Linux icon
│
├── dist/                           # Compiled React app (generated)
├── dist-electron/                  # Compiled Electron files (generated)
├── release/                        # Packaged installers (generated)
│
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript config (renderer)
├── tsconfig.electron.json          # TypeScript config (main)
├── vite.config.ts                  # Vite configuration
└── README.md                       # This file
```

### Key Files Explained

| File | Purpose |
|------|---------|
| [`electron/main.ts`](electron/main.ts) | Electron main process - window management, IPC, script execution |
| [`electron/preload.ts`](electron/preload.ts) | Bridge between main and renderer processes |
| [`src/App.tsx`](src/App.tsx) | Main React component with application state |
| [`src/services/deviceFingerprint.ts`](src/services/deviceFingerprint.ts) | Collects hardware/software characteristics |
| [`src/services/serverApiService.ts`](src/services/serverApiService.ts) | Communicates with backend server |
| [`src/services/profileStorage.ts`](src/services/profileStorage.ts) | Manages user profiles in localStorage |
| [`src/utils/encryption.ts`](src/utils/encryption.ts) | Decrypts scripts from backend |
| [`package.json`](package.json) | Project dependencies and build configuration |

---

## 🎨 User Interface

### Main Application Screens

#### 1. Wallet Connection
```
┌─────────────────────────────────────────┐
│  🔗 Connect Wallet                      │
│                                         │
│  Click to connect your MetaMask wallet  │
│  to access NFT-based features          │
│                                         │
│  [ Connect Wallet ]                     │
└─────────────────────────────────────────┘
```

#### 2. NFT Display (After Connection)
```
┌─────────────────────────────────────────┐
│  🖼️ Your NFT                            │
│  ┌──────┐                               │
│  │ NFT  │  Name: Legion NFT #123        │
│  │Image │  Network: Sepolia Testnet     │
│  └──────┘  Status: Verified ✓           │
│                                         │
│  📊 Subscription                        │
│  • Level: NFT Holder                    │
│  • Max Profiles: 5                      │
│  • Scripts Available: 3                 │
└─────────────────────────────────────────┘
```

#### 3. Profile Manager
```
┌─────────────────────────────────────────┐
│  👤 Profiles (2/5)                      │
│  ┌─────────────────────────────────┐   │
│  │ Profile 1                       │   │
│  │ Proxy: 1.2.3.4:8080            │   │
│  │ Cookies: 12 loaded             │   │
│  │ [Edit] [Delete] [Run Script]   │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Profile 2                       │   │
│  │ Proxy: 5.6.7.8:3128            │   │
│  │ Telegram: Connected ✓          │   │
│  │ [Edit] [Delete] [Run Script]   │   │
│  └─────────────────────────────────┘   │
│  [ + Add New Profile ]                 │
└─────────────────────────────────────────┘
```

#### 4. Script Execution Panel
```
┌─────────────────────────────────────────┐
│  🚀 Execute Script                      │
│                                         │
│  Target URL:                            │
│  [https://x.com/search?q=...]          │
│  [ 🔍 Build Search Query ]             │
│                                         │
│  Regex Pattern:                         │
│  [\b(crypto|web3|defi)\b]              │
│                                         │
│  Comment Templates:                     │
│  • Great project! 🚀                   │
│  • Looking forward to this!            │
│                                         │
│  Mode: [ ] Headless  [✓] Visible       │
│                                         │
│  [ Execute Script ]                     │
└─────────────────────────────────────────┘
```

#### 5. Search Query Builder
```
┌─────────────────────────────────────────┐
│  🔍 X.com Search Query Builder          │
│                                         │
│  Must include:                          │
│  [ crypto ] [ web3 ] [ + Add ]         │
│                                         │
│  At least one of:                       │
│  [ nft ] [ defi ] [ + Add ]            │
│                                         │
│  Exclude:                               │
│  [ spam ] [ scam ] [ + Add ]           │
│                                         │
│  Language: [English ▼]                  │
│                                         │
│  Preview:                               │
│  crypto OR web3 (nft OR defi) -spam    │
│  -scam lang:en                         │
│                                         │
│  [ Use in Script ] [ Cancel ]          │
└─────────────────────────────────────────┘
```

### Components Overview

| Component | File | Description |
|-----------|------|-------------|
| **WalletConnection** | [`src/components/WalletConnection/`](src/components/WalletConnection/) | MetaMask wallet connection UI |
| **NFTDisplay** | [`src/components/NFTDisplay/`](src/components/NFTDisplay/) | Shows NFT image, metadata, and script controls |
| **ProfileManager** | [`src/components/ProfileManager/`](src/components/ProfileManager/) | CRUD operations for browser profiles |
| **ScriptManager** | [`src/components/ScriptManager/`](src/components/ScriptManager/) | Script execution controls and settings |
| **SearchQueryBuilder** | [`src/components/SearchQueryBuilder/`](src/components/SearchQueryBuilder/) | Visual X.com search query builder |
| **ThemeToggle** | [`src/components/ThemeToggle/`](src/components/ThemeToggle/) | Dark/light theme switcher |
| **LanguageSwitcher** | [`src/components/LanguageSwitcher/`](src/components/LanguageSwitcher/) | English/Russian language selection |

---

## 👤 Profile Management

### Profile Structure

```typescript
interface UserProfile {
  id: string;                         // Unique profile ID
  name: string;                       // Display name
  description?: string;               // Optional description
  proxy: {
    ip: string;                       // Proxy server IP
    port: number;                     // Proxy server port
    login: string;                    // Proxy username
    password: string;                 // Proxy password
  };
  cookies: Cookie[];                  // Browser cookies
  viewport?: {
    width: number;                    // Browser width
    height: number;                   // Browser height
  };
  telegram?: {
    connected: boolean;               // Bot connected flag
    httpApi: string;                  // Bot API token
    chatId: string;                   // Telegram chat ID
    botName?: string;                 // Bot display name
  };
  navigationUrl?: string;             // Default target URL
  isActive: boolean;                  // Profile enabled flag
  createdAt: number;                  // Creation timestamp
  updatedAt: number;                  // Last update timestamp
}
```

### Profile Storage

Profiles are stored in browser's localStorage for persistence:

```typescript
// Save profile
const profile = await profileStorage.saveProfile({
  name: "My Profile",
  description: "Profile for automation",
  proxy: {
    ip: "1.2.3.4",
    port: 8080,
    login: "user",
    password: "pass"
  },
  cookies: [/* exported cookies */]
});

// Load all profiles
const profiles = await profileStorage.getProfiles();

// Update profile
await profileStorage.updateProfile(profile.id, {
  name: "Updated Name"
});

// Delete profile
await profileStorage.deleteProfile(profile.id);
```

### Cookie Import

Users can export cookies from their browser and import them into profiles:

1. Install cookie export extension (e.g., "Cookie Editor")
2. Navigate to target website and log in
3. Export cookies as JSON
4. Paste JSON into profile's cookie field
5. Cookies automatically set when Puppeteer browser launches

---

## 📱 Telegram Integration

### Setting Up Telegram Bot

1. **Create Bot**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` command
   - Follow instructions to create bot
   - Save the bot token (e.g., `bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

2. **Get Chat ID**
   - Send any message to your bot (e.g., `/start`)
   - Click "Get Chat ID" in the app
   - Chat ID will be automatically retrieved

3. **Configure in Profile**
   - Edit profile
   - Click "Add Telegram Bot"
   - Paste bot token: `bot123456:ABC-DEF...`
   - Click "Get Chat ID"
   - Click "Test Connection"
   - Save profile

### Notification Features

Scripts can send notifications at any point:

```javascript
// In your script
await telegram.sendNotification(
  '🚀 <b>Script Started</b>\n\n' +
  '📋 Profile: My Profile\n' +
  '⏰ Time: 14:30:00'
);

// HTML formatting supported
await telegram.sendNotification(
  '✅ <b>Success!</b>\n' +
  '📊 Processed: <code>25 tweets</code>\n' +
  '⏱️ Duration: 5 minutes'
);

// Error notifications
await telegram.sendNotification(
  '❌ <b>Error</b>\n' +
  '⚠️ Failed to load page\n' +
  '🔧 Check proxy settings'
);
```

---

## 📦 Build & Distribution

### Building Executables

```bash
# Windows (NSIS installer)
npm run build:win
# Output: release/{version}/Twitter-Automation-Platform-Windows-{version}-Setup.exe

# macOS (DMG image)
npm run build:mac
# Output: release/{version}/Twitter-Automation-Platform-Mac-{version}-{arch}.dmg

# Linux (AppImage)
npm run build:linux
# Output: release/{version}/Twitter-Automation-Platform-Linux-{version}.AppImage
```

### Build Configuration

Build settings are in [`package.json`](package.json) under `build` section:

```json
{
  "build": {
    "appId": "com.local.twitterautomation",
    "productName": "Twitter Automation Platform",
    "asar": true,
    "directories": {
      "output": "release/${version}"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "node_modules/puppeteer/**/*",
      "node_modules/puppeteer-extra/**/*",
      "!node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": "AppImage",
      "icon": "build/icon.png",
      "category": "Office"
    }
  }
}
```

### Distribution Notes

- **Code Signing**: Disabled by default (`forceCodeSigning: false`)
- **Auto-Updates**: Not configured (`publish: null`)
- **Installer Type**: One-click install disabled for user choice
- **ASAR Packaging**: Enabled for file protection
- **Puppeteer**: Included in bundle for offline execution

---

## ⚙️ Configuration

### Application Settings

#### Backend URL
Default: `http://localhost:3000`

To change, edit [`src/services/serverApiService.ts`](src/services/serverApiService.ts):
```typescript
private baseUrl: string = "http://localhost:3000"; // Change this
```

#### Callback Server Port
Default: `3001`

To change, edit [`electron/main.ts`](electron/main.ts):
```typescript
private port: number = 3001; // Change this
```

#### Ping Timeout
Default: 40 seconds (client closes if no ping received)

To change, edit [`src/services/timerService.ts`](src/services/timerService.ts):
```typescript
private readonly PING_TIMEOUT = 40000; // milliseconds
```

### Environment Variables

Create `.env` file (optional):
```bash
# Backend server URL
VITE_BACKEND_URL=http://localhost:3000

# Enable debug logging
VITE_DEBUG=true

# Callback server port
VITE_CALLBACK_PORT=3001
```

Access in code:
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
```

---

## 🛠️ Development Tips

### Debugging

**Main Process** (Electron)
```bash
# Start with Chrome DevTools
npm run dev:electron
# Then: View → Toggle Developer Tools
```

**Renderer Process** (React)
```bash
# Vite dev server has hot reload
npm run dev
# Browser DevTools available in Electron window
```

**IPC Communication**
```typescript
// In renderer (React)
const result = await window.electronAPI.executeScript({
  script: scriptData,
  settings: settings
});

// In main process
ipcMain.handle('execute-script', async (_event, params) => {
  // Handle request
  return { success: true, result: '...' };
});
```

### Common Issues

**Issue**: Puppeteer fails to launch
```bash
# Install dependencies (Linux)
sudo apt-get install -y \
  libgbm-dev \
  libxss1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libgtk-3-0
```

**Issue**: Scripts not decrypting
- Check that CPU model and IP match between device and server
- Verify encryption key is the same on both sides
- Inspect console logs for decryption errors

**Issue**: Profiles not saving
- Check browser localStorage is enabled
- Verify profile data is valid JSON
- Clear localStorage and recreate profiles

---

## 📝 License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

---

## 🤝 Support

For issues or questions:
- Check console logs (F12 in app)
- Review error messages in Telegram (if configured)
- Contact the development team

---

## 🎉 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [React](https://reactjs.org/) - UI library
- [Puppeteer](https://pptr.dev/) - Browser automation
- [Vite](https://vitejs.dev/) - Next generation build tool
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

---

**Last Updated:** October 2024
**Version:** 1.0.0
