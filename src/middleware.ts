import { NextRequest, NextResponse } from "next/server";
import { extractDeviceHash, extractSessionToken } from "./utils/validation";
import { verifySessionToken } from "./utils/crypto-edge";
import {
  isMethodAllowed,
  createCorsPreflightResponse,
  addCorsHeaders,
  isAdminIP,
} from "./utils/cors";
import { getClientIP } from "./utils/validation";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/auth/fingerprint",
  "/api/auth/register",
  "/api/health",
  "/api/status",
];

// Routes that require device hash but not session token
const DEVICE_HASH_ROUTES = [
  "/api/auth/verify",
  "/api/auth/callback",
  "/api/auth/backup-emails",
];

// Admin-only routes (require admin IP)
const ADMIN_ONLY_ROUTES = ["/api/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests (OPTIONS)
  if (request.method === "OPTIONS") {
    return createCorsPreflightResponse(request);
  }

  // Check if HTTP method is allowed for this IP
  if (!isMethodAllowed(request, request.method)) {
    const corsResponse = NextResponse.json(
      {
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: `HTTP method ${request.method} is not allowed for your IP address`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 405 }
    );

    return addCorsHeaders(corsResponse, request);
  }

  // Skip middleware for non-API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check admin-only routes
  if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    const clientIP = getClientIP(request);

    if (!isAdminIP(clientIP)) {
      const corsResponse = NextResponse.json(
        {
          success: false,
          error: {
            code: "ADMIN_ACCESS_REQUIRED",
            message: "This endpoint requires admin access",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );

      return addCorsHeaders(corsResponse, request);
    }
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();
    return addCorsHeaders(response, request);
  }

  // Check device hash for device hash routes
  if (DEVICE_HASH_ROUTES.some((route) => pathname.startsWith(route))) {
    const deviceHash = extractDeviceHash(request);

    if (!deviceHash) {
      const corsResponse = NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_DEVICE_HASH",
            message: "Valid device hash is required",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );

      return addCorsHeaders(corsResponse, request);
    }

    // Add device hash to headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-device-hash", deviceHash);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return addCorsHeaders(response, request);
  }

  // For all other API routes, require both device hash and session token
  const deviceHash = extractDeviceHash(request);
  const sessionToken = extractSessionToken(request);

  if (!deviceHash) {
    const corsResponse = NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_DEVICE_HASH",
          message: "Valid device hash is required",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );

    return addCorsHeaders(corsResponse, request);
  }

  if (!sessionToken) {
    const corsResponse = NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_SESSION_TOKEN",
          message: "Session token is required",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );

    return addCorsHeaders(corsResponse, request);
  }

  // Verify session token
  const tokenValidation = await verifySessionToken(sessionToken);

  if (!tokenValidation.valid) {
    const corsResponse = NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_SESSION_TOKEN",
          message: "Session token is invalid or expired",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );

    return addCorsHeaders(corsResponse, request);
  }

  // Add validated data to headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-device-hash", deviceHash);
  requestHeaders.set(
    "x-validated-device-hash",
    tokenValidation.payload!.deviceHash
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return addCorsHeaders(response, request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
