import { BookingsList } from '../components/bookings/BookingsList';
import styles from './PageShell.module.css';

export function MyBookingsPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>החשבון שלי</p>
        <h1 className={styles.title}>ההזמנות שלי</h1>
        <p className={styles.sub}>אפשר לבטל הזמנה פעילה עד תחילת האירוע. המושבים ישוחררו מיד.</p>
      </header>
      <BookingsList emptyAction={{ label: 'לבחירת אירוע', to: '/' }} />
    </div>
  );
}
