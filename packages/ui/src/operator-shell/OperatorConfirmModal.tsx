/**
 * OperatorConfirmModal — Operator 액션 확인 모달
 *
 * WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1
 *
 * 승인/거절/정지 등 Operator 액션 실행 전 확인 모달.
 * AGModal 기반 — 사유 입력(textarea) 옵션 포함.
 */

import React, { useState, useCallback, useRef } from 'react';
import type { OperatorActionType } from '@o4o/types';
import { OPERATOR_ACTION_CONFIGS } from '@o4o/types';
import { AGModal } from '../ag-components/AGModal';

export interface OperatorConfirmModalProps {
  /** 모달 열림 상태 */
  open: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 확인 핸들러 (reason 포함) */
  onConfirm: (reason?: string) => void | boolean | Promise<void | boolean>;
  /** 액션 타입 — 기본 설정 자동 적용 */
  actionType: OperatorActionType;
  /** 제목 오버라이드 */
  title?: string;
  /** 메시지 오버라이드 */
  message?: string;
  /** 확인 버튼 텍스트 오버라이드 */
  confirmText?: string;
  /** 사유 필수 여부 오버라이드 */
  requireReason?: boolean;
  /** 사유 placeholder 오버라이드 */
  reasonPlaceholder?: string;
  /** 로딩 상태 */
  loading?: boolean;
  /** 실패 후 입력과 함께 표시할 오류. */
  error?: string | null;
}

export function OperatorConfirmModal({
  open,
  onClose,
  onConfirm,
  actionType,
  title: titleOverride,
  message: messageOverride,
  confirmText: confirmTextOverride,
  requireReason: requireReasonOverride,
  reasonPlaceholder: placeholderOverride,
  loading = false,
  error,
}: OperatorConfirmModalProps) {
  const config = OPERATOR_ACTION_CONFIGS[actionType];
  const title = titleOverride ?? config.title;
  const message = messageOverride ?? config.message;
  const confirmText = confirmTextOverride ?? config.confirmText;
  const requireReason = requireReasonOverride ?? config.requireReason;
  const placeholder = placeholderOverride ?? config.reasonPlaceholder ?? '';
  const confirmVariant = config.confirmVariant;

  const [reason, setReason] = useState('');
  const confirming = useRef(false);

  const handleClose = useCallback(() => {
    if (loading || confirming.current) return;
    setReason('');
    onClose();
  }, [onClose, loading]);

  const handleConfirm = useCallback(async () => {
    if (loading || confirming.current) return;
    confirming.current = true;
    try {
      const result = await onConfirm(
        requireReason || reason ? reason : undefined,
      );
      if (result !== false) setReason('');
    } finally {
      confirming.current = false;
    }
  }, [onConfirm, reason, requireReason, loading]);

  const confirmDisabled = loading || (requireReason && !reason.trim());

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <AGModal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${confirmButtonClass}`}
          >
            {loading ? '처리 중...' : confirmText}
          </button>
        </div>
      }
    >
      <p className="text-gray-600 mb-4">{message}</p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {(requireReason || config.requireReason) && (
        <textarea
          aria-label="처리 사유"
          disabled={loading}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      )}
    </AGModal>
  );
}
