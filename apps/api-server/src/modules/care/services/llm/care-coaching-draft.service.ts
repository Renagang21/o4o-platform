import type { DataSource, Repository } from 'typeorm';
import { execute } from '@o4o/ai-core';
import { CARE_COACHING_DRAFT_SYSTEM } from '@o4o/ai-prompts/care';
import { CareCoachingDraft } from '../../entities/care-coaching-draft.entity.js';
import { buildConfigResolver } from '../../../../utils/ai-config-resolver.js';
import type { CareInsightDto } from '../../domain/dto.js';
import type { CareKpiSnapshot } from '../../entities/care-kpi-snapshot.entity.js';

/**
 * CareCoachingDraftService — WO-O4O-CARE-AI-COACHING-DRAFT-V1
 *
 * AI 코칭 초안 생성 + 관리.
 *
 * 핵심 원칙:
 * - AI = 초안 생성
 * - 약사 = 승인 결정
 * - fire-and-forget: 실패해도 기존 흐름에 영향 없음
 * - 중복 방어 — WO-O4O-CARE-AI-RESILIENCE-FIX-V1
 */

interface DraftLlmResponse {
  draftMessage: string;
}

export class CareCoachingDraftService {
  private draftRepo: Repository<CareCoachingDraft>;
  private configResolver: () => Promise<import('@o4o/ai-core').AIProviderConfig>;

  constructor(private dataSource: DataSource) {
    this.draftRepo = dataSource.getRepository(CareCoachingDraft);
    this.configResolver = buildConfigResolver(dataSource, 'care');
  }

  /**
   * Fire-and-forget: generate + cache coaching draft for a snapshot.
   * - 중복 방어: snapshot_id 기존 존재 시 skip
   * - retry는 execute() 내장 (2회, 2초 delay)
   */
  async generateAndCache(
    snapshot: CareKpiSnapshot,
    analysis: CareInsightDto,
    pharmacyId: string,
  ): Promise<void> {
    try {
      // 중복 방어: 이 snapshot에 대해 이미 draft가 있으면 skip
      const existing = await this.draftRepo.findOne({
        where: { snapshotId: snapshot.id },
        select: ['id'],
      });
      if (existing) {
        return;
      }

      const userPrompt = this.buildUserPrompt(analysis);

      const response = await execute({
        systemPrompt: CARE_COACHING_DRAFT_SYSTEM,
        userPrompt,
        config: this.configResolver,
        meta: { service: 'care', callerName: 'CareCoachingDraft' },
      });

      const parsed = JSON.parse(response.content) as DraftLlmResponse;

      // 필수 필드 검증
      if (!parsed.draftMessage) {
        console.error('[CareCoachingDraft] Invalid LLM response: missing draftMessage', {
          snapshotId: snapshot.id,
          content: response.content.slice(0, 200),
        });
        return;
      }

      const draft = this.draftRepo.create({
        patientId: analysis.patientId,
        snapshotId: snapshot.id,
        pharmacyId,
        draftMessage: parsed.draftMessage,
        status: 'draft',
      });
      await this.draftRepo.save(draft);
    } catch (error) {
      // Outer guard: quiet fail — 실패 시 log만, throw 안 함
      console.error('[CareCoachingDraft] unexpected error:', error);
    }
  }

  /**
   * Get latest draft for a patient (status = 'draft', pharmacy-scoped).
   */
  async getLatestDraft(
    patientId: string,
    pharmacyId: string,
  ): Promise<CareCoachingDraft | null> {
    return this.draftRepo.findOne({
      where: { patientId, pharmacyId, status: 'draft' },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Approve a draft (status → 'approved').
   * Returns the draft data for creating a coaching session.
   */
  async approveDraft(
    draftId: string,
    pharmacyId: string,
  ): Promise<CareCoachingDraft | null> {
    const draft = await this.draftRepo.findOne({
      where: { id: draftId, pharmacyId, status: 'draft' },
    });
    if (!draft) return null;

    draft.status = 'approved';
    return this.draftRepo.save(draft);
  }

  /**
   * Discard a draft (status → 'discarded').
   */
  async discardDraft(
    draftId: string,
    pharmacyId: string,
  ): Promise<boolean> {
    const draft = await this.draftRepo.findOne({
      where: { id: draftId, pharmacyId, status: 'draft' },
    });
    if (!draft) return false;

    draft.status = 'discarded';
    await this.draftRepo.save(draft);
    return true;
  }

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
        parts.push(`혈압: ${mm.bp.avgSystolic}/${mm.bp.avgDiastolic} mmHg (${mm.bp.bpCategory})`);
      }
      if (mm.weight) {
        parts.push(`체중: ${mm.weight.latestWeight}kg`);
        if (mm.weight.weightChange != null) {
          parts.push(`체중 변화: ${mm.weight.weightChange > 0 ? '+' : ''}${mm.weight.weightChange}kg`);
        }
      }
      if (mm.metabolicRisk) {
        parts.push(`대사 위험도: ${mm.metabolicRisk.metabolicRiskLevel} (${mm.metabolicRisk.metabolicScore}점/100)`);
        if (mm.metabolicRisk.riskFactors.length > 0) {
          parts.push(`위험 요인: ${mm.metabolicRisk.riskFactors.join(', ')}`);
        }
      }
    }

    parts.push('');
    parts.push('위 데이터를 바탕으로 환자에게 전달할 건강 행동 코칭 메시지를 작성하세요.');

    return parts.join('\n');
  }
}
