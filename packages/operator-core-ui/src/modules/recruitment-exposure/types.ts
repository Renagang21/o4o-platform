/**
 * Operator Recruitment Exposure Module — Types
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * `@o4o/operator-ux-core` 의 `RecruitmentExposureConsole` 은 이미 공통이지만,
 * 그 위의 **페이지 셸**(조회 · exposureStatus 필터 · URL sync · 승인/반려 · 4상태 처리)이
 * KPA / K-Cosmetics / GlycoPharm 3곳에 각각 복제돼 있었다(CORE_ONLY).
 * 셸을 공통 모듈로 올리고, 서비스는 HTTP client adapter + audienceLabel 만 주입한다.
 *
 * API endpoint · payload 계약은 서비스별 per-service proxy 그대로다(백엔드 무변경).
 */

import type { RecruitmentExposureItem } from '@o4o/operator-ux-core';

export type { RecruitmentExposureItem };

/**
 * 서비스별 HTTP adapter.
 *
 * 서비스마다 client 가 다르고(`apiClient` 는 envelope 를 벗겨 반환, axios `api` 는 `res.data.data`)
 * base path 도 per-service proxy 로 다르다 → 그 차이만 adapter 가 흡수한다.
 */
export interface RecruitmentExposureClient {
  /**
   * 노출 승인 대상 목록.
   * @param exposureStatus 필터 값. `null` 이면 전체(`all`) — 쿼리 파라미터를 붙이지 않는다.
   */
  list(exposureStatus: string | null): Promise<RecruitmentExposureItem[]>;
  /** 승인 / 반려 처리 */
  decide(id: string, action: 'approve' | 'reject', note?: string): Promise<void>;
}

export interface OperatorRecruitmentExposurePageProps {
  /** 서비스별 HTTP adapter */
  client: RecruitmentExposureClient;
  /** 노출 대상 독자 라벨 (예: '매장 사용자' / '매장/약국 사용자') */
  audienceLabel: string;
}
