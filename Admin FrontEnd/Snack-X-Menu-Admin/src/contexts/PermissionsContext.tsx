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

  const can = useCallback(
    (feature: FeatureCode, action: FeatureAction) => {
      const permission = featurePermissions.get(feature);
      return Boolean(permission?.inPlan && permission[ACTION_PERMISSION_KEYS[action]]);
    },
    [featurePermissions]
  );

  const isFeatureInPlan = useCallback(
    (feature: FeatureCode) => featurePermissions.get(feature)?.inPlan === true,
    [featurePermissions]
  );

  const isFeatureLocked = useCallback(
    (feature: FeatureCode) => featurePermissions.get(feature)?.inPlan !== true,
    [featurePermissions]
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
