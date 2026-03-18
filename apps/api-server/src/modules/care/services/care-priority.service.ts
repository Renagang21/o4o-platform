import type { DataSource } from 'typeorm';

/**
 * CarePriorityService — WO-O4O-CARE-PRIORITY-PATIENT-ENGINE-V1
 *
 * Priority Score (0–100) = Risk(0–40) + Glucose(0–20) + Coaching(0–20) + Freshness(0–20)
 *
 * Combines composite risk, glucose patterns, coaching gaps, and data freshness
 * to surface TOP N patients the pharmacist should attend to first.
 */

// ── Response DTOs ──

// WO-O4O-CARE-TODAY-PRIORITY-PATIENTS-V1
export interface TodayPriorityPatientDto {
  patientId: string;
  name: string;
  priorityScore: number;
  riskLevel: string;
  alertCount: number;
}

export interface PriorityPatientDto {
  patientId: string;
  patientName: string;
  priorityScore: number;
  riskLevel: 'high' | 'caution' | 'normal';
  tir: number;
  lastReadingAt: string | null;
  reasons: string[];
}

// ── Composite Risk Scoring (inlined from care-risk.service.ts) ──

const RISK_SCORE: Record<string, number> = { low: 0, moderate: 1, high: 2 };

function glucoseScore(riskLevel: string): number {
  return RISK_SCORE[riskLevel] ?? 0;
}

function bpScore(bpCategory: string | undefined): number {
  if (!bpCategory) return 0;
  if (bpCategory === 'high_stage1' || bpCategory === 'high_stage2') return 2;
  if (bpCategory === 'elevated') return 1;
  return 0;
}

function weightScore(weightChange: number | null | undefined): number {
  if (weightChange == null) return 0;
  const abs = Math.abs(weightChange);
  if (abs >= 3) return 2;
  if (abs >= 2) return 1;
  return 0;
}

function metabolicRiskScore(metabolicRiskLevel: string | undefined): number {
  if (!metabolicRiskLevel) return 0;
  return RISK_SCORE[metabolicRiskLevel] ?? 0;
}

function classifyComposite(score: number): 'high' | 'caution' | 'normal' {
  if (score >= 4) return 'high';
  if (score >= 2) return 'caution';
  return 'normal';
}

// ── Priority Score Mapping ──

function riskToPriorityScore(level: 'high' | 'caution' | 'normal'): number {
  if (level === 'high') return 40;
  if (level === 'caution') return 20;
  return 0;
}

// ── Row types from SQL ──

interface TodayPriorityRow {
  patient_id: string;
  risk_level: string;
  snapshot_at: string | null;
  patient_name: string;
  last_reading_at: string | null;
  alert_count: number;
  alert_score: number;
}

interface PriorityRow {
  patient_id: string;
  risk_level: string;
  tir: number;
  cv: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  patient_name: string;
  last_coaching_at: string | null;
  last_reading_at: string | null;
  alert_count: number;
}

// ── Service ──

export class CarePriorityService {
  constructor(private dataSource: DataSource) {}

  async getTopPriorityPatients(
    pharmacyId: string | null | undefined,
    limit = 5,
  ): Promise<PriorityPatientDto[]> {
    const isAdmin = pharmacyId === null || pharmacyId === undefined;

    const query = isAdmin
      ? `
        WITH latest_snapshot AS (
          SELECT DISTINCT ON (patient_id)
            patient_id, risk_level, tir, cv, metadata, created_at
          FROM care_kpi_snapshots
          ORDER BY patient_id, created_at DESC
        ),
        latest_coaching AS (
          SELECT DISTINCT ON (patient_id)
            patient_id, created_at AS last_coaching_at
          FROM care_coaching_sessions
          ORDER BY patient_id, created_at DESC
        ),
        latest_reading AS (
          SELECT DISTINCT ON (patient_id)
            patient_id, measured_at AS last_reading_at
          FROM health_readings
          ORDER BY patient_id, measured_at DESC
        ),
        open_alerts AS (
          SELECT patient_id, COUNT(*)::int AS alert_count
          FROM care_alerts
          WHERE status IN ('open', 'acknowledged')
          GROUP BY patient_id
        )
        SELECT
          s.patient_id,
          s.risk_level,
          s.tir,
          s.cv,
          s.metadata,
          s.created_at,
          COALESCE(c.name, '환자') AS patient_name,
          lc.last_coaching_at,
          lr.last_reading_at,
          COALESCE(oa.alert_count, 0)::int AS alert_count
        FROM latest_snapshot s
        LEFT JOIN glucoseview_customers c ON c.id = s.patient_id
        LEFT JOIN latest_coaching lc ON lc.patient_id = s.patient_id
        LEFT JOIN latest_reading lr ON lr.patient_id = s.patient_id
        LEFT JOIN open_alerts oa ON oa.patient_id = s.patient_id
      `
      : `
        WITH latest_snapshot AS (
          SELECT DISTINCT ON (patient_id)
            patient_id, risk_level, tir, cv, metadata, created_at
          FROM care_kpi_snapshots
          WHERE pharmacy_id = $1
          ORDER BY patient_id, created_at DESC
        ),
        latest_coaching AS (
          SELECT DISTINCT ON (patient_id)
            patient_id, created_at AS last_coaching_at
          FROM care_coaching_sessions
          WHERE pharmacy_id = $1
          ORDER BY patient_id, created_at DESC
        ),
        latest_reading AS (
          SELECT DISTINCT ON (patient_id)
            patient_id, measured_at AS last_reading_at
          FROM health_readings
          WHERE pharmacy_id = $1
          ORDER BY patient_id, measured_at DESC
        ),
        open_alerts AS (
          SELECT patient_id, COUNT(*)::int AS alert_count
          FROM care_alerts
          WHERE pharmacy_id = $1 AND status IN ('open', 'acknowledged')
          GROUP BY patient_id
        )
        SELECT
          s.patient_id,
          s.risk_level,
          s.tir,
          s.cv,
          s.metadata,
          s.created_at,
          COALESCE(c.name, '환자') AS patient_name,
          lc.last_coaching_at,
          lr.last_reading_at,
          COALESCE(oa.alert_count, 0)::int AS alert_count
        FROM latest_snapshot s
        LEFT JOIN glucoseview_customers c ON c.id = s.patient_id
        LEFT JOIN latest_coaching lc ON lc.patient_id = s.patient_id
        LEFT JOIN latest_reading lr ON lr.patient_id = s.patient_id
        LEFT JOIN open_alerts oa ON oa.patient_id = s.patient_id
      `;

    // safeQuery: care tables may not exist in production
    let rows: PriorityRow[];
    try {
      rows = isAdmin
        ? await this.dataSource.query(query)
        : await this.dataSource.query(query, [pharmacyId]);
    } catch {
      return [];
    }

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

    const scored: PriorityPatientDto[] = [];

    for (const row of rows) {
      let priorityScore = 0;
      const reasons: string[] = [];

      // 1. Risk Level (0–40): compute composite risk from multi-metric
      const compositeLevel = this.computeCompositeLevel(row);
      const riskPoints = riskToPriorityScore(compositeLevel);
      priorityScore += riskPoints;
      if (compositeLevel === 'high') reasons.push('고위험');
      else if (compositeLevel === 'caution') reasons.push('주의 필요');

      // 2. Glucose Pattern (0–20): TIR < 70 → +10, CV > 36 → +10
      if (row.tir < 70) {
        priorityScore += 10;
        reasons.push(`TIR ${row.tir}%`);
      }
      if (row.cv > 36) {
        priorityScore += 10;
        reasons.push(`CV ${row.cv}%`);
      }

      // 3. Coaching Gap (0–20): 7일 내 coaching 없음 → +20
      const lastCoachingAt = row.last_coaching_at ? new Date(row.last_coaching_at).getTime() : 0;
      if (!row.last_coaching_at || now - lastCoachingAt > SEVEN_DAYS_MS) {
        priorityScore += 20;
        reasons.push('7일 코칭 없음');
      }

      // 4. Data Freshness (0–20): 48시간 데이터 없음 → +20
      const lastReadingAt = row.last_reading_at ? new Date(row.last_reading_at).getTime() : 0;
      if (!row.last_reading_at || now - lastReadingAt > FORTY_EIGHT_HOURS_MS) {
        priorityScore += 20;
        reasons.push('최근 데이터 없음');
      }

      // 5. Open Alerts Boost (+20): WO-O4O-CARE-ALERT-ENGINE-V1
      if (row.alert_count > 0) {
        priorityScore += 20;
        reasons.push('미해결 알림');
      }

      scored.push({
        patientId: row.patient_id,
        patientName: row.patient_name,
        priorityScore,
        riskLevel: compositeLevel,
        tir: row.tir,
        lastReadingAt: row.last_reading_at
          ? (typeof row.last_reading_at === 'string'
              ? row.last_reading_at
              : new Date(row.last_reading_at).toISOString())
          : null,
        reasons,
      });
    }

    // Sort by priorityScore DESC, take TOP N
    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    return scored.slice(0, limit);
  }

  /**
   * getTodayPriorityPatients — WO-O4O-CARE-TODAY-PRIORITY-PATIENTS-V1
   *
   * Simplified scoring for "Today's Priority":
   *   Risk:      low=0, moderate=10, high=20
   *   Alert:     per active alert severity (info=5, warning=10, critical=20)
   *   Activity:  >2 days no reading = +10
   *   Freshness: >7 days no snapshot = +10
   */
  async getTodayPriorityPatients(
    pharmacyId: string,
    limit = 5,
  ): Promise<TodayPriorityPatientDto[]> {
    // safeQuery: care tables may not exist in production
    let rows: TodayPriorityRow[];
    try {
      rows = await this.dataSource.query(
      `
      WITH latest_snapshot AS (
        SELECT DISTINCT ON (patient_id)
          patient_id, risk_level, created_at
        FROM care_kpi_snapshots
        WHERE pharmacy_id = $1
        ORDER BY patient_id, created_at DESC
      ),
      latest_reading AS (
        SELECT DISTINCT ON (patient_id)
          patient_id, measured_at AS last_reading_at
        FROM health_readings
        WHERE pharmacy_id = $1
        ORDER BY patient_id, measured_at DESC
      ),
      alert_scores AS (
        SELECT patient_id,
          COUNT(*)::int AS alert_count,
          SUM(
            CASE severity
              WHEN 'critical' THEN 20
              WHEN 'warning' THEN 10
              WHEN 'info' THEN 5
              ELSE 0
            END
          )::int AS alert_score
        FROM care_alerts
        WHERE pharmacy_id = $1 AND status IN ('open', 'acknowledged')
        GROUP BY patient_id
      )
      SELECT
        s.patient_id,
        s.risk_level,
        s.created_at AS snapshot_at,
        COALESCE(c.name, '환자') AS patient_name,
        lr.last_reading_at,
        COALESCE(a.alert_count, 0)::int AS alert_count,
        COALESCE(a.alert_score, 0)::int AS alert_score
      FROM latest_snapshot s
      LEFT JOIN glucoseview_customers c ON c.id = s.patient_id
      LEFT JOIN latest_reading lr ON lr.patient_id = s.patient_id
      LEFT JOIN alert_scores a ON a.patient_id = s.patient_id
      `,
      [pharmacyId],
    );
    } catch {
      return [];
    }

    const now = Date.now();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const scored: TodayPriorityPatientDto[] = [];

    for (const row of rows) {
      // Risk Score: low=0, moderate=10, high=20
      const riskScore =
        row.risk_level === 'high' ? 20 : row.risk_level === 'moderate' ? 10 : 0;

      // Alert Score: sum of per-alert severity scores from SQL
      const alertScore = row.alert_score;

      // Activity Score: >2 days no reading = +10
      const lastReadingMs = row.last_reading_at
        ? new Date(row.last_reading_at).getTime()
        : 0;
      const activityScore =
        !row.last_reading_at || now - lastReadingMs > TWO_DAYS_MS ? 10 : 0;

      // Freshness Score: >7 days no snapshot = +10
      const snapshotMs = row.snapshot_at
        ? new Date(row.snapshot_at).getTime()
        : 0;
      const freshnessScore =
        !row.snapshot_at || now - snapshotMs > SEVEN_DAYS_MS ? 10 : 0;

      const priorityScore = riskScore + alertScore + activityScore + freshnessScore;

      scored.push({
        patientId: row.patient_id,
        name: row.patient_name,
        priorityScore,
        riskLevel: row.risk_level,
        alertCount: row.alert_count,
      });
    }

    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    return scored.slice(0, limit);
  }

  private computeCompositeLevel(row: PriorityRow): 'high' | 'caution' | 'normal' {
    const meta = row.metadata;
    const multiMetric = (meta?.multiMetric as Record<string, unknown>) ?? null;

    const gScore = glucoseScore(row.risk_level);
    let bScore = 0;
    let wScore = 0;
    let mScore = 0;

    if (multiMetric) {
      const bp = multiMetric.bp as Record<string, unknown> | null;
      const weight = multiMetric.weight as Record<string, unknown> | null;
      const metabolic = multiMetric.metabolicRisk as Record<string, unknown> | null;

      bScore = bpScore(bp?.bpCategory as string | undefined);
      wScore = weightScore(weight?.weightChange as number | null | undefined);
      mScore = metabolicRiskScore(metabolic?.metabolicRiskLevel as string | undefined);
    }

    const composite = gScore + bScore + wScore + mScore;
    return classifyComposite(composite);
  }
}
