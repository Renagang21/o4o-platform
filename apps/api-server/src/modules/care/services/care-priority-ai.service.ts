import type { DataSource } from 'typeorm';
import type { CarePriorityService, PriorityPatientDto } from './care-priority.service.js';

/**
 * CarePriorityAiService — WO-GLYCOPHARM-CARE-CONTROL-TOWER-V1 Phase 4
 *
 * Level 1 AI Score Adjustment:
 *   기존 rule-based priority score에 LLM insight 기반 보정값 (±15점) 적용.
 *
 * 보정 로직:
 *   - LLM insight 존재 여부 + snapshot risk_level + TIR 추세 기반
 *   - high risk + insight 존재 → +15
 *   - moderate risk + insight 존재 → +8
 *   - low risk + TIR 개선 추세 → -10
 *   - insight 없음 → 0 (rule-based 그대로)
 */

export interface AiPriorityPatientDto extends PriorityPatientDto {
  baseScore: number;
  aiAdjustment: number;
  aiReason: string | null;
}

interface InsightRow {
  patient_id: string;
  pharmacy_insight: string | null;
  risk_level: string;
  tir: number;
  prev_tir: number | null;
}

export class CarePriorityAiService {
  constructor(
    private dataSource: DataSource,
    private priorityService: CarePriorityService,
  ) {}

  async getAiAdjustedPriorityPatients(
    pharmacyId: string | null | undefined,
    limit = 5,
  ): Promise<AiPriorityPatientDto[]> {
    // 1. Rule-based scores (fetch more to allow re-ranking)
    const basePatients = await this.priorityService.getTopPriorityPatients(pharmacyId, limit * 2);

    if (basePatients.length === 0) {
      return [];
    }

    // 2. Fetch latest LLM insights + snapshot context for these patients
    const patientIds = basePatients.map(p => p.patientId);
    const insights = await this.getLatestInsights(patientIds, pharmacyId);

    // 3. Apply AI adjustment
    const adjusted: AiPriorityPatientDto[] = basePatients.map(p => {
      const insight = insights.get(p.patientId);
      const aiAdjustment = this.computeAiAdjustment(insight);
      return {
        ...p,
        baseScore: p.priorityScore,
        aiAdjustment,
        priorityScore: Math.max(0, Math.min(120, p.priorityScore + aiAdjustment)),
        aiReason: insight?.pharmacy_insight?.slice(0, 80) ?? null,
      };
    });

    // 4. Re-sort by adjusted score & limit
    adjusted.sort((a, b) => b.priorityScore - a.priorityScore);
    return adjusted.slice(0, limit);
  }

  private async getLatestInsights(
    patientIds: string[],
    pharmacyId: string | null | undefined,
  ): Promise<Map<string, InsightRow>> {
    if (patientIds.length === 0) return new Map();

    // Build IN clause with parameterized placeholders
    // $1 = pharmacyId, $2..N+1 = patientIds
    const offset = pharmacyId ? 2 : 1;
    const placeholders = patientIds.map((_, i) => `$${i + offset}`).join(', ');
    const pharmacyFilter = pharmacyId ? `AND pharmacy_id = $1` : '';

    const query = `
      WITH latest_insight AS (
        SELECT DISTINCT ON (i.patient_id)
          i.patient_id, i.pharmacy_insight
        FROM care_llm_insights i
        WHERE i.patient_id IN (${placeholders}) ${pharmacyFilter.replace('pharmacy_id', 'i.pharmacy_id')}
        ORDER BY i.patient_id, i.created_at DESC
      ),
      latest_snapshot AS (
        SELECT DISTINCT ON (s.patient_id)
          s.patient_id, s.risk_level, s.tir
        FROM care_kpi_snapshots s
        WHERE s.patient_id IN (${placeholders}) ${pharmacyFilter.replace('pharmacy_id', 's.pharmacy_id')}
        ORDER BY s.patient_id, s.created_at DESC
      ),
      prev_snapshot AS (
        SELECT DISTINCT ON (sub.patient_id)
          sub.patient_id, sub.tir AS prev_tir
        FROM (
          SELECT patient_id, tir,
            ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
          FROM care_kpi_snapshots
          WHERE patient_id IN (${placeholders}) ${pharmacyFilter}
        ) sub
        WHERE sub.rn = 2
      )
      SELECT
        ls.patient_id, li.pharmacy_insight,
        ls.risk_level, ls.tir,
        ps.prev_tir
      FROM latest_snapshot ls
      LEFT JOIN latest_insight li ON li.patient_id = ls.patient_id
      LEFT JOIN prev_snapshot ps ON ps.patient_id = ls.patient_id
    `;

    const params = pharmacyId ? [pharmacyId, ...patientIds] : patientIds;
    // safeQuery: care_llm_insights / care_kpi_snapshots may not exist in production
    let rows: InsightRow[];
    try {
      rows = await this.dataSource.query(query, params);
    } catch {
      return new Map();
    }

    const map = new Map<string, InsightRow>();
    for (const row of rows) {
      map.set(row.patient_id, row);
    }
    return map;
  }

  private computeAiAdjustment(insight: InsightRow | undefined): number {
    if (!insight) return 0;

    const hasLlmInsight = !!insight.pharmacy_insight;
    const riskLevel = insight.risk_level;
    const tirImproving = insight.prev_tir != null && insight.tir > insight.prev_tir;

    // High risk + LLM insight → urgent attention needed
    if (riskLevel === 'high' && hasLlmInsight) return 15;

    // Moderate risk + LLM insight → elevated attention
    if (riskLevel === 'moderate' && hasLlmInsight) return 8;

    // Low risk + TIR improving → lower priority (patient doing well)
    if (riskLevel === 'low' && tirImproving) return -10;

    // LLM insight exists but low risk → slight boost for awareness
    if (hasLlmInsight) return 3;

    return 0;
  }
}
