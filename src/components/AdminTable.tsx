"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { formatHours, durationHours } from "@/lib/time-utils";

interface Entry {
  id: string;
  type: string;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  notes: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

export default function AdminTable() {
  const t = useTranslations("admin");
  const tType = useTranslations("entryType");
  const tStatus = useTranslations("entryStatus");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/entries?page=${page}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = entries.filter(
    (e) =>
      e.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.user.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Filter by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[t("users"), t("entries"), "Clock In", "Clock Out", "Duration", "Status", "Notes"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((entry) => {
                const duration =
                  entry.clockIn && entry.clockOut
                    ? durationHours(new Date(entry.clockIn), new Date(entry.clockOut))
                    : null;
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.user.name ?? entry.user.email}</p>
                      <p className="text-xs text-gray-400">{entry.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                        {tType(entry.type as Parameters<typeof tType>[0])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.clockIn ? new Date(entry.clockIn).toLocaleString() : entry.dateFrom ? new Date(entry.dateFrom).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.clockOut ? new Date(entry.clockOut).toLocaleString() : entry.dateTo ? new Date(entry.dateTo).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">{duration != null ? formatHours(duration) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === "APPROVED" ? "bg-green-50 text-green-700"
                        : entry.status === "REJECTED" ? "bg-red-50 text-red-700"
                        : "bg-yellow-50 text-yellow-700"}`}>
                        {tStatus(entry.status as Parameters<typeof tStatus>[0])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{entry.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Total: {total}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1">← Prev</button>
          <span>Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={entries.length < 50} className="btn-secondary text-xs px-3 py-1">Next →</button>
        </div>
      </div>
    </div>
  );
}
