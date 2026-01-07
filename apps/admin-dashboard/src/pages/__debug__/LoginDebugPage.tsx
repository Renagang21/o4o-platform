/**
 * Login Debug Page
 * WO-DEBUG-ADMIN-LOGIN-MINIMAL-001
 *
 * Purpose: 로그인 후 즉시 로그아웃/리다이렉트 실패 원인을 JSON으로 관측
 *
 * URL: /__debug__/login
 */

import React, { useState, useRef } from 'react';
import { authClient } from '@o4o/auth-client';

interface TimelineEntry {
  timestamp: string;
  elapsed: number;
  event: string;
  data?: any;
}

interface LoginProbeResult {
  probeId: string;
  timestamp: string;
  login: {
    request: {
      email: string;
      endpoint: string;
    };
    response: {
      status: number | null;
      statusText: string | null;
      success: boolean;
      error?: string;
      data?: any;
    };
  };
  auth: {
    tokenReceived: boolean;
    accessToken: string | null;
    refreshToken: string | null;
    tokenStored: {
      localStorage: {
        accessToken: boolean;
        refreshToken: boolean;
        o4o_accessToken: boolean;
      };
    };
  };
  postLoginCalls: Array<{
    url: string;
    status: number | null;
    success: boolean;
    error?: string;
  }>;
  redirect: {
    expectedPath: string;
    wouldRedirectTo: string | null;
  };
  timeline: TimelineEntry[];
  environment: {
    apiBaseUrl: string;
    currentUrl: string;
    userAgent: string;
  };
}

// 실제 DB 테스트 계정 목록 (Migration에서 생성된 계정들)
const TEST_ACCOUNTS = [
  { label: 'Admin', email: 'admin@neture.co.kr', password: 'admin123!@#', description: '관리자' },
  { label: 'Pharmacy', email: 'pharmacy@glycopharm.kr', password: 'test123!@#', description: '약국' },
  { label: 'Supplier', email: 'test-supplier@neture.co.kr', password: 'test123!@#', description: '공급자' },
  { label: 'Seller', email: 'test-seller@neture.co.kr', password: 'test123!@#', description: '판매자' },
  { label: 'Partner', email: 'test-partner@neture.co.kr', password: 'test123!@#', description: '파트너' },
];

const LoginDebugPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<LoginProbeResult | null>(null);
  const startTimeRef = useRef<number>(0);
  const timelineRef = useRef<TimelineEntry[]>([]);

  const fillTestAccount = (account: typeof TEST_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  const addTimeline = (event: string, data?: any) => {
    const now = Date.now();
    timelineRef.current.push({
      timestamp: new Date(now).toISOString(),
      elapsed: now - startTimeRef.current,
      event,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    });
  };

  const maskToken = (token: string | null): string | null => {
    if (!token) return null;
    if (token.length <= 20) return '***masked***';
    return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
  };

  const runLoginProbe = async () => {
    setIsRunning(true);
    startTimeRef.current = Date.now();
    timelineRef.current = [];

    const probeResult: LoginProbeResult = {
      probeId: `probe-${Date.now()}`,
      timestamp: new Date().toISOString(),
      login: {
        request: { email, endpoint: '/auth/login' },
        response: { status: null, statusText: null, success: false },
      },
      auth: {
        tokenReceived: false,
        accessToken: null,
        refreshToken: null,
        tokenStored: {
          localStorage: {
            accessToken: false,
            refreshToken: false,
            o4o_accessToken: false,
          },
        },
      },
      postLoginCalls: [],
      redirect: {
        expectedPath: '/admin',
        wouldRedirectTo: null,
      },
      timeline: [],
      environment: {
        apiBaseUrl: (authClient.api.defaults as any).baseURL || 'unknown',
        currentUrl: window.location.href,
        userAgent: navigator.userAgent,
      },
    };

    try {
      // Clear existing tokens
      addTimeline('CLEAR_TOKENS', { action: 'Clearing existing localStorage tokens' });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('o4o_accessToken');
      localStorage.removeItem('admin-auth-storage');

      // Step 1: Login Request
      addTimeline('LOGIN_REQUEST_START', { email });

      let loginResponse: any;
      try {
        loginResponse = await authClient.api.post('/auth/login', { email, password });

        probeResult.login.response = {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          success: true,
          data: {
            hasAccessToken: !!loginResponse.data?.accessToken,
            hasRefreshToken: !!loginResponse.data?.refreshToken,
            hasUser: !!loginResponse.data?.user,
            user: loginResponse.data?.user ? {
              id: loginResponse.data.user.id,
              email: loginResponse.data.user.email,
              role: loginResponse.data.user.role,
            } : null,
          },
        };

        addTimeline('LOGIN_REQUEST_SUCCESS', {
          status: loginResponse.status,
          hasTokens: !!loginResponse.data?.accessToken,
        });

        // Check token reception
        if (loginResponse.data?.accessToken) {
          probeResult.auth.tokenReceived = true;
          probeResult.auth.accessToken = maskToken(loginResponse.data.accessToken);
          probeResult.auth.refreshToken = maskToken(loginResponse.data.refreshToken);

          addTimeline('TOKEN_RECEIVED', {
            accessTokenLength: loginResponse.data.accessToken?.length,
            refreshTokenLength: loginResponse.data.refreshToken?.length,
          });

          // Simulate token storage (don't actually store to avoid side effects)
          // Check what would be stored
          addTimeline('TOKEN_STORAGE_CHECK', { action: 'Checking storage capability' });
        }

      } catch (loginError: any) {
        probeResult.login.response = {
          status: loginError.response?.status || null,
          statusText: loginError.response?.statusText || null,
          success: false,
          error: loginError.message,
          data: loginError.response?.data,
        };

        addTimeline('LOGIN_REQUEST_FAILED', {
          status: loginError.response?.status,
          error: loginError.message,
          responseData: loginError.response?.data,
        });
      }

      // Step 2: Check post-login API calls (if login succeeded)
      if (probeResult.login.response.success && loginResponse?.data?.accessToken) {
        const testEndpoints = [
          '/auth/check',
          '/auth/me',
          '/users/me',
        ];

        for (const endpoint of testEndpoints) {
          addTimeline('POST_LOGIN_API_START', { endpoint });

          try {
            const response = await authClient.api.get(endpoint, {
              headers: {
                Authorization: `Bearer ${loginResponse.data.accessToken}`,
              },
            });

            probeResult.postLoginCalls.push({
              url: endpoint,
              status: response.status,
              success: true,
            });

            addTimeline('POST_LOGIN_API_SUCCESS', {
              endpoint,
              status: response.status,
            });
          } catch (apiError: any) {
            probeResult.postLoginCalls.push({
              url: endpoint,
              status: apiError.response?.status || null,
              success: false,
              error: apiError.message,
            });

            addTimeline('POST_LOGIN_API_FAILED', {
              endpoint,
              status: apiError.response?.status,
              error: apiError.message,
            });
          }
        }
      }

      // Step 3: Determine redirect behavior
      addTimeline('REDIRECT_ANALYSIS', { action: 'Analyzing redirect behavior' });

      if (probeResult.login.response.success) {
        const user = loginResponse?.data?.user;
        if (user?.role === 'admin' || user?.role === 'super_admin') {
          probeResult.redirect.wouldRedirectTo = '/admin';
        } else {
          probeResult.redirect.wouldRedirectTo = '/login (insufficient role)';
        }
      } else {
        probeResult.redirect.wouldRedirectTo = '/login (login failed)';
      }

      addTimeline('PROBE_COMPLETE', { success: probeResult.login.response.success });

    } catch (error: any) {
      addTimeline('PROBE_ERROR', { error: error.message });
    }

    probeResult.timeline = timelineRef.current;
    setResult(probeResult);
    setIsRunning(false);
  };

  const copyJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      alert('JSON이 클립보드에 복사되었습니다.');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          Admin Login Debug Probe
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          WO-DEBUG-ADMIN-LOGIN-MINIMAL-001 | 로그인 플로우 JSON 진단
        </p>
      </div>

      {/* Input Form */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          로그인 정보
        </h2>

        {/* 테스트 계정 버튼 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#6b7280' }}>
            테스트 계정 (클릭하면 자동 입력)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontWeight: '600' }}>{account.label}</span>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>{account.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <button
          onClick={runLoginProbe}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? '#9ca3af' : '#2563eb',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? 'Probing...' : 'Run Login Probe'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>
              Probe Result
            </h2>
            <button
              onClick={copyJson}
              style={{
                backgroundColor: '#10b981',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Copy JSON
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <SummaryCard
              title="Login"
              status={result.login.response.success}
              detail={`${result.login.response.status || 'N/A'}`}
            />
            <SummaryCard
              title="Token"
              status={result.auth.tokenReceived}
              detail={result.auth.tokenReceived ? 'Received' : 'Not Received'}
            />
            <SummaryCard
              title="Post-Login APIs"
              status={result.postLoginCalls.every(c => c.success)}
              detail={`${result.postLoginCalls.filter(c => c.success).length}/${result.postLoginCalls.length} OK`}
            />
            <SummaryCard
              title="Redirect"
              status={result.redirect.wouldRedirectTo === '/admin'}
              detail={result.redirect.wouldRedirectTo || 'Unknown'}
            />
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Timeline</h3>
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}>
              {result.timeline.map((entry, idx) => (
                <div key={idx} style={{
                  padding: '4px 0',
                  borderBottom: idx < result.timeline.length - 1 ? '1px solid #e5e7eb' : 'none',
                }}>
                  <span style={{ color: '#6b7280' }}>[{entry.elapsed}ms]</span>{' '}
                  <span style={{
                    color: entry.event.includes('FAILED') || entry.event.includes('ERROR') ? '#dc2626' : '#059669',
                    fontWeight: '500',
                  }}>
                    {entry.event}
                  </span>
                  {entry.data && (
                    <span style={{ color: '#9ca3af' }}> - {JSON.stringify(entry.data)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Full JSON */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Full JSON</h3>
            <pre style={{
              backgroundColor: '#1f2937',
              color: '#10b981',
              borderRadius: '6px',
              padding: '16px',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '400px',
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; status: boolean; detail: string }> = ({ title, status, detail }) => (
  <div style={{
    backgroundColor: status ? '#ecfdf5' : '#fef2f2',
    border: `1px solid ${status ? '#a7f3d0' : '#fecaca'}`,
    borderRadius: '6px',
    padding: '12px',
  }}>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{title}</div>
    <div style={{
      fontSize: '14px',
      fontWeight: '600',
      color: status ? '#059669' : '#dc2626',
    }}>
      {status ? '✓' : '✗'} {detail}
    </div>
  </div>
);

export default LoginDebugPage;
