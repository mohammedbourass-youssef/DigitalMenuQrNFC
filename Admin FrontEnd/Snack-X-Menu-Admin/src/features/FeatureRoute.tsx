import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { usePermissions } from '@/contexts/PermissionsContext';
import { featureForPath } from '@/features/routes';

export function FeatureRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { can } = usePermissions();
  const route = featureForPath(location.pathname);

  if (!route || can(route.feature, route.action)) {
    return <>{children}</>;
  }

  return <Navigate to="/" replace />;
}
