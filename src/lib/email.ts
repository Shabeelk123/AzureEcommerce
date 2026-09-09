import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { env } from "@/env";
import { VerifyEmail } from "@/emails/verify-email";
import { ResetPasswordEmail } from "@/emails/reset-password";

const resend = new Resend(env.RESEND_API_KEY);
const SEND_TIMEOUT_MS = 5000;

// Neither signup nor password-reset should be able to hang on Resend being
// slow or unreachable — every caller already treats a thrown error here as
// non-fatal (signup logs and continues; the reset flow always returns the
// same generic message regardless). A timeout just bounds how long that
// takes to give up.
async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), SEND_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const html = await render(VerifyEmail({ verifyUrl }));
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Verify your email — AzureHijabs",
      html,
    }),
    "sendVerificationEmail",
  );
  if (error) {
    console.error("[email] failed to send verification email", error);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = await render(ResetPasswordEmail({ resetUrl }));
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Reset your password — AzureHijabs",
      html,
    }),
    "sendPasswordResetEmail",
  );
  if (error) {
    console.error("[email] failed to send password reset email", error);
    throw new Error("Failed to send password reset email");
  }
}
