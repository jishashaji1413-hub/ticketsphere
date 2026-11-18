import type { RoleSummary } from './auth';

export interface NavigationSubmodule {
  id: string;
  name: string;
  slug: string;
  icon: string;
  route: string;
  sortOrder: number;
}

export interface NavigationModule {
  id: string;
  name: string;
  slug: string;
  icon: string;
  route: string;
  sortOrder: number;
  submodules: NavigationSubmodule[];
}

export interface SubmoduleAdminItem {
  id: string;
  moduleId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  route: string;
  sortOrder: number;
  isEnabled: boolean;
  isVisible: boolean;
  requiredPermissionCode: string | null;
  roles: RoleSummary[];
}

export interface ModuleAdminItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  route: string;
  sortOrder: number;
  isEnabled: boolean;
  isVisible: boolean;
  requiredPermissionCode: string | null;
  roles: RoleSummary[];
  submodules: SubmoduleAdminItem[];
}
