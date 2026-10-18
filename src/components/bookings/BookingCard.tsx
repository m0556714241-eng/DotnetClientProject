import { Link } from 'react-router-dom';
import type { BookingDto } from '../../types/api';
import { formatDateTime, formatLongDate, formatPrice, formatTime, isPast, pluralTickets } from '../../utils/format';
import { Button } from '../ui/Button';
import { canCancel, canPay } from '../../utils/bookingRules';
import styles from './BookingCard.module.css';

export function BookingCard({
  booking,
  showUser,
  onCancel,
  detailsLink = true,
}: {
  booking: BookingDto;
  showUser?: boolean;
  onCancel?: (booking: BookingDto) => void;
  detailsLink?: boolean;
}) {
  const canceled = booking.status === 'Canceled' || booking.status === 'Expired';
  const past = isPast(booking.eventStartDate);
  const pending = booking.status === 'PendingPayment';

  const [statusText, statusClass] =
    booking.status === 'Canceled'
      ? ['בוטלה', styles.statusCanceled]
      : booking.status === 'Expired'
        ? ['לא שולמה בזמן', styles.statusCanceled]
        : pending
          ? ['ממתינה לתשלום', styles.statusPending]
          : past
            ? ['האירוע התקיים', styles.statusPast]
            : ['שולמה ופעילה', styles.statusActive];

  return (
    <article className={`${styles.card} ${canceled ? styles.canceled : ''}`} aria-labelledby={`booking-${booking.id}`}>
      <div className={styles.ticketEdge} aria-hidden="true" />
      <div className={styles.main}>
        <header className={styles.head}>
          <div>
            <p className={styles.number}>הזמנה מס׳ {booking.id}</p>
            <h3 id={`booking-${booking.id}`} className={styles.event}>
              <Link to={`/events/${booking.eventId}`}>{booking.eventName}</Link>
            </h3>
            <p className={styles.date}>
              {formatLongDate(booking.eventStartDate)} · {formatTime(booking.eventStartDate)}
            </p>
          </div>
          <span className={`${styles.status} ${statusClass}`}>{statusText}</span>
        </header>

        {showUser && (
          <p className={styles.user}>
            <strong>{booking.userFullName}</strong> · <span dir="ltr">{booking.userEmail}</span>
          </p>
        )}

        <ul className={styles.seats}>
          {booking.seats.map((s) => (
            <li key={s.seatId}>
              <span>
                {s.sectionName} · שורה {s.rowNumber} · מושב {s.seatNumber}
              </span>
              <span className={styles.seatPrice}>{formatPrice(s.price)}</span>
            </li>
          ))}
        </ul>

        <footer className={styles.footer}>
          <div className={styles.total}>
            <span>{pluralTickets(booking.seats.length)}</span>
            <strong>{formatPrice(booking.totalPrice)}</strong>
          </div>
          <p className={styles.created}>הוזמנה ב-{formatDateTime(booking.createdAt)}</p>
          <div className={styles.actions}>
            {pending && canPay(booking) && !showUser && (
              <Link to={`/bookings/${booking.id}/pay`} className={styles.payLink}>
                להשלמת התשלום
              </Link>
            )}
            {detailsLink && (
              <Link to={`/bookings/${booking.id}`} className={styles.link}>
                פרטי ההזמנה
              </Link>
            )}
            {onCancel && canCancel(booking) && (
              <Button variant="ghost" size="sm" onClick={() => onCancel(booking)} className={styles.cancelBtn}>
                ביטול ההזמנה
              </Button>
            )}
          </div>
        </footer>
      </div>
    </article>
  );
}
