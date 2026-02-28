"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface PendingEntry {
  id: string;
  type: string;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

export default function ApprovalQueue() {
  const t = useTranslations("approvals");
  const tType = useTranslations("entryType");
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/approvals/pending")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? data))
      .finally(() => setLoading(false));
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    setProcessingId(id);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment: commentMap[id] }),
    });
    setProcessingId(null);
    if (res.ok) {
      const msg = action === "approve" ? t("approvedSuccess") : t("rejectedSuccess");
      setFeedback({ id, msg });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (entries.length === 0) return <p className="text-gray-400">{t("noItems")}</p>;

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="bg-white rounded-xl shadow p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{entry.user.name ?? entry.user.email}</p>
              <p className="text-sm text-gray-500">{entry.user.email}</p>
            </div>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {tType(entry.type as Parameters<typeof tType>[0])}
            </span>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            {entry.clockIn && (
              <p>{t("period")}: {new Date(entry.clockIn).toLocaleString()} — {entry.clockOut ? new Date(entry.clockOut).toLocaleString() : "open"}</p>
            )}
            {entry.dateFrom && (
              <p>{t("period")}: {new Date(entry.dateFrom).toLocaleDateString()} — {entry.dateTo ? new Date(entry.dateTo).toLocaleDateString() : "—"}</p>
            )}
            <p>{t("submitted")}: {new Date(entry.createdAt).toLocaleString()}</p>
            {entry.notes && <p>Notes: {entry.notes}</p>}
          </div>

          {feedback?.id === entry.id && (
            <p className="text-green-600 text-sm">{feedback.msg}</p>
          )}

          <div className="space-y-2">
            <textarea
              placeholder={t("comment")}
              value={commentMap[entry.id] ?? ""}
              onChange={(e) => setCommentMap((prev) => ({ ...prev, [entry.id]: e.target.value }))}
              className="input w-full text-sm"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => act(entry.id, "approve")}
                disabled={processingId === entry.id}
                className="btn-primary flex-1 text-sm"
              >
                {t("approve")}
              </button>
              <button
                onClick={() => act(entry.id, "reject")}
                disabled={processingId === entry.id}
                className="btn-danger flex-1 text-sm"
              >
                {t("reject")}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
