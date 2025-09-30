import { NextRequest } from "next/server";
import { getDBConnection } from "../../../../config/database";
import {
  createCorsPreflightResponse,
  addCorsHeaders,
} from "../../../../utils/cors";
import { ApiResponseBuilder } from "../../../../utils/api-response";
import { verifySessionToken } from "../../../../utils/crypto";
import { getClientIP } from "../../../../utils/validation";
import { blockchainService } from "../../../../services/blockchain";

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return createCorsPreflightResponse(request);
}

/**
 * Verify NFT ownership and update subscription
 * This endpoint handles both blockchain verification and subscription update
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    // Validate required fields
    if (!walletAddress) {
      return addCorsHeaders(
        ApiResponseBuilder.error("MISSING_FIELDS", "Wallet address required"),
        request
      );
    }

    // Get session token from headers
    const sessionToken = request.headers.get("x-session-token");
    if (!sessionToken) {
      return addCorsHeaders(
        ApiResponseBuilder.unauthorized("Session token required"),
        request
      );
    }

    // Verify session token
    const tokenValidation = await verifySessionToken(sessionToken);
    if (!tokenValidation.valid) {
      return addCorsHeaders(
        ApiResponseBuilder.unauthorized("Invalid or expired session token"),
        request
      );
    }

    const deviceHash = tokenValidation.deviceHash;

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return addCorsHeaders(
        ApiResponseBuilder.error(
          "INVALID_WALLET_ADDRESS",
          "Invalid wallet address format"
        ),
        request
      );
    }

    console.log(
      `🔍 Verifying NFT ownership and updating subscription for wallet: ${walletAddress}`
    );

    // Verify NFT ownership using blockchain service
    const nftResult = await blockchainService.checkLegionNFTOwnership(
      walletAddress
    );

    // Only proceed if user owns the NFT
    if (!nftResult.hasNFT) {
      return addCorsHeaders(
        ApiResponseBuilder.error(
          "NO_NFT_OWNERSHIP",
          "User does not own the required Legion NFT"
        ),
        request
      );
    }

    const db = getDBConnection();

    // Find user by device hash
    const userResult = await db.query(
      "SELECT * FROM users WHERE device_hash = $1",
      [deviceHash]
    );

    if (userResult.rows.length === 0) {
      return addCorsHeaders(
        ApiResponseBuilder.notFound("User not found"),
        request
      );
    }

    const user = userResult.rows[0];
    const userId = user.id;

    // Check if subscription already exists
    const existingSubscription = await db.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 AND subscription_type = $2 AND is_active = true",
      [userId, "lifetime_legion"]
    );

    let subscriptionData;

    if (existingSubscription.rows.length > 0) {
      // Update existing subscription
      subscriptionData = existingSubscription.rows[0];

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
          userId,
          "lifetime_legion",
        ]
      );

      console.log(
        `✅ Updated existing Legion NFT subscription for user ${userId}`
      );
    } else {
      // Create new lifetime subscription
      const insertResult = await db.query(
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
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '100 years', true, $6, NOW()) 
        RETURNING *`,
        [
          userId,
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

      subscriptionData = insertResult.rows[0];
      console.log(
        `🎉 Created new Legion NFT lifetime subscription for user ${userId}`
      );
    }

    // Update user's last activity
    await db.query("UPDATE users SET last_active = NOW() WHERE id = $1", [
      userId,
    ]);

    return addCorsHeaders(
      ApiResponseBuilder.success({
        message: "Subscription verified and updated successfully",
        subscriptionType: "lifetime_legion",
        walletAddress,
        nftContract: nftResult.contractAddress,
        networkName: nftResult.networkName,
        verifiedAt: new Date().toISOString(),
        subscription: {
          id: subscriptionData.id,
          type: subscriptionData.subscription_type,
          startDate: subscriptionData.start_date,
          endDate: subscriptionData.end_date,
          isActive: subscriptionData.is_active,
          featuresAccess: subscriptionData.features_access,
        },
      }),
      request
    );
  } catch (error) {
    console.error("❌ NFT verification and subscription update error:", error);

    return addCorsHeaders(
      ApiResponseBuilder.internalError(
        "Failed to verify NFT and update subscription",
        process.env.NODE_ENV === "development" ? error : undefined
      ),
      request
    );
  }
}
