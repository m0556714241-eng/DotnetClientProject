import { useEffect, useRef, type ReactNode } from 'react';
import styles from './ConfirmDialog.module.css';
import { Button } from './Button';

// Built on the native <dialog>: focus is trapped and Esc closes it – accessible by default
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'ביטול',
  tone = 'primary',
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself) closes it
        if (e.target === ref.current && !loading) onClose();
      }}
    >
      <div className={styles.body}>
        <h2 id="confirm-title" className={styles.title}>
          {title}
        </h2>
        {children && <div className={styles.content}>{children}</div>}
        <div className={styles.actions}>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
