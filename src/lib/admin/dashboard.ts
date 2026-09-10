import "server-only";
import { prisma } from "@/lib/prisma";

export type DashboardRange = "7d" | "30d" | "90d";

function rangeToDays(range: DashboardRange): number {
  switch (range) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    case "30d":
    default:
      return 30;
  }
}

// Revenue counts only orders that actually collected money — PENDING orders
// (checkout started, payment never completed) must not inflate revenue.
const REVENUE_STATUSES = ["PAID", "PACKED", "SHIPPED", "DELIVERED"] as const;

export async function getDashboardStats(range: DashboardRange = "30d") {
  const since = new Date();
  since.setDate(since.getDate() - rangeToDays(range));

  // Kept out of the Promise.all array literal below: Prisma's conditional
  // aggregate return type doesn't narrow correctly when inferred inside a
  // mixed-shape array, so this is awaited on its own to get a concrete type.
  const revenueAggPromise = prisma.order.aggregate({
    where: { status: { in: [...REVENUE_STATUSES] }, placedAt: { gte: since } },
    _sum: { totalPaise: true },
    _count: true,
  });

  const [revenueAgg, lowStockVariants, recentOrders, productCount, customerCount] =
    await Promise.all([
      revenueAggPromise,
      // Prisma's fluent API can't compare two columns of the same row
      // (stock <= lowStockThreshold) in a `where` clause, so this pulls
      // active variants ordered by stock and filters in JS. Capped at a
      // generous window (200) rather than the whole table — this is a
      // dashboard glance, not the full low-stock report.
      prisma.productVariant
        .findMany({
          where: { isActive: true },
          include: { product: { select: { title: true, slug: true } } },
          orderBy: { stock: "asc" },
          take: 200,
        })
        .then((variants) => variants.filter((v) => v.stock <= v.lowStockThreshold).slice(0, 10)),
      prisma.order.findMany({
        orderBy: { placedAt: "desc" },
        take: 8,
        select: { id: true, orderNumber: true, email: true, status: true, totalPaise: true, placedAt: true },
      }),
      prisma.product.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

  const orderCount = revenueAgg._count;
  const revenuePaise = revenueAgg._sum.totalPaise ?? 0;
  const averageOrderValuePaise = orderCount > 0 ? Math.round(revenuePaise / orderCount) : 0;

  return {
    range,
    revenuePaise,
    orderCount,
    averageOrderValuePaise,
    lowStockVariants,
    recentOrders,
    productCount,
    customerCount,
  };
}
