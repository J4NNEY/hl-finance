import { createClient } from "@/lib/supabase/server";

export type AuditAction = 
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "SETTLE"
  | "EXPORT";

export type AuditResource = 
  | "customer"
  | "product"
  | "transaction"
  | "auth"
  | "report";

interface AuditLogEntry {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

// In-memory audit log (in production, use database table)
const auditLogs: (AuditLogEntry & { timestamp: string; userId: string })[] = [];

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const logEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      userId: user?.id || "anonymous",
    };

    // Store in memory (for demo)
    auditLogs.push(logEntry);

    // Keep only last 1000 entries in memory
    if (auditLogs.length > 1000) {
      auditLogs.splice(0, auditLogs.length - 1000);
    }

    // In production, insert into database:
    // await supabase.from("audit_logs").insert(logEntry);

    console.log(`[AUDIT] ${entry.action} ${entry.resource} ${entry.resourceId || ""}`, entry.details);
  } catch (error) {
    console.error("[AUDIT] Failed to log audit:", error);
  }
}

export function getAuditLogs(
  filter?: {
    action?: AuditAction;
    resource?: AuditResource;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }
): typeof auditLogs {
  let filtered = [...auditLogs];

  if (filter?.action) {
    filtered = filtered.filter((log) => log.action === filter.action);
  }

  if (filter?.resource) {
    filtered = filtered.filter((log) => log.resource === filter.resource);
  }

  if (filter?.userId) {
    filtered = filtered.filter((log) => log.userId === filter.userId);
  }

  if (filter?.startDate) {
    filtered = filtered.filter((log) => log.timestamp >= filter.startDate!);
  }

  if (filter?.endDate) {
    filtered = filtered.filter((log) => log.timestamp <= filter.endDate!);
  }

  return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
