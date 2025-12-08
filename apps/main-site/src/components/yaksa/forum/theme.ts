/**
 * Yaksa Forum Theme
 *
 * Professional, organization-based theme for pharmacist association forum.
 * Color scheme: Navy blue / Gray / Mint-blue (official tone)
 */

export const yaksaThemeTokens = {
  // Primary colors - Navy blue for official/professional look
  '--yaksa-primary': '#1e3a5f',
  '--yaksa-primary-light': '#2d4a6f',
  '--yaksa-primary-dark': '#0f2a4f',

  // Accent colors - Mint-blue for highlights
  '--yaksa-accent': '#0891b2',
  '--yaksa-accent-light': '#22d3ee',
  '--yaksa-accent-dark': '#0e7490',

  // Surface colors
  '--yaksa-surface': '#ffffff',
  '--yaksa-surface-secondary': '#f8fafc',
  '--yaksa-surface-tertiary': '#f1f5f9',

  // Text colors
  '--yaksa-text-primary': '#1e293b',
  '--yaksa-text-secondary': '#475569',
  '--yaksa-text-muted': '#94a3b8',
  '--yaksa-text-inverse': '#ffffff',

  // Border colors
  '--yaksa-border': '#e2e8f0',
  '--yaksa-border-light': '#f1f5f9',
  '--yaksa-border-dark': '#cbd5e1',

  // Status colors
  '--yaksa-info': '#0ea5e9',
  '--yaksa-warning': '#f59e0b',
  '--yaksa-critical': '#ef4444',
  '--yaksa-success': '#22c55e',

  // Role badge colors
  '--yaksa-role-admin': '#7c3aed',
  '--yaksa-role-operator': '#0891b2',
  '--yaksa-role-member': '#22c55e',
  '--yaksa-role-guest': '#94a3b8',

  // Organization colors
  '--yaksa-org-national': '#1e3a5f',
  '--yaksa-org-regional': '#2563eb',
  '--yaksa-org-local': '#0891b2',
};

export const yaksaStyles = {
  // Container styles
  container: {
    backgroundColor: 'var(--yaksa-surface)',
    color: 'var(--yaksa-text-primary)',
  },

  // Card styles
  card: {
    backgroundColor: 'var(--yaksa-surface)',
    borderColor: 'var(--yaksa-border)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '8px',
  },

  // Header styles
  header: {
    backgroundColor: 'var(--yaksa-primary)',
    color: 'var(--yaksa-text-inverse)',
  },

  // Navigation styles
  nav: {
    backgroundColor: 'var(--yaksa-surface-secondary)',
    borderColor: 'var(--yaksa-border)',
  },

  // Button styles
  buttonPrimary: {
    backgroundColor: 'var(--yaksa-primary)',
    color: 'var(--yaksa-text-inverse)',
    border: 'none',
  },
  buttonSecondary: {
    backgroundColor: 'var(--yaksa-surface-tertiary)',
    color: 'var(--yaksa-text-primary)',
    border: '1px solid var(--yaksa-border)',
  },
  buttonAccent: {
    backgroundColor: 'var(--yaksa-accent)',
    color: 'var(--yaksa-text-inverse)',
    border: 'none',
  },

  // Badge styles
  badgeAdmin: {
    backgroundColor: 'var(--yaksa-role-admin)',
    color: '#ffffff',
  },
  badgeOperator: {
    backgroundColor: 'var(--yaksa-role-operator)',
    color: '#ffffff',
  },
  badgeMember: {
    backgroundColor: 'var(--yaksa-role-member)',
    color: '#ffffff',
  },

  // Status badges
  badgeInfo: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: 'var(--yaksa-info)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--yaksa-warning)',
  },
  badgeCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--yaksa-critical)',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: 'var(--yaksa-success)',
  },

  // Text styles
  textPrimary: { color: 'var(--yaksa-text-primary)' },
  textSecondary: { color: 'var(--yaksa-text-secondary)' },
  textMuted: { color: 'var(--yaksa-text-muted)' },

  // Heading styles
  heading: {
    color: 'var(--yaksa-text-primary)',
    fontWeight: '600',
  },
};

/**
 * Apply Yaksa theme to document
 */
export function applyYaksaTheme(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  Object.entries(yaksaThemeTokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Get role badge style
 */
export function getRoleBadgeStyle(role: string): React.CSSProperties {
  switch (role) {
    case 'administrator':
    case 'admin':
      return yaksaStyles.badgeAdmin;
    case 'operator':
      return yaksaStyles.badgeOperator;
    case 'member':
      return yaksaStyles.badgeMember;
    default:
      return { backgroundColor: 'var(--yaksa-role-guest)', color: '#ffffff' };
  }
}

/**
 * Get organization level color
 */
export function getOrgLevelColor(level: 'national' | 'regional' | 'local'): string {
  switch (level) {
    case 'national':
      return 'var(--yaksa-org-national)';
    case 'regional':
      return 'var(--yaksa-org-regional)';
    case 'local':
      return 'var(--yaksa-org-local)';
    default:
      return 'var(--yaksa-primary)';
  }
}

export default yaksaThemeTokens;
