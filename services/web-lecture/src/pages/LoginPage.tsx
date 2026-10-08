/**
 * O4O 강의 로그인 — 이 앱은 자체 로그인 화면이 없다. 계정 센터(Neture)에서 로그인한 뒤 handoff 로 돌아온다.
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1:
 *   `https://neture.co.kr/service-entry/lecture?returnPath=<원래 경로>` → (로그인) → 기존 handoff → 이 앱 /handoff → 원래 경로.
 *   예전에는 Neture 홈으로만 보내 돌아올 길이 없었다.
 */
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { DemoLoginButtons } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';

const ACCOUNT_CENTER_ENTRY = 'https://neture.co.kr/service-entry/lecture';

function safeReturnPath(raw: unknown): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/';
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, loginWithEmail } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnPath = safeReturnPath(searchParams.get('returnTo') ?? (location.state as { from?: string } | null)?.from);

  if (!isLoading && isAuthenticated) return <Navigate to={returnPath} replace />;
  const entryUrl = `${ACCOUNT_CENTER_ENTRY}?returnPath=${encodeURIComponent(returnPath)}`;
  return <main className="center-card"><section className="card">
    <h1>O4O 강의 로그인</h1>
    <p>O4O 계정은 Neture 에서 통합 관리합니다. Neture 에서 로그인하면 이 화면으로 돌아옵니다.</p>
    <a className="button-link" href={entryUrl} data-testid="lecture-login-entry">Neture 에서 로그인하고 계속하기</a>
    <DemoLoginButtons loginWithEmail={loginWithEmail} onSuccess={() => window.location.assign(returnPath)} />
  </section></main>;
}
