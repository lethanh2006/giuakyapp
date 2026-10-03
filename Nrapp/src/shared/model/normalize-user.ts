import {
  normalizeAppRole,
  type User,
} from "@/src/services/user/constant";

export const normalizeUser = (raw: unknown): User => {
  const value = (raw ?? {}) as Record<string, unknown>;

  return {
    _id: String(value._id ?? ""),
    name: String(value.name ?? value.username ?? value.email ?? "Unknown"),
    username: value.username ? String(value.username) : undefined,
    email: String(value.email ?? ""),
    role: normalizeAppRole(value.role),
  };
};
