/**
 * ConfirmActionDialog — Row-level Action Confirm Dialog
 *
 * WO-O4O-TABLE-STANDARD-V4 Phase 2
 *
 * 행 단위 액션(승인/거절/삭제/상태변경) 실행 전 확인 다이얼로그.
 * OperatorConfirmModal 대비:
 * - @o4o/types 의존 없음 (순수 UI)
 * - RowActionMenu와 내부 통합
 * - 독립 사용도 가능
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ConfirmActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
  requireReason?: boolean;
  /** Show optional reason textarea (requireReason makes it mandatory) */
  showReason?: boolean;
  reasonPlaceholder?: string;
  loading?: boolean;
}

const variantButtonStyles: Record<string, string> = {
  default: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
};

export function ConfirmActionDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'default',
  requireReason = false,
  showReason = false,
  reasonPlaceholder = '사유를 입력하세요',
  loading = false,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = useState('');

  const handleClose = useCallback(() => {
    setReason('');
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    await onConfirm(reason ? reason : undefined);
    setReason('');
  }, [onConfirm, reason]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    },
    [handleClose],
  );

  const confirmDisabled = loading || (requireReason && !reason.trim());

  if (!open) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-sm bg-white rounded-lg shadow-xl"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-gray-600 text-sm whitespace-pre-line">{message}</p>
            {(requireReason || showReason) && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                rows={3}
                className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmDisabled}
                className={`px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${
                  variantButtonStyles[variant]
                }`}
              >
                {loading ? '처리 중...' : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(dialog, document.body);
  }
  return dialog;
}
