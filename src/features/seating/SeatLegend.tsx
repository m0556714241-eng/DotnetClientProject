import { useMemo } from 'react';
import type { EventDetailsDto } from '../../types/api';
import type { SectionStyle } from '../../utils/sectionColors';
import { formatPrice } from '../../utils/format';
import styles from './SeatLegend.module.css';

// Explains every color and mark on the map. Zones come from the server (name, price, rows),
// the "free" counts are counted from the real seat statuses.
export function SeatLegend({
  event,
  sectionStyles,
}: {
  event: EventDetailsDto;
  sectionStyles: Map<number, SectionStyle>;
}) {
  const zones = useMemo(() => {
    const free = new Map<number, number>();
    for (const seat of event.seats) {
      if (seat.status === 'Available') free.set(seat.sectionId, (free.get(seat.sectionId) ?? 0) + 1);
    }
    return [...event.sections]
      .sort((a, b) => b.price - a.price || a.fromRow - b.fromRow)
      .map((s) => ({ section: s, free: free.get(s.id) ?? 0, color: sectionStyles.get(s.id)?.color ?? '#5B7C99' }));
  }, [event, sectionStyles]);

  return (
    <div className={styles.legend}>
      <h3 className={styles.title}>מקרא ומחירים</h3>
      <ul className={styles.zones}>
        {zones.map(({ section, free, color }) => (
          <li key={section.id} className={styles.zone}>
            <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
            <span className={styles.zoneText}>
              <span className={styles.zoneName}>{section.name}</span>
              <span className={styles.zoneMeta}>
                שורות {section.fromRow}–{section.toRow} · {free > 0 ? `${free} פנויים` : 'אזל'}
              </span>
            </span>
            <span className={styles.price}>{formatPrice(section.price)}</span>
          </li>
        ))}
      </ul>
      <ul className={styles.states}>
        <li>
          <svg width="20" height="18" viewBox="-10 -9 20 18" aria-hidden="true">
            <rect x="-8" y="-6.5" width="16" height="13" rx="3.6" fill="#fff" stroke="#14243A" strokeWidth="2.2" />
            <path d="M -4 -0.6 L -1.2 2.2 L 4.2 -3.4" stroke="#14243A" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          נבחר על ידך
        </li>
        <li>
          <svg width="20" height="18" viewBox="-10 -9 20 18" aria-hidden="true">
            <rect x="-8" y="-6.5" width="16" height="13" rx="3.6" fill="#C9C5BD" />
            <path d="M -3.2 -3.6 L 3.2 2 M 3.2 -3.6 L -3.2 2" stroke="#8F8B84" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          תפוס
        </li>
      </ul>
    </div>
  );
}
