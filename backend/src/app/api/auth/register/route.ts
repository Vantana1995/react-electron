import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import {
  generateStep1Hash,
  generateStep2Hash,
  generateFinalDeviceHash,
  generateSessionToken,
} from "@/utils/crypto";
import {
  validateRequestBody,
  getClientIP,
  isValidEmail,
} from "@/utils/validation";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";

interface RegistrationData extends Record<string, unknown> {
  // Device fingerprint data (same as FingerprintData)
  cpu: {
    cores: number;
    architecture: string;
    model?: string;
  };
  gpu: {
    renderer: string;
    vendor: string;
    memory?: number;
  };
  memory: {
    total: number;
  };
  os: {
    platform: string;
    version: string;
    architecture: string;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: {
    offset: number;
    name: string;
  };
  language: string[];
  userAgent: string;
  webgl?: {
    renderer: string;
    vendor: string;
  };
  canvas?: string;
  audio?: string;

  // Registration specific data
  backupEmails: string[]; // Array of 5 backup emails
  nonce: number; // Nonce from device
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
      "backupEmails",
      "nonce",
    ]);

    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const registrationData = body as RegistrationData;

    // Validate backup emails
    if (
      !Array.isArray(registrationData.backupEmails) ||
      registrationData.backupEmails.length !== 5
    ) {
      return ApiResponseBuilder.validationError([
        "Exactly 5 backup emails are required",
      ]);
    }

    for (const email of registrationData.backupEmails) {
      if (!isValidEmail(email)) {
        return ApiResponseBuilder.validationError([
          `Invalid email format: ${email}`,
        ]);
      }
    }

    // Get client IP address
    const clientIP = getClientIP(request);

    // Use nonce from device
    const nonce = registrationData.nonce;

    // Step 1: Generate hash from primary characteristics
    const step1Hash = generateStep1Hash({
      cpu: { model: registrationData.cpu.model },
      gpu: { renderer: registrationData.gpu.renderer },
      os: { architecture: registrationData.os.architecture },
    });

    // Step 2: Generate hash from secondary characteristics
    const step2Hash = generateStep2Hash({
      cpu: { architecture: registrationData.cpu.architecture },
      gpu: { memory: registrationData.gpu.memory },
      os: { platform: registrationData.os.platform },
    });

    // Step 3: Generate final device hash
    const deviceHash = generateFinalDeviceHash(step1Hash, step2Hash, clientIP);

    // Check if device already exists
    const db = getDBConnection();
    const userModel = new UserModel(db);

    const existingUser = await userModel.findByDeviceHash(deviceHash);
    if (existingUser) {
      return ApiResponseBuilder.error(
        "DEVICE_ALREADY_REGISTERED",
        "This device is already registered",
        null,
        409
      );
    }

    // Create new user
    const newUser = await userModel.create({
      device_hash: deviceHash,
      device_fingerprint: step1Hash, // Store step1 hash for lookup
      ip_address: clientIP,
      nonce: nonce,
      backup_emails: registrationData.backupEmails,
      device_info: {
        // Store all device data for verification callbacks
        cpu: registrationData.cpu,
        gpu: registrationData.gpu,
        memory: registrationData.memory,
        os: registrationData.os,
        screen: registrationData.screen,
        timezone: registrationData.timezone,
        language: registrationData.language,
        userAgent: registrationData.userAgent,
        // Store computed hashes for debugging
        step1Hash,
        step2Hash,
        registeredAt: new Date().toISOString(),
        registrationIP: clientIP,
      },
    });

    // Generate session token
    const sessionToken = generateSessionToken(deviceHash);

    // Register client for callbacks (автоматически после регистрации)
    try {
      const { clientConnectionManager } = await import(
        "@/services/client-connection"
      );
      await clientConnectionManager.registerConnection(
        deviceHash,
        clientIP,
        nonce
      );
    } catch (error) {
      console.warn("Failed to register client for callbacks:", error);
      // Не критично - клиент может зарегистрироваться позже
    }

    return ApiResponseBuilder.success({
      registered: true,
      deviceHash,
      sessionToken,
      userId: newUser.id,
      nonce, // Return current nonce
      message: "Device registered successfully",
      registeredAt: newUser.created_at,
      callbackInfo: {
        registered: true,
        serverWillCallIP: clientIP,
        recommendedClientPort: 8080,
      },
    });
  } catch (error) {
    console.error("Device registration error:", error);
    return ApiResponseBuilder.internalError("Device registration failed");
  }
}
