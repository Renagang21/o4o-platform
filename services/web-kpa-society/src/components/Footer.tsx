/**
 * Footer — KPA Society 공개 푸터
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §14:
 *   inline style 로 손수 짠 1단 링크 나열을 공통 `CommunitySiteFooter`
 *   (@o4o/shared-space-ui) 로 이관했다. Pharmacy-Hub 가 같은 View 를 자기 config 로
 *   소비한다 — 서비스 차이는 config(KPA_FOOTER_SECTIONS)와 브랜드 값에만 있다.
 *
 * WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1:
 *   더미 주소/전화/팩스/이메일 + 하드코딩 사업자번호는 쓰지 않는다.
 *   법정정보는 service_legal_profiles(API) 값이 있을 때만 표시된다.
 */

import { CommunitySiteFooter, PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { KPA_FOOTER_SECTIONS } from '../config/navigation';
import { loadFooterLegal } from '../lib/footerLegal';

export function Footer() {
  return (
    <CommunitySiteFooter
      brand={{
        icon: '💊',
        name: 'KPA-Society',
        tagline: 'AI · 운영자 자료 · 매장 도구를 연결해 작은 약국도 경쟁력을 만듭니다',
        accentColor: '#2563eb',
      }}
      sections={KPA_FOOTER_SECTIONS}
      copyright="Copyright © 2026 약사회. All Rights Reserved."
      legalSlot={<PublicLegalFooterInfo serviceKey="kpa-society" loadProfile={loadFooterLegal} />}
    />
  );
}

export default Footer;
