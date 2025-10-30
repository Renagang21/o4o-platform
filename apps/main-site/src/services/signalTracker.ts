/**
 * 사용자 행태 신호 추적 서비스
 *
 * - 로컬스토리지 기반 (익명, 30일 보존)
 * - 메뉴 클릭, 카드 실행, 에러 등 행동 기록
 */

import { BehaviorSignals, DeviceSignals, StateSignals, UserSignals } from '../types/personalization';
import { UserRole } from '../types/user';

const STORAGE_KEY = 'o4o_behavior_signals';
const SETTINGS_KEY = 'o4o_personalization_settings';
const MAX_AGE_DAYS = 30;

/**
 * 기본 행태 신호
 */
function getDefaultBehaviorSignals(): BehaviorSignals {
  return {
    menuClicks: {},
    cardExecutions: {},
    errors: {},
    lastActions: {},
    sessionStart: Date.now(),
    pageDepth: 0,
    pendingTasks: {}
  };
}

/**
 * 로컬스토리지에서 신호 로드
 */
function loadSignals(): BehaviorSignals {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultBehaviorSignals();

    const data = JSON.parse(stored);

    // 30일 이상 된 데이터 정리
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    Object.keys(data.lastActions || {}).forEach(key => {
      if (now - data.lastActions[key] > maxAge) {
        delete data.menuClicks[key];
        delete data.cardExecutions[key];
        delete data.errors[key];
        delete data.lastActions[key];
      }
    });

    return { ...getDefaultBehaviorSignals(), ...data };
  } catch (error) {
    return getDefaultBehaviorSignals();
  }
}

/**
 * 로컬스토리지에 신호 저장
 */
function saveSignals(signals: BehaviorSignals): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
  } catch (error) {
    // 스토리지 용량 초과 등의 에러 무시
  }
}

/**
 * 메뉴 클릭 기록
 */
export function trackMenuClick(menuId: string): void {
  const signals = loadSignals();
  signals.menuClicks[menuId] = (signals.menuClicks[menuId] || 0) + 1;
  signals.lastActions[`menu_${menuId}`] = Date.now();
  saveSignals(signals);
}

/**
 * 카드 실행 기록
 */
export function trackCardExecution(cardId: string): void {
  const signals = loadSignals();
  signals.cardExecutions[cardId] = (signals.cardExecutions[cardId] || 0) + 1;
  signals.lastActions[`card_${cardId}`] = Date.now();
  saveSignals(signals);
}

/**
 * 에러 기록
 */
export function trackError(errorType: string): void {
  const signals = loadSignals();
  signals.errors[errorType] = (signals.errors[errorType] || 0) + 1;
  signals.lastActions[`error_${errorType}`] = Date.now();
  saveSignals(signals);
}

/**
 * 페이지 깊이 증가
 */
export function incrementPageDepth(): void {
  const signals = loadSignals();
  signals.pageDepth += 1;
  saveSignals(signals);
}

/**
 * 미완료 작업 업데이트
 */
export function updatePendingTasks(tasks: { orders?: number; inventory?: number; campaigns?: number }): void {
  const signals = loadSignals();
  signals.pendingTasks = { ...signals.pendingTasks, ...tasks };
  saveSignals(signals);
}

/**
 * 세션 시작 시간 리셋
 */
export function resetSession(): void {
  const signals = loadSignals();
  signals.sessionStart = Date.now();
  signals.pageDepth = 0;
  saveSignals(signals);
}

/**
 * 현재 행태 신호 가져오기
 */
export function getBehaviorSignals(): BehaviorSignals {
  return loadSignals();
}

/**
 * 상태 신호 계산
 */
export function getStateSignals(userCreatedAt?: Date | string): StateSignals {
  const signals = loadSignals();
  const now = Date.now();

  // 가입일 계산
  let daysSinceSignup = 0;
  if (userCreatedAt) {
    const createdDate = typeof userCreatedAt === 'string' ? new Date(userCreatedAt) : userCreatedAt;
    daysSinceSignup = Math.floor((now - createdDate.getTime()) / (24 * 60 * 60 * 1000));
  }

  // 첫 방문 여부 (행동 기록이 없으면 첫 방문)
  const isFirstVisit = Object.keys(signals.menuClicks).length === 0 &&
                       Object.keys(signals.cardExecutions).length === 0;

  // 온보딩 완료 여부 (임의 기준: 5개 이상 메뉴 클릭)
  const completedOnboarding = Object.keys(signals.menuClicks).length >= 5;

  return {
    isFirstVisit,
    daysSinceSignup,
    lastLoginDays: 0, // TODO: 서버에서 가져오기
    completedOnboarding
  };
}

/**
 * 기기 신호 수집
 */
export function getDeviceSignals(): DeviceSignals {
  const signals = loadSignals();
  const now = Date.now();

  return {
    isMobile: window.innerWidth < 768,
    screenWidth: window.innerWidth,
    sessionLength: Math.floor((now - signals.sessionStart) / 1000) // 초 단위
  };
}

/**
 * 통합 사용자 신호 생성
 */
export function getUserSignals(
  role: UserRole | string,
  roles: (UserRole | string)[],
  userCreatedAt?: Date | string
): UserSignals {
  return {
    role,
    roles,
    behavior: getBehaviorSignals(),
    state: getStateSignals(userCreatedAt),
    device: getDeviceSignals()
  };
}

/**
 * 개인화 설정 로드
 */
export function getPersonalizationSettings(): { enabled: boolean; collectBehavior: boolean; showRecommendations: boolean } {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) {
      return { enabled: true, collectBehavior: true, showRecommendations: true };
    }
    return JSON.parse(stored);
  } catch {
    return { enabled: true, collectBehavior: true, showRecommendations: true };
  }
}

/**
 * 개인화 설정 저장
 */
export function savePersonalizationSettings(settings: { enabled: boolean; collectBehavior: boolean; showRecommendations: boolean }): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 무시
  }
}

/**
 * 모든 신호 삭제 (개인화 비활성화 시)
 */
export function clearAllSignals(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}
