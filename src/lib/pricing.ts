import type { RateUnit, TaxCalcType, TaxAppliesTo, SalesChannel } from "@/generated/prisma";

/**
 * Pricing / CPQ calculation engine.
 *
 * A quote line item starts from a supplier's net cost (in the supplier's
 * currency), converts it into the quote's currency, applies a markup to
 * derive the sell price, and then layers on any destination tax rules
 * (VAT-style percentage taxes and fixed per-person/per-night taxes such as
 * tourist/city tax).
 */

export interface ExchangeRateLike {
  base: string;
  quote: string;
  rate: number;
}

export interface TaxRuleLike {
  id: string;
  name: string;
  country: string;
  type: TaxCalcType;
  appliesTo: TaxAppliesTo;
  rate: number;
  currency: string | null;
  channel: SalesChannel;
  active: boolean;
}

export interface TaxBreakdownEntry {
  taxRuleId: string;
  name: string;
  type: TaxCalcType;
  appliesTo: TaxAppliesTo;
  rate: number;
  amount: number;
}

export interface LineItemCalcInput {
  netCost: number;
  netCostCurrency: string;
  quoteCurrency: string;
  quantity: number;
  markupPct: number;
  unit: RateUnit;
  /** Whether the supplier's netCost already includes destination VAT/sales tax. */
  taxIncluded: boolean;
  /** Destination country (ISO 3166-1 alpha-2) used to match tax rules. */
  country: string;
  /** Sales channel of the customer this quote is for. */
  channel: "B2B" | "B2C";
  exchangeRates: ExchangeRateLike[];
  taxRules: TaxRuleLike[];
}

export interface LineItemCalcResult {
  exchangeRate: number;
  netCostConverted: number;
  sellPrice: number;
  sellSubtotal: number;
  markupAmount: number;
  taxBreakdown: TaxBreakdownEntry[];
  taxTotal: number;
  lineTotal: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Find the rate to convert 1 unit of `from` into `to`.
 * Falls back to the inverse of a rate quoted the other way round.
 * Returns null if no rate (and the currencies differ) is found.
 */
export function findExchangeRate(
  rates: ExchangeRateLike[],
  from: string,
  to: string
): number | null {
  if (from === to) return 1;

  const direct = rates.find((r) => r.base === from && r.quote === to);
  if (direct) return direct.rate;

  const inverse = rates.find((r) => r.base === to && r.quote === from);
  if (inverse && inverse.rate !== 0) return 1 / inverse.rate;

  return null;
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRateLike[]
): number {
  const rate = findExchangeRate(rates, from, to);
  if (rate === null) {
    throw new Error(`No exchange rate available to convert ${from} to ${to}`);
  }
  return amount * rate;
}

/**
 * Tax rules that apply to a given destination country and sales channel.
 * Rules with country = "*" apply to all destinations.
 * When `taxIncluded` is true, percentage (SUBTOTAL) rules are skipped on the
 * assumption the supplier's net cost already bakes in destination VAT —
 * fixed per-person/per-night/per-booking taxes (e.g. tourist tax) still apply.
 */
export function getApplicableTaxRules(
  taxRules: TaxRuleLike[],
  country: string,
  channel: "B2B" | "B2C",
  taxIncluded: boolean
): TaxRuleLike[] {
  return taxRules.filter((rule) => {
    if (!rule.active) return false;
    if (rule.country !== "*" && rule.country !== country) return false;
    if (rule.channel !== "BOTH" && rule.channel !== channel) return false;
    if (taxIncluded && rule.type === "PERCENTAGE" && rule.appliesTo === "SUBTOTAL") return false;
    return true;
  });
}

/**
 * Full calculation for a single quote line item.
 */
export function calculateLineItem(input: LineItemCalcInput): LineItemCalcResult {
  const {
    netCost,
    netCostCurrency,
    quoteCurrency,
    quantity,
    markupPct,
    unit,
    taxIncluded,
    country,
    channel,
    exchangeRates,
    taxRules,
  } = input;

  const exchangeRate = findExchangeRate(exchangeRates, netCostCurrency, quoteCurrency) ?? 1;
  const netCostConverted = netCost * exchangeRate;

  const sellPrice = round2(netCostConverted * (1 + markupPct / 100));
  const sellSubtotal = round2(sellPrice * quantity);
  const markupAmount = round2(sellSubtotal - round2(netCostConverted * quantity));

  const applicable = getApplicableTaxRules(taxRules, country, channel, taxIncluded);

  const taxBreakdown: TaxBreakdownEntry[] = applicable.map((rule) => {
    let amount = 0;

    if (rule.type === "PERCENTAGE") {
      // Only SUBTOTAL percentage rules are supported for now.
      if (rule.appliesTo === "SUBTOTAL") {
        amount = sellSubtotal * (rule.rate / 100);
      }
    } else {
      // FIXED_AMOUNT — convert the rule's flat amount into the quote currency.
      const ruleCurrency = rule.currency ?? quoteCurrency;
      const fxRate = findExchangeRate(exchangeRates, ruleCurrency, quoteCurrency) ?? 1;
      const amountPerUnit = rule.rate * fxRate;

      if (rule.appliesTo === "PER_BOOKING") {
        amount = amountPerUnit;
      } else if (
        rule.appliesTo === "PER_PERSON_PER_NIGHT" &&
        unit === "PER_PERSON_PER_NIGHT"
      ) {
        amount = amountPerUnit * quantity;
      } else if (
        rule.appliesTo === "PER_PERSON" &&
        (unit === "PER_PERSON" || unit === "PER_PERSON_PER_NIGHT")
      ) {
        amount = amountPerUnit * quantity;
      }
    }

    return {
      taxRuleId: rule.id,
      name: rule.name,
      type: rule.type,
      appliesTo: rule.appliesTo,
      rate: rule.rate,
      amount: round2(amount),
    };
  });

  const taxTotal = round2(taxBreakdown.reduce((sum, t) => sum + t.amount, 0));
  const lineTotal = round2(sellSubtotal + taxTotal);

  return {
    exchangeRate,
    netCostConverted: round2(netCostConverted),
    sellPrice,
    sellSubtotal,
    markupAmount,
    taxBreakdown,
    taxTotal,
    lineTotal,
  };
}

export interface QuoteTotals {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

/**
 * Aggregate totals across all line items of a quote.
 */
export function calculateQuoteTotals(
  lineItems: { sellPrice: number; quantity: number; taxTotal: number; lineTotal: number }[]
): QuoteTotals {
  const subtotal = round2(
    lineItems.reduce((sum, li) => sum + li.sellPrice * li.quantity, 0)
  );
  const taxTotal = round2(lineItems.reduce((sum, li) => sum + li.taxTotal, 0));
  const grandTotal = round2(lineItems.reduce((sum, li) => sum + li.lineTotal, 0));

  return { subtotal, taxTotal, grandTotal };
}
