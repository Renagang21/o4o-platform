import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { resolveLoginReturnPath } from '../../lib/loginReturnPath';

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
  // Preserve the callback fragment until the opened modal consumes and clears it.
  const kakaoHash = new URLSearchParams(location.hash.slice(1)).get('social_kind') === 'kakao-login' ? location.hash : '';
  return <Navigate to={{ pathname: '/', hash: kakaoHash }} replace />;
}

