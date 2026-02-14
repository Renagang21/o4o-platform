import type { AnalysisProvider } from './analysis.provider.js';
import type { CareInsightDto } from './dto.js';

/**
 * MockAnalysisProvider
 *
 * Deterministic mock provider — no Math.random, no DB access.
 * Uses a simple string hash of patientId for reproducible results.
 */
export class MockAnalysisProvider implements AnalysisProvider {
  async analyzePatient(patientId: string): Promise<CareInsightDto> {
    const hash = this.simpleHash(patientId);

    const tir = 65 + (hash % 20);
    const cv = 30 + (hash % 10);

    const riskLevel: CareInsightDto['riskLevel'] =
      tir < 70 ? 'high' :
      tir < 80 ? 'moderate' : 'low';

    return {
      patientId,
      tir,
      cv,
      riskLevel,
      insights: [
        '최근 식후 혈당 변동이 관찰됩니다.',
        '야간 혈당 패턴을 확인해 보십시오.',
      ],
    };
  }

  /** Simple deterministic hash from string → positive integer */
  private simpleHash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
}
