/**
 * WO-O4O-MAIN-SITE-RESIDUAL-DEPENDENCY-AND-DEAD-SCRIPT-CLEANUP-V1
 *   — main-site 잔여 dependency · dead script 정리 계약 테스트
 *
 * 선행 WO 들이 `apps/main-site` 를 MINIMAL_SHELL(live 27 파일 / lazy route 8)로
 * 정리한 뒤 남은 package 계약 잔재와 은퇴 경로 참조를 조사·정리한 결과를 고정한다.
 *
 * 판정 요약
 * ---------------------------------------------------------------
 *   axios                (main-site dependency)     REMOVE_DEPENDENCY
 *     └ MAIN_SITE_ORPHAN_DEP : live 26 code file 의 import 0.
 *                              다른 workspace 다수가 계속 소유하므로
 *                              lockfile 은 Case A(importer 블록만 축소).
 *   tsx                  (main-site devDependency)  REMOVE_DEVDEPENDENCY
 *     └ ORPHAN_MAIN_SITE_DEVDEP : main-site script 는 전부 vite/tsc 이며
 *                                 tsx 를 호출하는 script 0. root 의 `npx tsx`
 *                                 도구 사용은 다른 workspace 소유라 그대로 산다.
 *
 *   verify:shortcodes                          KEEP_ACTIVE (ACTIVE_VALIDATION)
 *   scripts/verify-shortcodes.ts               KEEP_ACTIVE
 *   scripts/audit/check-shortcode-registry.ts  KEEP_ACTIVE (ACTIVE_AUDIT)
 *     └ 세 항목 모두 **살아 있는** shortcode 도메인
 *       (`packages/shortcodes` · `apps/admin-dashboard`)을 검사한다.
 *       은퇴한 것은 스크립트가 아니라 그 안의 main-site 경로 참조뿐이므로
 *       스크립트는 유지하고 은퇴 경로 스캔 코드만 제거했다.
 *       은퇴 경로를 다른 살아 있는 디렉터리로 억지로 재연결하지 않았다.
 *
 * 보호 대상: `@tanstack/react-query`(main.tsx QueryClientProvider) ·
 *            live dependency 7 종 · main-site script 4 종 · 경량 CI 계약.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MAIN_SITE = path.join(REPO_ROOT, 'apps', 'main-site');
const MAIN_SITE_SRC = path.join(MAIN_SITE, 'src');

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const mainSitePkg = readJson(path.join(MAIN_SITE, 'package.json'));
const rootPkg = readJson(path.join(REPO_ROOT, 'package.json'));

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
};

/** 판정 사유 주석은 남겨 두므로 주석 줄을 제거한 "실제 코드"만 스캔한다. */
const codeOf = (file: string): string =>
  fs
    .readFileSync(file, 'utf-8')
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join('\n');

describe('WO-O4O-MAIN-SITE-RESIDUAL-DEPENDENCY-AND-DEAD-SCRIPT-CLEANUP-V1', () => {
  describe('orphan dependency 가 main-site 에 다시 등재되지 않는다', () => {
    it('axios 는 main-site dependencies 에 없다', () => {
      expect(mainSitePkg.dependencies).not.toHaveProperty('axios');
    });

    it('axios 는 main-site devDependencies 에도 없다', () => {
      expect(mainSitePkg.devDependencies).not.toHaveProperty('axios');
    });

    it('tsx 는 main-site devDependencies 에 없다', () => {
      expect(mainSitePkg.devDependencies).not.toHaveProperty('tsx');
    });

    it('main-site 소스 어디에서도 axios 를 import 하지 않는다', () => {
      const hits = walk(MAIN_SITE_SRC).filter((f) =>
        /\bfrom\s+['"]axios['"]|require\(['"]axios['"]\)/.test(codeOf(f))
      );
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('main-site script 는 tsx 를 호출하지 않는다', () => {
      const scripts: string[] = Object.values(mainSitePkg.scripts ?? {});
      expect(scripts.filter((s) => /\btsx\b/.test(s))).toEqual([]);
    });
  });

  describe('live shell 계약은 그대로 보호된다', () => {
    it.each([
      '@o4o/auth-client',
      '@o4o/content-editor',
      '@o4o/ui',
      '@tanstack/react-query',
      'react',
      'react-dom',
      'react-router-dom',
    ])('%s 는 dependencies 에 남아 있다', (dep) => {
      expect(mainSitePkg.dependencies).toHaveProperty(dep);
    });

    it.each(['dev', 'build', 'preview', 'typecheck'])('script "%s" 가 유지된다', (name) => {
      expect(mainSitePkg.scripts).toHaveProperty(name);
    });

    it('main.tsx 가 QueryClientProvider 를 유지한다 (@tanstack/react-query 보호 근거)', () => {
      const mainSrc = fs.readFileSync(path.join(MAIN_SITE_SRC, 'main.tsx'), 'utf-8');
      expect(mainSrc).toContain('QueryClientProvider');
    });
  });

  describe('lockfile 이 Case A(다른 importer 는 유지) 로 정리돼 있다', () => {
    const lock = fs.readFileSync(path.join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf-8');
    const importerBlock = (() => {
      const start = lock.indexOf('\n  apps/main-site:\n');
      if (start === -1) throw new Error('pnpm-lock.yaml 에 apps/main-site importer 블록이 없다');
      const rest = lock.slice(start + 1);
      const next = rest.indexOf('\n  apps/', 1);
      return next === -1 ? rest : rest.slice(0, next);
    })();

    it('main-site importer 블록에 axios 가 없다', () => {
      expect(importerBlock).not.toMatch(/^\s+axios:/m);
    });

    it('main-site importer 블록에 tsx 가 없다', () => {
      expect(importerBlock).not.toMatch(/^\s+tsx:/m);
    });

    it('axios · tsx 패키지 엔트리 자체는 남아 있다 (다른 workspace 소유)', () => {
      expect(lock).toMatch(/^ {2}axios@/m);
      expect(lock).toMatch(/^ {2}tsx@/m);
    });
  });

  describe('shortcode 검증 자산은 KEEP_ACTIVE 로 유지된다', () => {
    it.each(['scripts/verify-shortcodes.ts', 'scripts/audit/check-shortcode-registry.ts'])(
      '%s 는 존재한다',
      (rel) => {
        expect(fs.existsSync(path.join(REPO_ROOT, ...rel.split('/')))).toBe(true);
      }
    );

    it.each(['verify:shortcodes', 'verify:registry', 'verify'])(
      'root script "%s" 가 유지된다',
      (name) => {
        expect(rootPkg.scripts).toHaveProperty(name);
      }
    );

    it('verify:registry 가 verify:shortcodes 를 계속 호출한다', () => {
      expect(rootPkg.scripts['verify:registry']).toContain('verify:shortcodes');
    });

    it('두 스크립트가 살아 있는 shortcode 도메인을 계속 검사한다', () => {
      const verify = fs.readFileSync(
        path.join(REPO_ROOT, 'scripts', 'verify-shortcodes.ts'),
        'utf-8'
      );
      expect(verify).toContain('packages/shortcodes/src/metadata.ts');
      expect(verify).toContain('apps/admin-dashboard/src/services/ai/shortcode-registry.ts');

      const audit = fs.readFileSync(
        path.join(REPO_ROOT, 'scripts', 'audit', 'check-shortcode-registry.ts'),
        'utf-8'
      );
      expect(audit).toContain('apps/admin-dashboard/src/components/shortcodes');
      expect(audit).toContain('packages/shortcodes/src');
    });
  });

  describe('은퇴한 main-site shortcode 경로를 다시 스캔하지 않는다', () => {
    const SCRIPTS = [
      path.join(REPO_ROOT, 'scripts', 'verify-shortcodes.ts'),
      path.join(REPO_ROOT, 'scripts', 'audit', 'check-shortcode-registry.ts'),
    ];

    it.each(SCRIPTS.map((p) => [path.relative(REPO_ROOT, p), p]))(
      '%s 의 실행 코드에 은퇴 경로 참조가 없다',
      (_label, target) => {
        expect(codeOf(target)).not.toContain('main-site/src/components/shortcodes');
      }
    );

    it('감사 산출물에도 은퇴 경로가 남아 있지 않다', () => {
      const report = path.join(REPO_ROOT, 'scripts', 'audit', 'shortcode-registry-report.json');
      if (!fs.existsSync(report)) return;
      expect(fs.readFileSync(report, 'utf-8')).not.toContain('main-site');
    });
  });
});
