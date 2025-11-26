/**
 * 개인화 서비스 - 통합 API
 *
 * - 사용자 신호 수집
 * - 규칙 엔진 실행
 * - 개인화된 피드 생성
 */

import { PersonalizedFeed, UserSignals } from '../types/personalization';
import { getUserSignals, getPersonalizationSettings } from './signalTracker';
import {
  ROLE_CONTENT_CARDS,
  COMMON_BANNERS,
  ROLE_BANNERS,
  COMMON_SUGGESTIONS,
  ROLE_SUGGESTIONS
} from '../config/personalization/content-map';
import {
  sortCardsByWeight,
  sortBannersByPriority,
  sortSuggestions
} from '../config/personalization/rules';
import { SLOT_CONFIG, getSlotConfigForDevice, DEFAULT_CARD_IDS } from '../config/personalization/slots';

/**
 * 개인화된 피드 생성
 */
export function generatePersonalizedFeed(
  role: string,
  roles: string[],
  userCreatedAt?: Date | string
): PersonalizedFeed {
  // 개인화 설정 확인
  const settings = getPersonalizationSettings();
  if (!settings.enabled) {
    return generateDefaultFeed(role);
  }

  // 사용자 신호 수집
  const signals: UserSignals = getUserSignals(role, roles, userCreatedAt);

  // 슬롯 설정 (기기별)
  const slotConfig = getSlotConfigForDevice(signals.device.isMobile);

  // 1. 카드 수집 및 정렬
  const roleCards = ROLE_CONTENT_CARDS[role] || ROLE_CONTENT_CARDS['user'];
  const sortedCards = sortCardsByWeight(roleCards, signals);
  const mainCards = sortedCards.slice(0, slotConfig.mainFeed.defaultCount);

  // 2. 배너 수집 및 정렬
  const allBanners = [...COMMON_BANNERS, ...(ROLE_BANNERS[role] || [])];
  const sortedBanners = sortBannersByPriority(allBanners, signals);

  const topNotice = sortedBanners.length > 0 ? sortedBanners[0] : undefined;
  const bottomBanners = sortedBanners.slice(1, 1 + slotConfig.bottomBanners.maxCount);

  // 3. 추천 수집 및 정렬
  const roleSuggestions = ROLE_SUGGESTIONS[role] || [];
  const allSuggestions = [...roleSuggestions, ...COMMON_SUGGESTIONS];
  const sortedSuggestions = sortSuggestions(allSuggestions, signals);
  const suggestions = sortedSuggestions.slice(0, slotConfig.sideSuggestions.defaultCount);

  // 4. 적용된 규칙 추적
  const appliedRules: string[] = [];
  if (signals.state.isFirstVisit) appliedRules.push('first-visit-priority');
  if (signals.state.daysSinceSignup <= 7) appliedRules.push('onboarding-boost');
  if (Object.keys(signals.behavior.pendingTasks).length > 0) appliedRules.push('urgent-tasks-first');

  return {
    topNotice,
    mainCards,
    suggestions,
    bottomBanners,
    metadata: {
      personalizedAt: Date.now(),
      source: 'rules',
      appliedRules
    }
  };
}

/**
 * 디폴트 피드 생성 (개인화 OFF 시)
 */
function generateDefaultFeed(role: string): PersonalizedFeed {
  const defaultCardIds = DEFAULT_CARD_IDS[role] || DEFAULT_CARD_IDS['user'];
  const roleCards = ROLE_CONTENT_CARDS[role] || ROLE_CONTENT_CARDS['user'];

  const mainCards = defaultCardIds
    .map(id => roleCards.find(card => card.id === id))
    .filter(card => card !== undefined);

  const roleSuggestions = ROLE_SUGGESTIONS[role] || [];
  const suggestions = [...roleSuggestions, ...COMMON_SUGGESTIONS].slice(0, 3);

  return {
    mainCards,
    suggestions,
    bottomBanners: [],
    metadata: {
      personalizedAt: Date.now(),
      source: 'default',
      appliedRules: ['default-fallback']
    }
  };
}

/**
 * 개인화 피드 새로고침 (역할 전환 시 호출)
 */
export function refreshPersonalizedFeed(
  role: string,
  roles: string[],
  userCreatedAt?: Date | string
): PersonalizedFeed {
  return generatePersonalizedFeed(role, roles, userCreatedAt);
}
