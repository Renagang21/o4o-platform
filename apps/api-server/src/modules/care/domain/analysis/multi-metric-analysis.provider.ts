import type { AnalysisProvider } from './analysis.provider.js';
import type { CareInsightDto } from '../dto.js';
import type { HealthMetricProvider } from '../provider/health-metric.provider.js';
import { analyzeBp, analyzeWeight, assessMetabolicRisk } from './multi-metric.engine.js';

/**
 * MultiMetricAnalysisProvider
 *
 * WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1
 *
 * Delegates glucose analysis to the base AnalysisProvider, then enriches
 * the result with blood pressure + weight analysis and metabolic risk.
 */
export class MultiMetricAnalysisProvider implements AnalysisProvider {
  constructor(
    private baseProvider: AnalysisProvider,
    private metricProvider: HealthMetricProvider,
  ) {}

  async analyzePatient(patientId: string): Promise<CareInsightDto> {
    const to = new Date();
    const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days

    // Parallel: glucose analysis + BP/Weight data fetch
    const [baseResult, bpReadings, weightReadings] = await Promise.all([
      this.baseProvider.analyzePatient(patientId),
      this.metricProvider.getBpReadings(patientId, from, to),
      this.metricProvider.getWeightReadings(patientId, from, to),
    ]);

    // Analyse BP & Weight with pure functions
    const bpResult = bpReadings.length > 0 ? analyzeBp(bpReadings) : null;
    const weightResult = weightReadings.length > 0 ? analyzeWeight(weightReadings) : null;

    // Metabolic risk assessment
    const metabolicRisk = assessMetabolicRisk(
      baseResult.riskLevel,
      bpResult,
      weightResult,
    );

    // Append multi-metric insights to existing insights
    const multiMetricInsights = [...metabolicRisk.riskFactors];
    if (bpResult && bpResult.readingCount > 0 && bpResult.bpCategory === 'normal') {
      multiMetricInsights.push('혈압이 정상 범위입니다.');
    }
    if (weightResult && weightResult.readingCount > 0 && weightResult.weightChange === null) {
      multiMetricInsights.push(`체중 ${weightResult.latestWeight}kg (단일 측정)`);
    }

    return {
      ...baseResult,
      insights: [...baseResult.insights, ...multiMetricInsights],
      multiMetric: {
        bp: bpResult,
        weight: weightResult,
        metabolicRisk,
      },
    };
  }
}
