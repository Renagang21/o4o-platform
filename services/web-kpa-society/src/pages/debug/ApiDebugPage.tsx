/**
 * /__debug__/api — API 진단 페이지
 *
 * CLAUDE.md Section 14 표준 진단 인프라
 * - 런타임 환경 변수 확인
 * - 각 홈 API 엔드포인트 호출 + 상태/응답 표시
 * - 인증 상태 확인
 */

import { useState } from 'react';
import { getAccessToken } from '../../contexts/AuthContext';

const VITE_API_BASE_URL_RAW = import.meta.env.VITE_API_BASE_URL || '(not set)';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
  : '/api/v1/kpa';

interface EndpointResult {
  url: string;
  status: number | null;
  statusText: string;
  ok: boolean;
  body: unknown;
  error: string | null;
  durationMs: number;
}

const ENDPOINTS = [
  { name: 'Auth Status', path: '/api/v1/auth/status', absolute: true },
  { name: 'Home Notices', path: '/home/notices?limit=3', absolute: false },
  { name: 'Home Community', path: '/home/community?postLimit=3&featuredLimit=2', absolute: false },
  { name: 'Home Signage', path: '/home/signage?mediaLimit=3&playlistLimit=2', absolute: false },
  { name: 'Forum Posts', path: '/forum/posts?limit=3', absolute: false },
  { name: 'Health Check', path: '/health', absolute: true },
];

async function testEndpoint(path: string, absolute: boolean, token: string | null): Promise<EndpointResult> {
  let url: string;
  if (absolute) {
    // For absolute paths, use the base URL without /api/v1/kpa suffix
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    url = `${base}${path}`;
  } else {
    url = `${API_BASE_URL}${path}`;
  }

  const start = performance.now();
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const durationMs = Math.round(performance.now() - start);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = '(non-JSON response)';
    }

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      body,
      error: null,
      durationMs,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return {
      url,
      status: null,
      statusText: 'Network Error',
      ok: false,
      body: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    };
  }
}

export function ApiDebugPage() {
  const [results, setResults] = useState<Record<string, EndpointResult>>({});
  const [testing, setTesting] = useState(false);
  const [testTime, setTestTime] = useState<string | null>(null);

  const token = getAccessToken();

  const runAllTests = async () => {
    setTesting(true);
    setResults({});
    setTestTime(new Date().toISOString());

    for (const ep of ENDPOINTS) {
      const result = await testEndpoint(ep.path, ep.absolute, token);
      setResults(prev => ({ ...prev, [ep.name]: result }));
    }
    setTesting(false);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>API Diagnostic</h1>
      <p style={styles.subtitle}>CLAUDE.md Section 14 — API Endpoint Diagnostics</p>

      {/* Environment Info */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Environment</h2>
        <table style={styles.table}>
          <tbody>
            <tr>
              <td style={styles.label}>VITE_API_BASE_URL</td>
              <td style={styles.value}><code>{VITE_API_BASE_URL_RAW}</code></td>
            </tr>
            <tr>
              <td style={styles.label}>Computed API_BASE_URL</td>
              <td style={styles.value}><code>{API_BASE_URL}</code></td>
            </tr>
            <tr>
              <td style={styles.label}>window.location.origin</td>
              <td style={styles.value}><code>{typeof window !== 'undefined' ? window.location.origin : 'N/A'}</code></td>
            </tr>
            <tr>
              <td style={styles.label}>Auth Token</td>
              <td style={styles.value}>
                <code>{token ? `${token.substring(0, 20)}...` : '(none)'}</code>
              </td>
            </tr>
            <tr>
              <td style={styles.label}>User Agent</td>
              <td style={styles.value}><code style={{ fontSize: '11px', wordBreak: 'break-all' }}>{navigator.userAgent}</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Test Button */}
      <div style={{ margin: '20px 0' }}>
        <button onClick={runAllTests} disabled={testing} style={styles.button}>
          {testing ? 'Testing...' : 'Run All Tests'}
        </button>
        {testTime && <span style={styles.timestamp}>Last run: {testTime}</span>}
      </div>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Results</h2>
          {ENDPOINTS.map(ep => {
            const r = results[ep.name];
            if (!r) return <div key={ep.name} style={styles.resultCard}><strong>{ep.name}</strong>: waiting...</div>;
            return (
              <div key={ep.name} style={{ ...styles.resultCard, borderLeft: `4px solid ${r.ok ? '#22c55e' : '#ef4444'}` }}>
                <div style={styles.resultHeader}>
                  <strong>{ep.name}</strong>
                  <span style={{ ...styles.statusBadge, backgroundColor: r.ok ? '#dcfce7' : '#fee2e2', color: r.ok ? '#166534' : '#991b1b' }}>
                    {r.status ?? 'ERR'} {r.statusText}
                  </span>
                  <span style={styles.duration}>{r.durationMs}ms</span>
                </div>
                <div style={styles.urlLine}>
                  <code>{r.url}</code>
                </div>
                {r.error && (
                  <div style={styles.errorBox}>Error: {r.error}</div>
                )}
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Response Body</summary>
                  <pre style={styles.pre}>{JSON.stringify(r.body, null, 2)}</pre>
                </details>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw fetch test */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Manual URL Test</h2>
        <ManualTest token={token} />
      </div>
    </div>
  );
}

function ManualTest({ token }: { token: string | null }) {
  const [url, setUrl] = useState(API_BASE_URL + '/home/notices?limit=1');
  const [result, setResult] = useState<EndpointResult | null>(null);
  const [testing, setTesting] = useState(false);

  const run = async () => {
    setTesting(true);
    const start = performance.now();
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
      const durationMs = Math.round(performance.now() - start);
      let body: unknown;
      try { body = await response.json(); } catch { body = '(non-JSON)'; }
      setResult({ url, status: response.status, statusText: response.statusText, ok: response.ok, body, error: null, durationMs });
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      setResult({ url, status: null, statusText: 'Network Error', ok: false, body: null, error: err instanceof Error ? err.message : String(err), durationMs });
    }
    setTesting(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={styles.input}
        />
        <button onClick={run} disabled={testing} style={styles.button}>
          {testing ? '...' : 'Fetch'}
        </button>
      </div>
      {result && (
        <div style={{ ...styles.resultCard, borderLeft: `4px solid ${result.ok ? '#22c55e' : '#ef4444'}` }}>
          <div style={styles.resultHeader}>
            <span style={{ ...styles.statusBadge, backgroundColor: result.ok ? '#dcfce7' : '#fee2e2', color: result.ok ? '#166534' : '#991b1b' }}>
              {result.status ?? 'ERR'} {result.statusText}
            </span>
            <span style={styles.duration}>{result.durationMs}ms</span>
          </div>
          {result.error && <div style={styles.errorBox}>Error: {result.error}</div>}
          <pre style={styles.pre}>{JSON.stringify(result.body, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  title: { fontSize: '24px', fontWeight: 700, margin: 0 },
  subtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  section: { marginTop: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff' },
  sectionTitle: { fontSize: '16px', fontWeight: 600, marginTop: 0, marginBottom: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  label: { padding: '6px 8px', fontWeight: 600, fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' as const, verticalAlign: 'top' },
  value: { padding: '6px 8px', fontSize: '13px', color: '#111827', wordBreak: 'break-all' as const },
  button: { padding: '8px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 },
  timestamp: { marginLeft: '12px', fontSize: '13px', color: '#6b7280' },
  resultCard: { padding: '12px', marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#fafafa' },
  resultHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' },
  statusBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 },
  duration: { fontSize: '12px', color: '#6b7280' },
  urlLine: { fontSize: '12px', color: '#6b7280', marginBottom: '4px' },
  errorBox: { padding: '8px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '13px', marginTop: '6px' },
  pre: { padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '12px', overflow: 'auto', maxHeight: '300px', margin: '8px 0 0 0' },
  input: { flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' },
};
