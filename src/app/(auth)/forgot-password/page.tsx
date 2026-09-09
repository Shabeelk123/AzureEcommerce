import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-6 text-center text-xl font-semibold text-stone-900">
        Reset your password
      </h1>
      <ForgotPasswordForm />
    </>
  );
}
