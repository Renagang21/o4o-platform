/**
 * Unified Store 메뉴 config — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8 (Scope Extension)
 *
 * 원칙(사용자 지시 2026-09-21):
 *   - 세 서비스의 Store 화면을 그대로 복사하지 않는다. **공통 기능은 `내 매장`(/store) 아래 1회**만 둔다.
 *   - 서비스에 종속된 기능(거래 대상 상품 · 주문 · 서비스 고유 프로그램)만 `서비스 업무`(/work/<serviceKey>) 아래 둔다.
 *   - 같은 조직이 3개 서비스를 쓰면 Workspace 는 하나. 서비스 클릭 = workspace 안의 문맥 전환(handoff 아님).
 *   - KPA 트리가 공통 기능의 canonical(reference implementation). 라벨은 서비스 중립("약국" → "매장").
 *
 * 라우트 없는 항목은 넣지 않는다(데드링크 0). subPath 는 KPA canonical 경로를 그대로 쓴다.
 */
import type { StoreDashboardConfig } from '@o4o/store-ui-core';
import type { UnifiedServiceKey } from '../lib/serviceContext';
import { WORKSPACE_PATHS } from './workspace';

/** 내 매장(공통) — 1 Workspace 에 1회 */
export const UNIFIED_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'store',          // 표시용 label 축(StoreDashboardLayout data-attr). 백엔드 serviceKey 가 아니다.
  serviceName: '내 매장',
  basePath: WORKSPACE_PATHS.myStore,
  enabledMenus: ['dashboard'],
  menuSections: [
    { label: '', items: [
      { key: 'home', label: '홈', subPath: '' },
    ]},
    { label: '매장 제품', items: [
      { key: 'my-products',      label: '내 매장 제품',       subPath: '/my-products' },
      { key: 'handled-products', label: '매장 경영활용 제품', subPath: '/handled-products' },
      { key: 'local-products',   label: '매장 자체 상품',     subPath: '/commerce/local-products' },
    ]},
    { label: '매장 경영지원', items: [
      { key: 'product-descriptions', label: '상품 설명',       subPath: '/marketing/product-descriptions' },
      { key: 'content-blog',         label: '블로그',          subPath: '/content/blog' },
      { key: 'pop',                  label: 'POP',             subPath: '/marketing/pop-v2' },
      { key: 'qr',                   label: 'QR-code',         subPath: '/marketing/qr' },
      { key: 'tablet-displays',      label: '태블릿 화면 제작', subPath: '/commerce/tablet-displays' },
      { key: 'tablet-requests',      label: '상담 요청',        subPath: '/requests' },
    ]},
    { label: '매장 실행', items: [
      { key: 'store-execution', label: '실행 현황', subPath: '/execution' },
    ]},
    { label: '매장 자료함', items: [
      { key: 'library-contents',  label: '콘텐츠', subPath: '/library/contents' },
      { key: 'library-resources', label: '자료',   subPath: '/library/resources' },
      { key: 'store-assets',      label: '매장 콘텐츠', subPath: '/content' },
    ]},
    { label: '디지털 사이니지', items: [
      { key: 'signage-playlist',  label: '플레이리스트', subPath: '/marketing/signage/playlist' },
      { key: 'signage-videos',    label: '동영상',       subPath: '/marketing/signage/videos' },
      { key: 'signage-schedules', label: '스케줄',       subPath: '/marketing/signage/schedules' },
      { key: 'signage-player',    label: 'TV 재생',      subPath: '/marketing/signage/player' },
    ]},
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '설정', items: [
      { key: 'info', label: '매장 정보', subPath: '/info' },
    ]},
  ],
};

/** 서비스 업무 — 서비스 종속 기능만. basePath = /work/<serviceKey> */
export const SERVICE_WORK_CONFIGS: Readonly<Record<UnifiedServiceKey, StoreDashboardConfig>> = Object.freeze({
  'kpa-society': {
    serviceKey: 'kpa-society',
    serviceName: 'KPA Society',
    basePath: `${WORKSPACE_PATHS.serviceWork}/kpa-society`,
    enabledMenus: ['dashboard'],
    menuSections: [
      { label: '', items: [{ key: 'home', label: '홈', subPath: '' }] },
      { label: 'O4O 제품 · 거래', items: [
        { key: 'products',                 label: 'O4O 제품',       subPath: '/commerce/products' },
        { key: 'order-worktable',          label: '발주 작업대',    subPath: '/commerce/order-worktable' },
        { key: 'orders',                   label: '발주 내역',      subPath: '/commerce/orders' },
        { key: 'seller-recruitments',      label: '판매자 모집',    subPath: '/commerce/seller-recruitments' },
        { key: 'recruitment-applications', label: '신청·승인 현황', subPath: '/commerce/recruitment-applications' },
      ]},
      { label: '온라인 판매', items: [
        { key: 'online-sales-settings', label: '채널 설정', subPath: '/online-sales/settings' },
        { key: 'online-sales-products', label: '채널 상품', subPath: '/online-sales/products' },
        { key: 'online-sales-orders',   label: '채널 주문', subPath: '/online-sales/orders' },
      ]},
      { label: '판매 채널 확장', items: [
        { key: 'foreign-visitor-sales-support', label: '외국인 여행객 판매지원', subPath: '/sales-channels/foreign-visitor' },
      ]},
    ],
  },
  'k-cosmetics': {
    serviceKey: 'k-cosmetics',
    serviceName: 'K-Cosmetics',
    basePath: `${WORKSPACE_PATHS.serviceWork}/k-cosmetics`,
    enabledMenus: ['dashboard'],
    menuSections: [
      { label: '', items: [{ key: 'home', label: '홈', subPath: '' }] },
      { label: '화장품 상품 · 거래', items: [
        { key: 'products', label: '상품',      subPath: '/commerce/products' },
        { key: 'orders',   label: '주문 관리', subPath: '/commerce/orders' },
        { key: 'billing',  label: '매출 요약', subPath: '/commerce/billing' },
      ]},
      { label: 'K-Cosmetics 고유', items: [
        { key: 'interest-requests', label: '관심 요청', subPath: '/interest-requests' },
      ]},
    ],
  },
  'pharmacy-hub': {
    serviceKey: 'pharmacy-hub',
    serviceName: 'PharmacyHub',
    basePath: `${WORKSPACE_PATHS.serviceWork}/pharmacy-hub`,
    enabledMenus: ['dashboard'],
    menuSections: [
      { label: '', items: [{ key: 'home', label: '홈', subPath: '' }] },
      { label: '공급 상품 · 주문', items: [
        { key: 'products', label: '공급 상품', subPath: '/products' },
        { key: 'cart',     label: '장바구니', subPath: '/cart' },
        { key: 'orders',   label: '주문',     subPath: '/orders' },
      ]},
    ],
  },
});
