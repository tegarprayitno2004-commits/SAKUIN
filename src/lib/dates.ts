import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { DateRange } from '@/src/types';

export const JAKARTA_TIMEZONE = 'Asia/Jakarta';

/**
 * Converts a JS Date (instant) to a YYYY-MM-DD calendar key in Asia/Jakarta (UTC+7).
 */
export function toJakartaDateKey(date: Date = new Date()): string {
  return formatInTimeZone(date, JAKARTA_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Returns today's YYYY-MM-DD calendar date in Asia/Jakarta.
 */
export function getTodayJakartaDateKey(now: Date = new Date()): string {
  return toJakartaDateKey(now);
}

/**
 * Converts a YYYY-MM-DD string (interpreted in Asia/Jakarta at optional HH:mm) to a JS Date instant.
 */
export function jakartaDateKeyToDate(dateKey: string, timeHHmm = '12:00'): Date {
  const safeTime = /^\d{2}:\d{2}$/.test(timeHHmm) ? timeHHmm : '12:00';
  return fromZonedTime(`${dateKey}T${safeTime}:00`, JAKARTA_TIMEZONE);
}

/**
 * Parses a YYYY-MM-DD string into a local calendar Date representing the exact wall-clock date in Jakarta.
 */
function parseDateKeyWall(dateKey: string): Date {
  return parseISO(`${dateKey}T00:00:00`);
}

/**
 * Formats a YYYY-MM-DD or Date into "20 Nov 2026" in Indonesian locale (Asia/Jakarta).
 */
export function formatDateId(input: string | Date, pattern = 'd MMM yyyy'): string {
  if (typeof input === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    return format(parseDateKeyWall(input), pattern, { locale: idLocale });
  }
  return formatInTimeZone(input, JAKARTA_TIMEZONE, pattern, { locale: idLocale });
}

/**
 * Returns Monday-Sunday week range in Asia/Jakarta for a given dateKey or Date.
 */
export function getWeekRangeJakarta(ref: string | Date = new Date()): DateRange {
  const zoned =
    typeof ref === 'string'
      ? parseDateKeyWall(ref)
      : toZonedTime(ref, JAKARTA_TIMEZONE);
  const start = startOfWeek(zoned, { weekStartsOn: 1 });
  const end = endOfWeek(zoned, { weekStartsOn: 1 });
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

/**
 * Returns 1st-last day of month range in Asia/Jakarta for a given dateKey or Date.
 */
export function getMonthRangeJakarta(ref: string | Date = new Date()): DateRange {
  const zoned =
    typeof ref === 'string'
      ? parseDateKeyWall(ref)
      : toZonedTime(ref, JAKARTA_TIMEZONE);
  const start = startOfMonth(zoned);
  const end = endOfMonth(zoned);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

/**
 * Shifts a reference YYYY-MM-DD by days, weeks, or months.
 */
export function shiftDateKey(
  dateKey: string,
  unit: 'day' | 'week' | 'month',
  amount: number
): string {
  const wall = parseDateKeyWall(dateKey);
  if (unit === 'day') return format(addDays(wall, amount), 'yyyy-MM-dd');
  if (unit === 'week') return format(addWeeks(wall, amount), 'yyyy-MM-dd');
  return format(addMonths(wall, amount), 'yyyy-MM-dd');
}

/**
 * Calculates total, elapsed (min 1), and remaining days (min 1) within a budget range.
 */
export function getElapsedAndRemainingDays(
  startDateKey: string,
  endDateKey: string,
  todayDateKey: string
): { totalDays: number; elapsedDays: number; remainingDays: number } {
  const start = parseDateKeyWall(startDateKey);
  const end = parseDateKeyWall(endDateKey);
  const today = parseDateKeyWall(todayDateKey);

  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);

  if (todayDateKey < startDateKey) {
    return { totalDays, elapsedDays: 1, remainingDays: totalDays };
  }
  if (todayDateKey > endDateKey) {
    return { totalDays, elapsedDays: totalDays, remainingDays: 1 };
  }

  const elapsedDays = Math.max(1, differenceInCalendarDays(today, start) + 1);
  const remainingDays = Math.max(1, differenceInCalendarDays(end, today) + 1);
  return { totalDays, elapsedDays, remainingDays };
}

/**
 * Computes the immediately preceding equivalent range of the same inclusive length.
 */
export function getPreviousEquivalentRange(startDateKey: string, endDateKey: string): DateRange {
  const start = parseDateKeyWall(startDateKey);
  const end = parseDateKeyWall(endDateKey);
  const lengthDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, lengthDays - 1);
  return {
    startDate: format(prevStart, 'yyyy-MM-dd'),
    endDate: format(prevEnd, 'yyyy-MM-dd'),
  };
}

/**
 * Lists all YYYY-MM-DD keys between start and end inclusive (capped at 366 days for safety).
 */
export function enumerateDateKeys(startDateKey: string, endDateKey: string): string[] {
  const start = parseDateKeyWall(startDateKey);
  const end = parseDateKeyWall(endDateKey);
  const diff = differenceInCalendarDays(end, start);
  if (diff < 0) return [];
  const capped = Math.min(diff, 365);
  const keys: string[] = [];
  for (let i = 0; i <= capped; i++) {
    keys.push(format(addDays(start, i), 'yyyy-MM-dd'));
  }
  return keys;
}

/**
 * Short day-of-week label in Indonesian ("Sen", "Sel", "Rab", ...).
 */
export function getShortDayNameId(dateKey: string): string {
  return format(parseDateKeyWall(dateKey), 'EEE', { locale: idLocale });
}

/**
 * Formats a month-year label ("November 2026").
 */
export function formatMonthYearId(dateKey: string): string {
  return format(parseDateKeyWall(dateKey), 'MMMM yyyy', { locale: idLocale });
}
