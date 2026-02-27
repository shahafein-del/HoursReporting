import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

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
