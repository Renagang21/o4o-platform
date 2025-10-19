"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = exports.snakeToCamel = exports.camelToSnake = exports.truncateText = exports.generateSlug = void 0;
/**
 * Generate a URL-friendly slug from a title
 * @param title - The title to convert to a slug
 * @returns URL-friendly slug string
 */
function generateSlug(title) {
    return title
        .toString()
        .toLowerCase()
        .trim()
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove special characters except hyphens
        .replace(/[^\w-]+/g, '')
        // Replace multiple hyphens with single hyphen
        .replace(/--+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
exports.generateSlug = generateSlug;
/**
 * Truncate text to a specified length
 * @param text - The text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated text
 */
function truncateText(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
}
exports.truncateText = truncateText;
/**
 * Convert camelCase to snake_case
 * @param str - camelCase string
 * @returns snake_case string
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
exports.camelToSnake = camelToSnake;
/**
 * Convert snake_case to camelCase
 * @param str - snake_case string
 * @returns camelCase string
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
exports.snakeToCamel = snakeToCamel;
/**
 * Escape HTML special characters
 * @param text - Text to escape
 * @returns HTML-escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
}
exports.escapeHtml = escapeHtml;
//# sourceMappingURL=string.js.map