/**
 * Backend Access Control Utilities
 *
 * Server-side functions for checking role-based content access.
 * Uses the common @o4o/utils functions with backend-specific User entity integration.
 */

import { AccessControl, AccessCheckResult } from '@o4o/types';
import { checkAccess as checkAccessCommon } from '@o4o/utils';
import { User } from '../entities/User';
import { Post } from '../entities/Post';

/**
 * Check if a user has access to a post based on access control settings
 *
 * @param post - Post entity with accessControl configuration
 * @param user - User entity (can be undefined for non-authenticated requests)
 * @param defaultMessage - Default message from global settings (optional)
 * @param defaultRedirectUrl - Default redirect URL from global settings (optional)
 * @returns Access check result
 */
export function checkPostAccess(
  post: Post,
  user?: User,
  defaultMessage?: string,
  defaultRedirectUrl?: string
): AccessCheckResult {
  // Get user roles
  const userRoles: string[] = user ? getUserRoles(user) : [];
  const isAuthenticated = !!user;

  // Use common utility function
  return checkAccessCommon(
    post.accessControl,
    userRoles,
    isAuthenticated,
    defaultMessage,
    defaultRedirectUrl
  );
}

/**
 * Get all roles for a user (including from dbRoles and legacy role field)
 *
 * @param user - User entity
 * @returns Array of role strings
 */
function getUserRoles(user: User): string[] {
  const roles: string[] = [];

  // Add main role
  if (user.role) {
    roles.push(user.role);
  }

  // Add roles from dbRoles if available
  if (user.dbRoles && Array.isArray(user.dbRoles)) {
    user.dbRoles.forEach((dbRole) => {
      if (dbRole.role && dbRole.role.name && !roles.includes(dbRole.role.name)) {
        roles.push(dbRole.role.name);
      }
    });
  }

  return roles;
}

/**
 * Filter posts based on user access
 * Removes posts that the user doesn't have access to
 *
 * @param posts - Array of posts to filter
 * @param user - User entity (can be undefined)
 * @returns Filtered array of posts
 */
export function filterAccessiblePosts(posts: Post[], user?: User): Post[] {
  return posts.filter((post) => {
    const accessCheck = checkPostAccess(post, user);
    return accessCheck.allowed;
  });
}

/**
 * Check if access control is enabled for a post
 *
 * @param post - Post entity
 * @returns Whether access control is enabled
 */
export function isAccessControlEnabled(post: Post): boolean {
  return post.accessControl?.enabled === true;
}

/**
 * Get access denied error response
 * Standardized error response for access denied scenarios
 *
 * @param accessCheckResult - Result from checkPostAccess
 * @returns Error response object
 */
export function getAccessDeniedResponse(accessCheckResult: AccessCheckResult) {
  return {
    success: false,
    code: 'ACCESS_DENIED',
    message: accessCheckResult.message || '이 콘텐츠에 접근할 권한이 없습니다.',
    redirectUrl: accessCheckResult.redirectUrl,
    requiresAuth: accessCheckResult.requiresAuth || false,
  };
}
