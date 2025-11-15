/**
 * Login Debug Test Page
 * 로그인 과정의 각 단계를 추적하고 문제를 진단하는 페이지
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  data?: any;
}

export default function LoginDebugPage() {
  const [email, setEmail] = useState('test-supplier@neture.co.kr');
  const [password, setPassword] = useState('test123!@#');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const { user, login, logout, isAuthenticated } = useAuth();

  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    setLogs((prev) => [...prev, entry]);
    console.log(`[${level.toUpperCase()}]`, message, data || '');
  };

  useEffect(() => {
    addLog('info', '페이지 로드됨');
    addLog('info', '현재 인증 상태', { isAuthenticated, user });
    addLog('info', 'localStorage 토큰 확인', {
      token: localStorage.getItem('token'),
      refreshToken: localStorage.getItem('refreshToken'),
    });
  }, []);

  useEffect(() => {
    addLog('info', '인증 상태 변경됨', { isAuthenticated, user });
  }, [isAuthenticated, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLogs([]);

    try {
      addLog('info', '로그인 시작', { email });

      // Step 1: API 호출 전
      addLog('info', 'Step 1: API 호출 준비');

      // Step 2: authClient를 통한 로그인
      addLog('info', 'Step 2: login() 함수 호출');
      const result = await login(email, password);

      addLog('success', 'Step 3: login() 응답 받음', result);

      // Step 4: 토큰 저장 확인
      addLog('info', 'Step 4: 토큰 저장 확인', {
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
      });

      // Step 5: 인증 상태 확인
      addLog('info', 'Step 5: 인증 상태 확인', {
        isAuthenticated,
        user,
      });

      addLog('success', '로그인 성공!', result);
    } catch (error: any) {
      addLog('error', '로그인 실패', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      addLog('info', '로그아웃 시작');
      await logout();
      addLog('success', '로그아웃 완료');
    } catch (error: any) {
      addLog('error', '로그아웃 실패', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const checkAuthState = () => {
    addLog('info', '현재 인증 상태 체크', {
      isAuthenticated,
      user,
      token: localStorage.getItem('token'),
      refreshToken: localStorage.getItem('refreshToken'),
    });
  };

  const testApiCall = async () => {
    try {
      addLog('info', '테스트 API 호출 시작');
      const response = await fetch('https://api.neture.co.kr/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      addLog(response.ok ? 'success' : 'error', 'API 응답', {
        status: response.status,
        data,
      });
    } catch (error: any) {
      addLog('error', 'API 호출 실패', error);
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">🔍 Login Debug Test Page</h1>
          <p className="text-gray-600 mb-4">
            로그인 과정의 각 단계를 추적하고 문제를 진단합니다.
          </p>

          {/* Current Auth Status */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">현재 인증 상태</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium">isAuthenticated:</span>{' '}
                <span
                  className={`ml-2 px-2 py-1 rounded ${
                    isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isAuthenticated ? 'true' : 'false'}
                </span>
              </div>
              <div>
                <span className="font-medium">User:</span>
                <pre className="mt-1 p-2 bg-white rounded text-xs">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '로그인 중...' : '로그인 테스트'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                로그아웃
              </button>
              <button
                type="button"
                onClick={checkAuthState}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                인증 상태 확인
              </button>
              <button
                type="button"
                onClick={testApiCall}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                /auth/me API 호출
              </button>
            </div>
          </form>

          {/* Logs */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">실행 로그</h2>
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                로그 지우기
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">로그가 없습니다.</p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${getLevelColor(log.level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('ko-KR', {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              fractionalSecondDigits: 3,
                            })}
                          </span>
                          <span className="text-xs font-bold uppercase">{log.level}</span>
                        </div>
                        <div className="font-medium mb-1">{log.message}</div>
                        {log.data && (
                          <pre className="text-xs bg-white bg-opacity-50 rounded p-2 mt-2 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📖 사용 방법</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>위의 로그인 폼에 이메일과 비밀번호를 입력합니다.</li>
            <li>"로그인 테스트" 버튼을 클릭합니다.</li>
            <li>아래 실행 로그를 확인하여 각 단계별 진행 상황을 파악합니다.</li>
            <li>"인증 상태 확인" 버튼으로 현재 상태를 확인할 수 있습니다.</li>
            <li>"/auth/me API 호출" 버튼으로 토큰이 유효한지 확인할 수 있습니다.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
