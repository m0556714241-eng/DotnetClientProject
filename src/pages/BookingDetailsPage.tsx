import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBooking, useCancelBooking } from '../hooks/useBookings';
import { useAuth } from '../auth/authContext';
import { toApiError } from '../api/errors';
import { BookingCard } from '../components/bookings/BookingCard';
import { canCancel, canPay } from '../utils/bookingRules';
import { Check, CreditCard } from 'lucide-react';
import { Stepper } from '../components/ui/Stepper';
import { Button, ButtonLink } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Alert, StatusMessage } from '../components/ui/StatusMessage';
import { PageLoader } from '../components/ui/Spinner';
import { useToast } from '../components/ui/toastContext';
import styles from './BookingDetailsPage.module.css';
import shell from './PageShell.module.css';

// One booking. After a successful booking the user lands here (step 3 – done),
// and the success message is shown only because the SERVER returned 201 with this booking.
export function BookingDetailsPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const justBooked = !!(location.state as { justBooked?: boolean } | null)?.justBooked;

  const { data: booking, isLoading, isError, error, refetch } = useBooking(bookingId);
  const cancel = useCancelBooking();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (isLoading) return <PageLoader label="טוענים את ההזמנה…" />;

  if (isError || !booking) {
    const apiError = toApiError(error);
    return (
      <div className={`container ${shell.page}`}>
        <StatusMessage
          tone="danger"
          title={apiError.status === 404 ? 'ההזמנה לא נמצאה' : apiError.status === 403 ? 'אין גישה להזמנה הזו' : 'לא הצלחנו לטעון את ההזמנה'}
          message={apiError.message}
          action={apiError.status >= 500 || apiError.status === 0 ? { label: 'ניסיון נוסף', onClick: () => refetch() } : { label: 'להזמנות', to: isAdmin ? '/admin/bookings' : '/bookings' }}
        />
      </div>
    );
  }

  const showSuccess = justBooked && booking.status === 'Active';

  const onCancel = () => {
    setCancelError(null);
    cancel.mutate(booking.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.show('ההזמנה בוטלה והמושבים שוחררו');
        // Leave the "just booked" state so the success banner disappears
        navigate(location.pathname, { replace: true, state: null });
      },
      onError: (e) => {
        setConfirmOpen(false);
        setCancelError(toApiError(e).message);
      },
    });
  };

  return (
    <div className={`container ${shell.page} ${shell.narrow}`}>
      {showSuccess && (
        <section className={styles.success} aria-live="polite">
          <div className={styles.check} aria-hidden="true">
            <Check size={34} strokeWidth={3} />
          </div>
          <div className={styles.successText}>
            <Stepper current={2} onDark />
            <h1 className={styles.successTitle}>התשלום התקבל וההזמנה אושרה!</h1>
            <p>המושבים שלך. מספר ההזמנה: {booking.id}</p>
          </div>
        </section>
      )}

      {!showSuccess && (
        <header className={shell.head}>
          <p className={shell.eyebrow}>פרטי הזמנה</p>
          <h1 className={shell.title}>הזמנה מס׳ {booking.id}</h1>
        </header>
      )}

      {cancelError && <Alert>{cancelError}</Alert>}

      {canPay(booking) && !isAdmin && (
        <div className={styles.pending}>
          <Alert tone="warning">ההזמנה ממתינה לתשלום. המושבים שמורים עבורך לזמן מוגבל בלבד.</Alert>
          <ButtonLink to={`/bookings/${booking.id}/pay`} icon={<CreditCard size={18} aria-hidden="true" />}>
            להשלמת התשלום
          </ButtonLink>
        </div>
      )}

      <BookingCard booking={booking} showUser={isAdmin} detailsLink={false} />

      <div className={styles.actions}>
        <ButtonLink to={isAdmin ? '/admin/bookings' : '/bookings'} variant="dark">
          {isAdmin ? 'לכל ההזמנות' : 'לכל ההזמנות שלי'}
        </ButtonLink>
        <ButtonLink to="/" variant="ghost">
          לאירועים נוספים
        </ButtonLink>
        {canCancel(booking) && (
          <Button variant="ghost" className={styles.cancel} onClick={() => setConfirmOpen(true)}>
            ביטול ההזמנה
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="לבטל את ההזמנה?"
        confirmLabel="כן, לבטל"
        cancelLabel="השארת ההזמנה"
        tone="danger"
        loading={cancel.isPending}
        onConfirm={onCancel}
        onClose={() => setConfirmOpen(false)}
      >
        המושבים ישוחררו לאחרים. לא ניתן לבטל את הפעולה.
      </ConfirmDialog>
    </div>
  );
}
