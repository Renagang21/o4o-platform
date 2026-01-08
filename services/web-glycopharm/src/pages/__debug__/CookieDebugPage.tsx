import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.glycopharm.co.kr';

interface DebugResult {
  timestamp: string;
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
}

export default function CookieDebugPage() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, result]);
  };

  const runDiagnostics = async () => {
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력하세요');
      return;
    }

    setIsRunning(true);
    setResults([]);

    // Step 1: Environment Info
    addResult({
      timestamp: new Date().toISOString(),
      step: '1. Environment Info',
      success: true,
      data: {
        currentUrl: window.location.href,
        currentOrigin: window.location.origin,
        currentHostname: window.location.hostname,
        apiBaseUrl: API_BASE_URL,
        apiHostname: new URL(API_BASE_URL).hostname,
        sameOrigin: window.location.origin === new URL(API_BASE_URL).origin,
        cookies: document.cookie || '(none - httpOnly cookies not visible)',
      }
    });

    // Step 2: Login Request
    try {
      const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const responseHeaders: Record<string, string> = {};
      loginResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const loginData = await loginResponse.json();

      addResult({
        timestamp: new Date().toISOString(),
        step: '2. Login Response',
        success: loginResponse.ok,
        data: {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          body: loginData,
        },
        headers: responseHeaders,
      });

      if (!loginResponse.ok) {
        addResult({
          timestamp: new Date().toISOString(),
          step: '2a. Login Failed',
          success: false,
          error: loginData.message || 'Login failed',
        });
        setIsRunning(false);
        return;
      }
    } catch (error) {
      addResult({
        timestamp: new Date().toISOString(),
        step: '2. Login Error',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      setIsRunning(false);
      return;
    }

    // Step 3: Check cookies after login
    addResult({
      timestamp: new Date().toISOString(),
      step: '3. Cookies After Login',
      success: true,
      data: {
        visibleCookies: document.cookie || '(none visible - httpOnly)',
        note: 'httpOnly cookies are not visible to JavaScript but should be sent with requests',
      }
    });

    // Step 4: Test /api/v1/auth/me
    try {
      const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      const meHeaders: Record<string, string> = {};
      meResponse.headers.forEach((value, key) => {
        meHeaders[key] = value;
      });

      let meData;
      try {
        meData = await meResponse.json();
      } catch {
        meData = { parseError: 'Could not parse response as JSON' };
      }

      addResult({
        timestamp: new Date().toISOString(),
        step: '4. GET /api/v1/auth/me',
        success: meResponse.ok,
        data: {
          status: meResponse.status,
          statusText: meResponse.statusText,
          body: meData,
        },
        headers: meHeaders,
      });
    } catch (error) {
      addResult({
        timestamp: new Date().toISOString(),
        step: '4. /auth/me Error',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Step 5: Test cockpit endpoint
    try {
      const cockpitResponse = await fetch(`${API_BASE_URL}/api/v1/glycopharm/cockpit/dashboard`, {
        method: 'GET',
        credentials: 'include',
      });

      const cockpitHeaders: Record<string, string> = {};
      cockpitResponse.headers.forEach((value, key) => {
        cockpitHeaders[key] = value;
      });

      let cockpitData;
      try {
        cockpitData = await cockpitResponse.json();
      } catch {
        cockpitData = { parseError: 'Could not parse response as JSON' };
      }

      addResult({
        timestamp: new Date().toISOString(),
        step: '5. GET /glycopharm/cockpit/dashboard',
        success: cockpitResponse.ok,
        data: {
          status: cockpitResponse.status,
          statusText: cockpitResponse.statusText,
          body: cockpitData,
        },
        headers: cockpitHeaders,
      });
    } catch (error) {
      addResult({
        timestamp: new Date().toISOString(),
        step: '5. Cockpit Error',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Step 6: Analysis
    addResult({
      timestamp: new Date().toISOString(),
      step: '6. Analysis',
      success: true,
      data: {
        issue: 'Cross-domain cookie issue',
        explanation: `
브라우저 위치: ${window.location.hostname}
API 서버: ${new URL(API_BASE_URL).hostname}

문제:
1. 로그인 시 API 서버(${new URL(API_BASE_URL).hostname})가 쿠키를 설정
2. Set-Cookie에 Domain=.glycopharm.co.kr가 설정되었더라도
3. 브라우저는 ${new URL(API_BASE_URL).hostname}로의 요청에 .glycopharm.co.kr 쿠키를 보내지 않음
4. 이는 서로 다른 도메인이기 때문 (브라우저 보안 정책)

해결책:
1. API 프록시: glycopharm.co.kr 서버에서 API 요청 프록시
2. 서브도메인 통일: 모든 서비스를 *.neture.co.kr로
3. Bearer Token: 쿠키 대신 Authorization 헤더 사용
        `.trim(),
      }
    });

    setIsRunning(false);
  };

  const copyResults = () => {
    const json = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(json);
    alert('JSON 복사됨');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Cookie Debug Page</h1>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email: </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '8px', width: '250px', marginLeft: '10px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password: </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '8px', width: '250px', marginLeft: '10px' }}
          />
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            background: isRunning ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginRight: '10px',
          }}
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </button>

        {results.length > 0 && (
          <button
            onClick={copyResults}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Copy JSON
          </button>
        )}
      </div>

      {results.map((result, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: '15px',
            padding: '15px',
            background: result.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '8px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            {result.success ? '✅' : '❌'} {result.step}
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
              {result.timestamp}
            </span>
          </div>

          {result.error && (
            <div style={{ color: '#721c24', marginBottom: '10px' }}>
              Error: {result.error}
            </div>
          )}

          {result.headers && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Response Headers:</strong>
              <pre style={{
                background: '#fff',
                padding: '10px',
                overflow: 'auto',
                fontSize: '12px',
                maxHeight: '150px',
              }}>
                {JSON.stringify(result.headers, null, 2)}
              </pre>
            </div>
          )}

          {result.data && (
            <div>
              <strong>Data:</strong>
              <pre style={{
                background: '#fff',
                padding: '10px',
                overflow: 'auto',
                fontSize: '12px',
                maxHeight: '300px',
                whiteSpace: 'pre-wrap',
              }}>
                {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
