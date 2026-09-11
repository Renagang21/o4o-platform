/**
 * WO-O4O-NETURE-KPA-ASSET-HARDCODING-AND-DEAD-PACKAGE-GENERATED-ARTIFACT-CLOSURE-V1
 *
 * 되살아나면 안 되는 것들을 소스 계약으로 고정한다.
 *
 *   §1 Neture `/assets` — KPA 전용 asset-snapshot 컨트롤러를 Neture 라우트에 다시 마운트하지 않는다
 *   §2 dead package — 제거된 패키지/앱을 import·workspace dep 로 다시 참조하지 않는다
 *   §3 generated residue — forum-core / auth-client 의 src/ 에 tsc 산출물이 다시 추적되지 않는다
 *   §4 KPA — KPA 의 `/assets` 마운트는 그대로다 (회귀 아님)
 *
 * git ls-files 로 추적 파일만 본다 (로컬 build output 은 대상이 아니다).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const REPO = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(REPO, rel), 'utf-8');
const codeLines = (s: string) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const tracked = (): string[] => execSync('git ls-files', { cwd: REPO, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);

// 제거 확정: 미배포·CI 미참조·import 0·manifest 없음·보호 spec 없음 인 앱 3개.
//   packages/partner-core · financial-core · forum-cosmetics · organization-lms 는 import 0 이지만
//   선행 마감 WO 의 보호 계약(partnerops · ecommerce-core · auth-runtime spec) 과 CI AppStore Guard 의
//   manifest 12개 고정에 걸려 **제거하지 않는다** (WO 중지 조건 2·4 → STOP 보고).
const REMOVED_PACKAGES = ['@o4o/forum-api', '@o4o/forum-web'];
const REMOVED_DIRS = ['apps/forum-api/', 'apps/forum-web/', 'apps/mobile-app/'];
const PROTECTED_PACKAGE_DIRS = [
  'packages/partner-core/',
  'packages/financial-core/',
  'packages/forum-cosmetics/',
  'packages/organization-lms/',
];

describe('§1 Neture — KPA 전용 asset-snapshot 컨트롤러를 마운트하지 않는다', () => {
  const src = codeLines(read('apps/api-server/src/routes/neture/neture.routes.ts'));
  it('createAssetSnapshotController import 0', () => {
    expect(src).not.toMatch(/createAssetSnapshotController/);
  });
  it("router.use('/assets') 0 · '/store-assets' 0", () => {
    expect(src).not.toMatch(/router\.use\(\s*'\/assets'/);
    expect(src).not.toMatch(/router\.use\(\s*'\/store-assets'/);
  });
  it('/store-playlists 는 유지된다 (Neture 고유 축)', () => {
    expect(src).toMatch(/router\.use\(\s*'\/store-playlists'/);
  });
  it('modules/neture 의 Neture 전용 /assets(잠재 결함 · 소비처 0)도 마운트하지 않는다', () => {
    const m = codeLines(read('apps/api-server/src/modules/neture/neture.routes.ts'));
    expect(m).not.toMatch(/createNetureAssetSnapshotController/);
    expect(m).not.toMatch(/router\.use\(\s*'\/assets'/);
  });
  it('orphan 컨트롤러·resolver 파일이 남아 있지 않다', () => {
    const files = tracked();
    expect(files).not.toContain('apps/api-server/src/modules/neture/controllers/neture-asset-snapshot.controller.ts');
    expect(files).not.toContain('apps/api-server/src/modules/asset-snapshot/resolvers/neture-asset.resolver.ts');
  });
});

describe('§2 dead package — 제거된 패키지를 다시 참조하지 않는다', () => {
  const files = tracked();
  it('제거 디렉터리의 추적 파일 0', () => {
    for (const d of REMOVED_DIRS) {
      const left = files.filter((f) => f.startsWith(d));
      expect({ dir: d, left }).toEqual({ dir: d, left: [] });
    }
  });
  it('소스·설정에서 제거 패키지 import/dep 0 (docs · lockfile · tmp 제외)', () => {
    const scan = files.filter(
      (f) =>
        /\.(ts|tsx|js|mjs|cjs|json|ya?ml)$/.test(f) &&
        !f.startsWith('docs/') && !f.startsWith('tmp/') && f !== 'pnpm-lock.yaml' &&
        !f.includes('node_modules'),
    );
    const offenders: string[] = [];
    for (const f of scan) {
      let s: string;
      try { s = readFileSync(join(REPO, f), 'utf-8'); } catch { continue; }
      for (const p of REMOVED_PACKAGES) {
        if (new RegExp("from ['\"]" + p.replace(/[/@.-]/g, '\\$&') + "(/|['\"])").test(s)) offenders.push(`${f} imports ${p}`);
        if (new RegExp('"' + p.replace(/[/@.-]/g, '\\$&') + '"\\s*:\\s*"workspace').test(s)) offenders.push(`${f} depends ${p}`);
      }
    }
    expect(offenders).toEqual([]);
  });
  it('보호 패키지 4개는 그대로 남아 있다 (선행 WO 보호 계약 · manifest guard)', () => {
    for (const d of PROTECTED_PACKAGE_DIRS) {
      expect(files.some((f) => f === d + 'package.json')).toBe(true);
    }
  });
});

describe('§3 generated residue — src/ 에 tsc 산출물이 추적되지 않는다', () => {
  const files = tracked();
  it('forum-core · auth-client src/**/*.{js,d.ts,map} 추적 0', () => {
    const bad = files.filter(
      (f) =>
        (f.startsWith('packages/forum-core/src/') || f.startsWith('packages/auth-client/src/')) &&
        /\.(js|d\.ts|js\.map|d\.ts\.map)$/.test(f),
    );
    expect(bad).toEqual([]);
  });
  it('.gitignore 가 두 패키지의 산출물 경로를 막는다 (@o4o/types 선례와 같은 형태)', () => {
    const g = read('.gitignore');
    for (const p of ['forum-core', 'auth-client', 'types']) {
      expect(g).toMatch(new RegExp(`^/packages/${p}/src/\\*\\*/\\*\\.js$`, 'm'));
      expect(g).toMatch(new RegExp(`^/packages/${p}/src/\\*\\*/\\*\\.d\\.ts$`, 'm'));
    }
  });
  it('admin-dashboard public/mockServiceWorker.js 추적 0', () => {
    expect(files).not.toContain('apps/admin-dashboard/public/mockServiceWorker.js');
  });
});

describe('§4 KPA — KPA 의 asset-snapshot 마운트는 변경되지 않았다', () => {
  it("kpa.routes 는 여전히 '/assets' 에 createAssetSnapshotController 를 마운트한다", () => {
    const src = codeLines(read('apps/api-server/src/routes/kpa/kpa.routes.ts'));
    expect(src).toMatch(/router\.use\(\s*'\/assets',\s*createAssetSnapshotController\(/);
  });
});
