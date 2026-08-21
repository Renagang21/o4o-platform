/**
 * GlycoPharm 운영자 사이니지 HQ — 공통 콘솔 주입값
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1
 *
 * 사이니지 HQ 8화면이 서비스 로컬 구현(약 2,233줄)으로 남아 있어
 * KPA-Society / K-Cosmetics 가 이미 쓰던 @o4o/operator-core-ui/modules/signage-hq 로 수렴한다.
 * 각 페이지가 개별 보유하던 apiFetch / SERVICE_KEY / accent / 어휘를 여기 한 곳으로 모았다.
 *
 * backend 는 `app.use('/api/signage/:serviceKey', signageRoutes)` 로 serviceKey 파라미터화돼 있고
 * GlycoPharm 로컬 화면이 쓰던 endpoint·payload 가 공통 콘솔과 완전히 동일하다
 * (선행 census §9-7 실측). endpoint · payload · 권한은 변경하지 않는다.
 *
 * accent 값은 이 파일(서비스 소스)에 리터럴로 존재해야 Tailwind content 스캔에 포함된다.
 */

import type { SignageHqConfig, SignageApiFetch } from '@o4o/operator-core-ui/modules/signage-hq';
import { api, API_BASE_URL } from '../../../lib/apiClient';

/**
 * GlycoPharm — axios wrapper.
 * 공통 콘솔은 fetch 스타일 `RequestInit` 로 호출하므로 여기서 axios 요청으로 변환한다
 * (기존 각 사이니지 페이지의 로컬 apiFetch 와 동일 동작).
 */
export const glycopharmSignageApiFetch: SignageApiFetch = async (path, options = {}) => {
  const url = path.startsWith('/api/v1') ? path.replace(/^\/api\/v1/, '') : `${API_BASE_URL}${path}`;
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data;
};

export const glycopharmSignageHqConfig: SignageHqConfig = {
  serviceKey: 'glycopharm',
  tableIdPrefix: 'glycopharm',
  actionPolicyPrefix: 'glycopharm:signage',
  routeBase: '/operator/signage',
  accent: {
    icon: 'text-green-600',
    primaryButton: 'bg-green-600 hover:bg-green-700',
    focusRing: 'focus:ring-green-500',
    cardBorder: 'border-green-100',
    tagPill: 'bg-green-100 text-green-700',
    linkText: 'text-green-600',
    spinnerBorder: 'border-green-600',
    countBadge: 'bg-green-100 text-green-700',
    softButton: 'text-green-600 border-green-200 hover:bg-green-50',
    panelBg: 'border-green-100 bg-green-50/30',
    statusRing: 'ring-green-400',
  },
  /**
   * GlycoPharm 도메인 어휘 (혈당관리 약국).
   * 기존 로컬 HqMediaPage · HqPlaylistCreatePage 의 DEFAULT_TAG_SUGGESTIONS 값을 그대로 옮긴 것이며
   * 두 화면이 동일한 목록을 갖고 있었다 (서비스 내부 불일치 없음).
   */
  tagSuggestions: [
    '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
    '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
  ],
  playlistLabel: '플레이리스트',
  storeLabel: '약국',
  // GlycoPharm 은 태블릿 대기화면 서브시스템이 없다 (KPA 전용 확장).
  enableTabletSurface: false,
};
