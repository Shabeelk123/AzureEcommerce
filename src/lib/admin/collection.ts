import "server-only";
import { invalidateTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

export class CollectionActionError extends Error {}

export async function listCollectionsForAdmin() {
  return prisma.collection.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function getCollectionForAdmin(id: string) {
  return prisma.collection.findUnique({ where: { id } });
}

export type CollectionInput = {
  slug: string;
  name: string;
  heroImage?: string | null;
  isFeatured?: boolean;
};

export async function createCollection(input: CollectionInput) {
  const existing = await prisma.collection.findUnique({ where: { slug: input.slug } });
  if (existing) throw new CollectionActionError(`Slug "${input.slug}" is already in use.`);

  const collection = await prisma.collection.create({ data: input });
  invalidateTag("collections");
  return collection;
}

export async function updateCollection(id: string, input: CollectionInput) {
  const existing = await prisma.collection.findUnique({ where: { slug: input.slug } });
  if (existing && existing.id !== id) {
    throw new CollectionActionError(`Slug "${input.slug}" is already in use.`);
  }

  const collection = await prisma.collection
    .update({ where: { id }, data: input })
    .catch(() => {
      throw new CollectionActionError("Collection not found.");
    });
  invalidateTag("collections");
  invalidateTag(`collection:${input.slug}`);
  return collection;
}

export async function deleteCollection(id: string) {
  const collection = await prisma.collection.delete({ where: { id } }).catch(() => {
    throw new CollectionActionError("Collection not found.");
  });
  invalidateTag("collections");
  return collection;
}
