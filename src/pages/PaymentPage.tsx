import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CalendarDays, Clock, CreditCard, Lock, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import { useBooking, useCancelBooking, usePayBooking } from '../hooks/useBookings';
import { toApiError } from '../api/errors';
import type { BookingDto } from '../types/api';
import { formatLongDate, formatPrice, formatTime, parseServerDate, pluralTickets } from '../utils/format';
import {
  CardValidationError,
  TEST_CARDS,
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  isValidExpiry,
  type CardDetails,
} from '../utils/mockPaymentProvider';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { Stepper } from '../components/ui/Stepper';
import { Alert, StatusMessage } from '../components/ui/StatusMessage';
import { PageLoader } from '../components/ui/Spinner';
import shell from './PageShell.module.css';
import styles from './PaymentPage.module.css';

// Step 2 of the booking: the seats are HELD (status PendingPayment) until paymentDueAt.
// Pay -> the server charges through its payment gateway -> Active -> step 3 (confirmation).
export function PaymentPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const { data: booking, isLoading, isError, error, refetch } = useBooking(bookingId);

  if (isLoading) return <PageLoader label="טוענים את ההזמנה…" />;

  if (isError || !booking) {
    return (
      <div className={`container ${shell.page}`}>
        <StatusMessage
          tone="danger"
          title="לא הצלחנו לטעון את ההזמנה"
          message={toApiError(error).message}
          action={{ label: 'ניסיון נוסף', onClick: () => refetch() }}
        />
      </div>
    );
  }

  // Already paid -> the confirmation page
  if (booking.status === 'Active') return <Navigate to={`/bookings/${booking.id}`} replace />;

  if (booking.status !== 'PendingPayment') {
    return (
      <div className={`container ${shell.page}`}>
        <StatusMessage
          tone="warning"
          title={booking.status === 'Expired' ? 'הזמן לתשלום הסתיים' : 'ההזמנה בוטלה'}
          message="המושבים שוחררו. אפשר לחזור למפת האולם ולבחור מחדש."
          action={{ label: 'חזרה למפת האולם', to: `/events/${booking.eventId}` }}
        />
      </div>
    );
  }

  return <PaymentView booking={booking} />;
}

// Seconds left until the deadline (updates every second)
function useSecondsLeft(dueAt: string | null) {
  const due = dueAt ? parseServerDate(dueAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return Math.max(0, Math.floor((due - now) / 1000));
}

function PaymentView({ booking }: { booking: BookingDto }) {
  const navigate = useNavigate();
  const pay = usePayBooking(booking.id);
  const cancel = useCancelBooking();
  const secondsLeft = useSecondsLeft(booking.paymentDueAt);
  const expired = secondsLeft === 0;
  const [payError, setPayError] = useState<string | null>(null);
  const [timeIsUp, setTimeIsUp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CardDetails>({ defaultValues: { holderName: '', number: '', expiry: '', cvv: '' } });

  const numberField = register('number', {
    required: 'יש להזין מספר כרטיס',
    validate: (v) => isValidCardNumber(v) || 'מספר הכרטיס אינו תקין',
  });
  const expiryField = register('expiry', {
    required: 'יש להזין תוקף',
    validate: (v) => isValidExpiry(v) || 'תוקף לא תקין (MM/YY)',
  });

  const onSubmit = handleSubmit((card) => {
    if (pay.isPending) return; // no double charge
    setPayError(null);
    pay.mutate(card, {
      onSuccess: (paid) => navigate(`/bookings/${paid.id}`, { replace: true, state: { justBooked: true } }),
      onError: (e) => {
        if (e instanceof CardValidationError) {
          setPayError(e.message);
          return;
        }
        const apiError = toApiError(e);
        if (apiError.status === 409) setTimeIsUp(true);
        setPayError(apiError.message);
      },
    });
  });

  const giveUp = () => {
    cancel.mutate(booking.id, {
      onSettled: () => navigate(`/events/${booking.eventId}`, { replace: true }),
    });
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const urgent = secondsLeft <= 120;

  if (expired || timeIsUp) {
    return (
      <div className={`container ${shell.page}`}>
        <StatusMessage
          tone="warning"
          title="הזמן לתשלום הסתיים"
          message="המושבים נשמרו עבורך לזמן מוגבל ושוחררו. אפשר לחזור למפת האולם ולבחור שוב – ייתכן שהם עדיין פנויים."
          action={{ label: 'חזרה למפת האולם', to: `/events/${booking.eventId}` }}
        />
      </div>
    );
  }

  return (
    <div className={`container ${shell.page}`}>
      <div className={styles.top}>
        <Stepper current={1} />
        <div className={`${styles.timer} ${urgent ? styles.timerUrgent : ''}`} role="timer" aria-live="off">
          <Clock size={18} aria-hidden="true" />
          <span>המושבים שמורים עבורך עוד</span>
          <strong className="ltr">
            {mm}:{ss}
          </strong>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ---------- Card form ---------- */}
        <section className={styles.card} aria-labelledby="pay-title">
          <h1 id="pay-title" className={styles.title}>
            <CreditCard size={26} aria-hidden="true" />
            תשלום
          </h1>

          <div className={styles.demoNote}>
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <strong>סביבת הדגמה – לא מתבצע חיוב אמיתי.</strong>
              <br />
              כרטיס לאישור: <span className="ltr">{TEST_CARDS.approved}</span> · כרטיס שנדחה:{' '}
              <span className="ltr">{TEST_CARDS.declined}</span> · כל תוקף עתידי ו-CVV כלשהו.
            </div>
          </div>

          {payError && <Alert>{payError}</Alert>}

          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <TextField
              label="שם בעל הכרטיס"
              autoComplete="cc-name"
              error={errors.holderName?.message}
              {...register('holderName', { required: 'יש להזין שם', maxLength: { value: 100, message: 'עד 100 תווים' } })}
            />
            <TextField
              label="מספר כרטיס"
              inputMode="numeric"
              autoComplete="cc-number"
              dir="ltr"
              placeholder="0000 0000 0000 0000"
              error={errors.number?.message}
              {...numberField}
              onChange={(e) => {
                e.target.value = formatCardNumber(e.target.value);
                numberField.onChange(e);
              }}
            />
            <div className={styles.row2}>
              <TextField
                label="תוקף"
                inputMode="numeric"
                autoComplete="cc-exp"
                dir="ltr"
                placeholder="MM/YY"
                error={errors.expiry?.message}
                {...expiryField}
                onChange={(e) => {
                  e.target.value = formatExpiry(e.target.value);
                  expiryField.onChange(e);
                }}
              />
              <TextField
                label="CVV"
                inputMode="numeric"
                autoComplete="cc-csc"
                dir="ltr"
                maxLength={4}
                error={errors.cvv?.message}
                {...register('cvv', {
                  required: 'יש להזין קוד',
                  pattern: { value: /^\d{3,4}$/, message: '3–4 ספרות' },
                })}
              />
            </div>

            <Button type="submit" size="lg" block loading={pay.isPending} icon={<Lock size={18} aria-hidden="true" />}>
              {pay.isPending ? 'מעבדים את התשלום…' : `תשלום ${formatPrice(booking.totalPrice)}`}
            </Button>
            <p className={styles.secure}>
              <Lock size={13} aria-hidden="true" /> פרטי הכרטיס עוברים רק לספק התשלום. השרת של SeatWise מקבל אסימון חד-פעמי בלבד.
            </p>
          </form>
        </section>

        {/* ---------- Order summary ---------- */}
        <aside className={styles.summary} aria-label="סיכום ההזמנה">
          <p className={styles.summaryLabel}>הזמנה מס׳ {booking.id}</p>
          <h2 className={styles.summaryEvent}>{booking.eventName}</h2>
          <p className={styles.summaryMeta}>
            <CalendarDays size={16} aria-hidden="true" />
            {formatLongDate(booking.eventStartDate)} · {formatTime(booking.eventStartDate)}
          </p>
          <ul className={styles.seats}>
            {booking.seats.map((s) => (
              <li key={s.seatId}>
                <Ticket size={15} aria-hidden="true" />
                <span>
                  {s.sectionName} · שורה {s.rowNumber} · מושב {s.seatNumber}
                </span>
                <strong>{formatPrice(s.price)}</strong>
              </li>
            ))}
          </ul>
          <div className={styles.total}>
            <span>{pluralTickets(booking.seats.length)}</span>
            <strong>{formatPrice(booking.totalPrice)}</strong>
          </div>
          <div className={styles.summaryActions}>
            <Link to={`/events/${booking.eventId}`} className={styles.back}>
              <MapPin size={15} aria-hidden="true" /> צפייה במפת האולם
            </Link>
            <button type="button" className={styles.giveUp} onClick={giveUp} disabled={cancel.isPending || pay.isPending}>
              ביטול ושחרור המושבים
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
