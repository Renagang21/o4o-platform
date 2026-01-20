/**
 * Auth State JSON Debug Page
 *
 * Work Order: WO-DEBUG-ADMIN-AUTH-STATE-JSON-001
 *
 * JSON only page for debugging production login state reset issue.
 * Shows current auth state without UI - pure JSON output.
 *
 * Contents:
 * - access/refresh token existence
 * - /auth/me call result (status + role)
 * - current role vs admin guard required role
 * - guard pass/fail status
 */

import React, { useEffect, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://api.neture.co.kr').replace(/\/api\/?$/, '');

interface AuthStateJson {
  timestamp: string;
  environment: {
    origin: string;
    apiBaseUrl: string;
    pathname: string;
  };
  tokens: {
    accessToken: {
      exists: boolean;
      source: 'cookie' | 'localStorage' | 'none';
      cookieName?: string;
      localStorageKey?: string;
    };
    refreshToken: {
      exists: boolean;
      source: 'cookie' | 'localStorage' | 'none';
      cookieName?: string;
      localStorageKey?: string;
    };
  };
  storage: {
    cookies: string[];
    localStorage: string[];
    sessionStorage: string[];
  };
  authMe: {
    called: boolean;
    status: number | null;
    success: boolean;
    error?: string;
    user?: {
      id: number | string;
      email: string;
      role: string;
      name?: string;
    };
    rawResponse?: any;
  };
  guardCheck: {
    requiredRoles: string[];
    userRole: string | null;
    hasRequiredRole: boolean;
    guardWouldPass: boolean;
  };
  diagnosis: {
    tokenPresent: boolean;
    authMeSuccess: boolean;
    roleMatches: boolean;
    overallStatus: 'PASS' | 'FAIL';
    failureReason?: string;
  };
}

const AuthStateJsonDebug: React.FC = () => {
  const [authState, setAuthState] = useState<AuthStateJson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getCookies = (): string[] => {
    if (!document.cookie) return [];
    return document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
  };

  const getStorageKeys = (storage: Storage): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  };

  const findToken = (tokenName: string): { exists: boolean; source: 'cookie' | 'localStorage' | 'none'; key?: string } => {
    const patterns = [tokenName, `${tokenName}Token`, `${tokenName}_token`];

    // Check cookies
    const cookies = getCookies();
    for (const pattern of patterns) {
      const found = cookies.find(c => c.toLowerCase().includes(pattern.toLowerCase()));
      if (found) {
        return { exists: true, source: 'cookie', key: found };
      }
    }

    // Check localStorage
    const lsKeys = getStorageKeys(localStorage);
    for (const pattern of patterns) {
      const found = lsKeys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
      if (found && localStorage.getItem(found)) {
        return { exists: true, source: 'localStorage', key: found };
      }
    }

    return { exists: false, source: 'none' };
  };

  const runDiagnostics = async () => {
    setLoading(true);

    const accessTokenInfo = findToken('access');
    const refreshTokenInfo = findToken('refresh');

    const state: AuthStateJson = {
      timestamp: new Date().toISOString(),
      environment: {
        origin: window.location.origin,
        apiBaseUrl: API_BASE_URL,
        pathname: window.location.pathname,
      },
      tokens: {
        accessToken: {
          exists: accessTokenInfo.exists,
          source: accessTokenInfo.source,
          ...(accessTokenInfo.source === 'cookie' ? { cookieName: accessTokenInfo.key } : {}),
          ...(accessTokenInfo.source === 'localStorage' ? { localStorageKey: accessTokenInfo.key } : {}),
        },
        refreshToken: {
          exists: refreshTokenInfo.exists,
          source: refreshTokenInfo.source,
          ...(refreshTokenInfo.source === 'cookie' ? { cookieName: refreshTokenInfo.key } : {}),
          ...(refreshTokenInfo.source === 'localStorage' ? { localStorageKey: refreshTokenInfo.key } : {}),
        },
      },
      storage: {
        cookies: getCookies(),
        localStorage: getStorageKeys(localStorage).filter(k =>
          ['token', 'auth', 'user', 'session'].some(p => k.toLowerCase().includes(p))
        ),
        sessionStorage: getStorageKeys(sessionStorage).filter(k =>
          ['token', 'auth', 'user', 'session'].some(p => k.toLowerCase().includes(p))
        ),
      },
      authMe: {
        called: false,
        status: null,
        success: false,
      },
      guardCheck: {
        requiredRoles: ['admin', 'operator', 'super_admin'],
        userRole: null,
        hasRequiredRole: false,
        guardWouldPass: false,
      },
      diagnosis: {
        tokenPresent: false,
        authMeSuccess: false,
        roleMatches: false,
        overallStatus: 'FAIL',
      },
    };

    // Call /auth/me
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      state.authMe.called = true;
      state.authMe.status = response.status;
      state.authMe.success = response.ok;

      const data = await response.json().catch(() => null);
      state.authMe.rawResponse = data;

      if (response.ok && data?.data) {
        const user = data.data;
        state.authMe.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        };
        state.guardCheck.userRole = user.role;
        state.guardCheck.hasRequiredRole = state.guardCheck.requiredRoles.includes(user.role);
        state.guardCheck.guardWouldPass = state.guardCheck.hasRequiredRole;
      }
    } catch (err: any) {
      state.authMe.error = err.message;
    }

    // Diagnosis
    state.diagnosis.tokenPresent = accessTokenInfo.exists || refreshTokenInfo.exists;
    state.diagnosis.authMeSuccess = state.authMe.success;
    state.diagnosis.roleMatches = state.guardCheck.hasRequiredRole;

    if (!state.diagnosis.tokenPresent) {
      state.diagnosis.overallStatus = 'FAIL';
      state.diagnosis.failureReason = 'No token found in cookies or localStorage';
    } else if (!state.diagnosis.authMeSuccess) {
      state.diagnosis.overallStatus = 'FAIL';
      state.diagnosis.failureReason = `/auth/me returned status ${state.authMe.status}`;
    } else if (!state.diagnosis.roleMatches) {
      state.diagnosis.overallStatus = 'FAIL';
      state.diagnosis.failureReason = `User role "${state.guardCheck.userRole}" not in required roles [${state.guardCheck.requiredRoles.join(', ')}]`;
    } else {
      state.diagnosis.overallStatus = 'PASS';
    }

    setAuthState(state);
    setLoading(false);
  };

  if (loading) {
    return (
      <pre style={{
        fontFamily: 'monospace',
        fontSize: '13px',
        padding: '20px',
        background: '#1e1e1e',
        color: '#d4d4d4',
        margin: 0,
        minHeight: '100vh',
      }}>
        {JSON.stringify({ status: 'loading', timestamp: new Date().toISOString() }, null, 2)}
      </pre>
    );
  }

  return (
    <pre style={{
      fontFamily: 'monospace',
      fontSize: '13px',
      padding: '20px',
      background: '#1e1e1e',
      color: '#d4d4d4',
      margin: 0,
      minHeight: '100vh',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      {JSON.stringify(authState, null, 2)}
    </pre>
  );
};

export default AuthStateJsonDebug;
