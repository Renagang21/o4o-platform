/**
 * Account Center Layout
 * 인증 상태에 따라 대시보드 또는 로그인 폼 표시
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import ServiceSwitcher from './ServiceSwitcher';
import { useAuth } from '../contexts/AuthContext';

export default function AccountLayout() {
  const { user, isAuthenticated, isLoading, login, passwordSync, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  // Password sync state
  const [syncMode, setSyncMode] = useState(false);
  const [syncToken, setSyncToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      if (result.passwordSyncAvailable && result.syncToken) {
        setSyncMode(true);
        setSyncToken(result.syncToken);
        setLoginError('비밀번호가 일치하지 않습니다. 새 비밀번호를 설정해주세요.');
        setLoginLoading(false);
        return;
      }
      setLoginError(result.error || '로그인에 실패했습니다.');
    }
    setLoginLoading(false);
  };

  const handlePasswordSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (newPassword !== confirmPassword) {
      setLoginError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      setLoginError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await passwordSync(email, syncToken, newPassword);
      if (!result.success) {
        setLoginError(result.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch {
      setLoginError('비밀번호 변경에 실패했습니다.');
    }
    setLoginLoading(false);
  };

  const resetToLogin = () => {
    setSyncMode(false);
    setSyncToken('');
    setNewPassword('');
    setConfirmPassword('');
    setLoginError('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">O4O Account Center</h1>
          <p className="text-sm text-center text-gray-500 mb-6">
            {syncMode ? '새 비밀번호를 설정합니다' : '서비스 계정을 관리하고 서비스를 이동합니다.'}
          </p>

          {syncMode ? (
            <form onSubmit={handlePasswordSync} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">{loginError}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  이 비밀번호는 O4O 전체 서비스에 적용됩니다.
                </p>
              </div>

              <div>
                <label htmlFor="syncEmail" className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  id="syncEmail"
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="새 비밀번호 입력 (6자 이상)"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loginLoading ? '변경 중...' : '비밀번호 변경 및 로그인'}
              </button>

              <button
                type="button"
                onClick={resetToLogin}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                로그인으로 돌아가기
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="비밀번호 입력"
                  required
                />
              </div>

              {loginError && (
                <p className="text-sm text-red-600">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loginLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">O4O Account Center</h1>
          <div className="flex items-center gap-4">
            <ServiceSwitcher currentServiceKey="account" />
            <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
