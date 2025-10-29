/**
 * Access Control Types
 *
 * Role-based content access control for Posts, Pages, and other content types.
 * Inspired by WordPress role-based content restriction plugins.
 */

/**
 * Access control configuration for a content item (Post/Page)
 */
export interface AccessControl {
  /** Whether access control is enabled for this content */
  enabled: boolean;

  /** List of roles that are allowed to access this content */
  allowedRoles: string[];

  /** List of roles that are explicitly denied access (optional) */
  deniedRoles?: string[];

  /** Whether login is required to access this content */
  requireLogin: boolean;

  /** Custom URL to redirect to when access is denied (optional) */
  redirectUrl?: string;

  /** Custom HTML message to display when access is denied (optional) */
  customMessage?: string;
}

/**
 * Result of an access check
 */
export interface AccessCheckResult {
  /** Whether access is allowed */
  allowed: boolean;

  /** Error message if access is denied */
  message?: string;

  /** URL to redirect to if access is denied */
  redirectUrl?: string;

  /** Whether authentication is required (for unauthenticated users) */
  requiresAuth?: boolean;
}

/**
 * Global access control settings (stored in Settings table)
 */
export interface AccessControlSettings {
  /** Default HTML message shown when access is denied (if no custom message is set) */
  defaultDenialMessage: string;

  /** Default URL to redirect to when access is denied */
  defaultRedirectUrl: string;

  /** Whether to show an upgrade/pricing link in the denial message */
  showUpgradeLink: boolean;

  /** URL for the upgrade/pricing page */
  upgradeUrl?: string;

  /** Auto-redirect delay in seconds (0 = no auto-redirect) */
  autoRedirectDelay?: number;
}

/**
 * Special role values
 */
export const SpecialRoles = {
  /** Everyone (including non-authenticated users) */
  EVERYONE: 'everyone',

  /** Only logged-out users */
  LOGGED_OUT: 'logged_out',

  /** Any logged-in user (regardless of role) */
  LOGGED_IN: 'logged_in',
} as const;

export type SpecialRole = typeof SpecialRoles[keyof typeof SpecialRoles];
