import { formatInTimeZone } from "date-fns-tz";

const MELBOURNE_TZ = "Australia/Melbourne";

/**
 * Convert a date string like "2026-04-06" to a Melbourne-local
 * start-of-day timestamp in ISO format with the correct offset.
 * e.g. "2026-04-06T00:00:00+10:00" (AEST) or "+11:00" (AEDT)
 */
export const melbourneStartOfDay = (dateStr: string): string => {
  // Parse as midnight Melbourne time
  const dt = new Date(`${dateStr}T00:00:00`);
  // Use formatInTimeZone to get the correct offset for that date
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
