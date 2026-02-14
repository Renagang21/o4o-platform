import type { AnalysisProvider } from './analysis.provider.js';
import type { CareInsightDto } from './dto.js';
import { AiInsightService } from '@o4o/pharmacy-ai-insight/backend';
import type { AiInsightOutput } from '@o4o/pharmacy-ai-insight/backend';

/**
 * AiInsightProvider
 *
 * Connects Care Analysis layer to @o4o/pharmacy-ai-insight.
 * Maps AiInsightOutput → CareInsightDto.
 *
 * - tir/cv: not computed by AI (requires real CGM data), defaults to 0
 * - riskLevel: derived from card tones
 * - insights: extracted from summaryCards content
 */
export class AiInsightProvider implements AnalysisProvider {
  private aiService: AiInsightService;

  constructor() {
    this.aiService = new AiInsightService();
  }

  async analyzePatient(patientId: string): Promise<CareInsightDto> {
    const result = await this.aiService.generateInsight({
      context: { pharmacyId: patientId },
    });

    return this.mapToDto(patientId, result);
  }

  private mapToDto(patientId: string, output: AiInsightOutput): CareInsightDto {
    // Extract insights text from summary cards
    const insights = output.summaryCards.map((card) => card.content);

    // Derive riskLevel from card tones
    const riskLevel = this.deriveRiskLevel(output);

    // tir/cv: not computed by AI service (requires real CGM data).
    // Defaults to 0 — will be replaced when real vendor data flows in.
    const tir = 0;
    const cv = 0;

    return {
      patientId,
      tir,
      cv,
      riskLevel,
      insights,
    };
  }

  private deriveRiskLevel(output: AiInsightOutput): CareInsightDto['riskLevel'] {
    const tones = output.summaryCards.map((c) => c.tone);

    if (tones.includes('cautious')) return 'high';
    if (tones.every((t) => t === 'positive')) return 'low';
    return 'moderate';
  }
}
