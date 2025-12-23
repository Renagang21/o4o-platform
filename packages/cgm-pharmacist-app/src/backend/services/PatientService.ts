/**
 * Patient Service
 *
 * 환자 관리 서비스 (Mock 데이터 기반)
 */

import type {
  PatientSummary,
  GetPatientsRequest,
  GetPatientsResponse,
  GetPatientDetailResponse,
  RiskLevel,
} from '../dto/index.js';
import {
  getMockPatientSummaries,
  getMockPatientDetail,
} from '../mock/mockPatients.js';

export class PatientService {
  /**
   * 환자 목록 조회
   */
  async getPatients(request: GetPatientsRequest = {}): Promise<GetPatientsResponse> {
    const {
      page = 1,
      limit = 10,
      riskLevel,
      sortBy = 'riskLevel',
      sortOrder = 'desc',
      search,
    } = request;

    let patients = getMockPatientSummaries();

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      patients = patients.filter(
        (p) =>
          p.patient.displayName.toLowerCase().includes(searchLower) ||
          p.patient.id.toLowerCase().includes(searchLower)
      );
    }

    // 위험 수준 필터
    if (riskLevel) {
      patients = patients.filter((p) => p.riskLevel === riskLevel);
    }

    // 정렬
    patients = this.sortPatients(patients, sortBy, sortOrder);

    // 페이지네이션
    const total = patients.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPatients = patients.slice(startIndex, endIndex);

    return {
      patients: paginatedPatients,
      total,
      page,
      limit,
      hasMore: endIndex < total,
    };
  }

  /**
   * 환자 상세 조회
   */
  async getPatientDetail(patientId: string): Promise<GetPatientDetailResponse | null> {
    return getMockPatientDetail(patientId);
  }

  /**
   * 위험 환자 목록 조회 (우선순위순)
   */
  async getRiskPatients(): Promise<PatientSummary[]> {
    const patients = getMockPatientSummaries();

    // high, medium 위험만 필터링 후 정렬
    return patients
      .filter((p) => p.riskLevel === 'high' || p.riskLevel === 'medium')
      .sort((a, b) => {
        const riskOrder: Record<RiskLevel, number> = {
          high: 0,
          medium: 1,
          low: 2,
          normal: 3,
        };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      });
  }

  /**
   * 오늘 상담 예정 환자 조회
   */
  async getTodayCoachingPatients(): Promise<PatientSummary[]> {
    const patients = getMockPatientSummaries();
    const today = new Date().toISOString().split('T')[0];

    return patients.filter((p) => {
      if (!p.nextCoachingAt) return false;
      return p.nextCoachingAt.split('T')[0] === today;
    });
  }

  private sortPatients(
    patients: PatientSummary[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): PatientSummary[] {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return [...patients].sort((a, b) => {
      switch (sortBy) {
        case 'riskLevel': {
          const riskOrder: Record<RiskLevel, number> = {
            high: 0,
            medium: 1,
            low: 2,
            normal: 3,
          };
          return (riskOrder[a.riskLevel] - riskOrder[b.riskLevel]) * multiplier;
        }
        case 'lastCoaching': {
          const aDate = a.lastCoachingAt ? new Date(a.lastCoachingAt).getTime() : 0;
          const bDate = b.lastCoachingAt ? new Date(b.lastCoachingAt).getTime() : 0;
          return (bDate - aDate) * multiplier;
        }
        case 'name':
          return a.patient.displayName.localeCompare(b.patient.displayName) * multiplier;
        default:
          return 0;
      }
    });
  }
}

export const patientService = new PatientService();
