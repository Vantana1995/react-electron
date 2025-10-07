# React-Electron Frontend Repository Structure

## 📁 Complete File Tree

```
react-electron/
├── electron/                           # Electron Main Process
│   ├── main.ts                        # Main process entry, IPC handlers, script execution
│   └── preload.ts                     # Preload script, contextBridge API
├── src/                               # React Application Source
│   ├── components/                    # React Components
│   │   ├── ActivityLog/              # Activity logging component
│   │   │   ├── ActivityLog.tsx
│   │   │   └── ActivityLog.css
│   │   ├── NFTDisplay/               # NFT display and script configuration
│   │   │   ├── NFTDisplay.tsx
│   │   │   └── NFTDisplay.css
│   │   ├── ProfileManager/           # Profile management system
│   │   │   ├── ProfileManager.tsx    # Main profile manager
│   │   │   ├── ProfileCard.tsx       # Individual profile card
│   │   │   ├── AddProfileModal.tsx   # Add/edit profile modal
│   │   │   ├── AddTelegramBotModal.tsx # Telegram bot setup
│   │   │   ├── ProfileManager.css
│   │   │   ├── ProfileCard.css
│   │   │   ├── AddProfileModal.css
│   │   │   ├── TelegramModal.css
│   │   │   └── index.ts
│   │   ├── ScriptManager/            # Script execution manager
│   │   │   ├── ScriptManager.tsx
│   │   │   └── ScriptManager.css
│   │   ├── SearchQueryBuilder/       # Twitter search query builder
│   │   │   ├── SearchQueryBuilder.tsx
│   │   │   ├── QueryPreview.tsx
│   │   │   ├── ExampleQueries.tsx
│   │   │   ├── SearchOperators.ts
│   │   │   ├── components/
│   │   │   │   ├── TagInput.tsx
│   │   │   │   ├── TagInput.css
│   │   │   │   └── OrGroupsInput.tsx
│   │   │   ├── utils/
│   │   │   │   └── queryBuilder.ts
│   │   │   ├── SearchQueryBuilder.css
│   │   │   ├── QueryPreview.css
│   │   │   ├── ExampleQueries.css
│   │   │   └── index.ts
│   │   ├── ThemeToggle/              # Theme switcher
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── ThemeToggle.css
│   │   │   └── index.ts
│   │   └── WalletConnection/         # Wallet connection UI
│   │       ├── WalletConnection.tsx
│   │       └── WalletConnection.css
│   ├── contexts/                     # React Contexts
│   │   └── ThemeContext.tsx          # Theme state management
│   ├── services/                     # Business Logic Services
│   │   ├── deviceFingerprint.ts      # Device fingerprinting
│   │   ├── profileStorage.ts         # Profile CRUD operations
│   │   ├── serverApiService.ts       # Backend API communication
│   │   ├── telegramService.ts        # Telegram bot API
│   │   ├── timerService.ts           # Ping timeout management
│   │   └── walletService.ts          # Wallet authentication
│   ├── types/                        # TypeScript Definitions
│   │   └── index.ts                  # All type definitions
│   ├── utils/                        # Utility Functions
│   │   └── encryption.ts             # Encryption utilities
│   ├── styles/                       # Global Styles
│   │   └── themes.css                # Theme definitions
│   ├── App.tsx                       # Root React component
│   ├── App.css                       # Root component styles
│   ├── main.tsx                      # React entry point
│   ├── index.css                     # Global CSS
│   ├── electron.d.ts                 # Electron API type declarations
│   └── vite-env.d.ts                 # Vite type declarations
├── index.html                        # HTML entry point
├── package.json                      # NPM dependencies
├── vite.config.ts                    # Vite bundler config
├── tsconfig.json                     # TypeScript config (React)
├── tsconfig.electron.json            # TypeScript config (Electron)
├── tsconfig.node.json                # TypeScript config (Node)
└── electron-builder.json5            # Electron packager config
```

---

## 📦 Module Overview

### **Electron Main Process** (`electron/`)
- Manages application lifecycle, windows, and IPC communication
- Handles script execution via child processes
- Manages HTTP servers for wallet auth and backend callbacks

### **React Application** (`src/`)
- **Components**: UI components for wallet, NFT, profiles, scripts
- **Services**: Business logic for API calls, storage, timers
- **Contexts**: Global state management (theme)
- **Types**: TypeScript type definitions
- **Utils**: Encryption, fingerprinting helpers

---

## 📄 Detailed File Analysis

---

### **Electron Process Files**

#### `electron/main.ts`
**Purpose**: Electron main process - window management, IPC handlers, Puppeteer script execution
**Type**: Main Process Entry Point

**Key Classes**:

##### `class AuthFlow`
Manages wallet authentication flow with browser-based MetaMask connection.

**Methods**:
- `startAuth(): Promise<{success, sessionToken?, authUrl?, error?}>` - Opens browser for MetaMask connection
- `startLocalServer(): Promise<void>` - Starts HTTP server on random port for auth callback
- `generateSessionToken(): string` - Generates UUID session token
- `isValidEthereumAddress(address: string): boolean` - Validates Ethereum address format
- `getWalletAddress(sessionToken: string): string | undefined` - Retrieves wallet address for session
- `isSessionConnected(sessionToken: string): boolean` - Checks if session is connected
- `cleanup(): void` - Closes server and clears sessions

**Endpoints**:
- `GET /auth?session={token}` - Serves MetaMask connection page
- `POST /wallet-connected` - Receives wallet address from browser

---

##### `class CallbackServer`
HTTP server receiving callbacks from backend (pings, NFTs, scripts).

**Methods**:
- `startCallbackServer(): Promise<void>` - Starts server on port 3001
- `stopCallbackServer(): void` - Stops server
- `getPort(): number` - Returns server port

**Endpoints**:
- `POST /api/server-callback` - Receives backend callbacks (pings, NFT data, scripts)
- `POST /api/set-session` - Updates session data from frontend
- `GET /api/callback-status` - Check for new callbacks
- `POST /api/clear-callback` - Clear callback flag
- `GET /api/counter-status` - Check for counter updates
- `POST /api/clear-counter` - Clear counter flag

**Callback Processing**:
- Decrypts encrypted data using device key (CPU model + IPv4)
- Forwards NFT data to renderer via `nft-received` event
- Forwards script data to renderer via `script-received` event
- Updates ping counter via `ping-counter-update` event

---

**Global Variables**:
- `win: BrowserWindow | null` - Main application window
- `authFlow: AuthFlow | null` - Authentication flow manager
- `callbackServer: CallbackServer | null` - Callback server instance
- `activeScripts: Map<string, ActiveScript>` - Map of running scripts
- `globalDeviceData: any` - Cached device fingerprint data

**IPC Handlers** (all async):

**System & Device**:
- `get-system-info` → Returns CPU model, cores, memory, OS info from Node.js

**Wallet Authentication**:
- `start-wallet-auth` → Starts wallet auth flow, opens browser
- `get-wallet-status` → Returns connection status for session token
- `disconnect-wallet` → Disconnects wallet session

**Callback Server**:
- `get-callback-server-status` → Returns server status and port
- `start-callback-server` → Starts callback server
- `stop-callback-server` → Stops callback server

**Script Execution**:
- `execute-script` → Creates Puppeteer script wrapper, spawns child process
- `get-active-scripts` → Returns list of running scripts
- `stop-script` → Kills script process (Windows: taskkill, Unix: SIGTERM)

**File System**:
- `select-folder` → Opens folder picker dialog
- `clear-profile-history` → Deletes `processed_tweets_{profileId}.json` file

**Telegram**:
- `telegram-test-connection` → Tests bot token, fetches bot info and chat ID
- `telegram-send-message` → Sends message via Telegram bot API
- `telegram-get-chat-id` → Extracts chat ID from bot updates

**Application**:
- `close-app` → Closes all windows and quits application
- `set-device-data` → Stores device fingerprint in memory

---

**Key Functions**:

##### `createWindow()`
Creates main BrowserWindow with security settings:
- nodeIntegration: false
- contextIsolation: true
- webSecurity: true
- sandbox: false (for preload script)
- devTools: disabled in production

##### `executePuppeteerScript(scriptPath, scriptId, scriptName, profileId): Promise<string>`
Executes Puppeteer script in child process:
1. Spawns Node.js child process with script path
2. Sets up NODE_PATH for puppeteer dependencies
3. Enables IPC channel for browser-closed events
4. Streams stdout/stderr to renderer via `script-output` events
5. Sends `script-finished` on completion
6. Tracks script in `activeScripts` map
7. Auto-resolves after 5 seconds (scripts run long-term)

**Script Wrapper Structure** (generated dynamically):
```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Injected variables
const profile = {...};        // User profile (cookies, proxy, telegram)
const config = {...};          // Execution settings (regex, templates, delay)
const telegramConfig = {...};  // Telegram bot config

// Helper function
async function sendTelegramNotification(message) { ... }

// Browser launcher
async function launchBrowserWithProfile() {
  // Launch with cookies, proxy, stealth plugins
  // Returns {browser, page}
}

// Main execution
async function main() {
  const {browser, page} = await launchBrowserWithProfile();

  // Backend script code injected here
  ${scriptContent}

  // Execute backend script
  if (typeof executeScript === 'function') {
    await executeScript({page, browser, config, profile, telegram});
  }

  await browser.close();
}

main().catch(console.error);
```

**Dependencies**: None (entry point)
**Used By**: Electron runtime

---

#### `electron/preload.ts`
**Purpose**: Preload script - exposes secure IPC APIs to renderer via contextBridge
**Type**: Preload Script

**Exports** (via `contextBridge.exposeInMainWorld("electronAPI", ...)`):

**Device & System**:
- `getSystemInfo(): Promise<SystemInfo>` - Get CPU, memory, OS from Node.js
- `setDeviceData(deviceData): Promise<{success}>` - Store device fingerprint

**Wallet**:
- `startWalletAuth(): Promise<AuthResult>` - Start wallet connection flow
- `getWalletStatus(sessionToken): Promise<WalletConnectionStatus>`
- `disconnectWallet(sessionToken): Promise<{success}>`

**Scripts**:
- `executeScript(params): Promise<ScriptExecutionResult>` - Execute Puppeteer script
- `getActiveScripts(): Promise<{success, scripts}>` - List running scripts
- `stopScript(scriptId): Promise<{success}>` - Stop script by ID

**File System**:
- `selectFolder(): Promise<string | null>` - Open folder picker
- `clearProfileHistory(profileId, saveImagesFolder): Promise<{success, message}>`

**Telegram**:
- `testTelegramConnection(httpApi): Promise<{success, chatId?, botName?}>`
- `sendTelegramMessage(httpApi, chatId, text): Promise<{success}>`
- `getTelegramChatId(httpApi): Promise<{success, chatId?}>`

**Application**:
- `closeApp(): Promise<{success}>`

**Event Listeners** (all IPC events):
- `onWalletConnected(callback)` - Wallet connected
- `onAuthReady(callback)` - Auth system ready
- `onServerPingReceived(callback)` - Server ping received
- `onPingCounterUpdate(callback)` - Ping counter update
- `onNFTReceived(callback)` - NFT data received
- `onScriptReceived(callback)` - Script data received
- `onScriptOutput(callback)` - Script stdout/stderr
- `onScriptFinished(callback)` - Script completed (exitCode, success, output)
- `onScriptError(callback)` - Script error
- `onScriptStopped(callback)` - Script stopped manually
- `removeAllListeners(channel)` - Remove all listeners for channel

**Dependencies**: electron
**Used By**: All renderer code needing Electron APIs

---

### **React Application**

#### Entry Point

##### `src/main.tsx`
**Purpose**: React application entry point
**Renders**: `<ThemeProvider><App /></ThemeProvider>`

**Dependencies**:
- `./App.tsx`
- `./contexts/ThemeContext`

**Used By**: Vite (entry point)

---

#### Main App Component

##### `src/App.tsx`
**Purpose**: Root component, orchestrates all state and components
**Type**: React Component

**State Management**:
```typescript
interface AppState {
  wallet: {
    status: WalletConnectionStatus;
    connecting: boolean;
  };
  system: {
    connected: boolean;
    status: 'initializing' | 'ready' | 'error' | 'disconnected';
    message: string;
    deviceHash?: string;
    nonce?: number;
    lastPing?: number;
  };
  logs: string[];
  nft: {
    data?: NFTData;
    visible: boolean;
    loading: boolean;
  };
  timer: {
    value: number;
    running: boolean;
    timeout: number;
  };
  script: {
    data?: ScriptData;
    available: boolean;
    executing?: boolean;
  };
  profiles: {
    profiles: UserProfile[];
    showAddModal: boolean;
    maxProfiles: number;
    runningScripts: string[]; // Array of proxy addresses (IP:PORT)
    selectedProfile?: UserProfile;
  };
}
```

**Additional State**:
- `isInitialized: boolean` - Prevents re-initialization
- `currentNFT: NFTData | undefined` - Current NFT data
- `currentScript: ScriptData | undefined` - Current script
- `nftScriptMapping: Map<string, ScriptData>` - NFT→Script associations
- `navigationUrl: string` - Search query URL
- `showSearchBuilder: boolean` - Show/hide search builder
- `mainPageScrollPosition: number` - Scroll position for navigation
- `buildingQueryForProfile: UserProfile | null` - Profile for query builder

**Key Functions**:

##### `initializeApp(walletAddress?): Promise<void>`
1. Collects device fingerprint (browser + Electron system info)
2. Gets real IPv4 via WebRTC (not localhost)
3. Adds IPv4 to deviceData and sends to main process
4. Connects to backend server with device data + wallet address
5. Updates system status to 'ready'

##### `setupServerCallbacks(): void`
Sets up IPC event listeners:
- `onServerPingReceived` → Reset timer service
- `onPingCounterUpdate` → Update nonce in state
- `onNFTReceived` → Set currentNFT, show NFT display, load profiles
- `onScriptReceived` → Set currentScript, enable script execution
- `onScriptFinished` → Remove from runningScripts by proxyAddress
- `onScriptError` → Remove from runningScripts by proxyAddress
- `onScriptStopped` → Remove from runningScripts by proxyAddress

Custom event listener:
- `script-started` → Add proxyAddress to runningScripts (max limit check)

##### `handleWalletConnected(status: WalletConnectionStatus): Promise<void>`
- Updates wallet state
- Triggers initializeApp() if not already initialized

##### `handleProfileCreate(profileData): Promise<void>`
- Calls profileStorage.saveProfile()
- Updates profiles state

##### `handleProfileUpdate(profile): Promise<void>`
- Calls profileStorage.updateProfile()
- Updates profiles in state

##### `handleProfileDelete(profileId): Promise<void>`
- Calls profileStorage.deleteProfile()
- Removes from profiles and runningScripts

##### `handleClearProfileHistory(profile): Promise<void>`
- Gets saveImagesFolder from localStorage (nft-display-state)
- Generates profileId as `{ip}_{port}`
- Calls electronAPI.clearProfileHistory()

**Effects**:
- Setup server callbacks on mount
- Load profiles from localStorage on mount
- Listen for custom 'script-started' events
- Cleanup IPC listeners on unmount
- Expose currentNFT/currentScript to window object

**Renders**:
- `<ThemeToggle />`
- `<WalletConnection />` (if not connected)
- `<NFTDisplay />` (if NFT received)
- `<ProfileManager />` (if NFT received)
- `<ScriptManager />` (if wallet connected)
- `<SearchQueryBuilder />` (in fullscreen mode)

**Dependencies**:
- `./types` - All interfaces
- `./services/deviceFingerprint`
- `./services/serverApiService`
- `./services/profileStorage`
- `./services/timerService`
- All component imports

**Used By**: main.tsx

---

### **Components**

#### `src/components/WalletConnection/WalletConnection.tsx`
**Purpose**: Wallet connection UI
**Type**: React Component

**Props**:
```typescript
interface WalletConnectionProps {
  onWalletConnected?: (status: WalletConnectionStatus) => void;
  onWalletDisconnected?: () => void;
}
```

**State**:
- `walletStatus: WalletConnectionStatus`
- `isConnecting: boolean`

**Key Functions**:
- `handleConnect()` → Calls walletService.connectWallet(), opens browser
- `handleDisconnect()` → Calls walletService.disconnectWallet()
- `formatAddress(address)` → Formats address as `0x1234...5678`

**Effects**:
- Sets up walletService callbacks on mount

**Dependencies**: `../../services/walletService`
**Used By**: App.tsx

---

#### `src/components/NFTDisplay/NFTDisplay.tsx`
**Purpose**: NFT display and script execution configuration
**Type**: React Component

**Props**:
```typescript
interface NFTDisplayProps {
  nft?: NFTData;
  visible?: boolean;
  profiles?: UserProfile[];
  maxProfiles?: number;
  navigationUrl?: string;
  onNavigationUrlChange?: (url: string) => void;
  onOpenSearchBuilder?: () => void;
}
```

**State** (persisted to localStorage key `nft-display-state`):
- `isExpanded: boolean` - Show/hide settings panel
- `selectedProfile: UserProfile | null`
- `headlessMode: boolean` - Headless browser mode
- `notOlderThanHours: number` - Content age filter (1-168 hours)
- `regexTags: string[]` - Keywords for tweet detection
- `commentTemplates: string` - JSON array of comment templates
- `delayBetweenActions: number` - Delay in seconds
- `saveImagesFolder: string` - Folder path for images
- `navigationUrl: string` - Search query URL
- `runningScripts: RunningScript[]` - Array of running scripts

**Key Functions**:

##### `handleExecuteScript(): Promise<void>`
1. Validates comment templates JSON array
2. Gets current script from window.currentScript
3. Parses commentTemplates JSON to array
4. Calls electronAPI.executeScript() with:
   - script: currentScript
   - settings: {profileId, profile, headless, regexTags, saveImagesFolder, navigationUrl, commentTemplates, delayBetweenActions}
   - nftData: nft
5. Adds to runningScripts array
6. Sets up IPC listeners for script events

##### `handleStopScript(scriptId): Promise<void>`
- Calls electronAPI.stopScript()

##### `handleSelectFolder(): Promise<void>`
- Opens folder picker via electronAPI.selectFolder()
- Saves path to state

**Effects**:
- Listen for script-output, script-stopped, script-finished events
- Load state from localStorage on mount
- Save state to localStorage on changes
- Sync selectedProfile with profiles array

**Renders**:
- Collapsed NFT card with image (click to expand)
- Expanded settings panel:
  - Profile selection dropdown
  - Headless mode toggle
  - Content age filter (hours)
  - Keyword tags (chip input)
  - Save images folder picker
  - Navigation URL display/builder button
  - Delay slider
  - Comment templates JSON textarea
  - Execute/Stop buttons
- Running script cards (click to stop)

**Dependencies**: `../../types`
**Used By**: App.tsx

---

#### `src/components/ProfileManager/ProfileManager.tsx`
**Purpose**: Profile management UI (list, add, edit, delete)
**Type**: React Component

**Props**:
```typescript
interface ProfileManagerProps {
  profiles: UserProfile[];
  onProfileCreate: (profile: Omit<UserProfile, 'id'|'createdAt'|'updatedAt'|'isActive'>) => void;
  onProfileUpdate: (profile: UserProfile) => void;
  onProfileDelete: (profileId: string) => void;
  onProfileSelect: (profile: UserProfile) => void;
  selectedProfile?: UserProfile;
  maxProfiles: number;
  onBuildQuery?: (profile: UserProfile) => void;
  onClearHistory?: (profile: UserProfile) => void;
  onAddTelegramBot?: (profile: UserProfile) => void;
}
```

**State**:
- `showAddModal: boolean`
- `editingProfile: UserProfile | undefined`
- `showTelegramModal: boolean`
- `telegramProfile: UserProfile | undefined`

**Key Functions**:
- `handleAddProfile()` → Opens add modal
- `handleEditProfile(profile)` → Opens edit modal
- `handleSaveProfile(profileData)` → Creates or updates profile
- `handleDeleteProfile(profileId)` → Confirms and deletes
- `handleAddTelegramBot(profile)` → Opens Telegram modal
- `handleSaveTelegramConfig(config)` → Updates profile with Telegram config

**Renders**:
- Header with profile count and selected profile
- Add Profile button
- Grid of ProfileCard components
- AddProfileModal (conditional)
- AddTelegramBotModal (conditional)

**Dependencies**:
- `./ProfileCard`
- `./AddProfileModal`
- `./AddTelegramBotModal`

**Used By**: App.tsx

---

#### `src/components/ProfileManager/ProfileCard.tsx`
**Purpose**: Individual profile card display
**Type**: React Component

**Props**:
```typescript
interface ProfileCardProps {
  profile: UserProfile;
  onEdit: (profile: UserProfile) => void;
  onDelete: (profileId: string) => void;
  onSelect: (profile: UserProfile) => void;
  onBuildQuery?: (profile: UserProfile) => void;
  onClearHistory?: (profile: UserProfile) => void;
  onAddTelegramBot?: (profile: UserProfile) => void;
}
```

**State**:
- `showActions: boolean` - Show/hide action buttons

**Renders**:
- Profile name
- Cookies count
- Proxy info (IP:PORT)
- Telegram status indicator
- Action buttons: Edit, Delete, Build Query, Clear History, Add Telegram Bot

**Dependencies**: `../../types`
**Used By**: ProfileManager.tsx

---

#### `src/components/ProfileManager/AddProfileModal.tsx`
**Purpose**: Add/edit profile modal
**Type**: React Component

**Props**:
```typescript
interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: ProfileData) => void;
  existingProfiles: UserProfile[];
  editingProfile?: UserProfile;
}
```

**State**:
- `name: string`
- `cookies: string` - JSON or Netscape format
- `proxy: {ip, port, login, password}`
- `error: string | undefined`
- `cookieFormat: 'json' | 'netscape'`

**Key Functions**:

##### `handleSubmit(): Promise<void>`
1. Validates name, cookies, proxy
2. Parses cookies using profileStorage.parseAdsPowerCookies()
3. Validates cookies for Puppeteer compatibility
4. Calls onSave with profile data

##### `parseCookies(cookieString): Cookie[]`
- Detects format (JSON or Netscape)
- Parses and validates
- Returns Cookie array

**Renders**:
- Modal overlay
- Profile name input
- Cookie format selector (JSON/Netscape)
- Cookie textarea
- Proxy inputs (IP, port, login, password)
- Submit/Cancel buttons

**Dependencies**: `../../types`, `../../services/profileStorage`
**Used By**: ProfileManager.tsx

---

#### `src/components/ProfileManager/AddTelegramBotModal.tsx`
**Purpose**: Telegram bot connection wizard
**Type**: React Component

**Props**:
```typescript
interface AddTelegramBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: TelegramBotConfig) => void;
  profile: UserProfile;
  existingConfig?: TelegramBotConfig;
}
```

**State**:
- `httpApi: string` - Bot token (botXXX:YYY)
- `chatId: string`
- `botName: string`
- `step: 'token' | 'chatId' | 'test' | 'connected'`
- `error: string`
- `testing: boolean`

**Key Functions**:

##### `handleTestConnection(): Promise<void>`
1. Validates token format
2. Calls electronAPI.testTelegramConnection()
3. Auto-fills chatId and botName if found in updates

##### `handleGetChatId(): Promise<void>`
- Calls electronAPI.getTelegramChatId()
- Requires user to send /start to bot first

##### `handleSendTest(): Promise<void>`
- Sends test message via electronAPI.sendTelegramMessage()

##### `handleSave(): Promise<void>`
- Calls onSave with TelegramBotConfig

**Renders**:
- Step-by-step wizard (token → chatId → test → connected)
- Token input
- Chat ID input (auto or manual)
- Test message button
- Instructions

**Dependencies**: `../../types`
**Used By**: ProfileManager.tsx

---

#### `src/components/ScriptManager/ScriptManager.tsx`
**Purpose**: Script-NFT association and execution management
**Type**: React Component

**Props**:
```typescript
interface ScriptManagerProps {
  scriptData?: ScriptData;
}
```

**State**:
- `scriptNFTMappings: ScriptNFTMapping[]` - Array of {scriptId, image, associatedAt}

**Key Functions**:

##### `associateScriptWithNFT(nftImage: string): void`
- Creates mapping between current script and NFT image
- Removes existing mapping for same NFT

##### `executeScriptForNFT(nftImage: string, profileSettings?): Promise<void>`
1. Finds mapping for NFT image
2. Auto-associates if not found
3. Calls electronAPI.executeScript()
4. Dispatches 'script-started' custom event

##### `getAssociatedNFT(scriptId: string): ScriptNFTMapping | undefined`
- Returns mapping for script ID

**Effects**:
- Auto-associate script with current NFT when scriptData changes
- Expose functions to window.scriptManager for parent access

**Renders**:
- Script info (name, version, features, status)
- NFT associations list with execute buttons

**Dependencies**: `../../types`
**Used By**: App.tsx

---

#### `src/components/SearchQueryBuilder/SearchQueryBuilder.tsx`
**Purpose**: Twitter advanced search URL builder
**Type**: React Component

**Props**:
```typescript
interface SearchQueryBuilderProps {
  onUseInScript?: (url: string) => void;
  profileContext?: {
    profileName: string;
    existingUrl?: string;
  };
}
```

**State**:
- `selectedTab: 'wizard' | 'advanced'`
- `keywords: string[]`
- `exactPhrases: string[]`
- `hashtags: string[]`
- `mentions: string[]`
- `fromUsers: string[]`
- `toUsers: string[]`
- `excludeWords: string[]`
- `orGroups: string[][]` - OR logic groups
- `minReplies, minLikes, minRetweets: string`
- `startDate, endDate: string`
- `language: string`
- `verified: boolean`

**Key Functions**:

##### `buildSearchUrl(): string`
- Constructs Twitter advanced search URL
- Combines all filters into query parameters

##### `handleUseUrl(): void`
- Builds URL
- Calls onUseInScript callback

##### `parseUrlToState(url: string): void`
- Parses existing URL into state
- Fills wizard fields from URL

**Effects**:
- Load existing URL into state if provided

**Renders**:
- Tab selector (Wizard / Advanced)
- Tag inputs for keywords, hashtags, mentions, etc.
- OR groups input
- Numeric filters (min replies, likes, RTs)
- Date range picker
- Language selector
- Verified checkbox
- Query preview
- Example queries
- Use URL button

**Dependencies**:
- `./components/TagInput`
- `./components/OrGroupsInput`
- `./QueryPreview`
- `./ExampleQueries`
- `./utils/queryBuilder`

**Used By**: App.tsx

---

#### `src/components/SearchQueryBuilder/utils/queryBuilder.ts`
**Purpose**: Twitter search URL construction logic
**Type**: Utility Module

**Exports**:

##### `function buildTwitterSearchUrl(params: SearchParams): string`
- Takes search parameters
- Builds Twitter advanced search URL
- Encodes query string

##### `function parseTwitterSearchUrl(url: string): Partial<SearchParams>`
- Parses Twitter search URL
- Extracts search parameters
- Returns SearchParams object

**Dependencies**: None
**Used By**: SearchQueryBuilder.tsx

---

#### `src/components/ThemeToggle/ThemeToggle.tsx`
**Purpose**: Dark/light theme toggle button
**Type**: React Component

**State**: Uses ThemeContext

**Key Functions**:
- `toggleTheme()` → Calls theme context toggle

**Renders**: Sun/moon icon button

**Dependencies**: `../../contexts/ThemeContext`
**Used By**: App.tsx

---

### **Contexts**

#### `src/contexts/ThemeContext.tsx`
**Purpose**: Theme state management
**Type**: React Context

**Exports**:

##### `ThemeProvider` component
- Manages theme state
- Persists to localStorage (key: `theme`)
- Applies theme class to document.documentElement

##### `useTheme()` hook
- Returns: `{theme: 'light'|'dark', toggleTheme: () => void}`

**State**:
- `theme: 'light' | 'dark'`

**Effects**:
- Load theme from localStorage on mount
- Apply theme class to document
- Save theme to localStorage on change

**Dependencies**: None
**Used By**:
- main.tsx (Provider)
- ThemeToggle.tsx (hook)

---

### **Services**

#### `src/services/deviceFingerprint.ts`
**Purpose**: Device fingerprint collection
**Type**: Service Module

**Exports**:

##### `async function collectDeviceInfo(): Promise<DeviceData>`
Collects comprehensive device fingerprint:
- **Browser**: user agent, languages, screen, timezone
- **Canvas**: Canvas fingerprint (text + shapes)
- **WebGL**: WebGL renderer, vendor, fingerprint
- **System** (from Electron): CPU model, cores, architecture, total memory, OS platform/release

**Internal Functions**:
- `getCanvasFingerprint()` → Draws text/shapes, returns data URL slice
- `getWebGLFingerprint()` → Renders triangle, returns data URL slice
- `createShaderProgram()` → Creates WebGL shader program
- `createShader()` → Compiles WebGL shader

##### `function generateSimpleHash(data: DeviceData): string`
- Client-side hash (simple, for display only)

##### `function validateDeviceData(data: any): data is DeviceData`
- Type guard for DeviceData

**Dependencies**: `../types`
**Used By**: App.tsx (initializeApp)

---

#### `src/services/serverApiService.ts`
**Purpose**: Backend server communication
**Type**: Service Module (Singleton)

**Class**: `ServerApiService`

**Properties**:
- `baseUrl: string` - Backend server URL (default: http://localhost:3000)
- `frontendServerUrl: string` - Callback server URL (default: http://localhost:3001)
- `deviceHash, sessionToken, userId: string | null`
- `callbackPollInterval: NodeJS.Timeout | null`
- `isConnected: boolean`
- `callbacks: {onConnectionStatusChange?, onServerPing?, onNFTReceived?, onScriptReceived?}`

**Methods**:

##### `async connectToServer(deviceData, walletAddress?): Promise<{success, deviceHash?, sessionToken?, userId?, clientIPv4?, error?}>`
1. Gets real IPv4 via WebRTC
2. Sends POST /api/auth/fingerprint with device data + wallet address
3. Stores deviceHash, sessionToken, userId
4. Processes NFT data if present (hasLegionNFT)
5. Processes script data if present
6. Sends session to frontend server
7. Starts callback polling (every 5 seconds)

##### `setCallbacks(callbacks): void`
- Sets callback functions for connection status, pings, NFT, scripts

##### `disconnect(): void`
- Clears callback polling
- Resets session state

**Internal Methods**:
- `getRealIPv4Address()` → Gets local network IP via WebRTC
- `sendSessionToFrontendServer()` → POST /api/set-session
- `startCallbackPolling()` → Polls every 5s for callbacks and counter updates
- `checkCounterUpdates()` → GET /api/counter-status
- `checkCallbacks()` → GET /api/callback-status
- `handleServerCallback()` → Processes server callback
- `processPingData()` → Handles NFT and script data from pings

**Exports**:
- `serverApiService` - Singleton instance
- `connectToServer()` - Utility wrapper
- `getConnectionStatus()` - Utility wrapper
- `getSessionInfo()` - Utility wrapper
- `setServerCallbacks()` - Utility wrapper

**Dependencies**: `../types`, `../utils/encryption`
**Used By**: App.tsx

---

#### `src/services/profileStorage.ts`
**Purpose**: Profile CRUD operations (localStorage)
**Type**: Service Module (Singleton)

**Class**: `ProfileStorageService`

**Storage Key**: `twitter_automation_profiles`

**Methods**:

##### `async getProfiles(): Promise<UserProfile[]>`
- Loads from localStorage
- Sorts by updatedAt (newest first)

##### `async saveProfile(profileData): Promise<UserProfile>`
1. Validates no duplicate proxy (ip:port)
2. Generates UUID id
3. Sets timestamps
4. Saves to localStorage
5. Returns new profile

##### `async updateProfile(profileId, updates): Promise<UserProfile>`
1. Validates no duplicate proxy
2. Updates profile
3. Sets updatedAt timestamp
4. Saves to localStorage

##### `async deleteProfile(profileId): Promise<boolean>`
- Removes profile from array
- Saves to localStorage

##### `async getProfile(profileId): Promise<UserProfile | null>`
- Returns profile by ID

##### `parseAdsPowerCookies(cookiesJson): ProfileCookie[]`
- Parses JSON array or single cookie object
- Converts AdsPower format to Puppeteer format
- Validates cookie structure

##### `validateCookiesForPuppeteer(cookies): {valid, invalid}`
- Validates required fields (name, value, domain)
- Validates domain format
- Validates SameSite values

##### `async activateProfile(profileId, maxActiveProfiles): Promise<UserProfile>`
- Activates profile
- Enforces maxActiveProfiles limit

##### `async deactivateProfile(profileId): Promise<UserProfile>`
- Deactivates profile

##### `async toggleProfileActivation(profileId, maxActiveProfiles): Promise<UserProfile>`
- Toggles activation status

**Exports**:
- `profileStorage` - Singleton instance

**Dependencies**: `../types`, `uuid`
**Used By**: App.tsx, AddProfileModal.tsx

---

#### `src/services/timerService.ts`
**Purpose**: Ping timeout management
**Type**: Service Module (Singleton)

**Class**: `TimerService`

**Properties**:
- `currentNonce: number`
- `pingTimer: NodeJS.Timeout | null` - 40-second timeout
- `countdownTimer: NodeJS.Timeout | null` - 1-second countdown
- `firstPingReceived: boolean`
- `expectedNonce: number`
- `timeRemaining: number` - Seconds remaining
- `callbacks: {onNonceUpdate?, onTimeout?}`

**Methods**:

##### `updateNonce(nonce: number): void`
- Updates current nonce
- Notifies callback

##### `startPingTimer(): void`
1. Resets timeRemaining to 40 seconds
2. Starts 1-second countdown interval
3. Sets 40-second timeout
4. On timeout: calls clearCacheAndClose()

##### `resetPingTimer(): void`
- Clears all timers
- Restarts timer

##### `validateNonce(receivedNonce: number): boolean`
- Validates sequential nonce increment
- On failure: calls clearCacheAndClose()

##### `stop(): void`
- Clears timers
- Resets state

**Internal Methods**:
- `clearCacheAndClose()` → Clears localStorage, sessionStorage, caches, calls electronAPI.closeApp()
- `clearAllTimers()` → Clears pingTimer and countdownTimer

**Effects**:
- Listens for ping-counter-update IPC events

**Exports**:
- `timerService` - Singleton instance
- Utility functions: startPingTimer, resetPingTimer, validateNonce, etc.

**Dependencies**: `../types`
**Used By**: App.tsx, serverApiService.ts

---

#### `src/services/walletService.ts`
**Purpose**: Wallet authentication management
**Type**: Service Module (Singleton)

**Class**: `WalletService`

**Properties**:
- `sessionToken, walletAddress: string | null`
- `isConnected: boolean`
- `statusCheckInterval: NodeJS.Timeout | null` - Polls every 5 seconds
- `onWalletConnected?, onWalletDisconnected?` - Event handlers

**Methods**:

##### `async connectWallet(): Promise<WalletConnectionStatus>`
1. Calls electronAPI.startWalletAuth()
2. Starts status check interval (every 5 seconds)
3. Returns session token

##### `async disconnectWallet(): Promise<{success, message}>`
1. Calls electronAPI.disconnectWallet()
2. Resets state
3. Calls clearCacheAndClose()

##### `async getWalletStatus(): Promise<WalletConnectionStatus>`
- Calls electronAPI.getWalletStatus()
- Updates internal state if connected

**Internal Methods**:
- `setupEventListeners()` → Listens for wallet-connected and auth-ready IPC events
- `handleWalletConnected()` → Updates state, notifies onWalletConnected
- `resetWalletState()` → Clears session, stops status check
- `startStatusCheck()` → Polls status every 5 seconds
- `stopStatusCheck()` → Clears interval

**Exports**:
- `walletService` - Singleton instance
- Utility functions: connectWallet, disconnectWallet, getWalletStatus

**Dependencies**: `../types`, `./timerService`
**Used By**: WalletConnection.tsx

---

#### `src/services/telegramService.ts`
**Purpose**: Telegram Bot API communication
**Type**: Service Module

**Base URL**: `https://api.telegram.org`

**Exports**:

##### `function validateBotToken(httpApi: string): boolean`
- Validates format: `bot\d+:[A-Za-z0-9_-]+`

##### `async function testConnection(httpApi): Promise<{success, error?, data?}>`
- Calls GET /{httpApi}/getUpdates
- Validates token

##### `async function getChatId(httpApi): Promise<{success, chatId?, error?}>`
- Calls getUpdates
- Extracts first message's chat ID

##### `async function sendMessage(httpApi, chatId, text): Promise<{success, error?, data?}>`
- Calls POST /{httpApi}/sendMessage
- Sends message to chat

##### `async function getBotInfo(httpApi): Promise<{success, botName?, username?, error?}>`
- Calls GET /{httpApi}/getMe
- Returns bot information

**Dependencies**: `../types`
**Used By**: AddTelegramBotModal.tsx, electron/main.ts (via IPC)

---

### **Utils**

#### `src/utils/encryption.ts`
**Purpose**: Encryption/decryption utilities
**Type**: Utility Module

**Exports**:

##### `function generateDeviceKey(cpuModel: string, ipAddress: string): Buffer`
- Creates SHA-256 hash of `${cpuModel}:${ipAddress}`
- Returns 32-byte Buffer

##### `function encryptData(data: any, deviceKey: Buffer | string): string`
- Encrypts JSON data with AES-256-CBC
- Uses random IV (16 bytes)
- Returns `{iv}:{ciphertext}` in base64

##### `function decryptData(encrypted: string, deviceKey: Buffer | string): any`
- Decrypts data
- Parses JSON
- Returns original data

##### `function hashData(data: any, deviceKey: Buffer | string): string`
- Creates HMAC-SHA256 hash
- Returns hex string

##### `function verifyData(data: any, hash: string, deviceKey: Buffer | string): boolean`
- Verifies data integrity
- Compares HMAC hashes

**Dependencies**: Node.js crypto module
**Used By**:
- profileStorage.ts (cookie encryption)
- serverApiService.ts (data encryption)
- electron/main.ts (callback decryption)

---

### **Types**

#### `src/types/index.ts`
**Purpose**: TypeScript type definitions
**Type**: Type Declarations

**Key Exports**:

**Wallet & Auth**:
- `WalletConnectionStatus`
- `AuthResult`
- `SessionToken`

**Device**:
- `DeviceFingerprint`
- `DeviceData`

**Server**:
- `ServerResponse<T>`
- `ServerCallbackInstruction`
- `ServerCallback`
- `PingData`

**Scripts**:
- `ScriptData`
- `ScriptExecutionContext`
- `ScriptExecutionParams`
- `ScriptExecutionResult`
- `ActiveScript`
- `ScriptOutput`
- `ScriptEvent`

**NFT**:
- `NFTData`
- `SubscriptionStatus`
- `PaymentData`

**State**:
- `AppState`
- `WalletState`
- `SystemState`
- `NFTState`
- `TimerState`
- `ScriptState`
- `ProfileState`
- `LogEntry`

**Profiles**:
- `UserProfile`
- `ProfileProxy`
- `ProfileCookie`
- `TelegramBotConfig`

**Search**:
- `SearchQueryBuilderProps`
- `SearchQueryState`
- `TagInputProps`

**Electron**:
- `ElectronAPI` - Complete window.electronAPI interface

**Constants**:
- `WALLET_STATES`, `SYSTEM_STATES`, `LOG_LEVELS`, `PING_ACTIONS`
- `PROFILE_STORAGE_KEY`

**Dependencies**: None
**Used By**: All TypeScript files

---

#### `src/electron.d.ts`
**Purpose**: Electron API type declarations for window object
**Type**: Global Type Declarations

**Extends**: `Window` interface with `electronAPI` and `ipcRenderer`

**Dependencies**: None
**Used By**: TypeScript compiler (global types)

---

### **Configuration Files**

#### `package.json`
**Purpose**: NPM package configuration

**Main Scripts**:
- `dev` - Vite dev server with Electron
- `build` - Build for production
- `dist` - Package with electron-builder

**Key Dependencies**:
- `electron@^33.2.1`
- `react@^18.3.1`
- `puppeteer-extra@^3.3.6`
- `socket.io-client@^4.8.1`
- `uuid@^11.0.4`
- `express@^4.21.2`

---

#### `vite.config.ts`
**Purpose**: Vite bundler configuration

**Plugins**:
- `@vitejs/plugin-react`
- `vite-plugin-electron`
- `vite-plugin-electron-renderer`

**Build**:
- Target: ESNext
- Output: dist/
- Base: ./

---

#### `tsconfig.json`
**Purpose**: TypeScript compiler configuration (React)

**Settings**:
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode: enabled
- Paths: @ → src/

---

#### `tsconfig.electron.json`
**Purpose**: TypeScript compiler configuration (Electron)

**Settings**:
- Target: ES2022
- Module: ESNext
- ModuleResolution: Bundler

---

#### `electron-builder.json5`
**Purpose**: Electron packager configuration

**Settings**:
- App ID: com.twitter.automation
- Files to include/exclude
- Platform-specific settings (Windows, Mac, Linux)
- NSIS installer options

---

## 🔗 Dependency Graph

### Component Hierarchy
```
App.tsx (root)
├─> ThemeToggle
├─> WalletConnection
├─> NFTDisplay
├─> ProfileManager
│   ├─> ProfileCard (multiple)
│   ├─> AddProfileModal
│   └─> AddTelegramBotModal
├─> ScriptManager
└─> SearchQueryBuilder
    ├─> TagInput
    ├─> OrGroupsInput
    ├─> QueryPreview
    └─> ExampleQueries
```

### Service Dependencies
```
App.tsx
├─> deviceFingerprint.collectDeviceInfo()
├─> serverApiService.connectToServer()
├─> serverApiService.setServerCallbacks()
├─> profileStorage.* (CRUD)
└─> timerService.* (ping timer)

serverApiService
├─> encryption.* (encrypt/decrypt data)
└─> timerService.* (ping timeout)

profileStorage
└─> encryption.* (cookie encryption)

WalletConnection
└─> walletService.* (MetaMask integration)

AddTelegramBotModal
└─> telegramService.* (bot testing)
```

### IPC Communication Flow
```
Renderer Process (React)
    ↓ window.electronAPI.{method}()
Preload Script (preload.ts)
    ↓ ipcRenderer.invoke(channel, args)
Main Process (main.ts)
    ↓ ipcMain.handle(channel, handler)
Execute Logic (filesystem, child process, HTTP server, etc.)
    ↓ win.webContents.send(channel, data)
Renderer Process (event listeners)
    ↓ Update React state
UI Updates
```

---

## 📊 Key Workflows

### 1. Startup Sequence
1. Electron main.ts loads
2. Creates BrowserWindow with security settings
3. Loads Vite dev server or built files
4. Preload script exposes electronAPI via contextBridge
5. React app renders (main.tsx → App.tsx)
6. ThemeProvider initializes from localStorage
7. App component mounts
8. setupServerCallbacks() registers IPC listeners
9. Loads profiles from localStorage
10. Waits for wallet connection

### 2. Wallet Connection Flow
1. User clicks "Connect Wallet"
2. WalletConnection → walletService.connectWallet()
3. walletService → electronAPI.startWalletAuth()
4. Main process → AuthFlow.startAuth()
5. AuthFlow → Starts HTTP server on random port
6. AuthFlow → Opens system browser to `localhost:{port}/auth?session={token}`
7. Browser → User connects MetaMask
8. Browser → POST /wallet-connected with {address, session}
9. Main process → Validates address, stores session
10. Main process → win.webContents.send('wallet-connected', {address, sessionToken})
11. Renderer → onWalletConnected event
12. App.tsx → handleWalletConnected()
13. App.tsx → initializeApp(walletAddress)

### 3. App Initialization Flow
1. App.tsx → collectDeviceInfo() (browser + Electron system info)
2. App.tsx → getRealIPv4() via WebRTC
3. App.tsx → electronAPI.setDeviceData({fingerprint, clientIPv4})
4. App.tsx → serverApiService.connectToServer(deviceData, walletAddress)
5. serverApiService → POST /api/auth/fingerprint
6. Backend → Generates deviceHash, creates/updates user
7. Backend → Returns {deviceHash, sessionToken, userId, nftImage?, script?}
8. serverApiService → Stores session data
9. serverApiService → Sends session to frontend callback server
10. serverApiService → Starts callback polling (every 5s)
11. serverApiService → Processes NFT data if present
12. serverApiService → Calls onNFTReceived callback
13. App.tsx → Updates appState.nft, shows NFTDisplay
14. App.tsx → Loads profiles from localStorage

### 4. NFT Verification Flow
1. Backend → Detects NFT mint event (blockchain listener)
2. Backend → Sends POST localhost:3001/api/server-callback with encrypted NFT data
3. CallbackServer → Receives callback
4. Main process → Decrypts data using generateDeviceKey(cpuModel, clientIPv4)
5. Main process → win.webContents.send('nft-received', {image, metadata, subscription})
6. Renderer → onNFTReceived event
7. App.tsx → Sets currentNFT state
8. App.tsx → Updates appState.nft.visible = true
9. App.tsx → Sets maxProfiles from subscription
10. NFTDisplay → Renders NFT image and metadata
11. ProfileManager → Enables profile creation (up to maxProfiles)

### 5. Profile Creation Flow
1. User clicks "Add Profile" in ProfileManager
2. ProfileManager → Opens AddProfileModal
3. User enters name, cookies (JSON or Netscape), proxy, (optional) Telegram bot
4. AddProfileModal → Validates inputs
5. AddProfileModal → profileStorage.parseAdsPowerCookies(cookiesJson)
6. profileStorage → Parses JSON array, converts to ProfileCookie format
7. AddProfileModal → profileStorage.validateCookiesForPuppeteer(cookies)
8. AddProfileModal → Calls onSave(profileData)
9. App.tsx → profileStorage.saveProfile(profileData)
10. profileStorage → Generates UUID, sets timestamps
11. profileStorage → Encrypts cookies (future feature)
12. profileStorage → Saves to localStorage (`twitter_automation_profiles`)
13. App.tsx → Updates appState.profiles
14. ProfileManager → Displays new ProfileCard

### 6. Script Execution Flow
1. Backend sends script via POST /api/server-callback
2. Main process → Decrypts script code
3. Main process → win.webContents.send('script-received', {script})
4. Renderer → onScriptReceived event
5. App.tsx → Sets currentScript state
6. ScriptManager → Auto-associates script with current NFT
7. User configures settings in NFTDisplay:
   - Selects profile
   - Sets headless mode
   - Sets content age filter (hours)
   - Adds keyword tags
   - Sets save folder
   - Sets navigation URL (via SearchQueryBuilder)
   - Adds comment templates (JSON array)
   - Sets delay
8. User clicks "Execute Script"
9. NFTDisplay → Validates inputs (comment templates JSON)
10. NFTDisplay → Gets currentScript from window.currentScript
11. NFTDisplay → Calls electronAPI.executeScript({script, settings, nftData})
12. Main process → Creates temp script file in os.tmpdir()/twitter-app-scripts/
13. Main process → Generates Puppeteer wrapper script with:
    - profile data (cookies, proxy, telegram)
    - config data (regex, templates, delay, navigationUrl, saveImagesFolder)
    - Backend script code injected
    - Helper function: sendTelegramNotification()
    - Browser launcher: launchBrowserWithProfile()
14. Main process → Spawns Node.js child process
15. Child process → Runs Puppeteer script:
    - Launches browser (headless or visible)
    - Applies proxy settings
    - Injects cookies
    - Navigates to URL
    - Executes backend script logic
    - Sends Telegram notifications
16. Child process → Streams stdout/stderr to parent
17. Main process → Forwards output to renderer via 'script-output' events
18. NFTDisplay → Displays script output in console
19. Script completes → win.webContents.send('script-finished')
20. NFTDisplay → Removes from runningScripts array
21. Main process → Deletes temp script file after 30 seconds

### 7. Search Query Builder Flow
1. User clicks "Open Builder" in NFTDisplay (or Build Query in ProfileCard)
2. App.tsx → Sets showSearchBuilder = true
3. App.tsx → Renders SearchQueryBuilder in fullscreen
4. User adds keywords, hashtags, mentions, etc.
5. SearchQueryBuilder → buildSearchUrl()
6. SearchQueryBuilder → Displays live preview of URL
7. User clicks "Use URL"
8. SearchQueryBuilder → Calls onUseInScript(url)
9. If building for profile:
   - App.tsx → handleSaveQueryToProfile(url)
   - Updates profile.navigationUrl
   - Saves to localStorage
10. If building for global:
    - App.tsx → handleUseSearchUrl(url)
    - Sets navigationUrl state
11. App.tsx → Sets showSearchBuilder = false
12. App.tsx → Scrolls back to previous position
13. NFTDisplay → Displays navigationUrl

### 8. Telegram Bot Setup Flow
1. User clicks "Add Telegram Bot" on ProfileCard
2. ProfileManager → Opens AddTelegramBotModal
3. **Step 1: Token Entry**
   - User enters bot token (botXXX:YYY)
   - Modal validates format
   - User clicks "Test Connection"
4. **Step 2: Connection Test**
   - Modal → electronAPI.testTelegramConnection(httpApi)
   - Main process → Calls Telegram API getUpdates and getMe
   - Returns {success, chatId?, botName?, username?}
   - If chatId found → Auto-fill and skip to Step 4
   - If not found → Show Step 3
5. **Step 3: Get Chat ID** (if needed)
   - User sends /start to bot in Telegram
   - User clicks "Get Chat ID"
   - Modal → electronAPI.getTelegramChatId(httpApi)
   - Main process → Calls getUpdates
   - Extracts chat ID from first message
   - Auto-fills chatId field
6. **Step 4: Test Message**
   - User clicks "Send Test Message"
   - Modal → electronAPI.sendTelegramMessage(httpApi, chatId, "Test")
   - User verifies message received in Telegram
7. **Step 5: Save**
   - User clicks "Save"
   - Modal → Calls onSave({httpApi, chatId, botName, connected: true})
   - ProfileManager → Updates profile.telegram
   - Saves to localStorage
8. ProfileCard → Shows "Telegram: Connected" badge

### 9. Ping Timeout & Security Flow
1. App initializes → timerService.startPingTimer()
2. Timer set for 40 seconds
3. Countdown displayed (if UI shows it)
4. **Ping Received**:
   - Backend → POST /api/server-callback with {nonce: X}
   - Main process → win.webContents.send('ping-counter-update', {nonce})
   - Renderer → onPingCounterUpdate event
   - App.tsx → timerService.updateNonce(nonce)
   - App.tsx → timerService.resetPingTimer()
   - Timer resets to 40 seconds
5. **Timeout Occurs** (no ping for 40 seconds):
   - timerService → clearCacheAndClose()
   - Clears localStorage, sessionStorage, browser caches
   - Calls electronAPI.closeApp()
   - Main process → Closes all windows
   - Main process → Quits application
6. **Security Violation** (invalid nonce):
   - timerService.validateNonce() fails
   - Immediately calls clearCacheAndClose()
   - Application closes

---

## 🔐 Security Features

### Electron Security
- **contextIsolation**: true - Prevents renderer from accessing Node.js
- **nodeIntegration**: false - Disables Node in renderer
- **webSecurity**: true - Enables web security
- **sandbox**: false - Allows preload script (controlled exposure via contextBridge)
- **devTools**: disabled in production
- **Preload script**: Only exposes whitelisted APIs via contextBridge

### Data Encryption
- **Cookie encryption**: AES-256-CBC with device-specific key
- **Device key**: SHA-256(CPU model + IP address)
- **Data transmission**: Encrypted callbacks from backend
- **Integrity checks**: HMAC-SHA256 verification

### IPC Security
- All communication via preload script (no direct Node.js access)
- Input validation on all IPC handlers
- No eval() or dynamic code execution
- Whitelisted API surface

### Ping Timeout Security
- 40-second timeout enforced
- Sequential nonce validation
- Cache cleared on timeout or violation
- Application force-closed on security breach

---

## 💾 Local Storage

### Keys Used
- `twitter-automation-profiles` - Encrypted profile data (name, cookies, proxy, telegram)
- `nft-display-state` - Script execution settings (regex, templates, delay, folder, URL)
- `theme` - Dark/light mode preference

### Data Format
All stored as JSON strings. Profiles array contains UserProfile objects with encrypted cookies.

---

## 🎨 Styling

### CSS Files
- `src/index.css` - Global styles, reset
- `src/styles/themes.css` - Theme variables (light/dark)
- `src/App.css` - App component styles
- Component-specific CSS files alongside .tsx files

### Theme System
- CSS variables: `--primary-color`, `--background-color`, `--text-color`, etc.
- Two themes: light and dark
- Managed by ThemeContext
- Applied via `data-theme` attribute on document.documentElement
- Persisted to localStorage

---

## 📝 Puppeteer Script Wrapper Format

When `executeScript` is called, main.ts generates a wrapper script:

```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Injected profile data
const profile = {
  id: "...",
  name: "...",
  cookies: [...],
  proxy: {ip, port, login, password}
  telegram: {httpApi, chatId, botName, connected}
};

// Injected config
const config = {
  navigationUrl: "...",
  regexPattern: "...",
  regexTags: [...],
  commentTemplates: [...],
  saveImagesFolder: "...",
  delayBetweenActions: 3000
};

// Telegram notification helper
async function sendTelegramNotification(message) {
  if (!telegramConfig?.connected) return false;
  const url = `https://api.telegram.org/${telegramConfig.httpApi}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chat_id: telegramConfig.chatId,
      text: message,
      parse_mode: 'HTML'
    })
  });
  return response.ok;
}

// Browser launcher with profile
async function launchBrowserWithProfile() {
  const browserArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ];

  if (profile.proxy?.ip && profile.proxy?.port) {
    browserArgs.push(`--proxy-server=${profile.proxy.ip}:${profile.proxy.port}`);
  }

  if (!headlessMode) {
    browserArgs.push("--start-maximized");
  }

  const browser = await puppeteer.launch({
    headless: headlessMode,
    args: browserArgs,
    userDataDir: `./puppeteer_profile_${profile.id}`
  });

  const page = await browser.newPage();

  // Proxy authentication
  if (profile.proxy?.login && profile.proxy?.password) {
    await page.authenticate({
      username: profile.proxy.login,
      password: profile.proxy.password
    });
  }

  // Clear cache
  const client = await page.createCDPSession();
  await client.send("Network.clearBrowserCache");

  // Set viewport
  await page.setViewport({width: 1920, height: 1080});

  // Set cookies
  if (profile.cookies?.length > 0) {
    await page.setCookie(...profile.cookies);
  }

  return {browser, page};
}

// Main execution
async function main() {
  const {browser, page} = await launchBrowserWithProfile();

  // Send startup notification
  await sendTelegramNotification(
    `🚀 <b>Script Started</b>\n\n` +
    `📋 Profile: <code>${profile.name}</code>\n` +
    `⏰ Time: ${new Date().toLocaleString()}`
  );

  // BACKEND SCRIPT CODE INJECTED HERE
  ${scriptContent}

  // Execute backend script
  const scriptContext = {
    page,
    browser,
    config,
    profile,
    telegram: {
      sendNotification: sendTelegramNotification,
      isConfigured: telegramConfig?.connected,
      config: telegramConfig
    }
  };

  if (typeof executeScript === 'function') {
    await executeScript(scriptContext);
  }

  // Send completion notification
  await sendTelegramNotification(
    `✅ <b>Script Completed</b>\n\n` +
    `📋 Profile: <code>${profile.name}</code>\n` +
    `⏰ Time: ${new Date().toLocaleString()}`
  );

  await browser.close();
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (browserInstance) await browserInstance.close();
  process.exit(0);
});

main().catch(console.error);
```

---

## Summary

This documentation covers **56 source files** in the react-electron directory:
- 2 Electron process files (main, preload)
- 25 React component files (.tsx)
- 6 Service files (.ts)
- 1 Utility file (encryption.ts)
- 2 Type definition files (.ts, .d.ts)
- 1 Context file (ThemeContext.tsx)
- 15 CSS files
- 4 Configuration files (package.json, tsconfig, vite.config, electron-builder)

The file is located at: **`d:\Twitter app\temp\readonly\REACT_ELECTRON_STRUCTURE.md`**
