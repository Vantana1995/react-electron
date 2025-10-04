/**
 * GET /api/scripts/[scriptId]
 * Get information about a specific script
 */

import { NextRequest, NextResponse } from "next/server";
import { scriptManager } from "@/services/script-manager";
import { ApiResponseBuilder } from "@/utils/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: { scriptId: string } }
) {
  try {
    const { scriptId } = params;

    if (!scriptId) {
      return ApiResponseBuilder.error(
        "MISSING_SCRIPT_ID",
        "Script ID is required"
      );
    }

    const script = scriptManager.getScript(scriptId);

    if (!script) {
      return ApiResponseBuilder.error(
        "SCRIPT_NOT_FOUND",
        `Script ${scriptId} not found`,
        null,
        404
      );
    }

    return ApiResponseBuilder.success({
      id: script.id,
      name: script.config.name,
      description: script.config.description,
      version: script.config.version,
      author: script.config.author,
      category: script.config.category,
      tags: script.config.tags,
      requirements: script.config.requirements,
      config: script.config.config,
      features: script.config.features,
      usage: script.config.usage,
      security: script.config.security,
      loaded: script.loaded,
      lastUsed: script.lastUsed,
      path: script.path,
    });
  } catch (error) {
    console.error("❌ Failed to get script info:", error);
    return ApiResponseBuilder.internalError("Failed to get script info");
  }
}
