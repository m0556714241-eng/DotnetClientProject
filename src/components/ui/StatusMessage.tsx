import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Inbox } from 'lucide-react';
import styles from './StatusMessage.module.css';
import { Button, ButtonLink } from './Button';

type Tone = 'neutral' | 'danger' | 'success' | 'warning';

interface Action {
  label: string;
  to?: string;
  onClick?: () => void;
}

// Empty / error / info states – one consistent look everywhere
export function StatusMessage({
  tone = 'neutral',
  title,
  message,
  action,
  icon,
  compact,
}: {
  tone?: Tone;
  title: string;
  message?: ReactNode;
  action?: Action;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`${styles.box} ${styles[tone]} ${compact ? styles.compact : ''}`}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <div className={styles.icon} aria-hidden="true">
        {icon ?? defaultIcon(tone)}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {message && <p className={styles.message}>{message}</p>}
      {action &&
        (action.to ? (
          <ButtonLink to={action.to} variant="secondary" size="sm">
            {action.label}
          </ButtonLink>
        ) : (
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

function defaultIcon(tone: Tone) {
  switch (tone) {
    case 'danger':
      return <CircleAlert size={26} />;
    case 'success':
      return <CheckCircle2 size={26} />;
    case 'warning':
      return <AlertTriangle size={26} />;
    default:
      return <Inbox size={26} />;
  }
}

// Inline alert bar (inside forms / above the map)
export function Alert({ tone = 'danger', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
