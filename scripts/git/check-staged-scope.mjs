#!/usr/bin/env node
/**
 * WO-O4O-CROSSSESSION-SAFE-COMMIT-AND-LITERAL-CONSUMER-GUARD-V1 §7
 *
 * 공유 main 에서 병렬 세션이 같은 worktree 를 쓸 때, **내가 고르지 않은 staged 변경**이
 * 내 커밋에 섞이는 사고를 커밋 **전에** 잡는다.
 *
 *   node scripts/git/check-staged-scope.mjs <허용경로> [허용경로...]
 *
 * - staged 목록(`git diff --cached --name-status`)과 허용 경로의 차집합이 0 이 아니면 exit 1.
 * - 허용 경로는 정확한 파일 경로 또는 디렉터리 prefix 다.
 * - **읽기 전용이다.** index · worktree · stash 를 절대 건드리지 않는다.
 *   (다른 세션의 staged 상태를 유지하는 것이 최우선 — WO §2)
 *
 * 테스트 주입: 실제 index 를 바꾸지 않고 계약을 검증하기 위해
 * `O4O_STAGED_NAME_STATUS` 환경변수(`<status>\t<path>` 줄 목록)를 주면 git 대신 그것을 읽는다.
 */

import { execFileSync } from 'node:child_process';

/** Windows 경로 구분자(역슬래시) — 소스에 리터럴로 쓰지 않는다. */
const SEP = String.fromCharCode(92);

const NAME_STATUS_ENV = 'O4O_STAGED_NAME_STATUS';

/** `git diff --cached --name-status` 출력 → [{ status, file }] */
export function parseNameStatus(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      const status = parts[0];
      // rename/copy 는 `R100\told\tnew` 형태다 — 두 경로 모두 소유권 판정 대상이다.
      const files = parts.slice(1);
      return files.map((file) => ({ status, file }));
    })
    .flat();
}

/** 경로가 허용 목록(파일 정확일치 또는 디렉터리 prefix)에 들어가는가 */
export function isAllowed(file, allowed) {
  return allowed.some((a) => {
    const norm = a.split(SEP).join('/').replace(/\/+$/, '');
    return file === norm || file.startsWith(`${norm}/`);
  });
}

/** 허용 범위 밖 staged 항목(= foreign staged WIP) */
export function findForeign(entries, allowed) {
  return entries.filter((e) => !isAllowed(e.file, allowed));
}

function readStaged() {
  if (process.env[NAME_STATUS_ENV] !== undefined) {
    return process.env[NAME_STATUS_ENV];
  }
  return execFileSync('git', ['diff', '--cached', '--name-status'], { encoding: 'utf8' });
}

function main() {
  const allowed = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  if (allowed.length === 0) {
    console.error('사용법: node scripts/git/check-staged-scope.mjs <허용경로> [허용경로...]');
    console.error('  허용 경로 없이 커밋하려는 것 자체가 범위 미확정 상태입니다.');
    process.exit(2);
  }

  const entries = parseNameStatus(readStaged());

  if (entries.length === 0) {
    console.log('ℹ️  staged 변경이 없습니다.');
    process.exit(0);
  }

  const foreign = findForeign(entries, allowed);

  if (foreign.length === 0) {
    console.log(`✅ staged ${entries.length}건이 모두 이번 작업 범위 안입니다.`);
    for (const e of entries) console.log(`   ${e.status}\t${e.file}`);
    process.exit(0);
  }

  console.error('');
  console.error(`❌ 범위 밖 staged 변경 ${foreign.length}건이 index 에 있습니다 (다른 세션 WIP 가능).`);
  console.error('');
  for (const e of foreign) {
    const tag = e.status.startsWith('D') ? '  ← 삭제! 그대로 커밋하면 main 이 깨집니다' : '';
    console.error(`   ${e.status}\t${e.file}${tag}`);
  }
  console.error('');
  console.error('   금지: 이 상태에서 pathspec 없는 `git commit` 실행');
  console.error('   금지: 다른 세션 WIP 를 stash / reset / restore 로 치우기');
  console.error('');
  console.error('   해결: 내 파일만 지정해 커밋합니다.');
  console.error('     git commit -m "..." -- <내 파일...>');
  console.error('');
  process.exit(1);
}

// 직접 실행일 때만 CLI 로 동작한다(테스트에서 import 가능하도록).
const invoked = (process.argv[1] || '').split(SEP).join('/');
if (invoked.endsWith('check-staged-scope.mjs')) {
  main();
}
