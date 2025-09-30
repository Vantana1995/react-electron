import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { generateStep1Hash } from "@/utils/crypto";
import { validateRequestBody, getClientIP } from "@/utils/validation";
import { getDBConnection } from "@/config/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequestBody(body, ["deviceFingerprint"]);

    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const { deviceFingerprint } = body;

    // Get client IP address
    const clientIP = getClientIP(request);

    // Find user by device fingerprint
    const db = getDBConnection();
    const query = `SELECT nonce FROM users WHERE device_fingerprint = $1`;
    const result = await db.query(query, [deviceFingerprint]);

    if (result.rows.length === 0) {
      return ApiResponseBuilder.error(
        "DEVICE_NOT_FOUND",
        "Device not found",
        null,
        404
      );
    }

    const user = result.rows[0];

    return ApiResponseBuilder.success({
      nonce: user.nonce,
      message: "Nonce retrieved successfully",
    });
  } catch (error) {
    console.error("Get nonce error:", error);
    return ApiResponseBuilder.internalError("Failed to get nonce");
  }
}
