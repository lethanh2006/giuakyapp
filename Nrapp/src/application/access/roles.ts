import {
  KNOWN_APP_ROLES,
  normalizeAppRole,
  type AppRole,
  type KnownAppRole,
} from "@/src/services/user/constant";

export const USER_ROLE = "user" as const;

export const ADMIN_ROLES = ["admin"] as const;
export const USER_AREA_ROLES = ["user"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type UserRole = (typeof USER_AREA_ROLES)[number];
export type AppArea = "admin" | "user";

export const ROLE_LABELS: Record<KnownAppRole, string> = {
  admin: "Quản trị viên",
  user: "Nhân viên",
};

export const ROLE_OPTIONS = KNOWN_APP_ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

const includesRole = <TRole extends string>(
  roles: readonly TRole[],
  role?: AppRole | null,
) => roles.includes(normalizeAppRole(role) as TRole);

export const getRoleLabel = (role?: AppRole | null) =>
  ROLE_LABELS[normalizeAppRole(role) as KnownAppRole] || "Người dùng";

export const isAdminRole = (role?: AppRole | null): boolean =>
  includesRole(ADMIN_ROLES, role);

export const canManageAccounts = (role?: AppRole | null): boolean =>
  normalizeAppRole(role) === "admin";

export const canManageTasks = (role?: AppRole | null): boolean =>
  normalizeAppRole(role) === "admin";

export const canManageWorkSchedule = (role?: AppRole | null): boolean =>
  normalizeAppRole(role) === "admin";

export const getAreaForRole = (role?: AppRole | null): AppArea =>
  isAdminRole(role) ? "admin" : "user";

export const canAccessArea = (
  role: AppRole | null | undefined,
  area: AppArea,
) => getAreaForRole(role) === area;
