// Keeps the chosen seats while the user goes to log in and comes back.
// sessionStorage = this tab only, cleared when the tab closes. Holds only ids (no prices –
// prices and availability are always re-read from the server when the map loads again).
const KEY = 'seatwise.pendingSelection';
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface PendingSelection {
  eventId: number;
  seatIds: number[];
  savedAt: number;
}

export function readPendingSelection(): PendingSelection | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingSelection;
    if (!value || typeof value.eventId !== 'number' || !Array.isArray(value.seatIds)) return null;
    if (Date.now() - value.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function writePendingSelection(eventId: number, seatIds: number[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ eventId, seatIds, savedAt: Date.now() }));
  } catch {
    /* storage blocked – the selection simply won't survive a reload */
  }
}

export function clearPendingSelection(eventId?: number): void {
  try {
    if (eventId !== undefined && readPendingSelection()?.eventId !== eventId) return;
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
