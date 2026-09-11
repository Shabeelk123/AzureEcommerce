import type { ReactNode } from "react";
import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";
import { playfairDisplay, plusJakartaSans } from "@/lib/fonts";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${playfairDisplay.variable} ${plusJakartaSans.variable} flex min-h-screen flex-col`}
    >
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
