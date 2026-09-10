import "server-only";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function listCustomersForAdmin(params: { search?: string; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const where = {
    role: "CUSTOMER" as const,
    ...(params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: "insensitive" as const } },
            { name: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerifiedAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { customers, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getCustomerForAdmin(id: string) {
  return prisma.user.findUnique({
    where: { id, role: "CUSTOMER" },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: { orderBy: { placedAt: "desc" }, take: 10 },
    },
  });
}
