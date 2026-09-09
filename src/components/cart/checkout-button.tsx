import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CheckoutButton() {
  return (
    <Button asChild className="w-full">
      <Link href="/checkout">Proceed to checkout</Link>
    </Button>
  );
}
