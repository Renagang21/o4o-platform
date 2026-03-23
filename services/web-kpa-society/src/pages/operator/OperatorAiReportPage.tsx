/**
 * OperatorAiReportPage - KPA Society wrapper
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * 공통 컴포넌트(@o4o/ui) + 서비스별 config 주입
 */

import { AiReportPage } from '@o4o/ui';
import { kpaSocietyAiReportConfig } from './aiReportConfig';

export default function OperatorAiReportPage() {
  return <AiReportPage config={kpaSocietyAiReportConfig} />;
}
