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
import { clientConnectionManager } from "@/services/client-connection";
import { ScriptModel } from "@/database/models/Script";
import { NFTCacheManager } from "@/utils/nft-cache";
import { SubscriptionManager } from "@/services/subscription-manager";

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

  // Wallet information
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
      ` Client connected: ${
        fingerprintData.walletAddress ? "with wallet" : "without wallet"
      }`
    );

    // Separate device IP (for fingerprint) and public IP (for callbacks)
    const deviceIP = fingerprintData.clientIPv4 || "unknown";
    const publicIP = getClientIP(request);

    console.log("📍 IP addresses:");
    console.log("  - Device IP (for fingerprint):", deviceIP);
    console.log("  - Public IP (for callbacks):", publicIP);

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

    // Step 3: Generate final device hash combining step1 + step2 + device IP
    const deviceHash = generateFinalDeviceHash(step1Hash, step2Hash, deviceIP);

    // Check database for existing user
    const db = getDBConnection();

    // First, find user by device fingerprint (step 1 hash)
    const query = `SELECT * FROM users WHERE device_fingerprint = $1`;
    const result = await db.query(query, [step1Hash]);

    let user;
    let isNewUser = false;

    if (result.rows.length === 0) {
      // User not found, register new user
      console.log("📝 Registering new user...");

      // Check if wallet address is already registered on another device
      if (fingerprintData.walletAddress) {
        const walletCheckResult = await db.query(
          `SELECT id, device_fingerprint FROM users WHERE wallet_address = $1`,
          [fingerprintData.walletAddress]
        );

        if (walletCheckResult.rows.length > 0) {
          const existingUser = walletCheckResult.rows[0];
          console.log(
            `⚠️ Wallet ${fingerprintData.walletAddress} already registered on device ${existingUser.device_fingerprint}`
          );
          return ApiResponseBuilder.error(
            "WALLET_ALREADY_REGISTERED",
            "This wallet address is already registered on another device. Each wallet can only be used on one device.",
            {
              walletAddress: fingerprintData.walletAddress,
              existingUserId: existingUser.id,
            },
            409
          );
        }
      }

      const insertResult = await db.query(
        `INSERT INTO users (
          device_fingerprint,
          device_hash,
          ip_address,
          nonce,
          device_info,
          wallet_address,
          created_at,
          last_active
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *`,
        [
          step1Hash,
          deviceHash,
          deviceIP,
          0, // Start nonce at 0
          JSON.stringify(fingerprintData),
          fingerprintData.walletAddress,
        ]
      );

      user = insertResult.rows[0];
      isNewUser = true;
      console.log(`✅ New user registered with ID: ${user.id}`);
    } else {
      // User exists, update last active only (wallet_address is cached and never updated)
      user = result.rows[0];

      // Update last active timestamp only
      await db.query(`UPDATE users SET last_active = NOW() WHERE id = $1`, [
        user.id,
      ]);

      console.log(`✅ Existing user found with ID: ${user.id}`);

      // Compare cached wallet with requested wallet
      const cachedWallet = user.wallet_address;
      const requestedWallet = fingerprintData.walletAddress;

      if (cachedWallet && requestedWallet && cachedWallet !== requestedWallet) {
        // Different wallet - reject connection
        console.log(
          ` Wallet mismatch detected!\n` +
            `  Cached:    ${cachedWallet}\n` +
            `  Requested: ${requestedWallet}\n` +
            `  Connection rejected - wallet addresses do not match`
        );
        return ApiResponseBuilder.error(
          "WALLET_MISMATCH",
          "This device is registered with a different wallet address. Please use the original wallet or contact support.",
          {
            cachedWallet,
            requestedWallet,
          },
          403
        );
      } else if (
        cachedWallet &&
        requestedWallet &&
        cachedWallet === requestedWallet
      ) {
        console.log(`✅ Wallet verified: ${cachedWallet}`);
      } else if (!cachedWallet && requestedWallet) {
        console.log(`🆕 First wallet connection: ${requestedWallet}`);
      }
    }

    // Dynamic NFT verification and subscription calculation
    const walletToCheck = isNewUser
      ? fingerprintData.walletAddress
      : user.wallet_address || fingerprintData.walletAddress;

    let subscriptionLevel = "free";
    let maxProfiles = 1;
    let accessibleScripts: any[] = [];
    let ownedNFTCount = 0;

    try {
      // Import dynamic NFT verifier
      const { createDynamicNFTVerifier } = await import(
        "@/services/dynamic-nft-verifier"
      );
      const dynamicNFTVerifier = await createDynamicNFTVerifier();

      if (walletToCheck) {
        // Use dynamic NFT verification
        const verificationResult = await dynamicNFTVerifier.verifyUserNFTs(
          user.id,
          walletToCheck,
          false // Don't force refresh
        );

        subscriptionLevel = verificationResult.subscriptionLevel;
        maxProfiles = verificationResult.maxProfiles;
        ownedNFTCount = verificationResult.ownedNFTs.length;
        accessibleScripts = verificationResult.accessibleScripts;

        console.log(
          `✅ Dynamic verification: ${subscriptionLevel} (${maxProfiles} profiles, ${ownedNFTCount} NFTs, ${accessibleScripts.length} scripts)`
        );
      } else {
        // No wallet - initialize free tier
        console.log("📋 No wallet address, initializing free tier");
        const { SubscriptionManager } = await import(
          "@/services/subscription-manager"
        );
        const subscriptionManager = new SubscriptionManager(db);
        await subscriptionManager.initializeFreeTier(user.id);

        subscriptionLevel = "free";
        maxProfiles = 1;
        accessibleScripts = [];
      }
    } catch (error) {
      console.error("❌ Failed to process NFT subscription:", error);
      // Don't fail the request, continue with free tier
      subscriptionLevel = "free";
      maxProfiles = 1;
      accessibleScripts = [];
    }

    // Generate session token
    const sessionToken = generateSessionToken(deviceHash);

    // Register connection with client connection manager
    try {
      await clientConnectionManager.registerConnection(
        deviceHash,
        publicIP,
        0, // Start with nonce 0, will be managed by server
        {
          cpuModel: fingerprintData.cpu.model || "unknown",
          ipAddress: deviceIP,
        }
      );
      console.log("✅ Connection registered with client manager");

      // Send accessible scripts to user
      if (accessibleScripts.length > 0) {
        try {
          await clientConnectionManager.sendUserScripts(deviceHash);
          console.log(
            `📡 Sent ${accessibleScripts.length} script(s) to client`
          );
        } catch (error) {
          console.error("❌ Failed to send scripts:", error);
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
      subscription: {
        level: subscriptionLevel,
        maxProfiles: maxProfiles,
        ownedNFTs: ownedNFTCount,
        accessibleScripts: accessibleScripts.length,
      },
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
        nftVerification: walletToCheck ? "completed" : "skipped",
      },
    });
  } catch (error) {
    console.error("Fingerprint generation error:", error);
    return ApiResponseBuilder.internalError(
      "Failed to generate device fingerprint"
    );
  }
}
