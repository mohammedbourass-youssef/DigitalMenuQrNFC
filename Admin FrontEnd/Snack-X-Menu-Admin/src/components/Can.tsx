import type { ReactNode } from 'react';

import { usePermissions } from '@/contexts/PermissionsContext';
import type { FeatureAction, FeatureCode } from '@/features/catalog';

interface CanProps {
  feature: FeatureCode;
  action: FeatureAction;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ feature, action, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  return can(feature, action) ? <>{children}</> : <>{fallback}</>;
}
