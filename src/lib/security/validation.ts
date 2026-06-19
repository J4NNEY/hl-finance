import { z } from "zod";

// Sanitize string input - remove potentially dangerous characters
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent XSS
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

// Validate and sanitize object
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as Record<string, unknown>;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid("ID tidak valid"),
  
  nama: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(200, "Nama terlalu panjang")
    .transform(sanitizeString),
  
  deskripsi: z
    .string()
    .max(1000, "Deskripsi terlalu panjang")
    .transform(sanitizeString)
    .optional()
    .default(""),
  
  harga: z
    .number()
    .min(0, "Harga tidak boleh negatif")
    .max(999999999999, "Harga terlalu besar"),
  
  persen: z
    .number()
    .min(0, "Persen tidak boleh negatif")
    .max(100, "Persen maksimal 100"),
  
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid (YYYY-MM-DD)"),
  
  nomorBon: z
    .string()
    .min(1, "Nomor bon wajib diisi")
    .max(50, "Nomor bon terlalu panjang")
    .regex(/^[A-Za-z0-9\-_]+$/, "Nomor bon hanya boleh huruf, angka, - dan _")
    .transform((val) => val.toUpperCase()),
};

// Validate request body against schema
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const sanitized = sanitizeObject(body);
    const result = schema.safeParse(sanitized);
    
    if (!result.success) {
      const errorMessage = result.error.issues
        .map((e) => e.message)
        .join(", ");
      return { success: false, error: errorMessage };
    }
    
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Request body tidak valid" };
  }
}

// Check if user is authenticated (for API routes)
export async function checkAuth(
  request: Request
): Promise<{ authenticated: boolean; userId?: string }> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false };
  }
  
  // In production, verify the JWT token here
  // For now, we rely on Supabase auth
  return { authenticated: true };
}
