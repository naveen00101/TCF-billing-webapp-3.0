import { format, parseISO, isValid, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";

const TIMEZONE = "Asia/Kolkata";

export function getCurrentTimestamp(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function getCurrentTimeStr(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "hh:mm a");
}

/**
 * Parses an invoice date safely. Handles "YYYY-MM-DD" and ISO strings.
 * Returns a valid Date object in local time.
 */
export function parseInvoiceDate(dateString: string | undefined): Date {
  if (!dateString) return new Date();

  // If it's a simple YYYY-MM-DD
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Parse it as midday in Kolkata time to avoid date shifting
    return toDate(dateString + "T12:00:00", { timeZone: TIMEZONE });
  }

  // Attempt to parse as ISO string
  const parsedISO = parseISO(dateString);
  if (isValid(parsedISO)) {
    return parsedISO;
  }

  // Fallback to strict format if it somehow got mangled
  const parsedFallback = new Date(dateString);
  if (isValid(parsedFallback)) {
      return parsedFallback;
  }

  return new Date();
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata
 */
export function getTodayStr(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
}

/**
 * Returns the "YYYY-MM-DD" portion of an invoice date (in local tz)
 */
export function getInvoiceDateStr(dateString: string | undefined): string {
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return "";
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "dd MMM yyyy, hh:mm a");
}

export function formatDisplayTime(dateString: string | undefined): string {
  if (!dateString) return "";
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "hh:mm a");
}

export function formatDisplayDate(dateString: string | undefined): string {
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "dd MMM yyyy");
}

export function formatDisplayDateTime(dateString: string | undefined): string {
  if (!dateString) return "";
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "dd MMM yyyy, hh:mm a");
}

export function isDateInCurrentWeek(dateString: string | undefined): boolean {
  if (!dateString) return false;
  
  // Extract pure YYYY-MM-DD from invoice date in Asia/Kolkata
  const invoiceDateStr = formatInTimeZone(parseInvoiceDate(dateString), TIMEZONE, "yyyy-MM-dd");
  
  // Get current date in Asia/Kolkata timezone
  const kolkataNowStr = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
  const nowMidday = toDate(kolkataNowStr + "T12:00:00", { timeZone: TIMEZONE });
  
  // Get ISO day of week in Kolkata (1 = Monday, ..., 7 = Sunday)
  const dayOfWeekStr = formatInTimeZone(nowMidday, TIMEZONE, "i");
  const dayOfWeek = parseInt(dayOfWeekStr, 10);
  const diffToMonday = dayOfWeek - 1; // 0 for Monday, ..., 6 for Sunday

  const startOfWeekDate = new Date(nowMidday.getTime());
  startOfWeekDate.setDate(nowMidday.getDate() - diffToMonday);
  const startBoundStr = formatInTimeZone(startOfWeekDate, TIMEZONE, "yyyy-MM-dd");
  
  const endOfWeekDate = new Date(nowMidday.getTime());
  endOfWeekDate.setDate(nowMidday.getDate() + (6 - diffToMonday));
  const endBoundStr = formatInTimeZone(endOfWeekDate, TIMEZONE, "yyyy-MM-dd");
  
  return invoiceDateStr >= startBoundStr && invoiceDateStr <= endBoundStr;
}

export function isDateInCurrentMonth(dateString: string | undefined): boolean {
    if (!dateString) return false;
    const invoiceDateStr = formatInTimeZone(parseInvoiceDate(dateString), TIMEZONE, "yyyy-MM");
    const kolkataNowStr = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM");
    return invoiceDateStr === kolkataNowStr;
}

export function isDateInCurrentYear(dateString: string | undefined): boolean {
    if (!dateString) return false;
    const invoiceDateStr = formatInTimeZone(parseInvoiceDate(dateString), TIMEZONE, "yyyy");
    const kolkataNowStr = formatInTimeZone(new Date(), TIMEZONE, "yyyy");
    return invoiceDateStr === kolkataNowStr;
}
