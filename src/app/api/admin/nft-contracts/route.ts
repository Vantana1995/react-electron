/**
 * NFT Contracts Management API
 * Admin endpoint for managing NFT contract listeners
 */

import { NextRequest } from "next/server";
import { ApiResponseBuilder } from "@/utils/api-response";
import { getClientIP } from "@/utils/validation";
import { dynamicNFTListenerManager } from "@/services/dynamic-nft-listener-manager";
import { getDBConnection } from "@/config/database";
import { ScriptModel } from "@/database/models/Script";

// Admin IP whitelist
const ADMIN_IPS = process.env.ADMIN_IPS?.split(",") || ["127.0.0.1", "::1"];

/**
 * GET /api/admin/nft-contracts
 * Get status of all NFT contract listeners
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin IP
    const clientIP = getClientIP(request);
    if (!ADMIN_IPS.includes(clientIP)) {
      console.warn(
        `⚠️ Unauthorized NFT contracts status attempt from IP: ${clientIP}`
      );
      return ApiResponseBuilder.unauthorized(
        "This endpoint is restricted to admin IPs"
      );
    }

    const managerStatus = dynamicNFTListenerManager.getManagerStatus();
    const listeners = dynamicNFTListenerManager.getStatus();

    return ApiResponseBuilder.success({
      manager: managerStatus,
      listeners: listeners,
      summary: {
        totalContracts: managerStatus.totalListeners,
        activeListeners: managerStatus.activeListeners,
        inactiveListeners:
          managerStatus.totalListeners - managerStatus.activeListeners,
      },
    });
  } catch (error) {
    console.error("❌ Error getting NFT contracts status:", error);
    return ApiResponseBuilder.internalError(
      "Failed to get NFT contracts status",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}

/**
 * POST /api/admin/nft-contracts/refresh
 * Force refresh NFT contract listeners
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin IP
    const clientIP = getClientIP(request);
    if (!ADMIN_IPS.includes(clientIP)) {
      console.warn(
        `⚠️ Unauthorized NFT contracts refresh attempt from IP: ${clientIP}`
      );
      return ApiResponseBuilder.unauthorized(
        "This endpoint is restricted to admin IPs"
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "refresh") {
      console.log(`🔄 Admin ${clientIP} requested listener refresh`);
      await dynamicNFTListenerManager.forceRefresh();

      const managerStatus = dynamicNFTListenerManager.getManagerStatus();

      return ApiResponseBuilder.success({
        message: "NFT contract listeners refreshed successfully",
        manager: managerStatus,
        refreshed: true,
      });
    } else if (action === "start") {
      console.log(`🚀 Admin ${clientIP} requested manager start`);
      await dynamicNFTListenerManager.start();

      const managerStatus = dynamicNFTListenerManager.getManagerStatus();

      return ApiResponseBuilder.success({
        message: "NFT Listener Manager started successfully",
        manager: managerStatus,
        started: true,
      });
    } else if (action === "stop") {
      console.log(`🛑 Admin ${clientIP} requested manager stop`);
      await dynamicNFTListenerManager.stop();

      const managerStatus = dynamicNFTListenerManager.getManagerStatus();

      return ApiResponseBuilder.success({
        message: "NFT Listener Manager stopped successfully",
        manager: managerStatus,
        stopped: true,
      });
    } else {
      return ApiResponseBuilder.error(
        "INVALID_ACTION",
        "Valid actions are: refresh, start, stop"
      );
    }
  } catch (error) {
    console.error("❌ Error managing NFT contracts:", error);
    return ApiResponseBuilder.internalError(
      "Failed to manage NFT contracts",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}

/**
 * GET /api/admin/nft-contracts/contracts
 * Get list of all NFT contracts from active scripts
 */
export async function PUT(request: NextRequest) {
  try {
    // Check admin IP
    const clientIP = getClientIP(request);
    if (!ADMIN_IPS.includes(clientIP)) {
      console.warn(
        `⚠️ Unauthorized NFT contracts list attempt from IP: ${clientIP}`
      );
      return ApiResponseBuilder.unauthorized(
        "This endpoint is restricted to admin IPs"
      );
    }

    const db = getDBConnection();
    const scriptModel = new ScriptModel(db);

    // Get all unique NFT addresses from active scripts
    const nftAddresses = await scriptModel.getAllNFTAddresses();

    // Get scripts that use each NFT contract
    const contractsWithScripts = await Promise.all(
      nftAddresses.map(async (contractAddress) => {
        const scripts = await scriptModel.getByNFTAddresses([contractAddress]);
        return {
          contractAddress,
          scriptCount: scripts.length,
          scriptNames: scripts.map((s) => s.name),
          scripts: scripts.map((s) => ({
            scriptId: s.script_id,
            name: s.name,
            version: s.version,
            category: s.category,
          })),
        };
      })
    );

    // Get listener status for each contract
    const contractsWithStatus = contractsWithScripts.map((contract) => {
      const listenerStatus = dynamicNFTListenerManager.getListenerStatus(
        contract.contractAddress
      );
      return {
        ...contract,
        listener: listenerStatus,
      };
    });

    return ApiResponseBuilder.success({
      contracts: contractsWithStatus,
      summary: {
        totalContracts: nftAddresses.length,
        contractsWithListeners: contractsWithStatus.filter((c) => c.listener)
          .length,
        contractsWithoutListeners: contractsWithStatus.filter(
          (c) => !c.listener
        ).length,
      },
    });
  } catch (error) {
    console.error("❌ Error getting NFT contracts list:", error);
    return ApiResponseBuilder.internalError(
      "Failed to get NFT contracts list",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}
