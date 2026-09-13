/**
 * cms-core lifecycle 스키마 소유권 · CPT/ACF 사슬 · dead entity 은퇴 계약
 *
 * WO-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1
 * 근거 조사: IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1
 *
 * 판정 근거 (실측)
 *   - cms-core lifecycle install() 을 호출하는 코드가 저장소 전체에 0 → 그것이 만들던 12 테이블은
 *     운영에 존재한 적이 없다. migration 도 0.
 *   - cms_cpt_types 는 30일간 `relation does not exist` 116건. 유일한 호출은 admin 로드 시
 *     useDynamicCPTMenu 의 자동 호출(/public/cpt/types)이었고 cpt.service 가 빈 배열로 은폐했다.
 *   - /api/v1/cpt/* 30일 호출 0 · 관리자 메뉴 진입점 0 · 저장소 밖 소비자 0 · 사용자 데이터 0.
 *
 * 본 spec 은 (1) 스키마 소유자가 deploy migration job 하나라는 계약, (2) CPT/ACF 사슬 재도입 방지,
 * (3) 정본(cms_contents · cms_content_slots · O4O Editor · block-renderer · Media V2) 보존을 고정한다.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const ADMIN = join(REPO, 'apps', 'admin-dashboard', 'src');
const CMS_CORE = join(REPO, 'packages', 'cms-core', 'src');

const read = (p: string) => readFileSync(p, 'utf8');
const codeLines = (p: string) =>
  read(p)
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));

const RETIRED_CMS_CORE_ENTITIES = [
  'CmsAcfFieldGroup', 'CmsAcfField', 'CmsAcfValue',
  'CmsCptType', 'CmsCptField',
  'CmsMenu', 'CmsMenuItem', 'CmsMenuLocation',
  'CmsSetting', 'CmsTemplate', 'CmsTemplatePart', 'CmsView',
];
const RETIRED_TABLES = [
  'cms_acf_field_groups', 'cms_acf_fields', 'cms_acf_values',
  'cms_cpt_fields', 'cms_cpt_types',
  'cms_menus', 'cms_menu_items', 'cms_menu_locations',
  'cms_settings', 'cms_templates', 'cms_template_parts', 'cms_views',
  'cms_pages', 'cms_fields',
];

describe('cms-core lifecycle 스키마 · CPT/ACF · dead entity 은퇴', () => {
  describe('A. cms-core 는 테이블을 만들지 않는다 (스키마 소유자 = deploy migration job)', () => {
    it('lifecycle install.ts · uninstall.ts 가 존재하지 않는다', () => {
      expect(existsSync(join(CMS_CORE, 'lifecycle', 'install.ts'))).toBe(false);
      expect(existsSync(join(CMS_CORE, 'lifecycle', 'uninstall.ts'))).toBe(false);
    });

    it('lifecycle/index.ts 는 activate · deactivate 만 export 한다', () => {
      const exps = codeLines(join(CMS_CORE, 'lifecycle', 'index.ts')).filter((l) => /^export/.test(l.trim()));
      expect(exps.map((l) => l.trim()).sort()).toEqual([
        "export { activate } from './activate.js';",
        "export { deactivate } from './deactivate.js';",
      ]);
    });

    it('activate · deactivate 는 CREATE/DROP TABLE 을 실행하지 않는다', () => {
      for (const f of ['activate.ts', 'deactivate.ts']) {
        const code = codeLines(join(CMS_CORE, 'lifecycle', f)).join('\n');
        expect(code).not.toMatch(/CREATE\s+TABLE|DROP\s+TABLE/i);
      }
    });

    it('manifest 는 ownsTables 가 비어 있고 install/uninstall 훅을 선언하지 않는다', () => {
      const code = codeLines(join(CMS_CORE, 'manifest.ts')).join('\n');
      expect(code).toMatch(/ownsTables:\s*\[\s*\]/);
      expect(code).not.toMatch(/install:\s*'\.\/lifecycle/);
      expect(code).not.toMatch(/uninstall:\s*'\.\/lifecycle/);
    });

    it('cms-core 어디에도 CREATE TABLE 문이 없다', () => {
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
        );
      const offenders = walk(CMS_CORE).filter((f) => /CREATE\s+TABLE/i.test(codeLines(f).join('\n')));
      expect(offenders).toEqual([]);
    });
  });

  describe('B. dead entity 14 (12 lifecycle + cms_pages · cms_fields) 제거', () => {
    it.each(RETIRED_CMS_CORE_ENTITIES)('cms-core entity %s 가 존재하지 않는다', (name) => {
      expect(existsSync(join(CMS_CORE, 'entities', `${name}.entity.ts`))).toBe(false);
    });

    it('cms-core entities/index.ts 는 CmsContent · CmsContentSlot · Channel 3종만 export 한다', () => {
      const exps = codeLines(join(CMS_CORE, 'entities', 'index.ts'))
        .filter((l) => /^export \* from/.test(l.trim()))
        .map((l) => l.trim());
      expect(exps.sort()).toEqual(
        [
          "export * from './CmsContent.entity.js';",
          "export * from './CmsContentSlot.entity.js';",
          "export * from './Channel.entity.js';",
          "export * from './ChannelPlaybackLog.entity.js';",
          "export * from './ChannelHeartbeat.entity.js';",
        ].sort(),
      );
    });

    it('api-server modules/cms/entities (Page · View · CustomField · CustomPostType 래퍼) 가 존재하지 않는다', () => {
      expect(existsSync(join(SRC, 'modules', 'cms'))).toBe(false);
    });

    it.each(RETIRED_TABLES)('테이블 %s 를 선언하는 @Entity 가 저장소에 없다', (table) => {
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory()
            ? e.name === 'node_modules' || e.name === 'dist' || e.name === '__tests__' ? [] : walk(join(dir, e.name))
            : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
        );
      const files = [...walk(SRC), ...walk(join(REPO, 'packages', 'cms-core', 'src'))];
      const re = new RegExp(`@Entity\\((\\{[^}]*name:\\s*)?'${table}'`);
      expect(files.filter((f) => re.test(read(f)))).toEqual([]);
    });

    it.each(RETIRED_TABLES)('테이블 %s 를 만드는 migration 을 추가하지 않았다', (table) => {
      const dir = join(SRC, 'database', 'migrations');
      const re = new RegExp(`CREATE\\s+TABLE[^;]*"?${table}"?`, 'i');
      expect(readdirSync(dir).filter((f) => f.endsWith('.ts') && re.test(read(join(dir, f))))).toEqual([]);
    });
  });

  describe('C. CPT/ACF 사슬 제거 (backend)', () => {
    it('routes · services · controllers · module · dto · MetaDataService 가 존재하지 않는다', () => {
      for (const p of [
        ['routes', 'cpt.ts'],
        ['routes', 'public.routes.ts'],
        ['services', 'cpt'],
        ['controllers', 'cpt'],
        ['modules', 'cpt-acf'],
        ['services', 'MetaDataService.ts'],
        ['dto', 'post.dto.ts'],
      ]) {
        expect(existsSync(join(SRC, ...p))).toBe(false);
      }
    });

    it('CPT 계열 entity 7종(+Taxonomy) 이 존재하지 않는다', () => {
      for (const e of ['CustomPostType', 'CustomPost', 'CustomField', 'FormPreset', 'TemplatePreset', 'ViewPreset', 'Taxonomy']) {
        expect(existsSync(join(SRC, 'entities', `${e}.ts`))).toBe(false);
      }
    });

    it('register-routes 가 /api/v1/cpt · /api/v1/public 라우터를 마운트하지 않는다', () => {
      const code = codeLines(join(SRC, 'bootstrap', 'register-routes.ts')).join('\n');
      expect(code).not.toMatch(/app\.use\(\s*'\/api\/v1\/cpt'/);
      expect(code).not.toMatch(/app\.use\(\s*'\/api\/v1\/public',\s*publicRoutes/);
      expect(code).not.toMatch(/cptRoutes|publicRoutes/);
    });

    it("database/entities.ts 에 CPT/ACF/preset/taxonomy 등록이 없다", () => {
      const code = codeLines(join(SRC, 'database', 'entities.ts'));
      const bad = code.filter((l) =>
        /^\s*(CustomPostType|CustomPost|CustomField|CustomFieldValue|FieldGroup|FormPreset|ViewPreset|TemplatePreset|Taxonomy|Term|TermRelationship|CMSCustomField|CMSView|CMSPage),?\s*$/.test(l),
      );
      expect(bad).toEqual([]);
    });

    it("api-server 활성 소스에 'does not exist' 를 CPT 빈 배열로 바꾸던 은폐가 없다", () => {
      // cpt.service.ts:62-65 가 사슬째 사라졌다. 같은 문구가 되살아나지 않는지 고정.
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? (e.name === '__tests__' ? [] : walk(join(dir, e.name))) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
        );
      const offenders = walk(SRC).filter((f) => /CPT table does not exist/.test(read(f)));
      expect(offenders).toEqual([]);
    });
  });

  describe('D. CPT/ACF 사슬 제거 (admin-dashboard)', () => {
    it('pages/cpt-engine · features/cpt-acf · hooks/cpt · components/cpt · useDynamicCPTMenu 가 존재하지 않는다', () => {
      for (const p of [
        ['pages', 'cpt-engine'],
        ['features', 'cpt-acf'],
        ['hooks', 'cpt'],
        ['components', 'cpt'],
        ['hooks', 'useDynamicCPTMenu.tsx'],
      ]) {
        expect(existsSync(join(ADMIN, ...p))).toBe(false);
      }
    });

    it('useAdminMenu 가 동적 CPT 메뉴를 주입하지 않는다 (admin 로드 시 dead API 호출 0)', () => {
      const code = codeLines(join(ADMIN, 'hooks', 'useAdminMenu.ts')).join('\n');
      expect(code).not.toMatch(/useDynamicCPTMenu|injectCPTMenuItems|cptMenuItems|cptLoading/);
    });

    it("admin 활성 소스에 '/cpt/' · '/public/cpt' API 호출이 없다", () => {
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? (e.name === 'tests' ? [] : walk(join(dir, e.name))) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
        );
      const offenders = walk(ADMIN).filter((f) => codeLines(f).some((l) => /['"`]\/(public\/)?cpt\//.test(l)));
      expect(offenders).toEqual([]);
    });

    it('content.routes 에 /cpt-engine 선언이 없고 rolePermissions 에 cpt 접두사·custom-posts 가 없다', () => {
      const routes = codeLines(join(ADMIN, 'routes', 'content.routes.tsx')).join('\n');
      expect(routes).not.toMatch(/path="\/cpt-engine/);
      const perms = codeLines(join(ADMIN, 'config', 'rolePermissions.ts')).join('\n');
      expect(perms).not.toMatch(/prefix:\s*'cpt-'/);
      expect(perms).not.toMatch(/menuId:\s*'custom-posts'/);
    });
  });

  describe('E. 정본 보존', () => {
    it('cms_contents · cms_content_slots entity 와 migration 이 유지된다', () => {
      expect(existsSync(join(CMS_CORE, 'entities', 'CmsContent.entity.ts'))).toBe(true);
      expect(existsSync(join(CMS_CORE, 'entities', 'CmsContentSlot.entity.ts'))).toBe(true);
      expect(existsSync(join(SRC, 'database', 'migrations', '1736500000000-CreateCmsContentTables.ts'))).toBe(true);
      const reg = codeLines(join(SRC, 'database', 'entities.ts')).join('\n');
      expect(reg).toMatch(/\bCmsContent,/);
      expect(reg).toMatch(/\bCmsContentSlot,/);
    });

    it('CMS 콘텐츠 라우트 · Media V2 · block-renderer · content-editor 가 유지된다', () => {
      expect(existsSync(join(SRC, 'routes', 'cms-content', 'cms-content.routes.ts'))).toBe(true);
      expect(existsSync(join(SRC, 'modules', 'media', 'entities', 'MediaAsset.entity.ts'))).toBe(true);
      expect(existsSync(join(REPO, 'packages', 'block-renderer', 'package.json'))).toBe(true);
      expect(existsSync(join(REPO, 'packages', 'content-editor', 'package.json'))).toBe(true);
      expect(existsSync(join(ADMIN, 'pages', 'cms', 'contents', 'ContentFormModal.tsx'))).toBe(true);
    });

    it('cms-core view-system(인메모리 레지스트리, 이름만 같은 다른 View 개념) 은 유지된다', () => {
      expect(existsSync(join(CMS_CORE, 'view-system', 'view-resolver.ts'))).toBe(true);
    });

    it('supplier-signal · seller-signal 은 유지된다', () => {
      const s = read(join(SRC, 'routes', 'dashboard', 'dashboard-assets.routes.ts'));
      expect(s).toMatch(/\/supplier-signal/);
      expect(s).toMatch(/\/seller-signal/);
    });
  });
});
