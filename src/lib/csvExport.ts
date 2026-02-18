import { format } from "date-fns";

/**
 * Escape a CSV cell value: wrap in quotes if it contains commas, quotes, or newlines.
 */
const escapeCell = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert rows of data to a CSV string.
 */
export const toCSV = (headers: string[], rows: (string | number | boolean | null | undefined)[][]): string => {
  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map(row => row.map(escapeCell).join(","));
  return [headerLine, ...dataLines].join("\n");
};

/**
 * Trigger a CSV file download in the browser.
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Format a date string or Date to YYYY-MM-DD.
 */
export const formatDateForCSV = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
};

/**
 * Format a number: integers for counts, 2 decimals for percentages.
 */
export const formatNumberForCSV = (value: number | null | undefined, isPercentage = false): string => {
  if (value === null || value === undefined) return "0";
  return isPercentage ? value.toFixed(2) : Math.round(value).toString();
};
