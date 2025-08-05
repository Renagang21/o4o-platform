import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Re-export from @o4o/utils
export { formatCurrency } from '@o4o/utils/pricing';

// Add any main-site specific utilities here
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}