# EchoX - Desktop Automation Platform

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

EchoX provides a secure environment for executing automation scripts delivered from a private backend server. Key capabilities include:

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
│   │   ├── SearchQueryBuilder/     # Search query builder
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
│   ├── App.tsx                     # Main React component
│   └── main.tsx                    # React entry point
│
├── build/                          # Build resources
│   ├── icon.ico                    # Windows icon
│   ├── icon.icns                   # macOS icon
│   └── icon.png                    # Linux icon
│
├── .github/                        # GitHub Actions workflows
│   └── workflows/
│       └── build-mac.yml           # macOS build automation
│
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite configuration
└── README.md                       # This file
```

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
  isActive: boolean;                  // Profile enabled flag
  createdAt: number;                  // Creation timestamp
  updatedAt: number;                  // Last update timestamp
}
```

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
   - Paste bot token
   - Click "Get Chat ID"
   - Click "Test Connection"
   - Save profile

---

## 📦 Build & Distribution

### Building Executables

```bash
# Windows (NSIS installer)
npm run build:win
# Output: release/{version}/EchoX-Windows-{version}-Setup.exe

# macOS (DMG image)
npm run build:mac
# Output: release/{version}/EchoX-Mac-{version}-{arch}.dmg

# Linux (AppImage)
npm run build:linux
# Output: release/{version}/EchoX-Linux-{version}.AppImage
```

### GitHub Actions (Automated macOS Builds)

EchoX includes automated macOS builds via GitHub Actions:

1. Navigate to: `https://github.com/your-repo/actions`
2. Select "Build EchoX for macOS" workflow
3. Click "Run workflow"
4. Wait 5-7 minutes for build completion
5. Download DMG from Artifacts section

See [.github/workflows/README.md](.github/workflows/README.md) for detailed instructions.

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

**Product Name:** EchoX
**Version:** 1.0.0
**Last Updated:** October 2024
