/**
 * API Probe Page
 * API 엔드포인트 성능과 응답을 분석하는 디버그 페이지
 *
 * 모든 API 호출을 개별적으로 테스트하고 결과를 시각화
 */

import { useState } from 'react';

interface ApiTestResult {
  endpoint: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: number;
  statusText: string;
  response?: unknown;
  error?: string;
  headers?: Record<string, string>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// 테스트할 API 엔드포인트 목록
const API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/health', name: 'Health Check', requiresAuth: false },
  { method: 'GET', path: '/api/v1/auth/me', name: 'Current User', requiresAuth: true },
  { method: 'GET', path: '/api/v1/glycopharm/display/playlists', name: 'Playlists', requiresAuth: true },
  { method: 'GET', path: '/api/v1/glycopharm/display/media', name: 'Media Library', requiresAuth: true },
  { method: 'GET', path: '/api/v1/glycopharm/display/schedules', name: 'Schedules', requiresAuth: true },
  { method: 'GET', path: '/api/v1/glycopharm/display/shared-playlists', name: 'Shared Playlists', requiresAuth: true },
];

export default function ApiProbePage() {
  const [token, setToken] = useState(localStorage.getItem('glycopharm_token') || '');
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  const testEndpoint = async (endpoint: typeof API_ENDPOINTS[0]) => {
    const startTime = performance.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (endpoint.requiresAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers,
      });

      const endTime = performance.now();
      let responseData: unknown;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      const result: ApiTestResult = {
        endpoint: endpoint.path,
        method: endpoint.method,
        startTime,
        endTime,
        duration: endTime - startTime,
        status: response.status,
        statusText: response.statusText,
        response: responseData,
      };

      return result;
    } catch (error) {
      const endTime = performance.now();
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        startTime,
        endTime,
        duration: endTime - startTime,
        status: 0,
        statusText: 'Network Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    for (const endpoint of API_ENDPOINTS) {
      const result = await testEndpoint(endpoint);
      setResults((prev) => [...prev, result]);
    }

    setIsRunning(false);
  };

  const runSingleTest = async (endpoint: typeof API_ENDPOINTS[0]) => {
    setIsRunning(true);
    const result = await testEndpoint(endpoint);
    setResults((prev) => [...prev, result]);
    setIsRunning(false);
  };

  const clearResults = () => {
    setResults([]);
    setSelectedEndpoint(null);
  };

  const copyResults = () => {
    const exportData = {
      apiBaseUrl: API_BASE_URL,
      timestamp: new Date().toISOString(),
      hasToken: !!token,
      results: results.map((r) => ({
        ...r,
        response: undefined, // 응답 데이터는 제외 (너무 클 수 있음)
      })),
      summary: {
        total: results.length,
        successful: results.filter((r) => r.status >= 200 && r.status < 300).length,
        failed: results.filter((r) => r.status >= 400 || r.status === 0).length,
        avgDuration: results.reduce((acc, r) => acc + r.duration, 0) / results.length,
        slowest: results.reduce((max, r) => (r.duration > max.duration ? r : max), results[0]),
      },
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
  };

  const getSelectedResult = () => {
    return results.find((r) => r.endpoint === selectedEndpoint);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a14',
        color: '#eee',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: '#ff6b6b',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          >
            DEBUG MODE
          </div>
          <h1 style={{ margin: '8px 0', fontSize: '24px' }}>API Probe</h1>
          <p style={{ color: '#888', margin: 0 }}>
            API 엔드포인트 성능과 응답을 개별적으로 테스트합니다.
          </p>
        </header>

        {/* Token Input */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Authentication Token</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token (from localStorage)"
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#0d0d1a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#eee',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
            />
            <button
              onClick={() => setToken(localStorage.getItem('glycopharm_token') || '')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Load from Storage
            </button>
          </div>
          <p style={{ color: token ? '#00ff88' : '#ff6b6b', fontSize: '11px', margin: '8px 0 0 0' }}>
            {token ? '✓ Token loaded' : '✗ No token - authenticated endpoints will fail'}
          </p>
        </section>

        {/* Controls */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#00d9ff' }}>Test Endpoints</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={runAllTests}
                disabled={isRunning}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isRunning ? '#333' : '#00d9ff',
                  color: isRunning ? '#888' : '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {isRunning ? 'Running...' : 'Run All Tests'}
              </button>
              <button
                onClick={copyResults}
                disabled={results.length === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  cursor: results.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                Copy Summary
              </button>
              <button
                onClick={clearResults}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff6b6b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Endpoint List */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {API_ENDPOINTS.map((endpoint) => {
              const result = results.find((r) => r.endpoint === endpoint.path);
              const statusColor =
                result && result.status >= 200 && result.status < 300
                  ? '#00ff88'
                  : result && result.status >= 400
                    ? '#ff6b6b'
                    : result
                      ? '#ffcc00'
                      : '#888';

              return (
                <div
                  key={endpoint.path}
                  onClick={() => setSelectedEndpoint(endpoint.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: selectedEndpoint === endpoint.path ? '#2a2a4e' : '#0d0d1a',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: selectedEndpoint === endpoint.path ? '1px solid #00d9ff' : '1px solid transparent',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#333',
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      minWidth: '50px',
                      textAlign: 'center',
                    }}
                  >
                    {endpoint.method}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }}>
                    {endpoint.path}
                  </span>
                  <span style={{ color: '#888', fontSize: '11px', minWidth: '100px' }}>{endpoint.name}</span>
                  {endpoint.requiresAuth && (
                    <span style={{ color: '#ffcc00', fontSize: '10px' }}>🔒 Auth</span>
                  )}
                  {result ? (
                    <>
                      <span style={{ color: statusColor, fontWeight: 'bold', minWidth: '40px' }}>
                        {result.status || 'ERR'}
                      </span>
                      <span
                        style={{
                          color: result.duration > 1000 ? '#ff6b6b' : result.duration > 500 ? '#ffcc00' : '#00ff88',
                          minWidth: '80px',
                          textAlign: 'right',
                          fontSize: '12px',
                        }}
                      >
                        {result.duration.toFixed(0)}ms
                      </span>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runSingleTest(endpoint);
                      }}
                      disabled={isRunning}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#333',
                        color: '#fff',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      Test
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Response Detail */}
        {selectedEndpoint && getSelectedResult() && (
          <section
            style={{
              backgroundColor: '#1a1a2e',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>
              Response Detail: {selectedEndpoint}
            </h3>
            <pre
              style={{
                backgroundColor: '#0d0d1a',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                margin: 0,
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              {JSON.stringify(getSelectedResult(), null, 2)}
            </pre>
          </section>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <section
            style={{
              backgroundColor: '#1a1a2e',
              padding: '16px',
              borderRadius: '8px',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Test Summary</h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: '#888' }}>Total: </span>
                <span>{results.length}</span>
              </div>
              <div>
                <span style={{ color: '#888' }}>Successful: </span>
                <span style={{ color: '#00ff88' }}>
                  {results.filter((r) => r.status >= 200 && r.status < 300).length}
                </span>
              </div>
              <div>
                <span style={{ color: '#888' }}>Failed: </span>
                <span style={{ color: '#ff6b6b' }}>
                  {results.filter((r) => r.status >= 400 || r.status === 0).length}
                </span>
              </div>
              <div>
                <span style={{ color: '#888' }}>Avg Duration: </span>
                <span>
                  {(results.reduce((acc, r) => acc + r.duration, 0) / results.length).toFixed(0)}ms
                </span>
              </div>
              <div>
                <span style={{ color: '#888' }}>Slowest: </span>
                <span style={{ color: '#ffcc00' }}>
                  {results.reduce((max, r) => (r.duration > max.duration ? r : max), results[0])?.endpoint} (
                  {results.reduce((max, r) => (r.duration > max.duration ? r : max), results[0])?.duration.toFixed(0)}
                  ms)
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
