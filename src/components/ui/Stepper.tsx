import { Check } from 'lucide-react';
import styles from './Stepper.module.css';

// The booking steps, shown on the seat map, the payment page and the confirmation.
// current = index of the active step (0-based). Steps before it are "done".
const BOOKING_STEPS = ['בחירת מושבים', 'תשלום', 'אישור'];

export function Stepper({ current, steps = BOOKING_STEPS, onDark }: { current: number; steps?: string[]; onDark?: boolean }) {
  return (
    <ol className={`${styles.stepper} ${onDark ? styles.onDark : ''}`} aria-label="שלבי ההזמנה">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className={`${styles.step} ${styles[state]}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={styles.number} aria-hidden="true">
              {state === 'done' ? <Check size={15} strokeWidth={3} /> : i + 1}
            </span>
            <span className={styles.label}>
              <span className="sr-only">{state === 'done' ? 'הושלם: ' : state === 'current' ? 'השלב הנוכחי: ' : ''}</span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
