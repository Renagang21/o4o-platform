/**
 * Debounce utility function
 * R-6-7-A: Cart quantity update optimization
 *
 * Delays function execution until after a specified wait time has elapsed
 * since the last time it was invoked.
 *
 * @param fn - The function to debounce
 * @param delayMs - The delay in milliseconds (default: 300ms)
 * @returns Debounced function with cancel method
 *
 * @example
 * const debouncedSave = debounce((value: string) => {
 *   saveToServer(value);
 * }, 300);
 *
 * // Will only call saveToServer once after 300ms of no calls
 * debouncedSave('a');
 * debouncedSave('ab');
 * debouncedSave('abc'); // Only this will execute
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 300
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delayMs);
  } as T & { cancel: () => void };

  // Add cancel method to clear pending execution
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Create a debounced callback hook-compatible version
 * For use with React state updates
 *
 * @param fn - The function to debounce
 * @param delayMs - The delay in milliseconds
 * @param deps - Dependency array (like useCallback)
 * @returns Debounced function
 */
export function createDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}
