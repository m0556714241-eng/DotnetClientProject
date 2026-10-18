import type { EventQuery, PaginationQuery } from '../types/api';

// All TanStack Query keys in one place – so invalidation after a mutation is never a typo
export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (query: EventQuery) => ['events', 'list', query] as const,
    detail: (id: number) => ['events', 'detail', id] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    list: (query: PaginationQuery) => ['bookings', 'list', query] as const,
    detail: (id: number) => ['bookings', 'detail', id] as const,
  },
};
