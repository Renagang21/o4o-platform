import type { DataSource } from 'typeorm';

/**
 * CarePopulationService — WO-O4O-CARE-POPULATION-DASHBOARD-V1
 *
 * 약국 전체 환자 상태 요약: risk 분포, 평균 TIR/CV, 코칭 활동, 데이터 활동.
 * 5개 독립 쿼리를 Promise.all 병렬 실행.
 */

export interface PopulationDashboardDto {
  totalPatients: number;
  riskDistribution: {
    high: number;
    moderate: number;
    low: number;
  };
  averageMetrics: {
    tir: number;
    cv: number;
  };
  coaching: {
    sent7d: number;
    pending: number;
  };
  activity: {
    activePatients: number;
    inactivePatients: number;
  };
}

export class CarePopulationService {
  constructor(private dataSource: DataSource) {}

  async getPopulationDashboard(
    pharmacyId: string | null | undefined,
  ): Promise<PopulationDashboardDto> {
    const isAdmin = pharmacyId === null || pharmacyId === undefined;

    const [totalResult, snapshotResult, coachingSentResult, coachingPendingResult, activeResult] =
      await Promise.all([
        // 1. Total patients
        isAdmin
          ? this.dataSource.query(`SELECT COUNT(*)::int AS count FROM glucoseview_customers`)
          : this.dataSource.query(
              `SELECT COUNT(*)::int AS count FROM glucoseview_customers WHERE organization_id = $1`,
              [pharmacyId],
            ),

        // 2. Risk distribution + average metrics (latest snapshot per patient)
        isAdmin
          ? this.dataSource.query(`
              WITH latest AS (
                SELECT DISTINCT ON (patient_id) risk_level, tir, cv
                FROM care_kpi_snapshots
                ORDER BY patient_id, created_at DESC
              )
              SELECT
                COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high,
                COUNT(*) FILTER (WHERE risk_level = 'moderate')::int AS moderate,
                COUNT(*) FILTER (WHERE risk_level = 'low')::int AS low,
                ROUND(AVG(tir)::numeric, 1) AS avg_tir,
                ROUND(AVG(cv)::numeric, 1) AS avg_cv
              FROM latest
            `)
          : this.dataSource.query(
              `
              WITH latest AS (
                SELECT DISTINCT ON (patient_id) risk_level, tir, cv
                FROM care_kpi_snapshots
                WHERE pharmacy_id = $1
                ORDER BY patient_id, created_at DESC
              )
              SELECT
                COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high,
                COUNT(*) FILTER (WHERE risk_level = 'moderate')::int AS moderate,
                COUNT(*) FILTER (WHERE risk_level = 'low')::int AS low,
                ROUND(AVG(tir)::numeric, 1) AS avg_tir,
                ROUND(AVG(cv)::numeric, 1) AS avg_cv
              FROM latest
            `,
              [pharmacyId],
            ),

        // 3. Coaching sent (7 days)
        isAdmin
          ? this.dataSource.query(`
              SELECT COUNT(*)::int AS count
              FROM care_coaching_sessions
              WHERE created_at >= NOW() - INTERVAL '7 days'
            `)
          : this.dataSource.query(
              `
              SELECT COUNT(*)::int AS count
              FROM care_coaching_sessions
              WHERE pharmacy_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
            `,
              [pharmacyId],
            ),

        // 4. Coaching pending drafts
        isAdmin
          ? this.dataSource.query(`
              SELECT COUNT(*)::int AS count
              FROM care_coaching_drafts
              WHERE status = 'draft'
            `)
          : this.dataSource.query(
              `
              SELECT COUNT(*)::int AS count
              FROM care_coaching_drafts
              WHERE pharmacy_id = $1 AND status = 'draft'
            `,
              [pharmacyId],
            ),

        // 5. Active patients (7-day health readings)
        isAdmin
          ? this.dataSource.query(`
              SELECT COUNT(DISTINCT patient_id)::int AS count
              FROM health_readings
              WHERE measured_at >= NOW() - INTERVAL '7 days'
            `)
          : this.dataSource.query(
              `
              SELECT COUNT(DISTINCT patient_id)::int AS count
              FROM health_readings
              WHERE pharmacy_id = $1 AND measured_at >= NOW() - INTERVAL '7 days'
            `,
              [pharmacyId],
            ),
      ]);

    const totalPatients = totalResult[0]?.count ?? 0;
    const snap = snapshotResult[0] ?? {};
    const activePatients = activeResult[0]?.count ?? 0;

    return {
      totalPatients,
      riskDistribution: {
        high: snap.high ?? 0,
        moderate: snap.moderate ?? 0,
        low: snap.low ?? 0,
      },
      averageMetrics: {
        tir: Number(snap.avg_tir) || 0,
        cv: Number(snap.avg_cv) || 0,
      },
      coaching: {
        sent7d: coachingSentResult[0]?.count ?? 0,
        pending: coachingPendingResult[0]?.count ?? 0,
      },
      activity: {
        activePatients,
        inactivePatients: Math.max(0, totalPatients - activePatients),
      },
    };
  }
}
