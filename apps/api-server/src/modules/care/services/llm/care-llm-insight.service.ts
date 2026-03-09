import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { CareLlmInsight } from '../../entities/care-llm-insight.entity.js';
import { AiModelSetting } from '../../entities/ai-model-setting.entity.js';
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
 * - 1회 retry (2초 delay) — WO-O4O-CARE-AI-RESILIENCE-FIX-V1
 */

const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

const SYSTEM_PROMPT = `당신은 약국 환자 케어 데이터를 설명하는 전문 도우미입니다.

역할:
- 분석 결과를 쉬운 한국어로 설명합니다.
- 의료적 진단, 처방, 치료 권고를 절대 하지 않습니다.
- 관찰된 데이터 패턴만 설명합니다.
- "~경향이 관찰됩니다", "~패턴이 보입니다" 형태로 표현합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "pharmacyInsight": "약사를 위한 전문적 분석 설명 (2-3문장). 전문의 상담 권장 문구를 끝에 포함.",
  "patientMessage": "환자를 위한 쉬운 설명 (2-3문장). 격려와 생활 습관 팁 포함."
}

제약:
- 반드시 위 JSON 형식만 출력하세요. JSON 외의 텍스트를 포함하지 마세요.
- 구체적인 약품명을 언급하지 마세요.
- "전문의 상담을 권장합니다" 문구를 pharmacyInsight 끝에 포함하세요.`;

interface LlmResponse {
  pharmacyInsight: string;
  patientMessage: string;
}

export class CareLlmInsightService {
  private insightRepo: Repository<CareLlmInsight>;
  private settingRepo: Repository<AiModelSetting>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.insightRepo = dataSource.getRepository(CareLlmInsight);
    this.settingRepo = dataSource.getRepository(AiModelSetting);
    this.gemini = new GeminiProvider();
  }

  /**
   * Fire-and-forget: generate + cache LLM insight for a snapshot.
   * - 중복 방어: snapshot_id 기존 존재 시 skip
   * - 1회 retry (2초 delay, retryable 오류만)
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

      const config = await this.buildProviderConfig();

      // API key 없으면 skip (로컬 환경 등)
      if (!config.apiKey) {
        console.warn('[CareLlmInsight] No API key configured, skipping LLM insight generation');
        return;
      }

      const userPrompt = this.buildUserPrompt(analysis);

      // Retry loop: max 2 attempts, 2초 delay between
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await this.gemini.complete(SYSTEM_PROMPT, userPrompt, config);
          const parsed = JSON.parse(response.content) as LlmResponse;

          // 필수 필드 검증 (non-retryable)
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
          return; // success
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);

          // Non-retryable: API key error, validation
          if (msg.includes('not configured') || msg.includes('INVALID_ARGUMENT')) {
            console.error('[CareLlmInsight] non-retryable error:', { snapshotId: snapshot.id, error: msg });
            return;
          }

          // Retryable: timeout, 5xx, network, JSON parse
          if (attempt < MAX_ATTEMPTS) {
            console.warn(`[CareLlmInsight] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms:`, msg);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      // All attempts exhausted
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      console.error('[CareLlmInsight] generation failed after all attempts:', {
        snapshotId: snapshot.id,
        patientId: analysis.patientId,
        attempts: MAX_ATTEMPTS,
        lastError: errMsg,
      });
    } catch (error) {
      // Outer guard: unexpected errors (DB, config loading, etc.)
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

  /**
   * Build GeminiProvider config from DB settings + API key resolution.
   */
  private async buildProviderConfig(): Promise<AIProviderConfig> {
    // 1. Load model settings from ai_model_settings (service = 'care')
    const setting = await this.settingRepo.findOne({ where: { service: 'care' } });
    const model = setting?.model || 'gemini-2.0-flash';
    const temperature = setting ? Number(setting.temperature) : 0.3;
    const maxTokens = setting?.maxTokens || 2048;

    // 2. Load API key: ai_settings (provider='gemini') → GEMINI_API_KEY env fallback
    let apiKey = '';
    try {
      const rows = await this.dataSource.query(
        `SELECT apikey FROM ai_settings WHERE provider = 'gemini' AND isactive = true LIMIT 1`,
      );
      if (rows[0]?.apikey) {
        apiKey = rows[0].apikey;
      }
    } catch {
      // DB read failed, fall through to env
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    return { apiKey, model, temperature, maxTokens };
  }
}
