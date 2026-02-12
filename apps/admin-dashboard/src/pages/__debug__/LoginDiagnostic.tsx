/**
 * Login Diagnostic Page
 *
 * 로그인 전 CORS/API 연결 진단 페이지
 * - 각 엔드포인트별 연결 상태, CORS 헤더, 응답 확인
 * - 로그인 테스트 (자격증명 입력 → 결과 JSON 확인)
 * - 인증 불가 시 원인 특정용
 */

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL as string).replace(/\/+$/, '')
  : 'https://api.neture.co.kr/api/v1';

// Ensure /api/v1 suffix
const getApiUrl = () => {
  if (API_BASE.endsWith('/api/v1')) return API_BASE;
  if (API_BASE.endsWith('/api')) return `${API_BASE}/v1`;
  return `${API_BASE}/api/v1`;
};

const API_URL = getApiUrl();

interface TestResult {
  endpoint: string;
  method: string;
  status: number | string;
  ok: boolean;
  corsHeaders: Record<string, string>;
  body: any;
  error?: string;
  duration: number;
}

export default function LoginDiagnostic() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginResult, setLoginResult] = useState<TestResult | null>(null);

  const testEndpoint = useCallback(async (
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<TestResult> => {
    const url = `${API_URL}${endpoint}`;
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      const corsHeaders: Record<string, string> = {};
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase().startsWith('access-control')) {
          corsHeaders[key] = value;
        }
      }

      let responseBody: any;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = { _parseError: 'Response is not JSON' };
      }

      return {
        endpoint,
        method,
        status: response.status,
        ok: response.ok,
        corsHeaders,
        body: responseBody,
        duration: Date.now() - start,
      };
    } catch (err: any) {
      return {
        endpoint,
        method,
        status: 'NETWORK_ERROR',
        ok: false,
        corsHeaders: {},
        body: null,
        error: err.message || 'Fetch failed (likely CORS or network error)',
        duration: Date.now() - start,
      };
    }
  }, []);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setLoginResult(null);

    const endpoints = [
      { path: '/../health', method: 'GET' },
      { path: '/auth/status', method: 'GET' },
      { path: '/auth/login', method: 'OPTIONS' },
    ];

    const newResults: TestResult[] = [];

    for (const ep of endpoints) {
      if (ep.method === 'OPTIONS') {
        // Preflight test
        const url = `${API_URL}${ep.path}`;
        const start = Date.now();
        try {
          const response = await fetch(url, {
            method: 'OPTIONS',
            headers: {
              'Origin': window.location.origin,
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'Content-Type',
            },
          });
          const corsHeaders: Record<string, string> = {};
          for (const [key, value] of response.headers.entries()) {
            if (key.toLowerCase().startsWith('access-control')) {
              corsHeaders[key] = value;
            }
          }
          newResults.push({
            endpoint: `${ep.path} (preflight)`,
            method: 'OPTIONS',
            status: response.status,
            ok: response.ok,
            corsHeaders,
            body: null,
            duration: Date.now() - start,
          });
        } catch (err: any) {
          newResults.push({
            endpoint: `${ep.path} (preflight)`,
            method: 'OPTIONS',
            status: 'NETWORK_ERROR',
            ok: false,
            corsHeaders: {},
            body: null,
            error: err.message,
            duration: Date.now() - start,
          });
        }
      } else {
        const result = await testEndpoint(ep.path, ep.method);
        newResults.push(result);
      }
      setResults([...newResults]);
    }

    setRunning(false);
  }, [testEndpoint]);

  const testLogin = useCallback(async () => {
    if (!email || !password) return;
    setLoginResult(null);

    const result = await testEndpoint('/auth/login', 'POST', { email, password });
    setLoginResult(result);
  }, [email, password, testEndpoint]);

  const statusColor = (status: number | string) => {
    if (typeof status === 'string') return '#ef4444';
    if (status >= 200 && status < 300) return '#22c55e';
    if (status >= 400 && status < 500) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ fontFamily: 'monospace', padding: '24px', maxWidth: '900px', margin: '0 auto', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '4px', color: '#60a5fa' }}>Login Diagnostic</h1>
      <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
        Origin: {window.location.origin} | API: {API_URL}
      </p>

      {/* Connectivity Tests */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={runAllTests}
          disabled={running}
          style={{ padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.5 : 1, fontSize: '13px' }}
        >
          {running ? 'Testing...' : 'Run Connectivity Tests'}
        </button>
      </div>

      {results.map((r, i) => (
        <div key={i} style={{ marginBottom: '12px', background: '#1e293b', borderRadius: '8px', padding: '12px', border: `1px solid ${r.ok ? '#334155' : '#7f1d1d'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ background: statusColor(r.status), color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
              {r.status}
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{r.method}</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{r.endpoint}</span>
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>{r.duration}ms</span>
          </div>

          {r.error && (
            <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '6px' }}>
              Error: {r.error}
            </div>
          )}

          {Object.keys(r.corsHeaders).length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '2px' }}>CORS Headers:</div>
              {Object.entries(r.corsHeaders).map(([k, v]) => (
                <div key={k} style={{ fontSize: '11px', color: '#86efac', paddingLeft: '8px' }}>
                  {k}: {v}
                </div>
              ))}
            </div>
          )}

          {r.body && (
            <pre style={{ fontSize: '11px', color: '#cbd5e1', background: '#0f172a', padding: '8px', borderRadius: '4px', margin: 0, overflow: 'auto', maxHeight: '150px' }}>
              {JSON.stringify(r.body, null, 2)}
            </pre>
          )}
        </div>
      ))}

      {/* Login Test */}
      <div style={{ marginTop: '32px', borderTop: '1px solid #334155', paddingTop: '24px' }}>
        <h2 style={{ fontSize: '16px', color: '#60a5fa', marginBottom: '12px' }}>Login Test</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', fontSize: '13px', width: '250px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', fontSize: '13px', width: '200px' }}
          />
          <button
            onClick={testLogin}
            disabled={!email || !password}
            style={{ padding: '8px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            Test Login
          </button>
        </div>

        {loginResult && (
          <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px', border: `1px solid ${loginResult.ok ? '#166534' : '#7f1d1d'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: statusColor(loginResult.status), color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                {loginResult.status}
              </span>
              <span style={{ fontSize: '13px' }}>POST /auth/login</span>
              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>{loginResult.duration}ms</span>
            </div>

            {loginResult.error && (
              <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '6px' }}>
                Error: {loginResult.error}
              </div>
            )}

            {Object.keys(loginResult.corsHeaders).length > 0 && (
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '2px' }}>CORS Headers:</div>
                {Object.entries(loginResult.corsHeaders).map(([k, v]) => (
                  <div key={k} style={{ fontSize: '11px', color: '#86efac', paddingLeft: '8px' }}>
                    {k}: {v}
                  </div>
                ))}
              </div>
            )}

            <pre style={{ fontSize: '11px', color: '#cbd5e1', background: '#0f172a', padding: '8px', borderRadius: '4px', margin: 0, overflow: 'auto' }}>
              {JSON.stringify(loginResult.body, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Environment Info */}
      <div style={{ marginTop: '32px', borderTop: '1px solid #334155', paddingTop: '16px', fontSize: '11px', color: '#64748b' }}>
        <div>Timestamp: {new Date().toISOString()}</div>
        <div>User Agent: {navigator.userAgent}</div>
        <div>Cookies Enabled: {navigator.cookieEnabled ? 'Yes' : 'No'}</div>
        <div>Protocol: {window.location.protocol}</div>
      </div>
    </div>
  );
}
