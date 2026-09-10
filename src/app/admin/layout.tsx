import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth";

// See src/app/account/layout.tsx for why the session isn't read here.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-56 shrink-0 border-r border-stone-200 bg-stone-950 px-4 py-6 text-stone-100">
        <p className="mb-6 text-lg font-semibold tracking-tight">AzureHijabs Admin</p>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/admin" className="text-stone-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/admin/products" className="text-stone-300 hover:text-white">
            Products
          </Link>
          <Link href="/admin/inventory" className="text-stone-300 hover:text-white">
            Inventory
          </Link>
          <Link href="/admin/categories" className="text-stone-300 hover:text-white">
            Categories
          </Link>
          <Link href="/admin/collections" className="text-stone-300 hover:text-white">
            Collections
          </Link>
          <Link href="/admin/coupons" className="text-stone-300 hover:text-white">
            Coupons
          </Link>
          <Link href="/admin/orders" className="text-stone-300 hover:text-white">
            Orders
          </Link>
          <Link href="/admin/customers" className="text-stone-300 hover:text-white">
            Customers
          </Link>
          <Link href="/admin/settings" className="text-stone-300 hover:text-white">
            Settings
          </Link>
        </nav>
        <form action={logout} className="mt-8">
          <button
            type="submit"
            className="text-sm text-stone-400 hover:text-white hover:underline"
          >
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 bg-stone-50 p-8">{children}</main>
    </div>
  );
}
