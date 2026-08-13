/**
 * KPA 운영자 사이니지 HQ — 공통 콘솔 주입값
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1
 *
 * 사이니지 HQ 8화면이 @o4o/operator-core-ui/modules/signage-hq 공통 콘솔로 수렴하면서
 * 각 페이지가 개별 보유하던 apiFetch / SERVICE_KEY / accent / 어휘를 여기 한 곳으로 모았다.
 *
 * accent 값은 이 파일(서비스 소스)에 리터럴로 존재해야 Tailwind content 스캔에 포함된다.
 */

import type { SignageHqConfig, SignageApiFetch } from '@o4o/operator-core-ui/modules/signage-hq';
import { getAccessToken } from '../../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/** KPA — Bearer token fetch (기존 각 사이니지 페이지의 apiFetch 와 동일 동작) */
export const kpaSignageApiFetch: SignageApiFetch = async (path, options) => {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
};

export const kpaSignageHqConfig: SignageHqConfig = {
  serviceKey: 'kpa-society',
  tableIdPrefix: 'kpa',
  actionPolicyPrefix: 'kpa:signage',
  routeBase: '/operator/signage',
  accent: {
    icon: 'text-blue-600',
    primaryButton: 'bg-blue-600 hover:bg-blue-700',
    focusRing: 'focus:ring-blue-500',
    cardBorder: 'border-blue-100',
    tagPill: 'bg-blue-100 text-blue-700',
    linkText: 'text-blue-600',
    spinnerBorder: 'border-blue-600',
    countBadge: 'bg-blue-100 text-blue-700',
    softButton: 'text-blue-600 border-blue-200 hover:bg-blue-50',
    panelBg: 'border-blue-100 bg-blue-50/30',
    statusRing: 'ring-blue-400',
  },
  // KPA 도메인 어휘 (약국)
  tagSuggestions: [
    '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
    '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
  ],
  playlistLabel: '플레이리스트',
  storeLabel: '약국',
  // KPA 태블릿 서브시스템 보유 (WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1)
  enableTabletSurface: true,
};
