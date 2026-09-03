/**
 * WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1
 *   — `scripts/audit/check-block-registry.ts` 출력 안정성(환경 독립성) 계약 테스트
 *
 * 배경
 * ---------------------------------------------------------------
 *   generator 는 report 에 **실행 머신의 절대경로**와 매 실행 시각의
 *   timestamp 를 기록했다. 그래서 같은 commit 에서도 머신이 다르면 report 가
 *   통째로 달라졌고, 이것이 선행 WO 두 건에서 report 를 Git 추적에서 뺀
 *   직접 근거(`ENVIRONMENT_DEPENDENT_ARTIFACT`)였다.
 *
 *     WO-O4O-SHORTCODE-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1
 *     WO-O4O-BLOCK-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1
 *
 *   이번 WO 는 **원인 쪽**을 고친다. report 자체는 계속 git-ignored 다
 *   (추적 계약은 `block-registry-report-untrack.spec.ts` 가 고정한다).
 *
 *   shortcode generator 는 WO-O4O-SHORTCODE-DOMAIN-RETIREMENT-V1 에서
 *   도메인과 함께 은퇴했다. 여기 남은 계약은 block generator 축뿐이다.
 *
 * 고정하는 계약
 * ---------------------------------------------------------------
 *   1. 경로는 repo root 기준 **POSIX 상대경로**다 — Windows/Linux 동일 출력.
 *   2. `timestamp` 는 기본 출력에 없고 `--timestamp` 로만 들어간다.
 *   3. 디렉터리 순회는 `.sort()` 로 고정한다 (readdir 순서는 FS 의존).
 *   4. exit semantics · missing/dangling 판정은 건드리지 않는다.
 *
 * DB · 네트워크 접근 0. 스크립트를 실행하지 않고 raw-source 로 단언한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const BLOCK_REL = 'scripts/audit/check-block-registry.ts';

const readRoot = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

/** Windows 구분자. 소스에 backslash 리터럴을 두지 않으려고 `path` 에서 얻는다. */
const WIN_SEP = path.win32.sep;
const winPath = (...seg: string[]) => seg.join(WIN_SEP);

/**
 * generator 의 `toRepoPath()` 와 **동일한 식**을 플랫폼별 path 구현으로 재현한다.
 * 실제 실행 플랫폼과 무관하게 Windows/Linux 양쪽 경로 형태를 한 자리에서 비교한다.
 */
const toRepoPathWith = (impl: path.PlatformPath, root: string, abs: string) =>
  impl.relative(root, abs).split(impl.sep).join('/');

describe('generator 경로 canonicalization — Windows/Linux 동일 결과', () => {
  it('두 플랫폼의 절대경로가 같은 repo-relative 경로가 된다', () => {
    // C:\Users\home\coding\o4o-platform\packages\x.ts
    // /home/dev/o4o-platform/packages/x.ts
    //   → 둘 다 packages/x.ts
    const CANONICAL = 'packages/x.ts';

    expect(
      toRepoPathWith(
        path.win32,
        winPath('C:', 'Users', 'home', 'coding', 'o4o-platform'),
        winPath('C:', 'Users', 'home', 'coding', 'o4o-platform', 'packages', 'x.ts')
      )
    ).toBe(CANONICAL);

    expect(
      toRepoPathWith(path.posix, '/home/dev/o4o-platform', '/home/dev/o4o-platform/packages/x.ts')
    ).toBe(CANONICAL);
  });

  it('중첩 경로에서도 구분자가 전부 `/` 로 통일된다', () => {
    const CANONICAL = 'apps/admin-dashboard/src/blocks/definitions/a.tsx';
    const seg = ['apps', 'admin-dashboard', 'src', 'blocks', 'definitions', 'a.tsx'];

    expect(
      toRepoPathWith(path.win32, winPath('D:', 'repo'), winPath('D:', 'repo', ...seg))
    ).toBe(CANONICAL);
    expect(
      toRepoPathWith(path.posix, '/srv/repo', ['/srv/repo', ...seg].join('/'))
    ).toBe(CANONICAL);
  });

  it('실행 플랫폼의 path 구현으로도 backslash 가 남지 않는다', () => {
    const abs = path.join(REPO_ROOT, 'packages', 'block-renderer', 'src', 'metadata.ts');
    const rel = path.relative(REPO_ROOT, abs).split(path.sep).join('/');

    expect(rel).toBe('packages/block-renderer/src/metadata.ts');
    expect(rel).not.toContain(WIN_SEP);
    expect(path.isAbsolute(rel)).toBe(false);
  });
});

describe('block generator 가 canonicalization 계약을 유지한다', () => {
  const rel = BLOCK_REL;

  it('repo root 기준 POSIX 변환 helper 를 갖는다', () => {
    const src = readRoot(rel);
    expect(src).toContain('function toRepoPath(');
    expect(src).toContain("split(path.sep).join('/')");
    expect(src).toContain('const PROJECT_ROOT =');
  });

  it('report 의 filePath 를 절대경로로 기록하지 않는다', () => {
    const src = readRoot(rel);
    expect(src).toContain('filePath: toRepoPath(filePath)');
    // `filePath,` shorthand 로 되돌리면 절대경로가 그대로 직렬화된다.
    expect(src).not.toMatch(/^\s+filePath,\s*$/m);
  });

  it('timestamp 는 기본 출력에서 빠지고 `--timestamp` 로만 켜진다', () => {
    const src = readRoot(rel);
    expect(src).toContain("process.argv.includes('--timestamp')");
    expect(src).toContain('INCLUDE_TIMESTAMP ? { timestamp:');
    expect(src).toContain('timestamp?: string');
    // 무조건 기록하던 형태로 되돌아가면 재실행마다 diff 가 난다.
    expect(src).not.toMatch(/^\s+timestamp: new Date\(\)\.toISOString\(\),\s*$/m);
  });

  it('디렉터리 순회 순서를 정렬로 고정한다', () => {
    const src = readRoot(rel);
    expect(src).toContain('fs.readdirSync(dir).sort()');
    expect(src).not.toMatch(/fs\.readdirSync\(dir\);/);
  });

  it('exit semantics 와 missing/dangling 판정은 그대로다', () => {
    const src = readRoot(rel);
    expect(src).toContain('process.exit(1)');
    expect(src).toContain('missingInRegistry');
    expect(src).toContain('danglingRegistryEntries');
  });
});

describe('생성된 report 가 남아 있으면 canonical 형태다', () => {
  const reports = ['scripts/audit/block-registry-report.json'];

  it.each(reports)('%s — 절대경로 · backslash · 기본 timestamp 가 없다', (rel) => {
    const abs = path.join(REPO_ROOT, rel);
    // report 는 git-ignored 라 clean checkout 에는 없다. 부재는 실패가 아니다.
    if (!fs.existsSync(abs)) return;

    const raw = fs.readFileSync(abs, 'utf-8');
    const parsed = JSON.parse(raw);

    expect(parsed.timestamp).toBeUndefined();
    // JSON 에서 backslash 는 이스케이프돼 두 글자로 나타난다.
    expect(raw).not.toContain(WIN_SEP + WIN_SEP);
    expect(raw).not.toMatch(new RegExp('"[A-Za-z]:/'));
    expect(raw).not.toMatch(new RegExp('"/(home|Users|srv|var|mnt)/'));

    const paths: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          if ((k === 'filePath' || k === 'source') && typeof v === 'string') paths.push(v);
          else walk(v);
        }
      }
    };
    walk(parsed);

    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(path.posix.isAbsolute(p)).toBe(false);
      expect(p).not.toContain(WIN_SEP);
      expect(p).not.toMatch(new RegExp('^[A-Za-z]:'));
    }
  });
});
