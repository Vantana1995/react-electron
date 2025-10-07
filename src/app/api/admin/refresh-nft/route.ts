/**
 * NFT Refresh API
 * Force refresh NFT verification for specific user or all users
 */

import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";
import { createDynamicNFTVerifier } from "@/services/dynamic-nft-verifier";

/**
 * POST /api/admin/refresh-nft
 * Force refresh NFT verification
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const isAdmin =
      process.env.ADMIN_IPS?.split(",").includes(clientIP) ||
      clientIP === "127.0.0.1" ||
      clientIP === "localhost";

    if (!isAdmin) {
      return ApiResponseBuilder.error(
        "ADMIN_ACCESS_REQUIRED",
        "This endpoint requires admin access",
        null,
        403
      );
    }

    const body = await request.json();
    const { userId, deviceHash, forceRefresh = true } = body;

    if (!userId && !deviceHash) {
      return ApiResponseBuilder.validationError([
        "Either userId or deviceHash is required",
      ]);
    }

    const db = getDBConnection();
    const userModel = new UserModel(db);

    // Find user
    let user;
    if (userId) {
      user = await userModel.findById(userId);
    } else if (deviceHash) {
      user = await userModel.findByDeviceHash(deviceHash);
    }

    if (!user) {
      return ApiResponseBuilder.notFound("User not found");
    }

    if (!user.wallet_address) {
      return ApiResponseBuilder.error(
        "NO_WALLET",
        "User has no wallet address",
        null,
        400
      );
    }

    // Force refresh NFT verification
    const dynamicNFTVerifier = await createDynamicNFTVerifier();
    const verificationResult = await dynamicNFTVerifier.verifyUserNFTs(
      user.id,
      user.wallet_address,
      forceRefresh
    );

    return ApiResponseBuilder.success({
      userId: user.id,
      deviceHash: user.device_hash,
      walletAddress: user.wallet_address,
      verificationResult: {
        subscriptionLevel: verificationResult.subscriptionLevel,
        maxProfiles: verificationResult.maxProfiles,
        ownedNFTs: verificationResult.ownedNFTs,
        accessibleScripts: verificationResult.accessibleScripts.map((s) => ({
          scriptId: s.script_id,
          name: s.name,
          version: s.version,
        })),
        verificationTimestamp: verificationResult.verificationTimestamp,
      },
      refreshed: true,
    });
  } catch (error) {
    console.error("Error refreshing NFT verification:", error);
    return ApiResponseBuilder.internalError(
      "Failed to refresh NFT verification"
    );
  }
}
