import { NextRequest } from "next/server";

// Device hash validation
export function isValidDeviceHash(hash: string): boolean {
  if (!hash || typeof hash !== "string") return false;

  // Device hash should be a hex string of specific length (64 chars for SHA-256)
  const hexPattern = /^[a-f0-9]{64}$/i;
  return hexPattern.test(hash);
}

// Email validation
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.toLowerCase());
}

// Ethereum address validation
export function isValidEthereumAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;

  const ethPattern = /^0x[a-fA-F0-9]{40}$/;
  return ethPattern.test(address);
}

// Transaction hash validation
export function isValidTxHash(hash: string): boolean {
  if (!hash || typeof hash !== "string") return false;

  const txPattern = /^0x[a-fA-F0-9]{64}$/;
  return txPattern.test(hash);
}

// IPFS hash validation
export function isValidIPFSHash(hash: string): boolean {
  if (!hash || typeof hash !== "string") return false;

  // Basic IPFS hash patterns (CIDv0 and CIDv1)
  const ipfsPattern =
    /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{58})$/;
  return ipfsPattern.test(hash);
}

// Subscription type validation
export function isValidSubscriptionType(type: string): boolean {
  const validTypes = ["basic", "pro", "premium", "enterprise"];
  return validTypes.includes(type?.toLowerCase());
}

// Request body validation
export function validateRequestBody(
  body: unknown,
  requiredFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    errors.push("Request body must be a valid JSON object");
    return { valid: false, errors };
  }

  requiredFields.forEach((field) => {
    if (
      !(field in (body as Record<string, unknown>)) ||
      (body as Record<string, unknown>)[field] === null ||
      (body as Record<string, unknown>)[field] === undefined
    ) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Extract device hash from headers
export function extractDeviceHash(request: NextRequest): string | null {
  const deviceHash =
    request.headers.get("X-Device-Hash") ||
    request.headers.get("x-device-hash");

  if (!deviceHash || !isValidDeviceHash(deviceHash)) {
    return null;
  }

  return deviceHash;
}

// Extract session token from headers
export function extractSessionToken(request: NextRequest): string | null {
  const sessionToken =
    request.headers.get("X-Session-Token") ||
    request.headers.get("x-session-token") ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  return sessionToken || null;
}

// Rate limiting helpers
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const cfConnecting = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (real) {
    return real;
  }

  if (cfConnecting) {
    return cfConnecting;
  }

  return "unknown";
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

// Validate pagination parameters
export function validatePagination(
  page?: string,
  limit?: string
): { page: number; limit: number; offset: number } {
  const pageNum = Math.max(1, parseInt(page || "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "20", 10))); // Max 100 items per page
  const offset = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    offset,
  };
}

// Validate script settings compatibility with notOlderThan
export function validateScriptSettings(settings: {
  notOlderThanHours?: number;
  [key: string]: unknown;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (settings.notOlderThanHours !== undefined) {
    const hours = Number(settings.notOlderThanHours);

    if (isNaN(hours)) {
      errors.push("notOlderThanHours must be a number");
    } else if (hours < 1 || hours > 168) {
      errors.push("notOlderThanHours must be between 1 and 168 hours (1 week)");
    } else if (!Number.isInteger(hours)) {
      errors.push("notOlderThanHours must be an integer");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

const validationUtils = {
  isValidDeviceHash,
  isValidEmail,
  isValidEthereumAddress,
  isValidTxHash,
  isValidIPFSHash,
  isValidSubscriptionType,
  validateRequestBody,
  extractDeviceHash,
  extractSessionToken,
  getClientIP,
  sanitizeInput,
  validatePagination,
  validateScriptSettings,
};

export default validationUtils;
