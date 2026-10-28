import type { FeatureAction, FeatureCode } from '@/features/catalog';

export interface FeatureAccess {
  code: FeatureCode;
  actions: FeatureAction[];
}

export interface MeAccessResponse {
  plan: {
    id: number;
    code: string;
    name: string;
  } | null;
  features: FeatureAccess[];
}
