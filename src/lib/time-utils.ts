/**
 * Calculate duration in hours between two dates.
 * Returns null if either date is missing or clockOut < clockIn.
 */
export function durationHours(
  clockIn: Date | null | undefined,
  clockOut: Date | null | undefined
): number | null {
  if (!clockIn || !clockOut) return null;
  const ms = clockOut.getTime() - clockIn.getTime();
  if (ms <= 0) return null;
  return ms / (1000 * 60 * 60);
}

/** Format a number of hours as "Xh Ym" */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Return the ISO date string (YYYY-MM-DD) for a date in the UTC timezone. */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Given an OrganizationSettings workDays array and a date,
 * return true if that date falls on a configured working day.
 */
export function isWorkDay(workDays: number[], date: Date): boolean {
  return workDays.includes(date.getDay());
}

/**
 * Build the cron expression that fires 1 hour after the configured work end time.
 * workEndTime is "HH:MM" in 24h format.
 */
export function forgottenClockoutCron(workEndTime: string): string {
  const [hStr, mStr] = workEndTime.split(":");
  let h = parseInt(hStr, 10) + 1;
  const m = parseInt(mStr, 10);
  if (h >= 24) h = 23; // cap at 23:mm
  return `${m} ${h} * * *`;
}

/**
 * Build the cron expression for the weekly manager report.
 * weekStartDay: 0=Sunday, 1=Monday
 * Fires at 07:00 on that day.
 */
export function weeklyReportCron(weekStartDay: number): string {
  return `0 7 * * ${weekStartDay}`;
}

/** Return start-of-day (midnight UTC) for a given date. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Return end-of-day (23:59:59.999 UTC) for a given date. */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** Return start of week (UTC) given weekStartDay (0=Sun,1=Mon). */
export function startOfWeek(date: Date, weekStartDay: number): Date {
  const d = startOfDay(date);
  const day = d.getUTCDay();
  const diff = (day - weekStartDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

/** Return end of previous week. */
export function endOfPreviousWeek(date: Date, weekStartDay: number): Date {
  const start = startOfWeek(date, weekStartDay);
  const prevWeekEnd = new Date(start);
  prevWeekEnd.setUTCDate(prevWeekEnd.getUTCDate() - 1);
  return endOfDay(prevWeekEnd);
}

export function startOfPreviousWeek(date: Date, weekStartDay: number): Date {
  const start = startOfWeek(date, weekStartDay);
  const prev = new Date(start);
  prev.setUTCDate(prev.getUTCDate() - 7);
  return prev;
}
