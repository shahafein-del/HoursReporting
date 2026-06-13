import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  await prisma.organizationSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      orgName: "My Organization",
      primaryColor: "#2563eb",
      workDays: [1, 2, 3, 4, 5],
      workStartTime: "09:00",
      workEndTime: "18:00",
      weekStartDay: 1,
    },
  });
  console.log("Seeded OrganizationSettings");

  await seedPricingDemoData();
}

/**
 * Demo data for the Pricing / CPQ module: a couple of suppliers with
 * seasonal rates, destination tax rules, exchange rates and sample
 * customers, so the pricing pages aren't empty on first run.
 */
async function seedPricingDemoData() {
  const existingSuppliers = await prisma.supplier.count();
  if (existingSuppliers > 0) {
    console.log("Pricing demo data already present, skipping");
    return;
  }

  const hotel = await prisma.supplier.create({
    data: {
      name: "Hotel Mediterraneo",
      type: "ACCOMMODATION",
      country: "ES",
      city: "Barcelona",
      currency: "EUR",
      contactName: "Reservations Team",
      contactEmail: "reservations@hotelmed.example",
      rates: {
        create: [
          {
            name: "Double Room B&B – Low Season",
            unit: "PER_PERSON_PER_NIGHT",
            netCost: 60,
            currency: "EUR",
            channel: "BOTH",
            validFrom: new Date("2026-01-01"),
            validTo: new Date("2026-06-30"),
            minPax: 2,
            maxPax: 4,
            taxIncluded: true,
          },
          {
            name: "Double Room B&B – High Season",
            unit: "PER_PERSON_PER_NIGHT",
            netCost: 95,
            currency: "EUR",
            channel: "BOTH",
            validFrom: new Date("2026-07-01"),
            validTo: new Date("2026-09-30"),
            minPax: 2,
            maxPax: 4,
            taxIncluded: true,
          },
        ],
      },
    },
  });

  const transport = await prisma.supplier.create({
    data: {
      name: "CityLink Coaches",
      type: "TRANSPORT",
      country: "ES",
      city: "Barcelona",
      currency: "EUR",
      contactName: "Dispatch",
      contactEmail: "dispatch@citylink.example",
      rates: {
        create: [
          {
            name: "Airport Transfer (private van, up to 8 pax)",
            unit: "PER_GROUP",
            netCost: 85,
            currency: "EUR",
            channel: "BOTH",
            validFrom: new Date("2026-01-01"),
            validTo: new Date("2026-12-31"),
            maxPax: 8,
            taxIncluded: true,
          },
        ],
      },
    },
  });

  const guide = await prisma.supplier.create({
    data: {
      name: "Gaudí Walking Tours",
      type: "GUIDE",
      country: "ES",
      city: "Barcelona",
      currency: "EUR",
      rates: {
        create: [
          {
            name: "Half-day City Walking Tour (licensed guide)",
            unit: "PER_GROUP",
            netCost: 150,
            currency: "EUR",
            channel: "B2B",
            validFrom: new Date("2026-01-01"),
            validTo: new Date("2026-12-31"),
            maxPax: 20,
            taxIncluded: true,
          },
          {
            name: "Half-day City Walking Tour (per person, retail)",
            unit: "PER_PERSON",
            netCost: 25,
            currency: "EUR",
            channel: "B2C",
            validFrom: new Date("2026-01-01"),
            validTo: new Date("2026-12-31"),
            taxIncluded: true,
          },
        ],
      },
    },
  });

  console.log(
    `Created suppliers: ${hotel.name}, ${transport.name}, ${guide.name}`
  );

  await prisma.taxRule.createMany({
    data: [
      {
        name: "Spain VAT (general)",
        country: "ES",
        type: "PERCENTAGE",
        appliesTo: "SUBTOTAL",
        rate: 10,
        channel: "BOTH",
        notes: "Already included in most supplier net rates (taxIncluded).",
      },
      {
        name: "Barcelona Tourist Tax",
        country: "ES",
        type: "FIXED_AMOUNT",
        appliesTo: "PER_PERSON_PER_NIGHT",
        rate: 2.75,
        currency: "EUR",
        channel: "BOTH",
        notes: "Catalonia tourist tax, charged per person per night regardless of taxIncluded.",
      },
    ],
  });
  console.log("Seeded tax rules");

  await prisma.exchangeRate.createMany({
    data: [
      { base: "EUR", quote: "USD", rate: 1.08 },
      { base: "EUR", quote: "GBP", rate: 0.85 },
    ],
  });
  console.log("Seeded exchange rates");

  await prisma.customer.createMany({
    data: [
      {
        name: "Sunrise Travel Agency",
        type: "B2B_AGENCY",
        country: "FR",
        currency: "EUR",
        defaultMarkupPct: 12,
        contactName: "Marie Dubois",
        contactEmail: "marie@sunrisetravel.example",
      },
      {
        name: "John & Lisa Cooper",
        type: "B2C_INDIVIDUAL",
        country: "GB",
        currency: "EUR",
        defaultMarkupPct: 30,
        contactName: "John Cooper",
        contactEmail: "john.cooper@example.com",
      },
    ],
  });
  console.log("Seeded customers");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
