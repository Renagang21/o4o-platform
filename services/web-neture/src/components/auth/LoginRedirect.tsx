import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { resolveLoginReturnPath } from '../../lib/loginReturnPath';
import { CURRENT_HOST_PROFILE } from '../../lib/hostProfile';

// Open login after session restoration; only public homes can receive unauthenticated redirects.
export function LoginRedirect() {
  const { openLoginModal } = useLoginModal();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const returnUrl = resolveLoginReturnPath(location.state, location.search);

  // WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1: 이미 로그인했으면 모달 없이 목적지로.
  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    openLoginModal(returnUrl || undefined);
  }, [openLoginModal, returnUrl, isAuthenticated, isLoading]);

  if (isLoading) return null; // 세션 확인 전에는 이동하지 않는다(이동하면 모달을 열 기회가 사라진다)
  if (isAuthenticated) return <Navigate to={returnUrl || '/'} replace />;
  // These homes require authentication; redirecting there would immediately return to /login.
  if (CURRENT_HOST_PROFILE === 'supplier' || CURRENT_HOST_PROFILE === 'funding') {
    return (
      <section className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">로그인이 필요합니다</h1>
        <p className="mt-3 text-slate-600">로그인 후 요청하신 화면으로 이동합니다.</p>
        <button type="button" onClick={() => openLoginModal(returnUrl || undefined)}
          className="mt-6 rounded-lg bg-slate-900 px-6 py-3 text-white">로그인하기</button>
      </section>
    );
  }
  // Preserve the callback fragment until the opened modal consumes and clears it.
  const kakaoHash = new URLSearchParams(location.hash.slice(1)).get('social_kind') === 'kakao-login' ? location.hash : '';
  return <Navigate to={{ pathname: '/', hash: kakaoHash }} replace />;
}

