import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin dashboard" };

async function DashboardStats() {
  const admin = await requireAdmin();

  const [productCount, orderCount, userCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const stats = [
    { label: "Products", value: productCount },
    { label: "Orders", value: orderCount },
    { label: "Customers", value: userCount },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-stone-900">Dashboard</h1>
      <p className="mb-6 text-sm text-stone-500">Signed in as {admin.email}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-stone-200 bg-white p-4"
          >
            <p className="text-sm text-stone-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{stat.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-stone-500">
        Product, order, and coupon management are built in Phase 7 of the project plan.
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
      <DashboardStats />
    </Suspense>
  );
}
