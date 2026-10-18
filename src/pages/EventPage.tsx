import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEventDetails } from '../hooks/useEvents';
import { useCreateBooking } from '../hooks/useBookings';
import { useAuth } from '../auth/authContext';
import { toApiError } from '../api/errors';
import { buildSectionStyles } from '../utils/sectionColors';
import { formatLongDate, formatPrice, formatTime, isPast, pluralTickets } from '../utils/format';
import { EventImage } from '../components/events/EventImage';
import { PageLoader } from '../components/ui/Spinner';
import { Alert, StatusMessage } from '../components/ui/StatusMessage';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Stepper } from '../components/ui/Stepper';
import { X } from 'lucide-react';
import { SeatingMap } from '../features/seating/SeatingMap';
import { SeatLegend } from '../features/seating/SeatLegend';
import { SelectionSummary } from '../features/seating/SelectionSummary';
import { useSeatSelection } from '../features/seating/useSeatSelection';
import { clearPendingSelection } from '../features/seating/pendingSelection';
import type { EventDetailsDto } from '../types/api';
import styles from './EventPage.module.css';

export function EventPage() {
  const { id: idParam } = useParams();
  const eventId = Number(idParam);
  const { data: event, isLoading, isError, error, refetch } = useEventDetails(eventId);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return <NotFound />;
  }
  if (isLoading) return <PageLoader label="טוענים את האירוע ומפת האולם…" />;
  if (isError || !event) {
    const apiError = toApiError(error);
    if (apiError.status === 404) return <NotFound />;
    return (
      <div className="container" style={{ paddingBlock: 'var(--sp-8)' }}>
        <StatusMessage
          tone="danger"
          title="לא הצלחנו לטעון את האירוע"
          message={apiError.message}
          action={{ label: 'ניסיון נוסף', onClick: () => refetch() }}
        />
      </div>
    );
  }

  // key: a different event gets a fresh selection state
  return <EventView key={event.id} event={event} refetch={refetch} />;
}

function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: 'var(--sp-8)' }}>
      <StatusMessage title="האירוע לא נמצא" message="ייתכן שהאירוע הוסר או שהקישור שגוי." action={{ label: 'לכל האירועים', to: '/' }} />
    </div>
  );
}

function EventView({
  event,
  refetch,
}: {
  event: EventDetailsDto;
  refetch: () => Promise<{ data?: EventDetailsDto }>;
}) {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const selection = useSeatSelection(event.id, event);
  const sectionStyles = useMemo(() => buildSectionStyles(event.sections), [event.sections]);
  const createBooking = useCreateBooking();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const past = isPast(event.startDate);
  const soldOut = event.availableSeats === 0;
  const readOnly = past || isAdmin;

  const prices = event.sections.map((s) => s.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const disabledReason = past
    ? 'האירוע כבר התקיים – לא ניתן להזמין'
    : isAdmin
      ? 'חשבון מנהל אינו יכול להזמין מושבים'
      : undefined;

  // Step 5: "Continue to booking"
  const onContinue = async () => {
    setBookingError(null);
    if (!isAuthenticated) {
      // The selection is already kept in sessionStorage (useSeatSelection) – go log in and come back
      navigate('/login', { state: { from: `/events/${event.id}`, reason: 'booking' } });
      return;
    }
    // Re-check availability with the server before showing the confirmation.
    // useSeatSelection drops any seat that is now taken and reports it.
    setChecking(true);
    try {
      const fresh = await refetch();
      const stillFree = selection.seatIds.every(
        (id) => fresh.data?.seats.find((s) => s.id === id)?.status === 'Available',
      );
      if (stillFree) setReviewOpen(true);
    } finally {
      setChecking(false);
    }
  };

  // Step 6: submit to POST /api/bookings
  const onConfirm = () => {
    if (createBooking.isPending) return; // no double submit
    setBookingError(null);
    createBooking.mutate(
      { eventId: event.id, seatIds: selection.seatIds },
      {
        onSuccess: (booking) => {
          selection.clear();
          clearPendingSelection(event.id);
          setReviewOpen(false);
          // Step 2: the seats are now HELD for her – go pay before the deadline
          navigate(`/bookings/${booking.id}/pay`);
        },
        onError: async (err) => {
          const apiError = toApiError(err);
          setReviewOpen(false);
          setBookingError(apiError.message);
          if (apiError.status === 409 || apiError.status === 400) {
            // Refresh the real availability – taken seats turn gray and leave the selection,
            // the other chosen seats stay selected.
            await refetch();
          }
        },
      },
    );
  };

  return (
    <div className={styles.page}>
      {/* ---------- Event header ---------- */}
      <section className={styles.hero}>
        <EventImage src={event.imageUrl} alt={event.name} seed={event.id} className={styles.heroImage} eager />
        <div className={styles.heroShade} />
        <div className={`container ${styles.heroInner}`}>
          <nav className={styles.crumbs} aria-label="מיקום בעמוד">
            <Link to="/">אירועים</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{event.name}</span>
          </nav>
          <h1 className={styles.title}>{event.name}</h1>
          <dl className={styles.facts}>
            <div>
              <dt>מועד</dt>
              <dd>
                {formatLongDate(event.startDate)}, {formatTime(event.startDate)}
              </dd>
            </div>
            <div>
              <dt>מקום</dt>
              <dd>{event.place}</dd>
            </div>
            <div>
              <dt>מחירים</dt>
              <dd>
                {prices.length === 0
                  ? '—'
                  : minPrice === maxPrice
                    ? formatPrice(minPrice)
                    : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`}
              </dd>
            </div>
            <div>
              <dt>זמינות</dt>
              <dd>
                {event.availableSeats} מתוך {event.totalSeats} מושבים פנויים
              </dd>
            </div>
          </dl>
          {event.description && <p className={styles.description}>{event.description}</p>}
        </div>
      </section>

      {/* ---------- Seat selection ---------- */}
      <section className={`container ${styles.booking}`} aria-labelledby="seats-title">
        <div className={styles.steps}>
          <Stepper current={0} />
        </div>

        <div className={styles.bookingHead}>
          <h2 id="seats-title" className={styles.sectionTitle}>
            בחירת מושבים
          </h2>
          <p className={styles.sectionSub}>
            המפה מציגה את הזמינות העדכנית מהשרת. מושב נשמר עבורך רק אחרי אישור ההזמנה.
          </p>
        </div>

        <div className={styles.alerts}>
          {past && <Alert tone="warning">האירוע הזה כבר התקיים. המפה מוצגת לצפייה בלבד.</Alert>}
          {!past && soldOut && <Alert tone="warning">כל המושבים לאירוע הזה נתפסו.</Alert>}
          {isAdmin && !past && (
            <Alert tone="neutral">
              את מחוברת כמנהלת – המפה לצפייה בלבד.{' '}
              <Link to={`/admin/events/${event.id}/edit`} className={styles.inlineLink}>
                לעריכת האירוע
              </Link>
            </Alert>
          )}
          {bookingError && (
            <Alert tone="danger">
              {bookingError}
              <button type="button" className={styles.dismiss} onClick={() => setBookingError(null)} aria-label="סגירת ההודעה">
                <X size={16} aria-hidden="true" />
              </button>
            </Alert>
          )}
          {selection.lostSeats.length > 0 && (
            <Alert tone="warning">
              {selection.lostSeats.length === 1 ? 'המושב ' : 'המושבים '}
              {selection.lostSeats.map((s) => `שורה ${s.rowNumber} מושב ${s.seatNumber}`).join(', ')}
              {selection.lostSeats.length === 1 ? ' נתפס' : ' נתפסו'} בינתיים והוסרו מהבחירה. שאר המושבים שבחרת נשמרו.
              <button type="button" className={styles.dismiss} onClick={selection.dismissLost} aria-label="סגירת ההודעה">
                <X size={16} aria-hidden="true" />
              </button>
            </Alert>
          )}
        </div>

        <div className={styles.layout}>
          <div className={styles.mapCol}>
            {event.seats.length === 0 ? (
              <StatusMessage title="אין עדיין מפת מושבים" message="לאירוע הזה עוד לא הוגדרו מושבים." compact />
            ) : (
              <SeatingMap
                event={event}
                sectionStyles={sectionStyles}
                selectedIds={selection.selectedIds}
                onToggle={selection.toggle}
                readOnly={readOnly}
              />
            )}
            <SeatLegend event={event} sectionStyles={sectionStyles} />
          </div>

          {!readOnly ? (
            <SelectionSummary
              selection={selection}
              sectionStyles={sectionStyles}
              onContinue={onContinue}
              continueLabel={isAuthenticated ? 'המשך להזמנה' : 'התחברות והמשך להזמנה'}
              disabledReason={disabledReason}
              loading={checking}
            />
          ) : (
            <aside className={styles.readOnlyAside}>
              <h3>{past ? 'האירוע הסתיים' : 'צפייה בלבד'}</h3>
              <p>{disabledReason}</p>
              <Link to="/" className={styles.inlineLink}>
                לאירועים נוספים ←
              </Link>
            </aside>
          )}
        </div>
      </section>

      {/* ---------- Step 2: review before submitting ---------- */}
      <ConfirmDialog
        open={reviewOpen}
        title="סיכום לפני תשלום"
        confirmLabel={`המשך לתשלום · ${formatPrice(selection.total)}`}
        cancelLabel="חזרה למפה"
        loading={createBooking.isPending}
        onConfirm={onConfirm}
        onClose={() => setReviewOpen(false)}
      >
        <div className={styles.review}>
          <p className={styles.reviewEvent}>
            <strong>{event.name}</strong>
            <br />
            {formatLongDate(event.startDate)}, {formatTime(event.startDate)} · {event.place}
          </p>
          <ul className={styles.reviewList}>
            {selection.selected.map(({ seat, section, price }) => (
              <li key={seat.id}>
                <span>
                  {section.name} · שורה {seat.rowNumber} · מושב {seat.seatNumber}
                </span>
                <span>{formatPrice(price)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.reviewTotal}>
            <span>{pluralTickets(selection.count)}</span>
            <strong>{formatPrice(selection.total)}</strong>
          </p>
          <p className={styles.reviewNote}>
            המושבים יישמרו עבורך ל-10 דקות להשלמת התשלום. ההזמנה נשלחת כמקשה אחת: אם אחד המושבים נתפס בינתיים, אף מושב לא יוזמן
            ותוכלו לבחור מחדש.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
