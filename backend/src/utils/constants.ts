// API Response Constants (removed unused API_STATUS)

// Error Codes
export const ERROR_CODES = {
  // Authentication
  INVALID_FINGERPRINT: "INVALID_FINGERPRINT",
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  UNAUTHORIZED: "UNAUTHORIZED",

  // Subscription
  SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
  SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND",
  PAYMENT_VERIFICATION_FAILED: "PAYMENT_VERIFICATION_FAILED",
  INSUFFICIENT_PRIVILEGES: "INSUFFICIENT_PRIVILEGES",

  // Scripts
  SCRIPT_NOT_FOUND: "SCRIPT_NOT_FOUND",
  IPFS_FETCH_FAILED: "IPFS_FETCH_FAILED",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",

  // General
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

// Dynamic NFT-Based Subscription Configuration
export const SUBSCRIPTION_CONFIG = {
  // Free tier (no NFT ownership)
  FREE_MAX_PROFILES: 1,

  // NFT holder tier (owns at least one NFT from scripts_library)
  NFT_HOLDER_MAX_PROFILES: 5,

  // NFT cache duration (30 days in hours)
  NFT_CACHE_DURATION_HOURS: 30 * 24,

  // Subscription levels
  LEVELS: {
    FREE: "free",
    NFT_HOLDER: "nft_holder",
  },
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 10, // stricter for auth endpoints
  },
  SCRIPTS: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // allow more frequent script requests
  },
} as const;

// Security Constants
export const SECURITY = {
  FINGERPRINT_SALT_ROUNDS: 12,
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  KEEPALIVE_INTERVAL: 30 * 1000, // 30 seconds
  KEEPALIVE_TIMEOUT: 40 * 1000, // 40 seconds
  MAX_BACKUP_EMAILS: 5,
  SCRIPT_EXECUTION_TIMEOUT: 300 * 1000, // 5 minutes
} as const;

// Blockchain Constants
export const BLOCKCHAIN = {
  SUPPORTED_NETWORKS: ["ethereum", "polygon", "arbitrum"],
  PAYMENT_CONFIRMATION_BLOCKS: 3,
  WEBHOOK_RETRY_ATTEMPTS: 3,
} as const;

// IPFS Constants
export const IPFS = {
  GATEWAY_TIMEOUT: 10 * 1000, // 10 seconds
  MAX_SCRIPT_SIZE: 5 * 1024 * 1024, // 5MB
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour
} as const;

// CORS Configuration
export const CORS_CONFIG = {
  // Admin IP addresses with full access (IPv4 only)
  ADMIN_IPS: process.env.ADMIN_IPS
    ? process.env.ADMIN_IPS.split(",").map((ip) => ip.trim())
    : [
        process.env.ADMIN_IP_ADDRESS, // Fallback to single admin IP
        "127.0.0.1", // IPv4 localhost
        "localhost",
      ],

  // HTTP methods allowed for admin IPs
  ADMIN_METHODS: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
    "HEAD",
  ] as string[],

  // HTTP methods allowed for regular users
  USER_METHODS: ["GET", "POST", "OPTIONS"] as string[],

  // Allowed headers
  ALLOWED_HEADERS: [
    "Content-Type",
    "Authorization",
    "X-Device-Hash",
    "X-Session-Token",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],

  // Exposed headers
  EXPOSED_HEADERS: [
    "X-Total-Count",
    "X-Rate-Limit-Remaining",
    "X-Rate-Limit-Reset",
  ],
} as const;
