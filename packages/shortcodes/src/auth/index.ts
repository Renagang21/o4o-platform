/**
 * Auth Shortcode Registration
 * Register all authentication-related shortcodes
 */

import { registerShortcode } from '../registry.js';
import SocialLogin from './SocialLogin.js';

/**
 * Register all auth shortcodes
 * Phase SC-3: Enhanced with UI metadata for editor
 */
export function registerAuthShortcodes() {
  // Social login shortcode
  registerShortcode({
    name: 'social_login',
    component: SocialLogin as any,
    label: '소셜 로그인',
    category: 'Authentication',
    description: 'OAuth social login with Google, Kakao, Naver support',
    fields: [
      {
        name: 'providers',
        label: '로그인 제공자',
        type: 'string',
        required: false,
        placeholder: 'google,kakao,naver',
        helpText: '표시할 로그인 제공자를 쉼표로 구분하여 입력 (예: google,kakao,naver)',
        defaultValue: 'google,kakao,naver'
      },
      {
        name: 'redirect',
        label: '로그인 후 이동 URL',
        type: 'string',
        required: false,
        placeholder: '/dashboard',
        helpText: '로그인 성공 후 이동할 페이지 경로'
      },
      {
        name: 'buttonStyle',
        label: '버튼 스타일',
        type: 'select',
        required: false,
        options: [
          { label: '기본', value: 'default' },
          { label: '아이콘만', value: 'icon-only' },
          { label: '전체 너비', value: 'full-width' }
        ],
        defaultValue: 'default',
        helpText: '소셜 로그인 버튼의 표시 스타일을 선택합니다.'
      }
    ]
  });

  // Login form shortcode (alias)
  registerShortcode({
    name: 'login_form',
    component: SocialLogin as any,
    label: '로그인 폼',
    category: 'Authentication',
    description: 'Login form with social and email authentication',
    fields: [
      {
        name: 'redirect',
        label: '로그인 후 이동 URL',
        type: 'string',
        required: false,
        placeholder: '/dashboard',
        helpText: '로그인 성공 후 이동할 페이지 경로'
      }
    ]
  });

  // OAuth login shortcode (alias)
  registerShortcode({
    name: 'oauth_login',
    component: SocialLogin as any,
    label: 'OAuth 로그인',
    category: 'Authentication',
    description: 'OAuth social login buttons only',
    fields: [
      {
        name: 'providers',
        label: '로그인 제공자',
        type: 'string',
        required: false,
        placeholder: 'google,kakao,naver',
        helpText: '표시할 로그인 제공자를 쉼표로 구분하여 입력',
        defaultValue: 'google,kakao,naver'
      }
    ]
  });
}

// Export components for direct use
export { default as SocialLogin } from './SocialLogin.js';