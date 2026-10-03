export const KNOWN_APP_ROLES = ["admin", "user"] as const;

export type KnownAppRole = (typeof KNOWN_APP_ROLES)[number];
export type AppRole = KnownAppRole | (string & {});
export type UserRole = AppRole;

export const normalizeAppRole = (role: unknown): AppRole => {
  const normalized = typeof role === "string" ? role.trim().toLowerCase() : "";
  return (normalized || "user") as AppRole;
};

export interface User {
  _id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
}
