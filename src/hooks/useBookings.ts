import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { queryKeys } from '../api/queryKeys';
import type { BookingDto, CreateBookingDto, PaginationQuery } from '../types/api';
import { tokenizeCard, type CardDetails } from '../utils/mockPaymentProvider';

export function useBookingsList(query: PaginationQuery) {
  return useQuery({
    queryKey: queryKeys.bookings.list(query),
    queryFn: ({ signal }) => bookingsApi.list(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useBooking(id: number, initialData?: BookingDto) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: ({ signal }) => bookingsApi.get(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    initialData,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookingDto) => bookingsApi.create(dto),
    onSuccess: (booking) => {
      queryClient.setQueryData(queryKeys.bookings.detail(booking.id), booking);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      // Seat statuses and "available seats" counts changed
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSettled: () => {
      // Refresh from the server whatever the result (also after 409 "already canceled")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

// Step 2 – pay: card -> payment provider (token) -> our server charges with the token
export function usePayBooking(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (card: CardDetails) => {
      const { token } = await tokenizeCard(card);
      return bookingsApi.pay(id, { paymentToken: token });
    },
    onSuccess: (booking) => {
      queryClient.setQueryData(queryKeys.bookings.detail(booking.id), booking);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
    onError: () => {
      // e.g. 409 time ran out -> the booking became Expired and the seats were released
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}
