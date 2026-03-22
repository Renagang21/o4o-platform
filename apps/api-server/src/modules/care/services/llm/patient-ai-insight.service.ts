import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { PATIENT_AI_INSIGHT_SYSTEM } from '@o4o/ai-prompts/care';
import { PatientAiInsight } from '../../entities/patient-ai-insight.entity.js';
import { AiModelSetting } from '../../entities/ai-model-setting.entity.js';

/**
 * PatientAiInsightService — WO-GLUCOSEVIEW-AI-GLUCOSE-INSIGHT-V1
 *
 * 환자 전용 on-demand AI 인사이트.
 * - 14일 혈당 데이터 기반
 * - 24시간 캐시
 * - 3건 미만이면 생성하지 않음
 * - 실패 시 조용히 skip ({ summary: null })
 */

const CACHE_HOURS = 24;
const MIN_READINGS = 3;
const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

interface LlmInsightResponse {
  summary: string;
  warning: string;
  tip: string;
}

export interface PatientInsightResult {
  summary: string | null;
  warning: string | null;
  tip: string | null;
  generatedAt: string | null;
}

export class PatientAiInsightService {
  private insightRepo: Repository<PatientAiInsight>;
  private settingRepo: Repository<AiModelSetting>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.insightRepo = dataSource.getRepository(PatientAiInsight);
    this.settingRepo = dataSource.getRepository(AiModelSetting);
    this.gemini = new GeminiProvider();
  }

  /**
   * Get or generate AI insight for a patient.
   * Returns cached result if < 24h old, otherwise generates new.
   */
  async getOrGenerate(userId: string): Promise<PatientInsightResult> {
    try {
      // 1. Check cache (24h)
      const cached = await this.getCached(userId);
      if (cached) return cached;

      // 2. Fetch 14-day glucose readings
      const readings = await this.fetchReadings(userId);
      if (readings.length < MIN_READINGS) {
        return { summary: null, warning: null, tip: null, generatedAt: null };
      }

      // 3. Compute stats
      const stats = this.computeStats(readings);

      // 4. Call Gemini
      const config = await this.buildProviderConfig();
      if (!config.apiKey) {
        console.warn('[PatientAiInsight] No API key configured, skipping');
        return { summary: null, warning: null, tip: null, generatedAt: null };
      }

      const userPrompt = this.buildUserPrompt(stats);
      const result = await this.callWithRetry(userPrompt, config);
      if (!result) {
        return { summary: null, warning: null, tip: null, generatedAt: null };
      }

      // 5. Cache and return
      const now = new Date();
      const entity = this.insightRepo.create({
        patientId: userId,
        summary: result.summary,
        warning: result.warning || '',
        tip: result.tip || '',
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        generatedAt: now,
      });
      await this.insightRepo.save(entity);

      return {
        summary: result.summary,
        warning: result.warning || null,
        tip: result.tip || null,
        generatedAt: now.toISOString(),
      };
    } catch (error) {
      console.error('[PatientAiInsight] unexpected error:', error);
      return { summary: null, warning: null, tip: null, generatedAt: null };
    }
  }

  private async getCached(userId: string): Promise<PatientInsightResult | null> {
    const cutoff = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000);

    const row = await this.insightRepo
      .createQueryBuilder('i')
      .where('i.patient_id = :userId', { userId })
      .andWhere('i.generated_at > :cutoff', { cutoff })
      .orderBy('i.generated_at', 'DESC')
      .limit(1)
      .getOne();

    if (!row) return null;

    return {
      summary: row.summary,
      warning: row.warning || null,
      tip: row.tip || null,
      generatedAt: row.generatedAt.toISOString(),
    };
  }

  private async fetchReadings(
    userId: string,
  ): Promise<Array<{ valueNumeric: number; mealTiming: string; measuredAt: Date }>> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 14);

    const rows: Array<{
      value_numeric: string;
      metadata: Record<string, string> | null;
      measured_at: Date;
    }> = await this.dataSource.query(
      `SELECT value_numeric, metadata, measured_at
       FROM health_readings
       WHERE patient_id = $1
         AND metric_type = 'glucose'
         AND measured_at >= $2
       ORDER BY measured_at DESC`,
      [userId, fromDate],
    );

    return rows
      .filter((r) => r.value_numeric != null)
      .map((r) => ({
        valueNumeric: Number(r.value_numeric),
        mealTiming: r.metadata?.mealTiming || 'random',
        measuredAt: r.measured_at,
      }));
  }

  private computeStats(
    readings: Array<{ valueNumeric: number; mealTiming: string }>,
  ): {
    count: number;
    avgGlucose: number;
    fastingAvg: number;
    postMealAvg: number;
    tirPercent: number;
    highEvents: number;
    lowEvents: number;
    max: number;
    min: number;
  } {
    const values = readings.map((r) => r.valueNumeric);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    const fasting = readings.filter((r) => r.mealTiming === 'fasting');
    const postMeal = readings.filter((r) => r.mealTiming === 'after_meal');

    const fastingAvg =
      fasting.length > 0
        ? fasting.reduce((a, b) => a + b.valueNumeric, 0) / fasting.length
        : 0;
    const postMealAvg =
      postMeal.length > 0
        ? postMeal.reduce((a, b) => a + b.valueNumeric, 0) / postMeal.length
        : 0;

    const inRange = values.filter((v) => v >= 70 && v <= 180).length;
    const tirPercent = (inRange / values.length) * 100;

    const highEvents = values.filter((v) => v > 180).length;
    const lowEvents = values.filter((v) => v < 70).length;

    return {
      count: values.length,
      avgGlucose: Math.round(avg),
      fastingAvg: Math.round(fastingAvg),
      postMealAvg: Math.round(postMealAvg),
      tirPercent: Math.round(tirPercent),
      highEvents,
      lowEvents,
      max: Math.max(...values),
      min: Math.min(...values),
    };
  }

  private buildUserPrompt(stats: {
    count: number;
    avgGlucose: number;
    fastingAvg: number;
    postMealAvg: number;
    tirPercent: number;
    highEvents: number;
    lowEvents: number;
    max: number;
    min: number;
  }): string {
    const parts = [
      `최근 14일 혈당 데이터 (${stats.count}회 측정):`,
      `평균 혈당: ${stats.avgGlucose} mg/dL`,
      `최고: ${stats.max} mg/dL, 최저: ${stats.min} mg/dL`,
      `목표 범위(70-180) 비율: ${stats.tirPercent}%`,
      `고혈당(>180) 횟수: ${stats.highEvents}회`,
      `저혈당(<70) 횟수: ${stats.lowEvents}회`,
    ];

    if (stats.fastingAvg > 0) {
      parts.push(`공복 평균: ${stats.fastingAvg} mg/dL`);
    }
    if (stats.postMealAvg > 0) {
      parts.push(`식후 평균: ${stats.postMealAvg} mg/dL`);
    }

    return parts.join('\n');
  }

  private async callWithRetry(
    userPrompt: string,
    config: AIProviderConfig,
  ): Promise<LlmInsightResponse & { model: string; promptTokens: number; completionTokens: number } | null> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.gemini.complete(PATIENT_AI_INSIGHT_SYSTEM, userPrompt, config);
        const parsed = JSON.parse(response.content) as LlmInsightResponse;

        if (!parsed.summary) {
          console.error('[PatientAiInsight] Invalid LLM response: missing summary');
          return null;
        }

        return {
          summary: parsed.summary,
          warning: parsed.warning || '',
          tip: parsed.tip || '',
          model: response.model,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
        };
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);

        if (msg.includes('not configured') || msg.includes('INVALID_ARGUMENT')) {
          console.error('[PatientAiInsight] non-retryable error:', msg);
          return null;
        }

        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[PatientAiInsight] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms:`, msg);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
    console.error('[PatientAiInsight] generation failed after all attempts:', errMsg);
    return null;
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
      // DB read failed, fall through to env
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    return { apiKey, model, temperature, maxTokens };
  }
}
