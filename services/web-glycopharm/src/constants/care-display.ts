/**
 * Care 모듈 공통 표시 상수
 * WO-O4O-CARE-COMMON-CONSTANTS-AND-UTILS-CONSOLIDATION-V1
 *
 * 사용처: PatientDetailPage, SummaryTab, HistoryTab, AnalysisTab
 */
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700 border-red-200', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertCircle },
  low: { label: '양호', cls: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle },
} as const;
