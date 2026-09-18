import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { normalizeUser, normalizeMemberships, extractRoles, type UserLike } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import { useServiceAuth, type PendingPolicyAcceptance, type PolicyAcceptanceResult } from '@o4o/auth-react';
import { authClient } from '../lib/apiClient';
import { SERVICE_KEY } from '../config/service';

export interface LectureUser extends UserLike {
  id?: string;
  email?: string;
  name?: string;
  roles?: string[];
  memberships?: { serviceKey: string; status: string }[];
}
interface AuthContextValue {
  user: LectureUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  pendingPolicyAcceptances: PendingPolicyAcceptance[];
  acceptPendingPolicies: () => Promise<PolicyAcceptanceResult>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(apiUser: Record<string, unknown>): LectureUser {
  return {
    ...apiUser,
    ...normalizeUser(apiUser as never),
    roles: extractRoles(apiUser as never, []),
    memberships: normalizeMemberships(apiUser as never),
  } as LectureUser;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const core = useServiceAuth<LectureUser>(useMemo(() => ({
    serviceKey: SERVICE_KEY, authClient, getAccessToken, toUser,
  }), []));
  return <AuthContext.Provider value={{
    user: core.user,
    isAuthenticated: core.isAuthenticated,
    isLoading: core.isLoading,
    logout: () => { void core.logout(); },
    pendingPolicyAcceptances: core.pendingPolicyAcceptances,
    acceptPendingPolicies: core.acceptPendingPolicies,
  }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
