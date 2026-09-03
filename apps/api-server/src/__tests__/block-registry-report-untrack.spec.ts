/**
 * WO-O4O-BLOCK-REGISTRY-REPORT-GENERATED-ARTIFACT-UNTRACK-AND-IGNORE-V1
 *   — `scripts/audit/block-registry-report.json` 소스관리 경계 계약 테스트
 *
 * 판정 요약
 * ---------------------------------------------------------------
 *   scripts/audit/block-registry-report.json   GENERATED_ARTIFACT_UNTRACK
 *     └ ENVIRONMENT_DEPENDENT_ARTIFACT :
 *         check-block-registry.ts 가 `filePath` 에 실행 머신의 **절대경로**를
 *         기록했다. tracked 사본은 `/home/dev/o4o-platform` 루트의 filePath
 *         34 필드 + timestamp 였고, 다른 머신 재실행 사본은 35 필드였다.
 *         (원인 쪽 canonicalization 은
 *          `registry-audit-generator-canonicalization.spec.ts` 가 고정한다.)
 *     └ consumer census : ACTIVE_RUNTIME_CONSUMER 0 · CI_CONSUMER 0 ·
 *         ACTIVE_TEST_FIXTURE 0.
 *
 *   ignore 규칙은 **anchored 단일 파일 규칙**이어야 한다.
 *   `*.json` · `scripts/audit/*.json` 같은 광범위 ignore 는 금지된다.
 *   (`scripts/audit/` 를 통째로 무시하면 감사 도구 .ts 와 문서 .md 까지 빠진다.)
 *
 * 이력 — 이 계약은 원래 sibling 인 shortcode report 의 untrack spec 안에서
 *   함께 고정돼 있었다. WO-O4O-SHORTCODE-DOMAIN-RETIREMENT-V1 이 shortcode
 *   도메인을 은퇴시키면서 block 축만 이 파일로 남았다. 은퇴 계약 자체는
 *   `shortcode-domain-retirement.spec.ts` 가 고정한다.
 *
 * 이 테스트는 **재추적 방지 계약**이다. DB · 네트워크 접근 0.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
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
    const rules = ignoreRules();
    expect(rules).toContain(BLOCK_IGNORE_RULE);
  });

  it('ignore 규칙이 광범위한 *.json 패턴이 아니다', () => {
    const rules = ignoreRules();
    expect(rules).not.toContain('*.json');
    expect(rules).not.toContain('**/*.json');
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
      const tracked = execSync(`git ls-files -- ${BLOCK_REPORT_REL}`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      }).trim();
      expect(tracked).toBe('');
    });

    it('report 경로가 .gitignore 의 해당 규칙에 걸린다', () => {
      const matched = execSync(`git check-ignore -v -- ${BLOCK_REPORT_REL}`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      }).trim();
      expect(matched).toContain('.gitignore');
      expect(matched).toContain(BLOCK_IGNORE_RULE);
    });
  });
});

describe('block 감사 도구는 그대로 유지한다', () => {
  const BLOCK_AUDIT_REL = 'scripts/audit/check-block-registry.ts';

  it('check-block-registry.ts 가 존재한다', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, BLOCK_AUDIT_REL))).toBe(true);
  });

  it('감사 스크립트가 report 를 계속 생성한다 (기능 제거가 아니라 추적 해제다)', () => {
    const audit = readRoot('scripts', 'audit', 'check-block-registry.ts');
    expect(audit).toContain("'block-registry-report.json'");
    expect(audit).toContain('writeFileSync');
  });

  it('verify:blocks · verify:registry 가 살아 있다', () => {
    const rootPkg = JSON.parse(readRoot('package.json'));
    expect(rootPkg.scripts['verify:registry']).toContain('verify:blocks');
  });
});
