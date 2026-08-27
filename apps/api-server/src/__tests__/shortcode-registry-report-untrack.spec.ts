/**
 * WO-O4O-SHORTCODE-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1
 *   — `scripts/audit/shortcode-registry-report.json` 소스관리 경계 계약 테스트
 *
 * 판정 요약
 * ---------------------------------------------------------------
 *   scripts/audit/shortcode-registry-report.json   GENERATED_ARTIFACT_UNTRACK
 *     └ ENVIRONMENT_DEPENDENT_ARTIFACT :
 *         check-shortcode-registry.ts 가 `filePath` 에 실행 머신의 **절대경로**를
 *         그대로 기록한다(실측 65 필드 · unique root 1). tracked 사본은
 *         `C:\Users\home\coding\o4o-platform\...` 로 다른 머신에서 생성된 것이라
 *         재실행만으로 66 줄 diff 가 났다(65 filePath + 1 timestamp).
 *         동일 환경 2회 실행 비교에서는 timestamp 1 줄만 달랐다.
 *     └ consumer census : ACTIVE_RUNTIME_CONSUMER 0 · CI_CONSUMER 0 ·
 *         ACTIVE_TEST_FIXTURE 0. 유일한 test 참조
 *         (main-site-residual-dependency-cleanup.spec.ts)는
 *         `if (!fs.existsSync(report)) return;` 으로 **부재를 허용**하는
 *         기회적 검사라 fixture 계약이 아니다.
 *
 *   check-shortcode-registry.ts   KEEP_ACTIVE — 감사 도구 자체는 유지한다.
 *   verify:shortcodes / verify:registry   KEEP_ACTIVE
 *
 * 후속 — WO-O4O-BLOCK-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1
 * ---------------------------------------------------------------
 *   scripts/audit/block-registry-report.json   GENERATED_ARTIFACT_UNTRACK
 *     └ sibling 인 block report 도 동일 근거로 닫혔다. tracked 사본은
 *         `/home/dev/o4o-platform` 루트의 filePath 34 필드 + timestamp 였고,
 *         이 머신 재실행 사본은 `C:\Users\home\coding\o4o-platform` 루트의 35 필드다.
 *     └ consumer census : ACTIVE_RUNTIME_CONSUMER 0 · CI_CONSUMER 0 ·
 *         ACTIVE_TEST_FIXTURE 0.
 *
 *   이전의 "sibling 을 함께 무시하지 않는다" assertion 은 **삭제가 아니라 교체**됐다.
 *   두 report 는 이제 각각 **독립된 anchored 규칙**을 가져야 하고,
 *   `*.json` · `scripts/audit/*.json` 같은 광범위 ignore 는 금지된다.
 *
 * 이 테스트는 **재추적 방지 계약**이다. DB · 네트워크 접근 0.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const REPORT_REL = 'scripts/audit/shortcode-registry-report.json';
const IGNORE_RULE = '/scripts/audit/shortcode-registry-report.json';

const BLOCK_REPORT_REL = 'scripts/audit/block-registry-report.json';
const BLOCK_IGNORE_RULE = '/scripts/audit/block-registry-report.json';

const readRoot = (...seg: string[]) =>
  fs.readFileSync(path.join(REPO_ROOT, ...seg), 'utf-8');

/** `.gitignore` 의 주석·빈 줄을 걷어낸 **실효 규칙** 목록. */
const ignoreRules = () =>
  readRoot('.gitignore')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

/**
 * git 계약 검사는 실제 checkout 안에서만 의미가 있다. tarball/export 처럼
 * git 이 없는 환경에서는 아래 `.gitignore` · generator 계약이 대신 고정한다.
 */
const hasGit = (() => {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
})();
const describeGit = hasGit ? describe : describe.skip;

describe('생성 산출물 report 는 Git 에 추적하지 않는다', () => {
  it('.gitignore 가 정확한 경로 규칙을 갖는다', () => {
    const ignore = readRoot('.gitignore');
    expect(ignore).toContain(IGNORE_RULE);
  });

  it('ignore 규칙이 광범위한 *.json 패턴이 아니다', () => {
    const rules = ignoreRules();
    expect(rules).not.toContain('*.json');
    expect(rules).not.toContain('**/*.json');
  });

  it('두 report 가 각각 독립된 anchored 규칙을 갖는다', () => {
    // sibling 인 block report 도 WO-O4O-BLOCK-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1
    // 에서 같은 판정으로 닫혔다. 두 규칙은 서로를 삼키지 않고 **파일 하나씩** 지목한다.
    const rules = ignoreRules();
    expect(rules).toContain(IGNORE_RULE);
    expect(rules).toContain(BLOCK_IGNORE_RULE);
  });

  it('디렉터리 단위 broad ignore 로 대체하지 않는다', () => {
    // `scripts/audit/` 를 통째로 무시하면 감사 도구(.ts)와 문서(.md)까지 추적에서 빠진다.
    const rules = ignoreRules();
    for (const broad of [
      'scripts/audit/*.json',
      '/scripts/audit/*.json',
      '**/scripts/audit/*.json',
      'scripts/audit/',
      '/scripts/audit/',
      'scripts/audit',
    ]) {
      expect(rules).not.toContain(broad);
    }
  });

  describeGit('git tracking 상태', () => {
    it('report 가 tracked 목록에 없다', () => {
      const tracked = execSync(`git ls-files -- ${REPORT_REL}`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      }).trim();
      expect(tracked).toBe('');
    });

    it('report 경로가 .gitignore 의 해당 규칙에 걸린다', () => {
      const matched = execSync(`git check-ignore -v -- ${REPORT_REL}`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      }).trim();
      expect(matched).toContain('.gitignore');
      expect(matched).toContain(IGNORE_RULE);
    });

    it('sibling block report 도 tracked 목록에 없다', () => {
      const tracked = execSync(`git ls-files -- ${BLOCK_REPORT_REL}`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      }).trim();
      expect(tracked).toBe('');
    });

    it('block report 경로가 자기 규칙에 걸린다 (shortcode 규칙이 아니다)', () => {
      const matched = execSync(`git check-ignore -v -- ${BLOCK_REPORT_REL}`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      }).trim();
      expect(matched).toContain('.gitignore');
      expect(matched).toContain(BLOCK_IGNORE_RULE);
    });
  });
});

describe('감사 도구와 verify 체인은 그대로 유지한다', () => {
  const AUDIT_REL = 'scripts/audit/check-shortcode-registry.ts';

  it('check-shortcode-registry.ts 가 존재한다', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, AUDIT_REL))).toBe(true);
  });

  it('감사 스크립트가 report 를 계속 생성한다 (기능 제거가 아니라 추적 해제다)', () => {
    const audit = readRoot('scripts', 'audit', 'check-shortcode-registry.ts');
    expect(audit).toContain("'shortcode-registry-report.json'");
    expect(audit).toContain('writeFileSync');
  });

  it('감사 스크립트가 살아 있는 shortcode 도메인을 계속 검사한다', () => {
    const audit = readRoot('scripts', 'audit', 'check-shortcode-registry.ts');
    expect(audit).toContain('packages/shortcodes/src');
    expect(audit).toContain('apps/admin-dashboard/src/components/shortcodes');
  });

  it('verify:shortcodes · verify:registry 가 살아 있다', () => {
    const rootPkg = JSON.parse(readRoot('package.json'));
    expect(rootPkg.scripts['verify:shortcodes']).toContain('scripts/verify-shortcodes.ts');
    expect(rootPkg.scripts['verify:registry']).toContain('verify:shortcodes');
  });

  it('packages/shortcodes active contract 가 유지된다', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'packages', 'shortcodes', 'src', 'metadata.ts'))).toBe(true);
    expect(
      fs.existsSync(
        path.join(REPO_ROOT, 'packages', 'shortcodes', 'src', 'utils', 'shortcodeNaming.ts')
      )
    ).toBe(true);
  });
});

describe('block 감사 도구도 그대로 유지한다', () => {
  const BLOCK_AUDIT_REL = 'scripts/audit/check-block-registry.ts';

  it('check-block-registry.ts 가 존재한다', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, BLOCK_AUDIT_REL))).toBe(true);
  });

  it('감사 스크립트가 report 를 계속 생성한다 (기능 제거가 아니라 추적 해제다)', () => {
    const audit = readRoot('scripts', 'audit', 'check-block-registry.ts');
    expect(audit).toContain("'block-registry-report.json'");
    expect(audit).toContain('writeFileSync');
  });
});
