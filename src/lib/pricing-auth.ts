import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/**
 * The Pricing / CPQ module is a sales tool — accessible to MANAGER and ADMIN
 * roles only (the same set that can already see team-wide data).
 */
export async function requireSalesSession(): Promise<
  { session: Session } | { error: NextResponse }
> {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
