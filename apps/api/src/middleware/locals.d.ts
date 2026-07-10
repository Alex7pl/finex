import type { AuthenticatedUser } from "../runtime/request-context.js";

declare global {
  namespace Express {
    interface Locals {
      requestId: string;
      user: AuthenticatedUser | null;
    }
  }
}
