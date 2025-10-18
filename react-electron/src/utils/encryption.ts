/**
 * Encryption utilities for frontend
 * Mirrors backend encryption/decryption logic
 */

import CryptoJS from "crypto-js";

/**
 * Generate device key from CPU model and IP address
 * @param cpuModel - CPU model from device fingerprint
 * @param ipAddress - Client IP address
 * @returns string - 32-byte encryption key as hex string
 */
export function generateDeviceKey(cpuModel: string, ipAddress: string): string {
  // Combine CPU model and IP address
  const combinedData = `${cpuModel}:${ipAddress}`;

  // Create SHA-256 hash
  const hash = CryptoJS.SHA256(combinedData);

  // Return first 32 bytes as hex string
  return hash.toString().substring(0, 64); // 32 bytes = 64 hex chars
}

/**
 * Decrypt data using device key
 * @param encryptedData - Encrypted data as base64 string
 * @param key - Decryption key (from generateDeviceKey)
 * @returns any - Decrypted data
 */
export function decryptData(encryptedData: string, key: string): any {
  try {
    // Decode base64
    const combined = atob(encryptedData);

    // Split IV and encrypted data
    const colonIndex = combined.indexOf(":");
    if (colonIndex === -1) {
      throw new Error("Invalid encrypted data format");
    }

    const ivHex = combined.substring(0, colonIndex);
    const encrypted = combined.substring(colonIndex + 1);

    // Convert IV from hex
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    // Convert key to WordArray
    const keyWordArray = CryptoJS.enc.Hex.parse(key);

    // Convert hex encrypted data to CryptoJS format
    const encryptedWordArray = CryptoJS.enc.Hex.parse(encrypted);

    // Decrypt data using AES-256-CBC
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedWordArray } as any,
      keyWordArray,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    // Convert to string and parse JSON
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      throw new Error("Failed to decrypt data");
    }

    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

