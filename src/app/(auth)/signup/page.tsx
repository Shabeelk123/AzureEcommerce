import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-6 text-center text-xl font-semibold text-stone-900">
        Create your account
      </h1>
      <SignupForm />
    </>
  );
}
