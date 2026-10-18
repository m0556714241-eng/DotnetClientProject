import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { MAX_SEATS_PER_BOOKING } from '../../config';
import type { EventDetailsDto, SeatDto, SectionDto } from '../../types/api';
import { clearPendingSelection, readPendingSelection, writePendingSelection } from './pendingSelection';

// THE single source of truth for the chosen seats.
// Both the seat map and the summary read from here and call the same actions,
// so "remove in the summary" and "click on the map" can never get out of sync.
// Only seat ids are stored; seat details, prices and the total are DERIVED from the server data.

export interface SelectedSeat {
  seat: SeatDto;
  section: SectionDto;
  price: number;
}

export type ToggleResult = 'added' | 'removed' | 'limit' | 'unavailable';

type Action =
  | { type: 'add'; id: number }
  | { type: 'remove'; id: number }
  | { type: 'removeMany'; ids: number[] }
  | { type: 'clear' };

function reducer(state: number[], action: Action): number[] {
  switch (action.type) {
    case 'add':
      return state.includes(action.id) ? state : [...state, action.id];
    case 'remove':
      return state.filter((id) => id !== action.id);
    case 'removeMany': {
      const drop = new Set(action.ids);
      return state.filter((id) => !drop.has(id));
    }
    case 'clear':
      return [];
  }
}

export function useSeatSelection(eventId: number, event: EventDetailsDto | undefined) {
  const [seatIds, dispatch] = useReducer(reducer, eventId, (id) => {
    const pending = readPendingSelection();
    return pending && pending.eventId === id ? pending.seatIds.slice(0, MAX_SEATS_PER_BOOKING) : [];
  });

  // Seats that were removed because the server now says they are taken
  const [lostSeats, setLostSeats] = useState<SeatDto[]>([]);

  const seatsById = useMemo(() => new Map(event?.seats.map((s) => [s.id, s]) ?? []), [event]);
  const sectionsById = useMemo(() => new Map(event?.sections.map((s) => [s.id, s]) ?? []), [event]);

  // Keep the selection for the login round-trip
  useEffect(() => {
    if (seatIds.length > 0) writePendingSelection(eventId, seatIds);
    else clearPendingSelection(eventId);
  }, [eventId, seatIds]);

  // Every time fresh seat data arrives (first load, refresh after 409, window focus):
  // drop ONLY the selected seats that the server now reports as booked or missing.
  useEffect(() => {
    if (!event) return;
    const lost: SeatDto[] = [];
    const lostIds: number[] = [];
    for (const id of seatIds) {
      const seat = seatsById.get(id);
      if (!seat || seat.status !== 'Available') {
        lostIds.push(id);
        if (seat) lost.push(seat);
      }
    }
    if (lostIds.length > 0) {
      dispatch({ type: 'removeMany', ids: lostIds });
      setLostSeats(lost);
    }
    // seatIds is intentionally not a dependency: this runs on new SERVER data, not on every click
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, seatsById]);

  const selected: SelectedSeat[] = useMemo(() => {
    const list: SelectedSeat[] = [];
    for (const id of seatIds) {
      const seat = seatsById.get(id);
      const section = seat && sectionsById.get(seat.sectionId);
      if (seat && section) list.push({ seat, section, price: section.price });
    }
    return list;
  }, [seatIds, seatsById, sectionsById]);

  const total = useMemo(() => selected.reduce((sum, s) => sum + s.price, 0), [selected]);
  const selectedIds = useMemo(() => new Set(seatIds), [seatIds]);

  const toggle = useCallback(
    (seat: SeatDto): ToggleResult => {
      if (selectedIds.has(seat.id)) {
        dispatch({ type: 'remove', id: seat.id });
        return 'removed';
      }
      if (seat.status !== 'Available') return 'unavailable';
      if (selectedIds.size >= MAX_SEATS_PER_BOOKING) return 'limit';
      dispatch({ type: 'add', id: seat.id });
      return 'added';
    },
    [selectedIds],
  );

  const remove = useCallback((id: number) => dispatch({ type: 'remove', id }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const dismissLost = useCallback(() => setLostSeats([]), []);

  return {
    selected,
    selectedIds,
    seatIds,
    count: selected.length,
    total,
    max: MAX_SEATS_PER_BOOKING,
    isFull: selected.length >= MAX_SEATS_PER_BOOKING,
    toggle,
    remove,
    clear,
    lostSeats,
    dismissLost,
  };
}

export type SeatSelection = ReturnType<typeof useSeatSelection>;
