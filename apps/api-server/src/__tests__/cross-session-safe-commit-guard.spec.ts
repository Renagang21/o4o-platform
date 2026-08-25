/**
 * WO-O4O-CROSSSESSION-SAFE-COMMIT-AND-LITERAL-CONSUMER-GUARD-V1 §18
 *
 * 절차 계약 테스트다(기능 테스트가 아니다).
 * 공유 worktree 에서 반복된 두 사고를 가드가 실제로 잡는지 고정한다.
 *
 *   A. 다른 세션 staged/WIP 가 내 커밋에 섞이는 문제  → scripts/git/check-staged-scope.mjs
 *   B. 식별자만 검색하고 raw-source consumer 를 놓치는 문제 → scripts/quality/check-literal-consumers.mjs
 *
 * 중요: 이 테스트는 **실제 index 를 절대 변경하지 않는다.**
 * staged 목록은 `O4O_STAGED_NAME_STATUS` 환경변수로 주입한다.
 */

import { execFileSync } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../../..');
const SCOPE_GUARD = path.join(repoRoot, 'scripts/git/check-staged-scope.mjs');
const LITERAL_CENSUS = path.join(repoRoot, 'scripts/quality/check-literal-consumers.mjs');

type Run = { status: number; stdout: string; stderr: string };

const runNode = (script: string, args: string[], env: NodeJS.ProcessEnv = {}): Run => {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env },
      maxBuffer: 64 * 1024 * 1024,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (err: any) {
    return { status: err.status ?? -1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
};

const staged = (lines: string[]) => ({ O4O_STAGED_NAME_STATUS: lines.join('\n') });

/** 431526533 사고 재현용 — 다른 세션이 삭제로 stage 했던 KPA 파일 5건 */
const KPA_FOREIGN_DELETIONS = [
  'D\tservices/web-kpa-society/src/components/ServiceBanner.tsx',
  'D\tservices/web-kpa-society/src/components/platform/PlatformFooter.tsx',
  'D\tservices/web-kpa-society/src/components/platform/PlatformHeader.tsx',
  'D\tservices/web-kpa-society/src/components/platform/ServiceCard.tsx',
  'D\tservices/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx',
];

describe('§18 staged scope guard — 내 범위만 커밋한다', () => {
  it('내 파일만 staged 면 통과한다', () => {
    const r = runNode(SCOPE_GUARD, ['docs/checks'], staged(['A\tdocs/checks/SOME-CHECK.md']));
    expect(r.status).toBe(0);
  });

  it('허용 경로를 여러 개 줘도 정확히 판정한다(디렉터리 prefix + 파일 정확일치)', () => {
    const r = runNode(
      SCOPE_GUARD,
      ['scripts/git', 'scripts/quality', 'CLAUDE.md'],
      staged([
        'A\tscripts/git/check-staged-scope.mjs',
        'A\tscripts/quality/check-literal-consumers.mjs',
        'M\tCLAUDE.md',
      ]),
    );
    expect(r.status).toBe(0);
  });

  it('범위 밖 staged 수정이 있으면 실패한다', () => {
    const r = runNode(
      SCOPE_GUARD,
      ['docs/checks'],
      staged(['A\tdocs/checks/SOME-CHECK.md', 'M\tservices/web-kpa-society/src/App.tsx']),
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('services/web-kpa-society/src/App.tsx');
  });

  it('범위 밖 staged 삭제는 실패 + 삭제라는 사실을 경고한다', () => {
    const r = runNode(SCOPE_GUARD, ['docs/checks'], staged(KPA_FOREIGN_DELETIONS));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('삭제');
  });

  it('431526533 사고를 재현하면 커밋 전에 차단된다(§20)', () => {
    const r = runNode(
      SCOPE_GUARD,
      ['docs/checks'],
      staged([
        'A\tdocs/checks/WO-O4O-PHARMACYHUB-COMMUNITY-NAVIGATION-REGRESSION-CLOSURE-V1-CHECK.md',
        ...KPA_FOREIGN_DELETIONS,
      ]),
    );
    expect(r.status).toBe(1);
    for (const line of KPA_FOREIGN_DELETIONS) {
      expect(r.stderr).toContain(line.split('\t')[1]);
    }
  });

  it('허용 경로 없이 실행하면 사용법 오류다(범위 미확정 상태로 커밋 금지)', () => {
    const r = runNode(SCOPE_GUARD, [], staged(['M\tCLAUDE.md']));
    expect(r.status).toBe(2);
  });

  it('staged 가 비어 있으면 통과한다', () => {
    const r = runNode(SCOPE_GUARD, ['docs/checks'], staged([]));
    expect(r.status).toBe(0);
  });

  it('가드는 읽기 전용이다 — 실행 전후 index 가 동일하다(§19)', () => {
    const snapshot = () =>
      execFileSync('git', ['diff', '--cached', '--name-status'], { cwd: repoRoot, encoding: 'utf8' });
    const before = snapshot();
    runNode(SCOPE_GUARD, ['docs/checks']);
    expect(snapshot()).toBe(before);
  });
});

describe('§18 literal consumer census — raw-source 소비처를 놓치지 않는다', () => {
  it('수정 대상 파일 경로로 검색하면 raw-source spec 이 소비처로 잡힌다(§20 a0f8cc48c 재현)', () => {
    const r = runNode(LITERAL_CENSUS, ['--source', 'services/web-pharmacy-hub/src/config/navigation.ts']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('RAW_SOURCE_CONTRACT');
    // 이 spec 자신이 navigation.ts 를 readFileSync 하는 소비처다.
    expect(r.stdout).toContain('pharmacy-hub-community-capability-adoption.spec.ts');
  });

  it('href 리터럴 검색은 실제 진입 UI 소비처를 ACTIVE_UI 로 분류한다', () => {
    const r = runNode(LITERAL_CENSUS, ["href: '/forum/request'"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('ACTIVE_UI');
    expect(r.stdout).toContain('services/web-pharmacy-hub/src/pages/forum/ForumHubPage.tsx');
  });

  it('소비처가 없으면 DEAD_REFERENCE 로 보고한다', () => {
    // 센티널을 소스에 리터럴로 두면 이 spec 자신이 소비처(RAW_SOURCE_CONTRACT)로 잡혀
    // git grep 결과가 1건이 된다 — 조립해서 저장소 어디에도 존재하지 않게 만든다.
    const absent = ['__O4O', 'LITERAL', 'THAT', 'DOES', 'NOT', 'EXIST', '20260824__'].join('_');
    const r = runNode(LITERAL_CENSUS, [absent]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('DEAD_REFERENCE');
  });

  it('검색어 없이 실행하면 사용법 오류다', () => {
    const r = runNode(LITERAL_CENSUS, []);
    expect(r.status).toBe(2);
  });
});
