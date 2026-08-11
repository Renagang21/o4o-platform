/**
 * PartnerOps 조회 실패 표시 · mutation 안내 공통 컴포넌트
 *
 * WO-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1
 *
 * 기존 partnerops 화면 6종은 API 실패를 catch 한 뒤 데모 데이터를 주입해
 * "실패"를 "실적이 있는 정상 화면"처럼 위장했다. 본 컴포넌트가 그 자리를 대체한다.
 *
 * 표시 원칙:
 *   - 실패는 실패로 표시한다 (0건 정상 상태와 구분한다)
 *   - endpoint / status / 요약 메시지만 노출한다
 *   - raw stack trace · 응답 본문 원문 · secret 은 노출하지 않는다
 */

import { FC } from 'react';
import { AlertCircle, RefreshCw, Lock } from 'lucide-react';

export interface PartnerOpsLoadErrorInfo {
  /** 호출한 API 경로 (authClient base 이후 경로) */
  endpoint: string;
  /** HTTP status (응답이 없으면 undefined) */
  status?: number;
  /** 사용자에게 보여줄 요약 메시지 */
  message: string;
}

const GENERIC_MESSAGE = '요청을 처리하지 못했습니다.';
const MAX_MESSAGE_LENGTH = 200;

/**
 * 예외 객체를 사용자 노출 가능한 형태로 축약한다.
 * 응답 본문을 그대로 쓰지 않는다 (HTML 오류 페이지 · 내부 정보 노출 방지).
 */
export function toLoadError(err: unknown, endpoint: string): PartnerOpsLoadErrorInfo {
  const e = err as any;
  const status: number | undefined =
    typeof e?.response?.status === 'number' ? e.response.status : undefined;

  let message = GENERIC_MESSAGE;

  const data = e?.response?.data;
  const rawCandidate =
    typeof data === 'string'
      ? data
      : typeof data?.error === 'string'
        ? data.error
        : typeof data?.message === 'string'
          ? data.message
          : undefined;

  if (typeof rawCandidate === 'string' && rawCandidate.trim().length > 0) {
    const trimmed = rawCandidate.trim();
    message = trimmed.startsWith('<')
      ? 'API 응답이 JSON 이 아닙니다 (HTML 응답).'
      : trimmed.slice(0, MAX_MESSAGE_LENGTH);
  } else if (status === undefined && typeof e?.message === 'string' && e.message.trim()) {
    // 응답 자체가 없는 경우(네트워크 오류 등)만 예외 메시지 한 줄을 사용한다.
    message = e.message.split('\n')[0].slice(0, MAX_MESSAGE_LENGTH);
  }

  if (status === 404) {
    message = '운영 API 엔드포인트가 존재하지 않습니다 (404).';
  } else if (status === 401 || status === 403) {
    message = '이 데이터를 조회할 권한이 없습니다.';
  } else if (status !== undefined && status >= 500) {
    message = '서버에서 오류가 발생했습니다.';
  }

  return { endpoint, status, message };
}

export interface PartnerOpsLoadErrorProps {
  error: PartnerOpsLoadErrorInfo;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * 조회 실패 표시 — 데모 데이터를 대신한다.
 */
export const PartnerOpsLoadError: FC<PartnerOpsLoadErrorProps> = ({
  error,
  onRetry,
  retrying = false,
}) => (
  <div className="bg-white border border-red-200 rounded-lg p-6">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          데이터를 불러오지 못했습니다
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          아래는 실제 실적이 아니라 조회 실패 상태입니다. 화면에 표시할 수 있는 데이터가 없습니다.
        </p>

        <dl className="text-sm border border-gray-200 rounded-md divide-y divide-gray-200 bg-gray-50">
          <div className="flex gap-3 px-3 py-2">
            <dt className="w-24 shrink-0 text-gray-500">API</dt>
            <dd className="font-mono text-gray-800 break-all">{error.endpoint}</dd>
          </div>
          <div className="flex gap-3 px-3 py-2">
            <dt className="w-24 shrink-0 text-gray-500">응답 상태</dt>
            <dd className="font-mono text-gray-800">{error.status ?? '응답 없음'}</dd>
          </div>
          <div className="flex gap-3 px-3 py-2">
            <dt className="w-24 shrink-0 text-gray-500">오류</dt>
            <dd className="text-gray-800 break-words">{error.message}</dd>
          </div>
        </dl>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            다시 시도
          </button>
        )}
      </div>
    </div>
  </div>
);

/** mutation CTA 비활성 사유 — 운영 API 미검증 */
export const PARTNEROPS_MUTATION_DISABLED_REASON = '이 기능은 현재 운영 API 검증 전입니다.';
/** mutation CTA 비활성 사유 — 데이터 미확인 */
export const PARTNEROPS_MUTATION_BLOCKED_BY_DATA = '데이터가 확인되지 않아 실행할 수 없습니다.';

export interface PartnerOpsMutationNoticeProps {
  reason?: string;
}

/**
 * 생성·수정·삭제·다운로드 CTA 가 비활성인 이유를 화면에 명시한다.
 */
export const PartnerOpsMutationNotice: FC<PartnerOpsMutationNoticeProps> = ({
  reason = PARTNEROPS_MUTATION_DISABLED_REASON,
}) => (
  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
    <Lock className="w-4 h-4 shrink-0 text-gray-400" />
    <span>{reason}</span>
  </div>
);

export default PartnerOpsLoadError;
