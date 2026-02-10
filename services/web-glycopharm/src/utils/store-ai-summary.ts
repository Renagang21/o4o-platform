/**
 * Store AI Summary - Rule-based Stub
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1
 * Phase 1: 규칙 기반 매장 요약 생성
 * 실제 AI 모델 연동 없이 데이터 기반 텍스트 생성
 */

import type { StoreMainData, AiSummaryResult } from '@/types/store-main';

export function generateStoreSummary(data: StoreMainData): AiSummaryResult {
  const { summary, readyToUse, expandable } = data;
  const suggestions: string[] = [];
  let message = '';

  // 상품이 없는 경우
  if (readyToUse.length === 0 && expandable.length === 0) {
    message = '아직 등록된 상품이 없습니다. 상품을 등록하여 매장을 시작하세요.';
    suggestions.push('상품 등록하기');
    suggestions.push('카탈로그 둘러보기');
    return { message, suggestions, generatedAt: new Date().toISOString() };
  }

  // 기본 현황 메시지
  const parts: string[] = [];

  if (summary.orderableProducts > 0) {
    parts.push(`현재 ${summary.orderableProducts}개의 상품이 판매 가능 상태입니다`);
  }

  if (summary.activeServices > 0) {
    parts.push(`${summary.activeServices}개의 서비스가 활성화되어 있습니다`);
  }

  if (summary.activeChannels > 1) {
    parts.push(`${summary.activeChannels}개의 판매 채널이 운영 중입니다`);
  }

  message = parts.length > 0
    ? parts.join('. ') + '.'
    : '매장 현황을 확인하세요.';

  // 승인 대기 알림
  if (summary.pendingApprovals > 0) {
    suggestions.push(`승인 대기 ${summary.pendingApprovals}건 확인`);
  }

  // 확장 가능 상품 추천
  if (expandable.length > 0) {
    const requestable = expandable.filter((item) => item.policy === 'REQUEST_REQUIRED');
    if (requestable.length > 0) {
      suggestions.push(`신청 가능한 상품 ${requestable.length}개 확인`);
    }
  }

  // 진열 전용 상품 활용 제안
  const displayOnly = readyToUse.filter((item) => item.policy === 'DISPLAY_ONLY');
  if (displayOnly.length > 0) {
    suggestions.push('진열 전용 상품을 사이니지에 활용하기');
  }

  // 기본 제안
  if (suggestions.length === 0) {
    suggestions.push('매장 설정 확인');
    suggestions.push('주문 현황 보기');
  }

  return {
    message,
    suggestions,
    generatedAt: new Date().toISOString(),
  };
}
