import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { usePermissions } from '@/contexts/PermissionsContext';
import { featureForPath } from '@/features/routes';

export function FeatureRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { can, isFeatureLocked, isLoading } = usePermissions();
  const route = featureForPath(location.pathname);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-orange-500" />
      </div>
    );
  }

  if (!route || can(route.feature, route.action)) {
    return <>{children}</>;
  }

  return (
    <Navigate
      to="/forbidden"
      replace
      state={{
        feature: route.feature,
        reason: isFeatureLocked(route.feature) ? 'plan' : 'permission',
      }}
    />
  );
}
