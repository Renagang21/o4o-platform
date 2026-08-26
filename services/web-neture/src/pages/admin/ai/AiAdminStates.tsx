/**
 * AI Admin 공통 상태 표시
 *
 * Work Order: WO-O4O-NETURE-AI-ADMIN-API-500-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1
 *
 * 원칙: 조회 실패 ≠ 데이터 0건.
 * - API 실패를 빈 목록/빈 화면/기본값으로 위장하지 않는다.
 * - 상태 코드별로 무엇이 잘못됐는지 사용자에게 그대로 알린다.
 * - 항상 재시도 수단을 제공한다.
 */

export interface AiAdminError {
  status: number | null;
  message: string;
}

/** axios 오류를 화면에 그대로 노출 가능한 형태로 정규화한다. */
export function toAiAdminError(error: unknown): AiAdminError {
  const res = (error as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response;
  const status = typeof res?.status === 'number' ? res.status : null;
  const serverMessage = res?.data?.error || res?.data?.message;

  if (status === 401) {
    return { status, message: '로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.' };
  }
  if (status === 403) {
    return { status, message: '이 화면을 볼 권한이 없습니다. 관리자 권한이 필요합니다.' };
  }
  if (status === 404) {
    return { status, message: '요청한 API를 찾을 수 없습니다. 배포 상태를 확인해 주세요.' };
  }
  if (status && status >= 500) {
    return { status, message: serverMessage || '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }
  if (status) {
    return { status, message: serverMessage || '요청을 처리하지 못했습니다.' };
  }
  return { status: null, message: '서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.' };
}

/** 조회 실패 화면. 빈 상태와 명확히 구분된다. */
export function AiAdminErrorState({
  error,
  onRetry,
  retrying,
}: {
  error: AiAdminError;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      data-testid="ai-admin-error"
      className="bg-white border border-red-200 rounded-xl p-8 text-center"
    >
      <div className="text-red-600 font-semibold">데이터를 불러오지 못했습니다</div>
      <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      {error.status !== null && (
        <p className="text-xs text-gray-400 mt-1">응답 코드: {error.status}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
      >
        {retrying ? '다시 시도 중...' : '다시 시도'}
      </button>
    </div>
  );
}

/** 정상 응답이지만 데이터가 0건일 때. */
export function AiAdminEmptyState({ message }: { message: string }) {
  return (
    <div
      data-testid="ai-admin-empty"
      className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-500"
    >
      {message}
    </div>
  );
}
