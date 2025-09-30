import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { validateRequestBody, getClientIP } from "@/utils/validation";
import { verifySessionToken } from "@/utils/crypto";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";
import { blockchainService } from "@/services/blockchain";

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

    let subscriptionType = "free";
    let nftVerified = false;

    // If wallet address provided, check NFT ownership and create subscription
    if (walletAddress) {
      await db.query(
        "UPDATE users SET wallet_address = $1 WHERE device_hash = $2",
        [walletAddress, deviceHash]
      );

      try {
        // Check NFT ownership using blockchain service
        const nftResult = await blockchainService.checkLegionNFTOwnership(
          walletAddress
        );

        if (nftResult.hasNFT) {
          nftVerified = true;
          subscriptionType = "lifetime_legion";

          // Create or update subscription
          const existingSubscription = await db.query(
            "SELECT * FROM subscriptions WHERE user_id = $1 AND subscription_type = $2 AND is_active = true",
            [user.id, "lifetime_legion"]
          );

          if (existingSubscription.rows.length > 0) {
            // Update existing subscription
            await db.query(
              `UPDATE subscriptions SET 
               wallet_address = $1,
               nft_contract = $2,
               network_name = $3,
               last_verified = NOW()
               WHERE user_id = $4 AND subscription_type = $5`,
              [
                walletAddress,
                nftResult.contractAddress,
                nftResult.networkName,
                user.id,
                "lifetime_legion",
              ]
            );
            console.log(
              `✅ Updated existing Legion NFT subscription for user ${user.id}`
            );
          } else {
            // Create new lifetime subscription
            await db.query(
              `INSERT INTO subscriptions (
                user_id, 
                subscription_type, 
                wallet_address, 
                nft_contract, 
                network_name, 
                start_date, 
                end_date, 
                is_active,
                features_access,
                last_verified
              ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '100 years', true, $6, NOW())`,
              [
                user.id,
                "lifetime_legion",
                walletAddress,
                nftResult.contractAddress,
                nftResult.networkName,
                JSON.stringify([
                  "all_features",
                  "priority_support",
                  "unlimited_usage",
                ]),
              ]
            );
            console.log(
              `🎉 Created new Legion NFT lifetime subscription for user ${user.id}`
            );
          }
        }
      } catch (error) {
        console.error("❌ NFT verification failed:", error);
        // Continue without NFT verification
      }
    }

    console.log(
      `✅ Connection confirmed for user ${user.id}, wallet: ${
        walletAddress || "none"
      }, subscription: ${subscriptionType}`
    );

    return ApiResponseBuilder.success({
      confirmed: true,
      userId: user.id,
      deviceHash: user.device_hash,
      registeredAt: user.created_at,
      lastActive: user.last_active,
      walletAddress: walletAddress || null,
      subscriptionType,
      nftVerified,
      message: "Connection confirmed successfully",
      // Start monitoring after confirmation
      monitoring: {
        enabled: true,
        pingInterval: 30000, // 30 seconds
        maxMissedPings: 3,
      },
    });
  } catch (error) {
    console.error("Connection confirmation error:", error);
    return ApiResponseBuilder.internalError("Failed to confirm connection");
  }
}
