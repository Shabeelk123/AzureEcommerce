"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function CartContentsSkeleton() {
  return (
    <div className="space-y-4 px-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-20 w-16 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartSheet({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The header (and this Sheet instance) lives in a layout that persists
  // across client-side navigations, so without this the drawer would stay
  // visually open on top of /cart after clicking "View cart". This is
  // React's sanctioned "adjust state during render" pattern (not a
  // useEffect) for reacting to a changing external value — setState here
  // is applied before the render commits, instead of after an extra
  // effect-triggered pass. See react.dev/learn/you-might-not-need-an-effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cart">
          {trigger}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export { CartContentsSkeleton };
