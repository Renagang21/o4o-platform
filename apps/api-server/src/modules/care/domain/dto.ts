import type { BpAnalysisResult, WeightAnalysisResult, MetabolicRiskResult } from './analysis/multi-metric.engine.js';

export interface MultiMetricData {
  bp: BpAnalysisResult | null;
  weight: WeightAnalysisResult | null;
  metabolicRisk: MetabolicRiskResult;
}

export interface CareInsightDto {
  patientId: string;
  tir: number;
  cv: number;
  riskLevel: 'low' | 'moderate' | 'high';
  insights: string[];
  multiMetric?: MultiMetricData;
}
