/**
 * PharmacyHubMarketPage - 약국 공용공간 (Market Layer)
 *
 * WO-O4O-HUB-MARKET-RESTRUCTURE-V1
 * WO-O4O-HUB-PLATFORM-ACTIVITY-SUMMARY-V1
 * WO-O4O-HUB-EXPLORATION-CORE-V1: hub-exploration-core thin wrapper
 * WO-O4O-HUB-DATA-UNIFICATION-V1: CMS 슬롯 연동
 * WO-O4O-HUB-CMS-SLOT-STRUCTURE-ALIGNMENT-V1: 공통 슬롯 키 + 광고 연동
 *
 * Hub = "여기서 가져간다" — 플랫폼이 제공하는 자원을 탐색·선택하여 내 매장으로 가져가는 공간
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HubExplorationLayout,
  HUB_FIXED_TABS,
  type HeroSlide,
  type CoreServiceBanner,
  type RecentUpdateItem,
  type PromotionBanner,
  type AdItem,
  type B2BPreviewItem,
  type ProductDevItem,
  type PlatformContentItem,
} from '@o4o/hub-exploration-core';
import { useOrganization } from '../../contexts';
import { RecommendedServicesSection } from './sections/RecommendedServicesSection';
import { getCatalog } from '../../api/pharmacyProducts';
import type { CatalogProduct } from '../../api/pharmacyProducts';
import { cmsApi } from '../../api/cms';
import type { CmsSlot } from '../../api/cms';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { listPlatformServices } from '../../api/platform-services';

// ============================================
// KPI
// ============================================

interface PlatformKpi {
  productCount: number;
  contentCount: number;
  serviceCount: number;
}

// ============================================
// CMS → HubExploration 매핑
// ============================================

function cmsSlotToHeroSlide(slot: CmsSlot, navigate: (path: string) => void): HeroSlide {
  return {
    id: slot.content?.id ?? slot.id,
    title: slot.content?.title ?? '',
    subtitle: slot.content?.summary ?? undefined,
    backgroundImage: slot.content?.imageUrl ?? undefined,
    backgroundColor: slot.content?.metadata?.backgroundColor ?? undefined,
    ctaLabel: slot.content?.linkText ?? undefined,
    onCtaClick: slot.content?.linkUrl
      ? () => navigate(slot.content!.linkUrl!)
      : undefined,
  };
}

function cmsSlotToPromo(slot: CmsSlot, navigate: (path: string) => void): PromotionBanner {
  return {
    id: slot.content?.id ?? slot.id,
    imageUrl: slot.content?.imageUrl ?? '',
    alt: slot.content?.title ?? '',
    title: slot.content?.title,
    subtitle: slot.content?.summary ?? undefined,
    onClick: slot.content?.linkUrl
      ? () => navigate(slot.content!.linkUrl!)
      : undefined,
  };
}

function cmsSlotToAdItem(slot: CmsSlot, tier: 'premium' | 'normal', navigate: (path: string) => void): AdItem {
  return {
    id: slot.content?.id ?? slot.id,
    tier,
    imageUrl: slot.content?.imageUrl ?? '',
    alt: slot.content?.title ?? '',
    onClick: slot.content?.linkUrl
      ? () => navigate(slot.content!.linkUrl!)
      : undefined,
  };
}

// ============================================
// B2B Catalog → B2BPreviewItem 매핑
// ============================================

function catalogToB2BItem(p: CatalogProduct, navigate: (path: string) => void): B2BPreviewItem {
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.supplierLogoUrl ?? undefined,
    badge: p.category ?? undefined,
    supplierName: p.supplierName,
    onClick: () => navigate(`/hub/b2b`),
  };
}

// ============================================
// CMS Slot → ProductDevItem 매핑
// ============================================

function cmsSlotToProductDev(slot: CmsSlot, navigate: (path: string) => void): ProductDevItem {
  return {
    id: slot.content?.id ?? slot.id,
    title: slot.content?.title ?? '',
    description: slot.content?.summary ?? undefined,
    imageUrl: slot.content?.imageUrl ?? undefined,
    badge: (slot.content?.metadata?.badge as string) ?? undefined,
    onClick: slot.content?.linkUrl
      ? () => navigate(slot.content!.linkUrl!)
      : undefined,
  };
}

// ============================================
// Default Hero (fallback when CMS empty)
// ============================================

const DEFAULT_HERO_BG = '#1E3A8A';

// ============================================
// 컴포넌트
// ============================================

export function PharmacyHubMarketPage() {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<PlatformKpi | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // ── CMS Hero / Promo ──
  const defaultHero: HeroSlide[] = useMemo(() => [{
    id: 'main',
    backgroundColor: DEFAULT_HERO_BG,
    title: '약국 HUB',
    subtitle: `${currentOrganization?.name || '내 약국'} — 플랫폼이 제공하는 자원을 탐색하고 내 매장으로 가져갑니다`,
  }], [currentOrganization?.name]);

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(defaultHero);
  const [promos, setPromos] = useState<PromotionBanner[]>([]);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [b2bItems, setB2bItems] = useState<B2BPreviewItem[]>([]);
  const [productDevItems, setProductDevItems] = useState<ProductDevItem[]>([]);
  const [contentItems, setContentItems] = useState<PlatformContentItem[]>([]);

  // CMS 슬롯 로드 (1회) — 공통 슬롯 키, serviceKey로 분기
  useEffect(() => {
    let cancelled = false;

    // Hero
    cmsApi.getSlots('hub-hero', { serviceKey: 'kpa' })
      .then(res => {
        if (!cancelled && res.data.length > 0) {
          setHeroSlides(res.data
            .filter(s => s.content)
            .map(s => cmsSlotToHeroSlide(s, navigate)));
        }
      })
      .catch(() => {}); // fallback to default

    // Promo
    cmsApi.getSlots('hub-promotion', { serviceKey: 'kpa' })
      .then(res => {
        if (!cancelled) {
          setPromos(res.data
            .filter(s => s.content)
            .map(s => cmsSlotToPromo(s, navigate)));
        }
      })
      .catch(() => {});

    // Ads (premium + normal)
    Promise.allSettled([
      cmsApi.getSlots('hub-ad-premium', { serviceKey: 'kpa' }),
      cmsApi.getSlots('hub-ad-normal', { serviceKey: 'kpa' }),
    ]).then(results => {
      if (cancelled) return;
      const premium = results[0].status === 'fulfilled'
        ? results[0].value.data.filter(s => s.content).map(s => cmsSlotToAdItem(s, 'premium', navigate))
        : [];
      const normal = results[1].status === 'fulfilled'
        ? results[1].value.data.filter(s => s.content).map(s => cmsSlotToAdItem(s, 'normal', navigate))
        : [];
      setAds([...premium, ...normal]);
    });

    // B2B 상품 카탈로그 미리보기
    getCatalog({ limit: 6, offset: 0 })
      .then(res => {
        if (!cancelled) {
          setB2bItems(res.data.map(p => catalogToB2BItem(p, navigate)));
        }
      })
      .catch(() => {});

    // 제품개발 참여 (CMS Slot)
    cmsApi.getSlots('hub-product-dev', { serviceKey: 'kpa' })
      .then(res => {
        if (!cancelled) {
          setProductDevItems(res.data
            .filter(s => s.content)
            .map(s => cmsSlotToProductDev(s, navigate)));
        }
      })
      .catch(() => {});

    // 플랫폼 콘텐츠
    cmsApi.getContents({ status: 'published', limit: 20, offset: 0 })
      .then(res => {
        if (!cancelled) {
          setContentItems(res.data.map(c => ({
            id: c.id,
            icon: '📄',
            title: c.title,
            description: c.summary ?? undefined,
            date: c.publishedAt
              ? new Date(c.publishedAt).toLocaleDateString('ko-KR')
              : undefined,
            onCopy: () => {
              assetSnapshotApi.copy({
                sourceService: 'kpa',
                sourceAssetId: c.id,
                assetType: 'cms',
              }).catch(() => {});
            },
          })));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [navigate]);

  // defaultHero 변경 시 동기화 (CMS 데이터 없을 때)
  useEffect(() => {
    setHeroSlides(prev =>
      prev.length === 1 && prev[0].id === 'main' ? defaultHero : prev
    );
  }, [defaultHero]);

  // 플랫폼 활동 KPI 로드 (1회, 병렬)
  useEffect(() => {
    let cancelled = false;

    async function loadKpi() {
      const results = await Promise.allSettled([
        getCatalog({ limit: 1, offset: 0 }),
        cmsApi.getContents({ status: 'published', limit: 1, offset: 0 }),
        listPlatformServices(),
      ]);

      if (cancelled) return;

      const productTotal = results[0].status === 'fulfilled'
        ? results[0].value.pagination.total : 0;
      const contentTotal = results[1].status === 'fulfilled'
        ? results[1].value.pagination.total : 0;
      const serviceCount = results[2].status === 'fulfilled'
        ? results[2].value.filter(s => s.isFeatured && s.enrollmentStatus !== 'approved').length
        : 0;

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const labels = ['상품 카탈로그', 'CMS 콘텐츠', '추천 서비스'];
          console.warn(`[Hub KPI] ${labels[i]} 조회 실패:`, r.reason);
        }
      });

      setKpi({ productCount: productTotal, contentCount: contentTotal, serviceCount });
      setKpiLoading(false);
    }

    loadKpi();
    return () => { cancelled = true; };
  }, []);

  // ── Recent Updates (고정 탭 구조 — HUB_FIXED_TABS) ──
  const updateItems: RecentUpdateItem[] = useMemo(() => {
    if (kpiLoading || !kpi) return [];
    return [
      {
        id: 'kpi-products',
        tabKey: 'b2b',
        title: `공개 상품 ${kpi.productCount}개 등록됨`,
        description: 'B2B 카탈로그에서 공급사 상품을 탐색하세요',
        badge: 'B2B',
        onClick: () => navigate('/hub/b2b'),
      },
      {
        id: 'kpi-content',
        tabKey: 'content',
        title: `공개 콘텐츠 ${kpi.contentCount}개 게시 중`,
        description: 'CMS 콘텐츠를 탐색하고 내 매장에 복사하세요',
        badge: '콘텐츠',
        onClick: () => navigate('/hub/content'),
      },
      ...(kpi.serviceCount > 0 ? [{
        id: 'kpi-services',
        tabKey: 'service',
        title: `추천 서비스 ${kpi.serviceCount}개 발견`,
        description: '플랫폼이 권하는 서비스를 확인하세요',
        badge: '추천',
        badgeColor: '#059669',
        onClick: () => document.getElementById('hub-services-section')?.scrollIntoView({ behavior: 'smooth' }),
      }] : []),
    ];
  }, [kpi, kpiLoading, navigate]);

  // ── Core Services ──
  const coreServiceBanners: CoreServiceBanner[] = useMemo(() => [
    { id: 'content', icon: '📝', title: '플랫폼 콘텐츠', description: '본부/공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.', onClick: () => navigate('/hub/content') },
    { id: 'signage', icon: '🖥️', title: '플랫폼 사이니지', description: '디지털 사이니지 미디어와 플레이리스트를 탐색하고 내 매장에 추가합니다.', onClick: () => navigate('/hub/signage') },
    { id: 'products', icon: '🛒', title: 'B2B 상품 리스트', description: '공급사 상품을 서비스별로 탐색하고 신청·주문합니다.', onClick: () => navigate('/hub/b2b') },
    { id: 'campaign', icon: '📋', title: '캠페인 · 설문', description: '약사회 캠페인에 참여하고 설문에 응답합니다.', badge: '준비중' },
  ], [navigate]);

  // ── Services Section (afterSections slot) ──
  const servicesAfter = (
    <div id="hub-services-section">
      <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>추천 서비스</h2>
      <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748B' }}>플랫폼이 권하는 서비스를 발견하고 이용을 신청하세요.</p>
      <RecommendedServicesSection />
    </div>
  );

  return (
    <HubExplorationLayout
      theme={{ maxWidth: '1100px' }}
      hero={{ slides: heroSlides, autoInterval: heroSlides.length > 1 ? 5000 : 0 }}
      b2bRevenue={b2bItems.length > 0 ? { items: b2bItems, title: 'B2B', ctaLabel: 'B2B 전체 보기', onCtaClick: () => navigate('/hub/b2b') } : undefined}
      ads={ads.length > 0 ? { ads } : undefined}
      productDevelopment={{ items: productDevItems, title: '제품개발 참여', ctaLabel: '제품개발 전체 보기' }}
      platformContent={{ items: contentItems, title: '플랫폼 콘텐츠', ctaLabel: '콘텐츠 전체 보기', onCtaClick: () => navigate('/hub/content') }}
      recentUpdates={{ tabs: [...HUB_FIXED_TABS], items: updateItems }}
      coreServices={{ banners: coreServiceBanners, title: '핵심 서비스' }}
      promotions={promos.length > 0 ? { banners: promos, title: '프로모션' } : undefined}
      aiPlaceholder={{ title: 'AI 추천 예정', description: 'AI 기반 맞춤 상품·콘텐츠 추천이 준비 중입니다' }}
      afterSections={servicesAfter}
      footerNote={`여기서 선택한 콘텐츠·상품·서비스는 내 매장관리에서 관리할 수 있습니다.`}
    />
  );
}
