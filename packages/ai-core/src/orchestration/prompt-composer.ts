/**
 * Prompt Composer
 *
 * Transforms an AIContext into a ComposedPrompt (system + user + schema).
 * Service-specific prompt templates ensure consistent, safe AI outputs.
 */

import type { AIContext, ComposedPrompt } from './types.js';

/** JSON schema description for AIInsight response parsing */
const INSIGHT_RESPONSE_SCHEMA = `{
  "summary": "string (1-3 sentences, Korean)",
  "riskLevel": "'low' | 'medium' | 'high' (optional)",
  "recommendedActions": ["string (actionable items, Korean)"],
  "suggestedTriggers": ["string (trigger IDs, optional)"],
  "confidenceScore": "number (0.0-1.0)",
  "details": "object (optional, service-specific)"
}`;

/**
 * Compose a prompt from a built context.
 */
export function composePrompt(context: AIContext): ComposedPrompt {
  const systemPrompt = buildSystemPrompt(context);
  const userPrompt = buildUserPrompt(context);

  return {
    systemPrompt,
    userPrompt,
    responseSchema: INSIGHT_RESPONSE_SCHEMA,
  };
}

function buildSystemPrompt(context: AIContext): string {
  const constraintBlock = context.constraints.length > 0
    ? `\n\n## 제약 조건\n${context.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
    : '';

  return `당신은 O4O 플랫폼의 ${context.service} 서비스 분석 전문가입니다.

## 역할
- 제공된 데이터를 분석하고 구조화된 인사이트를 JSON으로 반환합니다.
- 실행 결정은 하지 않으며, 판단·요약·추천만 담당합니다.
- 항상 한국어로 응답합니다.

## 출력 형식
반드시 아래 JSON 스키마에 맞춰 응답하세요:
${INSIGHT_RESPONSE_SCHEMA}

JSON 외의 텍스트는 포함하지 마세요.${constraintBlock}`;
}

function buildUserPrompt(context: AIContext): string {
  const dataBlock = JSON.stringify(context.dataPoints, null, 2);

  return `## 분석 요청
- 서비스: ${context.service}
- 분석 유형: ${context.insightType}
- 기준 시점: ${context.generatedAt}
${context.periodDays ? `- 분석 기간: 최근 ${context.periodDays}일` : ''}

## 데이터
${dataBlock}

위 데이터를 분석하고 JSON 형식으로 인사이트를 반환하세요.`;
}
