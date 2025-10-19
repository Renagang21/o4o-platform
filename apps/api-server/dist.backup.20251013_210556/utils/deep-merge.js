"use strict";
/**
 * Deep Merge Utility
 * Recursively merges nested objects without data loss
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepMergeAll = exports.deepMerge = void 0;
/**
 * Check if a value is a plain object (not array, null, Date, etc.)
 */
function isPlainObject(value) {
    return (typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof RegExp));
}
/**
 * Deep merge two objects
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns Merged object
 */
function deepMerge(target, source) {
    // Create a copy of target to avoid mutation
    const result = { ...target };
    // Iterate over source properties
    for (const key in source) {
        if (!source.hasOwnProperty(key))
            continue;
        const sourceValue = source[key];
        const targetValue = result[key];
        // If source value is undefined, skip it
        if (sourceValue === undefined) {
            continue;
        }
        // If source value is null, explicitly set it to null
        if (sourceValue === null) {
            result[key] = null;
            continue;
        }
        // If both are plain objects, merge recursively
        if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        // If source is array, replace target array
        else if (Array.isArray(sourceValue)) {
            result[key] = [...sourceValue];
        }
        // Otherwise, replace target value with source value
        else {
            result[key] = sourceValue;
        }
    }
    return result;
}
exports.deepMerge = deepMerge;
/**
 * Deep merge multiple objects
 * @param objects - Array of objects to merge
 * @returns Merged object
 */
function deepMergeAll(...objects) {
    if (objects.length === 0) {
        return {};
    }
    return objects.reduce((acc, obj) => {
        return deepMerge(acc, obj);
    }, {});
}
exports.deepMergeAll = deepMergeAll;
//# sourceMappingURL=deep-merge.js.map