/**
 * Auth Bootstrap Debug Page
 *
 * Work Order: WO-DEBUG-ADMIN-AUTH-BOOTSTRAP-001
 *
 * 로그인 후 인증 상태 유지 문제 분석을 위한 디버그 페이지
 * JSON 타임라인으로 정확한 실패 지점 식별
 */

import React, { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

interface TimelineEntry {
  timestamp: string;
  step: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
  duration?: number;
}

interface DebugResult {
  timestamp: string;
  origin: string;
  apiBaseUrl: string;
  login: {
    status: number | null;
    success: boolean;
    responseHeaders: Record<string, string>;
    setCookiePresent: boolean;
    body?: any;
  };
  token: {
    received: boolean;
    storage: 'cookie' | 'localStorage' | 'none';
    keys: string[];
    cookieNames: string[];
  };
  authMe: {
    status: number | null;
    success: boolean;
    body?: any;
  };
  postLoginCalls: Array<{
    url: string;
    status: number | null;
    success: boolean;
  }>;
  timeline: TimelineEntry[];
}

const AuthBootstrapDebug: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const addTimeline = useCallback((step: string, status: TimelineEntry['status'], data?: any, error?: string, duration?: number) => {
    const entry: TimelineEntry = {
      timestamp: new Date().toISOString(),
      step,
      status,
      data,
      error,
      duration,
    };
    setTimeline(prev => [...prev, entry]);
    return entry;
  }, []);

  // 쿠키 파싱
  const getCookies = (): string[] => {
    if (!document.cookie) return [];
    return document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
  };

  // localStorage 키 목록
  const getLocalStorageKeys = (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  };

  // 토큰 관련 키 필터링
  const getTokenKeys = (): { localStorage: string[]; cookies: string[] } => {
    const tokenPatterns = ['token', 'auth', 'session', 'jwt', 'access', 'refresh'];
    const lsKeys = getLocalStorageKeys().filter(k =>
      tokenPatterns.some(p => k.toLowerCase().includes(p))
    );
    const cookieNames = getCookies().filter(c =>
      tokenPatterns.some(p => c.toLowerCase().includes(p))
    );
    return { localStorage: lsKeys, cookies: cookieNames };
  };

  const runAuthBootstrapProbe = async () => {
    setIsRunning(true);
    setTimeline([]);

    const debugResult: DebugResult = {
      timestamp: new Date().toISOString(),
      origin: window.location.origin,
      apiBaseUrl: API_BASE_URL,
      login: {
        status: null,
        success: false,
        responseHeaders: {},
        setCookiePresent: false,
      },
      token: {
        received: false,
        storage: 'none',
        keys: [],
        cookieNames: [],
      },
      authMe: {
        status: null,
        success: false,
      },
      postLoginCalls: [],
      timeline: [],
    };

    try {
      // Step 1: 초기 상태 기록
      addTimeline('init', 'success', {
        origin: window.location.origin,
        apiBaseUrl: API_BASE_URL,
        initialCookies: getCookies(),
        initialLocalStorage: getTokenKeys().localStorage,
      });

      // Step 2: 로그인 요청
      addTimeline('login_request', 'pending');
      const loginStart = performance.now();

      const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const loginDuration = performance.now() - loginStart;
      const loginData = await loginResponse.json();

      // 응답 헤더 수집
      const responseHeaders: Record<string, string> = {};
      loginResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      debugResult.login = {
        status: loginResponse.status,
        success: loginResponse.ok,
        responseHeaders,
        setCookiePresent: responseHeaders['set-cookie'] !== undefined,
        body: loginData,
      };

      if (!loginResponse.ok) {
        addTimeline('login_response', 'error', { status: loginResponse.status, body: loginData }, loginData.error || 'Login failed', loginDuration);
        debugResult.timeline = timeline;
        setResult(debugResult);
        setIsRunning(false);
        return;
      }

      addTimeline('login_response', 'success', {
        status: loginResponse.status,
        user: loginData.data?.user?.email,
        headersVisible: Object.keys(responseHeaders),
      }, undefined, loginDuration);

      // Step 3: 토큰 저장 확인 (약간의 딜레이 후)
      await new Promise(resolve => setTimeout(resolve, 100));

      const tokenCheck = getTokenKeys();
      const postLoginCookies = getCookies();

      debugResult.token = {
        received: tokenCheck.localStorage.length > 0 || tokenCheck.cookies.length > 0,
        storage: tokenCheck.cookies.length > 0 ? 'cookie' : (tokenCheck.localStorage.length > 0 ? 'localStorage' : 'none'),
        keys: tokenCheck.localStorage,
        cookieNames: postLoginCookies,
      };

      addTimeline('token_check', debugResult.token.received ? 'success' : 'error', {
        storage: debugResult.token.storage,
        localStorageKeys: tokenCheck.localStorage,
        cookies: postLoginCookies,
      });

      // Step 4: /auth/me 호출
      addTimeline('auth_me_request', 'pending');
      const meStart = performance.now();

      const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        credentials: 'include',
      });

      const meDuration = performance.now() - meStart;
      const meData = await meResponse.json().catch(() => ({}));

      debugResult.authMe = {
        status: meResponse.status,
        success: meResponse.ok,
        body: meData,
      };

      addTimeline('auth_me_response', meResponse.ok ? 'success' : 'error', {
        status: meResponse.status,
        body: meData,
      }, meResponse.ok ? undefined : `Status ${meResponse.status}`, meDuration);

      // Step 5: 후속 API 호출 테스트 (Cockpit APIs)
      const postLoginApis = [
        '/api/v1/glycopharm/pharmacy/cockpit/status',
        '/api/v1/glycopharm/pharmacy/cockpit/today-actions',
      ];

      for (const apiPath of postLoginApis) {
        addTimeline(`api_call_${apiPath}`, 'pending');
        const apiStart = performance.now();

        try {
          const apiResponse = await fetch(`${API_BASE_URL}${apiPath}`, {
            credentials: 'include',
          });
          const apiDuration = performance.now() - apiStart;

          debugResult.postLoginCalls.push({
            url: apiPath,
            status: apiResponse.status,
            success: apiResponse.ok,
          });

          addTimeline(`api_call_${apiPath}`, apiResponse.ok ? 'success' : 'error', {
            status: apiResponse.status,
          }, apiResponse.ok ? undefined : `Status ${apiResponse.status}`, apiDuration);
        } catch (err: any) {
          debugResult.postLoginCalls.push({
            url: apiPath,
            status: null,
            success: false,
          });
          addTimeline(`api_call_${apiPath}`, 'error', undefined, err.message);
        }
      }

    } catch (err: any) {
      addTimeline('fatal_error', 'error', undefined, err.message);
    }

    debugResult.timeline = timeline;
    setResult(debugResult);
    setIsRunning(false);
  };

  // 결과 JSON 복사
  const copyResultJson = () => {
    if (result) {
      const finalResult = { ...result, timeline };
      navigator.clipboard.writeText(JSON.stringify(finalResult, null, 2));
      alert('JSON이 클립보드에 복사되었습니다.');
    }
  };

  // 새 탭에서 JSON 보기
  const openInNewTab = () => {
    if (result) {
      const finalResult = { ...result, timeline };
      const blob = new Blob([JSON.stringify(finalResult, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
        Auth Bootstrap Debug
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        WO-DEBUG-ADMIN-AUTH-BOOTSTRAP-001 | 로그인 후 인증 상태 유지 분석
      </p>

      {/* 환경 정보 */}
      <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Environment</h3>
        <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
          <div>Origin: {window.location.origin}</div>
          <div>API: {API_BASE_URL}</div>
          <div>Timestamp: {new Date().toISOString()}</div>
        </div>
      </div>

      {/* 로그인 폼 */}
      <div style={{ background: 'white', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Login Credentials</h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '240px' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '200px' }}
          />
          <button
            onClick={runAuthBootstrapProbe}
            disabled={isRunning || !email || !password}
            style={{
              padding: '10px 20px',
              background: isRunning ? '#999' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isRunning ? 'Running...' : 'Run Auth Bootstrap Probe'}
          </button>
        </div>
      </div>

      {/* 타임라인 */}
      {timeline.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Timeline</h3>
          <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {timeline.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  marginBottom: '4px',
                  borderRadius: '4px',
                  background: entry.status === 'success' ? '#d4edda' : entry.status === 'error' ? '#f8d7da' : '#fff3cd',
                  borderLeft: `4px solid ${entry.status === 'success' ? '#28a745' : entry.status === 'error' ? '#dc3545' : '#ffc107'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold' }}>{entry.step}</span>
                  <span style={{ color: '#666' }}>
                    {entry.duration ? `${entry.duration.toFixed(0)}ms` : ''}
                  </span>
                </div>
                {entry.error && <div style={{ color: '#dc3545', marginTop: '4px' }}>{entry.error}</div>}
                {entry.data && (
                  <pre style={{ margin: '4px 0 0 0', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 결과 요약 */}
      {result && (
        <div style={{ background: 'white', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Result Summary</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={copyResultJson}
                style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Copy JSON
              </button>
              <button
                onClick={openInNewTab}
                style={{ padding: '6px 12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Open in New Tab
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Login Status */}
            <div style={{ padding: '12px', background: result.login.success ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Login</div>
              <div>Status: {result.login.status}</div>
              <div>Success: {result.login.success ? 'Yes' : 'No'}</div>
              <div>Set-Cookie: {result.login.setCookiePresent ? 'Present' : 'Not visible'}</div>
            </div>

            {/* Token Status */}
            <div style={{ padding: '12px', background: result.token.received ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Token</div>
              <div>Received: {result.token.received ? 'Yes' : 'No'}</div>
              <div>Storage: {result.token.storage}</div>
              <div>Keys: {result.token.keys.join(', ') || 'none'}</div>
              <div>Cookies: {result.token.cookieNames.join(', ') || 'none'}</div>
            </div>

            {/* Auth Me Status */}
            <div style={{ padding: '12px', background: result.authMe.success ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>/auth/me</div>
              <div>Status: {result.authMe.status}</div>
              <div>Success: {result.authMe.success ? 'Yes' : 'No'}</div>
            </div>

            {/* Post Login Calls */}
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Post-Login APIs</div>
              {result.postLoginCalls.map((call, idx) => (
                <div key={idx} style={{ fontSize: '12px' }}>
                  {call.status}: {call.url.split('/').pop()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full JSON Output */}
      {result && (
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ color: 'white', margin: '0 0 12px 0' }}>Full JSON Output</h3>
          <pre style={{
            color: '#d4d4d4',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '400px',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {JSON.stringify({ ...result, timeline }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AuthBootstrapDebug;
