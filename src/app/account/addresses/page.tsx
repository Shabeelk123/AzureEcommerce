import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { deleteAddress, setDefaultAddress } from "@/actions/account";
import { AddressForm } from "@/components/account/address-form";

export const metadata: Metadata = { title: "Your addresses" };

async function AddressList() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const addresses = await prisma.address.findMany({
    where: { userId: sessionUser.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      {addresses.length > 0 && (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-lg border border-stone-200 bg-white p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900">
                    {address.fullName}{" "}
                    {address.isDefault && (
                      <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-stone-600">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                    {address.state} {address.pincode}
                  </p>
                  <p className="text-stone-500">{address.phone}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {!address.isDefault && (
                    <form action={setDefaultAddress.bind(null, address.id)}>
                      <button
                        type="submit"
                        className="text-xs text-stone-500 hover:underline"
                      >
                        Set default
                      </button>
                    </form>
                  )}
                  <form action={deleteAddress.bind(null, address.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-stone-900">Add a new address</h2>
        <AddressForm />
      </div>
    </div>
  );
}

export default function AddressesPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-stone-900">Your addresses</h1>
      <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
        <AddressList />
      </Suspense>
    </div>
  );
}
