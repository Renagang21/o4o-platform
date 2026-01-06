/**
 * Navigation Probe Page
 * 네비게이션 동작을 분석하는 디버그 페이지
 *
 * React Router의 NavLink, Link, useNavigate 동작을 테스트
 * AuthContext/Guard 영향 없이 순수한 라우팅 테스트
 */

import { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';

interface NavigationTest {
  type: 'NavLink' | 'Link' | 'useNavigate' | 'window.location';
  to: string;
  beforeUrl: string;
  afterUrl: string;
  success: boolean;
  duration: number;
}

export default function NavigationProbePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState<NavigationTest[]>([]);

  // 테스트할 경로들
  const testPaths = [
    { path: '/pharmacy', label: 'Dashboard' },
    { path: '/pharmacy/signage/my', label: 'Signage' },
    { path: '/pharmacy/market-trial', label: 'Market Trial' },
    { path: '/forum-ext', label: 'Forum' },
  ];

  const handleLinkClick = (_e: React.MouseEvent, path: string, type: string) => {
    const beforeUrl = window.location.href;

    // 클릭 후 URL 변경 감지를 위해 짧은 지연
    setTimeout(() => {
      const afterUrl = window.location.href;
      const test: NavigationTest = {
        type: type as NavigationTest['type'],
        to: path,
        beforeUrl,
        afterUrl,
        success: afterUrl.includes(path),
        duration: 0, // 실제로는 측정 불가
      };
      setTests((prev) => [...prev, test]);
    }, 100);
  };

  const testNavigate = (path: string) => {
    const beforeUrl = window.location.href;
    const start = performance.now();

    navigate(path);

    setTimeout(() => {
      const afterUrl = window.location.href;
      const test: NavigationTest = {
        type: 'useNavigate',
        to: path,
        beforeUrl,
        afterUrl,
        success: afterUrl.includes(path),
        duration: performance.now() - start,
      };
      setTests((prev) => [...prev, test]);
    }, 100);
  };

  const clearTests = () => {
    setTests([]);
  };

  const copyResults = () => {
    const results = {
      currentUrl: window.location.href,
      currentPathname: location.pathname,
      tests,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
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
          <h1 style={{ margin: '8px 0', fontSize: '24px' }}>Navigation Probe</h1>
          <p style={{ color: '#888', margin: 0 }}>
            React Router 네비게이션 동작을 테스트합니다.
          </p>
        </header>

        {/* Current Location */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Current Location</h3>
          <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#888' }}>pathname: </span>
              <span style={{ color: '#00ff88' }}>{location.pathname}</span>
            </div>
            <div>
              <span style={{ color: '#888' }}>href: </span>
              <span style={{ color: '#00ff88' }}>{window.location.href}</span>
            </div>
          </div>
        </section>

        {/* Test: NavLink */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Test 1: NavLink</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {testPaths.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                onClick={(e) => handleLinkClick(e, path, 'NavLink')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00d9ff',
                  color: '#000',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </section>

        {/* Test: Link */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Test 2: Link</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {testPaths.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={(e) => handleLinkClick(e, path, 'Link')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00ff88',
                  color: '#000',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* Test: useNavigate */}
        <section
          style={{
            backgroundColor: '#1a1a2e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#00d9ff' }}>Test 3: useNavigate</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {testPaths.map(({ path, label }) => (
              <button
                key={path}
                onClick={() => testNavigate(path)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffcc00',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Test Results */}
        {tests.length > 0 && (
          <section
            style={{
              backgroundColor: '#1a1a2e',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#00d9ff' }}>Test Results</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={copyResults}
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
                <button
                  onClick={clearTests}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    backgroundColor: '#ff6b6b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tests.map((test, index) => (
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
                      minWidth: '80px',
                      textAlign: 'center',
                    }}
                  >
                    {test.type}
                  </span>
                  <span style={{ flex: 1, color: '#eee', fontSize: '12px', fontFamily: 'monospace' }}>
                    {test.to}
                  </span>
                  <span
                    style={{
                      color: test.success ? '#00ff88' : '#ff6b6b',
                      fontWeight: 'bold',
                    }}
                  >
                    {test.success ? '✓ Success' : '✗ Failed'}
                  </span>
                </div>
              ))}
            </div>
          </section>
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
            <li>Click any navigation button to test that method</li>
            <li>Check if the URL changed correctly</li>
            <li>If navigation fails, you'll stay on this page</li>
            <li>Copy the results JSON for AI analysis</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
