/**
 * AiReportPage - K-Cosmetics wrapper
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * 공통 컴포넌트(@o4o/ui) + 서비스별 config 주입
 */

import { AiReportPage as SharedAiReportPage } from '@o4o/ui';
import { AiSummaryButton } from '../../components/ai';
import { kCosmeticsAiReportConfig } from './aiReportConfig';

export default function AiReportPage() {
  return (
    <SharedAiReportPage
      config={{
        ...kCosmeticsAiReportConfig,
        headerActions: <AiSummaryButton contextLabel="AI 리포트 분석" serviceId="k-cosmetics" />,
      }}
    />
  );
}
