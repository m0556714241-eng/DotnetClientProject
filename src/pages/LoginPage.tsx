import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';
import { useAuth, type AuthUser } from '../auth/authContext';
import { DEMO_ACCOUNTS } from '../auth/demoAccounts';
import { SHOW_DEMO_LOGIN } from '../config';
import { toApiError } from '../api/errors';
import type { LoginDto, RegisterDto } from '../types/api';
import { Button } from '../components/ui/Button';
import { PasswordField, TextField } from '../components/ui/Field';
import { Alert } from '../components/ui/StatusMessage';
import { readPendingSelection } from '../features/seating/pendingSelection';
import { Armchair, KeyRound, ShieldCheck, Ticket, Zap, UserRound, LayoutDashboard } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import styles from './LoginPage.module.css';

type Tab = 'login' | 'register';

interface LocationState {
  from?: string;
  reason?: 'expired' | 'booking';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = (location.state ?? {}) as LocationState;
  const from = state.from && state.from !== '/login' ? state.from : '/';

  const tab: Tab = params.get('tab') === 'register' ? 'register' : 'login';
  const setTab = (t: Tab) => setParams(t === 'register' ? { tab: 'register' } : {}, { replace: true, state });

  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<'admin' | 'customer' | null>(null);

  // Where to go after login. An admin who came from a seat map still goes back there (to see it),
  // but the booking button is hidden for admins.
  const done = (u: AuthUser) => {
    const target = u.role === 'Admin' && from === '/' ? '/admin' : from;
    navigate(target, { replace: true });
  };

  if (user) {
    return <Navigate to={from} replace />;
  }

  const pending = readPendingSelection();
  const cameFromBooking = state.reason === 'booking' || (pending && from.startsWith(`/events/${pending.eventId}`));

  const demoLogin = async (who: 'admin' | 'customer') => {
    setDemoError(null);
    setDemoLoading(who);
    try {
      done(await login(DEMO_ACCOUNTS[who]));
    } catch (e) {
      setDemoError(toApiError(e).message);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <aside className={styles.aside}>
        <svg className={styles.asidePattern} viewBox="0 0 600 600" aria-hidden="true">
          {Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 14 + row * 2 }, (_, i) => {
              const count = 14 + row * 2;
              const a = 0.8 - (1.6 * (i + 0.5)) / count;
              const r = 170 + row * 44;
              const x = 300 + r * Math.sin(a);
              const y = -40 + r * Math.cos(a);
              return (
                <rect
                  key={`${row}-${i}`}
                  x={x - 9}
                  y={y - 8}
                  width="18"
                  height="16"
                  rx="4"
                  transform={`rotate(${(-a * 180) / Math.PI} ${x} ${y})`}
                  fill="#F7F3EA"
                />
              );
            }),
          )}
        </svg>
        <div className={styles.asideInner}>
          <Logo />
          <div className={styles.tiles} aria-hidden="true">
            <span>
              <Armchair size={24} />
            </span>
            <span>
              <Ticket size={24} />
            </span>
            <span>
              <ShieldCheck size={24} />
            </span>
            <span>
              <Zap size={24} />
            </span>
          </div>
          <h2 className={styles.asideTitle}>
            המושב שלך,
            <br />
            בדיוק במקום.
          </h2>
          <p className={styles.asideText}>
            מקום אחד לכל האירועים. בוחרים אירוע, רואים את מפת האולם, ומזמינים. אם מישהו הקדים אתכם – המערכת תגיד את זה בבירור.
          </p>
          <ul className={styles.asideList}>
            <li>
              <KeyRound size={18} aria-hidden="true" />
              כניסה מאובטחת עם הרשאות: לקוחה ומנהלת
            </li>
            <li>
              <Armchair size={18} aria-hidden="true" />
              מפת מושבים אמיתית עם אזורי מחיר
            </li>
            <li>
              <ShieldCheck size={18} aria-hidden="true" />
              הגנה מפני הזמנה כפולה של אותו מושב
            </li>
          </ul>
        </div>
      </aside>

      <section className={styles.panel}>
        <div className={styles.card}>
          <h1 className={styles.title}>{tab === 'login' ? 'ברוכים השבים' : 'יצירת חשבון'}</h1>

          {state.reason === 'expired' && (
            <Alert tone="warning">פג תוקף ההתחברות. התחברו שוב כדי להמשיך מאותה נקודה.</Alert>
          )}
          {cameFromBooking && state.reason !== 'expired' && (
            <Alert tone="neutral">המושבים שבחרת נשמרו. אחרי ההתחברות נחזור למפת האולם כדי להשלים את ההזמנה.</Alert>
          )}

          <div className={styles.tabs} role="tablist" aria-label="התחברות או הרשמה">
            <button
              type="button"
              role="tab"
              id="tab-login"
              aria-selected={tab === 'login'}
              aria-controls="panel-login"
              className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
              onClick={() => setTab('login')}
            >
              התחברות
            </button>
            <button
              type="button"
              role="tab"
              id="tab-register"
              aria-selected={tab === 'register'}
              aria-controls="panel-register"
              className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`}
              onClick={() => setTab('register')}
            >
              הרשמה
            </button>
          </div>

          {tab === 'login' ? (
            <div role="tabpanel" id="panel-login" aria-labelledby="tab-login">
              <LoginForm onDone={done} />
              <p className={styles.switch}>
                עדיין אין לך חשבון?{' '}
                <button type="button" onClick={() => setTab('register')}>
                  להרשמה
                </button>
              </p>
            </div>
          ) : (
            <div role="tabpanel" id="panel-register" aria-labelledby="tab-register">
              <RegisterForm onDone={done} />
              <p className={styles.switch}>
                כבר רשומים?{' '}
                <button type="button" onClick={() => setTab('login')}>
                  להתחברות
                </button>
              </p>
            </div>
          )}

          {SHOW_DEMO_LOGIN && (
            <div className={styles.demo}>
              <p className={styles.demoTitle}>כניסה מהירה למשתמשי הדגמה</p>
              <div className={styles.demoButtons}>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={demoLoading === 'customer'}
                  disabled={demoLoading !== null}
                  onClick={() => demoLogin('customer')}
                  icon={<UserRound size={16} aria-hidden="true" />}
                >
                  כניסה כלקוחה (דמו)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={demoLoading === 'admin'}
                  disabled={demoLoading !== null}
                  onClick={() => demoLogin('admin')}
                  icon={<LayoutDashboard size={16} aria-hidden="true" />}
                >
                  כניסה כמנהלת (דמו)
                </Button>
              </div>
              {demoError && <Alert>{demoError}</Alert>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Server field errors (ModelState) -> the matching form fields; anything else -> one message above the form
function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: Array<Path<T>>,
): string {
  const apiError = toApiError(error);
  let matched = false;
  for (const [key, message] of Object.entries(apiError.fieldErrors)) {
    if ((fields as string[]).includes(key)) {
      setError(key as Path<T>, { type: 'server', message });
      matched = true;
    }
  }
  return matched && apiError.status === 400 ? 'יש לתקן את השדות המסומנים' : apiError.message;
}

function LoginForm({ onDone }: { onDone: (u: AuthUser) => void }) {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({ defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      onDone(await login({ email: values.email.trim(), password: values.password }));
    } catch (e) {
      setFormError(applyServerErrors(e, setError, ['email', 'password']));
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert>{formError}</Alert>}
      <TextField
        label="אימייל"
        type="email"
        autoComplete="email"
        dir="ltr"
        error={errors.email?.message}
        {...register('email', {
          required: 'יש להזין אימייל',
          pattern: { value: EMAIL_PATTERN, message: 'כתובת אימייל לא תקינה' },
        })}
      />
      <PasswordField
        label="סיסמה"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password', { required: 'יש להזין סיסמה' })}
      />
      <Button type="submit" size="lg" block loading={isSubmitting}>
        התחברות
      </Button>
    </form>
  );
}

function RegisterForm({ onDone }: { onDone: (u: AuthUser) => void }) {
  const { register: registerUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterDto & { confirmPassword: string }>({
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      onDone(
        await registerUser({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          password: values.password,
        }),
      );
    } catch (e) {
      setFormError(applyServerErrors(e, setError, ['fullName', 'email', 'password']));
    }
  });

  // Rules match RegisterDto: Email max 200, Password 6..100, FullName max 100
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert>{formError}</Alert>}
      <TextField
        label="שם מלא"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName', {
          required: 'יש להזין שם מלא',
          validate: (v) => v.trim().length > 0 || 'יש להזין שם מלא',
          maxLength: { value: 100, message: 'עד 100 תווים' },
        })}
      />
      <TextField
        label="אימייל"
        type="email"
        autoComplete="email"
        dir="ltr"
        error={errors.email?.message}
        {...register('email', {
          required: 'יש להזין אימייל',
          maxLength: { value: 200, message: 'עד 200 תווים' },
          pattern: { value: EMAIL_PATTERN, message: 'כתובת אימייל לא תקינה' },
        })}
      />
      <PasswordField
        label="סיסמה"
        autoComplete="new-password"
        hint="לפחות 6 תווים"
        error={errors.password?.message}
        {...register('password', {
          required: 'יש לבחור סיסמה',
          minLength: { value: 6, message: 'לפחות 6 תווים' },
          maxLength: { value: 100, message: 'עד 100 תווים' },
        })}
      />
      <PasswordField
        label="אימות סיסמה"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword', {
          required: 'יש להקליד שוב את הסיסמה',
          validate: (v, all) => v === all.password || 'הסיסמאות אינן תואמות',
        })}
      />
      <Button type="submit" size="lg" block loading={isSubmitting}>
        יצירת חשבון
      </Button>
    </form>
  );
}
