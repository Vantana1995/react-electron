import crypto from "crypto";
import CryptoJS from "crypto-js";

// Simple encryption keys for testing
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  "1111111111111111111111111111111111111111111111111111111111111111";
const FINGERPRINT_SALT =
  process.env.FINGERPRINT_SALT ||
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Generate Step 1 hash from primary device characteristics
 * Formula: SHA-256(salt + cpu.model + gpu.string + os.architecture + webgl + salt)
 */
export function generateStep1Hash(deviceData: {
  cpu: { model?: string };
  gpu: { renderer: string };
  os: { architecture: string };
  webgl?: string;
}): string {
  // Combine primary device characteristics
  const step1Data = `${deviceData.cpu.model || "unknown"}:${
    deviceData.gpu.renderer
  }:${deviceData.os.architecture}:${deviceData.webgl || "no-webgl"}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + step1Data + FINGERPRINT_SALT;

  return crypto.createHash("sha256").update(saltedData).digest("hex");
}

/**
 * Generate Step 2 hash from secondary device characteristics
 * Formula: SHA-256(salt + cpu.architecture + gpu.memory + os.platform + salt)
 */
export function generateStep2Hash(deviceData: {
  cpu: { architecture: string };
  gpu: { memory?: number };
  os: { platform: string };
}): string {
  // Combine secondary device characteristics
  const step2Data = `${deviceData.cpu.architecture}:${
    deviceData.gpu.memory || 0
  }:${deviceData.os.platform}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + step2Data + FINGERPRINT_SALT;

  return crypto.createHash("sha256").update(saltedData).digest("hex");
}

/**
 * Generate final device hash with IP address (Step 3)
 * Formula: SHA-256(salt + step1Hash + step2Hash + ipAddress + salt)
 */
export function generateFinalDeviceHash(
  step1Hash: string,
  step2Hash: string,
  ipAddress: string
): string {
  // Combine all hashes with IP
  const finalData = `${step1Hash}:${step2Hash}:${ipAddress}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + finalData + FINGERPRINT_SALT;

  return crypto.createHash("sha256").update(saltedData).digest("hex");
}

/**
 * Generate client verification hash for server callback
 * Formula: SHA-256(salt + cpu.cores + gpu.vendor + memory.total + nonce + salt)
 */
export function generateClientVerificationHash(verificationData: {
  cpu: { cores: number };
  gpu: { vendor: string };
  memory: { total: number };
  nonce: number;
}): string {
  // Combine verification data
  const verifyData = `${verificationData.cpu.cores}:${verificationData.gpu.vendor}:${verificationData.memory.total}:${verificationData.nonce}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + verifyData + FINGERPRINT_SALT;

  return crypto.createHash("sha256").update(saltedData).digest("hex");
}

/**
 * Generate session token
 */
export function generateSessionToken(deviceHash: string): string {
  const payload = {
    deviceHash,
    timestamp: Date.now(),
    random: crypto.randomBytes(16).toString("hex"),
  };

  const token = Buffer.from(JSON.stringify(payload)).toString("base64");

  // Sign the token with HMAC
  const signature = crypto
    .createHmac("sha256", ENCRYPTION_KEY)
    .update(token)
    .digest("hex");

  return `${token}.${signature}`;
}

/**
 * Verify session token
 */
interface SessionPayload {
  deviceHash: string;
  timestamp: number;
  random: string;
}

export function verifySessionToken(token: string): {
  valid: boolean;
  payload?: SessionPayload;
} {
  try {
    const [tokenPart, signature] = token.split(".");

    if (!tokenPart || !signature) {
      return { valid: false };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", ENCRYPTION_KEY)
      .update(tokenPart)
      .digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(tokenPart, "base64").toString("utf8")
    ) as SessionPayload;

    // Check if token is not expired (24 hours)
    const tokenAge = Date.now() - payload.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (tokenAge > maxAge) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Encrypt sensitive data
 */
export function encryptData(data: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch {
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error("Decryption resulted in empty string");
    }

    return decrypted;
  } catch {
    throw new Error("Decryption failed");
  }
}

/**
 * Generate secure random string
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate nonce for additional security
 * Similar to blockchain nonce but for device authentication
 */
export function generateNonce(): number {
  // Generate random nonce between 100000 and 999999 (6 digits)
  return Math.floor(Math.random() * 900000) + 100000;
}

/**
 * Verify nonce against stored value
 */
export function verifyNonce(
  providedNonce: number,
  storedNonce: number,
  tolerance: number = 5
): boolean {
  // Allow small tolerance for network delays/clock differences
  return Math.abs(providedNonce - storedNonce) <= tolerance;
}

/**
 * Generate challenge for proof-of-work style verification
 */
export function generateChallenge(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString("hex");
  return `${timestamp}:${random}`;
}

/**
 * Verify challenge response (simple proof-of-work)
 */
export function verifyChallenge(
  challenge: string,
  response: string,
  difficulty: number = 4
): boolean {
  const expectedHash = crypto
    .createHash("sha256")
    .update(challenge + response)
    .digest("hex");
  return expectedHash.startsWith("0".repeat(difficulty));
}

/**
 * Hash password with bcrypt (if needed for admin users)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
}

/**
 * Verify password hash
 */
export function verifyPassword(
  password: string,
  hashedPassword: string
): boolean {
  try {
    const [salt, hash] = hashedPassword.split(":");
    const hashVerify = crypto
      .pbkdf2Sync(password, salt, 10000, 64, "sha512")
      .toString("hex");

    return hash === hashVerify;
  } catch {
    return false;
  }
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  return "pk_" + crypto.randomBytes(32).toString("hex");
}

/**
 * Secure compare strings (prevents timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("base64");
}

const cryptoUtils = {
  generateStep1Hash,
  generateStep2Hash,
  generateFinalDeviceHash,
  generateClientVerificationHash,
  generateSessionToken,
  verifySessionToken,
  encryptData,
  decryptData,
  generateRandomString,
  generateNonce,
  verifyNonce,
  generateChallenge,
  verifyChallenge,
  hashPassword,
  verifyPassword,
  generateApiKey,
  secureCompare,
  generateCSRFToken,
};

export default cryptoUtils;
