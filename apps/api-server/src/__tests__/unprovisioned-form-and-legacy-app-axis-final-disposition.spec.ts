/**
 * Unprovisioned Form 축 · legacy App 축 최종 처분 — 회귀 계약
 *
 * WO-O4O-UNPROVISIONED-FORM-AND-LEGACY-APP-AXIS-FINAL-DISPOSITION-V1
 *
 * 판정 근거(운영 read-only 실측 2026-09-11):
 *   - forms / form_submissions 테이블: 부재 (생성 migration 0) → Form 축 = 기능 단위 완전 제거
 *   - apps 테이블: 1 row (google-gemini-text · startup 이 스스로 seed) · 읽기 소비자 0 · app_usage_logs 0 row
 *     → legacy App 축(App · AppUsageLog · app-registry.service · startup seed) 제거. 테이블 DROP 은 하지 않는다.
 *   - app_registry (canonical AppRegistry · AppManager · /api/v1/admin/apps · /api/v1/apps/availability) 는 보존
 *
 * 본 테스트는 제거 상태의 재도입 방지와 canonical 보존을 raw-source 로 고정한다.
 * 삭제된 기능을 fixture 로 되살리지 않는다.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const read = (...seg: string[]) => readFileSync(join(REPO, ...seg), 'utf-8');
const exists = (...seg: string[]) => existsSync(join(REPO, ...seg));
// 주석 줄은 판정 근거 기록이므로 제외하고 코드 줄만 검사한다.
const codeOf = (...seg: string[]) =>
  read(...seg)
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === 'dist') continue;
    const full = join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

describe('A축 — unprovisioned Form 축 제거', () => {
  it('Form 엔티티 · 컨트롤러 · api-server 전용 타입이 존재하지 않는다', () => {
    expect(exists('apps', 'api-server', 'src', 'entities', 'Form.ts')).toBe(false);
    expect(exists('apps', 'api-server', 'src', 'entities', 'FormSubmission.ts')).toBe(false);
    expect(exists('apps', 'api-server', 'src', 'controllers', 'cpt', 'FormsController.ts')).toBe(false);
    expect(exists('apps', 'api-server', 'src', 'types', 'form-builder.ts')).toBe(false);
  });

  it('database/entities.ts 에 Form · FormSubmission 등록이 없다', () => {
    const entities = codeOf('apps', 'api-server', 'src', 'database', 'entities.ts');
    expect(entities).not.toMatch(/from\s+'\.\.\/entities\/Form\.js'/);
    expect(entities).not.toMatch(/from\s+'\.\.\/entities\/FormSubmission\.js'/);
    expect(entities).not.toMatch(/^\s*Form,\s*$/m);
    expect(entities).not.toMatch(/^\s*FormSubmission,\s*$/m);
  });

  it('/api/v1/cpt/forms/* 라우트가 0 이다 (비인증 name 조회 · submit 포함)', () => {
    const cpt = codeOf('apps', 'api-server', 'src', 'routes', 'cpt.ts');
    expect(cpt).not.toContain('FormsController');
    expect(cpt).not.toMatch(/router\.(get|post|put|patch|delete)\(\s*'\/forms/);
  });

  it('api-server types/index 가 form-builder 를 re-export 하지 않는다', () => {
    expect(codeOf('apps', 'api-server', 'src', 'types', 'index.ts')).not.toContain('form-builder');
  });

  it('공용 @o4o/types 에서 form-builder 모듈이 제거됐다', () => {
    expect(exists('packages', 'types', 'src', 'form-builder.ts')).toBe(false);
    expect(codeOf('packages', 'types', 'src', 'index.ts')).not.toContain('form-builder');
  });

  it('admin-dashboard Form 화면 · 라우트 · API client 가 0 이다', () => {
    expect(exists('apps', 'admin-dashboard', 'src', 'pages', 'cpt-engine', 'forms')).toBe(false);
    const idx = codeOf('apps', 'admin-dashboard', 'src', 'pages', 'cpt-engine', 'index.tsx');
    expect(idx).not.toContain('FormsManager');
    expect(idx).not.toContain('FormBuilder');
    expect(idx).not.toMatch(/path="forms/);
    const toolset = codeOf('apps', 'admin-dashboard', 'src', 'pages', 'cpt-engine', 'CPTDashboardToolset.tsx');
    expect(toolset).not.toContain('/cpt-engine/forms');
    expect(toolset).not.toContain('Create Form');
    const api = codeOf('apps', 'admin-dashboard', 'src', 'features', 'cpt-acf', 'services', 'cpt.api.ts');
    expect(api).not.toContain('formApi');
    expect(api).not.toMatch(/\$\{API_BASE\}\/forms/);
  });

  it('forms / form_submissions 를 생성하거나 DROP 하는 migration 이 없다 (운영 테이블 부재 · DB 무변경)', () => {
    const dir = join(REPO, 'apps', 'api-server', 'src', 'database', 'migrations');
    const offenders = walk(dir).filter((f) => {
      const s = readFileSync(f, 'utf-8');
      return /CREATE TABLE\s+(IF NOT EXISTS\s+)?"?(forms|form_submissions)"?\b/i.test(s)
        || /DROP TABLE\s+(IF EXISTS\s+)?"?(forms|form_submissions)"?\b/i.test(s);
    });
    expect(offenders).toEqual([]);
  });

  it('공유 CPT 런타임(CPT · FieldGroups · Taxonomies · FormPreset)은 보존된다', () => {
    expect(exists('apps', 'api-server', 'src', 'modules', 'cpt-acf', 'controllers', 'cpt.controller.ts')).toBe(true);
    expect(exists('apps', 'api-server', 'src', 'controllers', 'cpt', 'FieldGroupsController.ts')).toBe(true);
    expect(exists('apps', 'api-server', 'src', 'controllers', 'cpt', 'TaxonomiesController.ts')).toBe(true);
    expect(exists('apps', 'api-server', 'src', 'entities', 'FormPreset.ts')).toBe(true);
    const entities = codeOf('apps', 'api-server', 'src', 'database', 'entities.ts');
    expect(entities).toMatch(/^\s*FormPreset,\s*$/m);
    expect(exists('apps', 'admin-dashboard', 'src', 'pages', 'cpt-engine', 'CPTDashboardToolset.tsx')).toBe(true);
    expect(exists('packages', 'types', 'src', 'preset.ts')).toBe(true);
  });
});

describe('B축 — legacy App 축 제거 · canonical AppRegistry 보존', () => {
  it('legacy App · AppUsageLog 엔티티와 app-registry.service 가 존재하지 않는다', () => {
    expect(exists('apps', 'api-server', 'src', 'entities', 'App.ts')).toBe(false);
    expect(exists('apps', 'api-server', 'src', 'entities', 'AppUsageLog.ts')).toBe(false);
    expect(exists('apps', 'api-server', 'src', 'services', 'app-registry.service.ts')).toBe(false);
  });

  it('database/entities.ts 에 App · AppUsageLog 등록이 없다', () => {
    const entities = codeOf('apps', 'api-server', 'src', 'database', 'entities.ts');
    expect(entities).not.toMatch(/from\s+'\.\.\/entities\/App\.js'/);
    expect(entities).not.toMatch(/from\s+'\.\.\/entities\/AppUsageLog\.js'/);
    expect(entities).not.toMatch(/^\s*App,\s*$/m);
    expect(entities).not.toMatch(/^\s*AppUsageLog,\s*$/m);
  });

  it('startup 이 legacy apps 테이블에 google-gemini-text 를 seed 하지 않는다', () => {
    const startup = codeOf('apps', 'api-server', 'src', 'services', 'startup.service.ts');
    expect(startup).not.toContain('initializeAppSystem');
    expect(startup).not.toContain('app-registry.service');
    expect(startup).not.toContain('google-gemini-text');
  });

  it('api-server 런타임에 legacy App 축 소비자가 0 이다', () => {
    const files = walk(join(SRC)).filter((f) => /\.ts$/.test(f) && !/__tests__/.test(f));
    const offenders = files.filter((f) => {
      const s = readFileSync(f, 'utf-8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');
      return /entities\/App\.js|entities\/AppUsageLog\.js|app-registry\.service\.js/.test(s);
    });
    expect(offenders).toEqual([]);
  });

  it('canonical AppRegistry (app_registry) · AppManager · admin/apps · availability 는 보존된다', () => {
    expect(exists('apps', 'api-server', 'src', 'entities', 'AppRegistry.ts')).toBe(true);
    const entities = codeOf('apps', 'api-server', 'src', 'database', 'entities.ts');
    expect(entities).toMatch(/from\s+'\.\.\/entities\/AppRegistry\.js'/);
    expect(entities).toMatch(/^\s*AppRegistry,\s*$/m);
    expect(exists('apps', 'api-server', 'src', 'services', 'AppManager.ts')).toBe(true);
    expect(exists('apps', 'api-server', 'src', 'services', 'app-manager', 'app-manager.facade.ts')).toBe(true);
    expect(exists('apps', 'api-server', 'src', 'routes', 'admin', 'apps.routes.ts')).toBe(true);
    expect(exists('apps', 'api-server', 'src', 'routes', 'app-availability.routes.ts')).toBe(true);
    expect(read('apps', 'api-server', 'src', 'services', 'app-manager', 'app-manager.facade.ts')).toContain('getRepository(AppRegistry)');
  });

  it('AI 사용 로그(AIUsageLog · ai_usage_logs) 는 legacy App 축이 아니며 보존된다', () => {
    expect(exists('apps', 'api-server', 'src', 'entities', 'AIUsageLog.ts')).toBe(true);
    expect(codeOf('apps', 'api-server', 'src', 'modules', 'ai-policy', 'ai-policy-executor.service.ts')).toContain('AIUsageLog');
  });

  it('apps / app_usage_logs 를 DROP 하는 migration 을 만들지 않았다 (본 WO 자동 포함 금지)', () => {
    const dir = join(REPO, 'apps', 'api-server', 'src', 'database', 'migrations');
    const offenders = walk(dir).filter((f) =>
      /DROP TABLE\s+(IF EXISTS\s+)?"?(apps|app_usage_logs)"?\b/i.test(readFileSync(f, 'utf-8')),
    );
    expect(offenders).toEqual([]);
  });
});

describe('C축 — packages/types/src 추적 build 산출물 0', () => {
  it('packages/types/src 아래에 .js / .d.ts / .map 이 없다 (정본은 .ts · outDir 은 dist)', () => {
    const files = walk(join(REPO, 'packages', 'types', 'src'));
    const artifacts = files.filter((f) => /\.(js|d\.ts|js\.map|d\.ts\.map)$/.test(f));
    expect(artifacts).toEqual([]);
  });

  it('.gitignore 가 packages/types/src 산출물을 무시한다', () => {
    const ignore = read('.gitignore');
    for (const rule of [
      '/packages/types/src/**/*.js',
      '/packages/types/src/**/*.js.map',
      '/packages/types/src/**/*.d.ts',
      '/packages/types/src/**/*.d.ts.map',
    ]) {
      expect(ignore).toContain(rule);
    }
  });

  it('@o4o/types package export 는 dist 를 가리킨다 (src 산출물 의존 0)', () => {
    const pkg = JSON.parse(read('packages', 'types', 'package.json'));
    expect(pkg.main).toBe('./dist/index.js');
    expect(pkg.types).toBe('./dist/index.d.ts');
    for (const entry of Object.values<Record<string, string>>(pkg.exports)) {
      expect(entry.types.startsWith('./dist/')).toBe(true);
      expect(entry.import.startsWith('./dist/')).toBe(true);
    }
  });
});

describe('D축 — WordPress 명칭 · lint 잔재', () => {
  it('WordPressGalleryShortcode 타입이 존재하지 않는다 (소비자 0 · shortcode 파싱 형태)', () => {
    const files = walk(join(REPO, 'apps', 'admin-dashboard', 'src')).filter((f) => /\.tsx?$/.test(f));
    const offenders = files.filter((f) => readFileSync(f, 'utf-8').includes('WordPressGalleryShortcode'));
    expect(offenders).toEqual([]);
  });

  it('gallery 블록 타입 정본(GalleryImage · GalleryAttributes)은 보존된다', () => {
    const types = read('apps', 'admin-dashboard', 'src', 'components', 'editor', 'blocks', 'gallery', 'types.ts');
    expect(types).toContain('export interface GalleryImage');
    expect(types).toContain('export interface GalleryAttributes');
  });
});
