/**
 * useDashboardCopy hook
 *
 * WO-APP-DATA-HUB-COPY-PHASE2A-V1
 * WO-APP-DATA-HUB-COPY-PHASE2B-V1: 복사 옵션 모달 지원
 *
 * 허브 콘텐츠를 내 대시보드로 복사하는 기능
 */

import { useState, useCallback } from 'react';
import { dashboardApi, type DashboardAssetSourceType, type CopyOptions } from '../api';
import { useAuth } from '../contexts/AuthContext';

interface CopyState {
  loading: boolean;
  error: string | null;
  success: boolean;
  copiedAssetId: string | null;
}

interface ModalState {
  isOpen: boolean;
  sourceId: string | null;
  sourceTitle: string | null;
}

interface UseDashboardCopyOptions {
  sourceType: DashboardAssetSourceType;
  onSuccess?: (assetId: string) => void;
  onError?: (error: string) => void;
}

export function useDashboardCopy(options: UseDashboardCopyOptions) {
  const { user } = useAuth();
  const [state, setState] = useState<CopyState>({
    loading: false,
    error: null,
    success: false,
    copiedAssetId: null,
  });

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    sourceId: null,
    sourceTitle: null,
  });

  /**
   * Phase 2-B: Open modal to select copy options
   */
  const openCopyModal = useCallback((sourceId: string, sourceTitle?: string) => {
    // Check if user is logged in
    if (!user) {
      const errorMsg = '로그인이 필요합니다.';
      setState(prev => ({ ...prev, error: errorMsg }));
      options.onError?.(errorMsg);
      alert(errorMsg);
      return;
    }

    setModalState({
      isOpen: true,
      sourceId,
      sourceTitle: sourceTitle || null,
    });
  }, [user, options]);

  /**
   * Phase 2-B: Close modal
   */
  const closeCopyModal = useCallback(() => {
    setModalState({
      isOpen: false,
      sourceId: null,
      sourceTitle: null,
    });
  }, []);

  /**
   * Phase 2-B: Execute copy with options from modal
   */
  const executeCopy = useCallback(async (copyOptions: CopyOptions) => {
    if (!modalState.sourceId) {
      return;
    }

    const sourceId = modalState.sourceId;
    closeCopyModal();

    // For now, use user.id as dashboard ID
    const targetDashboardId = user!.id;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await dashboardApi.copyAsset({
        sourceType: options.sourceType,
        sourceId,
        targetDashboardId,
        options: copyOptions,
      });

      if (response.success) {
        setState({
          loading: false,
          error: null,
          success: true,
          copiedAssetId: response.dashboardAssetId,
        });

        // Show success toast
        alert('내 대시보드에 복사되었습니다.\n대시보드에서 편집할 수 있습니다.');

        options.onSuccess?.(response.dashboardAssetId);
      } else {
        throw new Error('복사에 실패했습니다.');
      }
    } catch (error: any) {
      const errorMsg = error.message || '복사 중 오류가 발생했습니다.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
        success: false,
      }));

      alert(errorMsg);
      options.onError?.(errorMsg);
    }
  }, [user, options, modalState.sourceId, closeCopyModal]);

  /**
   * Legacy: Direct copy without modal (Phase 2-A compatibility)
   */
  const copy = useCallback(async (sourceId: string, copyOptions?: CopyOptions) => {
    // Check if user is logged in
    if (!user) {
      const errorMsg = '로그인이 필요합니다.';
      setState(prev => ({ ...prev, error: errorMsg }));
      options.onError?.(errorMsg);
      alert(errorMsg);
      return;
    }

    const targetDashboardId = user.id;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await dashboardApi.copyAsset({
        sourceType: options.sourceType,
        sourceId,
        targetDashboardId,
        options: copyOptions,
      });

      if (response.success) {
        setState({
          loading: false,
          error: null,
          success: true,
          copiedAssetId: response.dashboardAssetId,
        });

        alert('내 대시보드에 복사되었습니다.\n대시보드에서 편집할 수 있습니다.');

        options.onSuccess?.(response.dashboardAssetId);
      } else {
        throw new Error('복사에 실패했습니다.');
      }
    } catch (error: any) {
      const errorMsg = error.message || '복사 중 오류가 발생했습니다.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
        success: false,
      }));

      alert(errorMsg);
      options.onError?.(errorMsg);
    }
  }, [user, options]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: false,
      copiedAssetId: null,
    });
  }, []);

  return {
    ...state,
    copy,
    reset,
    isAuthenticated: !!user,
    // Phase 2-B: Modal controls
    modalState,
    openCopyModal,
    closeCopyModal,
    executeCopy,
  };
}
