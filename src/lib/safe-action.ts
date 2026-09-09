import { createSafeActionClient } from "next-safe-action";

/**
 * Thrown from inside an action to send a specific, user-facing message to
 * the client (e.g. "Only 3 left in stock") instead of the generic
 * fallback. Any other thrown error is logged server-side and replaced
 * with a generic message — never leak internals (a Prisma error message,
 * a stack trace) to the response.
 */
export class ActionError extends Error {}

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) {
      return error.message;
    }
    console.error("[action] unhandled error", error);
    return "Something went wrong. Please try again.";
  },
});
