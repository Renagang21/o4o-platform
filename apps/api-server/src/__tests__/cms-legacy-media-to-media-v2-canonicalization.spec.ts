/**
 * CMS legacy media(cms_media) → Media V2(media_assets) 정본화 계약
 *
 * WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1
 * 근거 조사: IR-O4O-CMS-MEDIA-PAGE-VIEW-LEGACY-RUNTIME-AND-MEDIA-V2-OWNERSHIP-CENSUS-V1
 *
 * 판정 근거
 *   - `cms_media` 의 유일한 생성 주체는 `packages/cms-core/src/lifecycle/install.ts` 인데
 *     `install` 을 호출하는 코드가 저장소 전체에 0건이라 테이블이 생성된 적이 없다.
 *   - 운영 실측(2026-09-13): `GET /api/v1/content/assets` · `/stats` 가
 *     `relation "cms_media" does not exist` 로 상시 500. 30일 로그 46건.
 *   - 미디어 정본은 `media_assets` + `media_entity_links`, API 정본은
 *     `/api/v1/platform/media-library*` 이며 운영 200 이다.
 *
 * 본 spec 은 legacy 축의 **재도입 방지**와 정본 축의 **보존**을 함께 고정한다.
 * `cms_media` 테이블을 만드는 migration 을 추가하는 방향은 채택하지 않았다(저장축 재중복).
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const ADMIN = join(REPO, 'apps', 'admin-dashboard', 'src');

const read = (p: string) => readFileSync(p, 'utf8');

describe('CMS legacy media → Media V2 정본화', () => {
  describe('A. legacy content-assets 축 제거', () => {
    it('content-assets.routes.ts 파일이 존재하지 않는다', () => {
      expect(existsSync(join(SRC, 'routes', 'content', 'content-assets.routes.ts'))).toBe(false);
    });

    it('register-routes.ts 가 content assets 라우터를 등록하지 않는다', () => {
      const s = read(join(SRC, 'bootstrap', 'register-routes.ts'));
      expect(s).not.toMatch(/createContentAssetsRoutes/);
      expect(s).not.toMatch(/app\.use\(\s*['"]\/api\/v1\/content\/assets['"]/);
    });

    it('api-server 활성 소스에 /api/v1/content/assets 라우트 마운트가 없다', () => {
      const s = read(join(SRC, 'bootstrap', 'register-routes.ts'));
      // 주석으로 남긴 제거 사유는 허용하되, 실제 마운트 구문은 없어야 한다.
      const mounts = s.split('\n').filter((l) => !l.trim().startsWith('//') && l.includes("'/api/v1/content/assets'"));
      expect(mounts).toEqual([]);
    });

    it('admin-dashboard 에 content-assets API 클라이언트·화면이 없다', () => {
      expect(existsSync(join(ADMIN, 'api', 'content-assets.api.ts'))).toBe(false);
      expect(existsSync(join(ADMIN, 'pages', 'content', 'assets'))).toBe(false);
      expect(existsSync(join(ADMIN, 'pages', 'content', 'analytics'))).toBe(false);
    });

    it('admin 라우트에 /content/assets · /content/analytics 선언이 없다', () => {
      const s = read(join(ADMIN, 'routes', 'content.routes.tsx'));
      const decls = s
        .split('\n')
        .filter((l) => !l.trim().startsWith('//') && /path="\/content\/(assets|analytics)/.test(l));
      expect(decls).toEqual([]);
    });
  });

  describe('A-2. dashboard-assets 의 cms_media 축 제거 (중지 조건 해소 단계)', () => {
    const DASH = join(SRC, 'routes', 'dashboard');
    const SERVICES = join(REPO, 'services');
    const codeLines = (p: string) =>
      read(p)
        .split('\n')
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));

    it('copy · mutation · types 핸들러 파일과 dashboard-access.guard 가 존재하지 않는다', () => {
      expect(existsSync(join(DASH, 'dashboard-assets.copy-handlers.ts'))).toBe(false);
      expect(existsSync(join(DASH, 'dashboard-assets.mutation-handlers.ts'))).toBe(false);
      expect(existsSync(join(DASH, 'dashboard-assets.types.ts'))).toBe(false);
      expect(existsSync(join(SRC, 'utils', 'dashboard-access.guard.ts'))).toBe(false);
    });

    it('라우터에는 supplier-signal · seller-signal 만 남는다', () => {
      const routes = codeLines(join(DASH, 'dashboard-assets.routes.ts')).filter((l) =>
        /router\.(get|post|patch|delete)\(/.test(l),
      );
      expect(routes.map((l) => l.trim())).toEqual([
        "router.get('/supplier-signal', authenticate, createGetSupplierSignalHandler(dataSource));",
        "router.get('/seller-signal', authenticate, createGetSellerSignalHandler(dataSource));",
      ]);
    });

    it("query-handlers 가 cms_media 를 참조하지 않고 'does not exist' 를 삼키지 않는다", () => {
      const code = codeLines(join(DASH, 'dashboard-assets.query-handlers.ts'));
      expect(code.some((l) => /CmsMedia|cms_media/.test(l))).toBe(false);
      expect(code.some((l) => /does not exist/.test(l))).toBe(false);
    });

    it('CmsMedia 계열 entity 가 cms-core 에 없고 entities.ts 에 등록되지 않는다', () => {
      const ent = join(REPO, 'packages', 'cms-core', 'src', 'entities');
      for (const f of ['CmsMedia', 'CmsMediaFile', 'CmsMediaFolder', 'CmsMediaTag']) {
        expect(existsSync(join(ent, `${f}.entity.ts`))).toBe(false);
      }
      const reg = codeLines(join(SRC, 'database', 'entities.ts'));
      expect(reg.some((l) => /\bCmsMedia(File|Folder|Tag)?\b/.test(l))).toBe(false);
    });

    it('cms-core lifecycle · manifest 가 cms_media 계열 테이블을 다루지 않는다', () => {
      // WO-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1 에서 install/uninstall 자체가
      // 제거됐다 — 파일이 없으면 통과, 남아 있다면 cms_media 를 다루지 않아야 한다.
      const lc = join(REPO, 'packages', 'cms-core', 'src', 'lifecycle');
      for (const f of ['install.ts', 'uninstall.ts']) {
        if (existsSync(join(lc, f))) {
          expect(codeLines(join(lc, f)).some((l) => /cms_media/.test(l))).toBe(false);
        }
      }
      expect(
        codeLines(join(REPO, 'packages', 'cms-core', 'src', 'manifest.ts')).some((l) => /'cms_media/.test(l)),
      ).toBe(false);
    });

    it('두 웹 서비스에 dashboard-assets 프런트 소비자가 없다 (signal 제외)', () => {
      for (const f of [
        join(SERVICES, 'web-kpa-society', 'src', 'api', 'dashboard.ts'),
        join(SERVICES, 'web-kpa-society', 'src', 'pages', 'dashboard', 'MyContentPage.tsx'),
        join(SERVICES, 'web-neture', 'src', 'lib', 'api', 'dashboardCopy.ts'),
        join(SERVICES, 'web-neture', 'src', 'pages', 'dashboard', 'MyContentPage.tsx'),
      ]) {
        expect(existsSync(f)).toBe(false);
      }
      const neture = codeLines(join(SERVICES, 'web-neture', 'src', 'lib', 'api', 'content.ts'));
      expect(neture.some((l) => /dashboard\/assets/.test(l))).toBe(false);
    });

    it('supplier-signal 소비자는 보존된다 (Neture HubPage → dashboardApi)', () => {
      const dash = read(join(SERVICES, 'web-neture', 'src', 'lib', 'api', 'dashboard.ts'));
      expect(dash).toMatch(/\/dashboard\/assets\/supplier-signal/);
      expect(dash).toMatch(/\/dashboard\/assets\/seller-signal/);
      const hub = read(join(SERVICES, 'web-neture', 'src', 'pages', 'hub', 'HubPage.tsx'));
      expect(hub).toMatch(/dashboardApi\.getSupplierSignal\(\)/);
    });

    it('제거된 딥링크는 compatibility 화면 없이 상위 경로로만 보낸다', () => {
      const kpa = read(join(SERVICES, 'web-kpa-society', 'src', 'App.tsx'));
      expect(kpa).toMatch(/path="\/my-content" element=\{<Navigate to="\/mypage" replace \/>\}/);
      expect(kpa).not.toMatch(/MyContentPage/);
      const neture = read(join(SERVICES, 'web-neture', 'src', 'App.tsx'));
      expect(neture).toMatch(/path="\/workspace\/my-content" element=\{<Navigate to="\/" replace \/>\}/);
      expect(neture).not.toMatch(/import MyContentPage/);
    });
  });

  describe('B. cms_media 대체 테이블을 만들지 않는다', () => {
    it('cms_media 를 생성하는 migration 이 없다', () => {
      const dir = join(SRC, 'database', 'migrations');
      const hits = readdirSync(dir)
        .filter((f: string) => f.endsWith('.ts'))
        .filter((f: string) => /CREATE\s+TABLE[^;]*cms_media/i.test(read(join(dir, f))));
      expect(hits).toEqual([]);
    });

    it('compatibility alias 로 content/assets 를 다시 노출하지 않는다', () => {
      const s = read(join(SRC, 'bootstrap', 'register-routes.ts'));
      const aliases = s
        .split('\n')
        .filter((l) => !l.trim().startsWith('//'))
        .filter((l) => /content\/assets/.test(l));
      expect(aliases).toEqual([]);
    });
  });

  describe('C. Media V2 정본 보존', () => {
    it('media-library 라우터가 /api/v1/platform 에 등록돼 있다', () => {
      const s = read(join(SRC, 'bootstrap', 'register-routes.ts'));
      expect(s).toMatch(/createMediaLibraryRouter/);
    });

    it('MediaAsset entity 와 media_assets 테이블명이 유지된다', () => {
      const s = read(join(SRC, 'modules', 'media', 'entities', 'MediaAsset.entity.ts'));
      expect(s).toMatch(/@Entity\(\{\s*name:\s*'media_assets'\s*\}\)/);
    });

    it('media_entity_links 계약(automation 재사용 포함)이 유지된다', () => {
      const s = read(join(SRC, 'modules', 'automation', 'services', 'automation-job.service.ts'));
      expect(s).toMatch(/media_entity_links/);
    });

    it('admin 미디어 정본 화면이 존재한다', () => {
      expect(existsSync(join(ADMIN, 'pages', 'content-resource', 'MediaAssetsPage.tsx'))).toBe(true);
    });
  });

  describe('D. 관리자 진입점', () => {
    it('메뉴가 미디어 정본 경로를 노출하고 깨진 legacy 경로를 노출하지 않는다', () => {
      const s = read(join(ADMIN, 'admin', 'menu', 'admin-menu.static.tsx'));
      expect(s).toMatch(/path:\s*'\/content-resource\/media-assets'/);
      const legacyPaths = s
        .split('\n')
        .filter((l) => !l.trim().startsWith('//'))
        .filter((l) => /path:\s*'\/content\/(assets|analytics)'/.test(l));
      expect(legacyPaths).toEqual([]);
    });

    it('rolePermissions 의 메뉴 id 가 메뉴 정의와 어긋나지 않는다', () => {
      const s = read(join(ADMIN, 'config', 'rolePermissions.ts'));
      expect(s).toMatch(/menuId:\s*'content-media-library'/);
      const stale = s
        .split('\n')
        .filter((l) => !l.trim().startsWith('//'))
        .filter((l) => /menuId:\s*'content-(assets|analytics)'/.test(l));
      expect(stale).toEqual([]);
    });

    it('Content Overview 타일에 데드링크가 없다', () => {
      const s = read(join(ADMIN, 'pages', 'content', 'index.tsx'));
      const dead = s
        .split('\n')
        .filter((l) => !l.trim().startsWith('//'))
        .filter((l) => /path:\s*'\/content\/(assets|analytics)'/.test(l));
      expect(dead).toEqual([]);
    });
  });
});
