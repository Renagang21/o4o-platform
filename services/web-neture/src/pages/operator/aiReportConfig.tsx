/**
 * AI Report Config - Neture
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * Empty mode - 분석 인프라 구축 후 실데이터 연동 예정
 */

import type { AiReportConfig } from '@o4o/ui';

export const netureAiReportConfig: AiReportConfig = {
  mode: 'empty',
  theme: 'green',
  assetTypes: [],
  infoBannerText: (
    <>
      <strong>Context Asset</strong>은 AI 응답에 포함된 상품, 공급자, 콘텐츠, 매장 정보입니다.
      이 리포트를 통해 어떤 자산이 사용자에게 많이 노출되고 있는지 파악하고,
      콘텐츠 전략을 수립할 수 있습니다.
    </>
  ),
  emptyStateDescription:
    'AI 응답 분석 인프라가 준비되면 KPI, Context Asset 노출 현황, 노출 사유 분포, 일별 트렌드, 품질 인사이트가 표시됩니다.',
};
