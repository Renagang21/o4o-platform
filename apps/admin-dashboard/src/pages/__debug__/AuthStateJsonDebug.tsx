/**
 * Auth State JSON Debug Page
 *
 * Work Order: WO-DEBUG-ADMIN-AUTH-STATE-JSON-001
 *
 * JSON debug page with built-in login form.
 * Login -> Capture state immediately -> Show JSON result.
 * No redirect, pure capture.
 */

import React, { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://api.neture.co.kr').replace(/\/api\/?$/, '');

interface AuthStateJson {
  timestamp: string;
  phase: string;
  environment: {
    origin: string;
    apiBaseUrl: string;
  };
  step1_login: {
    called: boolean;
    status: number | null;
    success: boolean;
    error?: string;
    responseBody?: any;
    headersReceived: string[];
  };
  step2_postLoginStorage: {
    cookies: string[];
    localStorage: string[];
    sessionStorage: string[];
    accessTokenFound: { exists: boolean; source: string; key?: string };
    refreshTokenFound: { exists: boolean; source: string; key?: string };
  };
  step3_authMe: {
    called: boolean;
    status: number | null;
    success: boolean;
    error?: string;
    user?: {
      id: number | string;
      email: string;
      role: string;
    };
    rawResponse?: any;
  };
  step4_guardCheck: {
    requiredRoles: string[];
    userRole: string | null;
    hasRequiredRole: boolean;
    guardWouldPass: boolean;
  };
  diagnosis: {
    loginSuccess: boolean;
    tokenStored: boolean;
    authMeSuccess: boolean;
    roleMatches: boolean;
    overallStatus: 'PASS' | 'FAIL';
    failureStep?: string;
    failureReason?: string;
  };
}

const AuthStateJsonDebug: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuthStateJson | null>(null);

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

  const findToken = (tokenName: string): { exists: boolean; source: string; key?: string } => {
    const patterns = [tokenName, `${tokenName}Token`, `${tokenName}_token`, `o4o_${tokenName}`];

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

    // Check sessionStorage
    const ssKeys = getStorageKeys(sessionStorage);
    for (const pattern of patterns) {
      const found = ssKeys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
      if (found && sessionStorage.getItem(found)) {
        return { exists: true, source: 'sessionStorage', key: found };
      }
    }

    return { exists: false, source: 'none' };
  };

  const runFullDiagnostics = async () => {
    setRunning(true);
    setResult(null);

    const state: AuthStateJson = {
      timestamp: new Date().toISOString(),
      phase: 'starting',
      environment: {
        origin: window.location.origin,
        apiBaseUrl: API_BASE_URL,
      },
      step1_login: {
        called: false,
        status: null,
        success: false,
        headersReceived: [],
      },
      step2_postLoginStorage: {
        cookies: [],
        localStorage: [],
        sessionStorage: [],
        accessTokenFound: { exists: false, source: 'none' },
        refreshTokenFound: { exists: false, source: 'none' },
      },
      step3_authMe: {
        called: false,
        status: null,
        success: false,
      },
      step4_guardCheck: {
        requiredRoles: ['admin', 'operator', 'super_admin'],
        userRole: null,
        hasRequiredRole: false,
        guardWouldPass: false,
      },
      diagnosis: {
        loginSuccess: false,
        tokenStored: false,
        authMeSuccess: false,
        roleMatches: false,
        overallStatus: 'FAIL',
      },
    };

    // STEP 1: Login
    state.phase = 'step1_login';
    try {
      const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      state.step1_login.called = true;
      state.step1_login.status = loginResponse.status;
      state.step1_login.success = loginResponse.ok;

      // Collect visible headers
      const headers: string[] = [];
      loginResponse.headers.forEach((value, key) => {
        headers.push(`${key}: ${value}`);
      });
      state.step1_login.headersReceived = headers;

      const loginData = await loginResponse.json().catch(() => null);
      state.step1_login.responseBody = loginData;

      if (!loginResponse.ok) {
        state.diagnosis.failureStep = 'step1_login';
        state.diagnosis.failureReason = `Login failed with status ${loginResponse.status}: ${loginData?.error || loginData?.message || 'Unknown error'}`;
        setResult(state);
        setRunning(false);
        return;
      }

      state.diagnosis.loginSuccess = true;
    } catch (err: any) {
      state.step1_login.error = err.message;
      state.diagnosis.failureStep = 'step1_login';
      state.diagnosis.failureReason = `Login request error: ${err.message}`;
      setResult(state);
      setRunning(false);
      return;
    }

    // STEP 2: Check storage immediately after login
    state.phase = 'step2_postLoginStorage';
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for storage

    state.step2_postLoginStorage.cookies = getCookies();
    state.step2_postLoginStorage.localStorage = getStorageKeys(localStorage).filter(k =>
      ['token', 'auth', 'user', 'session', 'o4o'].some(p => k.toLowerCase().includes(p))
    );
    state.step2_postLoginStorage.sessionStorage = getStorageKeys(sessionStorage).filter(k =>
      ['token', 'auth', 'user', 'session', 'o4o'].some(p => k.toLowerCase().includes(p))
    );
    state.step2_postLoginStorage.accessTokenFound = findToken('access');
    state.step2_postLoginStorage.refreshTokenFound = findToken('refresh');

    state.diagnosis.tokenStored =
      state.step2_postLoginStorage.accessTokenFound.exists ||
      state.step2_postLoginStorage.refreshTokenFound.exists;

    if (!state.diagnosis.tokenStored) {
      state.diagnosis.failureStep = 'step2_postLoginStorage';
      state.diagnosis.failureReason = 'No token found in cookies, localStorage, or sessionStorage after login';
    }

    // STEP 3: Call /auth/me
    state.phase = 'step3_authMe';
    try {
      const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      state.step3_authMe.called = true;
      state.step3_authMe.status = meResponse.status;
      state.step3_authMe.success = meResponse.ok;

      const meData = await meResponse.json().catch(() => null);
      state.step3_authMe.rawResponse = meData;

      if (meResponse.ok && meData?.data) {
        const user = meData.data;
        state.step3_authMe.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
        state.step4_guardCheck.userRole = user.role;
        state.diagnosis.authMeSuccess = true;
      } else {
        if (!state.diagnosis.failureStep) {
          state.diagnosis.failureStep = 'step3_authMe';
          state.diagnosis.failureReason = `/auth/me failed with status ${meResponse.status}`;
        }
      }
    } catch (err: any) {
      state.step3_authMe.error = err.message;
      if (!state.diagnosis.failureStep) {
        state.diagnosis.failureStep = 'step3_authMe';
        state.diagnosis.failureReason = `/auth/me request error: ${err.message}`;
      }
    }

    // STEP 4: Guard check
    state.phase = 'step4_guardCheck';
    if (state.step4_guardCheck.userRole) {
      state.step4_guardCheck.hasRequiredRole = state.step4_guardCheck.requiredRoles.includes(state.step4_guardCheck.userRole);
      state.step4_guardCheck.guardWouldPass = state.step4_guardCheck.hasRequiredRole;
      state.diagnosis.roleMatches = state.step4_guardCheck.hasRequiredRole;

      if (!state.diagnosis.roleMatches && !state.diagnosis.failureStep) {
        state.diagnosis.failureStep = 'step4_guardCheck';
        state.diagnosis.failureReason = `User role "${state.step4_guardCheck.userRole}" not in [${state.step4_guardCheck.requiredRoles.join(', ')}]`;
      }
    }

    // Final diagnosis
    state.phase = 'complete';
    if (state.diagnosis.loginSuccess && state.diagnosis.tokenStored && state.diagnosis.authMeSuccess && state.diagnosis.roleMatches) {
      state.diagnosis.overallStatus = 'PASS';
    }

    setResult(state);
    setRunning(false);
  };

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '13px', background: '#1e1e1e', color: '#d4d4d4', minHeight: '100vh', padding: '20px' }}>
      <h2 style={{ color: '#569cd6', margin: '0 0 10px 0' }}>Auth Debug - Login & Capture</h2>
      <p style={{ color: '#6a9955', margin: '0 0 20px 0' }}>WO-DEBUG-ADMIN-AUTH-STATE-JSON-001</p>

      {!result && (
        <div style={{ background: '#252526', padding: '20px', borderRadius: '4px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{ padding: '8px 12px', marginRight: '10px', width: '200px', background: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{ padding: '8px 12px', marginRight: '10px', width: '150px', background: '#3c3c3c', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
            />
            <button
              onClick={runFullDiagnostics}
              disabled={running || !email || !password}
              style={{
                padding: '8px 16px',
                background: running ? '#555' : '#0e639c',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: running ? 'not-allowed' : 'pointer',
              }}
            >
              {running ? 'Running...' : 'Login & Capture'}
            </button>
          </div>
          <p style={{ color: '#808080', fontSize: '11px', margin: 0 }}>
            This will: 1) Login 2) Check storage 3) Call /auth/me 4) Check guard - all without redirect
          </p>
        </div>
      )}

      {result && (
        <>
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={() => setResult(null)}
              style={{ padding: '6px 12px', background: '#3c3c3c', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
            >
              Reset
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                alert('Copied!');
              }}
              style={{ padding: '6px 12px', background: '#0e639c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Copy JSON
            </button>
            <span style={{ marginLeft: '20px', color: result.diagnosis.overallStatus === 'PASS' ? '#4ec9b0' : '#f14c4c' }}>
              {result.diagnosis.overallStatus === 'PASS' ? '✓ PASS' : '✗ FAIL'}: {result.diagnosis.failureReason || 'All checks passed'}
            </span>
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
};

export default AuthStateJsonDebug;
