/**
 * WO-O4O-CI-INSTALL-LOCKFILE-DRIFT-REPRODUCIBILITY-CLOSURE-V1
 *   — CI build script 의 설치 계약과 lockfile 정합을 정적으로 고정
 *
 * 배경
 * ---------------------------------------------------------------
 *   `scripts/ci-build-app.sh` 가 build 도중 **비-frozen `pnpm install`** 을 실행했다.
 *   lockfile 이 워크스페이스와 어긋나 있으면(삭제된 `services/web-glycopharm` 의
 *   stale importer) pnpm 이 전면 재해석을 수행해 추적 파일 `pnpm-lock.yaml` 을
 *   말없이 고쳐 썼다. CI 는 커밋하지 않으므로 보이지 않고, 로컬에서는 이번 변경과
 *   무관한 diff 로 남아 작업 범위를 오염시킨다.
 *
 *   재현(pnpm 10.25.0, 2/2회):
 *     - `services/web-glycopharm` importer 139줄 제거
 *     - `ts-jest` optional peer 스냅샷에 `(esbuild@0.27.0)` 추가
 *   두 번째 변화는 importer 를 먼저 정리해 두면 발생하지 않는다(고정점 2개).
 *   따라서 필수 정규화가 아니며, 원인이 확정된 첫 번째만 정리했다.
 *
 * 고정하는 계약
 * ---------------------------------------------------------------
 *   1. CI build script 는 비-frozen install 을 실행하지 않는다
 *   2. `--no-frozen-lockfile` 을 쓰지 않는다
 *   3. lockfile importer 는 전부 실재하는 워크스페이스 package 에 대응한다
 *   4. 저장소가 지정한 pnpm 버전과 CI 가 설치하는 pnpm 버전이 일치한다
 *
 * 정적 계약 검사만 수행한다. 실제 install·build 는 비용이 크므로 여기서 실행하지
 * 않고 WO 검증 절차에서 별도로 수행한다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (...rel: string[]) => fs.readFileSync(path.join(REPO_ROOT, ...rel), 'utf-8');

const buildScript = read('scripts', 'ci-build-app.sh');

/** 주석(`#`)을 제거한 실행 라인만 본다 — 주석 속 설명 문구를 오탐하지 않는다. */
const executable = buildScript
  .split('\n')
  .map((line) => line.replace(/(^|\s)#.*$/, ''))
  .filter((line) => line.trim().length > 0)
  .join('\n');

describe('WO-O4O-CI-INSTALL-LOCKFILE-DRIFT-REPRODUCIBILITY-CLOSURE-V1 — CI 설치 계약', () => {
  it('0. 검사 대상 파일을 실제로 읽는다', () => {
    expect(executable).toContain('build_app()');
    expect(executable).toMatch(/pnpm install/);
  });

  it('1. ci-build-app.sh 의 모든 pnpm install 이 --frozen-lockfile 이다', () => {
    const installs = [...executable.matchAll(/^\s*pnpm install(.*)$/gm)].map((m) => m[1].trim());
    expect(installs.length).toBeGreaterThan(0);
    const nonFrozen = installs.filter((flags) => !flags.includes('--frozen-lockfile'));
    expect(nonFrozen).toEqual([]);
  });

  it('2. ci-build-app.sh 가 --no-frozen-lockfile 로 우회하지 않는다', () => {
    expect(executable).not.toContain('--no-frozen-lockfile');
  });

  it('3. lockfile importer 가 전부 실재하는 워크스페이스 package 다', () => {
    const lock = read('pnpm-lock.yaml');
    const importersBlock = lock.slice(
      lock.indexOf('\nimporters:\n'),
      // importers 다음의 최상위 키까지
      (() => {
        const start = lock.indexOf('\nimporters:\n') + 1;
        const next = lock.slice(start).search(/\n(?![ \t\n])/);
        return next === -1 ? lock.length : start + next;
      })(),
    );
    const importers = [...importersBlock.matchAll(/^ {2}(\S[^:\n]*):$/gm)]
      .map((m) => m[1])
      .filter((name) => name !== '.');
    expect(importers.length).toBeGreaterThan(50);

    const missing = importers.filter(
      (rel) => !fs.existsSync(path.join(REPO_ROOT, ...rel.split('/'), 'package.json')),
    );
    expect(missing).toEqual([]);
  });

  it('4. 저장소 지정 pnpm 버전과 CI setup-build-env 기본값이 일치한다', () => {
    const rootPkg = JSON.parse(read('package.json'));
    const pinned: string | undefined = rootPkg.volta?.pnpm;
    expect(pinned).toBeTruthy();

    const action = read('.github', 'actions', 'setup-build-env', 'action.yml');
    const ciVersion = action.match(/pnpm-version:[\s\S]*?default:\s*'([^']+)'/)?.[1];
    expect(ciVersion).toBe(pinned);
  });
});
