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
}

// ===== COMPONENT PROPS =====

export interface ScriptManagerProps {
  scriptData?: ScriptData;
  walletAddress?: string;
  deviceHash?: string;
  onScriptStart?: (scriptId: string) => void;
  onScriptStop?: (scriptId: string) => void;
  onScriptOutput?: (output: ScriptOutput) => void;
}

export interface ScriptNFTMapping {
  scriptId: string;
  image: string;
  associatedAt: number;
}

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

export interface UserProfile {
  id: string;
  name: string;
  proxy: ProfileProxy;
  cookies: ProfileCookie[];
  navigationUrl?: string; // Search query URL configured for this profile
  telegram?: TelegramBotConfig; // Optional Telegram bot configuration
  viewport?: { width: number; height: number }; // Browser viewport size
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface ProfileState {
  profiles: UserProfile[];
  selectedProfile?: UserProfile;
  showAddModal: boolean;
  maxProfiles: number;
  runningScripts: string[]; // Array of profile IDs that have running scripts
}

export interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "isActive">
  ) => void;
  existingProfiles: UserProfile[];
  editingProfile?: UserProfile;
}

export interface ProfileCardProps {
  profile: UserProfile;
  onEdit: (profile: UserProfile) => void;
  onDelete: (profileId: string) => void;
  onSelect: (profile: UserProfile) => void;
  onBuildQuery?: (profile: UserProfile) => void;
  onClearHistory?: (profile: UserProfile) => void;
  onAddTelegramBot?: (profile: UserProfile) => void;
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

// ===== GLOBAL DECLARATIONS =====

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
