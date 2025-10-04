import { NextRequest } from "next/server";
import { getDBConnection } from "../../../../config/database";
import { ApiResponseBuilder } from "../../../../utils/api-response";
import { ScriptModel } from "../../../../database/models/Script";
import { UserModel } from "../../../../database/models/User";
import { verifySessionToken } from "../../../../utils/crypto";
import {
  createCorsPreflightResponse,
  addCorsHeaders,
} from "../../../../utils/cors";

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return createCorsPreflightResponse(request);
}

/**
 * Get available scripts for authenticated user based on NFT ownership
 */
export async function GET(request: NextRequest) {
  try {
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

    const db = getDBConnection();
    const userModel = new UserModel(db);
    const scriptModel = new ScriptModel(db);

    // Find user
    const user = await userModel.findByDeviceHash(deviceHash);
    if (!user) {
      return addCorsHeaders(
        ApiResponseBuilder.notFound("User not found"),
        request
      );
    }

    // Get user's NFT cache
    const nftCache = await userModel.getNFTCache(user.id);

    let userNFTAddresses: string[] = [];
    let hasNFT = false;

    if (nftCache && nftCache.has_nft) {
      hasNFT = true;
      userNFTAddresses.push(nftCache.nft_contract);
    }

    // Get scripts available for user's NFT addresses
    const availableScripts = await scriptModel.getByNFTAddresses(
      userNFTAddresses
    );

    // Filter and format scripts
    const scripts = availableScripts.map((script) => ({
      script_id: script.script_id,
      name: script.name,
      description: script.description,
      version: script.version,
      ipfs_hash: script.ipfs_hash,
      category: script.category,
      config: script.config,
      metadata: script.metadata,
      required_nfts: script.nft_addresses,
      user_has_access: true, // Already filtered by access
    }));

    console.log(
      `📋 Retrieved ${scripts.length} available scripts for user ${user.id} (hasNFT: ${hasNFT})`
    );

    return addCorsHeaders(
      ApiResponseBuilder.success({
        scripts,
        user_nft_status: {
          has_nft: hasNFT,
          nft_addresses: userNFTAddresses,
          verified_at: nftCache?.verified_at || null,
        },
        total_scripts: scripts.length,
      }),
      request
    );
  } catch (error) {
    console.error("❌ Error getting available scripts:", error);
    return addCorsHeaders(
      ApiResponseBuilder.internalError(
        "Failed to get available scripts",
        process.env.NODE_ENV === "development" ? error : undefined
      ),
      request
    );
  }
}

/**
 * Get specific script details if user has access
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script_id } = body;

    if (!script_id) {
      return addCorsHeaders(
        ApiResponseBuilder.error("MISSING_SCRIPT_ID", "script_id is required"),
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

    const db = getDBConnection();
    const userModel = new UserModel(db);
    const scriptModel = new ScriptModel(db);

    // Find user
    const user = await userModel.findByDeviceHash(deviceHash);
    if (!user) {
      return addCorsHeaders(
        ApiResponseBuilder.notFound("User not found"),
        request
      );
    }

    // Get user's NFT cache
    const nftCache = await userModel.getNFTCache(user.id);

    let userNFTAddresses: string[] = [];
    if (nftCache && nftCache.has_nft) {
      userNFTAddresses.push(nftCache.nft_contract);
    }

    // Check if user has access to script
    const hasAccess = await scriptModel.userHasAccess(
      script_id,
      userNFTAddresses
    );

    if (!hasAccess) {
      return addCorsHeaders(
        ApiResponseBuilder.error(
          "NO_ACCESS",
          "You do not have access to this script. NFT ownership required."
        ),
        request
      );
    }

    // Get script
    const script = await scriptModel.findByScriptId(script_id);
    if (!script) {
      return addCorsHeaders(
        ApiResponseBuilder.notFound("Script not found"),
        request
      );
    }

    // Get script versions
    const versions = await scriptModel.getVersions(script.id);

    console.log(
      `📋 User ${user.id} accessed script: ${script_id}`
    );

    return addCorsHeaders(
      ApiResponseBuilder.success({
        script: {
          script_id: script.script_id,
          name: script.name,
          description: script.description,
          version: script.version,
          ipfs_hash: script.ipfs_hash,
          category: script.category,
          config: script.config,
          metadata: script.metadata,
          required_nfts: script.nft_addresses,
        },
        versions: versions.map((v) => ({
          version: v.version,
          ipfs_hash: v.ipfs_hash,
          changelog: v.changelog,
          is_current: v.is_current,
          created_at: v.created_at,
        })),
      }),
      request
    );
  } catch (error) {
    console.error("❌ Error getting script details:", error);
    return addCorsHeaders(
      ApiResponseBuilder.internalError(
        "Failed to get script details",
        process.env.NODE_ENV === "development" ? error : undefined
      ),
      request
    );
  }
}
