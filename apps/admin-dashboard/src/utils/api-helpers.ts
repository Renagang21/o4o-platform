/**
 * API Helper Functions
 * Utility functions for safe API response handling
 */

/**
 * Safely extract array data from various API response formats
 * @param response - API response in any format
 * @returns Always returns an array, empty if no valid data
 */
export function extractArrayFromResponse<T = any>(response: any): T[] {
  // Direct array
  if (Array.isArray(response)) {
    return response;
  }

  // Object with data property
  if (response && typeof response === 'object' && Array.isArray(response.data)) {
    return response.data;
  }

  // Default to empty array
  return [];
}

/**
 * Ensure a value is an array
 * @param value - Any value that should be an array
 * @returns The value if it's an array, otherwise empty array
 */
export function ensureArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safe array map with fallback
 * @param value - Value that might be an array
 * @param mapFn - Mapping function
 * @param fallback - Fallback value if not an array
 */
export function safeMap<T, R>(
  value: any,
  mapFn: (item: T, index: number) => R,
  fallback: R[] = []
): R[] {
  return Array.isArray(value) ? value.map(mapFn) : fallback;
}

/**
 * Check if response has valid data
 * @param response - API response
 * @returns true if response contains valid array data
 */
export function hasValidData(response: any): boolean {
  if (Array.isArray(response)) return response.length > 0;
  if (response?.data && Array.isArray(response.data)) return response.data.length > 0;
  return false;
}

/**
 * Type guard for checking if value is an array
 */
export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}

/**
 * Safe access to array methods
 */
export const SafeArray = {
  map: safeMap,
  ensure: ensureArray,
  isArray,
  
  filter<T>(value: any, filterFn: (item: T) => boolean): T[] {
    return Array.isArray(value) ? value.filter(filterFn) : [];
  },
  
  find<T>(value: any, findFn: (item: T) => boolean): T | undefined {
    return Array.isArray(value) ? value.find(findFn) : undefined;
  },
  
  some<T>(value: any, someFn: (item: T) => boolean): boolean {
    return Array.isArray(value) ? value.some(someFn) : false;
  }
};