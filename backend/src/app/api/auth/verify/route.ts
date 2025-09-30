import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import {
  generateStep1Hash,
  generateStep2Hash,
  generateFinalDeviceHash,
} from "@/utils/crypto";
import { validateRequestBody, getClientIP } from "@/utils/validation";
import { getDBConnection } from "@/config/database";
import { UserModel, User } from "@/database/models/User";

interface VerificationData extends Record<string, unknown> {
  // Same device data as registration for re-verification
  cpu: { cores: number; architecture: string; model?: string };
  gpu: { renderer: string; vendor: string; memory?: number };
  memory: { total: number };
  os: { platform: string; version: string; architecture: string };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: { offset: number; name: string };
  language: string[];
  userAgent: string;
  webgl?: { renderer: string; vendor: string };
  canvas?: string;
  audio?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequestBody(body, [
      "cpu",
      "gpu",
      "memory",
      "os",
      "screen",
      "timezone",
      "language",
      "userAgent",
    ]);

    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const verificationData = body as VerificationData;

    // Get client IP address
    const clientIP = getClientIP(request);

    // Step 1: Generate primary hash from device data
    const step1Hash = generateStep1Hash({
      cpu: { model: verificationData.cpu.model },
      gpu: { renderer: verificationData.gpu.renderer },
      os: { architecture: verificationData.os.architecture },
    });

    // Check database for existing user with this step1 hash
    const db = getDBConnection();
    const userModel = new UserModel(db);

    // First, find user by device fingerprint (step 1 hash)
    const query = `SELECT * FROM users WHERE device_fingerprint = $1`;
    const result = await db.query(query, [step1Hash]);

    if (result.rows.length === 0) {
      return ApiResponseBuilder.error(
        "DEVICE_NOT_REGISTERED",
        "Device not found. Please register first.",
        null,
        404
      );
    }

    const user = result.rows[0] as User;

    // Step 2: Generate secondary hash
    const step2Hash = generateStep2Hash({
      cpu: { architecture: verificationData.cpu.architecture },
      gpu: { memory: verificationData.gpu.memory },
      os: { platform: verificationData.os.platform },
    });

    // Generate expected device hash
    const finalExpectedHash = generateFinalDeviceHash(
      step1Hash,
      step2Hash,
      clientIP
    );

    // Check if the generated hash matches stored hash
    if (finalExpectedHash !== user.device_hash) {
      // IP address has changed
      return ApiResponseBuilder.error(
        "IP_ADDRESS_CHANGED",
        "IP address has changed. Device verification failed.",
        {
          suggestion:
            "If your IP address changed, you may need to use backup email recovery.",
          currentIP: clientIP,
          registeredIP: user.ip_address,
        },
        403
      );
    }

    // Update last active timestamp
    await userModel.updateLastActive(user.id);

    return ApiResponseBuilder.success({
      verified: true,
      deviceHash: user.device_hash,
      registeredAt: user.created_at,
      lastActive: user.last_active,
      backupEmailsCount: user.backup_emails.length,
      ipMatches: clientIP === user.ip_address,
      message: "Device verified successfully",
    });
  } catch (error) {
    console.error("Device verification error:", error);
    return ApiResponseBuilder.internalError("Device verification failed");
  }
}
