/**
 * K-Cosmetics 운영자 사이니지 HQ — 공통 콘솔 주입값
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1
 *
 * 사이니지 HQ 8화면이 @o4o/operator-core-ui/modules/signage-hq 공통 콘솔로 수렴하면서
 * 각 페이지가 개별 보유하던 apiFetch / SERVICE_KEY / accent / 어휘를 여기 한 곳으로 모았다.
 *
 * accent 값은 이 파일(서비스 소스)에 리터럴로 존재해야 Tailwind content 스캔에 포함된다.
 */

import type { SignageHqConfig, SignageApiFetch } from '@o4o/operator-core-ui/modules/signage-hq';
import { api, API_BASE_URL } from '../../../lib/apiClient';

/**
 * K-Cosmetics — axios wrapper (쿠키 인증).
 * 공통 콘솔은 fetch 스타일 `RequestInit` 로 호출하므로 여기서 axios 요청으로 변환한다
 * (기존 각 사이니지 페이지의 apiFetch 와 동일 동작).
 */
export const kcosSignageApiFetch: SignageApiFetch = async (path, options = {}) => {
  const url = path.startsWith('/api/v1') ? path.replace(/^\/api\/v1/, '') : `${API_BASE_URL}${path}`;
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data;
};

export const kcosSignageHqConfig: SignageHqConfig = {
  // WO-O4O-KCOS-SIGNAGE-SERVICEKEY-CANONICALIZATION-V1
  //   Signage API 의 `:serviceKey` 정본은 canonical service key 다
  //   (KPA='kpa-society' / KCos='k-cosmetics' — `@o4o/security-core` SSOT).
  //   이전 주석은 backend 허용목록에 역할 prefix 'cosmetics' 만 있던 상태를 표준으로
  //   기록했으나, 그것이 drift 였다. backend 가 canonical 로 정규화되면서
  //   K-Cosmetics 는 운영자 HQ·매장·공개 화면 모두 'k-cosmetics' 하나만 쓴다.
  //   (역할 스코프 키는 여전히 'cosmetics' — actionPolicyPrefix 참조. 축이 다르다.)
  serviceKey: 'k-cosmetics',
  tableIdPrefix: 'kcos',
  actionPolicyPrefix: 'cosmetics:signage',
  routeBase: '/operator/signage',
  accent: {
    icon: 'text-pink-600',
    primaryButton: 'bg-pink-600 hover:bg-pink-700',
    focusRing: 'focus:ring-pink-500',
    cardBorder: 'border-pink-100',
    tagPill: 'bg-pink-100 text-pink-700',
    linkText: 'text-pink-600',
    spinnerBorder: 'border-pink-600',
    countBadge: 'bg-pink-100 text-pink-700',
    softButton: 'text-pink-600 border-pink-200 hover:bg-pink-50',
    panelBg: 'border-pink-100 bg-pink-50/30',
    statusRing: 'ring-pink-400',
  },
  /**
   * K-Cosmetics 도메인 어휘.
   * ※ 기존 HqMediaPage 는 KPA 의 약국 태그(복약지도/당뇨/혈압/의약외품)를 복사해 갖고 있었고,
   *   같은 서비스의 HqPlaylistCreatePage 는 화장품 태그를 쓰고 있어 서비스 내부에서도 불일치했다.
   *   본 WO 는 화면 수렴 범위이므로 어휘 정정은 하지 않고, 이미 화장품 어휘를 쓰던
   *   재생목록 등록 화면의 값으로 통일한다(잘못된 약국 어휘를 새 공통 콘솔로 옮기지 않는다).
   */
  tagSuggestions: [
    '스킨케어', '메이크업', '신제품', '프로모션', '이벤트',
    '베스트셀러', '추천상품', '브랜드', '클렌징', '선케어',
  ],
  playlistLabel: '재생목록',
  storeLabel: '매장',
  // K-Cosmetics 는 태블릿 대기화면 서브시스템이 없다.
  enableTabletSurface: false,
};
