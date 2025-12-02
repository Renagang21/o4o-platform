/**
 * Design System - Classname Utilities
 *
 * Utility functions for composing and merging classnames
 */

/**
 * Concatenates classnames, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Conditionally applies classnames based on a condition
 */
export function conditional(
  condition: boolean | undefined | null,
  trueClass: string,
  falseClass?: string
): string {
  return condition ? trueClass : (falseClass || '');
}

/**
 * Merges variant classnames with base classes
 */
export function variant<T extends Record<string, string>>(
  base: string,
  variants: T,
  selectedVariant: keyof T
): string {
  return cn(base, variants[selectedVariant]);
}

/**
 * Type-safe classname composition
 */
export type ClassValue = string | undefined | null | false | ClassArray | ClassDict;
export type ClassArray = ClassValue[];
export type ClassDict = Record<string, boolean | undefined | null>;

export function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const result = clsx(...input);
      if (result) classes.push(result);
    } else if (typeof input === 'object') {
      for (const key in input) {
        if (input[key]) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}
