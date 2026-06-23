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
 * Parses an invoice date safely. Handles:
 *  - "YYYY-MM-DD" strings
 *  - ISO datetime strings
 *  - JavaScript Date objects (returned by Google Sheets API)
 *  - Numbers (Excel serial date, e.g. 45678) from Google Sheets
 *  - undefined / null
 */
export function parseInvoiceDate(dateInput: string | Date | number | undefined | null): Date {
  if (!dateInput) return new Date();

  // If it's already a Date object (Google Sheets API can return these)
  if (dateInput instanceof Date) {
    return isValid(dateInput) ? dateInput : new Date();
  }

  // If it's a number (Excel/Sheets serial date: days since 1899-12-30)
  if (typeof dateInput === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const msPerDay = 86400000;
    const d = new Date(excelEpoch.getTime() + dateInput * msPerDay);
    return isValid(d) ? d : new Date();
  }

  // Coerce to string and trim (guards against unexpected types from sync)
  const dateString = String(dateInput).trim();
  if (!dateString || dateString === 'null' || dateString === 'undefined') return new Date();

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

  // Fallback to native Date parser
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
export function getInvoiceDateStr(dateString: string | Date | number | undefined | null): string {
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
}

export function formatDateTime(dateString: string | Date | number | undefined | null): string {
  if (!dateString) return "";
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "dd MMM yyyy, hh:mm a");
}

export function formatDisplayTime(dateString: string | Date | number | undefined | null): string {
  if (!dateString) return "";
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "hh:mm a");
}

export function formatDisplayDate(dateString: string | Date | number | undefined | null): string {
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "dd MMM yyyy");
}

export function formatDisplayDateTime(dateString: string | Date | number | undefined | null): string {
  if (!dateString) return "";
  const d = parseInvoiceDate(dateString);
  return formatInTimeZone(d, TIMEZONE, "dd MMM yyyy, hh:mm a");
}

export function isDateInCurrentWeek(dateString: string | Date | number | undefined | null): boolean {
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

export function isDateInCurrentMonth(dateString: string | Date | number | undefined | null): boolean {
    if (!dateString) return false;
    const invoiceDateStr = formatInTimeZone(parseInvoiceDate(dateString), TIMEZONE, "yyyy-MM");
    const kolkataNowStr = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM");
    return invoiceDateStr === kolkataNowStr;
}

export function isDateInCurrentYear(dateString: string | Date | number | undefined | null): boolean {
    if (!dateString) return false;
    const invoiceDateStr = formatInTimeZone(parseInvoiceDate(dateString), TIMEZONE, "yyyy");
    const kolkataNowStr = formatInTimeZone(new Date(), TIMEZONE, "yyyy");
    return invoiceDateStr === kolkataNowStr;
}
