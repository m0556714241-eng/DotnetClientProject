import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Logo } from './Logo';
import styles from './Layout.module.css';

export function Layout() {
  const { pathname } = useLocation();

  // New page -> start at the top
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        דילוג לתוכן הראשי
      </a>
      <Header />
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <Logo />
          <p className={styles.footerText}>בוחרים מושב מדויק במפת האולם, ומזמינים בביטחון.</p>
          <p className={styles.copy}>© {new Date().getFullYear()} SeatWise</p>
        </div>
      </footer>
    </div>
  );
}
