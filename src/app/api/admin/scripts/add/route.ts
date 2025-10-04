import { NextRequest } from "next/server";
import { getDBConnection } from "../../../../../config/database";
import { ApiResponseBuilder } from "../../../../../utils/api-response";
import { ScriptModel } from "../../../../../database/models/Script";
import { getClientIP } from "../../../../../utils/validation";

/**
 * Admin endpoint to add new scripts to the library
 * Only accessible from admin IP addresses
 */

// Admin IP whitelist (configure based on your needs)
const ADMIN_IPS = process.env.ADMIN_IPS?.split(",") || ["127.0.0.1", "::1"];

/**
 * Add new script to library
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin IP
    const clientIP = getClientIP(request);
    if (!ADMIN_IPS.includes(clientIP)) {
      console.warn(`⚠️ Unauthorized script add attempt from IP: ${clientIP}`);
      return ApiResponseBuilder.unauthorized(
        "This endpoint is restricted to admin IPs"
      );
    }

    const body = await request.json();
    const {
      script_id,
      name,
      description,
      version,
      ipfs_hash,
      nft_addresses,
      category,
      config,
      metadata,
    } = body;

    // Validate required fields
    if (!script_id || !name || !version || !ipfs_hash) {
      return ApiResponseBuilder.error(
        "MISSING_FIELDS",
        "script_id, name, version, and ipfs_hash are required"
      );
    }

    // Validate NFT addresses format
    if (nft_addresses && !Array.isArray(nft_addresses)) {
      return ApiResponseBuilder.error(
        "INVALID_NFT_ADDRESSES",
        "nft_addresses must be an array"
      );
    }

    // Validate NFT address format (Ethereum addresses)
    if (nft_addresses) {
      const invalidAddresses = nft_addresses.filter(
        (addr: string) => !/^0x[a-fA-F0-9]{40}$/.test(addr)
      );
      if (invalidAddresses.length > 0) {
        return ApiResponseBuilder.error(
          "INVALID_NFT_ADDRESS_FORMAT",
          `Invalid NFT addresses: ${invalidAddresses.join(", ")}`
        );
      }
    }

    const db = getDBConnection();
    const scriptModel = new ScriptModel(db);

    // Check if script already exists
    const existingScript = await scriptModel.findByScriptId(script_id);
    if (existingScript) {
      return ApiResponseBuilder.error(
        "SCRIPT_EXISTS",
        `Script with ID ${script_id} already exists. Use update endpoint to modify.`
      );
    }

    // Create script
    const script = await scriptModel.create({
      script_id,
      name,
      description,
      version,
      ipfs_hash,
      nft_addresses: nft_addresses || [],
      category,
      config,
      metadata,
    });

    // Create initial version
    await scriptModel.createVersion(script.id, {
      version,
      ipfs_hash,
      nft_addresses: nft_addresses || [],
      changelog: "Initial version",
      created_by: clientIP,
      is_current: true,
    });

    console.log(
      `✅ Admin added new script: ${script_id} v${version} from IP ${clientIP}`
    );

    return ApiResponseBuilder.success({
      message: "Script added successfully",
      script: {
        id: script.id,
        script_id: script.script_id,
        name: script.name,
        version: script.version,
        ipfs_hash: script.ipfs_hash,
        nft_addresses: script.nft_addresses,
        category: script.category,
        is_active: script.is_active,
      },
    });
  } catch (error) {
    console.error("❌ Error adding script:", error);
    return ApiResponseBuilder.internalError(
      "Failed to add script",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}

/**
 * Update existing script
 */
export async function PUT(request: NextRequest) {
  try {
    // Check admin IP
    const clientIP = getClientIP(request);
    if (!ADMIN_IPS.includes(clientIP)) {
      console.warn(`⚠️ Unauthorized script update attempt from IP: ${clientIP}`);
      return ApiResponseBuilder.unauthorized(
        "This endpoint is restricted to admin IPs"
      );
    }

    const body = await request.json();
    const {
      script_id,
      name,
      description,
      version,
      ipfs_hash,
      nft_addresses,
      category,
      is_active,
      config,
      metadata,
      changelog,
      create_version,
    } = body;

    // Validate required field
    if (!script_id) {
      return ApiResponseBuilder.error(
        "MISSING_SCRIPT_ID",
        "script_id is required"
      );
    }

    const db = getDBConnection();
    const scriptModel = new ScriptModel(db);

    // Check if script exists
    const existingScript = await scriptModel.findByScriptId(script_id);
    if (!existingScript) {
      return ApiResponseBuilder.notFound(`Script ${script_id} not found`);
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (version !== undefined) updateData.version = version;
    if (ipfs_hash !== undefined) updateData.ipfs_hash = ipfs_hash;
    if (nft_addresses !== undefined) updateData.nft_addresses = nft_addresses;
    if (category !== undefined) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (config !== undefined) updateData.config = config;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Update script
    const updatedScript = await scriptModel.update(script_id, updateData);

    // Create new version if requested
    if (create_version && version && ipfs_hash) {
      await scriptModel.createVersion(existingScript.id, {
        version,
        ipfs_hash,
        nft_addresses: nft_addresses || existingScript.nft_addresses,
        changelog: changelog || "Updated version",
        created_by: clientIP,
        is_current: true,
      });
    }

    console.log(
      `✅ Admin updated script: ${script_id} from IP ${clientIP}`
    );

    return ApiResponseBuilder.success({
      message: "Script updated successfully",
      script: updatedScript,
    });
  } catch (error) {
    console.error("❌ Error updating script:", error);
    return ApiResponseBuilder.internalError(
      "Failed to update script",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}

/**
 * Get all scripts (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin IP
    const clientIP = getClientIP(request);
    if (!ADMIN_IPS.includes(clientIP)) {
      console.warn(`⚠️ Unauthorized script list attempt from IP: ${clientIP}`);
      return ApiResponseBuilder.unauthorized(
        "This endpoint is restricted to admin IPs"
      );
    }

    const db = getDBConnection();
    const scriptModel = new ScriptModel(db);

    const scripts = await scriptModel.getAllActive();
    const stats = await scriptModel.getStats();

    return ApiResponseBuilder.success({
      scripts,
      stats,
    });
  } catch (error) {
    console.error("❌ Error getting scripts:", error);
    return ApiResponseBuilder.internalError(
      "Failed to get scripts",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}

/**
 * Delete script
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check admin IP
    const clientIP = getClientIP(request);
    if (!ADMIN_IPS.includes(clientIP)) {
      console.warn(`⚠️ Unauthorized script delete attempt from IP: ${clientIP}`);
      return ApiResponseBuilder.unauthorized(
        "This endpoint is restricted to admin IPs"
      );
    }

    const body = await request.json();
    const { script_id } = body;

    if (!script_id) {
      return ApiResponseBuilder.error(
        "MISSING_SCRIPT_ID",
        "script_id is required"
      );
    }

    const db = getDBConnection();
    const scriptModel = new ScriptModel(db);

    // Check if script exists
    const existingScript = await scriptModel.findByScriptId(script_id);
    if (!existingScript) {
      return ApiResponseBuilder.notFound(`Script ${script_id} not found`);
    }

    await scriptModel.delete(script_id);

    console.log(
      `✅ Admin deleted script: ${script_id} from IP ${clientIP}`
    );

    return ApiResponseBuilder.success({
      message: "Script deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting script:", error);
    return ApiResponseBuilder.internalError(
      "Failed to delete script",
      process.env.NODE_ENV === "development" ? error : undefined
    );
  }
}
