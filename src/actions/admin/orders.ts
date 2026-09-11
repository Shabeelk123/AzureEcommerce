"use server";

import { z } from "zod";
import { actionClient, ActionError } from "@/lib/safe-action";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  OrderActionError,
  cancelOrder,
  issueRefund,
  markCodCollected,
  markOrderShipped,
  updateOrderStatus,
} from "@/lib/order";

/** Every admin action re-asserts requireAdmin() itself — proxy.ts's route
 * match on /admin is an optimistic UX pre-filter, never the real
 * authorization boundary (see src/proxy.ts and src/lib/auth/current-user.ts). */
async function runAdminOrderOp(op: () => Promise<void>): Promise<void> {
  await requireAdmin();
  try {
    await op();
  } catch (error) {
    if (error instanceof OrderActionError) throw new ActionError(error.message);
    throw error;
  }
}

export const updateOrderStatusAction = actionClient
  .inputSchema(
    z.object({ orderId: z.string().min(1), status: z.enum(["PACKED", "DELIVERED"]) }),
  )
  .action(async ({ parsedInput }) => {
    await runAdminOrderOp(() => updateOrderStatus(parsedInput.orderId, parsedInput.status));
    return { ok: true };
  });

export const markShippedAction = actionClient
  .inputSchema(
    z.object({
      orderId: z.string().min(1),
      trackingNumber: z.string().trim().min(1, "Tracking number is required").max(100),
      carrier: z.string().trim().min(1, "Carrier is required").max(100),
    }),
  )
  .action(async ({ parsedInput }) => {
    await runAdminOrderOp(() =>
      markOrderShipped(parsedInput.orderId, {
        trackingNumber: parsedInput.trackingNumber,
        carrier: parsedInput.carrier,
      }),
    );
    return { ok: true };
  });

export const cancelOrderAction = actionClient
  .inputSchema(z.object({ orderId: z.string().min(1), reason: z.string().trim().max(500).optional() }))
  .action(async ({ parsedInput }) => {
    await runAdminOrderOp(() => cancelOrder(parsedInput.orderId, parsedInput.reason));
    return { ok: true };
  });

export const markCodCollectedAction = actionClient
  .inputSchema(z.object({ orderId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOrderOp(() => markCodCollected(parsedInput.orderId));
    return { ok: true };
  });

export const refundOrderAction = actionClient
  .inputSchema(
    z.object({
      orderId: z.string().min(1),
      amountPaise: z.number().int().positive().optional(),
      reason: z.string().trim().max(500).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    await runAdminOrderOp(() =>
      issueRefund(parsedInput.orderId, {
        amountPaise: parsedInput.amountPaise,
        reason: parsedInput.reason,
      }),
    );
    return { ok: true };
  });
