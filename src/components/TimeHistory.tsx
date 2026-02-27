"use client";

import { useTranslations } from "next-intl";
import { formatHours, durationHours } from "@/lib/time-utils";
import type { TimeEntry } from "@/generated/prisma";
import LocationBadge from "./LocationBadge";

interface TimeHistoryProps {
  entries: TimeEntry[];
}

export default function TimeHistory({ entries }: TimeHistoryProps) {
  const t = useTranslations("history");
  const tType = useTranslations("entryType");
  const tStatus = useTranslations("entryStatus");

  if (entries.length === 0) {
    return <p className="text-gray-400">{t("noEntries")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl shadow">
      <table className="w-full text-sm bg-white">
        <thead className="bg-gray-50 border-b">
          <tr>
            {[t("date"), t("type"), t("clockIn"), t("clockOut"), t("duration"), t("status"), t("notes")].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((entry) => {
            const duration =
              entry.clockIn && entry.clockOut
                ? durationHours(entry.clockIn, entry.clockOut)
                : null;

            const hasInLocation = entry.clockInLat !== null;
            const hasOutLocation = entry.clockOutLat !== null;

            return (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">
                  {(entry.clockIn ?? entry.dateFrom)?.toLocaleDateString() ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {tType(entry.type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    {entry.clockIn ? entry.clockIn.toLocaleTimeString() : entry.dateFrom?.toLocaleDateString() ?? "—"}
                    {entry.clockIn && (
                      <LocationBadge state={hasInLocation ? "captured" : "denied"} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    {entry.clockOut ? entry.clockOut.toLocaleTimeString() : entry.dateTo?.toLocaleDateString() ?? "—"}
                    {entry.clockOut && (
                      <LocationBadge state={hasOutLocation ? "captured" : "denied"} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">
                  {duration !== null ? formatHours(duration) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === "APPROVED"
                        ? "bg-green-50 text-green-700"
                        : entry.status === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {tStatus(entry.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                  {entry.notes ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
