import styles from './Logo.module.css';

// The SeatWise mark: a gold tile with a hall seat (seat back + cushion + armrests), and the wordmark
export function Logo({ light = true, compact }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={`${styles.logo} ${light ? styles.light : styles.dark}`}>
      <span className={styles.tile} aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22">
          {/* seat back */}
          <rect x="9" y="6" width="14" height="11" rx="3.5" fill="#14243A" />
          {/* cushion */}
          <rect x="7" y="17.5" width="18" height="5" rx="2.5" fill="#14243A" />
          {/* armrests + legs */}
          <rect x="5" y="13" width="3.6" height="13" rx="1.8" fill="#14243A" />
          <rect x="23.4" y="13" width="3.6" height="13" rx="1.8" fill="#14243A" />
        </svg>
      </span>
      {!compact && (
        <span className={styles.word}>
          Seat<span className={styles.accent}>Wise</span>
        </span>
      )}
    </span>
  );
}
