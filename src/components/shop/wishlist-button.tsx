"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { toggleWishlistAction } from "@/actions/wishlist";

export function WishlistButton({
  productId,
  initialWishlisted,
  className,
}: {
  productId: string;
  initialWishlisted: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);

  const action = useAction(toggleWishlistAction, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setWishlisted(data.wishlisted);
      router.refresh(); // updates the header wishlist badge
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update your wishlist.");
    },
  });

  return (
    <button
      type="button"
      aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={wishlisted}
      disabled={action.isExecuting}
      onClick={(e) => {
        // These buttons are nested inside card-level <Link>s (see
        // DesignProductCard) — without this, the click bubbles up to the
        // stretched link and navigates to the product page instead of
        // just toggling the heart.
        e.preventDefault();
        e.stopPropagation();
        action.execute({ productId });
      }}
      className={className}
    >
      <Heart
        className={`h-4.5 w-4.5 transition-colors ${wishlisted ? "fill-[#79564f] text-[#79564f]" : ""}`}
      />
    </button>
  );
}
