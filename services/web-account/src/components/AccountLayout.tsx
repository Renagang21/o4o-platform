/**
 * Account Center Layout
 * 인증 상태에 따라 대시보드 또는 진입 안내 표시
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   자체 email/password 로그인 폼과 `/auth/login` 호출을 제거했다.
 *   web-account 는 `O4O-MYPAGE-CANONICAL-V1`(Option D) 상 **최소 계정센터**로 고정돼 있고
 *   담당 범위는 "내 서비스 목록 + active 서비스 열기(Handoff outbound)" 뿐이다 —
 *   인증 진입점이 아니다. 세션은 다른 서비스에서 `/handoff?token=…`(cookie 교환) 으로 들어온다.
 *   따라서 미인증 상태에서는 로그인 폼 대신 대표 진입점으로 보낸다(Google 로그인은 그쪽 정본 화면이 담당).
 */

import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/** 대표 진입점 — 여기서 Google 로 로그인한 뒤 서비스에서 계정센터로 handoff 한다. */
const CANONICAL_ENTRY_URL = import.meta.env.VITE_CANONICAL_ENTRY_URL || 'https://neture.co.kr';

export default function AccountLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">O4O Account Center</h1>
          <p className="text-sm text-gray-500 mb-6">
            서비스 계정을 관리하고 서비스를 이동합니다.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            로그인 세션이 없습니다. O4O 대표 진입점에서 Google 계정으로 로그인한 뒤 다시 들어와 주세요.
          </p>
          <a
            href={CANONICAL_ENTRY_URL}
            className="inline-block w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            data-testid="account-center-canonical-entry"
          >
            O4O 로그인 화면으로 이동
          </a>
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
