// Runtime configuration read from the Vite environment (.env / Render environment variables)

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  // Fail loudly in development – a missing URL would otherwise show up as confusing network errors
  console.error('VITE_API_URL is not set. Copy .env.example to .env and set the server address.');
}

// The server address without a trailing slash, e.g. https://localhost:7180
export const API_URL = (rawApiUrl ?? '').replace(/\/+$/, '');

export const SHOW_DEMO_LOGIN = (import.meta.env.VITE_SHOW_DEMO_LOGIN ?? 'true') !== 'false';

// Business rules that the server also enforces (CreateBookingDto: MaxLength(10))
export const MAX_SEATS_PER_BOOKING = 10;

// PaginationQueryDto: PageSize 1..50
export const EVENTS_PAGE_SIZE = 9;
export const BOOKINGS_PAGE_SIZE = 6;

// EventService.UploadImageAsync rules
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Hall limits (CreateEventDto: Range(1, 50))
export const MAX_ROWS = 50;
export const MAX_SEATS_PER_ROW = 50;
