import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional role names from the token (enum names, e.g. `TenantOwner`).
   * When set, an authenticated user without one of them is sent to `deniedTo`.
   */
  roles?: readonly string[];
  deniedTo?: string;
}

export function ProtectedRoute({
  children,
  roles,
  deniedTo = '/',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Read while authenticated only, so a stale token cannot lock the user out.
  if (roles && roles.length > 0 && !roles.includes(user?.role ?? '')) {
    return <Navigate to={deniedTo} replace />;
  }

  return <>{children}</>;
}