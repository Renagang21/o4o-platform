/**
 * String utility functions
 */
/**
 * Generate URL-friendly slug from string
 * @param text Input text
 * @returns URL-friendly slug
 */
export function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s가-힣-]/g, '') // Allow alphanumeric, spaces, Korean characters, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}
/**
 * Truncate string to specified length with ellipsis
 * @param text Input text
 * @param maxLength Maximum length
 * @param suffix Suffix to add (default: '...')
 * @returns Truncated string
 */
export function truncate(text, maxLength, suffix = '...') {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}
/**
 * Capitalize first letter of string
 * @param text Input text
 * @returns Capitalized string
 */
export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
/**
 * Convert string to title case
 * @param text Input text
 * @returns Title case string
 */
export function toTitleCase(text) {
    return text
        .toLowerCase()
        .split(' ')
        .map(word => capitalize(word))
        .join(' ');
}
/**
 * Generate random string
 * @param length Length of string
 * @param chars Character set to use
 * @returns Random string
 */
export function randomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
