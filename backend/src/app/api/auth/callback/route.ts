import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { generateClientVerificationHash } from "@/utils/crypto";
import { validateRequestBody } from "@/utils/validation";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";

// Interface removed - not used in new architecture

interface StoredDeviceInfo {
  cpu: { cores: number; architecture: string; model?: string };
  gpu: { renderer: string; vendor: string; memory?: number };
  memory: { total: number };
  os: { platform: string; version: string; architecture: string };
  [key: string]: unknown;
}

/**
 * Endpoint для регистрации клиента в системе активных подключений
 * Клиент вызывает этот endpoint чтобы зарегистрироваться для получения callbacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequestBody(body, ["deviceHash", "clientPort"]);

    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const { deviceHash, clientPort } = body;

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

    // Register client for direct callbacks
    const clientIP = user.ip_address; // Use registered IP

    // Import connection manager
    const { clientConnectionManager } = await import(
      "@/services/client-connection"
    );
    await clientConnectionManager.registerConnection(
      deviceHash,
      clientIP,
      0 // Start with nonce 0, will be managed by server
    );

    // Update last active timestamp
    await userModel.updateLastActive(user.id);

    return ApiResponseBuilder.success({
      registered: true,
      message: "Client registered for callbacks",
      callbackInfo: {
        serverWillCallIP: clientIP,
        serverWillCallPort: clientPort,
        pingInterval: 30000, // 30 seconds
        maxMissedPings: 3,
      },
    });
  } catch (error) {
    console.error("Client registration error:", error);
    return ApiResponseBuilder.internalError("Client registration failed");
  }
}

/**
 * Client verification endpoint - клиент подтверждает что получил callback от настоящего сервера
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateRequestBody(body, ["deviceHash", "clientHash"]);

    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const { deviceHash, clientHash } = body;

    // Find user
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

    // Generate expected hash on server side
    const deviceInfo = user.device_info as StoredDeviceInfo;
    const expectedHash = generateClientVerificationHash({
      cpu: { cores: deviceInfo.cpu.cores },
      gpu: { vendor: deviceInfo.gpu.vendor },
      memory: { total: deviceInfo.memory.total },
      nonce: user.nonce,
    });

    // Verify client computed correct hash
    if (clientHash !== expectedHash) {
      return ApiResponseBuilder.error(
        "VERIFICATION_FAILED",
        "Client verification hash mismatch",
        null,
        403
      );
    }

    // Update last active
    await userModel.updateLastActive(user.id);

    return ApiResponseBuilder.success({
      verified: true,
      message: "Client verification successful - connection confirmed",
      lastActive: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Client verification error:", error);
    return ApiResponseBuilder.internalError("Client verification failed");
  }
}
