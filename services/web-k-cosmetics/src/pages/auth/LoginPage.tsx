/**
 * LoginPage - K-Cosmetics
 * WO-O4O-KCOS-AUTH-DESIGN-POLISH-V1: inline style → Tailwind, hex → theme, Card 적용
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 서비스별 비밀번호(service_credentials) 로그인은 은퇴했다.
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1:
 *   플랫폼 이메일 계정 + Google(공통 <LoginMethods />). 성공하면 목적지로 이동한다 — 명시 목적지(`?returnTo` · state.from)가
 *   없으면 App PostLoginRedirect 와 같은 역할 기반 진입 화면(getKCosmeticsDashboardRoute, 일반 회원은 홈).
 *   목적지가 없을 때 화면이 "Google 계정을 확인하고 있습니다…" 에 멈추던 결함 수정. 이미 로그인했으면 바로 이동.
 */

import { useState } from 'react';
import { Navigate, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { LoginMethods } from '@o4o/auth-react';
import { useAuth, getKCosmeticsDashboardRoute, type User } from '@/contexts/AuthContext';
import { authClient } from '@/lib/apiClient';
import { Card } from '@o4o/ui';

/** 같은 앱 안의 경로만 허용한다(외부 · protocol-relative 차단). */
function safeReturnPath(raw: unknown): string | null {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading, loginWithEmail, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const explicitReturn = safeReturnPath(searchParams.get('returnTo') ?? (location.state as { from?: string } | null)?.from);
  const destinationFor = (roles: string[] | undefined) => explicitReturn ?? (getKCosmeticsDashboardRoute(roles ?? []) || '/');
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && isAuthenticated) return <Navigate to={destinationFor(user?.roles)} replace />;

  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 안내(서버 계약 복원 대기 — 분기 보존). 그 밖의 오류는 각 폼이 표시한다.
  const showNotMember = ({ code }: { code?: string }) => {
    setError(code === 'SERVICE_NOT_MEMBER' ? '이 계정은 K-Cosmetics 서비스 이용 권한이 없습니다. 이용 신청 후 승인되면 로그인할 수 있습니다.' : null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-6">
      <Card className="w-full max-w-[400px] p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2 mt-0">로그인</h1>
        <p className="text-sm text-slate-500 mb-8 mt-0">K-Cosmetics에 오신 것을 환영합니다</p>

        {error && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4 text-left">
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

        <div className="mb-6 text-left">
          <LoginMethods<User>
            loginWithEmail={loginWithEmail}
            api={authClient}
            onSuccess={(loggedIn) => { setError(null); navigate(destinationFor(loggedIn.roles), { replace: true }); }}
            onEmailFailure={showNotMember}
            google={{
              getConfig: getGoogleAuthConfig,
              loginWithGoogle,
              signupWithGoogle,
              onStart: () => setError(null),
              onError: showNotMember,
              termsHref: '/terms',
              privacyHref: '/privacy',
            }}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <Link to="/" className="text-sm font-medium text-primary no-underline hover:underline">홈으로 돌아가기</Link>
        </div>
      </Card>
    </div>
  );
}
