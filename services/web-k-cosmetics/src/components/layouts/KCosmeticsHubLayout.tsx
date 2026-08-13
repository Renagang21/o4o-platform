/**
 * KCosmeticsHubLayout — K-Cosmetics 매장 운영 허브 탐색 레이아웃
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1: wrapper 최초 추가
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   KPA·GlycoPharm 과 동일했던 사이드바/드로어 마크업을 공통 `StoreHubShell` 로 이관.
 *   이 파일은 이제 **메뉴 config + accent + label + 서비스 푸터** 만 소유한다.
 *   메뉴 항목 / 라우트 / 권한 무변경.
 */

import { Outlet } from 'react-router-dom';
import { Home, ShoppingCart, Monitor, FileText, Megaphone, BookOpen, QrCode } from 'lucide-react';
import { StoreHubShell } from '@o4o/store-ui-core';
import type { StoreHubNavGroup } from '@o4o/store-ui-core';
// WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1: store-facing compact 푸터
import { StoreFacingFooter } from '@o4o/shared-space-ui';
import { loadFooterLegal } from '../../lib/footerLegal';

/** K-Cosmetics 는 그룹 헤더 없는 평면 메뉴 — 단일 무명 그룹으로 표현한다. */
const HUB_MENU: StoreHubNavGroup[] = [
  {
    label: '',
    items: [
      {
        key: 'home',
        label: '홈',
        description: '자원 탐색 허브 · 운영 흐름 안내',
        icon: Home,
        to: '/store-hub',
        end: true,
      },
      {
        // WO-O4O-KCOS-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1: KPA canonical 정합
        key: 'b2b',
        label: '상품 카탈로그',
        description: '공급 가능 상품 탐색 · 내 매장에 추가',
        icon: ShoppingCart,
        to: '/store-hub/b2b',
      },
      {
        key: 'signage',
        label: '사이니지',
        description: '매장 디스플레이에 활용할 미디어를 탐색합니다',
        icon: Monitor,
        to: '/store-hub/signage',
      },
      {
        key: 'content',
        label: '콘텐츠/자료',
        description: '플랫폼 콘텐츠를 탐색하고 내 매장에 복사합니다',
        icon: FileText,
        to: '/store-hub/content',
      },
      {
        key: 'blog',
        label: '블로그',
        description: '운영자 블로그를 탐색하고 내 매장에 가져갑니다',
        icon: BookOpen,
        to: '/store-hub/blog',
      },
      {
        // WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1: 준비 중 → 실제 페이지 연결 (KPA/GlycoPharm canonical)
        key: 'pop',
        label: 'POP',
        description: '운영자 POP 자료를 탐색하고 내 매장에 가져갑니다',
        icon: Megaphone,
        to: '/store-hub/pop',
      },
      {
        key: 'qr',
        label: 'QR 코드',
        description: 'QR 자료를 탐색하고 내 매장에 가져갑니다',
        icon: QrCode,
        to: '/store-hub/qr',
      },
      {
        key: 'event-offers',
        label: '캠페인·이벤트',
        description: '플랫폼 캠페인에 참여합니다',
        icon: Megaphone,
        to: '/store-hub/event-offers',
      },
      // WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2: 내 장바구니
      {
        key: 'cart',
        label: '내 장바구니',
        description: '장바구니에 담은 상품 확인 · 주문 확정',
        icon: ShoppingCart,
        to: '/store-hub/cart',
      },
    ],
  },
];

export function KCosmeticsHubLayout() {
  return (
    <StoreHubShell
      accent="pink"
      title="매장 운영 허브"
      subtitle="플랫폼 자원을 탐색하고 내 매장에 가져갑니다"
      groups={HUB_MENU}
      footerNote="탐색한 자원은 내 매장 (/store)에서 설정·운영합니다."
      sidebarId="kcos-hub-sidebar"
      footer={
        /* WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1: 매장 HUB compact 푸터 */
        <StoreFacingFooter
          serviceKey="k-cosmetics"
          serviceName="K-Cosmetics"
          loadProfile={loadFooterLegal}
          links={{ terms: '/terms', privacy: '/privacy', contact: '/contact' }}
        />
      }
    >
      <Outlet />
    </StoreHubShell>
  );
}
