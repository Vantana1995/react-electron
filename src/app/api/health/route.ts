import { testDBConnection } from "@/config/database";
import { ApiResponseBuilder } from "@/utils/api-response";

export async function GET() {
  try {
    const dbHealthy = await testDBConnection();

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? "healthy" : "unhealthy",
        api: "healthy",
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || "development",
    };

    return ApiResponseBuilder.success(healthStatus);
  } catch {
    return ApiResponseBuilder.internalError("Health check failed");
  }
}
