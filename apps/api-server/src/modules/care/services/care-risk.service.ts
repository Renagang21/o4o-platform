import type { DataSource } from 'typeorm';

/**
 * CareRiskService — Composite Risk Patient Detection
 *
 * WO-O4O-CARE-RISK-PATIENT-DETECTION-V1
 *
 * Queries latest KPI snapshot per patient, extracts multi-metric data from
 * metadata JSONB, computes composite risk score, and returns categorised lists.
 *
 * Composite Risk Score (0–8):
 *   glucoseRisk (0–2) + bpRisk (0–2) + weightRisk (0–2) + metabolicRisk (0–2)
 *
 * Classification:
 *   0–1 → normal
 *   2–3 → caution
 *   ≥ 4 → high
 */

// ── Response DTOs ──

export interface RiskBreakdown {
  glucose: number;   // 0–2
  bp: number;        // 0–2
  weight: number;    // 0–2
  metabolic: number; // 0–2
}

export interface RiskPatientDto {
  patientId: string;
  patientName: string;
  phone?: string;
  compositeRiskLevel: 'high' | 'caution' | 'normal';
  compositeScore: number;
  glucoseRiskLevel: string;
  tir: number;
  cv: number;
  lastAnalysisDate: string;
  riskBreakdown: RiskBreakdown;
}

export interface RiskPatientsResponseDto {
  highRisk: RiskPatientDto[];
  caution: RiskPatientDto[];
}

// ── Risk Scoring Pure Functions ──

const RISK_SCORE: Record<string, number> = { low: 0, moderate: 1, high: 2 };

function glucoseScore(riskLevel: string): number {
  return RISK_SCORE[riskLevel] ?? 0;
}

function bpScore(bpCategory: string | undefined): number {
  if (!bpCategory) return 0;
  if (bpCategory === 'high_stage1' || bpCategory === 'high_stage2') return 2;
  if (bpCategory === 'elevated') return 1;
  return 0; // normal
}

function weightScore(weightChange: number | null | undefined): number {
  if (weightChange == null) return 0;
  const abs = Math.abs(weightChange);
  if (abs >= 3) return 2;
  if (abs >= 2) return 1;
  return 0;
}

function metabolicScore(metabolicRiskLevel: string | undefined): number {
  if (!metabolicRiskLevel) return 0;
  return RISK_SCORE[metabolicRiskLevel] ?? 0;
}

function classifyComposite(score: number): 'high' | 'caution' | 'normal' {
  if (score >= 4) return 'high';
  if (score >= 2) return 'caution';
  return 'normal';
}

// ── Service ──

interface SnapshotRow {
  patient_id: string;
  risk_level: string;
  tir: number;
  cv: number;
  metadata: Record<string, unknown>;
  created_at: string;
  patient_name: string;
  patient_phone: string | null;
}

export class CareRiskService {
  constructor(private dataSource: DataSource) {}

  async getRiskPatients(pharmacyId: string | null | undefined): Promise<RiskPatientsResponseDto> {
    const isAdmin = pharmacyId === null || pharmacyId === undefined;

    // Latest snapshot per patient + JOIN customer data
    const query = isAdmin
      ? `
        SELECT
          s.patient_id,
          s.risk_level,
          s.tir,
          s.cv,
          s.metadata,
          s.created_at,
          COALESCE(c.name, '환자') AS patient_name,
          c.phone AS patient_phone
        FROM care_kpi_snapshots s
        INNER JOIN (
          SELECT patient_id, MAX(created_at) AS max_at
          FROM care_kpi_snapshots
          GROUP BY patient_id
        ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
        LEFT JOIN glucoseview_customers c ON c.user_id = s.patient_id
        ORDER BY s.created_at DESC
      `
      : `
        SELECT
          s.patient_id,
          s.risk_level,
          s.tir,
          s.cv,
          s.metadata,
          s.created_at,
          COALESCE(c.name, '환자') AS patient_name,
          c.phone AS patient_phone
        FROM care_kpi_snapshots s
        INNER JOIN (
          SELECT patient_id, MAX(created_at) AS max_at
          FROM care_kpi_snapshots
          WHERE pharmacy_id = $1
          GROUP BY patient_id
        ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
        LEFT JOIN glucoseview_customers c ON c.user_id = s.patient_id
        WHERE s.pharmacy_id = $1
        ORDER BY s.created_at DESC
      `;

    // safeQuery: care_kpi_snapshots / glucoseview_customers may not exist in production
    let rows: SnapshotRow[];
    try {
      rows = isAdmin
        ? await this.dataSource.query(query)
        : await this.dataSource.query(query, [pharmacyId]);
    } catch {
      return { highRisk: [], caution: [] };
    }

    const highRisk: RiskPatientDto[] = [];
    const caution: RiskPatientDto[] = [];

    for (const row of rows) {
      const breakdown = this.computeBreakdown(row);
      const score = breakdown.glucose + breakdown.bp + breakdown.weight + breakdown.metabolic;
      const level = classifyComposite(score);

      if (level === 'normal') continue; // Only return at-risk patients

      const dto: RiskPatientDto = {
        patientId: row.patient_id,
        patientName: row.patient_name,
        phone: row.patient_phone ?? undefined,
        compositeRiskLevel: level,
        compositeScore: score,
        glucoseRiskLevel: row.risk_level,
        tir: row.tir,
        cv: row.cv,
        lastAnalysisDate: typeof row.created_at === 'string'
          ? row.created_at
          : new Date(row.created_at).toISOString(),
        riskBreakdown: breakdown,
      };

      if (level === 'high') {
        highRisk.push(dto);
      } else {
        caution.push(dto);
      }
    }

    // Sort by composite score descending within each group
    highRisk.sort((a, b) => b.compositeScore - a.compositeScore);
    caution.sort((a, b) => b.compositeScore - a.compositeScore);

    return { highRisk, caution };
  }

  private computeBreakdown(row: SnapshotRow): RiskBreakdown {
    const meta = row.metadata as Record<string, unknown> | null;
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
      mScore = metabolicScore(metabolic?.metabolicRiskLevel as string | undefined);
    }

    return {
      glucose: gScore,
      bp: bScore,
      weight: wScore,
      metabolic: mScore,
    };
  }
}
