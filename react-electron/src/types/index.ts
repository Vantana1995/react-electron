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
  metadata?: {
    description?: string;
    author?: string;
    created?: string;
    updated?: string;
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

export interface ScriptEvent {
  scriptId: string;
  type: "started" | "output" | "error" | "finished" | "stopped";
  data?: string;
  timestamp: number;
  exitCode?: number;
}

// ===== NFT & SUBSCRIPTION =====

export interface NFTData {
  address: string;
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

export interface PaymentData {
  transactionHash: string;
  walletAddress: string;
  amount: string;
  currency: string;
  timestamp: number;
  subscriptionType: string;
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

  // Wallet authentication
  startWalletAuth: () => Promise<AuthResult>;
  getWalletStatus: (sessionToken: string) => Promise<WalletConnectionStatus>;
  disconnectWallet: (
    sessionToken: string
  ) => Promise<{ success: boolean; message: string }>;

  // Callback server management
  getCallbackServerStatus: () => Promise<{
    success: boolean;
    isRunning: boolean;
    port?: number;
  }>;
  startCallbackServer: () => Promise<{
    success: boolean;
    message: string;
    port?: number;
  }>;
  stopCallbackServer: () => Promise<{ success: boolean; message: string }>;

  // Event listeners
  onWalletConnected: (
    callback: (data: { address: string; sessionToken?: string }) => void
  ) => void;
  onAuthReady: (
    callback: (data: { success: boolean; message?: string }) => void
  ) => void;
  onServerPingReceived: (callback: (data: PingData) => void) => void;
  onPingCounterUpdate: (
    callback: (data: { nonce: number; timestamp: number }) => void
  ) => void;
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
  executeScript: (
    params: {
      script: ScriptData;
      settings?: any;
      nftAddress?: string;
    }
  ) => Promise<ScriptExecutionResult>;
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
    }) => void
  ) => void;
  onScriptError: (
    callback: (data: {
      scriptId: string;
      error: string;
      timestamp: number;
    }) => void
  ) => void;
  onScriptStopped: (
    callback: (data: { scriptId: string; timestamp: number }) => void
  ) => void;
}

// ===== COMPONENT PROPS =====

export interface WalletComponentProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}


export interface LogComponentProps {
  logs: LogEntry[];
  maxEntries?: number;
}

export interface NFTDisplayProps {
  nft: NFTState;
  onImageClick?: (nftData: NFTData) => void;
}

export interface TimerDisplayProps {
  timer: TimerState;
  onTimeout?: () => void;
}

export interface ScriptManagerProps {
  scriptData?: ScriptData;
  walletAddress?: string;
  deviceHash?: string;
  onScriptStart?: (scriptId: string) => void;
  onScriptStop?: (scriptId: string) => void;
  onScriptOutput?: (output: ScriptOutput) => void;
}

// ===== API ENDPOINTS =====

export interface APIEndpoints {
  fingerprint: "/api/auth/fingerprint";
  verify: "/api/auth/verify";
  backupEmails: "/api/auth/backup-emails";
  deliverScripts: "/api/scripts/deliver";
  verifyPayment: "/api/payments/verify-payment";
  subscription: "/api/payments/subscription";
  activity: "/api/analytics/activity";
  keepAlive: "/api/websocket/keepalive";
}

// ===== CONFIGURATION =====

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  security: {
    pingInterval: number; // seconds
    timeoutThreshold: number; // seconds
    maxRetries: number;
  };
  ui: {
    logMaxEntries: number;
    animationDuration: number;
  };
  development: {
    enableDevTools: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
  };
}

// ===== UTILITY TYPES =====

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// ===== ERROR TYPES =====

export interface AppError {
  code: string;
  message: string;
  stack?: string;
  timestamp: number;
  context?: unknown;
}

export interface ValidationError extends AppError {
  code: "VALIDATION_ERROR";
  field?: string;
  value?: unknown;
}

export interface NetworkError extends AppError {
  code: "NETWORK_ERROR";
  status?: number;
  url?: string;
}

export interface SecurityError extends AppError {
  code: "SECURITY_ERROR";
  reason:
    | "debugging_detected"
    | "timeout"
    | "invalid_fingerprint"
    | "unauthorized";
}

// ===== CONSTANTS =====

export const WALLET_STATES = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export const SYSTEM_STATES = {
  INITIALIZING: "initializing",
  READY: "ready",
  ERROR: "error",
  DISCONNECTED: "disconnected",
} as const;

export const LOG_LEVELS = {
  INFO: "info",
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
} as const;

export const PING_ACTIONS = {
  VERIFY_CONNECTION: "verify_connection",
  PING_DATA: "ping_data",
  COUNTER_UPDATE: "counter_update",
  NFT_DATA: "nft_data",
} as const;

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

export interface UserProfile {
  id: string;
  name: string;
  proxy: ProfileProxy;
  cookies: ProfileCookie[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface ProfileState {
  profiles: UserProfile[];
  selectedProfile?: UserProfile;
  showAddModal: boolean;
  maxProfiles: number;
}

export interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "isActive">) => void;
  existingProfiles: UserProfile[];
}

export interface ProfileCardProps {
  profile: UserProfile;
  onEdit: (profile: UserProfile) => void;
  onDelete: (profileId: string) => void;
  onSelect: (profile: UserProfile) => void;
  onToggleActivation: (profileId: string) => void;
  isSelected: boolean;
  maxActiveProfiles: number;
}

export interface ProfileManagerProps {
  profiles: UserProfile[];
  onProfileCreate: (profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "isActive">) => void;
  onProfileUpdate: (profile: UserProfile) => void;
  onProfileDelete: (profileId: string) => void;
  onProfileSelect: (profile: UserProfile) => void;
  onProfileToggleActivation: (profileId: string) => void;
  selectedProfile?: UserProfile;
  maxProfiles: number;
}

export const PROFILE_STORAGE_KEY = "twitter_automation_profiles";

// ===== GLOBAL DECLARATIONS =====

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
