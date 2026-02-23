/**
 * GlycoPharmHubPage - GlycoPharm 공용공간 (Market Layer)
 *
 * WO-O4O-HUB-EXPLORATION-CORE-V1
 * WO-O4O-HUB-DATA-UNIFICATION-V1: CMS 슬롯 연동
 * WO-O4O-HUB-CMS-SLOT-STRUCTURE-ALIGNMENT-V1: 공통 슬롯 키 + 광고 연동
 *
 * hub-exploration-core thin wrapper.
 * 서비스별 데이터만 다르고 구조는 플랫폼 공통.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HubExplorationLayout,
  HUB_FIXED_TABS,
  type HeroSlide,
  type CoreServiceBanner,
  type PromotionBanner,
  type AdItem,
  type B2BPreviewItem,
  type ProductDevItem,
} from '@o4o/hub-exploration-core';
import { cmsApi } from '../../api/cms';
import type { CmsSlot } from '../../api/cms';
import { getCatalog } from '../../api/pharmacyProducts';
import type { CatalogProduct } from '../../api/pharmacyProducts';

// ── CMS 매핑 ──

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

// ── B2B Catalog → B2BPreviewItem 매핑 ──

function catalogToB2BItem(p: CatalogProduct, navigate: (path: string) => void): B2BPreviewItem {
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.supplierLogoUrl ?? undefined,
    badge: p.category ?? undefined,
    supplierName: p.supplierName,
    onClick: () => navigate('/store'),
  };
}

// ── CMS Slot → ProductDevItem 매핑 ──

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

// ── Default Hero (fallback) ──

const DEFAULT_HERO: HeroSlide[] = [{
  id: 'main',
  backgroundColor: '#0d9488',
  title: 'GlycoPharm HUB',
  subtitle: '혈당관리 전문 플랫폼이 제공하는 자원을 탐색하세요',
}];

export function GlycoPharmHubPage() {
  const navigate = useNavigate();

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO);
  const [promos, setPromos] = useState<PromotionBanner[]>([]);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [b2bItems, setB2bItems] = useState<B2BPreviewItem[]>([]);
  const [productDevItems, setProductDevItems] = useState<ProductDevItem[]>([]);

  // CMS 슬롯 로드 (1회) — 공통 슬롯 키, serviceKey로 분기
  useEffect(() => {
    let cancelled = false;

    cmsApi.getSlots('hub-hero', { serviceKey: 'glycopharm' })
      .then(res => {
        if (!cancelled && res.data.length > 0) {
          setHeroSlides(res.data
            .filter(s => s.content)
            .map(s => cmsSlotToHeroSlide(s, navigate)));
        }
      })
      .catch(() => {});

    cmsApi.getSlots('hub-promotion', { serviceKey: 'glycopharm' })
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
      cmsApi.getSlots('hub-ad-premium', { serviceKey: 'glycopharm' }),
      cmsApi.getSlots('hub-ad-normal', { serviceKey: 'glycopharm' }),
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
    cmsApi.getSlots('hub-product-dev', { serviceKey: 'glycopharm' })
      .then(res => {
        if (!cancelled) {
          setProductDevItems(res.data
            .filter(s => s.content)
            .map(s => cmsSlotToProductDev(s, navigate)));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [navigate]);

  const coreServiceBanners: CoreServiceBanner[] = useMemo(() => [
    { id: 'b2b', icon: '🛒', title: 'B2B 공급', description: '공급사 상품을 탐색하고 약국 매장에 신청합니다.', onClick: () => navigate('/store') },
    { id: 'content', icon: '📝', title: '플랫폼 콘텐츠', description: 'CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.', onClick: () => navigate('/store') },
    { id: 'signage', icon: '🖥️', title: '디지털 사이니지', description: '매장 디스플레이에 활용할 미디어를 탐색합니다.', onClick: () => navigate('/pharmacy/signage') },
    { id: 'campaign', icon: '📋', title: '캠페인', description: '플랫폼 캠페인에 참여합니다.', badge: '준비중' },
  ], [navigate]);

  return (
    <HubExplorationLayout
      theme={{ primaryColor: '#0d9488', maxWidth: '1100px' }}
      hero={{ slides: heroSlides, autoInterval: heroSlides.length > 1 ? 5000 : 0 }}
      b2bRevenue={b2bItems.length > 0 ? { items: b2bItems, title: 'B2B 공급 기회', ctaLabel: 'B2B 전체 보기', onCtaClick: () => navigate('/store') } : undefined}
      ads={ads.length > 0 ? { ads } : undefined}
      productDevelopment={productDevItems.length > 0 ? { items: productDevItems, title: '제품개발 참여' } : undefined}
      recentUpdates={{ tabs: [...HUB_FIXED_TABS], items: [] }}
      coreServices={{ banners: coreServiceBanners, title: '핵심 서비스' }}
      promotions={promos.length > 0 ? { banners: promos, title: '프로모션' } : undefined}
      aiPlaceholder={{ title: 'AI 추천 예정', description: 'AI 기반 맞춤 상품·콘텐츠 추천이 준비 중입니다' }}
      footerNote="여기서 선택한 콘텐츠·상품·서비스는 내 매장관리에서 관리할 수 있습니다."
    />
  );
}
