/**
 * Deep Merge Utility
 * Recursively merges nested objects without data loss
 */

/**
 * Check if a value is a plain object (not array, null, Date, etc.)
 */
function isPlainObject(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

/**
 * Deep merge two objects
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  // Create a copy of target to avoid mutation
  const result = { ...target };

  // Iterate over source properties
  for (const key in source) {
    if (!source.hasOwnProperty(key)) continue;

    const sourceValue = source[key];
    const targetValue = result[key];

    // If source value is undefined, skip it
    if (sourceValue === undefined) {
      continue;
    }

    // If source value is null, explicitly set it to null
    if (sourceValue === null) {
      result[key] = null as any;
      continue;
    }

    // If both are plain objects, merge recursively
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key] = deepMerge(targetValue, sourceValue) as any;
    }
    // If source is array, replace target array
    else if (Array.isArray(sourceValue)) {
      result[key] = [...sourceValue] as any;
    }
    // Otherwise, replace target value with source value
    else {
      result[key] = sourceValue as any;
    }
  }

  return result;
}

/**
 * Deep merge multiple objects
 * @param objects - Array of objects to merge
 * @returns Merged object
 */
export function deepMergeAll<T extends Record<string, any>>(
  ...objects: Partial<T>[]
): T {
  if (objects.length === 0) {
    return {} as T;
  }

  return objects.reduce((acc, obj) => {
    return deepMerge(acc, obj) as T;
  }, {} as T) as T;
}
