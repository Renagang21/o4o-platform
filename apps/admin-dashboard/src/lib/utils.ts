import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Re-export from @o4o/utils
export { formatCurrency, formatDate } from '@o4o/utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}