/**
 * Role-based Redirect Configuration
 * Maps user roles to their default redirect paths after login
 */

export interface RoleRedirectMap {
  [role: string]: string;
}

// Default role redirect map (can be overridden by admin settings)
export const DEFAULT_ROLE_REDIRECTS: RoleRedirectMap = {
  // Standard users -> Home
  user: '/',
  member: '/',
  contributor: '/',

  // Seller -> Seller Dashboard
  seller: '/seller/dashboard',

  // Vendor -> Vendor Console
  vendor: '/vendor/console',

  // Partner -> Partner Portal
  partner: '/partner/portal',

  // Operators/Admins -> Admin Dashboard
  operator: '/admin',
  admin: '/admin',
};

// Get redirect path for a given role
export const getRedirectForRole = (
  role: string,
  customMap?: RoleRedirectMap
): string => {
  const map = customMap || DEFAULT_ROLE_REDIRECTS;
  return map[role] || DEFAULT_ROLE_REDIRECTS[role] || '/';
};

// Fetch role redirect map from API
export const fetchRoleRedirectMap = async (): Promise<RoleRedirectMap | null> => {
  try {
    const response = await fetch('/api/v1/settings/auth');
    if (response.ok) {
      const data = await response.json();
      return data.data?.roleRedirects || null;
    }
  } catch (error) {
    console.error('Failed to fetch role redirect map:', error);
  }
  return null;
};
