/**
 * Access Control Types
 *
 * Role-based content access control for Posts, Pages, and other content types.
 * Inspired by WordPress role-based content restriction plugins.
 */
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
};
//# sourceMappingURL=access-control.js.map