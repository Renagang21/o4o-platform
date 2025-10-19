"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueSlug = exports.isValidSlug = exports.generateSlug = void 0;
/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with -
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}
exports.generateSlug = generateSlug;
/**
 * Validate if a string is a valid slug
 */
function isValidSlug(slug) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
exports.isValidSlug = isValidSlug;
/**
 * Generate a unique slug by appending a number if needed
 */
async function generateUniqueSlug(baseSlug, checkExists) {
    let slug = generateSlug(baseSlug);
    let counter = 1;
    while (await checkExists(slug)) {
        slug = `${generateSlug(baseSlug)}-${counter}`;
        counter++;
    }
    return slug;
}
exports.generateUniqueSlug = generateUniqueSlug;
//# sourceMappingURL=slug.js.map