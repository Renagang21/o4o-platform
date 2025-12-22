/**
 * CGM Adapter Interface
 *
 * 다수 CGM 업체 연동을 위한 추상 인터페이스
 *
 * 원칙:
 * - 특정 업체 종속 없음
 * - Raw 데이터 미저장 (요약만 사용)
 * - 동의는 CGM 업체 주체
 * - API 연동만 수행
 */

import type { CGMVendor, CGMSummaryDetail, CGMSummaryBrief } from '../backend/dto/index.js';

// ===== CGM 데이터 타입 =====

/**
 * CGM 읽기 데이터 (단일 측정값)
 * - Raw 데이터가 아닌 정제된 요약용 데이터
 */
export interface CGMReading {
  timestamp: string;
  glucoseValue: number; // mg/dL
  trend?: 'rising_fast' | 'rising' | 'stable' | 'falling' | 'falling_fast';
  isCalibration?: boolean;
}

/**
 * CGM 세션 정보
 */
export interface CGMSession {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  deviceId?: string;
  sensorId?: string;
}

/**
 * CGM 연결 결과
 */
export interface CGMConnectionResult {
  success: boolean;
  vendor: CGMVendor;
  patientExternalId?: string;
  consentId?: string;
  error?: string;
}

/**
 * CGM 데이터 조회 결과
 */
export interface CGMDataResult {
  success: boolean;
  vendor: CGMVendor;
  summary?: CGMSummaryDetail;
  briefSummary?: CGMSummaryBrief;
  lastReading?: CGMReading;
  error?: string;
}

// ===== CGM Adapter Interface =====

/**
 * CGM Adapter 인터페이스
 *
 * 모든 CGM 업체 연동은 이 인터페이스를 구현해야 함
 */
export interface ICGMAdapter {
  /**
   * 업체 식별자
   */
  readonly vendor: CGMVendor;

  /**
   * 업체 표시명
   */
  readonly vendorDisplayName: string;

  /**
   * 연결 확인
   */
  checkConnection(patientId: string): Promise<boolean>;

  /**
   * 데이터 동기화
   * - API를 통해 최신 데이터 가져오기
   * - Raw 데이터가 아닌 요약 데이터만 반환
   */
  syncData(patientId: string, fromDate?: string, toDate?: string): Promise<CGMDataResult>;

  /**
   * 요약 데이터 조회
   */
  getSummary(patientId: string, days?: number): Promise<CGMSummaryDetail | null>;

  /**
   * 최근 읽기 조회
   */
  getLatestReading(patientId: string): Promise<CGMReading | null>;

  /**
   * 연결 초기화 (OAuth 등)
   */
  initiateConnection(patientId: string, redirectUri: string): Promise<string>;

  /**
   * 연결 콜백 처리
   */
  handleConnectionCallback(code: string, state: string): Promise<CGMConnectionResult>;

  /**
   * 연결 해제
   */
  disconnect(patientId: string): Promise<boolean>;
}

// ===== Base Adapter (공통 기능) =====

/**
 * CGM Adapter 기본 구현
 *
 * 공통 기능을 제공하고, 업체별 구현은 상속하여 처리
 */
export abstract class BaseCGMAdapter implements ICGMAdapter {
  abstract readonly vendor: CGMVendor;
  abstract readonly vendorDisplayName: string;

  abstract checkConnection(patientId: string): Promise<boolean>;
  abstract syncData(patientId: string, fromDate?: string, toDate?: string): Promise<CGMDataResult>;
  abstract getSummary(patientId: string, days?: number): Promise<CGMSummaryDetail | null>;
  abstract getLatestReading(patientId: string): Promise<CGMReading | null>;
  abstract initiateConnection(patientId: string, redirectUri: string): Promise<string>;
  abstract handleConnectionCallback(code: string, state: string): Promise<CGMConnectionResult>;
  abstract disconnect(patientId: string): Promise<boolean>;

  /**
   * Time in Range 계산 (공통 유틸)
   */
  protected calculateTimeInRange(readings: CGMReading[]): {
    veryLow: number;
    low: number;
    inRange: number;
    high: number;
    veryHigh: number;
  } {
    if (readings.length === 0) {
      return { veryLow: 0, low: 0, inRange: 0, high: 0, veryHigh: 0 };
    }

    let veryLow = 0, low = 0, inRange = 0, high = 0, veryHigh = 0;

    for (const reading of readings) {
      if (reading.glucoseValue < 54) veryLow++;
      else if (reading.glucoseValue < 70) low++;
      else if (reading.glucoseValue <= 180) inRange++;
      else if (reading.glucoseValue <= 250) high++;
      else veryHigh++;
    }

    const total = readings.length;
    return {
      veryLow: Math.round((veryLow / total) * 100),
      low: Math.round((low / total) * 100),
      inRange: Math.round((inRange / total) * 100),
      high: Math.round((high / total) * 100),
      veryHigh: Math.round((veryHigh / total) * 100),
    };
  }

  /**
   * 평균 혈당 계산 (공통 유틸)
   */
  protected calculateAverageGlucose(readings: CGMReading[]): number {
    if (readings.length === 0) return 0;
    const sum = readings.reduce((acc, r) => acc + r.glucoseValue, 0);
    return Math.round(sum / readings.length);
  }

  /**
   * 추정 A1C 계산 (공통 유틸)
   * eA1C = (46.7 + averageGlucose) / 28.7
   */
  protected calculateEstimatedA1C(averageGlucose: number): number {
    return Math.round(((46.7 + averageGlucose) / 28.7) * 10) / 10;
  }

  /**
   * 변동계수(CV) 계산 (공통 유틸)
   */
  protected calculateCV(readings: CGMReading[]): number {
    if (readings.length < 2) return 0;

    const avg = this.calculateAverageGlucose(readings);
    const squaredDiffs = readings.map((r) => Math.pow(r.glucoseValue - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / readings.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    return Math.round((stdDev / avg) * 100);
  }
}

// ===== Mock Adapter (개발/테스트용) =====

/**
 * Mock CGM Adapter
 *
 * Mock 데이터를 반환하는 테스트용 어댑터
 */
export class MockCGMAdapter extends BaseCGMAdapter {
  readonly vendor: CGMVendor = 'other';
  readonly vendorDisplayName = 'Mock CGM (테스트)';

  async checkConnection(patientId: string): Promise<boolean> {
    // Mock: 항상 연결됨
    return true;
  }

  async syncData(patientId: string, fromDate?: string, toDate?: string): Promise<CGMDataResult> {
    const summary = await this.getSummary(patientId);
    const lastReading = await this.getLatestReading(patientId);

    return {
      success: true,
      vendor: this.vendor,
      summary: summary || undefined,
      lastReading: lastReading || undefined,
    };
  }

  async getSummary(patientId: string, days: number = 7): Promise<CGMSummaryDetail | null> {
    // Mock 데이터 반환
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return {
      period: {
        from: from.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
        days,
      },
      metrics: {
        averageGlucose: 150,
        estimatedA1C: 6.9,
        glucoseManagementIndicator: 6.8,
        standardDeviation: 40,
        coefficientOfVariation: 27,
      },
      timeInRange: {
        veryLow: 1,
        low: 3,
        inRange: 65,
        high: 25,
        veryHigh: 6,
      },
      trend: {
        current: 'stable',
        comparedToPrevious: 'stable',
      },
    };
  }

  async getLatestReading(patientId: string): Promise<CGMReading | null> {
    return {
      timestamp: new Date().toISOString(),
      glucoseValue: 142,
      trend: 'stable',
    };
  }

  async initiateConnection(patientId: string, redirectUri: string): Promise<string> {
    // Mock: 바로 콜백 URL 반환
    return `${redirectUri}?code=mock_code&state=${patientId}`;
  }

  async handleConnectionCallback(code: string, state: string): Promise<CGMConnectionResult> {
    return {
      success: true,
      vendor: this.vendor,
      patientExternalId: state,
      consentId: `consent_${Date.now()}`,
    };
  }

  async disconnect(patientId: string): Promise<boolean> {
    return true;
  }
}

// ===== Adapter Registry =====

/**
 * CGM Adapter Registry
 *
 * 등록된 어댑터 관리
 */
export class CGMAdapterRegistry {
  private adapters: Map<CGMVendor, ICGMAdapter> = new Map();

  /**
   * 어댑터 등록
   */
  register(adapter: ICGMAdapter): void {
    this.adapters.set(adapter.vendor, adapter);
  }

  /**
   * 어댑터 조회
   */
  get(vendor: CGMVendor): ICGMAdapter | undefined {
    return this.adapters.get(vendor);
  }

  /**
   * 등록된 모든 어댑터 조회
   */
  getAll(): ICGMAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * 지원되는 업체 목록
   */
  getSupportedVendors(): Array<{ vendor: CGMVendor; displayName: string }> {
    return this.getAll().map((a) => ({
      vendor: a.vendor,
      displayName: a.vendorDisplayName,
    }));
  }
}

// 기본 레지스트리 (Mock 어댑터 포함)
export const cgmAdapterRegistry = new CGMAdapterRegistry();
cgmAdapterRegistry.register(new MockCGMAdapter());

export default cgmAdapterRegistry;
