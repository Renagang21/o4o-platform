/**
 * AI Report Config - K-Cosmetics
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-PRODUCTION-INTEGRATION-AND-REAL-USAGE-E2E-V1:
 *   기존 `mode: 'full'` + 하드코딩 Mock 데이터를 제거하고 empty mode 로 정렬한다.
 *
 *   프로덕션 `/operator/ai-report` 가 실데이터가 아닌 고정 Mock(가상 KPI · 가상 제품명
 *   "수분크림 글로우 에디션" · 가상 매장 "뷰티랩 강남점" 등)을 운영자에게 실적처럼
 *   보여주고 있었다. Context Asset 노출 분석의 backend 는 존재하지 않는다
 *   (api-server 전체에 context_asset/ContextAsset 엔티티·라우트 0건).
 *
 *   canonical 은 이미 KPA-Society · Neture 가 쓰는 empty mode 다. 실데이터 연동은
 *   분석 인프라(수집·저장·집계) 구축이 선행돼야 하므로 별도 WO 로 분리한다.
 *
 * Empty mode - 분석 인프라 구축 후 실데이터 연동 예정
 */

import type { AiReportConfig } from '@o4o/ui';

export const kCosmeticsAiReportConfig: Omit<AiReportConfig, 'headerActions'> = {
  mode: 'empty',
  theme: 'pink',
  assetTypes: [],
  infoBannerText: (
    <>
      <strong>Context Asset</strong>은 AI 응답에 포함된 제품, 매장, 콘텐츠, 브랜드 정보입니다.
      이 리포트를 통해 고객이 어떤 정보를 많이 찾고 있는지 파악하고,
      서비스를 개선할 수 있습니다.
    </>
  ),
  emptyStateDescription:
    'AI 응답 분석 인프라가 준비되면 KPI, Context Asset 노출 현황, 노출 사유 분포, 일별 트렌드, 품질 인사이트가 표시됩니다.',
};
