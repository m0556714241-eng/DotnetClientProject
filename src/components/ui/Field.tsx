import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
}

// Text input that works with react-hook-form's register() (forwardRef)
export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, id, className, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className={`${styles.field} ${className ?? ''}`}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`${styles.input} ${error ? styles.invalid : ''}`}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {error ? (
          <span id={`${inputId}-error`} className={styles.error}>
            {error}
          </span>
        ) : (
          hint && (
            <span id={`${inputId}-hint`} className={styles.hint}>
              {hint}
            </span>
          )
        )}
      </div>
    );
  },
);

export const PasswordField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function PasswordField({ label, error, hint, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [visible, setVisible] = useState(false);
    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <div className={styles.passwordWrap}>
          <input
            id={inputId}
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={`${styles.input} ${error ? styles.invalid : ''}`}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            dir="ltr"
            {...rest}
          />
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {error ? (
          <span id={`${inputId}-error`} className={styles.error}>
            {error}
          </span>
        ) : (
          hint && <span className={styles.hint}>{hint}</span>
        )}
      </div>
    );
  },
);

export const TextAreaField = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextAreaField({ label, error, hint, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <textarea
          id={inputId}
          ref={ref}
          className={`${styles.input} ${styles.textarea} ${error ? styles.invalid : ''}`}
          aria-invalid={!!error || undefined}
          {...rest}
        />
        {error ? <span className={styles.error}>{error}</span> : hint && <span className={styles.hint}>{hint}</span>}
      </div>
    );
  },
);
