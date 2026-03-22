import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { CARE_COACHING_DRAFT_SYSTEM } from '@o4o/ai-prompts/care';
import { CareCoachingDraft } from '../../entities/care-coaching-draft.entity.js';
import { AiModelSetting } from '../../entities/ai-model-setting.entity.js';
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
 * - 중복 방어 + 1회 retry — WO-O4O-CARE-AI-RESILIENCE-FIX-V1
 */

const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

interface DraftLlmResponse {
  draftMessage: string;
}

export class CareCoachingDraftService {
  private draftRepo: Repository<CareCoachingDraft>;
  private settingRepo: Repository<AiModelSetting>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.draftRepo = dataSource.getRepository(CareCoachingDraft);
    this.settingRepo = dataSource.getRepository(AiModelSetting);
    this.gemini = new GeminiProvider();
  }

  /**
   * Fire-and-forget: generate + cache coaching draft for a snapshot.
   * - 중복 방어: snapshot_id 기존 존재 시 skip
   * - 1회 retry (2초 delay, retryable 오류만)
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

      const config = await this.buildProviderConfig();

      if (!config.apiKey) {
        console.warn('[CareCoachingDraft] No API key configured, skipping draft generation');
        return;
      }

      const userPrompt = this.buildUserPrompt(analysis);

      // Retry loop: max 2 attempts, 2초 delay between
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await this.gemini.complete(CARE_COACHING_DRAFT_SYSTEM, userPrompt, config);
          const parsed = JSON.parse(response.content) as DraftLlmResponse;

          // 필수 필드 검증 (non-retryable)
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
          return; // success
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);

          // Non-retryable: API key error, validation
          if (msg.includes('not configured') || msg.includes('INVALID_ARGUMENT')) {
            console.error('[CareCoachingDraft] non-retryable error:', { snapshotId: snapshot.id, error: msg });
            return;
          }

          // Retryable: timeout, 5xx, network, JSON parse
          if (attempt < MAX_ATTEMPTS) {
            console.warn(`[CareCoachingDraft] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms:`, msg);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      // All attempts exhausted
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      console.error('[CareCoachingDraft] generation failed after all attempts:', {
        snapshotId: snapshot.id,
        patientId: analysis.patientId,
        attempts: MAX_ATTEMPTS,
        lastError: errMsg,
      });
    } catch (error) {
      // Outer guard: unexpected errors (DB, config loading, etc.)
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

  private async buildProviderConfig(): Promise<AIProviderConfig> {
    const setting = await this.settingRepo.findOne({ where: { service: 'care' } });
    const model = setting?.model || 'gemini-3.0-flash';
    const temperature = setting ? Number(setting.temperature) : 0.3;
    const maxTokens = setting?.maxTokens || 2048;

    let apiKey = '';
    try {
      const rows = await this.dataSource.query(
        `SELECT apikey FROM ai_settings WHERE provider = 'gemini' AND isactive = true LIMIT 1`,
      );
      if (rows[0]?.apikey) {
        apiKey = rows[0].apikey;
      }
    } catch {
      // fall through to env
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    return { apiKey, model, temperature, maxTokens };
  }
}
