/**
 * 개인화 규칙 엔진
 *
 * - 사용자 신호를 기반으로 콘텐츠 우선순위 계산
 * - 가중치 조정 및 정렬 로직
 */

import { UserSignals, ContentCard, Banner, Suggestion } from '../../types/personalization';

/**
 * 카드 조건 평가
 */
export function evaluateCardConditions(card: ContentCard, signals: UserSignals): boolean {
  const { conditions } = card;
  if (!conditions) return true;

  // 역할 체크
  if (conditions.roles && !conditions.roles.includes(signals.role)) {
    return false;
  }

  // 가입일 체크
  if (conditions.minDaysSinceSignup !== undefined) {
    if (signals.state.daysSinceSignup < conditions.minDaysSinceSignup) {
      return false;
    }
  }

  if (conditions.maxDaysSinceSignup !== undefined) {
    if (signals.state.daysSinceSignup > conditions.maxDaysSinceSignup) {
      return false;
    }
  }

  // 미완료 작업 요구
  if (conditions.requiresPendingTasks) {
    const hasPendingTasks = Object.values(signals.behavior.pendingTasks).some(count => (count || 0) > 0);
    if (!hasPendingTasks) {
      return false;
    }
  }

  // 첫 방문 요구
  if (conditions.requiresFirstVisit && !signals.state.isFirstVisit) {
    return false;
  }

  return true;
}

/**
 * 배너 조건 평가
 */
export function evaluateBannerConditions(banner: Banner, signals: UserSignals): boolean {
  const { conditions } = banner;
  if (!conditions) return true;

  // 역할 체크
  if (conditions.roles && !conditions.roles.includes(signals.role)) {
    return false;
  }

  // 날짜 범위 체크
  const now = new Date();
  if (conditions.startDate) {
    const startDate = new Date(conditions.startDate);
    if (now < startDate) return false;
  }

  if (conditions.endDate) {
    const endDate = new Date(conditions.endDate);
    if (now > endDate) return false;
  }

  return true;
}

/**
 * 카드 가중치 계산 (동적 조정)
 */
export function calculateCardWeight(card: ContentCard, signals: UserSignals): number {
  let weight = card.baseWeight;

  // 1. 미완료 작업이 있으면 가중치 증가 (긴급)
  if (card.conditions?.requiresPendingTasks) {
    const pendingCount = Object.values(signals.behavior.pendingTasks).reduce((sum, count) => sum + (count || 0), 0);
    weight += pendingCount * 10; // 미완료 작업 1개당 +10
  }

  // 2. 신규 사용자에게 온보딩 카드 가중치 상승
  if (card.type === 'guide' && signals.state.daysSinceSignup <= 7) {
    weight += 30;
  }

  // 3. 최근 클릭한 카드는 가중치 유지 (학습)
  const cardClickCount = signals.behavior.cardExecutions[card.id] || 0;
  if (cardClickCount > 0) {
    weight += cardClickCount * 5; // 클릭 1회당 +5
  }

  // 4. 최근 행동과 관련된 카드 우선
  const lastActionKey = `card_${card.id}`;
  if (signals.behavior.lastActions[lastActionKey]) {
    const hoursSinceAction = (Date.now() - signals.behavior.lastActions[lastActionKey]) / (1000 * 60 * 60);
    if (hoursSinceAction < 24) {
      weight += 20; // 24시간 내 행동
    }
  }

  // 5. 에러가 많이 발생한 영역 관련 가이드 우선
  if (card.type === 'guide') {
    const totalErrors = Object.values(signals.behavior.errors).reduce((sum, count) => sum + count, 0);
    if (totalErrors > 3) {
      weight += 15;
    }
  }

  return weight;
}

/**
 * 카드 정렬 (가중치 기반)
 */
export function sortCardsByWeight(cards: ContentCard[], signals: UserSignals): ContentCard[] {
  return cards
    .filter(card => evaluateCardConditions(card, signals))
    .map(card => ({
      card,
      weight: calculateCardWeight(card, signals)
    }))
    .sort((a, b) => b.weight - a.weight)
    .map(item => item.card);
}

/**
 * 배너 정렬 (우선순위 기반)
 */
export function sortBannersByPriority(banners: Banner[], signals: UserSignals): Banner[] {
  return banners
    .filter(banner => evaluateBannerConditions(banner, signals))
    .sort((a, b) => {
      const priorityA = a.conditions?.priority || 0;
      const priorityB = b.conditions?.priority || 0;
      return priorityB - priorityA;
    });
}

/**
 * 추천 정렬 (가중치 기반)
 */
export function sortSuggestions(suggestions: Suggestion[], signals: UserSignals): Suggestion[] {
  return suggestions
    .map(suggestion => {
      let weight = suggestion.weight;

      // 최근 클릭한 추천은 가중치 증가
      const menuClickCount = signals.behavior.menuClicks[suggestion.id] || 0;
      if (menuClickCount > 0) {
        weight += menuClickCount * 3;
      }

      return { suggestion, weight };
    })
    .sort((a, b) => b.weight - a.weight)
    .map(item => item.suggestion);
}

/**
 * 타이브레이커: 같은 가중치일 때 정렬 기준
 */
export function tieBreaker(a: ContentCard | Banner, b: ContentCard | Banner): number {
  // ID 알파벳 순서로 정렬 (일관성 보장)
  return a.id.localeCompare(b.id);
}
