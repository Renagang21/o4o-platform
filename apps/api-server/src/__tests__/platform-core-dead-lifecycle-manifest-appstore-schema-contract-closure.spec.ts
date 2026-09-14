/**
 * platform-core dead lifecycle · manifest 정합 · AppStore 스키마 계약 종결
 *
 * WO-O4O-PLATFORM-CORE-DEAD-LIFECYCLE-MANIFEST-AND-APPSTORE-SCHEMA-CONTRACT-FINAL-CLOSURE-V1
 * 근거 조사: IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1 §3.2 · §10
 *
 * 판정 근거 (실측 2026-09-14)
 *   - platform-core lifecycle install()/uninstall() 호출자 저장소 전체 0 (`@o4o/platform-core/lifecycle` import 0;
 *     api-server 는 `store-identity` · `store-policy` subpath 만 소비).
 *   - install.ts 는 `CREATE TYPE app_status` · `CREATE TABLE IF NOT EXISTS app_registry · settings · account_activities` ·
 *     idx_* 11 · settings seed 4 를 raw SQL 로 실행했다. seed 는 실물 settings 스키마와 비호환(`app_id` 컬럼 전제) → 실행 시 즉시 실패.
 *   - app_registry 의 정본은 api-server migration `2026012200001-CreateAppRegistryTable` (+ SeedDefaultApps) 이며
 *     AppManager read facade · `/api/v1/apps/availability` · `/api/v1/admin/apps` READ 가 그 위에서 동작한다.
 *   - `disabled-apps.registry` 의 platform-core "dependencies 미등록" 문구는 stale (등록됨).
 *
 * 계약: "앱 설치(app_registry 상태 · manifest 기반 앱 identity)" 와 "운영 DB CREATE TABLE" 은 분리된 축이다.
 * (1) platform-core 는 테이블 · ENUM · index · seed 를 만들거나 지우지 않는다, (2) stale lifecycle 선언 · stale 등록 문구 재도입 방지,
 * (3) AppStore 정본(AppRegistry entity · migration · availability/admin read · appsCatalog · manifest identity) 보존을 고정한다.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const PLATFORM_CORE = join(REPO, 'packages', 'platform-core', 'src');
const MIGRATIONS = join(SRC, 'database', 'migrations');

const read = (p: string) => readFileSync(p, 'utf8');
const codeLines = (p: string) =>
  read(p)
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe('platform-core dead lifecycle · manifest 정합 · AppStore 스키마 계약 종결', () => {
  describe('A. platform-core 는 테이블 · ENUM · index · seed 를 만들거나 지우지 않는다 (스키마 소유자 = deploy migration job)', () => {
    it('lifecycle install.ts · uninstall.ts 가 존재하지 않는다', () => {
      expect(existsSync(join(PLATFORM_CORE, 'lifecycle', 'install.ts'))).toBe(false);
      expect(existsSync(join(PLATFORM_CORE, 'lifecycle', 'uninstall.ts'))).toBe(false);
    });

    it('패키지 소스 어디에도 DDL (CREATE/DROP/ALTER TABLE · CREATE TYPE/INDEX · createTable/dropTable · CASCADE) 이 없다', () => {
      for (const f of walk(PLATFORM_CORE)) {
        const code = codeLines(f).join('\n');
        expect({ f, hit: /\b(CREATE|DROP|ALTER)\s+TABLE\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bCREATE\s+(TYPE|INDEX|EXTENSION)\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\.(createTable|dropTable)\(/.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bCASCADE\b/.test(code) }).toEqual({ f, hit: false });
      }
    });

    it('raw SQL seed (INSERT INTO settings / app_registry) 가 없다', () => {
      for (const f of walk(PLATFORM_CORE)) {
        const code = codeLines(f).join('\n');
        expect({ f, hit: /\bINSERT\s+INTO\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bDELETE\s+FROM\b/i.test(code) }).toEqual({ f, hit: false });
      }
    });
  });

  describe('B. stale 선언이 없다', () => {
    it('manifest.lifecycle 에 install · uninstall 경로가 없다 (activate · deactivate 만)', () => {
      const code = codeLines(join(PLATFORM_CORE, 'manifest.ts')).join('\n');
      expect(code).not.toMatch(/lifecycle\/install\.js/);
      expect(code).not.toMatch(/lifecycle\/uninstall\.js/);
      expect(code).toMatch(/lifecycle\/activate\.js/);
      expect(code).toMatch(/lifecycle\/deactivate\.js/);
    });

    it('lifecycle/index.ts 는 activate · deactivate 만 export 한다', () => {
      const code = codeLines(join(PLATFORM_CORE, 'lifecycle', 'index.ts')).join('\n');
      expect(code).toMatch(/export \{ activate \}/);
      expect(code).toMatch(/export \{ deactivate \}/);
      expect(code).not.toMatch(/install|uninstall/);
    });

    it('api-server 는 platform-core lifecycle 을 import 하지 않는다 (store-identity · store-policy 만)', () => {
      let subpathConsumers = 0;
      for (const f of walk(SRC)) {
        if (f.includes('__tests__')) continue;
        const src = read(f);
        expect({ f, hit: /@o4o\/platform-core\/lifecycle/.test(src) }).toEqual({ f, hit: false });
        if (/@o4o\/platform-core\/(store-identity|store-policy)/.test(src)) subpathConsumers++;
      }
      expect(subpathConsumers).toBeGreaterThan(0);
    });

    it('disabled-apps.registry 의 platform-core 항목이 "dependencies 미등록" stale 문구를 쓰지 않는다 (패키지는 등록됨)', () => {
      const registry = read(join(SRC, 'app-manifests', 'disabled-apps.registry.ts'));
      const start = registry.indexOf("appId: 'platform-core'");
      const end = registry.indexOf("appId: 'auth-core'");
      expect(start).toBeGreaterThan(-1);
      const block = registry.slice(start, end > start ? end : undefined);
      expect(block).not.toMatch(/reason:\s*'api-server dependencies에 미등록'/);
      expect(block).not.toMatch(/nextAction:\s*'package\.json에 의존성 추가/);
      const pkg = JSON.parse(read(join(SRC, '..', 'package.json')));
      expect(pkg.dependencies['@o4o/platform-core']).toBeDefined();
    });
  });

  describe('C. AppStore 정본은 보존된다 ("앱 설치" ≠ "운영 DB CREATE TABLE")', () => {
    it('AppRegistry · Settings · AccountActivity entity 가 api-server 에 존재하고 AppRegistry · AccountActivity 가 등록되어 있다', () => {
      for (const n of ['AppRegistry.ts', 'Settings.ts', 'AccountActivity.ts']) {
        expect({ n, exists: existsSync(join(SRC, 'entities', n)) }).toEqual({ n, exists: true });
      }
      const registry = read(join(SRC, 'database', 'entities.ts'));
      expect(registry).toMatch(/import \{ AppRegistry \}/);
      expect(registry).toMatch(/import \{ AccountActivity \}/);
    });

    it('app_registry 의 정본 migration 이 api-server 에 존재한다', () => {
      const names = readdirSync(MIGRATIONS);
      expect(names.some((n) => /CreateAppRegistryTable/.test(n))).toBe(true);
      expect(names.some((n) => /SeedDefaultApps/.test(n))).toBe(true);
    });

    it('앱 가용성 · 관리자 READ · 카탈로그 경로가 유지된다', () => {
      expect(existsSync(join(SRC, 'routes', 'app-availability.routes.ts'))).toBe(true);
      expect(read(join(SRC, 'routes', 'app-availability.routes.ts'))).toMatch(/apps\/availability/);
      expect(existsSync(join(SRC, 'routes', 'admin', 'apps.routes.ts'))).toBe(true);
      expect(existsSync(join(SRC, 'app-manifests', 'appsCatalog.ts'))).toBe(true);
      expect(read(join(SRC, 'app-manifests', 'appsCatalog.ts'))).toMatch(/appId: 'platform-core'/);
    });

    it('platform-core manifest 앱 identity · ownsTables · subpath export 는 유지된다', () => {
      const manifest = codeLines(join(PLATFORM_CORE, 'manifest.ts')).join('\n');
      expect(manifest).toMatch(/id: 'platform-core'/);
      expect(manifest).toMatch(/type: 'core'/);
      expect(manifest).toMatch(/'app_registry'/);
      const pkg = JSON.parse(read(join(REPO, 'packages', 'platform-core', 'package.json')));
      for (const sub of ['./lifecycle', './store-identity', './store-policy']) expect(pkg.exports[sub]).toBeDefined();
      expect(existsSync(join(PLATFORM_CORE, 'lifecycle', 'activate.ts'))).toBe(true);
      expect(existsSync(join(PLATFORM_CORE, 'lifecycle', 'deactivate.ts'))).toBe(true);
      expect(existsSync(join(PLATFORM_CORE, 'store-identity', 'index.ts'))).toBe(true);
      expect(existsSync(join(PLATFORM_CORE, 'store-policy', 'index.ts'))).toBe(true);
    });
  });
});
