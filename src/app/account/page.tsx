import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { logout } from "@/actions/auth";

export const metadata: Metadata = { title: "Your account" };

async function Profile() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      phone: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">
          Welcome, {user.name ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Member since{" "}
          {user.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>

      <dl className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-stone-500">Email</dt>
          <dd className="flex items-center gap-2 text-sm text-stone-900">
            {user.email}
            {user.emailVerifiedAt ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                Unverified
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-stone-500">Phone</dt>
          <dd className="text-sm text-stone-900">{user.phone ?? "—"}</dd>
        </div>
      </dl>

      <form action={logout} className="sm:hidden">
        <button
          type="submit"
          className="text-sm text-stone-500 hover:text-stone-900 hover:underline"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading your account…</p>}>
      <Profile />
    </Suspense>
  );
}
