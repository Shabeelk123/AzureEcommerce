import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/auth/verification-token";

/**
 * The link from the verification email lands here. A GET with a side
 * effect is unusual, but this is the standard pattern for "click the link
 * in your email" flows — there's no form for the user to submit.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const url = request.nextUrl.clone();
  url.search = "";

  if (!token) {
    url.pathname = "/verify-email";
    url.searchParams.set("status", "invalid");
    return NextResponse.redirect(url);
  }

  const result = await consumeVerificationToken(token, "VERIFY_EMAIL");
  if (!result.ok) {
    url.pathname = "/verify-email";
    url.searchParams.set("status", result.reason);
    return NextResponse.redirect(url);
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerifiedAt: new Date() },
  });

  url.pathname = "/verify-email";
  url.searchParams.set("status", "success");
  return NextResponse.redirect(url);
}
