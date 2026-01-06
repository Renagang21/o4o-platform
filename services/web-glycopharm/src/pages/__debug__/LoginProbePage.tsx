/**
 * Login Probe Page
 * 로그인 과정의 성능과 동작을 분석하는 디버그 페이지
 *
 * 커뮤니티 검증 패턴:
 * - AuthContext, Guard, Redirect 없이 순수한 API 테스트
 * - 모든 상태를 JSON으로 화면에 노출
 * - AI 에이전트가 분석하기 쉬운 구조화된 출력
 *
 * 사용법:
 * 1. /__debug__/login 접속
 * 2. "Run Login Probe" 클릭
 * 3. 결과 JSON을 복사하여 Claude Code에 전달
 */

import { useState, useCallback } from 'react';

// Probe 유틸리티 (인라인 구현 - @o4o/debug 패키지와 동일한 로직)
interface TimelineMark {
  label: string;
  time: number;
  delta: number;
}

interface ApiCall {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: string;
}

interface ProbeResult {
  sessionName: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  timeline: TimelineMark[];
  apiCalls: ApiCall[];
  errors: string[];
  loginResponse?: unknown;
  meResponse?: unknown;
  userRole?: string;
  mappedRole?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export default function LoginProbePage() {
  const [email, setEmail] = useState('pharmacy@glycopharm.kr');
  const [password, setPassword] = useState('test123!@#');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  const runProbe = useCallback(async () => {
    setIsRunning(true);
    setResult(null);

    const timeline: TimelineMark[] = [];
    const apiCalls: ApiCall[] = [];
    const errors: string[] = [];
    let prevTime = performance.now();
    const startTime = prevTime;

    const mark = (label: string) => {
      const now = performance.now();
      timeline.push({
        label,
        time: now - startTime,
        delta: now - prevTime,
      });
      prevTime = now;
    };

    const trackedFetch = async (url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';
      const apiCall: ApiCall = {
        url,
        method,
        startTime: performance.now() - startTime,
      };
      apiCalls.push(apiCall);

      try {
        const response = await fetch(url, options);
        apiCall.endTime = performance.now() - startTime;
        apiCall.duration = apiCall.endTime - apiCall.startTime;
        apiCall.status = response.status;
        return response;
      } catch (error) {
        apiCall.endTime = performance.now() - startTime;
        apiCall.duration = apiCall.endTime - apiCall.startTime;
        apiCall.error = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      }
    };

    let loginResponse: unknown;
    let meResponse: unknown;
    let userRole: string | undefined;
    let mappedRole: string | undefined;

    try {
      mark('probe:start');

      // Step 1: Login API
      mark('login:start');
      const loginRes = await trackedFetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      loginResponse = loginData;
      mark('login:end');

      if (loginData.data?.accessToken) {
        const token = loginData.data.accessToken;
        userRole = loginData.data.user?.role;

        // Role mapping (AuthContext 로직과 동일)
        const roleMap: Record<string, string> = {
          seller: 'pharmacy',
          customer: 'pharmacy',
          user: 'pharmacy',
          admin: 'operator',
          super_admin: 'operator',
          supplier: 'supplier',
          partner: 'partner',
        };
        mappedRole = roleMap[userRole || ''] || 'consumer';
        mark('role:mapped');

        // Step 2: Me API (세션 확인)
        mark('me:start');
        const meRes = await trackedFetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const meData = await meRes.json();
        meResponse = meData;
        mark('me:end');

        // Step 3: LocalStorage 저장 시뮬레이션
        mark('storage:start');
        // 실제로 저장하지 않고 시간만 측정
        await new Promise((resolve) => setTimeout(resolve, 1));
        mark('storage:end');
      }

      mark('probe:complete');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      mark('probe:error');
    }

    const endTime = performance.now();

    const probeResult: ProbeResult = {
      sessionName: 'login-probe',
      startTime: 0,
      endTime: endTime - startTime,
      totalDuration: endTime - startTime,
      timeline,
      apiCalls,
      errors,
      loginResponse,
      meResponse,
      userRole,
      mappedRole,
    };

    setResult(probeResult);
    setIsRunning(false);
  }, [email, password]);

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
          <h1 style={{ margin: '8px 0', fontSize: '24px' }}>Login Probe</h1>
          <p style={{ color: '#888', margin: 0 }}>
            로그인 과정의 성능과 동작을 분석합니다. AuthContext/Guard 없이 순수한 API 테스트.
          </p>
        </header>

        {/* Input Section */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Test Credentials</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#888' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#0d0d1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  color: '#eee',
                  width: '250px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#888' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#0d0d1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  color: '#eee',
                  width: '200px',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={runProbe}
                disabled={isRunning}
                style={{
                  padding: '8px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  backgroundColor: isRunning ? '#333' : '#00d9ff',
                  color: isRunning ? '#888' : '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                }}
              >
                {isRunning ? 'Running...' : 'Run Login Probe'}
              </button>
            </div>
          </div>
        </section>

        {/* Results Section */}
        {result && (
          <>
            {/* Summary */}
            <section
              style={{
                backgroundColor: '#1a1a2e',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Summary</h3>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: '#888' }}>Total Duration: </span>
                  <span
                    style={{
                      color: result.totalDuration > 2000 ? '#ff6b6b' : '#00ff88',
                      fontWeight: 'bold',
                    }}
                  >
                    {result.totalDuration.toFixed(2)}ms
                  </span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>API Calls: </span>
                  <span style={{ color: '#eee' }}>{result.apiCalls.length}</span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Errors: </span>
                  <span style={{ color: result.errors.length > 0 ? '#ff6b6b' : '#00ff88' }}>
                    {result.errors.length}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>API Role: </span>
                  <span style={{ color: '#ffcc00' }}>{result.userRole || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Mapped Role: </span>
                  <span style={{ color: '#00ff88' }}>{result.mappedRole || 'N/A'}</span>
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section
              style={{
                backgroundColor: '#1a1a2e',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Timeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {result.timeline.map((mark, index) => {
                  const widthPercent = Math.min(100, (mark.time / result.totalDuration) * 100);
                  const deltaColor = mark.delta > 100 ? '#ff6b6b' : '#888';

                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '200px',
                          height: '20px',
                          backgroundColor: '#333',
                          borderRadius: '2px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: `${widthPercent}%`,
                            height: '100%',
                            backgroundColor: '#00d9ff',
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                      <span style={{ minWidth: '150px', color: '#eee', fontFamily: 'monospace', fontSize: '12px' }}>
                        {mark.label}
                      </span>
                      <span style={{ color: '#888', fontSize: '11px', minWidth: '80px' }}>
                        {mark.time.toFixed(2)}ms
                      </span>
                      {mark.delta > 0 && (
                        <span style={{ color: deltaColor, fontSize: '11px' }}>
                          (+{mark.delta.toFixed(2)}ms)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* API Calls */}
            <section
              style={{
                backgroundColor: '#1a1a2e',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>API Calls</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.apiCalls.map((call, index) => {
                  const statusColor =
                    call.status && call.status >= 200 && call.status < 300
                      ? '#00ff88'
                      : '#ff6b6b';
                  const durationColor =
                    call.duration && call.duration > 1000
                      ? '#ff6b6b'
                      : call.duration && call.duration > 500
                        ? '#ffcc00'
                        : '#00ff88';

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px',
                        backgroundColor: '#0d0d1a',
                        borderRadius: '4px',
                      }}
                    >
                      <span
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#333',
                          borderRadius: '2px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {call.method}
                      </span>
                      <span style={{ flex: 1, color: '#eee', fontSize: '11px', fontFamily: 'monospace' }}>
                        {call.url}
                      </span>
                      <span style={{ color: statusColor, fontWeight: 'bold' }}>{call.status}</span>
                      <span style={{ color: durationColor, minWidth: '80px', textAlign: 'right' }}>
                        {call.duration?.toFixed(2)}ms
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Raw JSON Output */}
            <section
              style={{
                backgroundColor: '#1a1a2e',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#00d9ff' }}>Raw JSON (Copy for AI Analysis)</h3>
                <button
                  onClick={copyResult}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    backgroundColor: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Copy JSON
                </button>
              </div>
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
                {JSON.stringify(result, null, 2)}
              </pre>
            </section>
          </>
        )}

        {/* Instructions */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            opacity: 0.7,
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>How to Use</h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#888', lineHeight: 1.8 }}>
            <li>Enter test credentials and click "Run Login Probe"</li>
            <li>Review the timeline and API call durations</li>
            <li>Click "Copy JSON" to copy the raw result</li>
            <li>Paste the JSON to Claude Code for analysis</li>
            <li>AI will identify bottlenecks, unnecessary calls, or errors</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
