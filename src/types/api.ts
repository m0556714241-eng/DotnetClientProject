// Types that mirror the server DTOs (SeatWise.Application/DTOs).
// ASP.NET writes JSON in camelCase, enums as text (JsonStringEnumConverter), dates as ISO strings (UTC).

// ---------- Enums (SeatWise.Domain/Enums) ----------
export type SeatStatus = 'Available' | 'Booked';
// PendingPayment = seats held until paymentDueAt; Expired = not paid in time (seats released)
export type BookingStatus = 'Active' | 'Canceled' | 'PendingPayment' | 'Expired';
export type UserRole = 'Customer' | 'Admin';

// ---------- Common ----------
// PagedResult<T>
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// PaginationQueryDto (Page >= 1, PageSize 1..50)
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

// API/Errors/ErrorResponse – the uniform error JSON of the whole server
export interface ErrorResponse {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  correlationId?: string;
}

// ---------- Auth ----------
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
}

export interface UserTokenDto {
  token: string;
  expiresAt: string;
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
}

// ---------- Events ----------
// EventDto – a card in the list
export interface EventDto {
  id: number;
  name: string;
  place: string;
  startDate: string;
  imageUrl: string | null;
  minPrice: number;
  totalSeats: number;
  availableSeats: number;
}

export interface SectionDto {
  id: number;
  name: string;
  price: number;
  fromRow: number;
  toRow: number;
}

export interface SeatDto {
  id: number;
  rowNumber: number;
  seatNumber: number;
  status: SeatStatus;
  sectionId: number;
}

// EventDetailsDto – one event with everything needed to draw the seat map
export interface EventDetailsDto extends EventDto {
  description: string | null;
  rowsCount: number;
  seatsPerRow: number;
  sections: SectionDto[];
  seats: SeatDto[];
}

export type EventSortBy = 'date' | 'name';

// EventQueryDto (query string)
export interface EventQuery extends PaginationQuery {
  name?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: EventSortBy;
  descending?: boolean;
}

// SectionInputDto
export interface SectionInput {
  name: string;
  price: number;
  fromRow: number;
  toRow: number;
}

// CreateEventDto / UpdateEventDto (same fields)
export interface EventInput {
  name: string;
  place: string;
  description?: string | null;
  startDate: string; // UTC ISO
  rowsCount: number;
  seatsPerRow: number;
  sections: SectionInput[];
}

// ---------- Bookings ----------
export interface CreateBookingDto {
  eventId: number;
  seatIds: number[];
}

export interface BookedSeatDto {
  seatId: number;
  rowNumber: number;
  seatNumber: number;
  sectionName: string;
  price: number;
}

export interface BookingDto {
  id: number;
  status: BookingStatus;
  createdAt: string;
  userId: number;
  userFullName: string;
  userEmail: string;
  eventId: number;
  eventName: string;
  eventStartDate: string;
  seats: BookedSeatDto[];
  totalPrice: number;
  /** Only while status = PendingPayment (UTC) */
  paymentDueAt: string | null;
}

// PayBookingDto – only a one-time token from the payment provider; the card never reaches our server
export interface PayBookingDto {
  paymentToken: string;
}
