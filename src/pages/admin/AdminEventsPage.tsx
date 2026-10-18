import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDeleteEvent, useEventsList } from '../../hooks/useEvents';
import { toApiError } from '../../api/errors';
import type { EventDto } from '../../types/api';
import { formatDateTime, isPast } from '../../utils/format';
import { EventImage } from '../../components/events/EventImage';
import { ButtonLink } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { Alert, StatusMessage } from '../../components/ui/StatusMessage';
import { PageLoader } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/toastContext';
import shell from '../PageShell.module.css';
import styles from './Admin.module.css';

const PAGE_SIZE = 10;

export function AdminEventsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const name = params.get('q') ?? '';
  const { data, isLoading, isError, error, refetch, isFetching } = useEventsList({
    page,
    pageSize: PAGE_SIZE,
    name: name || undefined,
    sortBy: 'date',
  });
  const remove = useDeleteEvent();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<EventDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = () => {
    if (!toDelete) return;
    setDeleteError(null);
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.show(`האירוע "${toDelete.name}" נמחק`);
        setToDelete(null);
      },
      onError: (e) => {
        setDeleteError(toApiError(e).message);
        setToDelete(null);
      },
    });
  };

  return (
    <div className={`container ${shell.page}`}>
      <div className={shell.headRow}>
        <div>
          <p className={shell.eyebrow}>ניהול</p>
          <h1 className={shell.title}>ניהול אירועים</h1>
        </div>
        <ButtonLink to="/admin/events/new">+ אירוע חדש</ButtonLink>
      </div>

      <form className={styles.search} role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span className="sr-only">חיפוש לפי שם</span>
          <input
            type="search"
            placeholder="חיפוש לפי שם האירוע"
            defaultValue={name}
            onChange={(e) => {
              const v = e.target.value.trim();
              setParams(v ? { q: v } : {}, { replace: true });
            }}
          />
        </label>
      </form>

      {deleteError && <Alert>{deleteError}</Alert>}

      {isLoading ? (
        <PageLoader />
      ) : isError || !data ? (
        <StatusMessage
          tone="danger"
          title="לא הצלחנו לטעון את האירועים"
          message={toApiError(error).message}
          action={{ label: 'ניסיון נוסף', onClick: () => refetch() }}
        />
      ) : data.items.length === 0 ? (
        <StatusMessage
          title={name ? 'לא נמצאו אירועים' : 'עדיין אין אירועים'}
          message={name ? 'נסו שם אחר.' : 'צרו את האירוע הראשון – עם אולם, אזורי מחיר ותמונה.'}
          action={name ? undefined : { label: 'יצירת אירוע', to: '/admin/events/new' }}
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">אירוע</th>
                  <th scope="col">מועד</th>
                  <th scope="col">מקום</th>
                  <th scope="col">תפוסה</th>
                  <th scope="col">
                    <span className="sr-only">פעולות</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => {
                  const sold = e.totalSeats - e.availableSeats;
                  const pct = e.totalSeats ? Math.round((sold / e.totalSeats) * 100) : 0;
                  return (
                    <tr key={e.id} className={isPast(e.startDate) ? styles.pastRow : undefined}>
                      <td>
                        <div className={styles.eventCell}>
                          <EventImage src={e.imageUrl} alt="" seed={e.id} className={styles.thumb} />
                          <Link to={`/events/${e.id}`} className={styles.eventName}>
                            {e.name}
                          </Link>
                        </div>
                      </td>
                      <td>
                        {formatDateTime(e.startDate)}
                        {isPast(e.startDate) && <span className={styles.pastTag}>הסתיים</span>}
                      </td>
                      <td>{e.place}</td>
                      <td>
                        <div className={styles.occupancy} title={`${sold} מתוך ${e.totalSeats} מושבים הוזמנו`}>
                          <span className={styles.bar}>
                            <span style={{ width: `${pct}%` }} />
                          </span>
                          <span className={styles.occText}>
                            {sold}/{e.totalSeats}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link to={`/admin/events/${e.id}/edit`} className={styles.actionLink}>
                            עריכה
                          </Link>
                          <button type="button" className={styles.deleteBtn} onClick={() => setToDelete(e)}>
                            מחיקה
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            disabled={isFetching}
            onChange={(p) => {
              const next = new URLSearchParams(params);
              if (p === 1) next.delete('page');
              else next.set('page', String(p));
              setParams(next);
            }}
          />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="למחוק את האירוע?"
        confirmLabel="מחיקה"
        tone="danger"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {toDelete && (
          <p>
            האירוע <strong>{toDelete.name}</strong> יימחק עם האולם, האזורים והתמונה שלו. אירוע עם הזמנות פעילות לא ניתן למחוק.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
