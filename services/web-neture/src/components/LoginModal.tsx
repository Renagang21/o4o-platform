/**
 * LoginModal - 로그인 오버레이 모달
 * 현재 페이지 위에 오버레이로 표시되어 메뉴 등이 보임
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   로그인 수단은 'Google 로 계속하기' 하나다. 이메일/비밀번호 입력 · 비밀번호 찾기 ·
 *   별도 회원가입 모달은 은퇴했다(미등록 Google 계정은 같은 버튼에서 약관 동의 → 가입).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth } from '../contexts';
import type { User } from '../contexts/AuthContext';

// WO-O4O-CROSSSERVICE-PRODUCTION-RESIDUAL-404-AUTH-AND-LEGAL-CLEANUP-V1:
//   App.tsx 의 동명 상수와 같은 값. App 이 LoginModal 을 import 하므로 역방향 import 는
//   순환이 된다 — 로컬 상수 패턴을 따른다.
const LOGIN_EXPLICIT_NAV_KEY = 'neture_login_explicit_nav';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

export default function LoginModal({ isOpen, onClose, returnUrl }: LoginModalProps) {
  const navigate = useNavigate();
  const { loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1:
  //   서비스 미가입(SERVICE_NOT_MEMBER) 차단은 인증 실패와 시각적으로 구분한다.
  const [isNotMember, setIsNotMember] = useState(false);

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
              <p className="text-xs text-gray-500">공급자 연결 서비스</p>
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
              {/* WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기(기본) — 미등록이면 약관 동의 → 계정 생성 */}
              <div className="mb-6">
                <GoogleContinue<User>
                  getConfig={getGoogleAuthConfig}
                  loginWithGoogle={loginWithGoogle}
                  signupWithGoogle={signupWithGoogle}
                  onSuccess={() => { setError(null); setIsNotMember(false); handleLoginSuccess(); }}
                  onStart={() => { setError(null); setIsNotMember(false); }}
                  onError={({ message, code }) => {
                    const notMember = code === 'SERVICE_NOT_MEMBER';
                    setIsNotMember(notMember);
                    setError(
                      notMember
                        ? '이 계정은 Neture 서비스 이용 권한이 없습니다. Neture 이용 신청 후 승인되면 로그인할 수 있습니다.'
                        : message,
                    );
                  }}
                  termsHref="/terms"
                  privacyHref="/privacy"
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

              <p className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
                처음이신가요? 같은 버튼으로 약관 동의 후 계정이 만들어집니다.
              </p>
        </div>
      </div>
    </div>
  );
}
