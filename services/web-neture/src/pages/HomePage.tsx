/**
 * Neture Home 페이지
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 *
 * 정보 구조 (순서 고정):
 * ① o4o 개념 소개 (Hero)
 * ② o4o 생태계 구조 설명
 * ③ 네뚜레의 역할 설명
 * ④ 서비스별 참여 배너 (공급자 + 파트너)
 * ⑤ 참여자 유형별 안내 (전환 구간)
 * ⑥ 하단 포럼 (의견 수렴)
 * Footer Summary
 */

import {
  HomeHeroSection_v2,
  HomeCoreValueSection_v2,
  HomeNetureRoleSection,
  HomeSupplierSection,
  HomePartnerSection,
  HomeB2BIntroSection_v2,
  HomeFooterSummary,
  HomeForumSection,
} from '../components';

export function HomePage() {
  return (
    <div>
      {/* ① o4o 개념 소개 섹션 */}
      <HomeHeroSection_v2 />

      {/* ② o4o 생태계 구조 설명 섹션 */}
      <HomeCoreValueSection_v2 />

      {/* ③ 네뚜레의 역할 설명 섹션 */}
      <HomeNetureRoleSection />

      {/* ④ 서비스별 참여 배너 영역 (보조 동선) */}
      <HomeSupplierSection />
      <HomePartnerSection />

      {/* ⑤ 참여자 유형별 안내 섹션 (전환 구간) */}
      <HomeB2BIntroSection_v2 />

      {/* ⑥ Home 하단 포럼 섹션 (의견 수렴) */}
      <HomeForumSection />

      {/* Footer Summary */}
      <HomeFooterSummary />
    </div>
  );
}
