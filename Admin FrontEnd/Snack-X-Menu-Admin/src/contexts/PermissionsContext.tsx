import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import type { FeatureAction, FeatureCode } from '@/features/catalog';
import type { MeAccessResponse } from '@/types/access';

interface PermissionsContextValue {
  access: MeAccessResponse | null;
  can: (feature: FeatureCode, action: FeatureAction) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

interface PermissionsProviderProps {
  children: ReactNode;
  access?: MeAccessResponse | null;
}

export function PermissionsProvider({ children, access = null }: PermissionsProviderProps) {
  // TODO: Feed `access` from GET /api/permissions/me once tenant role data exists.
  const value = useMemo<PermissionsContextValue>(
    () => ({
      access,
      can: (feature, action) => {
        if (!access) return true;

        const featureAccess = access.features.find((item) => item.code === feature);
        return featureAccess?.actions.includes(action) ?? false;
      },
    }),
    [access]
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
