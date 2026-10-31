/**
 * Community Home / Nav canonical convergence 정적 고정
 * — WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §16
 *
 * 고정 대상:
 *   1. KPA-Society / Pharmacy-Hub 커뮤니티 홈이 **같은 공통 컨테이너**
 *      `CommunityServiceHome` 을 소비한다 (JSX fork 금지 §8).
 *   2. 두 서비스 헤더가 **같은 공통 조립기** `buildCommunityPrimaryNav` 를 쓴다 (§9).
 *   3. 두 서비스 푸터가 **같은 공통 View** `CommunitySiteFooter` 를 쓴다 (§14).
 *   4. 공통 부품은 service-neutral 이다 — serviceKey 분기 · API client 의존 금지 (§4).
 *   5. KPA 본체에 지부·분회·데모 잔재가 되살아나지 않는다 (§3).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const KPA_HOME = 'services/web-pharmacy-business/src/pages/CommunityHomePage.tsx';
const KPA_HEADER = 'services/web-pharmacy-business/src/components/KpaGlobalHeader.tsx';
const KPA_FOOTER = 'services/web-pharmacy-business/src/components/Footer.tsx';

// WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: 옛 KPA 커뮤니티 홈(CommunityHomePage)은 제거됐다 — pharmacy 홈은 회원 홈이다.
//   공통 컨테이너 CommunityServiceHome 자체의 계약은 아래 §4 service-neutral 검사가 지킨다.
describe('community home 공통 컨테이너 채택 (§8)', () => {
  it('옛 KPA 커뮤니티 홈은 존재하지 않는다', () => {
    expect(existsSync(resolve(ROOT, KPA_HOME))).toBe(false);
  });
});

describe('primary nav 공통 조립기 채택 (§9)', () => {
  for (const [name, path] of [['KPA-Society', KPA_HEADER],] as const) {
    it(`${name} 헤더가 buildCommunityPrimaryNav 를 쓴다`, () => {
      const src = read(path);
      expect(src).toContain('buildCommunityPrimaryNav');
      expect(src).toContain("from '@o4o/ui'");
    });

    it(`${name} 헤더가 메뉴 항목을 하드코딩하지 않는다`, () => {
      const src = stripComments(read(path));
      expect(src).toContain("from '../config/navigation'");
      // 조립을 손으로 다시 하지 않는다
      expect(src).not.toContain('filterContextualNav(');
    });
  }

  it('공통 조립기는 서비스 분기를 두지 않는다', () => {
    const src = stripComments(read('packages/ui/src/layout/buildCommunityPrimaryNav.ts'));
    expect(src).not.toContain('serviceKey');
    expect(src).not.toContain('kpa');
    expect(src).not.toContain('pharmacy-hub');
  });
});

describe('공개 푸터 공통 View 채택 (§14)', () => {
  for (const [name, path] of [['KPA-Society', KPA_FOOTER],] as const) {
    it(`${name} 푸터가 공통 ServiceFooter와 기존 법정정보·메뉴 출처를 쓴다`, () => {
      const src = stripComments(read(path));
      expect(src).toContain('ServiceFooter');
      expect(src).toContain("from '@o4o/auth-react'");
      expect(src).toContain('FOOTER_SECTIONS');
      expect(src).toContain('PublicLegalFooterInfo');
    });

    it(`${name} 푸터에 자체 마크업 사본이 남아있지 않다`, () => {
      const src = stripComments(read(path));
      expect(src).not.toContain('<footer');
      expect(src).not.toContain('const styles');
    });
  }
});

describe('공통 부품 service-neutral (§4)', () => {
  it('CommunityServiceHome 은 API client · serviceKey · router 를 모르지 않는다', () => {
    const src = stripComments(read('packages/shared-space-ui/src/community/CommunityServiceHome.tsx'));
    expect(src).not.toContain('axios');
    expect(src).not.toContain('fetch(');
    expect(src).not.toContain('react-router');
    expect(src).not.toContain("serviceKey ===");
  });

  it('CommunitySiteFooter 는 링크를 하드코딩하지 않는다', () => {
    const src = stripComments(read('packages/shared-space-ui/src/community/CommunitySiteFooter.tsx'));
    expect(src).not.toContain('/privacy');
    expect(src).not.toContain('/terms');
    expect(src).not.toContain('/forum');
    expect(src).not.toContain("serviceKey ===");
  });
});

describe('KPA 지부·분회·데모 잔재 재발 방지 (§3)', () => {
  const GONE = [
    'services/web-pharmacy-business/src/contexts/OrganizationContext.tsx',
    'services/web-pharmacy-business/src/types/pharmacist.ts',
    'services/web-pharmacy-business/src/components/ServiceBanner.tsx',
    'services/web-pharmacy-business/src/components/platform/PlatformHeader.tsx',
    'services/web-pharmacy-business/src/components/platform/PlatformFooter.tsx',
    'services/web-pharmacy-business/src/components/platform/ServiceCard.tsx',
    'services/web-pharmacy-business/src/pages/mypage/AnnualReportFormPage.tsx',
    // WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: 안내 페이지 layout 도 함께 제거됐다.
    'services/web-pharmacy-business/src/components/platform/InfoPageLayout.tsx',
  ];

  for (const p of GONE) {
    it(`${p.split('/').pop()} 는 KPA 본체에 없다 (분회 업무는 web-kpa-branch 소관)`, () => {
      expect(existsSync(resolve(ROOT, p))).toBe(false);
    });
  }

  it('KPA App 에 OrganizationProvider 가 되살아나지 않는다', () => {
    expect(read('services/web-pharmacy-business/src/App.tsx')).not.toContain('OrganizationProvider');
  });
});
