"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const RATE_UNITS = [
  "PER_PERSON",
  "PER_NIGHT",
  "PER_PERSON_PER_NIGHT",
  "PER_GROUP",
  "PER_DAY",
  "FLAT",
] as const;

const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;

interface TaxBreakdownEntry {
  taxRuleId: string;
  name: string;
  type: string;
  appliesTo: string;
  rate: number;
  amount: number;
}

interface LineItem {
  id: string;
  description: string;
  unit: string;
  quantity: string;
  netCost: string;
  netCostCurrency: string;
  exchangeRate: string;
  markupPct: string;
  country: string;
  taxIncluded: boolean;
  sellPrice: string;
  taxBreakdown: TaxBreakdownEntry[];
  taxTotal: string;
  lineTotal: string;
  supplierRate: { id: string; name: string; supplier: { name: string } } | null;
}

interface Quote {
  id: string;
  title: string;
  currency: string;
  status: string;
  validUntil: string | null;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    type: string;
    currency: string;
    country: string | null;
    defaultMarkupPct: string;
  };
  lineItems: LineItem[];
  totals: { subtotal: number; taxTotal: number; grandTotal: number };
}

interface SupplierRateResult {
  id: string;
  name: string;
  unit: string;
  netCost: string;
  currency: string;
  channel: string;
  validFrom: string;
  validTo: string;
  taxIncluded: boolean;
  supplier: { id: string; name: string; country: string; city: string | null };
}

export default function QuoteBuilder({ locale, quoteId }: { locale: string; quoteId: string }) {
  const t = useTranslations("pricing");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"rate" | "manual">("rate");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [searchResults, setSearchResults] = useState<SupplierRateResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [rateQuantity, setRateQuantity] = useState("1");
  const [rateMarkup, setRateMarkup] = useState("");

  const [manual, setManual] = useState({
    description: "",
    unit: "PER_PERSON" as string,
    netCost: "",
    currency: "",
    country: "",
    taxIncluded: false,
    quantity: "1",
    markupPct: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/pricing/quotes/${quoteId}`)
      .then((r) => r.json())
      .then(setQuote)
      .finally(() => setLoading(false));
  }, [quoteId]);

  useEffect(load, [load]);

  const updateQuote = async (data: Record<string, unknown>) => {
    await fetch(`/api/pricing/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  };

  const searchRates = async () => {
    if (!quote) return;
    setSearching(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    const country = searchCountry || quote.customer.country || "";
    if (country) params.set("country", country);
    const channel = quote.customer.type === "B2B_AGENCY" ? "B2B" : "B2C";
    params.set("channel", channel);
    params.set("validOn", new Date().toISOString().slice(0, 10));

    const res = await fetch(`/api/pricing/rates?${params.toString()}`);
    const data = await res.json();
    setSearchResults(Array.isArray(data) ? data : []);
    setSearching(false);
  };

  const addFromRate = async () => {
    if (!selectedRateId) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/pricing/quotes/${quoteId}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierRateId: selectedRateId,
        quantity: parseFloat(rateQuantity || "1"),
        ...(rateMarkup !== "" ? { markupPct: parseFloat(rateMarkup) } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add line item");
      return;
    }
    setSelectedRateId("");
    setRateQuantity("1");
    setRateMarkup("");
    setSearchResults([]);
    setShowAddForm(false);
    load();
  };

  const addManual = async (e: FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/pricing/quotes/${quoteId}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: manual.description,
        unit: manual.unit,
        netCost: parseFloat(manual.netCost),
        netCostCurrency: (manual.currency || quote.customer.currency).toUpperCase(),
        country: (manual.country || quote.customer.country || "").toUpperCase(),
        taxIncluded: manual.taxIncluded,
        quantity: parseFloat(manual.quantity || "1"),
        ...(manual.markupPct !== "" ? { markupPct: parseFloat(manual.markupPct) } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add line item");
      return;
    }
    setManual({
      description: "",
      unit: "PER_PERSON",
      netCost: "",
      currency: "",
      country: "",
      taxIncluded: false,
      quantity: "1",
      markupPct: "",
    });
    setShowAddForm(false);
    load();
  };

  const updateLineItem = async (lineId: string, data: Record<string, unknown>) => {
    await fetch(`/api/pricing/quotes/${quoteId}/line-items/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  };

  const removeLineItem = async (lineId: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await fetch(`/api/pricing/quotes/${quoteId}/line-items/${lineId}`, { method: "DELETE" });
    load();
  };

  if (loading || !quote) {
    return <p className="text-gray-400">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/${locale}/pricing/quotes`} className="text-sm text-blue-600 hover:underline">
          {t("quoteBuilder.back")}
        </Link>
        <button className="btn-secondary" onClick={() => window.print()}>
          {t("quoteBuilder.print")}
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <input
              className="text-2xl font-bold border-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 -mx-1"
              defaultValue={quote.title}
              onBlur={(e) => {
                if (e.target.value !== quote.title) updateQuote({ title: e.target.value });
              }}
            />
            <p className="text-gray-500 mt-1">
              {quote.customer.name} · {t(`customerType.${quote.customer.type}`)} · {quote.currency}
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="label">{t("quotes.status")}</label>
              <select
                className="input"
                value={quote.status}
                onChange={(e) => updateQuote({ status: e.target.value })}
              >
                {QUOTE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`quoteStatus.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("quotes.validUntil")}</label>
              <input
                className="input"
                type="date"
                defaultValue={quote.validUntil ? quote.validUntil.slice(0, 10) : ""}
                onBlur={(e) => updateQuote({ validUntil: e.target.value || null })}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="label">{t("common.notes")}</label>
          <textarea
            className="input w-full"
            rows={2}
            defaultValue={quote.notes ?? ""}
            onBlur={(e) => {
              if (e.target.value !== (quote.notes ?? "")) updateQuote({ notes: e.target.value || null });
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-lg font-semibold">{t("quoteBuilder.lineItems")}</h2>
        <button className="btn-primary" onClick={() => setShowAddForm((s) => !s)}>
          {t("quoteBuilder.addLineItem")}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4 print:hidden">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className={addMode === "rate" ? "btn-primary" : "btn-secondary"}
              onClick={() => setAddMode("rate")}
            >
              {t("quoteBuilder.fromSupplierRate")}
            </button>
            <button
              type="button"
              className={addMode === "manual" ? "btn-primary" : "btn-secondary"}
              onClick={() => setAddMode("manual")}
            >
              {t("quoteBuilder.manualEntry")}
            </button>
          </div>

          {addMode === "rate" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">{t("quoteBuilder.searchRates")}</label>
                  <input
                    className="input w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchRates()}
                  />
                </div>
                <div>
                  <label className="label">{t("common.country")}</label>
                  <input
                    className="input w-full"
                    placeholder={quote.customer.country ?? ""}
                    maxLength={2}
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                  />
                </div>
              </div>
              <button type="button" className="btn-secondary" onClick={searchRates} disabled={searching}>
                {searching ? t("common.loading") : t("quoteBuilder.searchRates")}
              </button>

              {searchResults.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm bg-white">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2"></th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">{t("common.name")}</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">{t("supplierDetail.unit")}</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">{t("supplierDetail.netCost")}</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">{t("common.country")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {searchResults.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedRateId(r.id)}
                        >
                          <td className="px-3 py-2">
                            <input type="radio" checked={selectedRateId === r.id} onChange={() => setSelectedRateId(r.id)} />
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {r.supplier.name} – {r.name}
                          </td>
                          <td className="px-3 py-2">{t(`rateUnit.${r.unit}`)}</td>
                          <td className="px-3 py-2">
                            {Number(r.netCost).toFixed(2)} {r.currency}
                          </td>
                          <td className="px-3 py-2">{r.supplier.country}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {searchResults.length === 0 && !searching && (
                <p className="text-gray-400 text-sm">{t("common.noResults")}</p>
              )}

              {selectedRateId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="label">{t("quoteBuilder.quantity")}</label>
                    <input
                      className="input w-full"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={rateQuantity}
                      onChange={(e) => setRateQuantity(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">{t("quoteBuilder.quantityHint")}</p>
                  </div>
                  <div>
                    <label className="label">{t("quoteBuilder.markupPct")}</label>
                    <input
                      className="input w-full"
                      type="number"
                      step="0.01"
                      placeholder={Number(quote.customer.defaultMarkupPct).toString()}
                      value={rateMarkup}
                      onChange={(e) => setRateMarkup(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary" onClick={addFromRate} disabled={saving}>
                      {t("common.add")}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={addManual} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="label">{t("quoteBuilder.description")}</label>
                  <input
                    className="input w-full"
                    required
                    value={manual.description}
                    onChange={(e) => setManual({ ...manual, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("quoteBuilder.manualUnit")}</label>
                  <select
                    className="input w-full"
                    value={manual.unit}
                    onChange={(e) => setManual({ ...manual, unit: e.target.value })}
                  >
                    {RATE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {t(`rateUnit.${u}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t("quoteBuilder.manualNetCost")}</label>
                  <input
                    className="input w-full"
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={manual.netCost}
                    onChange={(e) => setManual({ ...manual, netCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("quoteBuilder.manualCurrency")}</label>
                  <input
                    className="input w-full"
                    placeholder={quote.customer.currency}
                    maxLength={3}
                    value={manual.currency}
                    onChange={(e) => setManual({ ...manual, currency: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("quoteBuilder.manualCountry")}</label>
                  <input
                    className="input w-full"
                    placeholder={quote.customer.country ?? ""}
                    maxLength={2}
                    value={manual.country}
                    onChange={(e) => setManual({ ...manual, country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t("quoteBuilder.quantity")}</label>
                  <input
                    className="input w-full"
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manual.quantity}
                    onChange={(e) => setManual({ ...manual, quantity: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t("quoteBuilder.quantityHint")}</p>
                </div>
                <div>
                  <label className="label">{t("quoteBuilder.markupPct")}</label>
                  <input
                    className="input w-full"
                    type="number"
                    step="0.01"
                    placeholder={Number(quote.customer.defaultMarkupPct).toString()}
                    value={manual.markupPct}
                    onChange={(e) => setManual({ ...manual, markupPct: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    id="manualTaxIncluded"
                    type="checkbox"
                    checked={manual.taxIncluded}
                    onChange={(e) => setManual({ ...manual, taxIncluded: e.target.checked })}
                  />
                  <label htmlFor="manualTaxIncluded" className="text-sm text-gray-700">
                    {t("quoteBuilder.manualTaxIncluded")}
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {t("common.add")}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {quote.lineItems.length === 0 ? (
        <p className="text-gray-400">{t("quoteBuilder.noLineItems")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  t("quoteBuilder.description"),
                  t("supplierDetail.unit"),
                  t("quoteBuilder.quantity"),
                  t("quoteBuilder.netCost"),
                  t("quoteBuilder.exchangeRate"),
                  t("quoteBuilder.markupPct"),
                  t("quoteBuilder.sellPrice"),
                  t("quoteBuilder.taxes"),
                  t("quoteBuilder.taxTotal"),
                  t("quoteBuilder.lineTotal"),
                  t("common.actions"),
                ].map((h) => (
                  <th key={h} className="text-left px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {quote.lineItems.map((li) => (
                <tr key={li.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium">
                    {li.description}
                    {li.supplierRate && (
                      <div className="text-xs text-gray-400">{li.supplierRate.supplier.name}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{t(`rateUnit.${li.unit}`)}</td>
                  <td className="px-3 py-3">
                    <input
                      className="input w-20"
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={Number(li.quantity)}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value > 0 && value !== Number(li.quantity)) {
                          updateLineItem(li.id, { quantity: value });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {Number(li.netCost).toFixed(2)} {li.netCostCurrency}
                  </td>
                  <td className="px-3 py-3">{Number(li.exchangeRate)}</td>
                  <td className="px-3 py-3">
                    <input
                      className="input w-20"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={Number(li.markupPct)}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value !== Number(li.markupPct)) {
                          updateLineItem(li.id, { markupPct: value });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {Number(li.sellPrice).toFixed(2)} {quote.currency}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">
                    {li.taxBreakdown.length === 0
                      ? "—"
                      : li.taxBreakdown.map((tb) => (
                          <div key={tb.taxRuleId}>
                            {tb.name}: {tb.amount.toFixed(2)} {quote.currency}
                          </div>
                        ))}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {Number(li.taxTotal).toFixed(2)} {quote.currency}
                  </td>
                  <td className="px-3 py-3 font-medium whitespace-nowrap">
                    {Number(li.lineTotal).toFixed(2)} {quote.currency}
                  </td>
                  <td className="px-3 py-3 print:hidden">
                    <button
                      onClick={() => removeLineItem(li.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      {t("quoteBuilder.removeLine")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 shadow-sm max-w-sm ms-auto space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("quoteBuilder.subtotal")}</span>
          <span>
            {quote.totals.subtotal.toFixed(2)} {quote.currency}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("quoteBuilder.taxTotal")}</span>
          <span>
            {quote.totals.taxTotal.toFixed(2)} {quote.currency}
          </span>
        </div>
        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>{t("quoteBuilder.grandTotal")}</span>
          <span>
            {quote.totals.grandTotal.toFixed(2)} {quote.currency}
          </span>
        </div>
      </div>
    </div>
  );
}
