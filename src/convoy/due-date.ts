const PARIS_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

/** A date already past by more than this is read as next year's ("05/01" typed in December). */
const MAX_DAYS_IN_PAST = 60;

/** Today's calendar date in Paris, as "YYYY-MM-DD". */
export function parisToday(now: Date): string {
  return PARIS_DATE.format(now);
}

/**
 * Reads the wanted delivery date typed as "JJ/MM" (or "JJ/MM/AAAA") and returns it as "YYYY-MM-DD".
 * Returns null when it is not a real calendar date.
 */
export function parseDueDate(text: string, now: Date): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const today = parisToday(now);
  let year = match[3] ? Number(match[3]) : Number(today.slice(0, 4));
  if (!isCalendarDate(year, month, day)) return null;
  if (!match[3] && daysBetween(toIso(year, month, day), today) > MAX_DAYS_IN_PAST) {
    year += 1;
    if (!isCalendarDate(year, month, day)) return null;
  }
  return toIso(year, month, day);
}

/** "2026-10-12" → "12/10". */
export function formatDueDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whole days from `earlier` to `later`, both "YYYY-MM-DD". */
function daysBetween(earlier: string, later: string): number {
  return (Date.parse(later) - Date.parse(earlier)) / 86_400_000;
}

const PARIS_CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The instant a Paris clock shows as this date and time, summer time included. */
export function fromParisTime(year: number, month: number, day: number, hour: number, minute: number): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = parisClockAsUtc(new Date(asUtc)) - asUtc;
  return new Date(asUtc - offset);
}

/** "10/10 02:42", in Paris time. */
export function formatParisTime(date: Date): string {
  const { day, month, hour, minute } = parisClock(date);
  return `${pad(day)}/${pad(month)} ${pad(hour)}:${pad(minute)}`;
}

function parisClockAsUtc(date: Date): number {
  const { year, month, day, hour, minute } = parisClock(date);
  return Date.UTC(year, month - 1, day, hour, minute);
}

function parisClock(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = Object.fromEntries(PARIS_CLOCK.formatToParts(date).map((part) => [part.type, Number(part.value)]));
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 0,
    day: parts.day ?? 0,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
