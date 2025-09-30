import { NextResponse } from "next/server";
import { ERROR_CODES } from "./constants";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export class ApiResponseBuilder {
  /**
   * Create a successful API response
   */
  static success<T>(data?: T, status: number = 200): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status });
  }

  /**
   * Create an error API response
   */
  static error(
    code: string,
    message: string,
    details?: unknown,
    status: number = 400
  ): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status });
  }

  /**
   * Create a validation error response
   */
  static validationError(details: unknown): NextResponse {
    return this.error(
      ERROR_CODES.VALIDATION_ERROR,
      "Validation failed",
      details,
      400
    );
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(message: string = "Unauthorized access"): NextResponse {
    return this.error(ERROR_CODES.UNAUTHORIZED, message, null, 401);
  }

  /**
   * Create a forbidden error response
   */
  static forbidden(message: string = "Insufficient privileges"): NextResponse {
    return this.error(ERROR_CODES.INSUFFICIENT_PRIVILEGES, message, null, 403);
  }

  /**
   * Create a not found error response
   */
  static notFound(message: string = "Resource not found"): NextResponse {
    return this.error("NOT_FOUND", message, null, 404);
  }

  /**
   * Create a rate limit error response
   */
  static rateLimitExceeded(): NextResponse {
    return this.error(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      "Rate limit exceeded. Please try again later.",
      null,
      429
    );
  }

  /**
   * Create an internal server error response
   */
  static internalError(
    message: string = "Internal server error",
    details?: unknown
  ): NextResponse {
    return this.error(ERROR_CODES.INTERNAL_SERVER_ERROR, message, details, 500);
  }

  /**
   * Create a database error response
   */
  static databaseError(
    message: string = "Database operation failed"
  ): NextResponse {
    return this.error(ERROR_CODES.DATABASE_ERROR, message, null, 500);
  }
}

/**
 * Handle async errors in API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Type guard for error objects
  const isErrorWithCode = (err: unknown): err is { code: string } => {
    return typeof err === "object" && err !== null && "code" in err;
  };

  const isErrorWithName = (
    err: unknown
  ): err is { name: string; details?: unknown } => {
    return typeof err === "object" && err !== null && "name" in err;
  };

  const isErrorWithMessage = (err: unknown): err is { message: string } => {
    return typeof err === "object" && err !== null && "message" in err;
  };

  // Database errors
  if (isErrorWithCode(error) && error.code === "23505") {
    // Unique constraint violation
    return ApiResponseBuilder.error(
      "DUPLICATE_ENTRY",
      "Resource already exists",
      null,
      409
    );
  }

  // Validation errors
  if (isErrorWithName(error) && error.name === "ValidationError") {
    return ApiResponseBuilder.validationError(error.details);
  }

  // Default to internal server error
  return ApiResponseBuilder.internalError(
    process.env.NODE_ENV === "development" && isErrorWithMessage(error)
      ? error.message
      : "Something went wrong"
  );
}
