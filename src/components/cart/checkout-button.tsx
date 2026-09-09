"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutButton() {
  return (
    <Button
      className="w-full"
      onClick={() => toast.info("Checkout is coming in the next build phase.")}
    >
      Proceed to checkout
    </Button>
  );
}
