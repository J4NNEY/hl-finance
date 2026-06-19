import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "./rate-limit";
import { logAudit, type AuditAction, type AuditResource } from "./audit";

interface ApiHandlerOptions {
  requireAuth?: boolean;
  rateLimit?: keyof typeof RATE_LIMITS;
  audit?: {
    action: AuditAction;
    resource: AuditResource;
  };
}

type ApiHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withApiSecurity(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
): ApiHandler {
  return async (request: NextRequest, context?) => {
    const { requireAuth = true, rateLimit = "API", audit } = options;

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(
      `${rateLimit}_${clientId}`,
      RATE_LIMITS[rateLimit]
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak request. Coba lagi nanti." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Authentication check
    if (requireAuth) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    try {
      // Execute the handler
      const response = await handler(request, context);

      // Audit logging
      if (audit && response.status < 400) {
        await logAudit({
          action: audit.action,
          resource: audit.resource,
          details: {
            method: request.method,
            url: request.url,
            status: response.status,
          },
        });
      }

      // Add rate limit headers
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString()
      );
      response.headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimitResult.resetTime).toISOString()
      );

      return response;
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  };
}

// Helper for creating secure GET/POST/PUT/DELETE handlers
export function createSecureApiHandler(handlers: {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  DELETE?: ApiHandler;
}, options?: ApiHandlerOptions) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const method = request.method.toUpperCase() as keyof typeof handlers;
    const handler = handlers[method];

    if (!handler) {
      return NextResponse.json(
        { error: `Method ${method} not allowed` },
        { status: 405 }
      );
    }

    return withApiSecurity(handler, options)(request, context);
  };
}
