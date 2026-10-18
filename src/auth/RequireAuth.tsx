import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../types/api';
import { useAuth } from './authContext';
import { StatusMessage } from '../components/ui/StatusMessage';

// Protects a route in the UI. The real security boundary is still the server ([Authorize]).
export function RequireAuth({ children, role }: { children: ReactNode; role?: UserRole }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (role && user.role !== role) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--sp-8)' }}>
        <StatusMessage
          tone="danger"
          title="אין הרשאה"
          message="אין לך הרשאה לצפות בעמוד הזה."
          action={{ label: 'חזרה לדף הבית', to: '/' }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
