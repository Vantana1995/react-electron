/**
 * GET /api/scripts/test-puppeteer
 * Тестировать Puppeteer скрипт
 */

import { NextRequest, NextResponse } from "next/server";
import { scriptManager } from "@/services/script-manager";
import { ApiResponseBuilder } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing Puppeteer script...");

    // Тестовые параметры
    const testParams = {
      url: "https://twitter.com",
      wait_for: '[data-testid="primaryColumn"]',
    };

    // Тестовые данные устройства
    const testDeviceData = {
      cpu: {
        model: "Intel Core i7-12700K",
        cores: 12,
        architecture: "x64",
      },
      gpu: {
        renderer: "NVIDIA GeForce RTX 3080",
        vendor: "NVIDIA",
        memory: 10240,
      },
      memory: {
        total: 32768,
      },
      os: {
        platform: "Windows",
        version: "10.0.19045",
        architecture: "x64",
      },
      screen: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        colorDepth: 24,
      },
      browser: {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        languages: ["en-US", "en"],
      },
      timezone: "America/New_York",
    };

    // Получаем скрипт
    const script = scriptManager.getScript("puppeteer-browser");
    if (!script) {
      return ApiResponseBuilder.error(
        "SCRIPT_NOT_FOUND",
        "Puppeteer script not found",
        null,
        404
      );
    }

    console.log(
      `📜 Found script: ${script.config.name} v${script.config.version}`
    );

    // Выполняем скрипт
    const result = await scriptManager.executeScript(
      "puppeteer-browser",
      testParams,
      testDeviceData
    );

    if (result.success) {
      return ApiResponseBuilder.success({
        script: {
          id: script.id,
          name: script.config.name,
          version: script.config.version,
        },
        result: result.result,
        executedAt: new Date().toISOString(),
        message: "Puppeteer script executed successfully",
      });
    } else {
      return ApiResponseBuilder.error(
        "SCRIPT_EXECUTION_ERROR",
        result.error || "Script execution failed",
        null,
        500
      );
    }
  } catch (error) {
    console.error("❌ Failed to test Puppeteer script:", error);
    return ApiResponseBuilder.internalError("Failed to test Puppeteer script");
  }
}
