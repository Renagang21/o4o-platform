/**
 * BulkResultModal — Batch 작업 결과 표시
 *
 * WO-O4O-TABLE-STANDARD-V3
 *
 * 성공/실패/건너뜀 카운트 요약 + 실패 상세 + 재시도 버튼
 */

import React, { useState } from 'react';

export interface BulkResultItem {
  id: string;
  status: 'success' | 'skipped' | 'failed';
  error?: string;
}

export interface BulkResult {
  results: BulkResultItem[];
  successCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface BulkResultModalProps {
  open: boolean;
  onClose: () => void;
  result: BulkResult | null;
  onRetry?: (failedIds: string[]) => void;
  title?: string;
}

export function BulkResultModal({ open, onClose, result, onRetry, title = '일괄 처리 결과' }: BulkResultModalProps) {
  const [showFailed, setShowFailed] = useState(false);

  if (!open || !result) return null;

  const total = result.results.length;
  const failedItems = result.results.filter(r => r.status === 'failed');
  const skippedItems = result.results.filter(r => r.status === 'skipped');
  const allSuccess = result.failedCount === 0 && result.skippedCount === 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">총 {total}건</span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="text-green-600 font-medium">{result.successCount} 성공</span>
            {result.failedCount > 0 && (
              <span className="text-red-600 font-medium">{result.failedCount} 실패</span>
            )}
            {result.skippedCount > 0 && (
              <span className="text-amber-600 font-medium">{result.skippedCount} 건너뜀</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            {result.successCount > 0 && (
              <div
                className="h-full bg-green-500"
                style={{ width: `${(result.successCount / total) * 100}%` }}
              />
            )}
            {result.skippedCount > 0 && (
              <div
                className="h-full bg-amber-400"
                style={{ width: `${(result.skippedCount / total) * 100}%` }}
              />
            )}
            {result.failedCount > 0 && (
              <div
                className="h-full bg-red-500"
                style={{ width: `${(result.failedCount / total) * 100}%` }}
              />
            )}
          </div>

          {allSuccess && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              모든 항목이 성공적으로 처리되었습니다.
            </p>
          )}

          {/* Failed details */}
          {failedItems.length > 0 && (
            <div>
              <button
                onClick={() => setShowFailed(!showFailed)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                {showFailed ? '실패 상세 접기' : `실패 항목 ${failedItems.length}건 보기`}
              </button>
              {showFailed && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {failedItems.map(item => (
                    <li key={item.id} className="text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded">
                      <span className="font-mono">{item.id.slice(0, 8)}...</span>
                      {item.error && <span className="ml-2 text-red-500">— {item.error}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Skipped details */}
          {skippedItems.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              {skippedItems.length}건 건너뜀 (이미 처리된 항목)
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
          {onRetry && failedItems.length > 0 && (
            <button
              onClick={() => onRetry(failedItems.map(r => r.id))}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              실패 {failedItems.length}건 재시도
            </button>
          )}
          <button
            onClick={() => { setShowFailed(false); onClose(); }}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
