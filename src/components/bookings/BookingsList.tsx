import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBookingsList, useCancelBooking } from '../../hooks/useBookings';
import { BOOKINGS_PAGE_SIZE } from '../../config';
import { toApiError } from '../../api/errors';
import type { BookingDto } from '../../types/api';
import { formatPrice } from '../../utils/format';
import { BookingCard } from './BookingCard';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Pagination } from '../ui/Pagination';
import { Alert, StatusMessage } from '../ui/StatusMessage';
import { PageLoader } from '../ui/Spinner';
import { useToast } from '../ui/toastContext';
import styles from './BookingsList.module.css';

// GET /api/bookings – the server returns only the customer's own bookings,
// or all bookings for an admin. Pagination is done by the server.
export function BookingsList({ showUser, emptyAction }: { showUser?: boolean; emptyAction?: { label: string; to: string } }) {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isLoading, isError, error, refetch, isFetching } = useBookingsList({
    page,
    pageSize: BOOKINGS_PAGE_SIZE,
  });
  const cancel = useCancelBooking();
  const toast = useToast();
  const [toCancel, setToCancel] = useState<BookingDto | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (isLoading) return <PageLoader label="טוענים הזמנות…" />;

  if (isError || !data) {
    return (
      <StatusMessage
        tone="danger"
        title="לא הצלחנו לטעון את ההזמנות"
        message={toApiError(error).message}
        action={{ label: 'ניסיון נוסף', onClick: () => refetch() }}
      />
    );
  }

  if (data.totalCount === 0) {
    return <StatusMessage title="אין עדיין הזמנות" message="הזמנות חדשות יופיעו כאן מיד אחרי האישור." action={emptyAction} />;
  }

  const confirmCancel = () => {
    if (!toCancel) return;
    setCancelError(null);
    cancel.mutate(toCancel.id, {
      onSuccess: () => {
        toast.show(`הזמנה מס׳ ${toCancel.id} בוטלה והמושבים שוחררו`);
        setToCancel(null);
      },
      onError: (e) => {
        setCancelError(toApiError(e).message);
        setToCancel(null);
      },
    });
  };

  return (
    <div className={styles.wrap}>
      {cancelError && <Alert>{cancelError}</Alert>}
      <p className={styles.count} aria-live="polite">
        {data.totalCount} הזמנות{data.totalPages > 1 && ` · עמוד ${data.page} מתוך ${data.totalPages}`}
      </p>
      <ul className={styles.list}>
        {data.items.map((b) => (
          <li key={b.id}>
            <BookingCard booking={b} showUser={showUser} onCancel={setToCancel} />
          </li>
        ))}
      </ul>
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        disabled={isFetching}
        onChange={(p) => setParams(p === 1 ? {} : { page: String(p) })}
      />

      <ConfirmDialog
        open={!!toCancel}
        title="לבטל את ההזמנה?"
        confirmLabel="כן, לבטל"
        cancelLabel="השארת ההזמנה"
        tone="danger"
        loading={cancel.isPending}
        onConfirm={confirmCancel}
        onClose={() => setToCancel(null)}
      >
        {toCancel && (
          <p>
            ההזמנה ל<strong>{toCancel.eventName}</strong> ({toCancel.seats.length} מושבים, {formatPrice(toCancel.totalPrice)})
            תבוטל, והמושבים ישוחררו לאחרים. לא ניתן לבטל את הפעולה.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
