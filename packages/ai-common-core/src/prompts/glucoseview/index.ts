import type { PromptDefinition } from '../../types';

/**
 * GlucoseView 프롬프트 템플릿
 *
 * 약국 CGM 분석 서비스용 AI 프롬프트
 * - 대화형 질문으로 표시되지만, 내부적으로는 구조화된 프롬프트
 */

export const glucoseviewPrompts: PromptDefinition[] = [
  // ===== Dashboard 카테고리 =====
  {
    id: 'glucoseview.dashboard.today',
    serviceId: 'glucoseview',
    category: 'dashboard',
    name: '오늘의 요약',
    description: '오늘 예정된 상담과 주요 알림을 요약합니다',
    buttonLabel: '오늘의 요약',
    suggestedQuestion: '오늘 어떤 일정이 있나요?',
    icon: '📋',
    order: 1,
    isDefault: true,
    systemPrompt: `당신은 GlucoseView의 AI 어시스턴트입니다.
약국에서 CGM(연속혈당측정기) 데이터를 활용한 상담을 지원합니다.
친절하고 전문적인 어조로 응답하세요.
한국어로 응답합니다.`,
    userPromptTemplate: `오늘({{currentDate}}) 예정된 상담 일정과 주요 알림을 요약해주세요.

현재 컨텍스트:
- 사용자: {{userName}}
- 등록된 환자 수: {{patientCount}}명
- 오늘 예정 상담: {{todayAppointments}}건

간략하게 3-4문장으로 요약해주세요.`,
    requiredContext: ['patientCount', 'todayAppointments'],
  },

  {
    id: 'glucoseview.dashboard.weekly',
    serviceId: 'glucoseview',
    category: 'dashboard',
    name: '주간 리포트',
    description: '이번 주 상담 현황과 주요 지표를 분석합니다',
    buttonLabel: '주간 리포트',
    suggestedQuestion: '이번 주 상담은 어땠나요?',
    icon: '📊',
    order: 2,
    isDefault: true,
    systemPrompt: `당신은 GlucoseView의 AI 어시스턴트입니다.
약국의 CGM 상담 현황을 분석하고 인사이트를 제공합니다.
데이터 기반으로 객관적인 분석을 제공하되, 이해하기 쉽게 설명하세요.`,
    userPromptTemplate: `이번 주 상담 현황을 분석해주세요.

주간 데이터:
- 총 상담 건수: {{weeklyConsultations}}건
- 신규 환자: {{newPatients}}명
- 재방문 환자: {{returningPatients}}명
- 평균 상담 시간: {{avgConsultationTime}}분

주요 트렌드와 개선 포인트를 알려주세요.`,
    requiredContext: ['weeklyConsultations', 'newPatients', 'returningPatients', 'avgConsultationTime'],
  },

  // ===== Analysis 카테고리 =====
  {
    id: 'glucoseview.analysis.patient',
    serviceId: 'glucoseview',
    category: 'analysis',
    name: '환자 분석',
    description: '선택한 환자의 혈당 데이터를 분석합니다',
    buttonLabel: '환자 분석',
    suggestedQuestion: '이 환자의 혈당 패턴이 어떤가요?',
    icon: '🔍',
    order: 3,
    isDefault: false,
    systemPrompt: `당신은 GlucoseView의 CGM 데이터 분석 전문가입니다.
환자의 혈당 데이터를 분석하여 패턴과 인사이트를 제공합니다.

분석 시 다음을 포함하세요:
1. 혈당 범위 (목표 범위 내 시간 %)
2. 고혈당/저혈당 이벤트
3. 시간대별 패턴
4. 개선 제안

의학적 조언이 아닌 데이터 분석임을 명시하세요.`,
    userPromptTemplate: `다음 환자의 CGM 데이터를 분석해주세요.

환자 정보:
- 환자명: {{patientName}}
- 출생연도: {{birthYear}}
- 측정 기간: {{measurementPeriod}}

혈당 데이터 요약:
- 평균 혈당: {{avgGlucose}} mg/dL
- 목표 범위 내 시간: {{timeInRange}}%
- 고혈당 시간: {{timeAboveRange}}%
- 저혈당 시간: {{timeBelowRange}}%
- GMI (추정 당화혈색소): {{gmi}}%

패턴과 상담 포인트를 알려주세요.`,
    requiredContext: ['patientName', 'birthYear', 'measurementPeriod', 'avgGlucose', 'timeInRange', 'timeAboveRange', 'timeBelowRange', 'gmi'],
  },

  {
    id: 'glucoseview.analysis.compare',
    serviceId: 'glucoseview',
    category: 'analysis',
    name: '기간 비교',
    description: '두 기간의 혈당 데이터를 비교합니다',
    buttonLabel: '기간 비교',
    suggestedQuestion: '지난달과 비교해서 어떻게 변했나요?',
    icon: '📈',
    order: 4,
    isDefault: false,
    systemPrompt: `당신은 GlucoseView의 CGM 데이터 분석 전문가입니다.
두 기간의 데이터를 비교하여 변화와 트렌드를 분석합니다.
개선된 점과 주의할 점을 균형있게 설명하세요.`,
    userPromptTemplate: `두 기간의 CGM 데이터를 비교 분석해주세요.

환자: {{patientName}}

[이전 기간: {{previousPeriod}}]
- 평균 혈당: {{prevAvgGlucose}} mg/dL
- 목표 범위 내 시간: {{prevTimeInRange}}%

[현재 기간: {{currentPeriod}}]
- 평균 혈당: {{currAvgGlucose}} mg/dL
- 목표 범위 내 시간: {{currTimeInRange}}%

변화 분석과 상담 포인트를 알려주세요.`,
    requiredContext: ['patientName', 'previousPeriod', 'currentPeriod', 'prevAvgGlucose', 'currAvgGlucose', 'prevTimeInRange', 'currTimeInRange'],
  },

  // ===== Recommendation 카테고리 =====
  {
    id: 'glucoseview.recommendation.lifestyle',
    serviceId: 'glucoseview',
    category: 'recommendation',
    name: '생활습관 제안',
    description: '혈당 관리를 위한 생활습관 팁을 제안합니다',
    buttonLabel: '생활습관 팁',
    suggestedQuestion: '혈당 관리에 도움되는 습관이 있을까요?',
    icon: '💡',
    order: 5,
    isDefault: true,
    systemPrompt: `당신은 GlucoseView의 건강 상담 어시스턴트입니다.
혈당 관리에 도움되는 실천 가능한 생활습관 팁을 제공합니다.
의학적 치료 조언은 제공하지 않습니다.
구체적이고 실천 가능한 팁을 제안하세요.`,
    userPromptTemplate: `{{patientName}} 환자에게 적합한 생활습관 팁을 제안해주세요.

환자 특성:
- 연령대: {{ageGroup}}
- 주요 패턴: {{mainPattern}}
- 문제 시간대: {{problemTime}}

실천하기 쉬운 3-5가지 구체적인 팁을 알려주세요.`,
    requiredContext: ['patientName', 'ageGroup', 'mainPattern', 'problemTime'],
  },

  // ===== Consultation 카테고리 =====
  {
    id: 'glucoseview.consultation.talking-points',
    serviceId: 'glucoseview',
    category: 'consultation',
    name: '상담 포인트',
    description: '환자 상담 시 활용할 포인트를 정리합니다',
    buttonLabel: '상담 포인트 생성',
    suggestedQuestion: '이 환자와 어떤 이야기를 나누면 좋을까요?',
    icon: '💬',
    order: 6,
    isDefault: false,
    systemPrompt: `당신은 GlucoseView의 상담 준비 어시스턴트입니다.
약사가 환자와 상담할 때 활용할 수 있는 대화 포인트를 제공합니다.

다음을 포함하세요:
1. 긍정적인 부분 (칭찬할 점)
2. 개선이 필요한 부분
3. 다음 목표 제안
4. 환자에게 물어볼 질문

환자 친화적이고 동기부여가 되는 표현을 사용하세요.`,
    userPromptTemplate: `{{patientName}} 환자 상담 준비를 도와주세요.

환자 분석 요약:
{{analysisummary}}

최근 변화:
{{recentChanges}}

상담 시 활용할 포인트와 대화 예시를 알려주세요.`,
    requiredContext: ['patientName', 'analysisSummary', 'recentChanges'],
  },

  // ===== Report 카테고리 =====
  {
    id: 'glucoseview.report.summary',
    serviceId: 'glucoseview',
    category: 'report',
    name: '리포트 생성',
    description: '환자용 혈당 분석 리포트를 생성합니다',
    buttonLabel: '리포트 생성',
    suggestedQuestion: '환자에게 전달할 리포트를 만들어주세요',
    icon: '📄',
    order: 7,
    isDefault: false,
    systemPrompt: `당신은 GlucoseView의 리포트 생성 어시스턴트입니다.
환자에게 전달할 혈당 분석 리포트를 작성합니다.

리포트 형식:
1. 측정 기간 요약
2. 주요 지표 (평균 혈당, TIR 등)
3. 잘한 점
4. 개선 포인트
5. 다음 목표

환자가 이해하기 쉽고 동기부여가 되는 어조로 작성하세요.
전문 용어는 쉽게 설명을 추가하세요.`,
    userPromptTemplate: `{{patientName}} 환자의 혈당 분석 리포트를 작성해주세요.

측정 기간: {{measurementPeriod}}

주요 지표:
- 평균 혈당: {{avgGlucose}} mg/dL
- 목표 범위 내 시간 (TIR): {{timeInRange}}%
- 변동계수 (CV): {{cv}}%
- 추정 당화혈색소 (GMI): {{gmi}}%

특이사항:
{{notes}}

환자에게 전달할 형식으로 작성해주세요.`,
    requiredContext: ['patientName', 'measurementPeriod', 'avgGlucose', 'timeInRange', 'cv', 'gmi', 'notes'],
  },
];

export default glucoseviewPrompts;
