/**
 * HomePage - K-Cosmetics 메인 홈
 * WO-KCOS-HOME-UI-V1
 *
 * 성격: S2S 플랫폼 입구 (한국어 고정)
 * 핵심 메시지: "직접 판매하지 않는 플랫폼, 검증된 국내 화장품 매장을 연결"
 */

import {
  PlatformHero,
  TrustSection,
  FeaturedStores,
  HowItWorks,
  DisclaimerSection,
} from '../components/home';

export function HomePage() {
  return (
    <div>
      {/* Hero: 플랫폼 정체성 + 3갈래 CTA */}
      <PlatformHero />

      {/* 신뢰 요소 */}
      <TrustSection />

      {/* 추천 매장 (가격/장바구니 없음) */}
      <FeaturedStores />

      {/* 이용 방법 3단계 */}
      <HowItWorks />

      {/* 책임 고지 */}
      <DisclaimerSection />
    </div>
  );
}
