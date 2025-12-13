/**
 * PharmacyDiabetesService
 *
 * 혈당관리 약국 대시보드 및 통계 서비스
 *
 * @package @o4o/diabetes-pharmacy
 */

import type {
  DashboardSummaryDto,
  PatientSummaryDto,
  ActionType,
} from '../dto/index.js';
import { ActionService } from './ActionService.js';

/**
 * PharmacyDiabetesService
 *
 * 역할:
 * 1. 대시보드 요약 정보 제공
 * 2. 관리 대상자 통계
 * 3. 패턴 감지 현황
 */
export class PharmacyDiabetesService {
  private actionService: ActionService;

  constructor() {
    this.actionService = new ActionService();
  }

  /**
   * 대시보드 요약 조회
   */
  async getDashboardSummary(pharmacyId: string): Promise<DashboardSummaryDto> {
    // 1. 관리 대상자 수 조회
    const totalPatients = await this.countPatients(pharmacyId);

    // 2. 패턴 감지 수 조회
    const totalPatterns = await this.countPatterns(pharmacyId);

    // 3. Action 통계 조회
    const actionsResponse = await this.actionService.getActions(pharmacyId);

    return {
      pharmacyId,
      pharmacyName: await this.getPharmacyName(pharmacyId),
      totalPatients,
      totalPatterns,
      availableActions: actionsResponse.available,
      actionsByType: actionsResponse.byType,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * 관리 대상자 목록 조회
   */
  async getPatients(
    pharmacyId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ items: PatientSummaryDto[]; total: number }> {
    const { page = 1, limit = 20 } = options || {};

    // Phase 2: Mock 데이터
    // 실제 구현 시 diabetes-core에서 환자 목록 조회
    const mockPatients: PatientSummaryDto[] = [
      {
        patientId: 'user-1',
        patientName: '홍길동',
        lastCGMUpload: new Date(Date.now() - 3600000).toISOString(),
        latestPatterns: ['recurring_hypo', 'post_meal_spike'],
        pendingActions: 2,
      },
      {
        patientId: 'user-2',
        patientName: '김영희',
        lastCGMUpload: new Date(Date.now() - 7200000).toISOString(),
        latestPatterns: ['dawn_phenomenon'],
        pendingActions: 1,
      },
      {
        patientId: 'user-3',
        patientName: '이철수',
        lastCGMUpload: new Date(Date.now() - 86400000).toISOString(),
        latestPatterns: ['weekend_pattern'],
        pendingActions: 1,
      },
    ];

    return {
      items: mockPatients,
      total: mockPatients.length,
    };
  }

  /**
   * 특정 환자 정보 조회
   */
  async getPatient(pharmacyId: string, patientId: string): Promise<PatientSummaryDto | null> {
    const { items } = await this.getPatients(pharmacyId);
    return items.find((p) => p.patientId === patientId) || null;
  }

  /**
   * 관리 대상자 수 조회
   */
  private async countPatients(pharmacyId: string): Promise<number> {
    // Phase 2: Mock 데이터
    // 실제 구현 시 diabetes-core에서 환자 수 조회
    return 3;
  }

  /**
   * 패턴 감지 수 조회
   */
  private async countPatterns(pharmacyId: string): Promise<number> {
    // Phase 2: Mock 데이터
    // 실제 구현 시 diabetes-core에서 패턴 수 조회
    return 4;
  }

  /**
   * 약국 이름 조회
   */
  private async getPharmacyName(pharmacyId: string): Promise<string | undefined> {
    // Phase 2: Mock 데이터
    // 실제 구현 시 조직 정보에서 조회
    return '테스트 약국';
  }

  /**
   * CGM 업로드 통계 조회
   */
  async getCGMUploadStats(
    pharmacyId: string,
    options?: { days?: number },
  ): Promise<{
    totalUploads: number;
    avgUploadsPerDay: number;
    activeUsers: number;
  }> {
    const { days = 7 } = options || {};

    // Phase 2: Mock 데이터
    return {
      totalUploads: 42,
      avgUploadsPerDay: 6,
      activeUsers: 3,
    };
  }

  /**
   * 패턴 유형별 통계 조회
   */
  async getPatternStats(
    pharmacyId: string,
  ): Promise<Record<string, number>> {
    // Phase 2: Mock 데이터
    return {
      'recurring_hypo': 5,
      'recurring_hyper': 3,
      'post_meal_spike': 8,
      'dawn_phenomenon': 2,
      'weekend_pattern': 4,
    };
  }
}

export default PharmacyDiabetesService;
