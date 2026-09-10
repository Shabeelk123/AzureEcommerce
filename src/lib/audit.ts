import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Every admin mutation writes one row here. `diff` is deliberately loose
 * (`Record<string, unknown>`, not a typed per-entity shape) — this is a
 * forensic trail for "who changed what, when", not a system anything else
 * reads back programmatically, so a rigid schema would only get in the way
 * as entities evolve.
 */
export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  diff?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      diff: (params.diff as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}
