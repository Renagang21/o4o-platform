/**
 * 로그인 — O4O 공통 Google 진입 재사용(새 인증 방식 0 · password 진입 없음).
 *
 * 로그인 없이도 되는 일(홈 · 원내 파일 연결 · 원내 보유 조회)은 그대로 열려 있다. 로그인이 필요한 것은
 * 서버 AI 기능(조사 · 파일 이해)뿐이며, 그 화면들은 요청을 버리지 않고 제자리에서 로그인할 수 있다.
 */
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BRAND } from '../config/service';
import { useAuth } from '../contexts/AuthContext';
import LoginPanel from '../components/LoginPanel';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/';
  if (isAuthenticated) return <Navigate to={returnTo} replace />;
  return (
    <section className="card">
      <h1>{BRAND.name} 로그인</h1>
      <p>
        O4O 계정(Google)으로 로그인하면 조사 · 파일 이해 같은 서버 AI 기능을 쓸 수 있습니다.
        원내 보유 조회는 로그인 없이도 됩니다.
      </p>
      <LoginPanel onSuccess={() => navigate(returnTo, { replace: true })} />
    </section>
  );
}
