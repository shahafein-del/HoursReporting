import { prisma } from "@/lib/prisma";
import type { Customer } from "@/generated/prisma";
import type { ExchangeRateLike, TaxRuleLike } from "@/lib/pricing";

/** Maps a customer's commercial type onto the B2B/B2C sales channel used for rate & tax matching. */
export function channelForCustomer(customer: Customer): "B2B" | "B2C" {
  return customer.type === "B2B_AGENCY" ? "B2B" : "B2C";
}

/**
 * Loads the current exchange rates and active tax rules, converting Prisma
 * Decimal fields to plain numbers for use with the pricing calculation engine.
 */
export async function loadPricingContext(): Promise<{
  exchangeRates: ExchangeRateLike[];
  taxRules: TaxRuleLike[];
}> {
  const [exchangeRates, taxRules] = await Promise.all([
    prisma.exchangeRate.findMany(),
    prisma.taxRule.findMany({ where: { active: true } }),
  ]);

  return {
    exchangeRates: exchangeRates.map((r) => ({
      base: r.base,
      quote: r.quote,
      rate: Number(r.rate),
    })),
    taxRules: taxRules.map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      type: r.type,
      appliesTo: r.appliesTo,
      rate: Number(r.rate),
      currency: r.currency,
      channel: r.channel,
      active: r.active,
    })),
  };
}
