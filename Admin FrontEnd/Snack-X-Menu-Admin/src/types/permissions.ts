export type FeatureStatus = "Available" | "ComingSoon" | "UnderMaintenance";

export interface PermissionPlan {
  id: number;
  code: string;
  name: string;
  isFree: boolean;
}

export interface FeaturePermission {
  id: string;
  code: string;
  name: string;
  status: FeatureStatus;
  isInPlan: boolean;
  canRead: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface MyPermissionsResponse {
  plan: PermissionPlan | null;
  roles: string[];
  features: FeaturePermission[];
}
