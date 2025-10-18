/**
 * Encryption utilities for secure data transmission
 */

import crypto from "crypto";

/**
 * Generate encryption key from device data
 * @param cpuModel - CPU model from device fingerprint
 * @param ipAddress - Client IP address
 * @returns Buffer - 32-byte encryption key
 */
export function generateDeviceKey(cpuModel: string, ipAddress: string): Buffer {
  // Combine CPU model and IP address
  const combinedData = `${cpuModel}:${ipAddress}`;

  // Create SHA-256 hash
  const hash = crypto.createHash("sha256");
  hash.update(combinedData);

  // Return first 32 bytes as key
  return hash.digest().subarray(0, 32);
}

/**
 * Encrypt data using device key
 * @param data - Data to encrypt
 * @param key - Encryption key (from generateDeviceKey)
 * @returns string - Encrypted data as base64 string
 */
export function encryptData(data: unknown, key: Buffer): string {
  try {
    // Convert data to JSON string
    const jsonData = JSON.stringify(data);
    
    // Generate random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher using AES-256-CBC
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(jsonData, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // Combine IV and encrypted data
    const combined = iv.toString("hex") + ":" + encrypted;
    
    return Buffer.from(combined).toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt data using device key
 * @param encryptedData - Encrypted data as base64 string
 * @param key - Decryption key (from generateDeviceKey)
 * @returns unknown - Decrypted data
 */
export function decryptData(encryptedData: string, key: Buffer): unknown {
  try {
    // Decode base64
    const combined = Buffer.from(encryptedData, "base64").toString("utf8");
    
    // Split IV and encrypted data
    const [ivHex, encrypted] = combined.split(":");
    
    if (!ivHex || !encrypted) {
      throw new Error("Invalid encrypted data format");
    }
    
    // Convert IV from hex
    const iv = Buffer.from(ivHex, "hex");
    
    // Create decipher using AES-256-CBC
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    // Parse JSON
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Create a secure hash for verification
 * @param data - Data to hash
 * @param key - Key for HMAC
 * @returns string - HMAC-SHA256 hash
 */
export function createVerificationHash(data: unknown, key: Buffer): string {
  const jsonData = JSON.stringify(data);
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(jsonData);
  return hmac.digest("hex");
}

/**
 * Verify data integrity using HMAC
 * @param data - Data to verify
 * @param hash - Expected hash
 * @param key - Key for HMAC
 * @returns boolean - True if verification successful
 */
export function verifyData(data: unknown, hash: string, key: Buffer): boolean {
  try {
    const expectedHash = createVerificationHash(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}
