/**
 * useToast Hook
 * HP-1: Toast System 전역화
 *
 * Convenient hook to access toast notification system
 */

import { useToastContext } from '@/contexts/ToastProvider';
import type { ToastContextValue } from '@/types/toast';

/**
 * Hook to access toast notification system
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const toast = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       toast.success('저장되었습니다');
 *     } catch (error) {
 *       toast.error('저장에 실패했습니다', {
 *         description: error.message,
 *       });
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 *
 * @throws {Error} If used outside of ToastProvider
 * @returns Toast notification methods
 */
export function useToast(): ToastContextValue {
  return useToastContext();
}
