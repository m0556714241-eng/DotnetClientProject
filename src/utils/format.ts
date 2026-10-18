// Formatting helpers – Hebrew locale, Israeli shekel.
// The server stores and returns every date in UTC; the browser shows it in the user's local time.

/** Parses a server date. If the string has no time zone, it is UTC (the server's rule) */
export function parseServerDate(value: string): Date {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

const currency = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number): string {
  return currency.format(value);
}

const longDate = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDate = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
const time = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
const dayNum = new Intl.DateTimeFormat('he-IL', { day: 'numeric' });
const monthShort = new Intl.DateTimeFormat('he-IL', { month: 'short' });
const weekdayShort = new Intl.DateTimeFormat('he-IL', { weekday: 'short' });

export const formatLongDate = (iso: string) => longDate.format(parseServerDate(iso));
export const formatShortDate = (iso: string) => shortDate.format(parseServerDate(iso));
export const formatTime = (iso: string) => time.format(parseServerDate(iso));
export const formatDateTime = (iso: string) => `${formatShortDate(iso)}, ${formatTime(iso)}`;

export function dateParts(iso: string) {
  const d = parseServerDate(iso);
  return { day: dayNum.format(d), month: monthShort.format(d), weekday: weekdayShort.format(d) };
}

export function isPast(iso: string): boolean {
  return parseServerDate(iso).getTime() <= Date.now();
}

// ---------- <input type="date"> / <input type="datetime-local"> <-> UTC ----------

/** "2027-01-14" (local day) -> UTC ISO of the start of that local day */
export function localDayStartToUtc(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}

/** "2027-01-14" (local day) -> UTC ISO of the end of that local day */
export function localDayEndToUtc(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

/** "2027-01-14T19:30" (local) -> UTC ISO */
export function localDateTimeToUtc(value: string): string {
  return new Date(value).toISOString();
}

/** Server UTC ISO -> value for <input type="datetime-local"> in local time */
export function utcToLocalDateTimeInput(iso: string): string {
  const d = parseServerDate(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function pluralSeats(n: number): string {
  return n === 1 ? 'מושב אחד' : `${n} מושבים`;
}

export function pluralTickets(n: number): string {
  return n === 1 ? 'כרטיס אחד' : `${n} כרטיסים`;
}
