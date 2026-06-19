import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Security headers configuration
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");
  
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions policy - restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  
  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // Strict Transport Security (HSTS)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}

export async function proxy(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Block access to sensitive files
  const blockedPaths = [
    "/.env",
    "/.env.local",
    "/.env.production",
    "/.git",
    "/.gitignore",
    "/package.json",
    "/package-lock.json",
    "/tsconfig.json",
    "/next.config.ts",
  ];

  if (blockedPaths.some((path) => pathname.startsWith(path))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Rate limiting for login attempts
  if (pathname === "/api/auth/login" || pathname === "/login") {
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    // Simple in-memory rate limiting (in production, use Redis)
    const rateLimitKey = `login_${ip}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;
    
    // Store in memory (for demo - in production use Redis/Upstash)
    if (!globalThis.loginAttempts) {
      globalThis.loginAttempts = new Map();
    }
    
    const attempts = globalThis.loginAttempts.get(rateLimitKey) || { count: 0, resetTime: now + windowMs };
    
    if (now > attempts.resetTime) {
      attempts.count = 0;
      attempts.resetTime = now + windowMs;
    }
    
    if (attempts.count >= maxAttempts) {
      return new NextResponse(
        JSON.stringify({ error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }),
        { 
          status: 429,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    if (pathname === "/api/auth/login") {
      attempts.count++;
      globalThis.loginAttempts.set(rateLimitKey, attempts);
    }
  }

  // Update session and get response
  const response = await updateSession(request);

  // Add security headers to all responses
  const secureResponse = addSecurityHeaders(response);

  return secureResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Extend globalThis type for rate limiting
declare global {
  var loginAttempts: Map<string, { count: number; resetTime: number }> | undefined;
}
