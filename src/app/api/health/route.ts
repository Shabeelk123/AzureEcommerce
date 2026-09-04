import { prisma } from "@/lib/prisma";

/**
 * Readiness probe for Railway/Render/Docker HEALTHCHECK. Confirms the
 * process is up *and* can reach Postgres — a container that's running but
 * can't talk to the DB should be reported unhealthy, not "OK".
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("[health] database check failed", error);
    return Response.json({ status: "error" }, { status: 503 });
  }
}
