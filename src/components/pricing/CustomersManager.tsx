"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const CUSTOMER_TYPES = ["B2B_AGENCY", "B2C_INDIVIDUAL"] as const;

interface Customer {
  id: string;
  name: string;
  type: string;
  country: string | null;
  currency: string;
  defaultMarkupPct: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  _count: { quotes: number };
}

const emptyForm = {
  name: "",
  type: "B2B_AGENCY" as string,
  country: "",
  currency: "USD",
  defaultMarkupPct: "0",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

export default function CustomersManager({ locale }: { locale: string }) {
  const t = useTranslations("pricing");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    fetch("/api/pricing/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/pricing/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        country: form.country || undefined,
        currency: form.currency,
        defaultMarkupPct: parseFloat(form.defaultMarkupPct || "0"),
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
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
          {t("customers.newCustomer")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="label">{t("common.name")}</label>
              <input
                className="input w-full"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.type")}</label>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {CUSTOMER_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t(`customerType.${ty}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("common.country")}</label>
              <input
                className="input w-full"
                placeholder="ES"
                maxLength={2}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.currency")}</label>
              <input
                className="input w-full"
                required
                placeholder="USD"
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("customers.defaultMarkup")}</label>
              <input
                className="input w-full"
                type="number"
                step="0.01"
                min="0"
                value={form.defaultMarkupPct}
                onChange={(e) => setForm({ ...form, defaultMarkupPct: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.contactName")}</label>
              <input
                className="input w-full"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.contactEmail")}</label>
              <input
                className="input w-full"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.contactPhone")}</label>
              <input
                className="input w-full"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
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
      ) : customers.length === 0 ? (
        <p className="text-gray-400">{t("customers.noCustomers")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  t("common.name"),
                  t("common.type"),
                  t("common.country"),
                  t("common.currency"),
                  t("customers.defaultMarkup"),
                  t("customers.quotesCount"),
                  "",
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{t(`customerType.${c.type}`)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.country ?? "—"}</td>
                  <td className="px-4 py-3">{c.currency}</td>
                  <td className="px-4 py-3">{Number(c.defaultMarkupPct)}%</td>
                  <td className="px-4 py-3">{c._count.quotes}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/pricing/quotes?customerId=${c.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t("quotes.title")}
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
