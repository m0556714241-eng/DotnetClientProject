import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

// Server-side pagination: the page number goes to the server, the server returns totalPages
export function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;

  const pages = visiblePages(page, totalPages);

  return (
    <nav className={styles.nav} aria-label="מעבר בין עמודים">
      {/* RTL: "previous" points right */}
      <button
        type="button"
        className={styles.arrow}
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="העמוד הקודם"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      <ol className={styles.pages}>
        {pages.map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={`${styles.page} ${p === page ? styles.current : ''}`}
                onClick={() => onChange(p)}
                disabled={disabled}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`עמוד ${p}`}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ol>

      <button
        type="button"
        className={styles.arrow}
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="העמוד הבא"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}

function visiblePages(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: Array<number | '…'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) result.push('…');
  for (let p = start; p <= end; p++) result.push(p);
  if (end < total - 1) result.push('…');
  result.push(total);
  return result;
}
