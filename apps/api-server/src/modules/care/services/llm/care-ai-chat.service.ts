import type { DataSource } from 'typeorm';
import { execute, executeStream } from '@o4o/ai-core';
import { getCareCopilotPrompt } from '@o4o/ai-prompts/care';
import { buildConfigResolver } from '../../../../utils/ai-config-resolver.js';
import { createHash } from 'crypto';

/**
 * CareAiChatService — WO-GLYCOPHARM-CARE-AI-CHAT-SYSTEM-V1
 *
 * Care Copilot: 약사의 자연어 질문 → Care 데이터 컨텍스트 + Gemini → 구조화 응답.
 *
 * 두 가지 모드:
 *   - Population (patientId 없음): 약국 전체 환자 현황 기반
 *   - Patient (patientId 있음): 특정 환자 데이터 기반
 *
 * 캐싱: Map 기반 인메모리 (Population 5분, Patient 10분)
 * Retry: execute() 내장 (2회, 2초 delay)
 * Synchronous: fire-and-forget 아님 — 에러 시 throw
 */

const POPULATION_CACHE_TTL = 5 * 60 * 1000;   // 5 minutes
const PATIENT_CACHE_TTL = 10 * 60 * 1000;      // 10 minutes

export type CareActionType = 'open_patient' | 'create_coaching' | 'run_analysis' | 'resolve_alert' | 'link_guideline';

export interface CareAction {
  type: CareActionType;
  label: string;
  patientId?: string;
  alertId?: string;
  contentId?: string;
}

export interface AiChatResponse {
  summary: string;
  details: string[];
  recommendations: string[];
  relatedPatients: Array<{ patientId: string; name: string; reason: string }>;
  actions: CareAction[];
  model: string;
  promptVersion: string;
  respondedAt: string;
}

interface CacheEntry {
  data: AiChatResponse;
  expiresAt: number;
}

export class CareAiChatService {
  private configResolver: () => Promise<import('@o4o/ai-core').AIProviderConfig>;
  private cache: Map<string, CacheEntry>;

  constructor(private dataSource: DataSource) {
    this.configResolver = buildConfigResolver(dataSource, 'care');
    this.cache = new Map();
  }

  async chat(
    message: string,
    pharmacyId: string | null,
    patientId: string | null,
  ): Promise<AiChatResponse> {
    // 1. Check cache
    const cacheKey = this.buildCacheKey(pharmacyId, patientId, message);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // 2. Build context + resolve prompt version
    const context = patientId
      ? await this.buildPatientContext(patientId, pharmacyId)
      : await this.buildPopulationContext(pharmacyId);

    const promptVersion = await this.getPromptVersion();
    const systemPrompt = getCareCopilotPrompt(promptVersion);

    // 3. Build user prompt
    const userPrompt = `[데이터]\n${context}\n\n[질문]\n${message}`;

    // 4. Call via execute() — retry + apiKey check 내장
    // WO-O4O-AI-CHAT-TIMEOUT-FIX-V1: 60s timeout (ai-core default 10s → Gemini 응답 15~60s 수용)
    const response = await execute({
      systemPrompt,
      userPrompt,
      config: this.configResolver,
      meta: { service: 'care', callerName: 'CareAiChat' },
      timeoutMs: 60_000,
    });

    let parsed: Partial<AiChatResponse>;
    try {
      parsed = JSON.parse(response.content) as Partial<AiChatResponse>;
    } catch {
      parsed = { summary: extractFallbackSummary(response.content) };
    }

    const ALLOWED_ACTIONS: Set<string> = new Set(['open_patient', 'create_coaching', 'run_analysis', 'resolve_alert', 'link_guideline']);
    const actions = (Array.isArray(parsed.actions) ? parsed.actions : [])
      .filter((a: any) => ALLOWED_ACTIONS.has(a?.type) && typeof a?.label === 'string');

    const result: AiChatResponse = {
      summary: parsed.summary || '응답을 생성할 수 없습니다.',
      details: Array.isArray(parsed.details) ? parsed.details : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      relatedPatients: Array.isArray(parsed.relatedPatients) ? parsed.relatedPatients : [],
      actions,
      model: response.model,
      promptVersion,
      respondedAt: new Date().toISOString(),
    };

    // 5. Cache result
    const ttl = patientId ? PATIENT_CACHE_TTL : POPULATION_CACHE_TTL;
    this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + ttl });

    // Lazy eviction: remove expired entries occasionally
    if (this.cache.size > 100) {
      this.evictExpired();
    }

    return result;
  }

  /**
   * chatStream — SSE 스트리밍 응답 (WO-O4O-AI-STREAMING-SSE-IMPLEMENTATION-V1)
   *
   * 캐시 히트 → 'cached' 이벤트 즉시 전달
   * 스트리밍 → 'token' 이벤트 점진 전달 → 'complete' → 'done'
   */
  async *chatStream(
    message: string,
    pharmacyId: string | null,
    patientId: string | null,
  ): AsyncGenerator<{ event: string; data: string }> {
    // 1. Cache check
    const cacheKey = this.buildCacheKey(pharmacyId, patientId, message);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      yield { event: 'cached', data: JSON.stringify(cached.data) };
      yield { event: 'done', data: '' };
      return;
    }

    // 2. Build context + resolve prompt version
    const context = patientId
      ? await this.buildPatientContext(patientId, pharmacyId)
      : await this.buildPopulationContext(pharmacyId);

    const promptVersion = await this.getPromptVersion();
    const systemPrompt = getCareCopilotPrompt(promptVersion);
    const userPrompt = `[데이터]\n${context}\n\n[질문]\n${message}`;

    // 3. executeStream() — 120s timeout, maxTokens 4096 (JSON 완성 보장)
    const stream = executeStream({
      systemPrompt,
      userPrompt,
      config: async () => {
        const base = await this.configResolver();
        return { ...base, maxTokens: 4096 };
      },
      meta: { service: 'care', callerName: 'CareAiChat.stream' },
      timeoutMs: 120_000,
    });

    // 4. Yield tokens as they arrive
    let accumulated = '';

    for await (const chunk of stream) {
      accumulated += chunk.text;
      if (chunk.text) {
        yield { event: 'token', data: chunk.text };
      }
    }

    // 5. Parse accumulated JSON + validate
    let parsed: Partial<AiChatResponse>;
    try {
      parsed = JSON.parse(accumulated) as Partial<AiChatResponse>;
    } catch {
      parsed = { summary: extractFallbackSummary(accumulated) };
    }

    const ALLOWED_ACTIONS: Set<string> = new Set(['open_patient', 'create_coaching', 'run_analysis', 'resolve_alert', 'link_guideline']);
    const actions = (Array.isArray(parsed.actions) ? parsed.actions : [])
      .filter((a: any) => ALLOWED_ACTIONS.has(a?.type) && typeof a?.label === 'string');

    const result: AiChatResponse = {
      summary: parsed.summary || '응답을 생성할 수 없습니다.',
      details: Array.isArray(parsed.details) ? parsed.details : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      relatedPatients: Array.isArray(parsed.relatedPatients) ? parsed.relatedPatients : [],
      actions,
      model: 'gemini',
      promptVersion,
      respondedAt: new Date().toISOString(),
    };

    // Cache
    const ttl = patientId ? PATIENT_CACHE_TTL : POPULATION_CACHE_TTL;
    this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + ttl });
    if (this.cache.size > 100) this.evictExpired();

    yield { event: 'complete', data: JSON.stringify(result) };

    yield { event: 'done', data: '' };
  }

  // ── Population Context ──

  private async buildPopulationContext(pharmacyId: string | null): Promise<string> {
    const parts: string[] = ['[약국 전체 현황]'];

    if (!pharmacyId) {
      parts.push('(관리자 모드 — 전체 약국 데이터)');
    }

    const pharmacyFilter = pharmacyId ? 'WHERE pharmacy_id = $1' : '';
    const pharmacyFilterAnd = pharmacyId ? 'AND pharmacy_id = $1' : '';
    const params = pharmacyId ? [pharmacyId] : [];

    // Q1: Patient count + risk distribution + avg TIR/CV
    try {
      const q1 = await this.dataSource.query(`
        WITH latest AS (
          SELECT DISTINCT ON (patient_id) risk_level, tir, cv
          FROM care_kpi_snapshots ${pharmacyFilter}
          ORDER BY patient_id, created_at DESC
        )
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high,
          COUNT(*) FILTER (WHERE risk_level = 'moderate')::int AS moderate,
          COUNT(*) FILTER (WHERE risk_level = 'low')::int AS low,
          ROUND(AVG(tir)::numeric, 1) AS avg_tir,
          ROUND(AVG(cv)::numeric, 1) AS avg_cv
        FROM latest
      `, params);

      if (q1[0]) {
        const r = q1[0];
        parts.push(`전체 환자: ${r.total}명`);
        parts.push(`위험도 분포: 고위험 ${r.high}명, 주의 ${r.moderate}명, 양호 ${r.low}명`);
        parts.push(`평균 TIR: ${r.avg_tir ?? '-'}%, 평균 CV: ${r.avg_cv ?? '-'}%`);
      }
    } catch { /* table may not exist */ }

    // Q2: Active alerts
    try {
      const q2 = await this.dataSource.query(`
        SELECT COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical
        FROM care_alerts WHERE status != 'resolved' ${pharmacyFilterAnd}
      `, params);

      if (q2[0]) {
        parts.push(`활성 알림: ${q2[0].count}건 (긴급 ${q2[0].critical}건)`);
      }
    } catch { /* table may not exist */ }

    // Q3: Recent coaching (7d)
    try {
      const q3 = await this.dataSource.query(`
        SELECT COUNT(*)::int AS count
        FROM care_coaching_sessions
        WHERE created_at >= NOW() - INTERVAL '7 days' ${pharmacyFilterAnd}
      `, params);

      if (q3[0]) {
        parts.push(`최근 7일 코칭: ${q3[0].count}건`);
      }
    } catch { /* table may not exist */ }

    // Q4: Pending coaching drafts
    try {
      const q4 = await this.dataSource.query(`
        SELECT COUNT(*)::int AS count
        FROM care_coaching_drafts WHERE status = 'draft' ${pharmacyFilterAnd}
      `, params);

      if (q4[0]) {
        parts.push(`대기 초안: ${q4[0].count}건`);
      }
    } catch { /* table may not exist */ }

    // Q5: Top risk patients
    try {
      const q5 = await this.dataSource.query(`
        WITH latest AS (
          SELECT DISTINCT ON (s.patient_id) s.patient_id, s.tir, s.cv, s.risk_level,
            c.name AS patient_name
          FROM care_kpi_snapshots s
          JOIN glucoseview_customers c ON c.user_id = s.patient_id
          ${pharmacyFilter ? pharmacyFilter.replace('pharmacy_id', 's.pharmacy_id') : ''}
          ORDER BY s.patient_id, s.created_at DESC
        )
        SELECT patient_id, patient_name, tir, cv, risk_level FROM latest
        WHERE risk_level IN ('high', 'moderate')
        ORDER BY CASE risk_level WHEN 'high' THEN 0 ELSE 1 END, tir ASC
        LIMIT 5
      `, params);

      if (q5.length > 0) {
        parts.push('\n[주요 관리 대상 환자]');
        for (const p of q5) {
          parts.push(`- ${p.patient_name}: ${p.risk_level}, TIR ${p.tir}%, CV ${p.cv}%`);
        }
      }
    } catch { /* table may not exist */ }

    return parts.join('\n');
  }

  // ── Patient Context ──

  private async buildPatientContext(patientId: string, pharmacyId: string | null): Promise<string> {
    const parts: string[] = ['[환자 상세 정보]'];

    const pFilter = pharmacyId ? 'AND c.organization_id = $1' : '';
    const sFilter = pharmacyId ? 'AND pharmacy_id = $1' : '';
    const baseParams = pharmacyId ? [pharmacyId, patientId] : [patientId];
    const pidParam = pharmacyId ? '$2' : '$1';

    // Q1: Patient info + profile
    try {
      const q1 = await this.dataSource.query(`
        SELECT c.name, p.diabetes_type, p.treatment_method
        FROM glucoseview_customers c
        LEFT JOIN patient_health_profiles p ON p.user_id = c.user_id
        WHERE c.user_id = ${pidParam} ${pFilter}
      `, baseParams);

      if (q1[0]) {
        parts.push(`환자명: ${q1[0].name}`);
        if (q1[0].diabetes_type) parts.push(`당뇨 유형: ${q1[0].diabetes_type}`);
        if (q1[0].treatment_method) parts.push(`치료 방법: ${q1[0].treatment_method}`);
      }
    } catch { /* table may not exist */ }

    // Q2: Latest KPI snapshot
    try {
      const q2 = await this.dataSource.query(`
        SELECT tir, cv, risk_level, created_at FROM care_kpi_snapshots
        WHERE patient_id = ${pidParam} ${sFilter}
        ORDER BY created_at DESC LIMIT 1
      `, baseParams);

      if (q2[0]) {
        parts.push(`TIR: ${q2[0].tir}%, CV: ${q2[0].cv}%, 위험도: ${q2[0].risk_level}`);
        parts.push(`최근 분석일: ${new Date(q2[0].created_at).toLocaleDateString('ko-KR')}`);
      }
    } catch { /* table may not exist */ }

    // Q3: 14-day glucose summary
    try {
      const q3 = await this.dataSource.query(`
        SELECT COUNT(*)::int AS count,
          ROUND(AVG(value_numeric::numeric), 0) AS avg_glucose,
          MAX(value_numeric::numeric)::int AS max_glucose,
          MIN(value_numeric::numeric)::int AS min_glucose,
          COUNT(*) FILTER (WHERE value_numeric::numeric > 180)::int AS high_events,
          COUNT(*) FILTER (WHERE value_numeric::numeric < 70)::int AS low_events
        FROM health_readings
        WHERE patient_id = ${pidParam} ${sFilter}
          AND metric_type = 'glucose' AND measured_at >= NOW() - INTERVAL '14 days'
      `, baseParams);

      if (q3[0] && q3[0].count > 0) {
        parts.push(`\n[14일 혈당 요약]`);
        parts.push(`측정 횟수: ${q3[0].count}회`);
        parts.push(`평균 혈당: ${q3[0].avg_glucose} mg/dL`);
        parts.push(`최고: ${q3[0].max_glucose}, 최저: ${q3[0].min_glucose}`);
        parts.push(`고혈당(>180): ${q3[0].high_events}회, 저혈당(<70): ${q3[0].low_events}회`);
      }
    } catch { /* table may not exist */ }

    // Q4: Recent coaching (last 3)
    try {
      const q4 = await this.dataSource.query(`
        SELECT summary, action_plan, created_at FROM care_coaching_sessions
        WHERE patient_id = ${pidParam} ${sFilter}
        ORDER BY created_at DESC LIMIT 3
      `, baseParams);

      if (q4.length > 0) {
        parts.push(`\n[최근 코칭]`);
        for (const s of q4) {
          const date = new Date(s.created_at).toLocaleDateString('ko-KR');
          parts.push(`- ${date}: ${s.summary}`);
        }
      }
    } catch { /* table may not exist */ }

    // Q5: Active alerts
    try {
      const q5 = await this.dataSource.query(`
        SELECT alert_type, severity, message FROM care_alerts
        WHERE patient_id = ${pidParam} ${sFilter} AND status != 'resolved'
        ORDER BY created_at DESC
      `, baseParams);

      if (q5.length > 0) {
        parts.push(`\n[활성 알림]`);
        for (const a of q5) {
          parts.push(`- [${a.severity}] ${a.message}`);
        }
      }
    } catch { /* table may not exist */ }

    // Q6: Time-of-day glucose pattern (WO-O4O-CARE-TIME-BASED-ANALYSIS-V1)
    try {
      const q6t = await this.dataSource.query(`
        SELECT
          CASE
            WHEN EXTRACT(HOUR FROM measured_at) >= 5  AND EXTRACT(HOUR FROM measured_at) < 10 THEN 'morning'
            WHEN EXTRACT(HOUR FROM measured_at) >= 10 AND EXTRACT(HOUR FROM measured_at) < 15 THEN 'afternoon'
            WHEN EXTRACT(HOUR FROM measured_at) >= 15 AND EXTRACT(HOUR FROM measured_at) < 21 THEN 'evening'
            ELSE 'night'
          END AS bucket,
          COUNT(*)::int AS count,
          ROUND(AVG(value_numeric::numeric), 0)::int AS avg
        FROM health_readings
        WHERE patient_id = ${pidParam} ${sFilter}
          AND metric_type = 'glucose' AND measured_at >= NOW() - INTERVAL '14 days'
        GROUP BY bucket
        ORDER BY CASE bucket WHEN 'morning' THEN 0 WHEN 'afternoon' THEN 1 WHEN 'evening' THEN 2 ELSE 3 END
      `, baseParams);

      if (q6t.length > 0) {
        const bucketLabels: Record<string, string> = { morning: '아침(05~10시)', afternoon: '점심(10~15시)', evening: '저녁(15~21시)', night: '야간(21~05시)' };
        parts.push(`\n[시간대별 혈당 패턴]`);
        for (const b of q6t) {
          parts.push(`- ${bucketLabels[b.bucket] || b.bucket}: 평균 ${b.avg} mg/dL (${b.count}회)`);
        }
      }
    } catch { /* ignore */ }

    // Q6b: Post-meal average
    try {
      const q6m = await this.dataSource.query(`
        SELECT
          metadata->>'mealTiming' AS timing,
          COUNT(*)::int AS count,
          ROUND(AVG(value_numeric::numeric), 0)::int AS avg
        FROM health_readings
        WHERE patient_id = ${pidParam} ${sFilter}
          AND metric_type = 'glucose' AND metadata->>'mealTiming' IS NOT NULL
          AND measured_at >= NOW() - INTERVAL '14 days'
        GROUP BY metadata->>'mealTiming'
      `, baseParams);

      if (q6m.length > 0) {
        const timingLabels: Record<string, string> = { fasting: '공복', before_meal: '식전', after_meal: '식후', after_meal_1h: '식후1h', after_meal_2h: '식후2h', bedtime: '취침전', random: '수시' };
        parts.push(`\n[측정 구분별 혈당]`);
        for (const m of q6m) {
          parts.push(`- ${timingLabels[m.timing] || m.timing}: 평균 ${m.avg} mg/dL (${m.count}회)`);
        }
      }
    } catch { /* ignore */ }

    // Q7: Latest LLM insight
    try {
      const q6 = await this.dataSource.query(`
        SELECT pharmacy_insight FROM care_llm_insights
        WHERE patient_id = ${pidParam} ${sFilter.replace('pharmacy_id', 'pharmacy_id')}
        ORDER BY created_at DESC LIMIT 1
      `, baseParams);

      if (q6[0]?.pharmacy_insight) {
        parts.push(`\n[기존 AI 분석]\n${q6[0].pharmacy_insight}`);
      }
    } catch { /* table may not exist */ }

    return parts.join('\n');
  }

  // ── Shared Utilities ──

  /** ai_model_settings에서 prompt_version 조회 (fallback: 'v1') */
  private async getPromptVersion(): Promise<string> {
    try {
      const rows = await this.dataSource.query(
        `SELECT prompt_version FROM ai_model_settings WHERE service = 'care' LIMIT 1`,
      );
      return rows[0]?.prompt_version || 'v1';
    } catch {
      return 'v1';
    }
  }

  private buildCacheKey(pharmacyId: string | null, patientId: string | null, message: string): string {
    const raw = `${pharmacyId || 'global'}:${patientId || 'population'}:${message.trim().toLowerCase()}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * JSON 파싱 실패 시 raw 텍스트에서 첫 문장을 추출하여 summary로 사용
 */
function extractFallbackSummary(raw: string): string {
  // JSON 마크다운 펜스 제거
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  // 첫 문장 추출 (마침표/물음표/느낌표까지)
  const match = cleaned.match(/^(.+?[.?!。])\s/);
  const sentence = match ? match[1] : cleaned;
  return sentence.substring(0, 200);
}
