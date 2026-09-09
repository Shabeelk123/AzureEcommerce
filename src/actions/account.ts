"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { addressSchema } from "@/lib/validators/auth";

export type AddressFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function addAddress(
  _prevState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireUser();

  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }
    const existingCount = await tx.address.count({ where: { userId: user.id } });
    await tx.address.create({
      data: {
        userId: user.id,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2 || null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        // The very first address a user adds is their default, whether or
        // not they ticked the box.
        isDefault: data.isDefault || existingCount === 0,
      },
    });
  });

  revalidatePath("/account/addresses");
  return null;
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = await requireUser();
  await prisma.address.deleteMany({ where: { id: addressId, userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  const user = await requireUser();
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.updateMany({
      where: { id: addressId, userId: user.id },
      data: { isDefault: true },
    }),
  ]);
  revalidatePath("/account/addresses");
}
