/**
 * lms-core dead lifecycle · 파괴적 uninstall · 고아 migration 은퇴 계약
 *
 * WO-O4O-LMS-CORE-DEAD-LIFECYCLE-DESTRUCTIVE-UNINSTALL-AND-ORPHAN-MIGRATION-FINAL-RETIREMENT-V1
 * 근거 조사: IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1
 *
 * 판정 근거 (실측 2026-09-14)
 *   - lms-core lifecycle onInstall()/onUninstall() 호출자 저장소 전체 0. 프로덕션 lms_* 8 테이블은 api-server
 *     migration `20260410000001-CreateLmsCoreTables` 가 만들었고(camelCase), lifecycle 이 만드는 idx_* 21개는 0.
 *   - uninstall.ts 는 옵션·가드 없이 lms_* 7 테이블을 `DROP TABLE … CASCADE` 했다 (운영 강좌 11 · 수강 11 · 수료 1 소실 경로).
 *   - src/migrations/001,002 (`CreateLMSTables1701…`) 는 tsconfig exclude · migration glob 밖 · 프로덕션 typeorm_migrations
 *     미기록 → 고아. 정본 migration 과 테이블 집합이 중복(7 ⊂ 8).
 *
 * 본 spec 은 (1) 이 패키지가 테이블을 만들거나 지우지 않는다는 계약, (2) 파괴적 uninstall · 고아 migration 재도입 방지,
 * (3) 정본(entity 재export · 정본 migration · api-server LMS 모듈 소비 경로) 보존을 고정한다.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const LMS_CORE = join(REPO, 'packages', 'lms-core', 'src');
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

describe('lms-core dead lifecycle · 파괴적 uninstall · 고아 migration 은퇴', () => {
  describe('A. lms-core 는 테이블을 만들거나 지우지 않는다 (스키마 소유자 = deploy migration job)', () => {
    it('lifecycle install.ts · uninstall.ts 가 존재하지 않는다', () => {
      expect(existsSync(join(LMS_CORE, 'lifecycle', 'install.ts'))).toBe(false);
      expect(existsSync(join(LMS_CORE, 'lifecycle', 'uninstall.ts'))).toBe(false);
    });

    it('패키지 내부 migrations 디렉터리가 존재하지 않는다 (고아 CreateLMSTables 은퇴)', () => {
      expect(existsSync(join(LMS_CORE, 'migrations'))).toBe(false);
    });

    it('패키지 소스 어디에도 DDL (CREATE/DROP/ALTER TABLE · createTable/dropTable · CASCADE) 이 없다', () => {
      for (const f of walk(LMS_CORE)) {
        const code = codeLines(f).join('\n');
        expect({ f, hit: /\b(CREATE|DROP|ALTER)\s+TABLE\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\.(createTable|dropTable)\(/.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bCASCADE\b/.test(code) }).toEqual({ f, hit: false });
      }
    });
  });

  describe('B. stale 선언이 없다', () => {
    it('manifest.lifecycle 에 install · uninstall 경로가 없다', () => {
      const code = codeLines(join(LMS_CORE, 'manifest.ts')).join('\n');
      expect(code).not.toMatch(/lifecycle\/install\.js/);
      expect(code).not.toMatch(/lifecycle\/uninstall\.js/);
    });

    it('src/index.ts 는 lifecycle 을 export 하지 않는다', () => {
      expect(codeLines(join(LMS_CORE, 'index.ts')).join('\n')).not.toMatch(/\.\/lifecycle\//);
    });

    it('tsconfig 가 존재하지 않는 migrations 경로를 exclude 하지 않는다', () => {
      expect(read(join(REPO, 'packages', 'lms-core', 'tsconfig.json'))).not.toMatch(/src\/migrations/);
    });
  });

  describe('C. 정본은 보존된다', () => {
    it('lms_* 8 테이블의 정본 migration 이 api-server 에 존재한다', () => {
      expect(readdirSync(MIGRATIONS).some((n) => /CreateLmsCoreTables/.test(n))).toBe(true);
    });

    it('lms-core entities 재export 가 유지되고 api-server 가 등록한다', () => {
      const idx = read(join(LMS_CORE, 'entities', 'index.ts'));
      expect(idx).toMatch(/@o4o\/interactive-content-core/);
      expect(idx).toMatch(/@o4o\/education-extension/);
      expect(read(join(SRC, 'database', 'entities.ts'))).toMatch(/@o4o\/lms-core/);
    });

    it('api-server LMS 모듈이 @o4o/lms-core 를 계속 소비한다', () => {
      const hits = walk(join(SRC, 'modules', 'lms')).filter((f) => read(f).includes('@o4o/lms-core'));
      expect(hits.length).toBeGreaterThan(0);
    });
  });
});
