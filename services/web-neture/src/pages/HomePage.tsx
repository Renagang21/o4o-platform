/**
 * Neture Home 페이지
 * 정체성 전달 + 역할별 진입 안내
 * 업무 기능은 포함하지 않음
 */

import {
  HomeHeroSection,
  HomeCoreValueSection,
  HomeSupplierSection,
  HomePartnerSection,
  HomeB2BIntroSection,
  HomeFooterSummary,
} from '../components';

export function HomePage() {
  return (
    <div>
      <HomeHeroSection />
      <HomeCoreValueSection />
      <HomeSupplierSection />
      <HomePartnerSection />
      <HomeB2BIntroSection />
      <HomeFooterSummary />
    </div>
  );
}
