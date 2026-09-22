/**
 * UnifiedHubLayout — 매장 HUB(/hub) 골격. WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-3
 *
 * KPA `PharmacyHubLayout` 의 메뉴 config 를 서비스 중립 라벨로 1회만 둔다(StoreHubShell 공통 골격 그대로).
 * HUB 는 '탐색·가져오기' 공간이므로 공통 문맥(commonServiceKey)으로 호출한다. 상단 StoreWorkspaceNav 는
 * RootShell 상위 nav 가 대신하므로 합성하지 않는다.
 */
import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Files, FileText, Home, Languages, Megaphone, MonitorPlay, MonitorSmartphone, Newspaper,
  PackageSearch, QrCode, ShoppingCart, StickyNote, Video,
} from 'lucide-react';
import { StoreHubShell, type StoreHubNavGroup } from '@o4o/store-ui-core';
import { eventOfferApi } from '../../api/eventOffer';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { StoreAgreementGate } from './UnifiedStoreLayout';

const HUB = WORKSPACE_PATHS.storeHub;

const HUB_MENU_GROUPS: StoreHubNavGroup[] = [
  { label: '', items: [
    { key: 'home', label: '홈', to: HUB, end: true, icon: Home, description: '자원 탐색 허브 · 운영 흐름 안내' },
  ]},
  { label: '매장 상품·거래', items: [
    { key: 'b2b', label: '상품 카탈로그', to: `${HUB}/b2b`, icon: PackageSearch, description: '공급 가능 상품 탐색 · 취급 신청' },
    { key: 'event-offers', label: '이벤트·특가', to: `${HUB}/event-offers`, icon: Megaphone, description: '진행 중 이벤트·특가 상품 · 신청', highlight: true },
    { key: 'cart', label: '장바구니', to: `${HUB}/cart`, icon: ShoppingCart, description: '장바구니에 담은 상품 확인 · 수량 조정' },
    { key: 'multilingual', label: '다국어 상품 콘텐츠', to: `${HUB}/multilingual-product-contents`, icon: Languages, description: '운영자 발행 다국어 상품 안내 · 내 매장 상품에 연결' },
  ]},
  { label: '매장 경영지원', items: [
    { key: 'blog', label: '블로그', to: `${HUB}/blog`, icon: Newspaper, description: '운영자 게시 블로그 · 내 매장으로 가져가기' },
    { key: 'pop', label: 'POP', to: `${HUB}/pop`, icon: StickyNote, description: '운영자 게시 POP · 내 매장으로 가져가기' },
    { key: 'qr', label: 'QR-code', to: `${HUB}/qr`, icon: QrCode, description: '운영자 게시 QR 템플릿 · 내 매장으로 가져가기' },
    { key: 'video', label: '동영상', to: `${HUB}/video`, icon: Video, description: '운영자 게시 동영상 · 내 매장으로 가져가기 · QR 연결' },
    { key: 'signage', label: '사이니지 콘텐츠', to: `${HUB}/signage`, icon: MonitorPlay, description: '매장 화면 송출 콘텐츠 · 플레이리스트' },
    { key: 'screen-set', label: '태블릿 화면', to: `${HUB}/screen-set`, icon: MonitorSmartphone, description: '운영자·공급자 제작 태블릿 화면 · 내 매장 사본으로 가져오기' },
  ]},
  { label: '매장 자료함', items: [
    { key: 'content', label: '콘텐츠 가져오기', to: `${HUB}/content`, icon: Files, description: 'CMS 콘텐츠 탐색 · 내 매장으로 복사' },
    { key: 'supplier-library', label: '공급자 콘텐츠', to: `${HUB}/supplier-library`, icon: FileText, description: '공급자 공개 자료 열람 (사본 없음)' },
  ]},
];

export default function UnifiedHubLayout() {
  const { commonServiceKey } = useUnifiedStore();
  const [activeEventCount, setActiveEventCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    eventOfferApi.getEnrichedOffers({ status: 'active', limit: 1 })
      .then((res) => { if (!cancelled) setActiveEventCount(res?.pagination?.total ?? null); })
      .catch(() => { if (!cancelled) setActiveEventCount(null); });
    return () => { cancelled = true; };
  }, []);
  const groups = useMemo<StoreHubNavGroup[]>(() => {
    if (!activeEventCount || activeEventCount <= 0) return HUB_MENU_GROUPS;
    return HUB_MENU_GROUPS.map((group) => ({
      ...group,
      items: group.items.map((item) => (item.key === 'event-offers' ? { ...item, countBadge: `진행 ${activeEventCount}` } : item)),
    }));
  }, [activeEventCount]);

  return (
    <StoreAgreementGate serviceKey={commonServiceKey}>
      <StoreHubShell
        accent="blue"
        title="매장 운영 허브"
        subtitle="플랫폼이 제공하는 자원을 탐색하고 내 매장으로 가져갑니다"
        groups={groups}
        footerNote="탐색한 자원은 내 매장(/store)에서 설정·운영합니다."
        sidebarId="unified-store-hub-sidebar"
      >
        <Outlet />
      </StoreHubShell>
    </StoreAgreementGate>
  );
}
