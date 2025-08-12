/**
 * String utility functions
 */
/**
 * Generate URL-friendly slug from string
 * @param text Input text
 * @returns URL-friendly slug
 */
export declare function generateSlug(text: string): string;
/**
 * Truncate string to specified length with ellipsis
 * @param text Input text
 * @param maxLength Maximum length
 * @param suffix Suffix to add (default: '...')
 * @returns Truncated string
 */
export declare function truncate(text: string, maxLength: number, suffix?: string): string;
/**
 * Capitalize first letter of string
 * @param text Input text
 * @returns Capitalized string
 */
export declare function capitalize(text: string): string;
/**
 * Convert string to title case
 * @param text Input text
 * @returns Title case string
 */
export declare function toTitleCase(text: string): string;
/**
 * Generate random string
 * @param length Length of string
 * @param chars Character set to use
 * @returns Random string
 */
export declare function randomString(length?: number, chars?: string): string;
//# sourceMappingURL=string.d.ts.map