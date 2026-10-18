import { Link } from 'react-router-dom';
import type { EventDto } from '../../types/api';
import { dateParts, formatLongDate, formatPrice, formatTime, isPast } from '../../utils/format';
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import { EventImage } from './EventImage';
import styles from './EventCard.module.css';

export function AvailabilityBadge({ event }: { event: EventDto }) {
  if (isPast(event.startDate)) return <span className={`${styles.badge} ${styles.badgePast}`}>האירוע הסתיים</span>;
  if (event.availableSeats === 0) return <span className={`${styles.badge} ${styles.badgeSold}`}>אזלו הכרטיסים</span>;
  const ratio = event.totalSeats > 0 ? event.availableSeats / event.totalSeats : 1;
  if (ratio <= 0.15)
    return <span className={`${styles.badge} ${styles.badgeLow}`}>נותרו {event.availableSeats} מושבים</span>;
  return <span className={styles.badge}>{event.availableSeats} מושבים פנויים</span>;
}

export function EventCard({ event }: { event: EventDto }) {
  const { day, month } = dateParts(event.startDate);
  const past = isPast(event.startDate);

  return (
    <Link to={`/events/${event.id}`} className={`${styles.card} ${past ? styles.past : ''}`}>
      <div className={styles.media}>
        <EventImage src={event.imageUrl} alt={event.name} seed={event.id} className={styles.image} />
        <div className={styles.date} aria-hidden="true">
          <span className={styles.day}>{day}</span>
          <span className={styles.month}>{month}</span>
        </div>
      </div>
      <div className={styles.body}>
        <AvailabilityBadge event={event} />
        <h3 className={styles.title}>{event.name}</h3>
        <p className={styles.meta}>
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            {formatLongDate(event.startDate)} · {formatTime(event.startDate)}
          </span>
          <span>
            <MapPin size={15} aria-hidden="true" />
            {event.place}
          </span>
        </p>
        <div className={styles.footer}>
          {event.totalSeats > 0 ? (
            <span className={styles.price}>
              <small>החל מ-</small>
              {formatPrice(event.minPrice)}
            </span>
          ) : (
            <span />
          )}
          <span className={styles.cta}>
            {past ? 'לפרטים' : 'לבחירת מושבים'}
            <ArrowLeft size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
