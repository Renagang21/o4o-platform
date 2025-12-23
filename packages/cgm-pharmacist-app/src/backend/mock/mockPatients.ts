/**
 * Mock 환자 데이터
 *
 * 실제 사용 시나리오 기반
 * 약사 자원봉사자가 사용해도 어색하지 않은 데이터 구성
 */

import type {
  PatientSummary,
  PatientBasicInfo,
  CGMConnectionStatus,
  ConsentStatus,
  CGMSummaryBrief,
  CGMSummaryDetail,
  CGMComparison,
  RiskFlag,
  CGMInsight,
  CoachingSession,
  CoachingNote,
  LifestyleSuggestion,
  GetPatientDetailResponse,
} from '../dto/index.js';

// ===== 환자 기본 정보 =====

const patients: PatientBasicInfo[] = [
  {
    id: 'patient-001',
    displayName: '김OO',
    age: 58,
    diabetesType: 'type2',
    registeredAt: '2024-10-15T09:00:00Z',
  },
  {
    id: 'patient-002',
    displayName: '이OO',
    age: 45,
    diabetesType: 'type2',
    registeredAt: '2024-11-01T14:30:00Z',
  },
  {
    id: 'patient-003',
    displayName: '박OO',
    age: 62,
    diabetesType: 'type2',
    registeredAt: '2024-09-20T10:00:00Z',
  },
  {
    id: 'patient-004',
    displayName: '최OO',
    age: 35,
    diabetesType: 'type1',
    registeredAt: '2024-08-05T11:00:00Z',
  },
  {
    id: 'patient-005',
    displayName: '정OO',
    age: 52,
    diabetesType: 'prediabetes',
    registeredAt: '2024-11-10T16:00:00Z',
  },
  {
    id: 'patient-006',
    displayName: '강OO',
    age: 67,
    diabetesType: 'type2',
    registeredAt: '2024-07-01T09:30:00Z',
  },
  {
    id: 'patient-007',
    displayName: '조OO',
    age: 48,
    diabetesType: 'type2',
    registeredAt: '2024-10-01T13:00:00Z',
  },
  {
    id: 'patient-008',
    displayName: '윤OO',
    age: 55,
    diabetesType: 'type2',
    registeredAt: '2024-09-15T10:30:00Z',
  },
];

// ===== CGM 연동 상태 =====

const cgmConnections: Record<string, CGMConnectionStatus> = {
  'patient-001': {
    vendor: 'abbott',
    vendorDisplayName: '애보트 프리스타일 리브레',
    isConnected: true,
    lastSyncAt: '2024-12-23T07:30:00Z',
    dataAvailableFrom: '2024-10-15T00:00:00Z',
    dataAvailableTo: '2024-12-23T07:30:00Z',
  },
  'patient-002': {
    vendor: 'dexcom',
    vendorDisplayName: '덱스콤 G7',
    isConnected: true,
    lastSyncAt: '2024-12-23T06:00:00Z',
    dataAvailableFrom: '2024-11-01T00:00:00Z',
    dataAvailableTo: '2024-12-23T06:00:00Z',
  },
  'patient-003': {
    vendor: 'abbott',
    vendorDisplayName: '애보트 프리스타일 리브레',
    isConnected: true,
    lastSyncAt: '2024-12-22T22:00:00Z',
    dataAvailableFrom: '2024-09-20T00:00:00Z',
    dataAvailableTo: '2024-12-22T22:00:00Z',
  },
  'patient-004': {
    vendor: 'dexcom',
    vendorDisplayName: '덱스콤 G7',
    isConnected: true,
    lastSyncAt: '2024-12-23T08:00:00Z',
    dataAvailableFrom: '2024-08-05T00:00:00Z',
    dataAvailableTo: '2024-12-23T08:00:00Z',
  },
  'patient-005': {
    vendor: 'abbott',
    vendorDisplayName: '애보트 프리스타일 리브레',
    isConnected: false, // 연결 끊김
    lastSyncAt: '2024-12-20T18:00:00Z',
    dataAvailableFrom: '2024-11-10T00:00:00Z',
    dataAvailableTo: '2024-12-20T18:00:00Z',
  },
  'patient-006': {
    vendor: 'abbott',
    vendorDisplayName: '애보트 프리스타일 리브레',
    isConnected: true,
    lastSyncAt: '2024-12-23T05:30:00Z',
    dataAvailableFrom: '2024-07-01T00:00:00Z',
    dataAvailableTo: '2024-12-23T05:30:00Z',
  },
  'patient-007': {
    vendor: 'dexcom',
    vendorDisplayName: '덱스콤 G7',
    isConnected: true,
    lastSyncAt: '2024-12-23T07:00:00Z',
    dataAvailableFrom: '2024-10-01T00:00:00Z',
    dataAvailableTo: '2024-12-23T07:00:00Z',
  },
  'patient-008': {
    vendor: 'medtronic',
    vendorDisplayName: '메드트로닉 가디언',
    isConnected: true,
    lastSyncAt: '2024-12-23T04:00:00Z',
    dataAvailableFrom: '2024-09-15T00:00:00Z',
    dataAvailableTo: '2024-12-23T04:00:00Z',
  },
};

// ===== 동의 상태 =====

const consents: Record<string, ConsentStatus> = {
  'patient-001': {
    status: 'active',
    consentedAt: '2024-10-15T09:00:00Z',
    expiresAt: '2025-10-15T09:00:00Z',
    scope: ['cgm_data', 'coaching_notes', 'lifestyle_suggestions'],
  },
  'patient-002': {
    status: 'active',
    consentedAt: '2024-11-01T14:30:00Z',
    expiresAt: '2025-11-01T14:30:00Z',
    scope: ['cgm_data', 'coaching_notes'],
  },
  'patient-003': {
    status: 'active',
    consentedAt: '2024-09-20T10:00:00Z',
    expiresAt: '2025-09-20T10:00:00Z',
    scope: ['cgm_data', 'coaching_notes', 'lifestyle_suggestions'],
  },
  'patient-004': {
    status: 'active',
    consentedAt: '2024-08-05T11:00:00Z',
    expiresAt: '2025-08-05T11:00:00Z',
    scope: ['cgm_data', 'coaching_notes', 'lifestyle_suggestions'],
  },
  'patient-005': {
    status: 'pending', // 동의 대기 중
    scope: [],
  },
  'patient-006': {
    status: 'active',
    consentedAt: '2024-07-01T09:30:00Z',
    expiresAt: '2025-07-01T09:30:00Z',
    scope: ['cgm_data', 'coaching_notes'],
  },
  'patient-007': {
    status: 'active',
    consentedAt: '2024-10-01T13:00:00Z',
    expiresAt: '2025-10-01T13:00:00Z',
    scope: ['cgm_data', 'coaching_notes', 'lifestyle_suggestions'],
  },
  'patient-008': {
    status: 'active',
    consentedAt: '2024-09-15T10:30:00Z',
    expiresAt: '2025-09-15T10:30:00Z',
    scope: ['cgm_data'],
  },
};

// ===== CGM 요약 (간략) =====

const cgmSummaries: Record<string, CGMSummaryBrief> = {
  'patient-001': {
    averageGlucose: 156,
    timeInRange: 58,
    trend: 'stable',
    lastReading: { value: 142, timestamp: '2024-12-23T07:30:00Z' },
  },
  'patient-002': {
    averageGlucose: 189,
    timeInRange: 42,
    trend: 'rising',
    lastReading: { value: 205, timestamp: '2024-12-23T06:00:00Z' },
  },
  'patient-003': {
    averageGlucose: 145,
    timeInRange: 68,
    trend: 'stable',
    lastReading: { value: 138, timestamp: '2024-12-22T22:00:00Z' },
  },
  'patient-004': {
    averageGlucose: 132,
    timeInRange: 75,
    trend: 'fluctuating',
    lastReading: { value: 88, timestamp: '2024-12-23T08:00:00Z' },
  },
  'patient-005': {
    averageGlucose: 118,
    timeInRange: 82,
    trend: 'stable',
    lastReading: { value: 112, timestamp: '2024-12-20T18:00:00Z' },
  },
  'patient-006': {
    averageGlucose: 178,
    timeInRange: 45,
    trend: 'falling',
    lastReading: { value: 162, timestamp: '2024-12-23T05:30:00Z' },
  },
  'patient-007': {
    averageGlucose: 165,
    timeInRange: 52,
    trend: 'stable',
    lastReading: { value: 158, timestamp: '2024-12-23T07:00:00Z' },
  },
  'patient-008': {
    averageGlucose: 142,
    timeInRange: 71,
    trend: 'stable',
    lastReading: { value: 135, timestamp: '2024-12-23T04:00:00Z' },
  },
};

// ===== 위험 플래그 =====

const riskFlags: Record<string, RiskFlag[]> = {
  'patient-001': [],
  'patient-002': [
    {
      id: 'risk-002-1',
      type: 'hyperglycemia',
      severity: 'high',
      title: '지속적 고혈당',
      description: '최근 3일간 평균 혈당 200mg/dL 이상 유지',
      detectedAt: '2024-12-22T12:00:00Z',
      isAcknowledged: false,
    },
    {
      id: 'risk-002-2',
      type: 'low_tir',
      severity: 'medium',
      title: '낮은 목표범위 시간',
      description: '목표 범위 내 시간이 50% 미만입니다',
      detectedAt: '2024-12-21T09:00:00Z',
      isAcknowledged: true,
      acknowledgedAt: '2024-12-21T14:00:00Z',
      acknowledgedBy: 'pharmacist-001',
    },
  ],
  'patient-003': [
    {
      id: 'risk-003-1',
      type: 'coaching_overdue',
      severity: 'low',
      title: '상담 예정일 초과',
      description: '마지막 상담 후 2주가 지났습니다',
      detectedAt: '2024-12-20T00:00:00Z',
      isAcknowledged: false,
    },
  ],
  'patient-004': [
    {
      id: 'risk-004-1',
      type: 'hypoglycemia',
      severity: 'high',
      title: '저혈당 주의',
      description: '최근 24시간 내 70mg/dL 미만 3회 발생',
      detectedAt: '2024-12-23T06:00:00Z',
      isAcknowledged: false,
    },
    {
      id: 'risk-004-2',
      type: 'high_variability',
      severity: 'medium',
      title: '높은 혈당 변동성',
      description: '변동계수(CV)가 40%를 초과합니다',
      detectedAt: '2024-12-22T00:00:00Z',
      isAcknowledged: false,
    },
  ],
  'patient-005': [
    {
      id: 'risk-005-1',
      type: 'data_gap',
      severity: 'medium',
      title: '데이터 연결 끊김',
      description: 'CGM 데이터가 3일간 수신되지 않았습니다',
      detectedAt: '2024-12-23T00:00:00Z',
      isAcknowledged: false,
    },
  ],
  'patient-006': [
    {
      id: 'risk-006-1',
      type: 'hyperglycemia',
      severity: 'medium',
      title: '식후 고혈당 패턴',
      description: '점심 식후 2시간 혈당이 자주 200mg/dL 초과',
      detectedAt: '2024-12-22T14:00:00Z',
      isAcknowledged: true,
      acknowledgedAt: '2024-12-22T16:00:00Z',
      acknowledgedBy: 'pharmacist-001',
    },
  ],
  'patient-007': [
    {
      id: 'risk-007-1',
      type: 'low_tir',
      severity: 'medium',
      title: '목표 범위 내 시간 감소',
      description: '지난주 대비 목표 범위 내 시간이 15% 감소',
      detectedAt: '2024-12-22T09:00:00Z',
      isAcknowledged: false,
    },
  ],
  'patient-008': [],
};

// ===== 환자 요약 생성 =====

export function getMockPatientSummaries(): PatientSummary[] {
  return patients.map((patient) => {
    const flags = riskFlags[patient.id] || [];
    const highRiskCount = flags.filter((f) => f.severity === 'high' && !f.isAcknowledged).length;
    const mediumRiskCount = flags.filter((f) => f.severity === 'medium' && !f.isAcknowledged).length;

    let riskLevel: PatientSummary['riskLevel'] = 'normal';
    if (highRiskCount > 0) riskLevel = 'high';
    else if (mediumRiskCount > 0) riskLevel = 'medium';
    else if (flags.length > 0) riskLevel = 'low';

    return {
      patient,
      cgmConnection: cgmConnections[patient.id],
      consent: consents[patient.id],
      riskLevel,
      riskFlags: flags,
      lastCoachingAt: getLastCoachingDate(patient.id),
      nextCoachingAt: getNextCoachingDate(patient.id),
      recentSummary: cgmSummaries[patient.id],
    };
  });
}

function getLastCoachingDate(patientId: string): string | undefined {
  const dates: Record<string, string> = {
    'patient-001': '2024-12-16T10:00:00Z',
    'patient-002': '2024-12-20T14:00:00Z',
    'patient-003': '2024-12-06T11:00:00Z',
    'patient-004': '2024-12-18T09:30:00Z',
    'patient-006': '2024-12-19T15:00:00Z',
    'patient-007': '2024-12-15T13:00:00Z',
    'patient-008': '2024-12-17T10:30:00Z',
  };
  return dates[patientId];
}

function getNextCoachingDate(patientId: string): string | undefined {
  const dates: Record<string, string> = {
    'patient-001': '2024-12-23T10:00:00Z',
    'patient-002': '2024-12-27T14:00:00Z',
    'patient-004': '2024-12-25T09:30:00Z',
    'patient-006': '2024-12-26T15:00:00Z',
    'patient-007': '2024-12-24T13:00:00Z',
  };
  return dates[patientId];
}

// ===== CGM 상세 요약 =====

export function getMockCGMSummaryDetail(patientId: string): CGMSummaryDetail {
  const summaryMap: Record<string, CGMSummaryDetail> = {
    'patient-001': {
      period: { from: '2024-12-16', to: '2024-12-23', days: 7 },
      metrics: {
        averageGlucose: 156,
        estimatedA1C: 7.1,
        glucoseManagementIndicator: 7.0,
        standardDeviation: 38,
        coefficientOfVariation: 24,
      },
      timeInRange: {
        veryLow: 0,
        low: 2,
        inRange: 58,
        high: 32,
        veryHigh: 8,
      },
      trend: {
        current: 'stable',
        comparedToPrevious: 'improved',
        changePercent: 5,
      },
    },
    'patient-002': {
      period: { from: '2024-12-16', to: '2024-12-23', days: 7 },
      metrics: {
        averageGlucose: 189,
        estimatedA1C: 8.2,
        glucoseManagementIndicator: 8.0,
        standardDeviation: 52,
        coefficientOfVariation: 28,
      },
      timeInRange: {
        veryLow: 0,
        low: 1,
        inRange: 42,
        high: 38,
        veryHigh: 19,
      },
      trend: {
        current: 'rising',
        comparedToPrevious: 'worsened',
        changePercent: -12,
      },
    },
    'patient-004': {
      period: { from: '2024-12-16', to: '2024-12-23', days: 7 },
      metrics: {
        averageGlucose: 132,
        estimatedA1C: 6.3,
        glucoseManagementIndicator: 6.2,
        standardDeviation: 58,
        coefficientOfVariation: 44,
      },
      timeInRange: {
        veryLow: 3,
        low: 8,
        inRange: 75,
        high: 12,
        veryHigh: 2,
      },
      trend: {
        current: 'fluctuating',
        comparedToPrevious: 'stable',
      },
    },
  };

  return summaryMap[patientId] || {
    period: { from: '2024-12-16', to: '2024-12-23', days: 7 },
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

// ===== CGM 인사이트 =====

export function getMockInsights(patientId: string): CGMInsight[] {
  const insightsMap: Record<string, CGMInsight[]> = {
    'patient-001': [
      {
        id: 'insight-001-1',
        category: 'improvement',
        title: '목표 범위 내 시간 개선',
        description: '지난주 대비 목표 범위 내 시간이 5% 증가했습니다. 현재 관리 방식을 유지하세요.',
        priority: 'medium',
        generatedAt: '2024-12-23T00:00:00Z',
      },
      {
        id: 'insight-001-2',
        category: 'pattern',
        title: '저녁 식후 혈당 패턴',
        description: '저녁 식사 후 혈당이 일정하게 유지됩니다. 저녁 식단 관리가 잘 되고 있습니다.',
        priority: 'low',
        generatedAt: '2024-12-22T00:00:00Z',
      },
    ],
    'patient-002': [
      {
        id: 'insight-002-1',
        category: 'risk',
        title: '고혈당 주의 필요',
        description: '최근 평균 혈당이 높아지고 있습니다. 식이 요법과 활동량 점검이 필요합니다.',
        actionSuggestion: '탄수화물 섭취량 점검 및 식후 가벼운 산책 권장',
        priority: 'high',
        generatedAt: '2024-12-23T00:00:00Z',
      },
      {
        id: 'insight-002-2',
        category: 'pattern',
        title: '아침 공복 혈당 상승',
        description: '새벽 현상(dawn phenomenon)으로 보이는 아침 공복 혈당 상승이 관찰됩니다.',
        priority: 'medium',
        generatedAt: '2024-12-22T00:00:00Z',
        relatedTimeRange: { from: '05:00', to: '08:00' },
      },
    ],
    'patient-004': [
      {
        id: 'insight-004-1',
        category: 'risk',
        title: '저혈당 패턴 감지',
        description: '운동 후 저혈당이 자주 발생합니다. 운동 전 간식 섭취를 고려하세요.',
        actionSuggestion: '운동 30분 전 15-20g 탄수화물 간식 섭취 권장',
        priority: 'high',
        generatedAt: '2024-12-23T00:00:00Z',
      },
      {
        id: 'insight-004-2',
        category: 'lifestyle',
        title: '혈당 변동성 관리',
        description: '하루 중 혈당 변동이 큽니다. 규칙적인 식사 시간이 도움될 수 있습니다.',
        priority: 'medium',
        generatedAt: '2024-12-22T00:00:00Z',
      },
    ],
  };

  return insightsMap[patientId] || [];
}

// ===== 코칭 세션 =====

export function getMockCoachingSessions(patientId: string): CoachingSession[] {
  const sessionsMap: Record<string, CoachingSession[]> = {
    'patient-001': [
      {
        id: 'session-001-1',
        patientId: 'patient-001',
        pharmacistId: 'pharmacist-001',
        pharmacistName: '홍약사',
        sessionDate: '2024-12-16T10:00:00Z',
        duration: 20,
        type: 'routine',
        status: 'completed',
        notes: [
          {
            id: 'note-001-1-1',
            sessionId: 'session-001-1',
            content: '전반적인 혈당 관리 양호. 저녁 식사 후 혈당 안정적.',
            category: 'observation',
            isPrivate: false,
            createdAt: '2024-12-16T10:20:00Z',
            updatedAt: '2024-12-16T10:20:00Z',
          },
          {
            id: 'note-001-1-2',
            sessionId: 'session-001-1',
            content: '운동 습관 확인 필요 - 다음 상담 시 체크',
            category: 'follow_up',
            isPrivate: true,
            createdAt: '2024-12-16T10:22:00Z',
            updatedAt: '2024-12-16T10:22:00Z',
          },
        ],
        lifestyleSuggestions: [
          {
            id: 'suggestion-001-1',
            category: 'exercise',
            title: '식후 가벼운 산책',
            description: '저녁 식사 후 15-20분 가벼운 산책을 권장합니다.',
            priority: 'medium',
            isAccepted: true,
            acceptedAt: '2024-12-16T10:25:00Z',
          },
        ],
        nextSessionDate: '2024-12-23T10:00:00Z',
        createdAt: '2024-12-16T10:00:00Z',
        updatedAt: '2024-12-16T10:25:00Z',
      },
    ],
    'patient-002': [
      {
        id: 'session-002-1',
        patientId: 'patient-002',
        pharmacistId: 'pharmacist-001',
        pharmacistName: '홍약사',
        sessionDate: '2024-12-20T14:00:00Z',
        duration: 30,
        type: 'followup',
        status: 'completed',
        notes: [
          {
            id: 'note-002-1-1',
            sessionId: 'session-002-1',
            content: '혈당 상승 추세 확인. 식이 일지 작성 요청.',
            category: 'concern',
            isPrivate: false,
            createdAt: '2024-12-20T14:30:00Z',
            updatedAt: '2024-12-20T14:30:00Z',
          },
          {
            id: 'note-002-1-2',
            sessionId: 'session-002-1',
            content: '최근 업무 스트레스 언급 - 스트레스 관리 방안 논의 필요',
            category: 'observation',
            isPrivate: true,
            createdAt: '2024-12-20T14:32:00Z',
            updatedAt: '2024-12-20T14:32:00Z',
          },
        ],
        patientMessage: {
          id: 'msg-002-1',
          sessionId: 'session-002-1',
          content: '식사 일지를 작성하시면 다음 상담에서 함께 검토하겠습니다. 힘내세요!',
          deliveryMethod: 'app_notification',
          deliveredAt: '2024-12-20T15:00:00Z',
          isDelivered: true,
        },
        lifestyleSuggestions: [
          {
            id: 'suggestion-002-1',
            category: 'diet',
            title: '식사 일지 작성',
            description: '3일간 식사 내용과 시간을 기록해 주세요.',
            priority: 'high',
            isAccepted: true,
            acceptedAt: '2024-12-20T14:35:00Z',
          },
          {
            id: 'suggestion-002-2',
            category: 'stress',
            title: '스트레스 관리',
            description: '취침 전 10분 심호흡 또는 명상을 시도해 보세요.',
            priority: 'medium',
          },
        ],
        nextSessionDate: '2024-12-27T14:00:00Z',
        createdAt: '2024-12-20T14:00:00Z',
        updatedAt: '2024-12-20T14:35:00Z',
      },
    ],
  };

  return sessionsMap[patientId] || [];
}

// ===== 환자 상세 정보 =====

export function getMockPatientDetail(patientId: string): GetPatientDetailResponse | null {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return null;

  return {
    patient,
    cgmConnection: cgmConnections[patientId],
    consent: consents[patientId],
    cgmSummary: getMockCGMSummaryDetail(patientId),
    riskFlags: riskFlags[patientId] || [],
    insights: getMockInsights(patientId),
    recentCoachingSessions: getMockCoachingSessions(patientId),
  };
}

// ===== 전체 알림 =====

export function getMockAllAlerts(): RiskFlag[] {
  return Object.values(riskFlags).flat().sort((a, b) => {
    // 심각도 순서: high > medium > low
    const severityOrder = { high: 0, medium: 1, low: 2, normal: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    // 같은 심각도면 최신순
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });
}
