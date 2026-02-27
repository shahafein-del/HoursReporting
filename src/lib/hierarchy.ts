import { prisma } from "./prisma";

/**
 * Recursively collect all subordinate user IDs for a given manager.
 * Returns the full tree of direct and indirect reports.
 */
export async function getSubordinateIds(managerId: string): Promise<string[]> {
  const directReports = await prisma.user.findMany({
    where: { managerId },
    select: { id: true },
  });

  const ids: string[] = directReports.map((u) => u.id);

  for (const report of directReports) {
    const nested = await getSubordinateIds(report.id);
    ids.push(...nested);
  }

  return ids;
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
