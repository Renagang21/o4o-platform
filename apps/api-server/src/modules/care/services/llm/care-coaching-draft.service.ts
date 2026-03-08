import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
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
 */

const SYSTEM_PROMPT = `당신은 약국 환자 건강 행동 코칭 도우미입니다.

역할:
- 환자에게 도움이 되는 생활 습관 조언을 작성합니다.
- 의료적 진단, 처방, 치료 권고를 절대 하지 않습니다.
- 구체적이고 실행 가능한 조언을 제공합니다.
- 격려하는 톤으로 작성합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "draftMessage": "환자에게 전달할 코칭 메시지 (3-5문장)"
}

제약:
- 반드시 위 JSON 형식만 출력하세요. JSON 외의 텍스트를 포함하지 마세요.
- 구체적인 약품명을 언급하지 마세요.
- "자세한 상담은 약사와 상의하시기 바랍니다" 문구를 끝에 포함하세요.
- 실천 가능한 구체적 행동을 1~2개 제안하세요.`;

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
   */
  async generateAndCache(
    snapshot: CareKpiSnapshot,
    analysis: CareInsightDto,
    pharmacyId: string,
  ): Promise<void> {
    try {
      const config = await this.buildProviderConfig();

      if (!config.apiKey) {
        console.warn('[CareCoachingDraft] No API key configured, skipping draft generation');
        return;
      }

      const userPrompt = this.buildUserPrompt(analysis);
      const response = await this.gemini.complete(SYSTEM_PROMPT, userPrompt, config);
      const parsed = JSON.parse(response.content) as DraftLlmResponse;

      if (!parsed.draftMessage) {
        console.error('[CareCoachingDraft] Invalid LLM response: missing draftMessage');
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
      console.error('[CareCoachingDraft] generation failed:', error);
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
    const model = setting?.model || 'gemini-2.0-flash';
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
