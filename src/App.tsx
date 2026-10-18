import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { RequireAuth } from './auth/RequireAuth';
import { HomePage } from './pages/HomePage';
import { EventPage } from './pages/EventPage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { BookingDetailsPage } from './pages/BookingDetailsPage';
import { PaymentPage } from './pages/PaymentPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminEventFormPage } from './pages/admin/AdminEventFormPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public – no login needed to browse */}
        <Route index element={<HomePage />} />
        <Route path="events/:id" element={<EventPage />} />
        <Route path="login" element={<LoginPage />} />

        {/* Customer */}
        <Route
          path="bookings"
          element={
            <RequireAuth role="Customer">
              <MyBookingsPage />
            </RequireAuth>
          }
        />
        {/* Customer – step 2: pay for a booking that holds seats */}
        <Route
          path="bookings/:id/pay"
          element={
            <RequireAuth role="Customer">
              <PaymentPage />
            </RequireAuth>
          }
        />
        {/* Customer (her own) or admin (any) – the server decides (403) */}
        <Route
          path="bookings/:id"
          element={
            <RequireAuth>
              <BookingDetailsPage />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="admin"
          element={
            <RequireAuth role="Admin">
              <AdminEventsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/events/new"
          element={
            <RequireAuth role="Admin">
              <AdminEventFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/events/:id/edit"
          element={
            <RequireAuth role="Admin">
              <AdminEventFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/bookings"
          element={
            <RequireAuth role="Admin">
              <AdminBookingsPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
