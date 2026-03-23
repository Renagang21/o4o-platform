/**
 * AiReportPage - GlucoseView wrapper
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 *
 * 공통 컴포넌트(@o4o/ui) + 서비스별 config 주입
 * GlucoseView: headerNav 포함, AiSummaryButton 없음
 */

import { AiReportPage as SharedAiReportPage } from '@o4o/ui';
import { glucoseviewAiReportConfig } from './aiReportConfig';

export default function AiReportPage() {
  return <SharedAiReportPage config={glucoseviewAiReportConfig} />;
}
