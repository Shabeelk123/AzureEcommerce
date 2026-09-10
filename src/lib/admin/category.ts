import "server-only";
import { invalidateTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

export class CategoryActionError extends Error {}

export async function listCategoriesForAdmin() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function getCategoryForAdmin(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export type CategoryInput = {
  slug: string;
  name: string;
  description?: string | null;
  image?: string | null;
  sortOrder?: number;
};

export async function createCategory(input: CategoryInput) {
  const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
  if (existing) throw new CategoryActionError(`Slug "${input.slug}" is already in use.`);

  const category = await prisma.category.create({ data: input });
  invalidateTag("categories");
  return category;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
  if (existing && existing.id !== id) {
    throw new CategoryActionError(`Slug "${input.slug}" is already in use.`);
  }

  const category = await prisma.category
    .update({ where: { id }, data: input })
    .catch(() => {
      throw new CategoryActionError("Category not found.");
    });
  invalidateTag("categories");
  invalidateTag(`category:${input.slug}`);
  return category;
}

export async function deleteCategory(id: string) {
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new CategoryActionError(
      `Cannot delete a category with ${productCount} product(s) assigned to it. Reassign or archive them first.`,
    );
  }
  const category = await prisma.category.delete({ where: { id } }).catch(() => {
    throw new CategoryActionError("Category not found.");
  });
  invalidateTag("categories");
  return category;
}
