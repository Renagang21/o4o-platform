import type { DataSource } from 'typeorm';
import { execute } from '@o4o/ai-core';
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

const CARE_COPILOT_SYSTEM = `당신은 약국 환자 케어 데이터를 분석하는 AI 코파일럿입니다.

역할:
- 약사의 질문에 제공된 데이터를 기반으로 답변합니다.
- 의료적 진단, 처방, 치료 권고를 절대 하지 않습니다.
- 데이터에 근거한 관찰과 패턴만 설명합니다.
- "~경향이 관찰됩니다", "~패턴이 보입니다" 형태로 표현합니다.
- 데이터가 부족하면 솔직히 "현재 데이터로는 판단하기 어렵습니다"라고 답합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "summary": "질문에 대한 답변 요약 (2-4문장)",
  "details": ["세부 설명 포인트 1", "세부 설명 포인트 2"],
  "recommendations": ["약사에게 제안하는 후속 조치 1", "후속 조치 2"],
  "relatedPatients": [{"patientId": "uuid", "name": "이름", "reason": "관련 이유"}],
  "actions": [
    {"type": "open_patient", "label": "김OO 환자 열기", "patientId": "uuid"},
    {"type": "create_coaching", "label": "코칭 생성", "patientId": "uuid"},
    {"type": "run_analysis", "label": "혈당 분석 실행", "patientId": "uuid"},
    {"type": "resolve_alert", "label": "알림 확인", "alertId": "uuid"}
  ]
}

actions 규칙:
- 환자 조회/확인이 필요하면 open_patient 포함
- 코칭이 필요한 환자가 있으면 create_coaching 포함
- 분석이 오래된 환자가 있으면 run_analysis 포함
- 활성 알림이 있으면 resolve_alert 포함
- relatedPatients에 포함된 환자의 patientId를 actions에서 재사용
- actions가 불필요하면 빈 배열

제약:
- 반드시 위 JSON 형식만 출력하세요. JSON 외의 텍스트를 포함하지 마세요.
- 구체적인 약품명을 언급하지 마세요.
- 중요 사안에 "전문의 상담을 권장합니다" 문구를 포함하세요.
- relatedPatients는 질문과 관련된 환자가 있을 때만 포함합니다 (없으면 빈 배열).`;

export type CareActionType = 'open_patient' | 'create_coaching' | 'run_analysis' | 'resolve_alert';

export interface CareAction {
  type: CareActionType;
  label: string;
  patientId?: string;
  alertId?: string;
}

export interface AiChatResponse {
  summary: string;
  details: string[];
  recommendations: string[];
  relatedPatients: Array<{ patientId: string; name: string; reason: string }>;
  actions: CareAction[];
  model: string;
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

    // 2. Build context
    const context = patientId
      ? await this.buildPatientContext(patientId, pharmacyId)
      : await this.buildPopulationContext(pharmacyId);

    // 3. Build user prompt
    const userPrompt = `${context}\n\n[약사 질문]\n${message}`;

    // 4. Call via execute() — retry + apiKey check 내장
    const response = await execute({
      systemPrompt: CARE_COPILOT_SYSTEM,
      userPrompt,
      config: this.configResolver,
      meta: { service: 'care', callerName: 'CareAiChat' },
    });

    const parsed = JSON.parse(response.content) as Partial<AiChatResponse>;

    const ALLOWED_ACTIONS: Set<string> = new Set(['open_patient', 'create_coaching', 'run_analysis', 'resolve_alert']);
    const actions = (Array.isArray(parsed.actions) ? parsed.actions : [])
      .filter((a: any) => ALLOWED_ACTIONS.has(a?.type) && typeof a?.label === 'string');

    const result: AiChatResponse = {
      summary: parsed.summary || '응답을 생성할 수 없습니다.',
      details: Array.isArray(parsed.details) ? parsed.details : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      relatedPatients: Array.isArray(parsed.relatedPatients) ? parsed.relatedPatients : [],
      actions,
      model: response.model,
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
          JOIN glucoseview_customers c ON c.id = s.patient_id
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
        LEFT JOIN patient_health_profiles p ON p.user_id = c.id
        WHERE c.id = ${pidParam} ${pFilter}
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

    // Q6: Latest LLM insight
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
