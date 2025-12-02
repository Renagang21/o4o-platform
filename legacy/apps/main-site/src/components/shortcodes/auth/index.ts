/**
 * Auth Shortcodes Index
 * Central export for all authentication-related shortcodes
 */

export { socialLoginShortcode, loginFormShortcode, oauthLoginShortcode, SocialLoginComponent } from './SocialLoginShortcode';
export { findIdShortcode, FindIdComponent } from './FindIdShortcode';
export { findPasswordShortcode, FindPasswordComponent } from './FindPasswordShortcode';
export { signupShortcode, SignupComponent } from './SignupShortcode';
export { businessRegisterShortcode, BusinessRegisterComponent } from './BusinessRegisterShortcode';
export { loginShortcode, LoginComponent } from './LoginShortcode';
export { accountShortcode, AccountComponent } from './AccountShortcode';

// Export combined array for easy registration
import { socialLoginShortcode, loginFormShortcode, oauthLoginShortcode } from './SocialLoginShortcode';
import { findIdShortcode } from './FindIdShortcode';
import { findPasswordShortcode } from './FindPasswordShortcode';
import { signupShortcode } from './SignupShortcode';
import { businessRegisterShortcode } from './BusinessRegisterShortcode';
import { loginShortcode } from './LoginShortcode';
import { accountShortcode } from './AccountShortcode';

export const authShortcodes = [
  socialLoginShortcode,
  loginFormShortcode,
  oauthLoginShortcode,
  findIdShortcode,
  findPasswordShortcode,
  signupShortcode,
  businessRegisterShortcode,
  loginShortcode,
  accountShortcode
];
