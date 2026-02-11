/**
 * Store AI Recommend - Copy Option Advisor
 *
 * WO-APP-DATA-HUB-PHASE3-A-AI-RECOMMENDATION-V1
 *
 * Rule-based 추천 로직 (Non-blocking advisor)
 * - AI는 제안만 한다. 선택·적용은 항상 사람이다.
 * - 입력: StoreCatalogItem (policy, approvalStatus, limitedConditions)
 * - 출력: 추천 템플릿 + 노출 방식 + 근거 문장
 */

import type { StoreCatalogItem, CopyTemplateType, CopyVisibility } from '@/types/store-main';

export interface CopyRecommendation {
  recommendedTemplate: CopyTemplateType;
  recommendedVisibility: CopyVisibility;
  reasons: string[];
}

/**
 * 상품 정보를 기반으로 복사 옵션을 추천한다.
 * 자동 적용하지 않으며, UI에서 "추천" 배지로만 표시한다.
 */
export function generateCopyRecommendation(item: StoreCatalogItem): CopyRecommendation {
  let recommendedTemplate: CopyTemplateType = 'default';
  let recommendedVisibility: CopyVisibility = 'public';
  const reasons: string[] = [];

  const isLimited = item.policy === 'LIMITED';
  const hasConditions = isLimited && item.limitedConditions && item.limitedConditions.length > 0;
  const isRequestRequired = item.policy === 'REQUEST_REQUIRED';
  const isDisplayOnly = item.policy === 'DISPLAY_ONLY';

  // ─── 템플릿 추천 ──────────────────────────────────────────

  if (hasConditions) {
    // LIMITED + 조건 있음 → 빈 템플릿 (편집 필요)
    recommendedTemplate = 'empty';
    reasons.push('한정 판매 조건이 있어 직접 편집이 필요할 수 있습니다');
  } else if (isDisplayOnly) {
    // 진열 전용 → 기본 템플릿 (그대로 진열)
    recommendedTemplate = 'default';
    reasons.push('진열 전용 상품은 기본 구성 그대로 활용하기 좋습니다');
  } else if (isRequestRequired && item.approvalStatus === 'approved') {
    // 승인 완료된 신청 상품 → 기본 템플릿
    recommendedTemplate = 'default';
    reasons.push('승인 완료 상품은 기본 구성으로 바로 시작할 수 있습니다');
  } else {
    // OPEN 등 일반 → 기본 템플릿
    recommendedTemplate = 'default';
    reasons.push('즉시 판매 가능한 상품은 기본 구성이 효율적입니다');
  }

  // ─── 노출 방식 추천 ────────────────────────────────────────

  if (hasConditions) {
    // LIMITED 조건 → 비공개 시작 권장
    recommendedVisibility = 'private';
    reasons.push('조건 확인 후 노출하는 것이 안전합니다');
  } else if (isRequestRequired && item.approvalStatus !== 'approved') {
    // 미승인 REQUEST → 비공개
    recommendedVisibility = 'private';
    reasons.push('승인 전 상품은 비공개로 준비하는 것을 권장합니다');
  } else if (item.policy === 'OPEN' || (isRequestRequired && item.approvalStatus === 'approved')) {
    // OPEN 또는 승인 완료 → 즉시 노출
    recommendedVisibility = 'public';
    reasons.push('바로 이용 가능한 상품은 즉시 노출이 효과적입니다');
  } else {
    // DISPLAY_ONLY 등 → 즉시 노출
    recommendedVisibility = 'public';
  }

  return { recommendedTemplate, recommendedVisibility, reasons };
}
