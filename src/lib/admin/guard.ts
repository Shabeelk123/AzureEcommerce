import "server-only";
import { requireAdmin } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit";
import { ActionError } from "@/lib/safe-action";

/**
 * Shared wrapper for every admin mutation: re-asserts requireAdmin() (the
 * real authorization boundary — proxy.ts's /admin route match is only an
 * optimistic UX pre-filter), runs the mutation, translates a known
 * domain-error class to a user-facing ActionError, and writes one
 * AuditLog row on success. The audit write is best-effort — a logging
 * failure must never mask (or roll back) an already-successful mutation,
 * so it's caught and logged rather than rethrown.
 */
export async function runAdminOp<T>(config: {
  action: string;
  entity: string;
  op: () => Promise<T>;
  entityId: (result: T) => string;
  diff?: (result: T) => Record<string, unknown> | undefined;
  errorClass: new (...args: never[]) => Error;
}): Promise<T> {
  const admin = await requireAdmin();

  let result: T;
  try {
    result = await config.op();
  } catch (error) {
    if (error instanceof config.errorClass) throw new ActionError(error.message);
    throw error;
  }

  await writeAuditLog({
    actorId: admin.id,
    action: config.action,
    entity: config.entity,
    entityId: config.entityId(result),
    diff: config.diff?.(result),
  }).catch((error: unknown) => {
    console.error("[audit] failed to write audit log", error);
  });

  return result;
}
