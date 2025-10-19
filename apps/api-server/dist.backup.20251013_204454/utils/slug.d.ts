/**
 * Generate a URL-friendly slug from a string
 */
export declare function generateSlug(text: string): string;
/**
 * Validate if a string is a valid slug
 */
export declare function isValidSlug(slug: string): boolean;
/**
 * Generate a unique slug by appending a number if needed
 */
export declare function generateUniqueSlug(baseSlug: string, checkExists: (slug: string) => Promise<boolean>): Promise<string>;
//# sourceMappingURL=slug.d.ts.map