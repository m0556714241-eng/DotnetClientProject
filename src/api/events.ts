import { api } from './client';
import type { EventDetailsDto, EventDto, EventInput, EventQuery, PagedResult } from '../types/api';

// EventsController – /api/events
export const eventsApi = {
  // GET /api/events?page&pageSize&name&fromDate&toDate&sortBy&descending
  list: (query: EventQuery, signal?: AbortSignal) =>
    api.get<PagedResult<EventDto>>('/events', { params: cleanParams(query), signal }).then((r) => r.data),

  // GET /api/events/{id} – the event + sections + every seat with its status
  get: (id: number, signal?: AbortSignal) =>
    api.get<EventDetailsDto>(`/events/${id}`, { signal }).then((r) => r.data),

  // Admin only
  create: (dto: EventInput) => api.post<EventDto>('/events', dto).then((r) => r.data),
  update: (id: number, dto: EventInput) => api.put<EventDto>(`/events/${id}`, dto).then((r) => r.data),
  remove: (id: number) => api.delete<void>(`/events/${id}`).then(() => undefined),

  // PUT /api/events/{id}/image – multipart/form-data, the field name is "file"
  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.put<void>(`/events/${id}/image`, form).then(() => undefined);
  },
};

// Drop empty values so the query string has only what was actually chosen
function cleanParams(query: EventQuery) {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}
