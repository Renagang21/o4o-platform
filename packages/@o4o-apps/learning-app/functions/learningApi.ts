/**
 * Learning App API Client Factory
 *
 * NOTE: Learning App은 교육/평가 도구가 아닌 순차 전달 도구입니다.
 * Flow = 콘텐츠 묶음 + 순서 정보
 */

import type {
  Flow,
  FlowWithSteps,
  FlowProgress,
  FlowListParams,
  CreateFlowRequest,
  UpdateFlowRequest,
  ApiResponse,
  PaginatedResponse,
} from '../types/LearningTypes.js';

/**
 * API 클라이언트 인터페이스
 */
interface ApiClient {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: Record<string, unknown>): Promise<T>;
  patch<T>(url: string, data?: Record<string, unknown>): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

/**
 * Learning API 생성
 * @param apiClient - API 클라이언트 인스턴스
 */
export function createLearningApi(apiClient: ApiClient) {
  return {
    // ============================================
    // Flow 조회
    // ============================================

    /**
     * Flow 목록 조회
     */
    getFlows: (params?: FlowListParams) =>
      apiClient.get<PaginatedResponse<Flow>>('/api/v1/flows', params as Record<string, unknown>),

    /**
     * Flow 상세 조회 (단계별 Content 포함)
     */
    getFlow: (id: string) =>
      apiClient.get<ApiResponse<FlowWithSteps>>(`/api/v1/flows/${id}`),

    // ============================================
    // 진행 상태
    // ============================================

    /**
     * 내 진행 상태 조회
     */
    getMyProgress: (flowId: string) =>
      apiClient.get<ApiResponse<FlowProgress>>(`/api/v1/flows/${flowId}/progress`),

    /**
     * 진행 상태 저장/업데이트
     * - 현재 단계 인덱스 저장
     * - 본 단계 기록
     */
    updateProgress: (flowId: string, stepIndex: number) =>
      apiClient.post<ApiResponse<FlowProgress>>(`/api/v1/flows/${flowId}/progress`, {
        currentStepIndex: stepIndex,
      }),

    /**
     * 진행 상태 초기화
     */
    resetProgress: (flowId: string) =>
      apiClient.delete<ApiResponse<void>>(`/api/v1/flows/${flowId}/progress`),

    // ============================================
    // 관리용 (선택적)
    // ============================================

    /**
     * Flow 생성 (관리자용)
     */
    createFlow: (data: CreateFlowRequest) =>
      apiClient.post<ApiResponse<Flow>>('/api/v1/flows', data as unknown as Record<string, unknown>),

    /**
     * Flow 수정 (관리자용)
     */
    updateFlow: (id: string, data: UpdateFlowRequest) =>
      apiClient.patch<ApiResponse<Flow>>(`/api/v1/flows/${id}`, data as unknown as Record<string, unknown>),

    /**
     * Flow 삭제 (관리자용)
     */
    deleteFlow: (id: string) =>
      apiClient.delete<ApiResponse<void>>(`/api/v1/flows/${id}`),
  };
}

export type LearningApi = ReturnType<typeof createLearningApi>;
