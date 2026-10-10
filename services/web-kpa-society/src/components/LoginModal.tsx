/**
 * LoginModal - KPA Society 로그인 모달
 *
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 서비스별 비밀번호(service_credentials) 로그인은 은퇴했다.
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1:
 *   플랫폼 이메일 계정 로그인 + Google 로 계속하기(공통 <LoginMethods />). 가입 · 아이디/비밀번호 찾기는
 *   계정 센터(Neture) 정식 화면. 오류는 각 폼이 표시하고, 여기서는 서비스 미가입(SERVICE_NOT_MEMBER) 안내만 더한다.
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 미가입 응답에 `serviceAccess`(Neture 약국 · 세미프랜차이즈 상태)가 있으면
 *   서버 문구와 상태별 신청 링크(store.neture.co.kr)를 보인다. 정지 상태는 링크 없이 문구(운영자 문의)만.
 *
 * 원칙:
 * - 로그인은 항상 모달로만 수행
 * - 로그인 성공 후 역할 기반 진입 화면 또는 콜백(현재 화면 유지)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { O4OHomeButton, LoginMethods, type AuthLoginResult, type AuthServiceAccess } from '@o4o/auth-react';
import { useAuth, authClient, type User } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import { getKpaPostLoginRoute } from '../config/dashboard';
import { semiFranchiseAccessLink, type SemiFranchiseAccessLink } from '../lib/semiFranchiseAccess';

export default function LoginModal() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, loginWithGoogle, loginWithEmail, signupWithGoogle, getGoogleAuthConfig, loginWithKakao, signupWithKakao } = useAuth();
  const { activeModal, closeModal, onLoginSuccess } = useAuthModal();
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 차단은 일반 오류와 분리 표시
  const [isNotMember, setIsNotMember] = useState(false);
  const [accessLink, setAccessLink] = useState<SemiFranchiseAccessLink | null>(null);

  const isOpen = activeModal === 'login';

  // ESC 키로 닫기 + 배경 스크롤 방지
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsNotMember(false);
      setAccessLink(null);
    }
  }, [isOpen]);

  /** 로그인 성공 후처리: 모달 닫기 → 콜백 또는 역할 기반 진입 화면. */
  const finishLogin = (loggedInUser: User) => {
    try {
      closeModal();
      if (onLoginSuccess) {
        onLoginSuccess();
        return;
      }
      // WO-O4O-PHARMACY-MEMBER-HOME-V1: 회원 초기화면·운영 역할별 기본 진입
      // 매핑 SSOT: config/dashboard.ts (getKpaPostLoginRoute / KPA_DASHBOARD_MAP).
      const redirectTo = getKpaPostLoginRoute(loggedInUser);
      if (redirectTo) {
        navigate(redirectTo);
      }
    } catch (err: unknown) {
      console.error('[Login] Post-login error:', err);
      setError('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  /** 서비스 미가입만 여기서 안내한다 — 그 밖의 오류는 각 폼이 이미 표시한다(중복 표시 방지). */
  const showNotMember = ({ code, error: emailError, message: googleError, serviceAccess }: { code?: string; error?: string; message?: string; serviceAccess?: AuthServiceAccess }) => {
    const serverError = emailError ?? googleError;
    const notMember = code === 'SERVICE_NOT_MEMBER';
    setIsNotMember(notMember);
    setAccessLink(notMember ? semiFranchiseAccessLink(serviceAccess?.next) : null);
    if (!notMember) {
      setError(null);
    } else if (serviceAccess && serverError) {
      setError(serverError);
    } else {
      setError('이 계정은 이 약국 서비스에 가입되어 있지 않습니다. 서비스 이용 절차를 진행해 주세요.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      {/* 반투명 배경 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 모달 카드 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                O4O 약국 로그인
              </h2>
              {/* 이 앱(pharmacy.neture.co.kr)은 약국 사업자 서비스다 — O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1 */}
              <p className="text-xs text-gray-500">
                약국 사업자 서비스
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && !isNotMember && (
            <div className="mb-4 p-3 rounded-lg border bg-red-50 border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {/* WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 안내 */}
          {isNotMember && error && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">{error}</p>
              {accessLink && (
                <a href={accessLink.href} className="mt-2 inline-block text-sm font-medium text-amber-900 underline">
                  {accessLink.label} →
                </a>
              )}
            </div>
          )}

          <LoginMethods<User>
            loginWithEmail={loginWithEmail}
            api={authClient}
            onSuccess={(loggedInUser) => { setError(null); setIsNotMember(false); setAccessLink(null); finishLogin(loggedInUser); }}
            onEmailFailure={(result: AuthLoginResult<User>) => showNotMember(result)}
            kakao={{ client: authClient, loginWithKakao, signupWithKakao, returnTo: new URLSearchParams(window.location.search).get('returnTo') ?? '/' }}
          google={{
              getConfig: getGoogleAuthConfig,
              loginWithGoogle,
              signupWithGoogle,
              onStart: () => { setError(null); setIsNotMember(false); setAccessLink(null); },
              onError: showNotMember,
              termsHref: '/policy',
              privacyHref: '/privacy',
            }}
          />
          <div className="mt-5 border-t pt-4"><O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} className="o4o-home-link" /></div>
        </div>
      </div>
    </div>
  );
}
