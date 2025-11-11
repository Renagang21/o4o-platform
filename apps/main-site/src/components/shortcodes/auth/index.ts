/**
 * Auth Shortcodes Index
 * Central export for all authentication-related shortcodes
 */

export { socialLoginShortcode, loginFormShortcode, oauthLoginShortcode, SocialLoginComponent } from './SocialLoginShortcode';
export { findIdShortcode, FindIdComponent } from './FindIdShortcode';
export { findPasswordShortcode, FindPasswordComponent } from './FindPasswordShortcode';
export { signupShortcode, SignupComponent } from './SignupShortcode';
export { businessRegisterShortcode, BusinessRegisterComponent } from './BusinessRegisterShortcode';

// Export combined array for easy registration
import { socialLoginShortcode, loginFormShortcode, oauthLoginShortcode } from './SocialLoginShortcode';
import { findIdShortcode } from './FindIdShortcode';
import { findPasswordShortcode } from './FindPasswordShortcode';
import { signupShortcode } from './SignupShortcode';
import { businessRegisterShortcode } from './BusinessRegisterShortcode';

export const authShortcodes = [
  socialLoginShortcode,
  loginFormShortcode,
  oauthLoginShortcode,
  findIdShortcode,
  findPasswordShortcode,
  signupShortcode,
  businessRegisterShortcode
];
