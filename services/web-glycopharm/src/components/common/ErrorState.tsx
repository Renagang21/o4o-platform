/**
 * ErrorState - API 에러 발생 시 표시하는 공통 컴포넌트
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = '데이터를 불러오는 중 오류가 발생했습니다.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-800 mb-2">오류 발생</h3>
      <p className="text-slate-500 mb-4 max-w-sm mx-auto">{message}</p>
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
