/**
 * Auth Shortcode Registration
 * Register all authentication-related shortcodes
 */

import { registerShortcode } from '../registry.js';
import SocialLogin from './SocialLogin.js';

/**
 * Register all auth shortcodes
 */
export function registerAuthShortcodes() {
  // Social login shortcode
  registerShortcode({
    name: 'social_login',
    component: SocialLogin as any,
    description: 'OAuth social login with Google, Kakao, Naver support'
  });

  // Login form shortcode (alias)
  registerShortcode({
    name: 'login_form',
    component: SocialLogin as any,
    description: 'Login form with social and email authentication'
  });

  // OAuth login shortcode (alias)
  registerShortcode({
    name: 'oauth_login',
    component: SocialLogin as any,
    description: 'OAuth social login buttons only'
  });
}

// Export components for direct use
export { default as SocialLogin } from './SocialLogin.js';