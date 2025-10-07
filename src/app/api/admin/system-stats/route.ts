/**
 * System Statistics API
 * Provides comprehensive system statistics for admin monitoring
 */

import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { getDBConnection } from "@/config/database";
import { createDynamicNFTVerifier } from "@/services/dynamic-nft-verifier";

/**
 * GET /api/admin/system-stats
 * Get comprehensive system statistics
 */
export async function GET(request: NextRequest) {
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

    // Get system statistics
    const dynamicNFTVerifier = await createDynamicNFTVerifier();
    const stats = await dynamicNFTVerifier.getSystemStats();
    const nftContractsWithScripts =
      await dynamicNFTVerifier.getNFTContractsWithScripts();

    // Get NFT listener manager status
    const { dynamicNFTListenerManager } = await import(
      "@/services/dynamic-nft-listener-manager"
    );
    const listenerManagerStatus = dynamicNFTListenerManager.getManagerStatus();

    return ApiResponseBuilder.success({
      system: stats,
      nftContracts: nftContractsWithScripts,
      nftListeners: listenerManagerStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting system stats:", error);
    return ApiResponseBuilder.internalError("Failed to get system statistics");
  }
}
