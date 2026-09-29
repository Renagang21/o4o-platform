/**
 * `/register` 진입 — WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1
 *
 * 가입은 로그인 모달의 「Google 로 계속하기」 하나가 담당한다(미등록이면 동의 → 가입).
 * 그래서 `/register` 는 홈으로 보내며 그 모달을 여는 **비로그인 전용** 진입점이다.
 *
 * 종전에는 인증 여부와 무관하게 모달을 열어, 이미 Google 로 로그인한 사용자가 `/register` 에
 * 오면(대표 홈 「가입 가능한 서비스」 → Neture 등) 로그인 모달이 다시 뜨는 루프가 생겼다.
 *   - 세션 복구 중: 판정을 미룬다(복구 전 isAuthenticated=false 를 비로그인으로 오판하지 않는다)
 *   - 로그인 상태: 모달 없이 홈으로
 *   - 비로그인: 종전대로 모달을 열고 홈으로
 */
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginModal } from '../../contexts/LoginModalContext';

export function RegisterRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const { openRegisterModal } = useLoginModal();
  const shouldOpenModal = !isLoading && !isAuthenticated;

  useEffect(() => {
    if (shouldOpenModal) openRegisterModal();
  }, [shouldOpenModal, openRegisterModal]);

  if (isLoading) return null;
  return <Navigate to="/" replace />;
}
