import { BookingsList } from '../../components/bookings/BookingsList';
import shell from '../PageShell.module.css';

// The same endpoint as "my bookings" – for an admin the server returns ALL bookings, with the booker's name and email
export function AdminBookingsPage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className={shell.eyebrow}>ניהול</p>
        <h1 className={shell.title}>כל ההזמנות</h1>
        <p className={shell.sub}>הזמנות של כל הלקוחות, כולל הזמנות שבוטלו.</p>
      </header>
      <BookingsList showUser />
    </div>
  );
}
