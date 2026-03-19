/**
 * useOperatorAction — Operator 액션 실행 Hook
 *
 * WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1
 *
 * 승인/거절/정지 등 공통 액션의 로딩/에러/확인 상태 관리.
 * 실제 API 호출 함수는 서비스에서 주입 — hook은 상태 관리만 담당.
 */

import { useState, useCallback } from 'react';
import type { OperatorActionType } from '@o4o/types';

export interface UseOperatorActionOptions {
  /** 성공 시 콜백 */
  onSuccess?: () => void;
  /** 실패 시 콜백 */
  onError?: (error: Error) => void;
}

export interface UseOperatorActionReturn {
  /** 현재 열린 모달의 액션 타입 (null = 모달 닫힘) */
  pendingAction: OperatorActionType | null;
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 모달 열기 — 확인 대기 상태 진입 */
  requestAction: (actionType: OperatorActionType) => void;
  /** 모달 닫기 — 확인 취소 */
  cancelAction: () => void;
  /** 액션 실행 (API 호출 함수를 받아 실행) */
  executeAction: (
    apiFn: (reason?: string) => Promise<void>,
    reason?: string,
  ) => Promise<void>;
}

export function useOperatorAction(
  options: UseOperatorActionOptions = {},
): UseOperatorActionReturn {
  const { onSuccess, onError } = options;

  const [pendingAction, setPendingAction] = useState<OperatorActionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestAction = useCallback((actionType: OperatorActionType) => {
    setError(null);
    setPendingAction(actionType);
  }, []);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    setError(null);
  }, []);

  const executeAction = useCallback(
    async (apiFn: (reason?: string) => Promise<void>, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiFn(reason);
        setPendingAction(null);
        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.';
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError],
  );

  return {
    pendingAction,
    loading,
    error,
    requestAction,
    cancelAction,
    executeAction,
  };
}
