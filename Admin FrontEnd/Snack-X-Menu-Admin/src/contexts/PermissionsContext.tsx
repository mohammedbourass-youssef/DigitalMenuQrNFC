import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { isFeatureCode, type FeatureAction, type FeatureCode } from '@/features/catalog';
import type { UserPermission } from '@/types';

const ACTION_PERMISSION_KEYS = {
  read: 'canRead',
  create: 'canWrite',
  edit: 'canEdit',
  delete: 'canDelete',
} as const satisfies Record<FeatureAction, keyof UserPermission>;

// These features are not gated by the plan's feature list. Their usage is
// limited by the plan quota (Max* / Used*FromTotal) instead of a Pro flag.
const QUOTA_CONTROLLED_FEATURES: ReadonlySet<FeatureCode> = new Set(['Roles']);

interface PermissionsContextValue {
  isLoading: boolean;
  can: (feature: FeatureCode, action: FeatureAction) => boolean;
  isFeatureInPlan: (feature: FeatureCode) => boolean;
  isFeatureLocked: (feature: FeatureCode) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  const featurePermissions = useMemo(() => {
    const permissions = new Map<FeatureCode, UserPermission>();

    for (const permission of user?.features ?? []) {
      if (isFeatureCode(permission.featureCode)) {
        permissions.set(permission.featureCode, permission);
      }
    }

    return permissions;
  }, [user]);

  const isFeatureInPlan = useCallback(
    (feature: FeatureCode) =>
      QUOTA_CONTROLLED_FEATURES.has(feature) ||
      featurePermissions.get(feature)?.inPlan === true,
    [featurePermissions]
  );

  const can = useCallback(
    (feature: FeatureCode, action: FeatureAction) => {
      const permission = featurePermissions.get(feature);
      const inPlan = QUOTA_CONTROLLED_FEATURES.has(feature) || permission?.inPlan === true;
      return Boolean(inPlan && permission?.[ACTION_PERMISSION_KEYS[action]]);
    },
    [featurePermissions]
  );

  const isFeatureLocked = useCallback(
    (feature: FeatureCode) => !isFeatureInPlan(feature),
    [isFeatureInPlan]
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      isLoading,
      can,
      isFeatureInPlan,
      isFeatureLocked,
    }),
    [can, isFeatureInPlan, isFeatureLocked, isLoading]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }

  return context;
}
