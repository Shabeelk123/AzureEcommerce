"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  cancelOrderAction,
  markCodCollectedAction,
  markShippedAction,
  refundOrderAction,
  updateOrderStatusAction,
} from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import type { OrderStatus, PaymentMethod } from "@/generated/prisma/enums";

export function AdminOrderActions({
  orderId,
  status,
  paymentMethod,
  codCollectedAt,
  canRefund,
  refundableAmountPaise,
}: {
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  codCollectedAt: Date | null;
  canRefund: boolean;
  refundableAmountPaise: number;
}) {
  const router = useRouter();
  const [showShipForm, setShowShipForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  function onSuccess(message: string) {
    toast.success(message);
    router.refresh();
  }
  function onError(error: { serverError?: string }, fallback: string) {
    toast.error(error.serverError ?? fallback);
  }

  const statusAction = useAction(updateOrderStatusAction, {
    onSuccess: () => onSuccess("Order updated."),
    onError: ({ error }) => onError(error, "Couldn't update order."),
  });
  const shipAction = useAction(markShippedAction, {
    onSuccess: () => {
      onSuccess("Order marked as shipped.");
      setShowShipForm(false);
    },
    onError: ({ error }) => onError(error, "Couldn't mark as shipped."),
  });
  const cancelAction = useAction(cancelOrderAction, {
    onSuccess: () => {
      onSuccess("Order cancelled.");
      setShowCancelForm(false);
    },
    onError: ({ error }) => onError(error, "Couldn't cancel order."),
  });
  const refundAction = useAction(refundOrderAction, {
    onSuccess: () => {
      onSuccess("Refund initiated.");
      setShowRefundForm(false);
    },
    onError: ({ error }) => onError(error, "Couldn't issue refund."),
  });
  const codCollectedAction = useAction(markCodCollectedAction, {
    onSuccess: () => onSuccess("Cash collection recorded."),
    onError: ({ error }) => onError(error, "Couldn't record cash collection."),
  });

  const pending =
    statusAction.isExecuting ||
    shipAction.isExecuting ||
    cancelAction.isExecuting ||
    refundAction.isExecuting ||
    codCollectedAction.isExecuting;

  const canPack = status === "PAID";
  const canShip = status === "PAID" || status === "PACKED";
  const canDeliver = status === "SHIPPED";
  const canCancel = status === "PENDING" || status === "PAID" || status === "PACKED";
  const canMarkCodCollected =
    paymentMethod === "COD" && !codCollectedAt && status !== "CANCELLED";

  return (
    <div className="space-y-4 rounded-lg border p-5">
      <h2 className="text-sm font-semibold">Manage order</h2>

      <div className="flex flex-wrap gap-2">
        {canPack && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => statusAction.execute({ orderId, status: "PACKED" })}
          >
            Mark as packed
          </Button>
        )}
        {canShip && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setShowShipForm((v) => !v)}>
            Mark as shipped
          </Button>
        )}
        {canDeliver && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => statusAction.execute({ orderId, status: "DELIVERED" })}
          >
            Mark as delivered
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setShowCancelForm((v) => !v)}
          >
            Cancel order
          </Button>
        )}
        {canRefund && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setShowRefundForm((v) => !v)}
          >
            Issue refund
          </Button>
        )}
        {canMarkCodCollected && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => codCollectedAction.execute({ orderId })}
          >
            Mark cash collected
          </Button>
        )}
      </div>

      {showShipForm && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Input
            placeholder="Tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
          <Input placeholder="Carrier (e.g. Delhivery)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          <Button
            size="sm"
            disabled={!trackingNumber || !carrier || shipAction.isExecuting}
            onClick={() => shipAction.execute({ orderId, trackingNumber, carrier })}
          >
            Confirm shipment
          </Button>
        </div>
      )}

      {showCancelForm && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Input
            placeholder="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            If this order was already paid, a full refund will be initiated automatically.
          </p>
          <Button
            size="sm"
            variant="destructive"
            disabled={cancelAction.isExecuting}
            onClick={() => cancelAction.execute({ orderId, reason: cancelReason || undefined })}
          >
            Confirm cancellation
          </Button>
        </div>
      )}

      {showRefundForm && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Leave amount blank for a full refund (up to {formatINR(refundableAmountPaise)}).
          </p>
          <Input
            placeholder="Amount in rupees (optional)"
            inputMode="decimal"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
          <Input
            placeholder="Reason (optional)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={refundAction.isExecuting}
            onClick={() =>
              refundAction.execute({
                orderId,
                amountPaise: refundAmount ? Math.round(Number(refundAmount) * 100) : undefined,
                reason: refundReason || undefined,
              })
            }
          >
            Confirm refund
          </Button>
        </div>
      )}
    </div>
  );
}
