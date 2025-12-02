/**
 * Design System - Merge Utilities
 *
 * Utilities for merging design tokens and styles
 */

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue as any);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as any;
    }
  }

  return result;
}

/**
 * Merge multiple style objects
 */
export function mergeStyles(...styles: (React.CSSProperties | undefined)[]): React.CSSProperties {
  return styles.reduce<React.CSSProperties>((acc, style) => {
    if (!style) return acc;
    return { ...acc, ...style };
  }, {});
}

/**
 * Merge Tailwind classes intelligently (later classes override earlier ones)
 */
export function mergeTailwind(...classes: (string | undefined | null | false)[]): string {
  const classSet = new Set<string>();

  for (const cls of classes) {
    if (!cls) continue;
    const parts = cls.split(' ').filter(Boolean);
    for (const part of parts) {
      classSet.add(part);
    }
  }

  return Array.from(classSet).join(' ');
}
