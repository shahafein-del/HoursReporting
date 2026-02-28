import { prisma } from "./prisma";

/**
 * Recursively collect all subordinate user IDs for a given manager.
 * Uses a single recursive CTE instead of N+1 queries.
 */
export async function getSubordinateIds(managerId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE subordinates AS (
      SELECT id FROM "User" WHERE "managerId" = ${managerId}
      UNION ALL
      SELECT u.id FROM "User" u
      INNER JOIN subordinates s ON u."managerId" = s.id
    )
    SELECT id FROM subordinates
  `;
  return rows.map((r) => r.id);
}

/**
 * Return all user IDs visible to the given user based on their role:
 * - ADMIN: all user IDs
 * - MANAGER: own ID + all subordinate IDs
 * - EMPLOYEE: own ID only
 */
export async function getVisibleUserIds(
  userId: string,
  role: string
): Promise<string[]> {
  if (role === "ADMIN") {
    const all = await prisma.user.findMany({ select: { id: true } });
    return all.map((u) => u.id);
  }
  if (role === "MANAGER") {
    const subordinates = await getSubordinateIds(userId);
    return [userId, ...subordinates];
  }
  return [userId];
}

/**
 * Determine which manager (or delegate) should receive approval requests
 * for a given user. Returns the manager's user ID, or null if none assigned.
 */
export async function getApprover(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { managerId: true },
  });
  return user?.managerId ?? null;
}

/**
 * Return the effective approver for pending entries:
 * the manager if no active delegate, or the delegate if one is active.
 */
export async function getEffectiveApprover(managerId: string): Promise<string> {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { delegateId: true, delegateFrom: true, delegateTo: true },
  });

  if (!manager?.delegateId) return managerId;

  const now = new Date();
  const from = manager.delegateFrom;
  const to = manager.delegateTo;
  const isActive =
    (!from || from <= now) && (!to || to >= now);

  return isActive ? manager.delegateId : managerId;
}
