/** Service fetch APIs share the AuthClient refresh coordinator. */
import { refreshStoredSession } from '@o4o/auth-client';
const AUTH_API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` : '/api/v1';
export function tryRefreshToken(): Promise<string | null> {
  return refreshStoredSession(AUTH_API_BASE);
}
