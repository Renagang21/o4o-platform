/**
 * NetureHomePage - Neture 플랫폼 메인 홈
 *
 * WO-O4O-NETURE-UI-REFACTORING-V1
 * WO-O4O-NETURE-HOME-CONTENT-V1: CMS 기반 콘텐츠 전환
 *
 * 구조:
 * 1. Hero Slider (CMS → 정적 폴백)
 * 2. 플랫폼 소개 (정적)
 * 3. 광고 3단 (CMS → 데이터 없으면 미표시)
 * 4. Latest Updates (API)
 * 5. Community Preview (API+정적)
 * 6. Featured Section (API+정적)
 * 7. 파트너 로고 캐러셀 (CMS → 데이터 없으면 미표시)
 * 8. Supplier / Partner CTA (정적)
 */

import HeroSlider from '../components/home/HeroSlider';
import { PlatformIntroSection } from '../components/home/PlatformIntroSection';
import HomepageAds from '../components/home/HomepageAds';
import { LatestUpdatesSection } from '../components/home/LatestUpdatesSection';
import { CommunityPreviewSection } from '../components/home/CommunityPreviewSection';
import { FeaturedSection } from '../components/home/FeaturedSection';
import PartnerLogoCarousel from '../components/home/PartnerLogoCarousel';
import { HomeCtaSection } from '../components/home/HomeCtaSection';

export default function NetureHomePage() {
  return (
    <div className="min-h-screen">
      <HeroSlider />
      <PlatformIntroSection />
      <HomepageAds />
      <LatestUpdatesSection />
      <CommunityPreviewSection />
      <FeaturedSection />
      <PartnerLogoCarousel />
      <HomeCtaSection />
    </div>
  );
}
