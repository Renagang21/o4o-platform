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
 * 이 테스트는 **재추적 방지 계약**이다. DB · 네트워크 접근 0.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const REPORT_REL = 'scripts/audit/shortcode-registry-report.json';
const IGNORE_RULE = '/scripts/audit/shortcode-registry-report.json';

const readRoot = (...seg: string[]) =>
  fs.readFileSync(path.join(REPO_ROOT, ...seg), 'utf-8');

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
    const rules = readRoot('.gitignore')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    expect(rules).not.toContain('*.json');
    expect(rules).not.toContain('**/*.json');
  });

  it('sibling block-registry-report.json 까지 함께 무시하지 않는다', () => {
    // 이번 WO 범위는 shortcode report 뿐이다. 규칙이 sibling 을 삼키면 범위 밖 변경이 된다.
    expect(readRoot('.gitignore')).not.toContain('block-registry-report.json');
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
