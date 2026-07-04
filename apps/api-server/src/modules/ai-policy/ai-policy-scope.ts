/**
 * AI Policy Scope — WO-O4O-AI-POLICY-SYSTEM-V1
 *
 * 각 LLM 호출 용도를 식별하는 scope 타입.
 * ai_llm_policies 테이블의 scope 컬럼과 1:1 매핑.
 */
export type AiPolicyScope =
  | 'CARE_CHAT'
  | 'CARE_INSIGHT'
  | 'CARE_COACHING'
  | 'CARE_PATIENT_INSIGHT'
  | 'STORE_INSIGHT'
  | 'PRODUCT_TAGGING'
  | 'STORE_PRODUCT_INSIGHT'
  | 'PRODUCT_CONTENT'
  | 'CONTENT_TRANSLATION'
  // WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-EXECUTE-V1: 건기식 후보 매장 설명 생성
  | 'HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION'
  | 'AI_PROXY';

/** Scope → Service 매핑 (quota 계층 해결용) */
export const SERVICE_FOR_SCOPE: Record<AiPolicyScope, string> = {
  CARE_CHAT: 'care',
  CARE_INSIGHT: 'care',
  CARE_COACHING: 'care',
  CARE_PATIENT_INSIGHT: 'care',
  STORE_INSIGHT: 'store',
  PRODUCT_TAGGING: 'store',
  STORE_PRODUCT_INSIGHT: 'store',
  PRODUCT_CONTENT: 'store',
  CONTENT_TRANSLATION: 'store',
  // 매장 내 소비자 설명 content → store/content 계층
  HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION: 'store',
  AI_PROXY: 'proxy',
};
