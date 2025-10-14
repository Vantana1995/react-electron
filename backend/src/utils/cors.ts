import { NextRequest } from "next/server";
import { CORS_CONFIG } from "./constants";
import { getClientIP } from "./validation";

/**
 * Check if IP address is in admin list
 */
export function isAdminIP(ip: string): boolean {
  // Normalize IP address (handle IPv4-mapped IPv6 addresses)
  const normalizedIP = ip.replace(/^::ffff:/, "");

  return CORS_CONFIG.ADMIN_IPS.some((adminIP) => {
    // Exact match
    if (adminIP === normalizedIP || adminIP === ip) {
      return true;
    }

    // Handle localhost variations
    if (
      adminIP === "localhost" &&
      (normalizedIP === "127.0.0.1" || normalizedIP === "::1" || ip === "::1")
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Get allowed HTTP methods based on client IP
 */
export function getAllowedMethods(request: NextRequest): string[] {
  const clientIP = getClientIP(request);

  if (isAdminIP(clientIP)) {
    return CORS_CONFIG.ADMIN_METHODS;
  }

  return CORS_CONFIG.USER_METHODS;
}

/**
 * Check if HTTP method is allowed for client IP
 */
export function isMethodAllowed(request: NextRequest, method: string): boolean {
  const allowedMethods = getAllowedMethods(request);
  return allowedMethods.includes(method.toUpperCase());
}

/**
 * Get CORS headers based on client IP and request
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const clientIP = getClientIP(request);
  const allowedMethods = getAllowedMethods(request);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": allowedMethods.join(", "),
    "Access-Control-Allow-Headers": CORS_CONFIG.ALLOWED_HEADERS.join(", "),
    "Access-Control-Expose-Headers": CORS_CONFIG.EXPOSED_HEADERS.join(", "),
    "Access-Control-Max-Age": "86400", // 24 hours
  };

  // Handle origin
  if (origin) {
    // Allow any origin for all requests (required for development and Electron app)
    headers["Access-Control-Allow-Origin"] = origin;

    // Allow credentials for admin IPs
    if (isAdminIP(clientIP)) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }
  } else {
    // No origin header (direct API calls)
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

/**
 * Create CORS preflight response
 */
export function createCorsPreflightResponse(request: NextRequest): Response {
  const corsHeaders = getCorsHeaders(request);

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Add CORS headers to existing response
 */
export function addCorsHeaders(
  response: Response,
  request: NextRequest
): Response {
  const corsHeaders = getCorsHeaders(request);

  // Clone the response to modify headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}

const corsUtils = {
  isAdminIP,
  getAllowedMethods,
  isMethodAllowed,
  getCorsHeaders,
  createCorsPreflightResponse,
  addCorsHeaders,
};

export default corsUtils;
