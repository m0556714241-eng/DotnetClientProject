import type { BookingDto } from '../types/api';
import { isPast, parseServerDate } from './format';

// Same rule as BookingService.CancelAsync: an active (or waiting-for-payment) booking, before the event starts
export function canCancel(booking: BookingDto): boolean {
  return (booking.status === 'Active' || booking.status === 'PendingPayment') && !isPast(booking.eventStartDate);
}

// Waiting for payment and the deadline has not passed yet
export function canPay(booking: BookingDto): boolean {
  return (
    booking.status === 'PendingPayment' &&
    !!booking.paymentDueAt &&
    parseServerDate(booking.paymentDueAt).getTime() > Date.now() &&
    !isPast(booking.eventStartDate)
  );
}
