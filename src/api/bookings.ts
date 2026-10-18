import { api } from './client';
import type { BookingDto, CreateBookingDto, PagedResult, PaginationQuery, PayBookingDto } from '../types/api';

// BookingsController – /api/bookings (every endpoint needs a token)
export const bookingsApi = {
  // Customer only. 201 / 400 / 403 (admin) / 409 (seat taken)
  create: (dto: CreateBookingDto) => api.post<BookingDto>('/bookings', dto).then((r) => r.data),

  // Customer: her bookings. Admin: all bookings
  list: (query: PaginationQuery, signal?: AbortSignal) =>
    api.get<PagedResult<BookingDto>>('/bookings', { params: query, signal }).then((r) => r.data),

  get: (id: number, signal?: AbortSignal) =>
    api.get<BookingDto>(`/bookings/${id}`, { signal }).then((r) => r.data),

  // POST /api/bookings/{id}/pay – PendingPayment -> Active
  pay: (id: number, dto: PayBookingDto) => api.post<BookingDto>(`/bookings/${id}/pay`, dto).then((r) => r.data),

  // DELETE = cancel (the booking stays as "Canceled", the seats become free)
  cancel: (id: number) => api.delete<void>(`/bookings/${id}`).then(() => undefined),
};
