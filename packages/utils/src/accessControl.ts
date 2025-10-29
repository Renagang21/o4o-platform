/**
 * Access Control Utilities
 *
 * Common functions for checking role-based content access.
 * Can be used in both backend and frontend.
 */

import { AccessControl, AccessCheckResult, SpecialRoles } from '@o4o/types';

/**
 * Check if a user has access to content based on access control settings
 *
 * @param accessControl - Access control configuration
 * @param userRoles - Array of user's roles
 * @param isAuthenticated - Whether the user is authenticated
 * @param defaultMessage - Default message to show when access is denied
 * @param defaultRedirectUrl - Default URL to redirect to when access is denied
 * @returns Access check result
 */
export function checkAccess(
  accessControl: AccessControl,
  userRoles: string[],
  isAuthenticated: boolean,
  defaultMessage?: string,
  defaultRedirectUrl?: string
): AccessCheckResult {
  // If access control is disabled, allow access
  if (!accessControl.enabled) {
    return { allowed: true };
  }

  // Check if login is required
  if (accessControl.requireLogin && !isAuthenticated) {
    return {
      allowed: false,
      message: '로그인이 필요합니다.',
      requiresAuth: true,
      redirectUrl: accessControl.redirectUrl || defaultRedirectUrl || '/login'
    };
  }

  // Check 'everyone' special role
  if (accessControl.allowedRoles.includes(SpecialRoles.EVERYONE)) {
    return { allowed: true };
  }

  // Check 'logged_out' special role (only non-authenticated users)
  if (accessControl.allowedRoles.includes(SpecialRoles.LOGGED_OUT)) {
    if (!isAuthenticated) {
      return { allowed: true };
    } else {
      // Authenticated users should not see content meant for logged-out users
      return {
        allowed: false,
        message: accessControl.customMessage || defaultMessage || '이미 로그인된 사용자는 접근할 수 없습니다.',
        redirectUrl: accessControl.redirectUrl || defaultRedirectUrl
      };
    }
  }

  // Check 'logged_in' special role (any authenticated user)
  if (accessControl.allowedRoles.includes(SpecialRoles.LOGGED_IN) && isAuthenticated) {
    return { allowed: true };
  }

  // Check if user has any of the allowed roles
  if (isAuthenticated && userRoles.some(role => accessControl.allowedRoles.includes(role))) {
    // Check denied roles (explicit deny overrides allow)
    if (accessControl.deniedRoles && accessControl.deniedRoles.some(role => userRoles.includes(role))) {
      return {
        allowed: false,
        message: accessControl.customMessage || defaultMessage || '이 콘텐츠에 접근할 권한이 없습니다.',
        redirectUrl: accessControl.redirectUrl || defaultRedirectUrl
      };
    }

    return { allowed: true };
  }

  // Default: deny access
  return {
    allowed: false,
    message: accessControl.customMessage || defaultMessage || '이 콘텐츠에 접근할 권한이 없습니다.',
    redirectUrl: accessControl.redirectUrl || defaultRedirectUrl,
    requiresAuth: !isAuthenticated
  };
}

/**
 * Get a list of all available roles for selection in UI
 *
 * @param includeSpecialRoles - Whether to include special roles (everyone, logged_in, etc.)
 * @returns Array of role objects with value and label
 */
export function getAvailableRoles(includeSpecialRoles: boolean = true): Array<{ value: string; label: string }> {
  const specialRoles = includeSpecialRoles
    ? [
        { value: SpecialRoles.EVERYONE, label: '모든 사용자 (비로그인 포함)' },
        { value: SpecialRoles.LOGGED_OUT, label: '비로그인 사용자만' },
        { value: SpecialRoles.LOGGED_IN, label: '로그인한 모든 사용자' },
      ]
    : [];

  const userRoles = [
    { value: 'super_admin', label: '최고 관리자' },
    { value: 'admin', label: '관리자' },
    { value: 'moderator', label: '중재자' },
    { value: 'vendor', label: '판매자' },
    { value: 'vendor_manager', label: '판매자 관리자' },
    { value: 'seller', label: '셀러' },
    { value: 'supplier', label: '공급자' },
    { value: 'affiliate', label: '제휴자' },
    { value: 'partner', label: '파트너' },
    { value: 'business', label: '비즈니스 회원' },
    { value: 'customer', label: '일반 고객' },
    { value: 'beta_user', label: '베타 사용자' },
  ];

  return [...specialRoles, ...userRoles];
}

/**
 * Create a default access control configuration
 *
 * @returns Default AccessControl object
 */
export function getDefaultAccessControl(): AccessControl {
  return {
    enabled: false,
    allowedRoles: [SpecialRoles.EVERYONE],
    requireLogin: false,
  };
}

/**
 * Validate access control configuration
 *
 * @param accessControl - Access control configuration to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateAccessControl(accessControl: AccessControl): { isValid: boolean; error?: string } {
  if (!accessControl.allowedRoles || accessControl.allowedRoles.length === 0) {
    return {
      isValid: false,
      error: '최소 하나의 허용된 Role을 선택해야 합니다.'
    };
  }

  if (accessControl.requireLogin && accessControl.allowedRoles.includes(SpecialRoles.EVERYONE)) {
    return {
      isValid: false,
      error: '로그인 필수와 "모든 사용자" 옵션은 함께 사용할 수 없습니다.'
    };
  }

  if (accessControl.allowedRoles.includes(SpecialRoles.LOGGED_OUT) && accessControl.requireLogin) {
    return {
      isValid: false,
      error: '로그인 필수와 "비로그인 사용자만" 옵션은 함께 사용할 수 없습니다.'
    };
  }

  return { isValid: true };
}
