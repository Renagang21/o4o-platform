/**
 * Participation API Service
 * 설문/퀴즈 참여 관련 API
 */

import { apiClient } from './client';
import type {
  ParticipationSet,
  ParticipationResponse,
  ParticipationResult,
  ParticipationStatus,
} from '../pages/participation/types';
import type { ApiResponse, PaginatedResponse } from '../types';

export const participationApi = {
  /**
   * 참여(설문/퀴즈) 목록 조회
   */
  getParticipationSets: (params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<ParticipationSet>>('/participation/sets', params),

  /**
   * 참여 세트 상세 조회
   */
  getParticipationSet: (id: string) =>
    apiClient.get<ApiResponse<ParticipationSet>>(`/participation/sets/${id}`),

  /**
   * 참여 세트 생성
   */
  createParticipationSet: (
    payload: Omit<ParticipationSet, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ) =>
    apiClient.post<ApiResponse<ParticipationSet>>('/participation/sets', payload),

  /**
   * 참여 세트 수정
   */
  updateParticipationSet: (id: string, payload: Partial<ParticipationSet>) =>
    apiClient.patch<ApiResponse<ParticipationSet>>(`/participation/sets/${id}`, payload),

  /**
   * 참여 세트 삭제
   */
  deleteParticipationSet: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/participation/sets/${id}`),

  /**
   * 응답 제출
   */
  submitResponse: (
    participationSetId: string,
    answers: ParticipationResponse['answers']
  ) =>
    apiClient.post<ApiResponse<ParticipationResponse>>(
      `/participation/sets/${participationSetId}/responses`,
      { answers }
    ),

  /**
   * 내 응답 조회
   */
  getMyResponse: async (
    participationSetId: string
  ): Promise<ParticipationResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponse<ParticipationResponse>>(
        `/participation/sets/${participationSetId}/my-response`
      );
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * 결과 조회
   */
  getResults: (participationSetId: string) =>
    apiClient.get<ApiResponse<ParticipationResult>>(
      `/participation/sets/${participationSetId}/results`
    ),

  /**
   * 참여 상태 변경 (활성화/종료)
   */
  updateStatus: (id: string, status: ParticipationStatus) =>
    apiClient.patch<ApiResponse<ParticipationSet>>(`/participation/sets/${id}/status`, {
      status,
    }),
};
