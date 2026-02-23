/**
 * KCosmeticsHubPage - K-Cosmetics 공용공간 (Market Layer)
 *
 * WO-O4O-HUB-EXPLORATION-CORE-V1
 * WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1
 *
 * hub-exploration-core thin wrapper.
 * 서비스별 데이터만 다르고 구조는 플랫폼 공통.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HubExplorationLayout,
  HUB_FIXED_TABS,
  type HeroSlide,
  type CoreServiceBanner,
} from '@o4o/hub-exploration-core';

export function KCosmeticsHubPage() {
  const navigate = useNavigate();

  const heroSlides: HeroSlide[] = useMemo(() => [{
    id: 'main',
    backgroundColor: '#DB2777',
    title: 'K-Cosmetics HUB',
    subtitle: 'K-뷰티 플랫폼이 제공하는 자원을 탐색하세요',
  }], []);

  // ── Core Services ──
  const coreServiceBanners: CoreServiceBanner[] = useMemo(() => [
    { id: 'b2b', icon: '🛒', title: 'B2B 상품 카탈로그', description: '공급사 상품을 탐색하고 매장에 신청합니다.', onClick: () => navigate('/b2b/supply') },
    { id: 'content', icon: '📝', title: '플랫폼 콘텐츠', description: 'CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.', onClick: () => navigate('/store') },
    { id: 'signage', icon: '🖥️', title: '디지털 사이니지', description: '매장 디스플레이에 활용할 미디어를 탐색합니다.', badge: '준비중' },
    { id: 'campaign', icon: '📋', title: '캠페인 · 이벤트', description: '플랫폼 캠페인에 참여합니다.', badge: '준비중' },
  ], [navigate]);

  return (
    <HubExplorationLayout
      theme={{ primaryColor: '#DB2777', maxWidth: '1100px' }}
      hero={{ slides: heroSlides, autoInterval: 0 }}
      recentUpdates={{ tabs: [...HUB_FIXED_TABS], items: [] }}
      coreServices={{ banners: coreServiceBanners, title: '핵심 서비스' }}
      aiPlaceholder={{ title: 'AI 추천 예정', description: 'AI 기반 맞춤 상품·콘텐츠 추천이 준비 중입니다' }}
      footerNote="여기서 선택한 콘텐츠·상품·서비스는 내 매장관리에서 관리할 수 있습니다."
    />
  );
}

export default KCosmeticsHubPage;
