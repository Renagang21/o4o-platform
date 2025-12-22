/**
 * Alert Service
 *
 * 위험 알림 관리 서비스 (Mock 데이터 기반)
 */

import type { RiskFlag, GetAlertsResponse } from '../dto/index.js';
import { getMockAllAlerts } from '../mock/mockPatients.js';

export class AlertService {
  private alertsCache: RiskFlag[] | null = null;

  /**
   * 전체 알림 조회
   */
  async getAlerts(): Promise<GetAlertsResponse> {
    if (!this.alertsCache) {
      this.alertsCache = getMockAllAlerts();
    }

    const unacknowledgedCount = this.alertsCache.filter(
      (a) => !a.isAcknowledged
    ).length;

    return {
      alerts: this.alertsCache,
      total: this.alertsCache.length,
      unacknowledgedCount,
    };
  }

  /**
   * 미확인 알림 조회
   */
  async getUnacknowledgedAlerts(): Promise<RiskFlag[]> {
    const { alerts } = await this.getAlerts();
    return alerts.filter((a) => !a.isAcknowledged);
  }

  /**
   * 알림 확인 처리
   */
  async acknowledgeAlert(
    alertId: string,
    pharmacistId: string
  ): Promise<RiskFlag | null> {
    if (!this.alertsCache) {
      await this.getAlerts();
    }

    const alertIndex = this.alertsCache!.findIndex((a) => a.id === alertId);
    if (alertIndex === -1) return null;

    const now = new Date().toISOString();
    this.alertsCache![alertIndex] = {
      ...this.alertsCache![alertIndex],
      isAcknowledged: true,
      acknowledgedAt: now,
      acknowledgedBy: pharmacistId,
    };

    return this.alertsCache![alertIndex];
  }

  /**
   * 고위험 알림 개수 조회
   */
  async getHighRiskAlertCount(): Promise<number> {
    const { alerts } = await this.getAlerts();
    return alerts.filter(
      (a) => a.severity === 'high' && !a.isAcknowledged
    ).length;
  }

  /**
   * 환자별 알림 조회
   */
  getAlertsByPatient(patientId: string, alerts: RiskFlag[]): RiskFlag[] {
    // 알림 ID에서 환자 ID 추출 (예: risk-002-1 -> patient-002)
    return alerts.filter((a) => {
      const parts = a.id.split('-');
      if (parts.length >= 2) {
        return `patient-${parts[1]}` === patientId;
      }
      return false;
    });
  }
}

export const alertService = new AlertService();
