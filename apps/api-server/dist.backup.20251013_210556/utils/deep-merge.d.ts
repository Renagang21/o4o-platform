/**
 * Deep Merge Utility
 * Recursively merges nested objects without data loss
 */
/**
 * Deep merge two objects
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns Merged object
 */
export declare function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
/**
 * Deep merge multiple objects
 * @param objects - Array of objects to merge
 * @returns Merged object
 */
export declare function deepMergeAll<T extends Record<string, any>>(...objects: Partial<T>[]): T;
//# sourceMappingURL=deep-merge.d.ts.map