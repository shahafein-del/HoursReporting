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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
