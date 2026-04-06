import type { PromptDefinition } from './types';

/**
 * GlucoseView AI 프롬프트 정의
 *
 * 약국 CGM 분석 서비스용 AI 프롬프트
 */
export const glucoseviewPrompts: PromptDefinition[] = [
  {
    id: 'dashboard.today',
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
- 등록된 당뇨인 수: {{patientCount}}명

간략하게 3-4문장으로 요약해주세요.`,
  },

  {
    id: 'dashboard.weekly',
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

사용자: {{userName}}
날짜: {{currentDate}}

주요 트렌드와 개선 포인트를 알려주세요.`,
  },

  {
    id: 'recommendation.lifestyle',
    name: '생활습관 제안',
    description: '혈당 관리를 위한 생활습관 팁을 제안합니다',
    buttonLabel: '생활습관 팁',
    suggestedQuestion: '혈당 관리에 도움되는 습관이 있을까요?',
    icon: '💡',
    order: 3,
    isDefault: true,
    systemPrompt: `당신은 GlucoseView의 건강 상담 어시스턴트입니다.
혈당 관리에 도움되는 실천 가능한 생활습관 팁을 제공합니다.
의학적 치료 조언은 제공하지 않습니다.
구체적이고 실천 가능한 팁을 제안하세요.`,
    userPromptTemplate: `혈당 관리에 도움되는 생활습관 팁을 알려주세요.

실천하기 쉬운 3-5가지 구체적인 팁을 알려주세요.`,
  },

  {
    id: 'analysis.general',
    name: '데이터 분석',
    description: '혈당 데이터를 분석합니다',
    buttonLabel: '데이터 분석',
    suggestedQuestion: '혈당 데이터를 분석해주세요',
    icon: '🔍',
    order: 4,
    isDefault: false,
    systemPrompt: `당신은 GlucoseView의 CGM 데이터 분석 전문가입니다.
당뇨인의 혈당 데이터를 분석하여 패턴과 인사이트를 제공합니다.

분석 시 다음을 포함하세요:
1. 혈당 범위 분석
2. 시간대별 패턴
3. 개선 제안

의학적 조언이 아닌 데이터 분석임을 명시하세요.`,
    userPromptTemplate: `혈당 데이터 분석을 도와주세요.

분석 관점과 주요 확인 포인트를 알려주세요.`,
  },
];

// 프롬프트 조회 함수들
export function getDefaultPrompts(): PromptDefinition[] {
  return glucoseviewPrompts.filter((p) => p.isDefault).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export function getPromptById(id: string): PromptDefinition | undefined {
  return glucoseviewPrompts.find((p) => p.id === id);
}

export function buildUserPrompt(prompt: PromptDefinition, context: Record<string, unknown>): string {
  let userPrompt = prompt.userPromptTemplate;

  Object.entries(context).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    userPrompt = userPrompt.replace(regex, String(value ?? ''));
  });

  return userPrompt;
}
