/**
 * Twitter Automation Platform - Global Types and Interfaces
 * TypeScript definitions for all components and services
 */

// ===== WALLET AUTHENTICATION =====

export interface WalletConnectionStatus {
  isConnected: boolean;
  walletAddress?: string;
  sessionToken?: string;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  sessionToken?: string;
  authUrl?: string;
  error?: string;
  message?: string;
}

export interface SessionToken {
  token: string;
  createdAt: number;
  status: "pending" | "connected" | "disconnected";
  walletAddress?: string;
  connectedAt?: number;
}

// ===== DEVICE FINGERPRINTING =====

export interface DeviceFingerprint {
  cpu: {
    cores: number;
    architecture: string;
    model?: string;
  };
  gpu: {
    renderer: string;
    vendor: string;
    memory?: number;
  };
  system: {
    platform: string;
    version: string;
    architecture: string;
    language: string;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    dpi: number;
  };
  network: {
    ip?: string;
    timezone: string;
    timezoneOffset: number;
  };
  browser: {
    userAgent: string;
    languages?: readonly string[];
    webgl?: string;
    canvas?: string;
    audio?: string;
  };
}

export interface DeviceData {
  fingerprint: DeviceFingerprint;
  hash: string;
  timestamp: number;
  nonce?: number;
}

// ===== SERVER COMMUNICATION =====

export interface ServerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface ServerCallbackInstruction {
  action: string;
  data?: {
    nonce?: number;
    script?: ScriptData;
    nft?: NFTData;
    message?: string;
    [key: string]: unknown;
  };
}

export interface ServerCallback {
  instruction: ServerCallbackInstruction;
  timestamp: number;
}

export interface PingData {
  action: "ping_data" | "counter_update" | "nft_data";
  data?: unknown;
  timestamp: number;
}

// ===== SCRIPT EXECUTION =====

export interface ScriptData {
  id: string;
  name: string;
  code?: string;
  content?: string;
  version: string;
  ipfsHash?: string;
  features: string[];
  maxProfiles?: number; // Maximum profiles allowed for this specific script
  metadata?: {
    description?: string;
    author?: string;
    created?: string;
    updated?: string;
    entryPoint?: string;
    category?: string;
  };
}

export interface ScriptExecutionContext {
  deviceHash: string;
  sessionToken: string;
  subscriptionStatus: SubscriptionStatus;
  features: string[];
}

export interface ScriptExecutionParams {
  scriptCode: string;
  scriptName: string;
  params: {
    walletAddress?: string;
    deviceHash?: string;
    [key: string]: unknown;
  };
}

export interface ScriptExecutionResult {
  success: boolean;
  result?: string;
  error?: string;
  scriptId?: string;
}

export interface ActiveScript {
  id: string;
  name: string;
  startTime: number;
  status: "running" | "completed" | "error";
  pid?: number;
  running: boolean;
}

export interface ScriptOutput {
  scriptId: string;
  type: "stdout" | "stderr";
  data: string;
  timestamp: number;
}


// ===== NFT & SUBSCRIPTION =====

export interface NFTData {
  address?: string;
  image: string;
  metadata?: {
    name?: string;
    description?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  timestamp?: number;
  subscription?: {
    maxProfiles: number;
    subscriptionLevel: string;
    features: string[];
  };
}

export interface SubscriptionStatus {
  isActive: boolean;
  type?: "basic" | "premium" | "enterprise";
  features: string[];
  expiresAt?: number;
  nftAddress?: string;
}


// ===== UI STATE MANAGEMENT =====

export interface AppState {
  wallet: WalletState;
  system: SystemState;
  logs: LogEntry[];
  nft: NFTState;
  timer: TimerState;
  script: ScriptState;
  profiles: ProfileState;
}

export interface WalletState {
  status: WalletConnectionStatus;
  connecting: boolean;
  error?: string;
}

export interface SystemState {
  connected: boolean;
  status: "initializing" | "ready" | "error" | "disconnected";
  message: string;
  deviceHash?: string;
  nonce?: number;
  lastPing?: number;
}

export interface NFTState {
  data?: NFTData;
  visible: boolean;
  loading: boolean;
}

export interface TimerState {
  value: number;
  running: boolean;
  timeout: number; // seconds until app closes
}

export interface ScriptState {
  data?: ScriptData;
  available: boolean;
  executing?: boolean;
}

export interface RunningScript {
  scriptId: string;
  profileId: string;
  profileName: string;
  startTime: number;
  headless: boolean;
  nftImage?: string; // Optional NFT image for display
  scriptName?: string; // Optional script name for display
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "success" | "error" | "warning";
  message: string;
  details?: unknown;
}

// ===== ELECTRON IPC =====

export interface ElectronAPI {
  // Device data
  setDeviceData: (deviceData: DeviceData) => Promise<{ success: boolean }>;
  getSystemInfo?: () => Promise<{
    success: boolean;
    memory?: { total: number };
    cpu?: { model: string; cores: number; architecture: string };
    os?: { platform: string; release: string; architecture: string };
  }>;

  // Wallet authentication
  startWalletAuth: () => Promise<AuthResult>;
  getWalletStatus: (sessionToken: string) => Promise<WalletConnectionStatus>;
  disconnectWallet: (
    sessionToken: string
  ) => Promise<{ success: boolean; message: string }>;

  // Event listeners
  onWalletConnected: (
    callback: (data: { address: string; sessionToken?: string }) => void
  ) => void;
  onAuthReady: (
    callback: (data: { success: boolean; message?: string }) => void
  ) => void;
  onServerPingReceived: (callback: (data: PingData) => void) => void;
  onNFTReceived: (
    callback: (data: NFTData & { action: string }) => void
  ) => void;
  onScriptReceived: (
    callback: (data: {
      action: string;
      script: ScriptData;
      timestamp: number;
    }) => void
  ) => void;

  // Remove listeners
  removeAllListeners: (channel: string) => void;

  // Application control
  closeApp: () => Promise<{ success: boolean; message: string }>;

  // Script execution and management
  executeScript: (params: {
    script: ScriptData;
    settings?: any;
    nftAddress?: string;
  }) => Promise<ScriptExecutionResult>;
  getActiveScripts: () => Promise<{
    success: boolean;
    scripts?: ActiveScript[];
    error?: string;
  }>;
  stopScript: (scriptId: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  // Script execution event listeners
  onScriptOutput: (callback: (data: ScriptOutput) => void) => void;
  onScriptFinished: (
    callback: (data: {
      scriptId: string;
      exitCode: number;
      success: boolean;
      output: string;
      error: string;
      timestamp: number;
      proxyAddress?: string;
    }) => void
  ) => void;
  onScriptError: (
    callback: (data: {
      scriptId: string;
      error: string;
      timestamp: number;
      proxyAddress?: string;
    }) => void
  ) => void;
  onScriptStopped: (
    callback: (data: {
      scriptId: string;
      timestamp: number;
      reason?: string;
      proxyAddress?: string;
    }) => void
  ) => void;

  // Cookie collection
  collectCookies: (
    profile: UserProfile,
    options: CookieCollectionOptions
  ) => Promise<CookieCollectionResult>;
  onCookieCollectionProgress: (
    callback: (progress: CookieCollectionProgress) => void
  ) => () => void; // Returns cleanup function
  cancelCookieCollection: (profileId: string) => Promise<{ success: boolean; message?: string }>;
}

// ===== COMPONENT PROPS =====

export interface SearchQueryBuilderProps {
  onUseInScript?: (url: string) => void;
  profileContext?: {
    profileName: string;
    existingUrl?: string;
  };
}

export interface SearchQueryState {
  // Basic
  orGroups: string[][]; // Array of OR groups with AND logic between them
  exactPhrases: string[];
  notWords: string[];

  // Account
  from: string[];
  to: string[];

  // Content Filters
  isVerified: boolean;
  isRetweet: boolean;
  isQuote: boolean;
  isReply: boolean;
  excludeRetweets: boolean;
  excludeReplies: boolean;
}

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  prefix?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  className?: string;
}

// ===== PROFILE MANAGEMENT =====

export interface ProfileProxy {
  login: string;
  password: string;
  ip: string;
  port: number;
  country?: string;    // Auto-detected country code (US, GB, DE, etc.)
  timezone?: string;   // Auto-detected timezone (America/New_York, Europe/London)
}

export interface ProfileCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Telegram Bot Configuration
 * Stores bot API credentials and connection status
 */
export interface TelegramBotConfig {
  httpApi: string; // Bot HTTP API token from @BotFather
  chatId: string; // User's chat ID for sending messages
  botName?: string; // Optional bot name for display
  connected: boolean; // Connection status
  connectedAt?: number; // Timestamp when bot was connected
}

/**
 * Browser Fingerprint for anti-detection
 * Each profile has unique fingerprint stored in file and localStorage
 */
export interface Fingerprint {
  webgl: { vendor: string; renderer: string };
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  screen: { width: number; height: number; colorDepth: number; pixelDepth: number };
  languages: string[];
  timezone: string;
  userAgent: string;
  canvasNoise: number;
  audioNoise: number;
  battery: { charging: boolean; level: number };
}

/**
 * Proxy location data (detected by IP)
 */
export interface ProxyLocation {
  country: string;      // US, GB, DE, etc.
  timezone: string;     // America/New_York, Europe/London
  countryName: string;  // United States, United Kingdom
}

export interface DailyStats {
  date: string; // "2025-10-26" (YYYY-MM-DD)
  tweetsProcessed: number; // Number of tweets processed today
  lastReset: number; // Timestamp of last reset
}

export interface UserProfile {
  id: string;
  name: string;
  proxy: ProfileProxy;
  cookies: ProfileCookie[];
  navigationUrl?: string; // Search query URL configured for this profile
  telegram?: TelegramBotConfig; // Optional Telegram bot configuration
  viewport?: { width: number; height: number }; // Browser viewport size
  fingerprint?: Fingerprint; // Browser fingerprint for anti-detection
  createdAt: number;
  updatedAt: number;
  isActive: boolean;

  // Daily statistics and limits
  dailyStats?: DailyStats; // Statistics for today
  maxTweetsPerDay?: number; // Maximum tweets to process per day (0 = unlimited)
}

export interface ProfileState {
  profiles: UserProfile[];
  selectedProfile?: UserProfile;
  showAddModal: boolean;
  maxProfiles: number;
  runningScripts: string[]; // Array of profile IDs that have running scripts
}

export interface ProfileCardProps {
  profile: UserProfile;
  onEdit: (profile: UserProfile) => void;
  onDelete: (profileId: string) => void;
  onSelect: (profile: UserProfile) => void;
  onBuildQuery?: (profile: UserProfile) => void;
  onClearHistory?: (profile: UserProfile) => void;
  onAddTelegramBot?: (profile: UserProfile) => void;
  onCollectCookies?: (profile: UserProfile) => void;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export interface ProfileManagerProps {
  profiles: UserProfile[];
  onProfileCreate: (
    profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "isActive">
  ) => void;
  onProfileUpdate: (profile: UserProfile) => void;
  onProfileDelete: (profileId: string) => void;
  onProfileSelect: (profile: UserProfile) => void;
  selectedProfile?: UserProfile;
  maxProfiles: number;
  onBuildQuery?: (profile: UserProfile) => void;
  onClearHistory?: (profile: UserProfile) => void;
  onAddTelegramBot?: (profile: UserProfile) => void;
}

/**
 * Props for AddTelegramBotModal component
 */
export interface AddTelegramBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (telegramConfig: TelegramBotConfig) => void;
  profile: UserProfile;
  existingConfig?: TelegramBotConfig;
}

/**
 * Telegram API response types
 */
export interface TelegramGetUpdatesResponse {
  ok: boolean;
  result: Array<{
    update_id: number;
    message?: {
      message_id: number;
      from: {
        id: number;
        is_bot: boolean;
        first_name: string;
        username?: string;
        language_code?: string;
      };
      chat: {
        id: number;
        first_name: string;
        username?: string;
        type: string;
      };
      date: number;
      text: string;
    };
  }>;
}

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      first_name: string;
      username?: string;
      type: string;
    };
    date: number;
    text: string;
  };
  description?: string;
}

export const PROFILE_STORAGE_KEY = "twitter_automation_profiles";

// ===== COOKIE COLLECTION SYSTEM =====

/**
 * Site action types for human behavior simulation
 */
export type SiteActionType =
  | 'scroll'
  | 'clickVideo'
  | 'clickArticle'
  | 'clickProduct'
  | 'clickPost'
  | 'clickQuestion'
  | 'clickRepo'
  | 'clickPin'
  | 'search'
  | 'watchPartial';

/**
 * Site action definition
 */
export interface SiteAction {
  type: SiteActionType;
  selector?: string;
  scrollAmount?: number;
  waitTime?: number;
}

/**
 * Configuration for a site to visit during cookie collection
 */
export interface SiteConfig {
  name: string;
  url: string;
  cookieSelectors: string[]; // Selectors for cookie accept buttons
  actions: SiteAction[]; // Actions to perform on the site
}

/**
 * Options for cookie collection
 */
export interface CookieCollectionOptions {
  sitesCount: number; // Number of sites to visit (5-15)
  headless: boolean; // Browser mode (true = headless, false = visible)
  customSites?: string[]; // Custom site URLs to visit
  useDefaultSites: boolean; // Whether to use default sites
}

/**
 * Progress update during cookie collection
 */
export interface CookieCollectionProgress {
  currentSite: string; // Name of current site being visited
  currentUrl: string; // URL of current site
  sitesVisited: number; // Number of sites visited so far
  totalSites: number; // Total number of sites to visit
  cookiesCollected: number; // Number of cookies collected so far
  timeElapsed: number; // Time elapsed in seconds
  estimatedTimeRemaining: number; // Estimated time remaining in seconds
  status: 'running' | 'completed' | 'error' | 'cancelled';
  error?: string; // Error message if status is 'error'
  percentage: number; // Completion percentage (0-100)
}

/**
 * Result of cookie collection
 */
export interface CookieCollectionResult {
  success: boolean;
  cookiesCollected: ProfileCookie[];
  totalCookies: number;
  sitesVisited: number;
  totalSites: number;
  timeElapsed: number;
  errors: string[];
}

/**
 * Stats for cookie collection completion
 */
export interface CookieCollectionStats {
  sitesVisited: number;
  totalSites: number;
  cookiesCollected: number;
  timeElapsed: number; // in seconds
  errors: string[];
}

// ===== GLOBAL DECLARATIONS =====

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
