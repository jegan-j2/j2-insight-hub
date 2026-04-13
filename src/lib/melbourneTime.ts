import { formatInTimeZone } from "date-fns-tz";

const MELBOURNE_TZ = "Australia/Melbourne";

/**
 * Get Melbourne's UTC offset in minutes for a given local Date object.
 */
function getMelbourneOffsetMinutes(date: Date): number {
  const utcStr = date.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
  const melbDate = new Date(utcStr);
  return (melbDate.getTime() - date.getTime()) / 60000;
}

/**
 * Convert a date string like "2026-04-06" to a Melbourne-local
 * start-of-day timestamp in ISO format with the correct offset.
 * e.g. "2026-04-06T00:00:00+10:00" (AEST) or "+11:00" (AEDT)
 */
export const melbourneStartOfDay = (dateStr: string): string => {
  const dt = new Date(`${dateStr}T00:00:00`);
  return formatInTimeZone(
    new Date(formatInTimeZone(dt, MELBOURNE_TZ, "yyyy-MM-dd") + "T00:00:00"),
    MELBOURNE_TZ,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
};

/**
 * Convert a date string like "2026-04-06" to a Melbourne-local
 * end-of-day timestamp in ISO format with the correct offset.
 * e.g. "2026-04-06T23:59:59+10:00" (AEST) or "+11:00" (AEDT)
 */
export const melbourneEndOfDay = (dateStr: string): string => {
  const dt = new Date(`${dateStr}T23:59:59`);
  return formatInTimeZone(
    new Date(formatInTimeZone(dt, MELBOURNE_TZ, "yyyy-MM-dd") + "T23:59:59"),
    MELBOURNE_TZ,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
};

/**
 * Returns UTC ISO string for start of day in Melbourne.
 * Supabase compares timestamptz in UTC, so we must convert.
 */
export function melbourneStartOfDayUTC(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const melbOffset = getMelbourneOffsetMinutes(date);
  const utcMs = date.getTime() - melbOffset * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/**
 * Returns UTC ISO string for end of day in Melbourne.
 * Supabase compares timestamptz in UTC, so we must convert.
 */
export function melbourneEndOfDayUTC(dateStr: string): string {
  const date = new Date(dateStr + 'T23:59:59');
  const melbOffset = getMelbourneOffsetMinutes(date);
  const utcMs = date.getTime() - melbOffset * 60 * 1000;
  return new Date(utcMs).toISOString();
}
