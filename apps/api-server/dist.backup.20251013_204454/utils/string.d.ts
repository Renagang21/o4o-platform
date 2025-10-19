/**
 * Generate a URL-friendly slug from a title
 * @param title - The title to convert to a slug
 * @returns URL-friendly slug string
 */
export declare function generateSlug(title: string): string;
/**
 * Truncate text to a specified length
 * @param text - The text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated text
 */
export declare function truncateText(text: string, maxLength: number, suffix?: string): string;
/**
 * Convert camelCase to snake_case
 * @param str - camelCase string
 * @returns snake_case string
 */
export declare function camelToSnake(str: string): string;
/**
 * Convert snake_case to camelCase
 * @param str - snake_case string
 * @returns camelCase string
 */
export declare function snakeToCamel(str: string): string;
/**
 * Escape HTML special characters
 * @param text - Text to escape
 * @returns HTML-escaped text
 */
export declare function escapeHtml(text: string): string;
//# sourceMappingURL=string.d.ts.map