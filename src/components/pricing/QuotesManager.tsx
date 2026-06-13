"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Customer {
  id: string;
  name: string;
  currency: string;
}

interface Quote {
  id: string;
  title: string;
  currency: string;
  status: string;
  validUntil: string | null;
  createdAt: string;
  customer: { id: string; name: string; type: string; currency: string };
  totals: { subtotal: number; taxTotal: number; grandTotal: number };
}

const emptyForm = {
  customerId: "",
  title: "",
  currency: "",
  validUntil: "",
  notes: "",
};

export default function QuotesManager({ locale }: { locale: string }) {
  const t = useTranslations("pricing");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/pricing/quotes").then((r) => r.json()),
      fetch("/api/pricing/customers").then((r) => r.json()),
    ])
      .then(([q, c]) => {
        setQuotes(q);
        setCustomers(c);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/pricing/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.customerId,
        title: form.title,
        currency: form.currency || undefined,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {t("quotes.newQuote")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">{t("quotes.customer")}</label>
              <select
                className="input w-full"
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="label">{t("quotes.quoteTitle")}</label>
              <input
                className="input w-full"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.currency")}</label>
              <input
                className="input w-full"
                placeholder={customers.find((c) => c.id === form.customerId)?.currency ?? ""}
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("quotes.validUntil")}</label>
              <input
                className="input w-full"
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </div>
            <div className="lg:col-span-3">
              <label className="label">{t("common.notes")}</label>
              <input
                className="input w-full"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {t("common.save")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : quotes.length === 0 ? (
        <p className="text-gray-400">{t("quotes.noQuotes")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  t("quotes.quoteTitle"),
                  t("quotes.customer"),
                  t("common.currency"),
                  t("quotes.status"),
                  t("quotes.validUntil"),
                  t("quotes.grandTotal"),
                  "",
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{q.title}</td>
                  <td className="px-4 py-3">{q.customer.name}</td>
                  <td className="px-4 py-3">{q.currency}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {t(`quoteStatus.${q.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {q.totals.grandTotal.toFixed(2)} {q.currency}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/pricing/quotes/${q.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t("quotes.open")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
