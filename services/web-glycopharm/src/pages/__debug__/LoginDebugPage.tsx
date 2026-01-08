/**
 * Login Debug Page - GlycoPharm
 *
 * 로그인 및 쿠키 문제 디버깅을 위한 페이지
 * URL: /__debug__/login
 */

import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface DebugLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
  data?: any;
}

interface CookieInfo {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: string;
}

export default function LoginDebugPage() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [email, setEmail] = useState('pharmacy@glycopharm.kr');
  const [password, setPassword] = useState('test123!@#');
  const [isLoading, setIsLoading] = useState(false);
  const [cookies, setCookies] = useState<CookieInfo[]>([]);
  const [loginResponse, setLoginResponse] = useState<any>(null);
  const [loginHeaders, setLoginHeaders] = useState<Record<string, string>>({});

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString().split('T')[1].split('.')[0],
      type,
      message,
      data,
    };
    setLogs(prev => [...prev, log]);
    console.log(`[${type.toUpperCase()}] ${message}`, data || '');
  };

  const parseCookies = (): CookieInfo[] => {
    const cookieString = document.cookie;
    if (!cookieString) return [];

    return cookieString.split(';').map(cookie => {
      const [name, value] = cookie.trim().split('=');
      return { name, value };
    });
  };

  const refreshCookies = () => {
    const parsed = parseCookies();
    setCookies(parsed);
    addLog('info', `현재 document.cookie 확인: ${parsed.length}개`, parsed);
  };

  useEffect(() => {
    addLog('info', '디버그 페이지 로드됨');
    addLog('info', `API Base URL: ${API_BASE_URL}`);
    addLog('info', `현재 도메인: ${window.location.hostname}`);
    addLog('info', `현재 Origin: ${window.location.origin}`);
    refreshCookies();
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    setLoginResponse(null);
    setLoginHeaders({});
    addLog('info', '로그인 시작...');
    addLog('info', `요청 URL: ${API_BASE_URL}/api/v1/auth/login`);
    addLog('info', `credentials: 'include' 사용`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      // Response Headers 수집
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      setLoginHeaders(headers);
      addLog('info', 'Response Headers:', headers);

      // Set-Cookie 헤더 확인 (CORS로 인해 보이지 않을 수 있음)
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        addLog('success', 'Set-Cookie 헤더 발견:', setCookie);
      } else {
        addLog('warn', 'Set-Cookie 헤더가 보이지 않음 (CORS 제한)');
      }

      const data = await response.json();
      setLoginResponse(data);

      if (response.ok) {
        addLog('success', `로그인 성공! Status: ${response.status}`, data);

        // 쿠키 즉시 확인
        setTimeout(() => {
          refreshCookies();
        }, 100);
      } else {
        addLog('error', `로그인 실패! Status: ${response.status}`, data);
      }
    } catch (error: any) {
      addLog('error', '로그인 요청 실패:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMe = async () => {
    addLog('info', '/api/v1/auth/me 테스트 시작...');
    addLog('info', `요청 URL: ${API_BASE_URL}/api/v1/auth/me`);

    // 현재 쿠키 상태
    addLog('info', `현재 document.cookie: "${document.cookie}"`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        addLog('success', `/me 성공! Status: ${response.status}`, data);
      } else {
        addLog('error', `/me 실패! Status: ${response.status}`, data);
      }
    } catch (error: any) {
      addLog('error', '/me 요청 실패:', error.message);
    }
  };

  const handleTestCockpit = async () => {
    addLog('info', 'Cockpit API 테스트 시작...');
    addLog('info', `요청 URL: ${API_BASE_URL}/api/v1/glycopharm/pharmacy/cockpit/status`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/glycopharm/pharmacy/cockpit/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        addLog('success', `Cockpit 성공! Status: ${response.status}`, data);
      } else {
        addLog('error', `Cockpit 실패! Status: ${response.status}`, data);
      }
    } catch (error: any) {
      addLog('error', 'Cockpit 요청 실패:', error.message);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    setLoginResponse(null);
    setLoginHeaders({});
  };

  const handleLogout = async () => {
    addLog('info', '로그아웃 시작...');
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      addLog('success', '로그아웃 완료');
      refreshCookies();
    } catch (error: any) {
      addLog('error', '로그아웃 실패:', error.message);
    }
  };

  const exportLogs = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      origin: window.location.origin,
      apiBaseUrl: API_BASE_URL,
      cookies: cookies,
      loginResponse,
      loginHeaders,
      logs,
    };
    console.log('=== DEBUG EXPORT ===');
    console.log(JSON.stringify(exportData, null, 2));
    addLog('info', 'Debug 데이터가 콘솔에 출력되었습니다.');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1a1a2e', color: '#eee', minHeight: '100vh' }}>
      <h1 style={{ color: '#00d4ff', marginBottom: '20px' }}>GlycoPharm Login Debug</h1>

      {/* Environment Info */}
      <div style={{ backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>Environment</h3>
        <div>API Base URL: <span style={{ color: '#4ade80' }}>{API_BASE_URL}</span></div>
        <div>Current Origin: <span style={{ color: '#4ade80' }}>{window.location.origin}</span></div>
        <div>Current Domain: <span style={{ color: '#4ade80' }}>{window.location.hostname}</span></div>
      </div>

      {/* Login Form */}
      <div style={{ backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>Login Test</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: '8px', borderRadius: '4px', border: 'none', width: '200px' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ padding: '8px', borderRadius: '4px', border: 'none', width: '150px' }}
          />
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{ padding: '8px 16px', backgroundColor: '#4ade80', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLoading ? '로그인 중...' : 'Login'}
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', backgroundColor: '#f87171', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* API Test Buttons */}
      <div style={{ backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>API Tests</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleTestMe}
            style={{ padding: '8px 16px', backgroundColor: '#60a5fa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Test /auth/me
          </button>
          <button
            onClick={handleTestCockpit}
            style={{ padding: '8px 16px', backgroundColor: '#c084fc', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Test /cockpit/status
          </button>
          <button
            onClick={refreshCookies}
            style={{ padding: '8px 16px', backgroundColor: '#fbbf24', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#000' }}
          >
            Refresh Cookies
          </button>
          <button
            onClick={exportLogs}
            style={{ padding: '8px 16px', backgroundColor: '#a78bfa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Export to Console
          </button>
          <button
            onClick={handleClearLogs}
            style={{ padding: '8px 16px', backgroundColor: '#6b7280', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Cookies Display */}
      <div style={{ backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>Cookies (document.cookie)</h3>
        {cookies.length === 0 ? (
          <div style={{ color: '#f87171' }}>쿠키 없음 (JavaScript에서 접근 불가 - httpOnly 쿠키는 여기 표시 안됨)</div>
        ) : (
          <div>
            {cookies.map((cookie, i) => (
              <div key={i} style={{ marginBottom: '5px' }}>
                <span style={{ color: '#4ade80' }}>{cookie.name}</span>: {cookie.value.substring(0, 50)}...
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '10px', color: '#9ca3af', fontSize: '12px' }}>
          참고: httpOnly 쿠키는 JavaScript에서 접근할 수 없습니다. 브라우저 DevTools의 Application 탭에서 확인하세요.
        </div>
      </div>

      {/* Login Response Headers */}
      {Object.keys(loginHeaders).length > 0 && (
        <div style={{ backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>Login Response Headers</h3>
          <div style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
            {Object.entries(loginHeaders).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '3px' }}>
                <span style={{ color: '#60a5fa' }}>{key}</span>: {value}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Login Response */}
      {loginResponse && (
        <div style={{ backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>Login Response Body</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px', margin: 0 }}>
            {JSON.stringify(loginResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Logs */}
      <div style={{ backgroundColor: '#0f0f23', padding: '15px', borderRadius: '8px' }}>
        <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>Logs</h3>
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          {logs.map((log, i) => (
            <div
              key={i}
              style={{
                padding: '5px',
                borderBottom: '1px solid #333',
                color: log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : log.type === 'warn' ? '#fbbf24' : '#9ca3af',
              }}
            >
              <span style={{ color: '#6b7280' }}>[{log.timestamp}]</span>{' '}
              <span style={{ fontWeight: 'bold' }}>[{log.type.toUpperCase()}]</span>{' '}
              {log.message}
              {log.data && (
                <pre style={{ margin: '5px 0 0 20px', fontSize: '11px', color: '#9ca3af' }}>
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1e3a5f', borderRadius: '8px' }}>
        <h3 style={{ color: '#00d4ff', margin: '0 0 10px 0' }}>디버깅 가이드</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Login 버튼 클릭 후 Response Headers에서 <code>set-cookie</code> 확인 (CORS로 안 보일 수 있음)</li>
          <li>브라우저 DevTools → Application → Cookies → <code>api.neture.co.kr</code> 확인</li>
          <li>Test /auth/me 클릭하여 인증 상태 확인</li>
          <li>Test /cockpit/status 클릭하여 실제 API 호출 테스트</li>
          <li>쿠키가 설정되지 않으면 third-party cookie 차단 여부 확인</li>
        </ol>
      </div>
    </div>
  );
}
