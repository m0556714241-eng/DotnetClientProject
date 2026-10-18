import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { CalendarDays, LayoutDashboard, LogIn, LogOut, ReceiptText, Ticket } from 'lucide-react';
import { Logo } from './Logo';
import styles from './Header.module.css';

export function Header() {
  const { user, isAdmin, isCustomer, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile menu on every navigation
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) => `${styles.link} ${isActive ? styles.active : ''}`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="SeatWise – דף הבית">
          <Logo />
        </Link>

        <button
          type="button"
          className={styles.burger}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav id="main-nav" className={`${styles.nav} ${menuOpen ? styles.open : ''}`} aria-label="ניווט ראשי">
          <NavLink to="/" end className={linkClass}>
            <CalendarDays size={17} aria-hidden="true" />
            אירועים
          </NavLink>
          {isCustomer && (
            <NavLink to="/bookings" className={linkClass}>
              <Ticket size={17} aria-hidden="true" />
              ההזמנות שלי
            </NavLink>
          )}
          {isAdmin && (
            <>
              <NavLink to="/admin" end className={linkClass}>
                <LayoutDashboard size={17} aria-hidden="true" />
                ניהול אירועים
              </NavLink>
              <NavLink to="/admin/bookings" className={linkClass}>
                <ReceiptText size={17} aria-hidden="true" />
                כל ההזמנות
              </NavLink>
            </>
          )}

          <div className={styles.account}>
            {user ? (
              <>
                <span className={styles.user} title={user.email}>
                  <span className={styles.avatar} aria-hidden="true">
                    {user.fullName.trim().charAt(0) || '•'}
                  </span>
                  <span className={styles.userText}>
                    <span className={styles.userName}>{user.fullName}</span>
                    {isAdmin && <span className={styles.role}>מנהלת מערכת</span>}
                  </span>
                </span>
                <button type="button" className={styles.logout} onClick={handleLogout}>
                  <LogOut size={16} aria-hidden="true" />
                  התנתקות
                </button>
              </>
            ) : (
              <Link to="/login" state={{ from: location.pathname + location.search }} className={styles.login}>
                <LogIn size={16} aria-hidden="true" />
                התחברות / הרשמה
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
