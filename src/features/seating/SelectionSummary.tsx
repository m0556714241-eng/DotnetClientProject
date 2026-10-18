import { useState } from 'react';
import type { SectionStyle } from '../../utils/sectionColors';
import { formatPrice, pluralTickets } from '../../utils/format';
import { ArrowLeft, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { SeatSelection } from './useSeatSelection';
import styles from './SelectionSummary.module.css';

// The live booking summary. It reads the SAME selection state as the map:
// removing here deselects on the map, clicking on the map shows up here.
export function SelectionSummary({
  selection,
  sectionStyles,
  onContinue,
  continueLabel = 'המשך להזמנה',
  disabledReason,
  loading,
}: {
  selection: SeatSelection;
  sectionStyles: Map<number, SectionStyle>;
  onContinue: () => void;
  continueLabel?: string;
  /** When set, the button is disabled and this text explains why */
  disabledReason?: string;
  /** e.g. while re-checking availability with the server */
  loading?: boolean;
}) {
  const { selected, count, total, max, remove, clear } = selection;
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={`${styles.summary} ${expanded ? styles.expanded : ''}`} aria-label="סיכום הבחירה">
      {/* Mobile: a compact bar that opens the full list */}
      <button
        type="button"
        className={styles.mobileBar}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="selection-list"
      >
        <span>
          <strong>{count > 0 ? pluralTickets(count) : 'לא נבחרו מושבים'}</strong>
          {count > 0 && <span className={styles.mobileTotal}> · {formatPrice(total)}</span>}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </span>
      </button>

      <div className={styles.header}>
        <h2 className={styles.title}>המושבים שלך</h2>
        <span className={styles.counter} aria-live="polite">
          {count} / {max}
        </span>
      </div>

      <div id="selection-list" className={styles.body}>
        {count === 0 ? (
          <div className={styles.empty}>
            <svg width="44" height="36" viewBox="0 0 44 36" aria-hidden="true">
              <rect x="6" y="8" width="32" height="22" rx="7" fill="none" stroke="#B8893B" strokeWidth="2.5" />
              <rect x="10" y="24" width="24" height="4" rx="2" fill="#B8893B" opacity=".5" />
            </svg>
            <p>בחרו מושבים במפת האולם.</p>
            <p className={styles.emptyHint}>אפשר לבחור עד {max} מושבים בהזמנה אחת.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {selected.map(({ seat, section, price }) => (
              <li key={seat.id} className={styles.item}>
                <span
                  className={styles.dot}
                  style={{ background: sectionStyles.get(section.id)?.color }}
                  aria-hidden="true"
                />
                <span className={styles.itemText}>
                  <span className={styles.itemZone}>{section.name}</span>
                  <span className={styles.itemSeat}>
                    שורה {seat.rowNumber} | מושב {seat.seatNumber}
                  </span>
                </span>
                <span className={styles.itemPrice}>{formatPrice(price)}</span>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => remove(seat.id)}
                  aria-label={`הסרת מושב ${seat.seatNumber} בשורה ${seat.rowNumber}, אזור ${section.name}`}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.totalRow}>
          <span>{count > 0 ? pluralTickets(count) : 'סה״כ'}</span>
          <strong className={styles.total}>{formatPrice(total)}</strong>
        </div>
        {count > 0 && <p className={styles.note}>המחיר הסופי נקבע ונשמר בשרת ברגע אישור ההזמנה.</p>}
        <Button
          size="lg"
          block
          onClick={onContinue}
          disabled={count === 0 || !!disabledReason}
          loading={loading}
          className={styles.cta}
        >
          {loading ? 'בודקים זמינות…' : continueLabel}
          {!loading && <ArrowLeft size={18} aria-hidden="true" />}
        </Button>
        {disabledReason && <p className={styles.reason}>{disabledReason}</p>}
        {count > 0 && (
          <button type="button" className={styles.clear} onClick={clear}>
            ניקוי הבחירה
          </button>
        )}
      </div>
    </aside>
  );
}
