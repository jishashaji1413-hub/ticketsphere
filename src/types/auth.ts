export interface RoleSummary {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  isActive: boolean;
  hasMicrosoftConnected: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleSummary[];
  permissions: string[];
}

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: PermissionItem[];
}
