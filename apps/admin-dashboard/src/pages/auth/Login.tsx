/**
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기 = 기본 진입.
 * Admin 은 가입을 제공하지 않는다 — 미등록 Google 계정(GOOGLE_SIGNUP_REQUIRED)은 서비스 화면 가입 안내만.
 *
 * WO §15-4(2026-09-22 · 관리자 Google 연결 완료 후): **이메일/비밀번호 로그인 UI 와 [비밀번호 찾기] 진입을 제거**했다.
 *   Admin 의 로그인 수단은 Google 하나다. 서버의 password 로그인 경로 자체는 다른 surface 를 위해 남아 있고,
 *   관리자 user 의 `users.password` 는 NULL 로 폐기했다(1행 · 사용자 승인).
 *
 * WO §15 — 관리자 Google 최초 연결(1회): 연결 전에는 관리자 계정으로 로그인할 수단이 없으므로,
 *   일회용 연결 코드를 입력한 상태에서 Google 계정을 선택하면 같은 ID token 이 로그인 대신
 *   `POST /auth/google/bootstrap-admin` 으로 간다. 대상 users.id 는 서버가 platform:super_admin 으로
 *   결정하며(클라이언트 지정 불가 · email 무관), 연결 성공 후에는 서버가 재사용을 거절한다.
 *   GIS 버튼은 하나만 둔다 — 같은 페이지에서 두 번 initialize 하면 마지막 callback 만 살아남는다.
 */
import { FC, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import { renderGoogleButton } from '@o4o/auth-client';
import { authClient } from '@/lib/api';
import toast from 'react-hot-toast';

type GoogleStage = 'loading' | 'disabled' | 'ready';

const Login: FC = () => {
  
  const { loginWithGoogle, getGoogleAuthConfig, isAuthenticated, error, clearError, isAdmin } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Google 진입: config → GIS 버튼 → ID token → loginWithGoogle (로그인만)
  const [googleStage, setGoogleStage] = useState<GoogleStage>('loading');
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const googleContainerRef = useRef<HTMLDivElement>(null);

  // WO §15 — 관리자 Google 최초 연결(1회). 코드가 입력돼 있으면 credential 은 bootstrap 으로 간다.
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [bootstrapCode, setBootstrapCode] = useState('');
  // GIS callback 은 mount 시 고정되므로 최신 코드값은 ref 로 읽는다.
  const bootstrapCodeRef = useRef('');
  bootstrapCodeRef.current = bootstrapCode;

  useEffect(() => {
    let alive = true;
    getGoogleAuthConfig()
      .then((cfg) => {
        if (!alive) return;
        setGoogleClientId(cfg.enabled ? cfg.clientId : null);
        setGoogleStage(cfg.enabled && cfg.clientId ? 'ready' : 'disabled');
      })
      .catch(() => { if (alive) setGoogleStage('disabled'); });
    return () => { alive = false; };
  }, [getGoogleAuthConfig]);

  useEffect(() => {
    if (googleStage !== 'ready' || !googleClientId || !googleContainerRef.current) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void renderGoogleButton({
      clientId: googleClientId,
      container: googleContainerRef.current,
      onCredential: (idToken) => { void handleGoogleCredential(idToken); },
      onError: (err) => toast.error(err.message || 'Google 버튼을 불러오지 못했습니다.'),
    }).then((fn) => { if (disposed) fn(); else cleanup = fn; });
    return () => { disposed = true; cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleStage, googleClientId]);

  // 리다이렉트 URL 처리
  const redirectUrl = searchParams.get('redirect') || '/admin';
  const fromLocation = (location.state as any)?.from || redirectUrl;

  // 이미 인증된 관리자는 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      toast.success('이미 로그인되어 있습니다.');
    }
  }, [isAuthenticated, isAdmin]);

  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to={fromLocation} replace />;
    } else {
      // 일반 사용자가 관리자 페이지에 접근하려는 경우
      return (
        <div className="min-h-screen bg-o4o-bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-6 text-center text-3xl font-bold text-o4o-text-primary">
                접근 권한 없음
              </h2>
              <p className="mt-2 text-center text-sm text-o4o-text-secondary">
                관리자 권한이 필요합니다
              </p>
              <div className="mt-4">
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-admin-blue hover:text-admin-blue-dark"
                >
                  메인 사이트로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  /** 일회용 코드가 있으면 로그인 대신 연결(bootstrap). 성공 후 코드를 비우고 Google 로그인으로 안내한다. */
  const handleBootstrapCredential = async (idToken: string, code: string) => {
    try {
      await authClient.bootstrapAdminGoogle(idToken, code);
      setBootstrapCode('');
      setBootstrapOpen(false);
      toast.success('Google 계정이 관리자 계정에 연결되었습니다. 이제 [Google로 계속하기] 로 로그인하세요.');
    } catch (error: any) {
      const code2 = error?.response?.data?.code;
      const message =
        code2 === 'GOOGLE_ADMIN_BOOTSTRAP_CODE_INVALID' ? '연결 코드가 올바르지 않습니다.'
        : code2 === 'GOOGLE_ACCOUNT_ALREADY_LINKED' ? '이미 Google 계정이 연결되어 있습니다. [Google로 계속하기] 로 로그인하세요.'
        : code2 === 'GOOGLE_IDENTITY_IN_USE' ? '이 Google 계정은 이미 다른 사용자에게 연결되어 있습니다.'
        : error?.response?.status === 404 ? '지금은 연결을 진행할 수 없습니다.'
        : error?.response?.status === 429 ? '시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'
        : (error?.response?.data?.error || 'Google 계정 연결에 실패했습니다.');
      toast.error(message);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    clearError();
    const code = bootstrapCodeRef.current.trim();
    if (code) {
      await handleBootstrapCredential(idToken, code);
      return;
    }
    try {
      await loginWithGoogle(idToken, 'neture');
      toast.success('관리자 로그인 성공!');
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      const serverMessage = error?.response?.data?.error;
      let errorMessage = 'Google 로그인에 실패했습니다.';
      if (errorCode === 'GOOGLE_SIGNUP_REQUIRED') {
        errorMessage = '이 Google 계정은 아직 O4O 에 등록되지 않았습니다. 서비스 화면에서 먼저 계정을 만들어 주세요.';
      } else if (errorCode === 'ACCOUNT_NOT_ACTIVE') {
        errorMessage = '계정이 비활성화되었습니다. 관리자에게 문의하세요.';
      } else if (errorCode === 'GOOGLE_ID_TOKEN_INVALID') {
        errorMessage = 'Google 인증에 실패했습니다. 다시 시도해 주세요.';
      } else if (error?.response?.status === 429) {
        errorMessage = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
      } else if (serverMessage) {
        errorMessage = serverMessage;
      }
      toast.error(errorMessage);
      clearError();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto space-y-6 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>
        {/* 헤더 */}
        <div className="relative text-center">
          <div className="inline-flex h-16 w-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl items-center justify-center shadow-lg mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            O4O Admin
          </h2>
          <p className="mt-2 text-sm text-blue-200">
            관리자 계정으로 로그인하세요
          </p>
          <p className="mt-1 text-xs text-green-400 font-bold">
            ✅ 배포 테스트 v3.0 - {new Date().toLocaleString('ko-KR')}
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Google 로 계속하기 — 기본 진입 */}
          <div className="mb-6">
            {googleStage === 'loading' && (
              <p className="text-center text-sm text-blue-200">Google 로그인을 준비하고 있습니다…</p>
            )}
            {googleStage === 'disabled' && (
              <p className="text-center text-sm text-blue-200" data-testid="google-continue-disabled">Google 로그인은 준비 중입니다.</p>
            )}
            {googleStage === 'ready' && (
              <div ref={googleContainerRef} className="flex justify-center min-h-[44px]" data-testid="google-continue-button" />
            )}
            {/* WO §15 — 관리자 Google 최초 연결(1회). 코드 입력 후 위 Google 버튼으로 계정을 선택한다. */}
            {googleStage === 'ready' && (
              <div className="mt-3 text-center">
                {!bootstrapOpen ? (
                  <button
                    type="button"
                    onClick={() => setBootstrapOpen(true)}
                    className="text-xs text-blue-200 underline hover:text-white"
                    data-testid="admin-bootstrap-open"
                  >
                    관리자 Google 최초 연결(1회)
                  </button>
                ) : (
                  <div className="space-y-2 text-left" data-testid="admin-bootstrap-panel">
                    <p className="text-xs text-blue-200">
                      일회용 연결 코드를 입력한 뒤 위 [Google로 계속하기] 에서 연결할 계정을 선택하세요.
                    </p>
                    <input
                      type="text"
                      value={bootstrapCode}
                      onChange={(e) => setBootstrapCode(e.target.value)}
                      placeholder="일회용 연결 코드"
                      autoComplete="off"
                      aria-label="일회용 연결 코드"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => { setBootstrapCode(''); setBootstrapOpen(false); }}
                      className="text-xs text-blue-200 underline hover:text-white"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* WO §15-4: 이메일/비밀번호 로그인 UI 제거 — Admin 의 유일한 로그인 수단은 Google 이다.
              서버의 password 경로는 다른 surface(전환기 서비스 로그인)를 위해 남아 있으나 Admin 화면은 노출하지 않는다. */}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 하단 링크 */}
        <div className="text-center">
          <a 
            href="/"
            className="text-sm text-blue-300 hover:text-white transition-colors"
          >
            메인 사이트로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;