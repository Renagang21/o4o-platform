import type { DataSource, Repository } from 'typeorm';
import { execute } from '@o4o/ai-core';
import { CARE_LLM_INSIGHT_SYSTEM } from '@o4o/ai-prompts/care';
import { CareLlmInsight } from '../../entities/care-llm-insight.entity.js';
import { buildConfigResolver } from '../../../../utils/ai-config-resolver.js';
import type { CareInsightDto } from '../../domain/dto.js';
import type { CareKpiSnapshot } from '../../entities/care-kpi-snapshot.entity.js';

/**
 * CareLlmInsightService — WO-O4O-CARE-LLM-INSIGHT-V1
 *
 * 분석 결과를 LLM으로 설명 생성 (pharmacyInsight + patientMessage).
 *
 * 핵심 원칙:
 * - LLM = 설명 (진단/처방/치료 권고 금지)
 * - fire-and-forget: 실패해도 기존 인사이트에 영향 없음
 * - snapshot 당 1회 호출 (캐시 기반, 중복 방어)
 * - retry는 execute() 내장 (2회, 2초 delay)
 */

interface LlmResponse {
  pharmacyInsight: string;
  patientMessage: string;
}

export class CareLlmInsightService {
  private insightRepo: Repository<CareLlmInsight>;
  private configResolver: () => Promise<import('@o4o/ai-core').AIProviderConfig>;

  constructor(private dataSource: DataSource) {
    this.insightRepo = dataSource.getRepository(CareLlmInsight);
    this.configResolver = buildConfigResolver(dataSource, 'care');
  }

  /**
   * Fire-and-forget: generate + cache LLM insight for a snapshot.
   * - 중복 방어: snapshot_id 기존 존재 시 skip
   * - retry는 execute() 내장 (2회, 2초 delay)
   * - 전체 try/catch — 실패 시 log만, throw 안 함.
   */
  async generateAndCache(
    snapshot: CareKpiSnapshot,
    analysis: CareInsightDto,
    pharmacyId: string,
  ): Promise<void> {
    try {
      // 중복 방어: 이 snapshot에 대해 이미 insight가 있으면 skip
      const existing = await this.insightRepo.findOne({
        where: { snapshotId: snapshot.id },
        select: ['id'],
      });
      if (existing) {
        return;
      }

      const userPrompt = this.buildUserPrompt(analysis);

      const response = await execute({
        systemPrompt: CARE_LLM_INSIGHT_SYSTEM,
        userPrompt,
        config: this.configResolver,
        meta: { service: 'care', callerName: 'CareLlmInsight' },
      });

      const parsed = JSON.parse(response.content) as LlmResponse;

      // 필수 필드 검증
      if (!parsed.pharmacyInsight || !parsed.patientMessage) {
        console.error('[CareLlmInsight] Invalid LLM response: missing required fields', {
          snapshotId: snapshot.id,
          content: response.content.slice(0, 200),
        });
        return;
      }

      const insight = this.insightRepo.create({
        snapshotId: snapshot.id,
        pharmacyId,
        patientId: analysis.patientId,
        pharmacyInsight: parsed.pharmacyInsight,
        patientMessage: parsed.patientMessage,
        model: response.model,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
      });
      await this.insightRepo.save(insight);
    } catch (error) {
      // Outer guard: quiet fail — 실패 시 log만, throw 안 함
      console.error('[CareLlmInsight] unexpected error:', error);
    }
  }

  /**
   * Get latest cached insight for a patient (pharmacy-scoped).
   */
  async getLatestInsight(
    patientId: string,
    pharmacyId?: string | null,
  ): Promise<{
    pharmacyInsight: string | null;
    patientMessage: string | null;
    model: string | null;
    createdAt: string | null;
  }> {
    const qb = this.insightRepo
      .createQueryBuilder('i')
      .where('i.patient_id = :patientId', { patientId })
      .orderBy('i.created_at', 'DESC')
      .limit(1);

    if (pharmacyId) {
      qb.andWhere('i.pharmacy_id = :pharmacyId', { pharmacyId });
    }

    const row = await qb.getOne();
    if (!row) {
      return {
        pharmacyInsight: null,
        patientMessage: null,
        model: null,
        createdAt: null,
      };
    }

    return {
      pharmacyInsight: row.pharmacyInsight,
      patientMessage: row.patientMessage,
      model: row.model,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Build user prompt from analysis data.
   */
  private buildUserPrompt(analysis: CareInsightDto): string {
    const parts: string[] = [
      `TIR (Time in Range): ${analysis.tir}%`,
      `CV (변동계수): ${analysis.cv}%`,
      `위험도: ${analysis.riskLevel}`,
    ];

    if (analysis.insights.length > 0) {
      parts.push(`분석 인사이트: ${analysis.insights.join(' / ')}`);
    }

    if (analysis.multiMetric) {
      const mm = analysis.multiMetric;
      if (mm.bp) {
        parts.push(
          `혈압: ${mm.bp.avgSystolic}/${mm.bp.avgDiastolic} mmHg (${mm.bp.bpCategory}), 측정 ${mm.bp.readingCount}회`,
        );
      }
      if (mm.weight) {
        parts.push(`체중: ${mm.weight.latestWeight}kg`);
        if (mm.weight.weightChange != null) {
          parts.push(`체중 변화: ${mm.weight.weightChange > 0 ? '+' : ''}${mm.weight.weightChange}kg`);
        }
      }
      if (mm.metabolicRisk) {
        parts.push(
          `대사 위험도: ${mm.metabolicRisk.metabolicRiskLevel} (${mm.metabolicRisk.metabolicScore}점/100)`,
        );
        if (mm.metabolicRisk.riskFactors.length > 0) {
          parts.push(`위험 요인: ${mm.metabolicRisk.riskFactors.join(', ')}`);
        }
      }
    }

    return parts.join('\n');
  }
}
