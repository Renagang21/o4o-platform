/**
 * `/register` 진입 — WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1: 가입 수단이 **둘**이 됐다(이메일·비밀번호 +
 * Google). 두 수단을 함께 제공하는 가입 화면은 `/signup` 이므로 `/register` 는 그 화면으로 보낸다.
 *
 * 종전에는 홈으로 보내며 로그인 모달을 열었다. 그 구조는 가입 수단이 Google 하나일 때의 것이고,
 * 지금 그대로 두면 **가입 진입점이 모달과 `/signup` 두 곳으로 갈라진다** — 모달 안의 링크를
 * 거쳐야 이메일 가입에 닿는다.
 *
 * 로그인 상태 판정은 그대로 유지한다(WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1):
 *   - 세션 복구 중: 판정을 미룬다(복구 전 isAuthenticated=false 를 비로그인으로 오판하지 않는다)
 *   - 로그인 상태: 홈으로 (가입 화면을 다시 보여 주지 않는다 = 루프 방지)
 *   - 비로그인: `/signup`
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? '/' : '/signup'} replace />;
}
