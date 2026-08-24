/**
 * Footer — Pharmacy-Hub 공개 푸터
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §14:
 *   푸터 View 를 공통 `CommunitySiteFooter`(@o4o/shared-space-ui) 로 이관했다.
 *   KPA-Society 가 같은 View 를 자기 config 로 소비한다 — 사본을 만들지 않는다.
 *
 * **링크는 Pharmacy-Hub 에 실제로 존재하는 route 만** 담는다(config/navigation.ts 의 SSOT).
 * 법정정보는 하드코딩 금지 — ServiceLegalProfile public API 값이 있을 때만 표시하며
 * 미설정/비활성/오류 시 해당 영역만 비표시된다(PublicLegalFooterInfo 계약).
 */

import { Pill } from 'lucide-react';
import { CommunitySiteFooter, PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { BRAND, SERVICE_KEY } from '../config/service';
import { PH_FOOTER_SECTIONS } from '../config/navigation';
import { loadFooterLegal } from '../lib/footerLegal';

export default function Footer() {
  return (
    <CommunitySiteFooter
      brand={{
        icon: <Pill className="h-5 w-5 text-white" aria-hidden="true" />,
        name: BRAND.name,
        tagline: BRAND.tagline,
        subtitle: BRAND.domain,
        accentColor: '#0d9488',
      }}
      sections={PH_FOOTER_SECTIONS}
      copyright={`© 2026 ${BRAND.name}. All rights reserved.`}
      legalSlot={<PublicLegalFooterInfo serviceKey={SERVICE_KEY} loadProfile={loadFooterLegal} />}
    />
  );
}
