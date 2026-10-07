/**
 * LoginModal - 로그인 오버레이 모달
 * 현재 페이지 위에 오버레이로 표시되어 메뉴 등이 보임
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   서비스별 비밀번호(service_credentials) 로그인은 은퇴했다.
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1:
 *   이메일(로그인 ID)·비밀번호 로그인을 공통 <EmailLoginForm /> 으로 다시 둔다(단일 user_password_credentials).
 *   아래 회원가입 · 아이디 찾기 · 비밀번호 찾기는 별도 페이지(/signup · /find-id · /forgot-password)다.
 *   'Google 로 계속하기' 는 그대로 — 미등록 Google 계정은 같은 버튼에서 약관 동의 → 가입(Google 한정 안내).
 * WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1:
 *   아래 '체험하기' — Demo 버튼은 같은 `loginWithEmail` 을 호출한다(입력칸 미사용 · credential 화면 비노출 ·
 *   정의는 lib/demoAccounts.ts 한 곳). 성공 시 공급자 → /supplier/dashboard, 매장 경영자 → 홈 매장 버튼과 같은 handoff.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { GoogleContinue, EmailLoginForm } from '@o4o/auth-react';
import { authClient } from '../lib/apiClient';
import { useAuth } from '../contexts';
import type { User } from '../contexts/AuthContext';
import { DEMO_ACCOUNTS, DEMO_LOGIN_MESSAGES, demoLoginErrorMessage, type DemoAccountEntry, type DemoAccountType } from '../lib/demoAccounts';
import { resolveSingleStoreWorkspaceUrl } from '../lib/home-entry';
import { CURRENT_HOST_PROFILE, type HostProfile } from '../lib/hostProfile';

/**
 * 헤더 부제 — 이 모달은 main · supplier · funding · community 호스트가 함께 쓴다.
 * 대표 호스트는 전역 헤더 부제(NetureGlobalHeader)와 같은 O4O 정체성, 서브 호스트는 그 영역 이름.
 * WO-O4O-LOGIN-MODAL-GOOGLE-HINT-AND-HEADER-V1 (IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1 §9 선택 B · R3)
 */
const LOGIN_MODAL_SUBTITLE: Readonly<Record<HostProfile, string>> = Object.freeze({
  main: 'O4O 통합 업무 공간',
  supplier: '공급자 업무 공간',
  funding: '유통참여형 펀딩',
  community: '커뮤니티',
});

// WO-O4O-CROSSSERVICE-PRODUCTION-RESIDUAL-404-AUTH-AND-LEGAL-CLEANUP-V1:
//   App.tsx 의 동명 상수와 같은 값. App 이 LoginModal 을 import 하므로 역방향 import 는
//   순환이 된다 — 로컬 상수 패턴을 따른다.
const LOGIN_EXPLICIT_NAV_KEY = 'neture_login_explicit_nav';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

/** All user service hosts expose both public experience accounts. */
const VISIBLE_DEMO_ACCOUNTS = DEMO_ACCOUNTS;

export default function LoginModal({ isOpen, onClose, returnUrl }: LoginModalProps) {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1:
  //   서비스 미가입(SERVICE_NOT_MEMBER) 차단은 인증 실패와 시각적으로 구분한다.
  const [isNotMember, setIsNotMember] = useState(false);
  // WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1: Demo 진행 상태 — ref 는 같은 tick 의 중복 클릭 차단(버튼 disabled 와 이중 방어)
  const [demoBusy, setDemoBusy] = useState<DemoAccountType | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const demoBusyRef = useRef(false);

  // WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1: 다시 열 때 지난 오류가 남지 않게 한다(모달은 항상 mount).
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsNotMember(false);
    setDemoError(null);
  }, [isOpen]);

  // 매장 이동 뒤 뒤로가기(bfcache 복원)로 돌아오면 진행 표시를 푼다.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      demoBusyRef.current = false;
      setDemoBusy(null);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 배경 스크롤 방지
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // WO-O4O-NETURE-POSTLOGINREDIRECT-CANONICAL-ALIGNMENT-V1:
  // returnUrl만 LoginModal에서 처리. 역할 기반 redirect는 App.tsx PostLoginRedirect 담당.
  const handleLoginSuccess = () => {
    if (returnUrl && !returnUrl.startsWith('/workspace/')) {
      // WO-O4O-CROSSSERVICE-PRODUCTION-RESIDUAL-404-AUTH-AND-LEGAL-CLEANUP-V1:
      //   PostLoginRedirect 가 같은 auth 변화에 반응해 역할 대시보드로 덮어쓰지 않도록 표시한다.
      //   production 실측: 미인증 /operator → 로그인 → /admin 착지(원래 경로 복귀 실패).
      sessionStorage.setItem(LOGIN_EXPLICIT_NAV_KEY, '1');
      navigate(returnUrl);
    }
    onClose();
  };

  // 계정 도움말 링크 — 모달을 닫고 해당 페이지로 이동한다.
  const handleNavigate = (href: string) => {
    onClose();
    navigate(href);
  };

  const handleDemo = async (demo: DemoAccountEntry) => {
    if (demoBusyRef.current) return;
    demoBusyRef.current = true;
    setDemoBusy(demo.type);
    setDemoError(null);
    setError(null);
    setIsNotMember(false);
    const release = (message: string) => {
      setDemoError(message);
      demoBusyRef.current = false;
      setDemoBusy(null);
    };

    // PostLoginRedirect 가 같은 auth 변화에 반응해 역할 대시보드로 덮어쓰지 않도록 표시한다(handleLoginSuccess 와 같은 계약).
    sessionStorage.setItem(LOGIN_EXPLICIT_NAV_KEY, '1');
    const result = await loginWithEmail(demo.email, demo.password);
    if (!result.success || !result.user) {
      sessionStorage.removeItem(LOGIN_EXPLICIT_NAV_KEY);
      release(demoLoginErrorMessage(result));
      return;
    }

    if (CURRENT_HOST_PROFILE === 'funding' || CURRENT_HOST_PROFILE === 'community') {
      navigate(returnUrl || '/');
      demoBusyRef.current = false;
      setDemoBusy(null);
      onClose();
      return;
    }

    if (demo.landing.kind === 'internal') {
      navigate(demo.landing.to);
      demoBusyRef.current = false;
      setDemoBusy(null);
      onClose();
      return;
    }

    // 매장 경영자: 홈 매장 버튼과 같은 handoff 로 Store Workspace 에 바로 들어간다.
    //   로그인은 이미 성공했다 — 이동만 실패한 경우를 로그인 실패와 구분해 안내한다.
    try {
      window.location.assign(await resolveSingleStoreWorkspaceUrl(result.user));
      // 성공 시 현재 탭이 대상 서비스로 이동한다 — busy 는 pageshow(복원) 에서 푼다.
    } catch {
      release(DEMO_LOGIN_MESSAGES.storeMove);
    }
  };

  const handleGoToApply = () => {
    onClose();
    navigate('/contact');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 반투명 배경 - 뒤의 콘텐츠가 보임 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 모달 카드 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Neture 로그인</h2>
              <p className="text-xs text-gray-500">{LOGIN_MODAL_SUBTITLE[CURRENT_HOST_PROFILE]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
              {/* WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1: 이메일 + 비밀번호 로그인(공통 폼) */}
              <EmailLoginForm<User>
                onLogin={loginWithEmail}
                api={authClient}
                onSuccess={() => { setError(null); setIsNotMember(false); handleLoginSuccess(); }}
                links={{ signup: '/signup', findId: '/find-id', forgotPassword: '/forgot-password', onNavigate: handleNavigate }}
              />

              <div className="my-6 flex items-center gap-3 text-xs text-gray-400" aria-hidden>
                <span className="h-px flex-1 bg-gray-200" />
                또는
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              {/* WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기 — 미등록이면 약관 동의 → 계정 생성 */}
              <div className="mb-4">
                <GoogleContinue<User>
                  getConfig={getGoogleAuthConfig}
                  loginWithGoogle={loginWithGoogle}
                  signupWithGoogle={signupWithGoogle}
                  onSuccess={() => { setError(null); setIsNotMember(false); handleLoginSuccess(); }}
                  onStart={() => { setError(null); setIsNotMember(false); }}
                  onError={({ code }) => {
                    // 일반 오류는 Google 버튼 영역이 이미 표시한다(중복 표시 방지). 서비스 미가입 안내만 여기서 더한다.
                    const notMember = code === 'SERVICE_NOT_MEMBER';
                    setIsNotMember(notMember);
                    setError(notMember ? '이 계정은 Neture 서비스 이용 권한이 없습니다. Neture 이용 신청 후 승인되면 로그인할 수 있습니다.' : null);
                  }}
                  termsHref="/terms"
                  privacyHref="/privacy"
                  hint={
                    // 이 안내는 Google 버튼에만 해당한다 — 이메일 가입은 위 '회원가입' 페이지에서 한다.
                    // 버튼이 보일 때만 렌더된다(준비 중이면 숨김).
                    <p className="text-center text-xs text-gray-500">
                      Google 로 처음이신가요? 같은 Google 버튼으로 약관 동의 후 계정이 만들어집니다.
                    </p>
                  }
                />
              </div>

              {/* WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 안내 + 신청 링크 */}
              {error && (
                isNotMember ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                    <p className="text-sm text-amber-800">{error}</p>
                    <button
                      type="button"
                      onClick={handleGoToApply}
                      className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Neture 이용 신청하기
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )
              )}

              {/* WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1: 체험하기 — 로그인 수단보다 앞세우지 않는다 */}
              <section aria-labelledby="demo-entry-title" className="mt-6">
                <div className="mb-3 flex items-center gap-3 text-xs text-gray-400">
                  <span className="h-px flex-1 bg-gray-200" aria-hidden />
                  <h3 id="demo-entry-title" className="m-0 text-xs font-normal text-gray-400">체험하기</h3>
                  <span className="h-px flex-1 bg-gray-200" aria-hidden />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {VISIBLE_DEMO_ACCOUNTS.map((demo) => (
                    <button
                      key={demo.type}
                      type="button"
                      onClick={() => void handleDemo(demo)}
                      disabled={demoBusy !== null}
                      aria-busy={demoBusy === demo.type}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {demoBusy === demo.type ? '체험 준비 중...' : demo.label}
                    </button>
                  ))}
                </div>
                {demoError && (
                  <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {demoError}
                  </p>
                )}
              </section>
        </div>
      </div>
    </div>
  );
}
