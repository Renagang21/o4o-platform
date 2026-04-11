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

import { Link } from 'react-router-dom';
import HeroSlider from '../components/home/HeroSlider';
import { PlatformIntroSection } from '../components/home/PlatformIntroSection';
import HomepageAds from '../components/home/HomepageAds';
import { LatestUpdatesSection } from '../components/home/LatestUpdatesSection';
import { CommunityPreviewSection } from '../components/home/CommunityPreviewSection';
import { FeaturedSection } from '../components/home/FeaturedSection';
import PartnerLogoCarousel from '../components/home/PartnerLogoCarousel';
import { HomeCtaSection } from '../components/home/HomeCtaSection';

/**
 * WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1:
 * Neture 공급자 관점 — 시범판매 제안 배너
 */
function MarketTrialBanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div
        className="rounded-xl p-6 border border-violet-200"
        style={{ background: 'linear-gradient(to right, #f5f3ff, #faf5ff)' }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              시범판매 (Market Trial)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              공급자로서 신제품 시범판매를 제안하세요. 승인 후 KPA-a 허브를 통해 약국 파트너에게 노출됩니다.
            </p>
          </div>
          <Link
            to="/supplier/market-trial/new"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap"
          >
            시범판매 제안하기
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function NetureHomePage() {
  return (
    <div className="min-h-screen">
      <HeroSlider />
      <PlatformIntroSection />
      <HomepageAds />
      <MarketTrialBanner />
      <LatestUpdatesSection />
      <CommunityPreviewSection />
      <FeaturedSection />
      <PartnerLogoCarousel />
      <HomeCtaSection />
    </div>
  );
}
