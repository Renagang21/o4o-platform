/**
 * LoadError — 조회 실패 안내 (공통)
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1
 *   4상태 계약(loading / error / empty / ready)의 error 담당. EmptyState 의 짝이다.
 *   WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1 에서 서비스별로 생긴
 *   ErrorState / LoadErrorNotice / LoadErrorState 4벌을 여기로 승격한다.
 *
 * 표시 원칙: raw stack trace / HTML 응답 / secret 노출 금지.
 *           detail 에는 endpoint 나 status 정도만 넣는다.
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface LoadErrorProps {
  /** 기본값 '데이터를 불러오지 못했습니다.' */
  title?: string;
  /** 기본값 '잠시 후 다시 시도해 주세요.' */
  description?: string;
  /** endpoint / status 수준의 보조 정보 */
  detail?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export const LOAD_ERROR_TITLE = '데이터를 불러오지 못했습니다.';
export const LOAD_ERROR_DESCRIPTION = '잠시 후 다시 시도해 주세요.';

export function LoadError({
  title = LOAD_ERROR_TITLE,
  description = LOAD_ERROR_DESCRIPTION,
  detail,
  onRetry,
  compact,
  className,
}: LoadErrorProps) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 text-center ${
        compact ? 'px-4 py-6' : 'px-6 py-12'
      } ${className ?? ''}`}
      role="alert"
    >
      <AlertTriangle className={`mx-auto mb-3 text-amber-500 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
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

export default LoadError;
