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

const KPA_HOME = 'services/web-kpa-society/src/pages/CommunityHomePage.tsx';
const PH_HOME = 'services/web-pharmacy-hub/src/pages/community/CommunityHomePage.tsx';
const KPA_HEADER = 'services/web-kpa-society/src/components/KpaGlobalHeader.tsx';
const PH_HEADER = 'services/web-pharmacy-hub/src/components/PharmacyHubGlobalHeader.tsx';
const KPA_FOOTER = 'services/web-kpa-society/src/components/Footer.tsx';
const PH_FOOTER = 'services/web-pharmacy-hub/src/components/Footer.tsx';

describe('community home 공통 컨테이너 채택 (§8)', () => {
  for (const [name, path] of [['KPA-Society', KPA_HOME], ['Pharmacy-Hub', PH_HOME]] as const) {
    it(`${name} 홈이 공통 CommunityServiceHome 을 소비한다`, () => {
      const src = read(path);
      expect(src).toContain("from '@o4o/shared-space-ui'");
      expect(src).toContain('<CommunityServiceHome');
      // 데이터는 서비스 adapter 로 주입한다
      expect(src).toContain('loadNotices');
      expect(src).toContain('loadLatest');
    });

    it(`${name} 홈에 조회 상태 기계 사본이 되살아나지 않는다`, () => {
      const src = stripComments(read(path));
      expect(src).not.toContain('<StandardHomeTemplate');
      expect(src).not.toContain('<LatestActivitySection');
      expect(src).not.toContain('setLatestLoading');
      expect(src).not.toContain('setNoticesError');
    });

    it(`${name} adapter 는 실패를 빈 목록으로 위장하지 않는다`, () => {
      const src = stripComments(read(path));
      // 실패는 throw 로 드러낸다 (4상태 계약: loadError + 재시도)
      expect(src).not.toContain('catch(() => {})');
    });
  }
});

describe('primary nav 공통 조립기 채택 (§9)', () => {
  for (const [name, path] of [['KPA-Society', KPA_HEADER], ['Pharmacy-Hub', PH_HEADER]] as const) {
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
  for (const [name, path] of [['KPA-Society', KPA_FOOTER], ['Pharmacy-Hub', PH_FOOTER]] as const) {
    it(`${name} 푸터가 공통 CommunitySiteFooter 를 쓴다`, () => {
      const src = read(path);
      expect(src).toContain('CommunitySiteFooter');
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

describe('PharmacyHub 홈 canonical 수렴 (§10·§12)', () => {
  const app = read('services/web-pharmacy-hub/src/App.tsx');

  it('서비스 루트 `/` 가 커뮤니티 홈이다', () => {
    expect(app).toContain('<Route path="/" element={<CommunityHomePage />} />');
  });

  it('`/community` 는 canonical 홈으로 redirect 된다 (중복 홈 0)', () => {
    expect(app).toContain('<Route path="/community" element={<Navigate to="/" replace />} />');
  });

  it('서비스 소개형 HomePage 는 폐기됐다', () => {
    expect(existsSync(resolve(ROOT, 'services/web-pharmacy-hub/src/pages/HomePage.tsx'))).toBe(false);
    expect(app).not.toContain("from './pages/HomePage'");
  });
});

describe('KPA 지부·분회·데모 잔재 재발 방지 (§3)', () => {
  const GONE = [
    'services/web-kpa-society/src/contexts/OrganizationContext.tsx',
    'services/web-kpa-society/src/types/pharmacist.ts',
    'services/web-kpa-society/src/components/ServiceBanner.tsx',
    'services/web-kpa-society/src/components/platform/PlatformHeader.tsx',
    'services/web-kpa-society/src/components/platform/PlatformFooter.tsx',
    'services/web-kpa-society/src/components/platform/ServiceCard.tsx',
    'services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx',
  ];

  for (const p of GONE) {
    it(`${p.split('/').pop()} 는 KPA 본체에 없다 (분회 업무는 web-kpa-branch 소관)`, () => {
      expect(existsSync(resolve(ROOT, p))).toBe(false);
    });
  }

  it('KPA App 에 OrganizationProvider 가 되살아나지 않는다', () => {
    expect(read('services/web-kpa-society/src/App.tsx')).not.toContain('OrganizationProvider');
  });

  it('안내 페이지는 canonical Layout 하나만 쓴다 (중복 chrome 0)', () => {
    const src = stripComments(read('services/web-kpa-society/src/components/platform/InfoPageLayout.tsx'));
    expect(src).not.toContain('PlatformHeader');
    expect(src).not.toContain('PlatformFooter');
    expect(src).not.toContain('badgeType');
  });
});
