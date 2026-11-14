/**
 * 커뮤니티(community.neture.co.kr) 로그인 필수 — 2026-11-14 통합 담당 결정.
 *
 * O4O 는 사용자(로그인한 회원)만 이용한다.
 *   - 비로그인 방문자가 `/` 에 오면 커뮤니티 소개와 로그인 · 회원가입 안내만 보여 주고 로그인 창을 연다(콘텐츠는 보이지 않는다).
 *   - 그 밖의 커뮤니티 화면으로 오면 `/login` 으로 보내고, 로그인 뒤 원래 화면으로 돌아간다(LoginRedirect · returnUrl).
 *   - 계정이 없으면 로그인 창의 「Google 로 계속하기」나 `/signup` 에서 회원가입한다.
 * 약관 · 개인정보처리방침 · 문의는 가입 전에도 읽을 수 있어야 하므로 그대로 둔다.
 * 서버도 같은 경계를 지킨다(홈 · 편집 콘텐츠 · 영상 목록은 인증 필수, 공개 열람 API 는 410).
 */
import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { CURRENT_HOST_PROFILE, type HostProfile } from '../../lib/hostProfile';

const GUEST_PATHS = ['/terms', '/privacy', '/contact'] as const;

export type CommunityGateDecision = 'pass' | 'wait' | 'landing' | 'login';

export function communityGateDecision(
  profile: HostProfile,
  auth: { isAuthenticated: boolean; isLoading: boolean },
  pathname: string,
): CommunityGateDecision {
  if (profile !== 'community' || auth.isAuthenticated) return 'pass';
  if (GUEST_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return 'pass';
  // 세션 복구 전 isAuthenticated=false 를 비로그인으로 오판하지 않는다.
  if (auth.isLoading) return 'wait';
  return pathname === '/' ? 'landing' : 'login';
}

export function CommunityLoginLanding() {
  const { openLoginModal, isLoginModalOpen } = useLoginModal();
  // `/login` 에서 온 경우 LoginRedirect 가 돌아갈 주소와 함께 이미 열었다 — 다시 열어 주소를 지우지 않는다.
  useEffect(() => {
    if (!isLoginModalOpen) openLoginModal();
    // 처음 한 번만 연다. 방문자가 닫으면 아래 버튼으로 다시 연다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section aria-labelledby="community-login-title" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 id="community-login-title" className="text-2xl font-bold text-slate-900">커뮤니티</h1>
      <p className="mt-4 text-slate-700">
        O4O 회원이 함께 소식과 자료를 나누고 의견을 주고받는 공간입니다.
      </p>
      <p className="mt-2 text-slate-700">로그인한 회원만 이용할 수 있습니다.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => openLoginModal()}
          className="min-h-11 rounded-lg bg-emerald-700 px-6 font-semibold text-white"
        >
          로그인
        </button>
        <Link
          to="/signup"
          className="min-h-11 content-center rounded-lg border border-emerald-700 px-6 font-semibold text-emerald-800 no-underline"
        >
          회원가입
        </Link>
      </div>
      <p className="mt-4 text-sm text-slate-500">계정이 없으면 회원가입 후 바로 이용할 수 있습니다.</p>
    </section>
  );
}

export function CommunityLoginGate({ children, profile = CURRENT_HOST_PROFILE }: Readonly<{ children: ReactNode; profile?: HostProfile }>) {
  const auth = useAuth();
  const location = useLocation();
  const decision = communityGateDecision(profile, auth, location.pathname);
  if (decision === 'pass') return <>{children}</>;
  if (decision === 'wait') return <output className="block p-8 text-center text-slate-500">로그인 상태를 확인하고 있습니다…</output>;
  if (decision === 'landing') return <CommunityLoginLanding />;
  return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
}
