/**
 * PharmacyHubLayout — 약국 HUB 좌측 사이드바 + 우측 본문 레이아웃
 *
 * WO-KPA-PHARMACY-HUB-SIDEBAR-LAYOUT-AND-PRODUCT-TABS-FIX-V1
 * WO-O4O-PHARMACY-HUB-LAYOUT-MOBILE-V1: drawer 패턴 적용
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   K-Cosmetics·GlycoPharm 과 같은 골격이던 사이드바/드로어를 공통 `StoreHubShell` 로 이관.
 *   이 파일은 **메뉴 config(그룹 포함) + accent + label + 이벤트 배지 조회** 만 소유한다.
 *   메뉴 항목 / 라우트 / 권한 / API 무변경.
 *   inline style → 공통 Tailwind 마크업, drawer 분기점 md → lg 로 정규화(공통 Shell 기준).
 *
 * 상단 섹션 나열형 구조에서 좌측 사이드바 메뉴 + 우측 본문 구조로 전환.
 * Outlet으로 선택된 메뉴의 페이지를 렌더링한다.
 */

import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Home,
  PackageSearch,
  MonitorPlay,
  Megaphone,
  ShoppingCart,
  Files,
  Newspaper,
  StickyNote,
  QrCode,
  Video,
  MonitorSmartphone,
  Languages,
} from 'lucide-react';
import { StoreHubShell } from '@o4o/store-ui-core';
import type { StoreHubNavGroup } from '@o4o/store-ui-core';
import { eventOfferApi } from '../../api/eventOffer';

/**
 * WO-O4O-KPA-STORE-HUB-MENU-ALIGNMENT-WITH-MY-STORE-V1:
 *   약국 운영 허브 메뉴를 내 약국(/store) 상위 그룹 축(홈 → 약국 상품·거래 → 약국 경영지원 →
 *   약국 자료함)에 정렬. 허브는 '탐색·가져오기' 공간이므로 자원이 있는 그룹만 노출한다.
 *   이벤트·특가: 독립 최상위 메뉴 제거 → '약국 상품·거래' 하위로 편입(광고·홍보 성격 보존,
 *   메가폰 아이콘 + 진행 중 이벤트 수 배지). /store-hub/event-offers 직접 접근·기존 API 유지.
 *
 * WO-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1 / O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1:
 *   emoji 제거, lucide line icon 통일.
 */
const HUB_MENU_GROUPS: StoreHubNavGroup[] = [
  {
    label: '',
    items: [
      { key: 'home', label: '홈', to: '/store-hub', end: true, icon: Home, description: '자원 탐색 허브 · 운영 흐름 안내' },
    ],
  },
  {
    label: '약국 상품·거래',
    items: [
      { key: 'b2b', label: '상품 카탈로그', to: '/store-hub/b2b', icon: PackageSearch, description: '공급 가능 상품 탐색 · 취급 신청' },
      // 이벤트·특가 = 별도 시스템(event_offers). 광고·홍보성으로 시인성 강조(메가폰 + 진행 수 배지).
      { key: 'event-offers', label: '이벤트·특가', to: '/store-hub/event-offers', icon: Megaphone, description: '진행 중 이벤트·특가 상품 · 신청', highlight: true },
      // WO-O4O-EVENT-OFFER-TO-CART-PHASE1A-FOLLOWUP-V1: 이벤트오퍼 담기 → 장바구니 확인
      { key: 'cart', label: '장바구니', to: '/store-hub/cart', icon: ShoppingCart, description: '장바구니에 담은 상품 확인 · 수량 조정' },
      // WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-4): 메뉴 부재 해소.
      //   /store-hub/multilingual-product-contents 는 다른 HUB 화면과 동일한 "운영자 원본 → 내 매장 사본"
      //   가져오기 화면(listMlcHub + importMlcFromHub)이므로 매장 HUB 사이드바가 정위치다.
      //   (별개 화면 /store/products/multilingual/* 은 매장 소유 저작 경로로 그대로 유지 — 중복 아님.)
      { key: 'multilingual', label: '다국어 상품 콘텐츠', to: '/store-hub/multilingual-product-contents', icon: Languages, description: '운영자 발행 다국어 상품 안내 · 내 매장 상품에 연결' },
    ],
  },
  {
    label: '약국 경영지원',
    items: [
      // WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1: 매장 HUB 블로그 진열 + 가져가기
      { key: 'blog', label: '블로그', to: '/store-hub/blog', icon: Newspaper, description: '운영자 게시 블로그 · 내 약국으로 가져가기' },
      // WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1: 매장 HUB POP 진열 + 가져가기
      { key: 'pop', label: 'POP', to: '/store-hub/pop', icon: StickyNote, description: '운영자 게시 POP · 내 약국으로 가져가기' },
      // WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1: 매장 HUB QR 진열 + 가져가기
      //   매장 사본은 기존 StoreQRPage (/store/marketing/qr) 가 그대로 표시 — 별도 사본 관리 화면 없음.
      { key: 'qr', label: 'QR-code', to: '/store-hub/qr', icon: QrCode, description: '운영자 게시 QR 템플릿 · 내 약국으로 가져가기' },
      // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 매장 HUB 동영상 진열 + 가져가기 (QR 전용)
      { key: 'video', label: '동영상', to: '/store-hub/video', icon: Video, description: '운영자 게시 동영상 · 내 약국으로 가져가기 · QR 연결' },
      // WO-O4O-KPA-STORE-HUB-STANDARD-TABLE-AND-SIGNAGE-MENU-IA-V1:
      //   독립 '디지털 사이니지' 그룹 제거 → '사이니지 콘텐츠'를 경영지원 하위로 이동.
      { key: 'signage', label: '사이니지 콘텐츠', to: '/store-hub/signage', icon: MonitorPlay, description: '매장 화면 송출 콘텐츠 · 플레이리스트' },
      // WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1:
      //   가져온 사본은 '태블릿 화면 제작'(/store/commerce/tablet-displays) 목록에 표시.
      { key: 'screen-set', label: '태블릿 화면', to: '/store-hub/screen-set', icon: MonitorSmartphone, description: '운영자·공급자 제작 태블릿 화면 · 내 매장 사본으로 가져오기' },
    ],
  },
  {
    label: '약국 자료함',
    items: [
      { key: 'content', label: '콘텐츠 가져오기', to: '/store-hub/content', icon: Files, description: 'CMS 콘텐츠 탐색 · 내 약국으로 복사' },
    ],
  },
];

export function PharmacyHubLayout() {
  // WO-O4O-KPA-STORE-HUB-MENU-ALIGNMENT-WITH-MY-STORE-V1:
  //   이벤트·특가 시인성 — 진행 중(active) 이벤트 수 배지. 실패/0건 시 배지 미표시(조용한 실패).
  const [activeEventCount, setActiveEventCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    eventOfferApi
      .getEnrichedOffers({ status: 'active', limit: 1 })
      .then(res => { if (!cancelled) setActiveEventCount(res?.pagination?.total ?? null); })
      .catch(() => { if (!cancelled) setActiveEventCount(null); });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo<StoreHubNavGroup[]>(() => {
    if (!activeEventCount || activeEventCount <= 0) return HUB_MENU_GROUPS;
    return HUB_MENU_GROUPS.map(group => ({
      ...group,
      items: group.items.map(item =>
        item.key === 'event-offers' ? { ...item, countBadge: `진행 ${activeEventCount}` } : item,
      ),
    }));
  }, [activeEventCount]);

  return (
    <StoreHubShell
      accent="blue"
      title="약국 운영 허브"
      subtitle="플랫폼이 제공하는 자원을 탐색하고 내 약국으로 가져갑니다"
      groups={groups}
      footerNote="탐색한 자원은 내 약국 (/store)에서 설정·운영합니다."
      sidebarId="pharmacy-hub-sidebar"
    >
      <Outlet />
    </StoreHubShell>
  );
}
