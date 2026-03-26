import type { DataSource } from 'typeorm';

/**
 * CareAlertService — WO-O4O-CARE-ALERT-ENGINE-V1
 *
 * Snapshot 생성 후 조건 검사 → 알림 자동 생성.
 * 중복 방지: 동일 patient_id + alert_type + status IN ('open','acknowledged') 존재 시 스킵.
 */

export interface CareAlertDto {
  id: string;
  patientId: string;
  patientName: string;
  alertType: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
}

interface AnalysisResult {
  riskLevel?: string;
  tir?: number;
  cv?: number;
  patientName?: string;
}

export class CareAlertService {
  constructor(private dataSource: DataSource) {}

  /**
   * evaluateAndCreate — fire-and-forget: 전체 try/catch
   * Snapshot 체인에서 호출. 조건 검사 후 alert 생성.
   */
  async evaluateAndCreate(
    patientId: string,
    analysis: AnalysisResult,
    pharmacyId: string,
  ): Promise<void> {
    try {
      const patientName = analysis.patientName || '환자';

      // 1. high_risk — riskLevel === 'high'
      if (analysis.riskLevel === 'high') {
        await this.createIfNotDuplicate(
          pharmacyId,
          patientId,
          'high_risk',
          'critical',
          `${patientName} 환자 고위험 상태`,
        );
      }

      // 2. abnormal_glucose — TIR < 60 또는 CV > 40
      const tir = analysis.tir ?? 100;
      const cv = analysis.cv ?? 0;
      if (tir < 60 || cv > 40) {
        await this.createIfNotDuplicate(
          pharmacyId,
          patientId,
          'abnormal_glucose',
          'warning',
          `${patientName} 환자 혈당 이상 패턴 (TIR ${tir}%, CV ${cv}%)`,
        );
      }

      // 3. data_missing — 48시간 데이터 없음
      const readingResult = await this.dataSource.query(
        `SELECT MAX(measured_at) AS last_at
         FROM health_readings
         WHERE patient_id = $1 AND pharmacy_id = $2`,
        [patientId, pharmacyId],
      );
      const lastReadingAt = readingResult[0]?.last_at;
      if (
        !lastReadingAt ||
        Date.now() - new Date(lastReadingAt).getTime() > 48 * 60 * 60 * 1000
      ) {
        await this.createIfNotDuplicate(
          pharmacyId,
          patientId,
          'data_missing',
          'warning',
          `${patientName} 환자 48시간 데이터 미입력`,
        );
      }

      // 4. coaching_needed — 7일 코칭 없음
      const coachingResult = await this.dataSource.query(
        `SELECT MAX(created_at) AS last_at
         FROM care_coaching_sessions
         WHERE patient_id = $1 AND pharmacy_id = $2`,
        [patientId, pharmacyId],
      );
      const lastCoachingAt = coachingResult[0]?.last_at;
      if (
        !lastCoachingAt ||
        Date.now() - new Date(lastCoachingAt).getTime() > 7 * 24 * 60 * 60 * 1000
      ) {
        await this.createIfNotDuplicate(
          pharmacyId,
          patientId,
          'coaching_needed',
          'info',
          `${patientName} 환자 7일간 코칭 기록 없음`,
        );
      }
    } catch {
      // fire-and-forget: swallow errors
    }
  }

  /**
   * getActiveAlerts — status IN ('open', 'acknowledged')
   * pharmacyId = null → global (operator/admin)
   */
  async getActiveAlerts(pharmacyId: string | null): Promise<CareAlertDto[]> {
    // safeQuery: care_alerts / glucoseview_customers may not exist in production
    try {
      const isGlobal = pharmacyId === null;
      const rows = await this.dataSource.query(
        `SELECT
           a.id,
           a.patient_id AS "patientId",
           COALESCE(c.name, '환자') AS "patientName",
           a.alert_type AS "alertType",
           a.severity,
           a.message,
           a.status,
           a.created_at AS "createdAt"
         FROM care_alerts a
         LEFT JOIN glucoseview_customers c ON c.user_id = a.patient_id
         WHERE ${isGlobal ? '' : 'a.pharmacy_id = $1 AND '}a.status IN ('open', 'acknowledged')
         ORDER BY
           CASE a.severity
             WHEN 'critical' THEN 0
             WHEN 'warning' THEN 1
             WHEN 'info' THEN 2
           END,
           a.created_at DESC
         ${isGlobal ? 'LIMIT 200' : ''}`,
        isGlobal ? [] : [pharmacyId],
      );
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * acknowledgeAlert — status → 'acknowledged'
   * pharmacyId = null → global (operator/admin)
   */
  async acknowledgeAlert(alertId: string, pharmacyId: string | null): Promise<void> {
    try {
      if (pharmacyId === null) {
        await this.dataSource.query(
          `UPDATE care_alerts SET status = 'acknowledged' WHERE id = $1 AND status = 'open'`,
          [alertId],
        );
      } else {
        await this.dataSource.query(
          `UPDATE care_alerts
           SET status = 'acknowledged'
           WHERE id = $1 AND pharmacy_id = $2 AND status = 'open'`,
          [alertId, pharmacyId],
        );
      }
    } catch {
      // table may not exist in production
    }
  }

  /**
   * resolveAlert — status → 'resolved', resolved_at = NOW()
   * pharmacyId = null → global (operator/admin)
   */
  async resolveAlert(alertId: string, pharmacyId: string | null): Promise<void> {
    try {
      if (pharmacyId === null) {
        await this.dataSource.query(
          `UPDATE care_alerts SET status = 'resolved', resolved_at = NOW() WHERE id = $1 AND status IN ('open', 'acknowledged')`,
          [alertId],
        );
      } else {
        await this.dataSource.query(
          `UPDATE care_alerts
           SET status = 'resolved', resolved_at = NOW()
           WHERE id = $1 AND pharmacy_id = $2 AND status IN ('open', 'acknowledged')`,
          [alertId, pharmacyId],
        );
      }
    } catch {
      // table may not exist in production
    }
  }

  // ── Private ──

  private async createIfNotDuplicate(
    pharmacyId: string,
    patientId: string,
    alertType: string,
    severity: string,
    message: string,
  ): Promise<void> {
    // Check duplicate: same patient + type + open/acknowledged
    const existing = await this.dataSource.query(
      `SELECT 1 FROM care_alerts
       WHERE patient_id = $1 AND alert_type = $2 AND status IN ('open', 'acknowledged')
       LIMIT 1`,
      [patientId, alertType],
    );
    if (existing.length > 0) return;

    await this.dataSource.query(
      `INSERT INTO care_alerts (id, pharmacy_id, patient_id, alert_type, severity, message, status, created_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 'open', NOW())`,
      [pharmacyId, patientId, alertType, severity, message],
    );
  }
}
