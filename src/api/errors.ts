import axios from 'axios';
import type { ErrorResponse } from '../types/api';

// One error type for the whole client. Every failed request becomes an ApiError
// with a Hebrew message that can be shown as-is.
export type ApiErrorKind = 'http' | 'network' | 'canceled';

export class ApiError extends Error {
  readonly status: number; // 0 = no response (network)
  readonly kind: ApiErrorKind;
  /** Field errors in react-hook-form path format (e.g. "email", "sections.0.name") – Hebrew text */
  readonly fieldErrors: Record<string, string>;
  /** Only on 500 – the id to look for in the server log */
  readonly correlationId?: string;

  constructor(opts: {
    status: number;
    kind: ApiErrorKind;
    message: string;
    fieldErrors?: Record<string, string>;
    correlationId?: string;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.kind = opts.kind;
    this.fieldErrors = opts.fieldErrors ?? {};
    this.correlationId = opts.correlationId;
  }

  get isConflict() {
    return this.status === 409;
  }
}

// ---------- Server message -> Hebrew ----------
// The server (Result pattern) returns short English messages. Known ones are translated exactly;
// anything else falls back to a general message by status code (the English text is never shown).
const SEAT_TAKEN = 'אחד המושבים שבחרת נתפס בינתיים. עדכנו את הזמינות — אפשר לבחור מושבים אחרים.';

const exactMessages: Record<string, string> = {
  'Wrong email or password': 'אימייל או סיסמה שגויים',
  'This email is already registered': 'כתובת האימייל הזו כבר רשומה במערכת',
  'The same seat was chosen more than once': 'אותו מושב נבחר יותר מפעם אחת',
  'Some of the seats were not found in this event': 'חלק מהמושבים לא נמצאו באירוע. רעננו את המפה ונסו שוב',
  'This event has already started': 'האירוע כבר התחיל – לא ניתן להזמין אליו מושבים',
  'One of the seats was just taken by another user. Please choose again.': SEAT_TAKEN,
  'Booking not found': 'ההזמנה לא נמצאה',
  'You can view only your own bookings': 'אפשר לצפות רק בהזמנות שלך',
  'You can cancel only your own bookings': 'אפשר לבטל רק הזמנות שלך',
  'This booking is already canceled': 'ההזמנה כבר בוטלה',
  "A booking can't be canceled after the event started": 'לא ניתן לבטל הזמנה אחרי שהאירוע התחיל',
  'The booking was changed by another user. Please try again.': 'ההזמנה עודכנה במקביל. רעננו ונסו שוב',
  'Event not found': 'האירוע לא נמצא',
  'The event date must be in the future': 'מועד האירוע חייב להיות בעתיד',
  'The hall layout cannot be changed after bookings were made':
    'לא ניתן לשנות את גודל האולם או את האזורים אחרי שבוצעו הזמנות',
  'The event was changed by another user. Please try again.': 'האירוע עודכן במקביל. טענו מחדש ונסו שוב',
  'An event with active bookings cannot be deleted': 'לא ניתן למחוק אירוע שיש בו הזמנות פעילות',
  'The image file is empty': 'קובץ התמונה ריק',
  'The image must be up to 2MB': 'התמונה חייבת להיות עד 2MB',
  'Only JPEG, PNG or WEBP images are allowed': 'מותרות רק תמונות JPEG, PNG או WEBP',
  'You can pay only for your own bookings': 'אפשר לשלם רק על הזמנות שלך',
  'This booking is not waiting for payment': 'ההזמנה הזו כבר אינה ממתינה לתשלום',
  'The payment time has expired and the seats were released': 'הזמן לתשלום הסתיים והמושבים שוחררו. אפשר לבחור מושבים מחדש.',
  'The payment was declined': 'התשלום נדחה. אפשר לנסות כרטיס אחר.',
  'You need to log in': 'יש להתחבר כדי להמשיך',
  "You don't have permission for this action": 'אין לך הרשאה לבצע פעולה זו',
  'Validation failed': 'חלק מהפרטים אינם תקינים',
};

const patternMessages: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^These seats are already taken/, () => SEAT_TAKEN],
  [/^Section name '(.+)' appears more than once$/, (m) => `שם האזור "${m[1]}" מופיע יותר מפעם אחת`],
  [/^Section '(.+)': FromRow must not be greater than ToRow$/, (m) => `באזור "${m[1]}" שורת ההתחלה גדולה משורת הסיום`],
  [/^Section '(.+)' goes beyond the hall \(the hall has (\d+) rows\)$/, (m) => `האזור "${m[1]}" חורג מהאולם (באולם ${m[2]} שורות)`],
  [/^Section '(.+)' overlaps the previous section$/, (m) => `האזור "${m[1]}" חופף לאזור הקודם`],
  [/^Rows (\d+)-(\d+) are not in any section$/, (m) => `שורות ${m[1]}–${m[2]} אינן שייכות לאף אזור`],
];

const statusMessages: Record<number, string> = {
  400: 'הבקשה אינה תקינה',
  401: 'יש להתחבר כדי להמשיך',
  403: 'אין לך הרשאה לבצע פעולה זו',
  404: 'הפריט המבוקש לא נמצא',
  409: 'הנתונים השתנו בינתיים. רעננו ונסו שוב',
};

export function translateServerMessage(message: string | undefined, status: number): string {
  if (message) {
    const exact = exactMessages[message.trim()];
    if (exact) return exact;
    for (const [re, build] of patternMessages) {
      const match = message.trim().match(re);
      if (match) return build(match);
    }
  }
  if (status >= 500) return 'אירעה שגיאה בשרת. נסו שוב בעוד רגע';
  return statusMessages[status] ?? 'אירעה שגיאה לא צפויה';
}

// ---------- Validation (ModelState) errors ----------
// Server keys look like "Email", "Sections[0].Name" or "$.startDate" -> "email", "sections.0.name", "startDate"
export function normalizeFieldPath(key: string): string {
  return key
    .replace(/^\$\.?/, '')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLowerCase() + part.slice(1))
    .join('.');
}

function translateFieldMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('is required') || m.includes('required')) return 'שדה חובה';
  if (m.includes('e-mail') || m.includes('email address')) return 'כתובת אימייל לא תקינה';
  if (m.includes('minimum length') || m.includes('at least')) return 'הערך קצר מדי';
  if (m.includes('maximum length') || m.includes('up to 10 seats')) return 'הערך ארוך מדי';
  if (m.includes('between') || m.includes('must be')) return 'הערך מחוץ לטווח המותר';
  if (m.includes('could not be converted') || m.includes('json')) return 'הערך בפורמט לא תקין';
  return 'ערך לא תקין';
}

// ---------- Any thrown value -> ApiError ----------
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError({ status: 0, kind: 'canceled', message: 'הבקשה בוטלה' });
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError({
        status: 0,
        kind: 'network',
        message: 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב',
      });
    }

    const status = error.response.status;
    const body = error.response.data as Partial<ErrorResponse> | undefined;
    const serverMessage = typeof body?.message === 'string' ? body.message : undefined;

    const fieldErrors: Record<string, string> = {};
    if (body?.errors && typeof body.errors === 'object') {
      for (const [key, messages] of Object.entries(body.errors)) {
        const first = Array.isArray(messages) ? messages[0] : undefined;
        if (first) fieldErrors[normalizeFieldPath(key)] = translateFieldMessage(first);
      }
    }

    return new ApiError({
      status,
      kind: 'http',
      message: translateServerMessage(serverMessage, status),
      fieldErrors,
      correlationId: status >= 500 ? body?.correlationId : undefined,
    });
  }

  return new ApiError({ status: 0, kind: 'network', message: 'אירעה שגיאה לא צפויה' });
}

export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
