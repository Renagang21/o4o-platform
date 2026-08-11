/**
 * LoadErrorNotice — 조회 실패 안내 (4상태 계약: loading / error / empty / ready)
 *
 * WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1
 *   API 실패를 빈 목록으로 위장하던 화면에서 "데이터 없음(empty)" 과
 *   "불러오지 못함(error)" 을 구분하기 위한 최소 구현이다.
 *   공통 패키지 승격은 이번 배치 범위 밖 — CHECK 에 공통화 후보로 기록한다.
 *
 * 표시 원칙: raw stack trace / HTML 응답 / secret 노출 금지.
 *           detail 에는 endpoint 나 status 정도만 넣는다.
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface LoadErrorNoticeProps {
  onRetry?: () => void;
  detail?: string;
  compact?: boolean;
  className?: string;
}

export function LoadErrorNotice({ onRetry, detail, compact, className }: LoadErrorNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 text-center ${
        compact ? 'px-4 py-6' : 'px-6 py-12'
      } ${className ?? ''}`}
      role="alert"
    >
      <AlertTriangle className={`mx-auto mb-3 text-amber-500 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
      <p className="text-sm font-medium text-gray-900">데이터를 불러오지 못했습니다.</p>
      <p className="mt-1 text-sm text-gray-600">잠시 후 다시 시도해 주세요.</p>
      {detail && <p className="mt-2 text-xs text-gray-400 break-all">{detail}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      )}
    </div>
  );
}

export default LoadErrorNotice;
