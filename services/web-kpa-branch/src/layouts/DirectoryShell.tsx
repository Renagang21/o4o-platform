/**
 * DirectoryShell — 공용 도메인 `/`(분회 찾기)의 헤더 · 푸터
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1
 *
 * `/` 는 BranchLayout 밖이라 헤더 · 푸터 없이 목록만 보였다. KPA 정체성(약사회 분회)은 그대로 두고,
 * 첫 탐색(분회 찾기 · 가입 신청 · 내 분회) · 로그인 진입 · 작은 O4O 홈 유틸리티를 둔다.
 * 마케팅 Hero 는 두지 않는다 — 분회 찾기가 이 화면의 업무다.
 */
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { O4OHomeButton, O4O_LOGOUT_LABEL } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';
import { BRAND } from '../config/service';
import LoginLink from '../components/LoginLink';

const NAV = [
  { to: '/', label: '분회 찾기', end: true },
  { to: '/join', label: '가입 신청', end: false },
  { to: '/me', label: '내 분회', end: false },
];

export default function DirectoryShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200" data-testid="directory-header">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded bg-primary-600 text-sm font-bold text-white">
              분회
            </span>
            <span className="text-lg font-semibold text-gray-900">{BRAND.nameKo}</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} className="o4o-home-link" />
            {!isLoading && (isAuthenticated ? (
              <button type="button" onClick={logout} className="text-gray-500 hover:text-gray-900">{O4O_LOGOUT_LABEL}</button>
            ) : (
              <LoginLink className="text-gray-600 hover:text-gray-900">로그인</LoginLink>
            ))}
          </div>
        </div>
        <nav aria-label="분회 서비스" className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-1 px-4 pb-3 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => (isActive ? 'font-semibold text-primary-700' : 'text-gray-600 hover:text-gray-900')}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 bg-gray-50" data-testid="directory-footer">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500">
          <p>
            <span className="font-medium text-gray-700">{BRAND.nameKo}</span> · {BRAND.tagline}
          </p>
          <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} className="text-gray-500 hover:text-gray-900" />
        </div>
      </footer>
    </div>
  );
}
