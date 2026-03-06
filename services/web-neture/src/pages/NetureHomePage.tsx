/**
 * NetureHomePage - Neture 플랫폼 메인 홈
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 구조:
 * 1. Hero Slider
 * 2. 플랫폼 소개
 * 3. 광고 섹션
 * 4. Latest Updates
 * 5. Community Preview
 * 6. Featured Section
 * 7. Supplier / Partner CTA
 */

import { HeroSliderSection } from '../components/home/HeroSliderSection';
import { PlatformIntroSection } from '../components/home/PlatformIntroSection';
import { AdSection } from '../components/home/AdSection';
import { LatestUpdatesSection } from '../components/home/LatestUpdatesSection';
import { CommunityPreviewSection } from '../components/home/CommunityPreviewSection';
import { FeaturedSection } from '../components/home/FeaturedSection';
import { HomeCtaSection } from '../components/home/HomeCtaSection';

export default function NetureHomePage() {
  return (
    <div className="min-h-screen">
      <HeroSliderSection />
      <PlatformIntroSection />
      <AdSection />
      <LatestUpdatesSection />
      <CommunityPreviewSection />
      <FeaturedSection />
      <HomeCtaSection />
    </div>
  );
}
