import { Check } from "lucide-react";
import type { OrderStatus } from "@/generated/prisma/enums";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PAID", label: "Order placed" },
  { status: "PACKED", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

const STEP_INDEX: Record<OrderStatus, number> = {
  PENDING: -1,
  PAID: 0,
  PACKED: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: -1,
  REFUNDED: -1,
};

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REFUNDED" || status === "PENDING") {
    return (
      <p className="text-sm text-muted-foreground">
        {status === "PENDING" && "Waiting for payment confirmation."}
        {status === "CANCELLED" && "This order was cancelled."}
        {status === "REFUNDED" && "This order was refunded."}
      </p>
    );
  }

  const currentIndex = STEP_INDEX[status];

  return (
    <ol className="flex items-center">
      {STEPS.map((step, index) => {
        const complete = index <= currentIndex;
        const isLast = index === STEPS.length - 1;
        return (
          <li key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={`text-xs whitespace-nowrap ${complete ? "font-medium" : "text-muted-foreground"}`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`mx-2 h-0.5 flex-1 ${index < currentIndex ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
