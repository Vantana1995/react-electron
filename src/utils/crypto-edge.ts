/**
 * Edge Runtime Compatible Crypto Utilities
 * Uses Web Crypto API instead of Node.js crypto module
 */

// Simple encryption keys for testing
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  "1111111111111111111111111111111111111111111111111111111111111111";
const FINGERPRINT_SALT =
  process.env.FINGERPRINT_SALT ||
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * SHA-256 hash using Web Crypto API
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return uint8ArrayToHex(new Uint8Array(hashBuffer));
}

/**
 * Generate Step 1 hash from primary device characteristics
 * Formula: SHA-256(salt + cpu.model + gpu.string + os.architecture + salt)
 */
export async function generateStep1Hash(deviceData: {
  cpu: { model?: string };
  gpu: { renderer: string };
  os: { architecture: string };
}): Promise<string> {
  // Combine primary device characteristics
  const step1Data = `${deviceData.cpu.model || "unknown"}:${
    deviceData.gpu.renderer
  }:${deviceData.os.architecture}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + step1Data + FINGERPRINT_SALT;

  return await sha256(saltedData);
}

/**
 * Generate Step 2 hash from secondary device characteristics
 * Formula: SHA-256(salt + cpu.architecture + gpu.memory + os.platform + salt)
 */
export async function generateStep2Hash(deviceData: {
  cpu: { architecture: string };
  gpu: { memory?: number };
  os: { platform: string };
}): Promise<string> {
  // Combine secondary device characteristics
  const step2Data = `${deviceData.cpu.architecture}:${
    deviceData.gpu.memory || 0
  }:${deviceData.os.platform}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + step2Data + FINGERPRINT_SALT;

  return await sha256(saltedData);
}

/**
 * Generate final device hash with IP address (Step 3)
 * Formula: SHA-256(salt + step1Hash + step2Hash + ipAddress + salt)
 */
export async function generateFinalDeviceHash(
  step1Hash: string,
  step2Hash: string,
  ipAddress: string
): Promise<string> {
  // Combine all hashes with IP
  const finalData = `${step1Hash}:${step2Hash}:${ipAddress}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + finalData + FINGERPRINT_SALT;

  return await sha256(saltedData);
}

/**
 * Generate client verification hash for server callback
 * Formula: SHA-256(salt + cpu.cores + gpu.vendor + memory.total + nonce + salt)
 */
export async function generateClientVerificationHash(verificationData: {
  cpu: { cores: number };
  gpu: { vendor: string };
  memory: { total: number };
  nonce: number;
}): Promise<string> {
  // Combine verification data
  const verifyData = `${verificationData.cpu.cores}:${verificationData.gpu.vendor}:${verificationData.memory.total}:${verificationData.nonce}`;

  // Apply salt and hash
  const saltedData = FINGERPRINT_SALT + verifyData + FINGERPRINT_SALT;

  return await sha256(saltedData);
}

/**
 * Generate session token using Web Crypto API
 */
export async function generateSessionToken(
  deviceHash: string
): Promise<string> {
  const payload = {
    deviceHash,
    timestamp: Date.now(),
    random: uint8ArrayToHex(crypto.getRandomValues(new Uint8Array(16))),
  };

  const token = btoa(JSON.stringify(payload));

  // Create HMAC signature using Web Crypto API
  const key = await crypto.subtle.importKey(
    "raw",
    stringToUint8Array(ENCRYPTION_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    stringToUint8Array(token)
  );
  const signatureHex = uint8ArrayToHex(new Uint8Array(signature));

  return `${token}.${signatureHex}`;
}

/**
 * Verify session token using Web Crypto API
 */
interface SessionPayload {
  deviceHash: string;
  timestamp: number;
  random: string;
}

export async function verifySessionToken(token: string): Promise<{
  valid: boolean;
  payload?: SessionPayload;
}> {
  try {
    const [tokenPart, signature] = token.split(".");

    if (!tokenPart || !signature) {
      return { valid: false };
    }

    // Verify signature using Web Crypto API
    const key = await crypto.subtle.importKey(
      "raw",
      stringToUint8Array(ENCRYPTION_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBuffer = hexToUint8Array(signature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      stringToUint8Array(tokenPart)
    );

    if (!isValid) {
      return { valid: false };
    }

    // Decode payload
    const payload = JSON.parse(atob(tokenPart)) as SessionPayload;

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
 * Generate secure random string using Web Crypto API
 */
export function generateRandomString(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return uint8ArrayToHex(bytes);
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
  const random = uint8ArrayToHex(crypto.getRandomValues(new Uint8Array(16)));
  return `${timestamp}:${random}`;
}

/**
 * Verify challenge response (simple proof-of-work)
 */
export async function verifyChallenge(
  challenge: string,
  response: string,
  difficulty: number = 4
): Promise<boolean> {
  const expectedHash = await sha256(challenge + response);
  return expectedHash.startsWith("0".repeat(difficulty));
}

/**
 * Generate CSRF token using Web Crypto API
 */
export function generateCSRFToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Secure compare strings (prevents timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const cryptoEdgeUtils = {
  generateStep1Hash,
  generateStep2Hash,
  generateFinalDeviceHash,
  generateClientVerificationHash,
  generateSessionToken,
  verifySessionToken,
  generateRandomString,
  generateNonce,
  verifyNonce,
  generateChallenge,
  verifyChallenge,
  generateCSRFToken,
  secureCompare,
};

export default cryptoEdgeUtils;


