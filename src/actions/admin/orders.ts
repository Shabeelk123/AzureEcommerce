"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { runAdminOp } from "@/lib/admin/guard";
import {
  OrderActionError,
  cancelOrder,
  issueRefund,
  markCodCollected,
  markOrderShipped,
  updateOrderStatus,
} from "@/lib/order";

export const updateOrderStatusAction = actionClient
  .inputSchema(
    z.object({ orderId: z.string().min(1), status: z.enum(["PACKED", "DELIVERED"]) }),
  )
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "order.status.update",
      entity: "Order",
      errorClass: OrderActionError,
      op: () => updateOrderStatus(parsedInput.orderId, parsedInput.status),
      entityId: () => parsedInput.orderId,
      diff: () => ({ status: parsedInput.status }),
    });
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
    await runAdminOp({
      action: "order.ship",
      entity: "Order",
      errorClass: OrderActionError,
      op: () =>
        markOrderShipped(parsedInput.orderId, {
          trackingNumber: parsedInput.trackingNumber,
          carrier: parsedInput.carrier,
        }),
      entityId: () => parsedInput.orderId,
      diff: () => ({ trackingNumber: parsedInput.trackingNumber, carrier: parsedInput.carrier }),
    });
    return { ok: true };
  });

export const cancelOrderAction = actionClient
  .inputSchema(z.object({ orderId: z.string().min(1), reason: z.string().trim().max(500).optional() }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "order.cancel",
      entity: "Order",
      errorClass: OrderActionError,
      op: () => cancelOrder(parsedInput.orderId, parsedInput.reason),
      entityId: () => parsedInput.orderId,
      diff: () => ({ reason: parsedInput.reason }),
    });
    return { ok: true };
  });

export const markCodCollectedAction = actionClient
  .inputSchema(z.object({ orderId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "order.cod.collected",
      entity: "Order",
      errorClass: OrderActionError,
      op: () => markCodCollected(parsedInput.orderId),
      entityId: () => parsedInput.orderId,
    });
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
    await runAdminOp({
      action: "order.refund",
      entity: "Order",
      errorClass: OrderActionError,
      op: () =>
        issueRefund(parsedInput.orderId, {
          amountPaise: parsedInput.amountPaise,
          reason: parsedInput.reason,
        }),
      entityId: () => parsedInput.orderId,
      diff: () => ({ amountPaise: parsedInput.amountPaise, reason: parsedInput.reason }),
    });
    return { ok: true };
  });
