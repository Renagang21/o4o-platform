/**
 * AI Report Config - KPA Society
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * Empty mode - 분석 인프라 구축 후 실데이터 연동 예정
 */

import type { AiReportConfig } from '@o4o/ui';

export const kpaSocietyAiReportConfig: AiReportConfig = {
  mode: 'empty',
  theme: 'green',
  assetTypes: [],
  infoBannerText: (
    <>
      <strong>Context Asset</strong>은 AI 응답에 포함된 강좌, 회원, 문서, 이벤트 정보입니다.
      이 리포트를 통해 회원들이 어떤 정보를 많이 찾고 있는지 파악하고,
      서비스 개선에 활용할 수 있습니다.
    </>
  ),
  emptyStateDescription:
    'AI 응답 분석 인프라가 준비되면 KPI, Context Asset 노출 현황, 노출 사유 분포, 일별 트렌드, 품질 인사이트가 표시됩니다.',
};
