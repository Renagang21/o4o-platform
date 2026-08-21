/**
 * WO-O4O-MULTI-SITE-BUILDER-SITES-DOMAIN-CENSUS-AND-RETIREMENT-V1
 *   — Multi-Site Builder(`sites`) 도메인 retire 계약 테스트
 *
 * 판정: RETIRE_CONFIRMED
 * ---------------------
 *   - runtime mount 0 — `/api/sites`·`/api/v1/sites` 는 2025-12-03(`fe83e3896`) 에 등록됐다가
 *     2025-12-11 `6354e8755 refactor(api-server): Phase 8-3 Legacy Entity Removal & Service Cleanup`
 *     에서 mount 지점(`config/routes.config.ts`)째로 제거됐고, 그 파일은 현재 존재하지 않는다.
 *   - repository consumer 0 — `getRepository(Site)` 는 `sites.routes.ts` 내부에만 있었다.
 *   - production `sites` 테이블 0 — `to_regclass('public.sites')` = null.
 *   - executed migration 0 — `typeorm_migrations` 에 CreateSitesTable 이력 없음.
 *   - active UI 0 — `pages/site-builder/*` 는 이미 삭제됨, 잔여 참조 0.
 *   - provisioning 의존 0 — service-templates/service-initializer/AppStoreService 에 Site 참조 없음.
 *   - unique 기능 0 — scaffolding service 는 항상 null 을 반환하는 stub 이었다.
 *
 * `branch_sites`(KPA 분회 홈페이지)는 **별개 ACTIVE 도메인**이며 이 WO 의 대상이 아니다.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB·네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const ENTITIES = path.join(SRC, 'database', 'entities.ts');
const REGISTER_ROUTES = path.join(SRC, 'bootstrap', 'register-routes.ts');

const RETIRED_FILES: Array<[string, string]> = [
  ['modules/sites/site.entity.ts', path.join(SRC, 'modules', 'sites', 'site.entity.ts')],
  ['modules/sites/sites.routes.ts', path.join(SRC, 'modules', 'sites', 'sites.routes.ts')],
  ['modules/sites/index.ts', path.join(SRC, 'modules', 'sites', 'index.ts')],
  ['modules/sites/dto/create-site.dto.ts', path.join(SRC, 'modules', 'sites', 'dto', 'create-site.dto.ts')],
  ['modules/sites/dto/scaffold-site.dto.ts', path.join(SRC, 'modules', 'sites', 'dto', 'scaffold-site.dto.ts')],
];

describe('WO-O4O-MULTI-SITE-BUILDER-SITES-DOMAIN-CENSUS-AND-RETIREMENT-V1', () => {
  describe('retire 된 파일이 되살아나지 않는다', () => {
    it.each(RETIRED_FILES)('%s 는 존재하지 않는다', (_label, file) => {
      expect(fs.existsSync(file)).toBe(false);
    });

    it('modules/sites 디렉터리 자체가 없다', () => {
      expect(fs.existsSync(path.join(SRC, 'modules', 'sites'))).toBe(false);
    });
  });

  describe('entity 등록 계약', () => {
    const source = fs.readFileSync(ENTITIES, 'utf-8');

    it('Site entity 를 import 하지 않는다', () => {
      expect(source).not.toMatch(/from\s+'\.\.\/modules\/sites\//);
    });

    it('entities 배열에 Site 를 등록하지 않는다', () => {
      const registered = source
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => !line.startsWith('//'));
      expect(registered).not.toContain('Site,');
    });

    it('BranchSite(별개 ACTIVE 도메인)는 유지된다', () => {
      expect(source).toContain('BranchSite');
    });
  });

  describe('mount 계약', () => {
    const source = fs.readFileSync(REGISTER_ROUTES, 'utf-8');

    it("'/api/sites'·'/api/v1/sites' 를 app.use 로 등록하지 않는다", () => {
      const mountLines = source
        .split('\n')
        .filter((line) => /app\.use\(/.test(line) && !/^\s*\/\//.test(line));
      expect(mountLines.some((line) => /'\/api(\/v1)?\/sites'/.test(line))).toBe(false);
    });

    it('retire 사유가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      expect(source).toContain('RETIRE_CONFIRMED');
    });
  });

  describe('mount 지점 자체가 복원되지 않는다', () => {
    it('config/routes.config.ts (구 setupRoutes) 는 존재하지 않는다', () => {
      expect(fs.existsSync(path.join(SRC, 'config', 'routes.config.ts'))).toBe(false);
    });
  });
});
