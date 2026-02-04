/**
 * LoginModalContext - 하위 호환성 래퍼
 *
 * WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1
 *
 * 기존 useLoginModal, LoginModalProvider 사용처 호환
 * 실제 구현은 AuthModalContext에 있음
 */

export {
  AuthModalProvider as LoginModalProvider,
  useAuthModal as useLoginModal,
  useAuthModal,
  AuthModalProvider,
} from './AuthModalContext';
