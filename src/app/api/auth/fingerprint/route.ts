import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import {
  generateStep1Hash,
  generateStep2Hash,
  generateFinalDeviceHash,
  generateSessionToken,
} from "@/utils/crypto";
import { validateRequestBody, getClientIP } from "@/utils/validation";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";
import { clientConnectionManager } from "@/services/client-connection";
import { hasLegionNFT, getLegionNFTMetadata } from "@/services/blockchain";

interface FingerprintData extends Record<string, unknown> {
  // CPU Information
  cpu: {
    cores: number; // For client verification hash
    architecture: string; // For step 2 hash
    model?: string; // For step 1 hash
  };

  // GPU Information
  gpu: {
    renderer: string; // For step 1 hash (gpu.string)
    vendor: string; // For client verification hash
    memory?: number; // For step 2 hash
  };

  // Memory Information
  memory: {
    total: number; // For client verification hash
  };

  // OS Information
  os: {
    platform: string; // For step 2 hash
    version: string; // Additional info
    architecture: string; // For step 1 hash
  };

  // Browser fingerprint (for hash generation)
  webgl?: string;

  // Wallet information (optional)
  walletAddress?: string | null;

  // Client real IPv4 address (sent from client)
  clientIPv4?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body (only required fields)
    const validation = validateRequestBody(body, [
      "cpu",
      "gpu",
      "memory",
      "os",
    ]);

    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const fingerprintData = body as FingerprintData;

    // Log basic connection info
    console.log(
      `📱 Client connected: ${
        fingerprintData.walletAddress ? "with wallet" : "without wallet"
      }`
    );

    // Get client IP address - prefer clientIPv4 from request body (real device IP)
    const clientIP = fingerprintData.clientIPv4 || getClientIP(request);

    console.log("🌐 Client IP for fingerprint:", clientIP);
    console.log("  - From request body (clientIPv4):", fingerprintData.clientIPv4 || "not provided");
    console.log("  - From request headers:", getClientIP(request));

    // Step 1: Generate hash from primary characteristics (cpu.model + gpu.renderer + os.architecture + webgl)

    const step1Hash = generateStep1Hash({
      cpu: { model: fingerprintData.cpu.model },
      gpu: { renderer: fingerprintData.gpu.renderer },
      os: { architecture: fingerprintData.os.architecture },
      webgl: fingerprintData.webgl,
    });

    // Step 2: Generate hash from secondary characteristics (cpu.architecture + gpu.memory + os.platform)

    const step2Hash = generateStep2Hash({
      cpu: { architecture: fingerprintData.cpu.architecture },
      gpu: { memory: fingerprintData.gpu.memory },
      os: { platform: fingerprintData.os.platform },
    });

    // Step 3: Generate final device hash combining step1 + step2 + IP
    const deviceHash = generateFinalDeviceHash(step1Hash, step2Hash, clientIP);

    // Check database for existing user
    const db = getDBConnection();
    const userModel = new UserModel(db);

    // First, find user by device fingerprint (step 1 hash)
    const query = `SELECT * FROM users WHERE device_fingerprint = $1`;
    const result = await db.query(query, [step1Hash]);

    let user;
    let isNewUser = false;

    if (result.rows.length === 0) {
      // User not found, register new user
      console.log("📝 Registering new user...");

      const insertResult = await db.query(
        `INSERT INTO users (
          device_fingerprint,
          device_hash,
          ip_address,
          nonce,
          device_info,
          backup_emails,
          wallet_address,
          created_at,
          last_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          step1Hash,
          deviceHash,
          clientIP,
          0, // Start nonce at 0
          JSON.stringify(fingerprintData),
          [
            "backup1@example.com",
            "backup2@example.com",
            "backup3@example.com",
            "backup4@example.com",
            "backup5@example.com",
          ],
          fingerprintData.walletAddress || null,
        ]
      );

      user = insertResult.rows[0];
      isNewUser = true;
      console.log(`✅ New user registered with ID: ${user.id}`);
    } else {
      // User exists, update last active and wallet address
      user = result.rows[0];

      await db.query(
        `UPDATE users SET last_active = NOW(), wallet_address = $1 WHERE id = $2`,
        [fingerprintData.walletAddress || null, user.id]
      );

      console.log(`✅ Existing user found with ID: ${user.id}`);
      if (fingerprintData.walletAddress) {
        console.log(
          `💰 Wallet address updated: ${fingerprintData.walletAddress}`
        );
      }
    }

    // Check Legion NFT ownership and get metadata if wallet address is provided
    let hasLegionNFTResult = false;
    let nftImage = "";
    let nftMetadata = null;

    if (fingerprintData.walletAddress) {
      try {
        hasLegionNFTResult = await hasLegionNFT(fingerprintData.walletAddress);
        console.log(`💰 Legion NFT check result: ${hasLegionNFTResult}`);

        if (hasLegionNFTResult) {
          // Get NFT metadata and image
          const nftData = await getLegionNFTMetadata(
            fingerprintData.walletAddress
          );
          if (nftData) {
            nftImage = nftData.image;
            nftMetadata = nftData.metadata;
            console.log(`🖼️ NFT Image URL: ${nftImage}`);
          }
        }
      } catch (error) {
        console.error("❌ Failed to check Legion NFT:", error);
        // Don't fail the request, just log the error
      }
    }

    // Generate session token
    const sessionToken = generateSessionToken(deviceHash);

    // Register connection with client connection manager
    try {
      await clientConnectionManager.registerConnection(
        deviceHash,
        clientIP,
        0, // Start with nonce 0, will be managed by server
        {
          cpuModel: fingerprintData.cpu.model || "unknown",
          ipAddress: clientIP,
        }
      );
      console.log("✅ Connection registered with client manager");

      // If we have NFT data, send it via ping
      if (hasLegionNFTResult && nftImage) {
        try {
          await clientConnectionManager.sendPingWithNFTData(
            deviceHash,
            nftImage,
            nftMetadata
          );
          console.log("📡 NFT data sent via ping to client");
        } catch (error) {
          console.error("❌ Failed to send NFT data via ping:", error);
        }
      }
    } catch (error) {
      console.error("❌ Failed to register connection:", error);
      // Don't fail the request, just log the error
    }

    // Return response with device hash and session token
    return ApiResponseBuilder.success({
      deviceHash, // Final hash only
      sessionToken,
      userId: user.id,
      isRegistered: true,
      isNewUser,
      registeredAt: user.created_at,
      lastActive: user.last_active,
      walletAddress: user.wallet_address, // Return wallet address if available
      hasLegionNFT: hasLegionNFTResult, // Return NFT ownership status
      nftImage: nftImage, // Return NFT image URL if available
      nftMetadata: nftMetadata, // Return NFT metadata if available
      message: isNewUser
        ? "Device registered successfully"
        : "Device verified successfully",
      // Optional: return some non-sensitive info for debugging
      debug: {
        clientIP:
          clientIP === "unknown" ? "Could not determine IP" : "IP detected",
        step1Length: step1Hash.length,
        step2Length: step2Hash.length,
        finalHashLength: deviceHash.length,
        walletConnected: !!fingerprintData.walletAddress,
        nftChecked: !!fingerprintData.walletAddress,
        nftImageFetched: !!nftImage,
      },
    });
  } catch (error) {
    console.error("Fingerprint generation error:", error);
    return ApiResponseBuilder.internalError(
      "Failed to generate device fingerprint"
    );
  }
}
