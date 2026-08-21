/**
 * PharmacyHub 회원 콘텐츠 채택 — 계약/격리 회귀
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1
 *
 * 선행 판정 승계 (WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §8):
 *   원장은 공통 `cms_contents` + `serviceKey`. `pharmacy_hub_contents` 신규 테이블을 만들지 않는다.
 *   이 스펙은 그 결정이 뒤집히지 않도록 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '../../../..');
const read = (p: string) => fs.readFileSync(path.join(REPO, p), 'utf8');

const CLIENT = 'services/web-pharmacy-hub/src/lib/api/pharmacyHubContents.ts';
const LIST_PAGE = 'services/web-pharmacy-hub/src/pages/content/PharmacyHubContentPage.tsx';
const DETAIL_PAGE = 'services/web-pharmacy-hub/src/pages/content/PharmacyHubContentDetailPage.tsx';

describe('PH 회원 콘텐츠 — 원장/격리 계약', () => {
  it('공통 cms_contents 를 소비한다 (신규 backend namespace 0)', () => {
    const s = read(CLIENT);
    expect(s).toContain("const BASE = '/cms/contents'");
    expect(s).not.toMatch(/\/pharmacy-hub\/contents/);
  });

  it("serviceKey 는 'pharmacy-hub' 하나로 고정된다", () => {
    const s = read(CLIENT);
    expect(s).toContain("const SERVICE_KEY = 'pharmacy-hub'");
    for (const other of ['kpa-society', 'k-cosmetics', 'glycopharm', 'neture']) {
      expect(`${other}:${s.includes(other)}`).toBe(`${other}:false`);
    }
  });

  it('상세 응답의 serviceKey 를 클라이언트에서도 재확인한다 (id 단독 조회 방어)', () => {
    expect(read(CLIENT)).toContain('PH_CONTENT_SERVICE_MISMATCH');
  });

  it('조회 실패를 빈 목록으로 삼키지 않는다', () => {
    const s = read(CLIENT);
    expect(s).toContain('PH_CONTENT_LIST_FAILED');
    expect(s).toContain('PH_CONTENT_DETAIL_FAILED');
  });

  it('신규 pharmacy_hub_contents 테이블을 만들지 않았다', () => {
    const migrations = path.join(REPO, 'apps/api-server/src/database/migrations');
    const hits = fs
      .readdirSync(migrations)
      .filter((f) => /\.ts$/.test(f))
      .filter((f) => fs.readFileSync(path.join(migrations, f), 'utf8').includes('pharmacy_hub_contents'));
    expect(hits).toEqual([]);
  });
});

describe('PH 회원 콘텐츠 — 공통 View 채택', () => {
  it('목록은 공통 ContentHubTemplate 을 쓴다 (PH 전용 목록 복제 0)', () => {
    const s = read(LIST_PAGE);
    expect(s).toContain("from '@o4o/shared-space-ui'");
    expect(s).toContain('<ContentHubTemplate');
  });

  it('상세는 공통 CommunityContentDetailView 를 쓴다', () => {
    const s = read(DETAIL_PAGE);
    expect(s).toContain('CommunityContentDetailView');
  });

  it('회원 작성 CTA 를 노출하지 않는다 (공통 CMS 쓰기는 operator/admin 전용 → dead CTA 방지)', () => {
    const s = read(LIST_PAGE);
    expect(s).not.toMatch(/글쓰기|작성하기|새 콘텐츠/);
  });

  it('공통 ContentHubTemplate 확장은 서비스 분기가 아니다', () => {
    const tpl = read('packages/shared-space-ui/src/ContentHubTemplate.tsx');
    expect(tpl).toContain('onItemClick?: (item: ContentHubItem) => void;');
    const code = tpl
      .split('\n')
      .filter((l) => {
        const x = l.trim();
        return x && !x.startsWith('*') && !x.startsWith('//') && !x.startsWith('/*') && !x.startsWith('{/*');
      })
      .join('\n');
    for (const t of ['pharmacy-hub', 'kpa-society', 'glycopharm', 'cosmetics']) {
      expect(`${t}:${code.includes(`'${t}'`)}`).toBe(`${t}:false`);
    }
  });
});

describe('PH 회원 콘텐츠 — route / navigation', () => {
  it('/content · /content/:id 가 MembershipGate 뒤에 등재된다', () => {
    const app = read('services/web-pharmacy-hub/src/App.tsx');
    expect(app).toContain('path="/content"');
    expect(app).toContain('path="/content/:id"');
    expect(app).toContain('<PharmacyHubContentPage />');
    expect(app).toContain('<PharmacyHubContentDetailPage />');
  });

  it('navigation 에 콘텐츠 진입점이 있다 (dead navigation 0)', () => {
    const nav = read('services/web-pharmacy-hub/src/config/navigation.ts');
    expect(nav).toContain("href: '/content'");
  });
});
