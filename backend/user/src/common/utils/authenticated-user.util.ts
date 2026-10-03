import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export function parseAuthenticatedUser(
  value: unknown,
): AuthenticatedUser | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record._id !== 'string' || record._id.length === 0) {
    return null;
  }

  return {
    _id: record._id,
    ...(typeof record.email === 'string' ? { email: record.email } : {}),
    ...(typeof record.username === 'string'
      ? { username: record.username }
      : {}),
    ...(typeof record.role === 'string' ? { role: record.role } : {}),
  };
}
