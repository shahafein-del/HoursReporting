import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import type { EntryType, EntryStatus } from "@/generated/prisma";

const VALID_TYPES: EntryType[] = ["WORK", "VACATION", "SICK", "CHILD_SICK", "MILITARY", "MANUAL"];

interface UploadRow {
  email: string;
  type: string;
  dateFrom?: string;
  dateTo?: string;
  clockIn?: string;
  clockOut?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  const { data } = Papa.parse<UploadRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: { row: number; error: string }[] = [];
  const created: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // 1-indexed + header

    if (!row.email) { errors.push({ row: rowNum, error: "Missing email" }); continue; }
    if (!row.type || !VALID_TYPES.includes(row.type as EntryType)) {
      errors.push({ row: rowNum, error: `Invalid type: ${row.type}` }); continue;
    }

    const user = await prisma.user.findUnique({ where: { email: row.email } });
    if (!user) { errors.push({ row: rowNum, error: `User not found: ${row.email}` }); continue; }

    const entryType = row.type as EntryType;
    const status: EntryStatus = entryType === "WORK" ? "APPROVED" : "PENDING";

    try {
      const entry = await prisma.timeEntry.create({
        data: {
          userId: user.id,
          type: entryType,
          status,
          dateFrom: row.dateFrom ? new Date(row.dateFrom) : null,
          dateTo: row.dateTo ? new Date(row.dateTo) : null,
          clockIn: row.clockIn ? new Date(row.clockIn) : null,
          clockOut: row.clockOut ? new Date(row.clockOut) : null,
          notes: row.notes ?? null,
        },
      });
      created.push(entry.id);
    } catch {
      errors.push({ row: rowNum, error: "Database error creating entry" });
    }
  }

  return NextResponse.json({ created: created.length, errors });
}
