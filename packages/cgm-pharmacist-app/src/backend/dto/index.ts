/**
 * CGM Pharmacist App - Data Transfer Objects (View Models)
 *
 * UI/UX 구현을 위한 View Model 수준 타입 정의
 * 실제 DB 스키마가 아닌, 화면 표현을 위한 모델
 */

// ===== 기본 타입 =====

export type RiskLevel = 'high' | 'medium' | 'low' | 'normal';
export type GlucoseTrend = 'rising' | 'falling' | 'stable' | 'fluctuating';
export type ConsentStatusType = 'active' | 'pending' | 'expired' | 'revoked';
export type CGMVendor = 'dexcom' | 'abbott' | 'medtronic' | 'other';

// ===== 환자 요약 =====

/**
 * 환자 기본 정보 (개인정보 최소화)
 */
export interface PatientBasicInfo {
  id: string;
  displayName: string; // 익명화된 표시명 (예: "환자 A", "김OO")
  age?: number;
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'prediabetes';
  registeredAt: string;
}

/**
 * CGM 연동 상태
 */
export interface CGMConnectionStatus {
  vendor: CGMVendor;
  vendorDisplayName: string;
  isConnected: boolean;
  lastSyncAt?: string;
  dataAvailableFrom?: string;
  dataAvailableTo?: string;
}

/**
 * 동의 상태
 */
export interface ConsentStatus {
  status: ConsentStatusType;
  consentedAt?: string;
  expiresAt?: string;
  scope: string[]; // ['cgm_data', 'coaching_notes', etc.]
}

/**
 * 환자 요약 정보 (리스트 화면용)
 */
export interface PatientSummary {
  patient: PatientBasicInfo;
  cgmConnection: CGMConnectionStatus;
  consent: ConsentStatus;
  riskLevel: RiskLevel;
  riskFlags: RiskFlag[];
  lastCoachingAt?: string;
  nextCoachingAt?: string;
  // 최근 CGM 요약 (간략)
  recentSummary: CGMSummaryBrief;
}

// ===== CGM 데이터 요약 =====

/**
 * CGM 요약 (간략 - 리스트용)
 */
export interface CGMSummaryBrief {
  averageGlucose: number; // mg/dL
  timeInRange: number; // 퍼센트 (0-100)
  trend: GlucoseTrend;
  lastReading?: {
    value: number;
    timestamp: string;
  };
}

/**
 * CGM 요약 (상세 - 환자 상세 화면용)
 */
export interface CGMSummaryDetail {
  // 기간 정보
  period: {
    from: string;
    to: string;
    days: number;
  };

  // 핵심 지표
  metrics: {
    averageGlucose: number;
    estimatedA1C: number;
    glucoseManagementIndicator: number; // GMI
    standardDeviation: number;
    coefficientOfVariation: number; // CV
  };

  // Time in Range
  timeInRange: {
    veryLow: number; // <54 mg/dL
    low: number; // 54-69 mg/dL
    inRange: number; // 70-180 mg/dL
    high: number; // 181-250 mg/dL
    veryHigh: number; // >250 mg/dL
  };

  // 트렌드
  trend: {
    current: GlucoseTrend;
    comparedToPrevious: 'improved' | 'worsened' | 'stable';
    changePercent?: number;
  };
}

/**
 * 이전 기간 대비 변화
 */
export interface CGMComparison {
  currentPeriod: CGMSummaryDetail;
  previousPeriod: CGMSummaryDetail;
  changes: {
    averageGlucoseChange: number;
    timeInRangeChange: number;
    trendDescription: string;
  };
}

// ===== 위험/인사이트 =====

/**
 * 위험 플래그
 */
export interface RiskFlag {
  id: string;
  type: 'hypoglycemia' | 'hyperglycemia' | 'high_variability' | 'low_tir' | 'data_gap' | 'coaching_overdue';
  severity: RiskLevel;
  title: string;
  description: string;
  detectedAt: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

/**
 * CGM 인사이트 (약사 언어로 변환된 해석)
 */
export interface CGMInsight {
  id: string;
  category: 'pattern' | 'risk' | 'improvement' | 'lifestyle' | 'general';
  title: string;
  description: string;
  actionSuggestion?: string;
  priority: 'high' | 'medium' | 'low';
  generatedAt: string;
  // 관련 데이터 참조 (UI에서 하이라이트용)
  relatedTimeRange?: {
    from: string;
    to: string;
  };
}

// ===== 상담/코칭 =====

/**
 * 코칭 세션
 */
export interface CoachingSession {
  id: string;
  patientId: string;
  pharmacistId: string;
  pharmacistName: string;
  sessionDate: string;
  duration?: number; // 분
  type: 'initial' | 'followup' | 'urgent' | 'routine';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: CoachingNote[];
  patientMessage?: PatientMessage;
  lifestyleSuggestions: LifestyleSuggestion[];
  nextSessionDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 약사 메모
 */
export interface CoachingNote {
  id: string;
  sessionId: string;
  content: string;
  category: 'observation' | 'concern' | 'progress' | 'action_taken' | 'follow_up';
  isPrivate: boolean; // true면 약사만 볼 수 있음
  createdAt: string;
  updatedAt: string;
}

/**
 * 환자 전달 메시지
 */
export interface PatientMessage {
  id: string;
  sessionId: string;
  content: string;
  deliveryMethod: 'in_person' | 'sms' | 'app_notification' | 'email';
  deliveredAt?: string;
  isDelivered: boolean;
}

/**
 * 생활 루틴 제안
 */
export interface LifestyleSuggestion {
  id: string;
  category: 'diet' | 'exercise' | 'medication' | 'monitoring' | 'sleep' | 'stress';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  isAccepted?: boolean;
  acceptedAt?: string;
}

// ===== API 요청/응답 =====

/**
 * 환자 목록 요청
 */
export interface GetPatientsRequest {
  page?: number;
  limit?: number;
  riskLevel?: RiskLevel;
  sortBy?: 'riskLevel' | 'lastCoaching' | 'name';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * 환자 목록 응답
 */
export interface GetPatientsResponse {
  patients: PatientSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 환자 상세 응답
 */
export interface GetPatientDetailResponse {
  patient: PatientBasicInfo;
  cgmConnection: CGMConnectionStatus;
  consent: ConsentStatus;
  cgmSummary: CGMSummaryDetail;
  comparison?: CGMComparison;
  riskFlags: RiskFlag[];
  insights: CGMInsight[];
  recentCoachingSessions: CoachingSession[];
}

/**
 * 코칭 세션 생성 요청
 */
export interface CreateCoachingSessionRequest {
  patientId: string;
  sessionDate: string;
  type: CoachingSession['type'];
  notes?: Array<{
    content: string;
    category: CoachingNote['category'];
    isPrivate: boolean;
  }>;
  patientMessage?: {
    content: string;
    deliveryMethod: PatientMessage['deliveryMethod'];
  };
  lifestyleSuggestions?: Array<Omit<LifestyleSuggestion, 'id' | 'isAccepted' | 'acceptedAt'>>;
  nextSessionDate?: string;
}

/**
 * 알림 목록 응답
 */
export interface GetAlertsResponse {
  alerts: RiskFlag[];
  total: number;
  unacknowledgedCount: number;
}
