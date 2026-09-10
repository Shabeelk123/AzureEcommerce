import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/generated/prisma/enums";

const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-stone-100 text-stone-700",
  PAID: "bg-blue-100 text-blue-700",
  PACKED: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-amber-100 text-amber-700",
};

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={`${STYLES[status]} border-0`}>
      {LABELS[status]}
    </Badge>
  );
}
