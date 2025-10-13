import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { validateRequestBody } from "@/utils/validation";
import { verifySessionToken } from "@/utils/crypto";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";
import { ScriptModel } from "@/database/models/Script";
import { NFTCacheManager } from "@/utils/nft-cache";
import { SubscriptionManager } from "@/services/subscription-manager";

/**
 * Confirm connection after all verifications are complete
 * This endpoint is called after device verification and wallet connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body - walletAddress is optional
    const validation = validateRequestBody(body, []);
    if (!validation.valid) {
      return ApiResponseBuilder.validationError(validation.errors);
    }

    const { walletAddress } = body;

    // Get session token from headers
    const sessionToken = request.headers.get("x-session-token");
    if (!sessionToken) {
      return ApiResponseBuilder.unauthorized("Session token required");
    }

    // Verify session token
    const tokenValidation = await verifySessionToken(sessionToken);
    if (!tokenValidation.valid) {
      return ApiResponseBuilder.unauthorized(
        "Invalid or expired session token"
      );
    }

    const deviceHash = tokenValidation.deviceHash;

    // Validate wallet address format if provided
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return ApiResponseBuilder.error(
        "INVALID_WALLET_ADDRESS",
        "Invalid wallet address format"
      );
    }

    const db = getDBConnection();
    const userModel = new UserModel(db);

    // Find user by device hash
    const user = await userModel.findByDeviceHash(deviceHash);
    if (!user) {
      return ApiResponseBuilder.notFound("User not found");
    }

    // Update user's last activity
    await userModel.updateLastActive(user.id);

    let subscriptionLevel = "free";
    let maxProfiles = 1;
    let accessibleScripts: any[] = [];
    let ownedNFTCount = 0;
    let isCachedResult = false;

    // If wallet address provided, perform dynamic NFT verification
    if (walletAddress) {
      // Update user's wallet address
      await userModel.updateWalletAddress(user.id, walletAddress);

      try {
        // Use dynamic NFT verification
        const { createDynamicNFTVerifier } = await import(
          "@/services/dynamic-nft-verifier"
        );
        const dynamicNFTVerifier = await createDynamicNFTVerifier();

        const verificationResult = await dynamicNFTVerifier.verifyUserNFTs(
          user.id,
          walletAddress,
          false // Don't force refresh
        );

        subscriptionLevel = verificationResult.subscriptionLevel;
        maxProfiles = verificationResult.maxProfiles;
        ownedNFTCount = verificationResult.ownedNFTs.length;
        accessibleScripts = verificationResult.accessibleScripts;
        isCachedResult = true; // Dynamic verifier handles caching internally

        console.log(
          `✅ Dynamic verification: ${subscriptionLevel} (${maxProfiles} profiles, ${ownedNFTCount} NFTs, ${accessibleScripts.length} scripts)`
        );
      } catch (error) {
        console.error("❌ Dynamic NFT verification failed:", error);
        // Continue with free tier
        const { SubscriptionManager } = await import(
          "@/services/subscription-manager"
        );
        const subscriptionManager = new SubscriptionManager(db);
        await subscriptionManager.initializeFreeTier(user.id);
        accessibleScripts = [];
      }
    } else {
      // No wallet - free tier
      console.log("📋 No wallet address, using free tier");
      const { SubscriptionManager } = await import(
        "@/services/subscription-manager"
      );
      const subscriptionManager = new SubscriptionManager(db);
      await subscriptionManager.initializeFreeTier(user.id);
      accessibleScripts = [];
    }

    console.log(
      `✅ Connection confirmed for user ${user.id}, wallet: ${
        walletAddress || "none"
      }, subscription: ${subscriptionLevel}, cached: ${isCachedResult}`
    );

    return ApiResponseBuilder.success({
      confirmed: true,
      userId: user.id,
      deviceHash: user.device_hash,
      registeredAt: user.created_at,
      lastActive: user.last_active,
      walletAddress: walletAddress || null,
      subscription: {
        level: subscriptionLevel,
        maxProfiles: maxProfiles,
        ownedNFTs: ownedNFTCount,
        accessibleScripts: accessibleScripts.length,
        isCached: isCachedResult,
      },
      message: "Connection confirmed successfully",
      // Tunnel connection info
      tunnel: {
        enabled: true,
        endpoint: process.env.TUNNEL_ENDPOINT || `ws://localhost:3000/tunnel`,
        protocol: "socket.io",
        heartbeat: {
          pingInterval: 30000, // 30 seconds
          timeout: 40000, // 40 seconds
        },
      },
    });
  } catch (error) {
    console.error("Connection confirmation error:", error);
    return ApiResponseBuilder.internalError("Failed to confirm connection");
  }
}
