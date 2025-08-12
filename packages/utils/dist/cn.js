import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Utility function to merge class names with Tailwind CSS
 * Uses clsx for conditional classes and tailwind-merge to handle conflicts
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
