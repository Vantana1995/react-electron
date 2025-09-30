import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { generateClientVerificationHash } from "@/utils/crypto";
import { validateRequestBody } from "@/utils/validation";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";

interface StoredDeviceInfo {
  cpu: { cores: number; architecture: string; model?: string };
  gpu: { renderer: string; vendor: string; memory?: number };
  memory: { total: number };
  os: { platform: string; version: string; architecture: string };
  [key: string]: unknown;
}

/**
 * Admin endpoint to send instructions to clients via callbacks
 * This simulates server-initiated communication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequestBody(body, ["deviceHash", "action"]);

    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const { deviceHash, action, data } = body;

    // Find user by device hash
    const db = getDBConnection();
    const userModel = new UserModel(db);

    const user = await userModel.findByDeviceHash(deviceHash);

    if (!user) {
      return ApiResponseBuilder.error(
        "DEVICE_NOT_FOUND",
        "Device not registered",
        null,
        404
      );
    }

    // Generate verification hash for client authentication
    const deviceInfo = user.device_info as StoredDeviceInfo;
    const verificationHash = generateClientVerificationHash({
      cpu: { cores: deviceInfo.cpu.cores },
      gpu: { vendor: deviceInfo.gpu.vendor },
      memory: { total: deviceInfo.memory.total },
      nonce: 0, // Nonce is now managed by server
    });

    // Prepare instruction payload
    const instruction = {
      action,
      data: data || {},
      timestamp: Date.now(),
    };

    // Log first 20 lines of script if it contains script data
    if (data && data.script) {
      console.log(
        "📜 BACKEND SCRIPT DEBUG - First 20 lines of script being sent:"
      );
      console.log("=".repeat(50));

      const script = data.script;
      if (script.code) {
        const lines = script.code.split("\n");
        const first20Lines = lines.slice(0, 20);

        first20Lines.forEach((line, index) => {
          console.log(`${(index + 1).toString().padStart(2, "0")}: ${line}`);
        });

        if (lines.length > 20) {
          console.log(`... and ${lines.length - 20} more lines`);
        }
      } else if (script.content) {
        const lines = script.content.split("\n");
        const first20Lines = lines.slice(0, 20);

        first20Lines.forEach((line, index) => {
          console.log(`${(index + 1).toString().padStart(2, "0")}: ${line}`);
        });

        if (lines.length > 20) {
          console.log(`... and ${lines.length - 20} more lines`);
        }
      } else {
        console.log("📜 Script object structure:", Object.keys(script));
        console.log(
          "📜 Script content preview:",
          JSON.stringify(script, null, 2).substring(0, 500) + "..."
        );
      }

      console.log("=".repeat(50));
    }

    const callbackPayload = {
      verificationHash,
      timestamp: Date.now(),
      instruction,
      nonce: user.nonce,
    };

    // Send callback to client
    const clientIP = user.ip_address === "::1" ? "localhost" : user.ip_address;
    const callbackUrl = `http://${clientIP}:8080/server-callback`;

    console.log(`📞 Sending callback to ${callbackUrl}`);
    console.log(`📋 Instruction: ${action}`);

    try {
      const callbackResponse = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(callbackPayload),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const callbackResult = await callbackResponse.json();

      if (callbackResult.verified) {
        console.log("✅ Client callback successful");

        // Update last active timestamp
        await userModel.updateLastActive(user.id);

        return ApiResponseBuilder.success({
          sent: true,
          action,
          deviceHash,
          clientResponse: callbackResult,
          message: "Instruction sent and verified by client",
        });
      } else {
        console.log("❌ Client callback verification failed");
        return ApiResponseBuilder.error(
          "CALLBACK_VERIFICATION_FAILED",
          "Client failed to verify callback",
          { clientResponse: callbackResult },
          400
        );
      }
    } catch (fetchError) {
      console.log(`❌ Callback failed: ${fetchError.message}`);
      return ApiResponseBuilder.error(
        "CALLBACK_FAILED",
        "Failed to reach client callback server",
        {
          error: fetchError.message,
          clientUrl: callbackUrl,
          suggestion:
            "Make sure client callback server is running on port 8080",
        },
        503
      );
    }
  } catch (error) {
    console.error("Send instruction error:", error);
    return ApiResponseBuilder.internalError("Failed to send instruction");
  }
}

/**
 * Get all connected clients (for admin interface)
 */
export async function GET() {
  try {
    const db = getDBConnection();

    // Get all users with recent activity (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const query = `
      SELECT device_hash, ip_address, nonce, last_active, created_at
      FROM users 
      WHERE last_active > $1 
      ORDER BY last_active DESC
    `;

    const result = await db.query(query, [fiveMinutesAgo]);

    const connectedClients = result.rows.map((user) => ({
      deviceHash: user.device_hash,
      ipAddress: user.ip_address,
      nonce: user.nonce,
      lastActive: user.last_active,
      registeredAt: user.created_at,
      shortHash: user.device_hash.substring(0, 16) + "...",
    }));

    return ApiResponseBuilder.success({
      connectedClients,
      totalCount: connectedClients.length,
      message: "Connected clients retrieved successfully",
    });
  } catch (error) {
    console.error("Get connected clients error:", error);
    return ApiResponseBuilder.internalError(
      "Failed to retrieve connected clients"
    );
  }
}
