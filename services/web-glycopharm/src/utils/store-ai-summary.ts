/**
 * Store AI Summary - Rule-based
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1 + PHASE2-A + PHASE3-A
 *
 * Phase 1: 규칙 기반 매장 요약 생성
 * Phase 2-A: 승인 상태 인식 추가
 * Phase 3-A: 우선순위 기반 문장 선택 + 행동 가중치 반영 + 중복 제거
 *
 * 원칙:
 * - AI는 "무엇을 하라"가 아니라 "가장 의미 있는 상태"를 먼저 말한다
 * - 최대 3문장 (리스크 → 기회 → 제안)
 * - 행동 로그는 문장 순서에만 영향, 내용에 직접 반영하지 않음
 * - 자동 실행/선택 없음
 */

import type { StoreMainData, AiSummaryResult } from '@/types/store-main';
import { computeActionWeights } from './store-action-sort';

// ─── 문장 우선순위 등급 ─────────────────────────────────────────
const PRIORITY_RISK = 1;
const PRIORITY_OPPORTUNITY = 2;
const PRIORITY_SUGGESTION = 3;

interface ScoredSentence {
  priority: number;
  text: string;
  /** 관련 actionKey (행동 가중치 정렬용) */
  relatedAction?: string;
}

const MAX_SENTENCES = 3;
const MAX_SUGGESTIONS = 4;

export function generateStoreSummary(data: StoreMainData): AiSummaryResult {
  const { summary, readyToUse, expandable } = data;

  // ─── 상품 없음: 즉시 반환 ─────────────────────────────────
  if (readyToUse.length === 0 && expandable.length === 0) {
    return {
      message: '아직 등록된 상품이 없습니다. 상품을 등록하여 매장을 시작하세요.',
      suggestions: ['상품 등록하기', '카탈로그 둘러보기'],
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 신호 수집 ────────────────────────────────────────────
  const rejectedItems = expandable.filter((item) => item.approvalStatus === 'rejected');
  const approvedRequestItems = readyToUse.filter(
    (item) => item.policy === 'REQUEST_REQUIRED' && item.approvalStatus === 'approved'
  );
  const requestable = expandable.filter(
    (item) => item.policy === 'REQUEST_REQUIRED' && item.approvalStatus !== 'pending'
  );
  const limitedWithConditions = expandable.filter(
    (item) => item.policy === 'LIMITED' && item.limitedConditions && item.limitedConditions.length > 0
  );
  const displayOnly = readyToUse.filter((item) => item.policy === 'DISPLAY_ONLY');

  // ─── 행동 가중치 (문장 순서용) ────────────────────────────
  let actionWeights: Map<string, number>;
  try {
    actionWeights = computeActionWeights();
  } catch {
    actionWeights = new Map();
  }

  // ─── 문장 후보 생성 (우선순위별) ──────────────────────────

  const candidates: ScoredSentence[] = [];

  // === 1순위: 운영 리스크 ===

  if (summary.orderableProducts === 0) {
    candidates.push({
      priority: PRIORITY_RISK,
      text: '주문 가능한 상품이 없습니다. 상품을 추가하여 판매를 시작하세요.',
      relatedAction: 'manage_products',
    });
  }

  if (rejectedItems.length > 0) {
    candidates.push({
      priority: PRIORITY_RISK,
      text: `반려된 신청이 ${rejectedItems.length}건 있습니다. 내용을 수정하여 다시 신청할 수 있습니다.`,
      relatedAction: 'check_approvals',
    });
  }

  if (summary.pendingApprovals > 0) {
    candidates.push({
      priority: PRIORITY_RISK,
      text: `승인 대기 중인 요청이 ${summary.pendingApprovals}건 있습니다.`,
      relatedAction: 'check_approvals',
    });
  }

  if (summary.activeServices === 0 && summary.orderableProducts > 0) {
    candidates.push({
      priority: PRIORITY_RISK,
      text: '활성화된 서비스가 없습니다. 서비스를 설정하면 매장 운영을 시작할 수 있습니다.',
      relatedAction: 'store_settings',
    });
  }

  // === 2순위: 즉시 개선 가능 ===

  if (approvedRequestItems.length > 0) {
    candidates.push({
      priority: PRIORITY_OPPORTUNITY,
      text: `최근 ${approvedRequestItems.length}개의 신청 상품이 승인되어 바로 이용 가능합니다.`,
      relatedAction: 'manage_products',
    });
  }

  if (requestable.length > 0 && rejectedItems.length === 0) {
    candidates.push({
      priority: PRIORITY_OPPORTUNITY,
      text: `신청 가능한 상품이 ${requestable.length}개 있습니다.`,
      relatedAction: 'check_approvals',
    });
  }

  if (limitedWithConditions.length > 0) {
    candidates.push({
      priority: PRIORITY_OPPORTUNITY,
      text: '한정 판매 상품의 조건을 확인해 보세요.',
    });
  }

  if (summary.activeChannels === 0 && summary.orderableProducts > 0) {
    candidates.push({
      priority: PRIORITY_OPPORTUNITY,
      text: '판매 채널을 활성화하면 상품을 바로 노출할 수 있습니다.',
      relatedAction: 'store_settings',
    });
  }

  // === 3순위: 다음 행동 제안 ===

  if (summary.orderableProducts > 0 && summary.activeChannels > 0) {
    candidates.push({
      priority: PRIORITY_SUGGESTION,
      text: `현재 ${summary.orderableProducts}개의 상품이 판매 가능 상태입니다.`,
      relatedAction: 'manage_products',
    });
  }

  if (displayOnly.length > 0) {
    candidates.push({
      priority: PRIORITY_SUGGESTION,
      text: '진열 전용 상품을 사이니지 콘텐츠에 활용할 수 있습니다.',
      relatedAction: 'manage_content',
    });
  }

  // ─── 문장 정렬 + 상위 선택 ────────────────────────────────

  candidates.sort((a, b) => {
    // 1차: 우선순위 등급
    if (a.priority !== b.priority) return a.priority - b.priority;
    // 2차: 행동 가중치 (관련 행동의 사용 빈도가 높을수록 앞)
    const wA = a.relatedAction ? (actionWeights.get(a.relatedAction) || 0) : 0;
    const wB = b.relatedAction ? (actionWeights.get(b.relatedAction) || 0) : 0;
    return wB - wA;
  });

  const selected = candidates.slice(0, MAX_SENTENCES);
  const message = selected.length > 0
    ? selected.map((s) => s.text).join(' ')
    : '매장이 정상 운영 중입니다.';

  // ─── 제안 칩 생성 (중복 제거) ─────────────────────────────

  const suggestions: string[] = [];
  const addedKeys = new Set<string>();

  const addSuggestion = (text: string, dedupeKey?: string) => {
    const key = dedupeKey || text;
    if (addedKeys.has(key) || suggestions.length >= MAX_SUGGESTIONS) return;
    addedKeys.add(key);
    suggestions.push(text);
  };

  // 리스크 관련 제안 우선
  if (rejectedItems.length > 0) {
    addSuggestion(`반려된 신청 ${rejectedItems.length}건 재검토`, 'rejected');
  }
  if (summary.pendingApprovals > 0) {
    addSuggestion(`승인 대기 ${summary.pendingApprovals}건 확인`, 'pending');
  }

  // 기회 관련 제안
  if (requestable.length > 0) {
    addSuggestion(`신청 가능한 상품 ${requestable.length}개 확인`, 'requestable');
  }
  if (limitedWithConditions.length > 0) {
    addSuggestion('한정 상품 조건 확인하기', 'limited');
  }

  // 일반 제안
  if (displayOnly.length > 0) {
    addSuggestion('진열 전용 상품 사이니지 활용', 'display');
  }

  // 기본 제안 (제안이 없을 때)
  if (suggestions.length === 0) {
    addSuggestion('매장 설정 확인', 'settings');
    addSuggestion('주문 현황 보기', 'orders');
  }

  return {
    message,
    suggestions,
    generatedAt: new Date().toISOString(),
  };
}
