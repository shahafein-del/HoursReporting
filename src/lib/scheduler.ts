import cron from "node-cron";
import { prisma } from "./prisma";
import { forgottenClockoutCron, weeklyReportCron } from "./time-utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

async function callCronEndpoint(path: string) {
  try {
    await fetch(`${APP_URL}${path}`, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET },
    });
  } catch (err) {
    console.error(`Cron call to ${path} failed:`, err);
  }
}

export async function startScheduler() {
  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!settings) {
    console.error("No OrganizationSettings found — scheduler not started.");
    return;
  }

  const clockoutExpression = forgottenClockoutCron(settings.workEndTime);
  cron.schedule(clockoutExpression, () => {
    callCronEndpoint("/api/cron/forgotten-clockout");
  });
  console.log(
    `Forgotten clock-out job scheduled: ${clockoutExpression}`
  );

  const weeklyExpression = weeklyReportCron(settings.weekStartDay);
  cron.schedule(weeklyExpression, () => {
    callCronEndpoint("/api/cron/weekly-report");
  });
  console.log(`Weekly report job scheduled: ${weeklyExpression}`);
}
