import { ApiResponseBuilder } from "@/utils/api-response";

export async function GET() {
  try {
    const status = {
      service: "Twitter Automation Platform API",
      version: "1.0.0",
      status: "online",
      timestamp: new Date().toISOString(),
      features: {
        authentication: "enabled",
        deviceFingerprinting: "enabled",
        scriptDelivery: "enabled",
        paymentProcessing: "enabled",
        websocketConnections: "enabled",
      },
    };

    return ApiResponseBuilder.success(status);
  } catch {
    return ApiResponseBuilder.internalError("Status check failed");
  }
}
