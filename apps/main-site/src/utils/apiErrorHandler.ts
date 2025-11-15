/**
 * API Error Handler Utility
 * Phase 6-4: Standardized error handling for Settlement & Analytics modules
 */

export interface ApiError {
  message: string;
  code?: string | number;
  context?: string;
}

/**
 * API 에러를 사용자 친화적인 한글 메시지로 변환
 */
export function getErrorMessage(error: unknown, context?: string): string {
  // Axios 에러 또는 fetch 에러 처리
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    const status = axiosError.response?.status;

    switch (status) {
      case 401:
        return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
      case 403:
        return '이 작업을 수행할 권한이 없습니다.';
      case 404:
        return '요청한 데이터를 찾을 수 없습니다.';
      case 422:
        return '입력하신 데이터가 올바르지 않습니다. 다시 확인해 주세요.';
      case 500:
      case 502:
      case 503:
        return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      default:
        // 서버에서 제공한 메시지가 있으면 사용
        if (axiosError.response?.data?.message) {
          return axiosError.response.data.message;
        }
    }
  }

  // Error 객체 처리
  if (error instanceof Error) {
    return error.message || '알 수 없는 오류가 발생했습니다.';
  }

  // 기본 메시지
  return '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

/**
 * API 에러를 로깅하고 사용자 메시지 반환
 * @param error - 에러 객체
 * @param context - 에러 발생 컨텍스트 (예: "Partner Links 조회")
 * @returns 사용자에게 표시할 메시지
 */
export function handleApiError(error: unknown, context?: string): string {
  const userMessage = getErrorMessage(error, context);

  // 개발 환경에서는 상세 로그 출력
  if (import.meta.env.DEV) {
    console.error(`[API Error${context ? ` - ${context}` : ''}]`, error);
  } else {
    // 프로덕션에서는 간단한 로그만
    console.error(`[API Error${context ? ` - ${context}` : ''}]`, userMessage);
  }

  return userMessage;
}

/**
 * Settlement 관련 액션 에러 메시지
 */
export const SETTLEMENT_ERROR_MESSAGES = {
  CREATE: '정산을 생성하는 중 오류가 발생했습니다.',
  UPDATE_STATUS: '정산 상태를 변경하는 중 오류가 발생했습니다.',
  UPDATE_PAYOUT: '지급 정보를 업데이트하는 중 오류가 발생했습니다.',
  UPDATE_MEMO: '메모를 저장하는 중 오류가 발생했습니다.',
  DELETE: '정산을 삭제하는 중 오류가 발생했습니다.',
  FETCH_LIST: '정산 목록을 불러오는 중 오류가 발생했습니다.',
  FETCH_DETAIL: '정산 상세 정보를 불러오는 중 오류가 발생했습니다.',
} as const;

/**
 * Partner 관련 액션 에러 메시지
 */
export const PARTNER_ERROR_MESSAGES = {
  // Links
  FETCH_LINKS: '파트너 링크 목록을 불러오는 중 오류가 발생했습니다.',
  CREATE_LINK: '파트너 링크를 생성하는 중 오류가 발생했습니다.',
  UPDATE_LINK: '파트너 링크를 수정하는 중 오류가 발생했습니다.',
  DELETE_LINK: '파트너 링크를 삭제하는 중 오류가 발생했습니다.',

  // Analytics
  FETCH_ANALYTICS_SUMMARY: '분석 요약 정보를 불러오는 중 오류가 발생했습니다.',
  FETCH_ANALYTICS_TIMESERIES: '시계열 분석 데이터를 불러오는 중 오류가 발생했습니다.',
  FETCH_LINK_SUMMARIES: '링크별 요약 정보를 불러오는 중 오류가 발생했습니다.',
} as const;

/**
 * 네트워크 에러 여부 확인
 */
export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as any;
    return (
      err.message?.includes('Network Error') ||
      err.message?.includes('Failed to fetch') ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ETIMEDOUT'
    );
  }
  return false;
}

/**
 * 권한 에러 여부 확인
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    const status = axiosError.response?.status;
    return status === 401 || status === 403;
  }
  return false;
}
