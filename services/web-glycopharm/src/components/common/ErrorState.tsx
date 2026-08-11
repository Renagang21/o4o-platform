/**
 * ErrorState - API 에러 발생 시 표시하는 공통 컴포넌트
 *
 * WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1
 *   4상태 계약(loading / error / empty / ready)의 error 담당.
 *   기본 문구를 표준 문구로 맞춘다 — "데이터를 불러오지 못했습니다." / "잠시 후 다시 시도해 주세요."
 *   raw stack trace / HTML 응답 / secret 은 노출하지 않는다 (detail 은 endpoint·status 수준).
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = '잠시 후 다시 시도해 주세요.',
  detail,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-800 mb-2">데이터를 불러오지 못했습니다.</h3>
      <p className="text-slate-500 mb-2 max-w-sm mx-auto">{message}</p>
      {detail && <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto break-all">{detail}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      )}
    </div>
  );
}
