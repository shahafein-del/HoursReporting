import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify, escapeHtml } from "@/lib/notifications";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { action, comment } = body as { action: "approve" | "reject"; comment?: string };
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      approvedById: session.user.id,
      approvalComment: comment ?? null,
      approvedAt: new Date(),
    },
  });

  // Notify the employee
  const employee = entry.user;
  const verb = action === "approve" ? "approved" : "rejected";
  const subject = `Your ${entry.type} request was ${verb}`;
  const safeComment = comment ? escapeHtml(comment) : null;
  const html = `<p>Your <b>${escapeHtml(entry.type)}</b> request has been <b>${verb}</b>${safeComment ? `: "${safeComment}"` : "."}</p>`;
  await notify(
    {
      email: employee.email,
      notifyEmail: employee.notifyEmail,
      notifyBrowser: employee.notifyBrowser,
      notifySms: employee.notifySms,
      phone: employee.phone,
      pushSubscription: employee.pushSubscription,
    },
    subject,
    html,
    subject
  );

  return NextResponse.json(updated);
}
