/**
 * Forum Theme Utilities
 *
 * Shared theme styles using CSS variables for CMS Theme System integration.
 * These styles reference CSS variables defined in index.css and can be
 * overridden via ViewSchema.styles.variables.
 */

export const forumStyles = {
  // Card styles
  card: {
    backgroundColor: 'var(--forum-bg-primary)',
    borderColor: 'var(--forum-border-light)',
    boxShadow: 'var(--forum-shadow-sm)',
    borderRadius: 'var(--forum-radius-lg)',
  } as React.CSSProperties,

  cardHover: {
    boxShadow: 'var(--forum-shadow-md)',
  } as React.CSSProperties,

  // Background styles
  bgPrimary: {
    backgroundColor: 'var(--forum-bg-primary)',
  } as React.CSSProperties,

  bgSecondary: {
    backgroundColor: 'var(--forum-bg-secondary)',
  } as React.CSSProperties,

  bgTertiary: {
    backgroundColor: 'var(--forum-bg-tertiary)',
  } as React.CSSProperties,

  bgHighlight: {
    backgroundColor: 'var(--forum-bg-highlight)',
  } as React.CSSProperties,

  // Text styles
  heading: {
    color: 'var(--forum-text-primary)',
  } as React.CSSProperties,

  text: {
    color: 'var(--forum-text-secondary)',
  } as React.CSSProperties,

  textMuted: {
    color: 'var(--forum-text-muted)',
  } as React.CSSProperties,

  link: {
    color: 'var(--forum-text-link)',
  } as React.CSSProperties,

  // Border styles
  borderLight: {
    borderColor: 'var(--forum-border-light)',
  } as React.CSSProperties,

  borderMedium: {
    borderColor: 'var(--forum-border-medium)',
  } as React.CSSProperties,

  // Badge styles
  badgePinned: {
    backgroundColor: 'var(--forum-badge-pinned-bg)',
    color: 'var(--forum-badge-pinned-text)',
  } as React.CSSProperties,

  badgeLocked: {
    backgroundColor: 'var(--forum-badge-locked-bg)',
    color: 'var(--forum-badge-locked-text)',
  } as React.CSSProperties,

  badgeNew: {
    backgroundColor: 'var(--forum-badge-new-bg)',
    color: 'var(--forum-badge-new-text)',
  } as React.CSSProperties,

  // Stats styles
  statPosts: {
    backgroundColor: 'var(--forum-stat-posts-bg)',
    color: 'var(--forum-stat-posts-text)',
  } as React.CSSProperties,

  statComments: {
    backgroundColor: 'var(--forum-stat-comments-bg)',
    color: 'var(--forum-stat-comments-text)',
  } as React.CSSProperties,

  statUsers: {
    backgroundColor: 'var(--forum-stat-users-bg)',
    color: 'var(--forum-stat-users-text)',
  } as React.CSSProperties,

  // Interaction styles
  likeActive: {
    color: 'var(--forum-like-active)',
  } as React.CSSProperties,

  likeInactive: {
    color: 'var(--forum-like-inactive)',
  } as React.CSSProperties,

  bookmarkActive: {
    color: 'var(--forum-bookmark-active)',
  } as React.CSSProperties,

  bookmarkInactive: {
    color: 'var(--forum-bookmark-inactive)',
  } as React.CSSProperties,

  // Button styles
  buttonPrimary: {
    backgroundColor: 'var(--forum-primary)',
    color: '#ffffff',
  } as React.CSSProperties,

  buttonPrimaryHover: {
    backgroundColor: 'var(--forum-primary-hover)',
  } as React.CSSProperties,

  buttonSecondary: {
    backgroundColor: 'var(--forum-bg-tertiary)',
    color: 'var(--forum-text-secondary)',
  } as React.CSSProperties,

  // Avatar styles
  avatar: {
    backgroundColor: 'var(--forum-bg-tertiary)',
    color: 'var(--forum-text-secondary)',
  } as React.CSSProperties,

  // Input styles
  input: {
    backgroundColor: 'var(--forum-bg-primary)',
    borderColor: 'var(--forum-border-medium)',
    color: 'var(--forum-text-primary)',
  } as React.CSSProperties,

  inputFocus: {
    borderColor: 'var(--forum-primary)',
    boxShadow: '0 0 0 2px var(--forum-primary-light)',
  } as React.CSSProperties,
};

/**
 * Get primary color style
 */
export const getPrimaryColor = () => ({
  color: 'var(--forum-primary)',
} as React.CSSProperties);

/**
 * Get primary background style
 */
export const getPrimaryBg = () => ({
  backgroundColor: 'var(--forum-primary)',
} as React.CSSProperties);

/**
 * Merge styles helper
 */
export const mergeStyles = (...styles: React.CSSProperties[]): React.CSSProperties => {
  return Object.assign({}, ...styles);
};
