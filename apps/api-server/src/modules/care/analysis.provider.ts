import type { CareInsightDto } from './dto.js';
import type { CgmProvider } from './cgm.provider.js';
import { analyzeReadings } from './analysis.engine.js';
import type { AnalysisResult } from './analysis.engine.js';

export interface AnalysisProvider {
  analyzePatient(patientId: string): Promise<CareInsightDto>;
}

/**
 * DefaultAnalysisProvider
 *
 * CgmProvider → AnalysisEngine → rule-based insights.
 * No AI service dependency — suitable for default/mock environments.
 */
export class DefaultAnalysisProvider implements AnalysisProvider {
  constructor(private cgmProvider: CgmProvider) {}

  async analyzePatient(patientId: string): Promise<CareInsightDto> {
    const to = new Date();
    const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days

    const readings = await this.cgmProvider.getReadings(patientId, from, to);
    const analysis = analyzeReadings(readings);
    const insights = this.generateInsights(analysis);

    return {
      patientId,
      tir: analysis.tir,
      cv: analysis.cv,
      riskLevel: analysis.riskLevel,
      insights,
    };
  }

  private generateInsights(a: AnalysisResult): string[] {
    const msgs: string[] = [];

    if (a.tir < 50) {
      msgs.push('목표 범위(70–180 mg/dL) 내 시간이 50% 미만입니다. 혈당 관리 강화가 필요합니다.');
    } else if (a.tir < 70) {
      msgs.push('목표 범위 내 시간이 70% 미만입니다. 식후 혈당 패턴을 확인해 보십시오.');
    } else {
      msgs.push('목표 범위 내 시간이 양호합니다.');
    }

    if (a.cv > 36) {
      msgs.push('혈당 변동성(CV)이 높습니다. 식사 및 활동 패턴 점검을 권장합니다.');
    }

    return msgs;
  }
}
