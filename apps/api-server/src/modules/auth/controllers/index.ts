/**
 * AUTH Module Controllers
 *
 * Barrel export for all authentication-related controllers
 * WO-O4O-AUTH-CONTROLLER-SPLIT-V1: auth.controller.ts → 4 sub-controllers
 */

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   AuthLoginController / AuthRegisterController / PasswordController 는 은퇴했다.
//   로그인·가입은 GoogleAuthController 하나이며 별도 barrel 을 거치지 않는다.
export { AuthSessionController } from './auth-session.controller.js';
export { AuthAccountController } from './auth-account.controller.js';
export { VerificationController } from './verification.controller.js';
