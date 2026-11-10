/**
 * guard-ask-commands.mjs 회귀 테스트 — 실제 훅 프로세스에 PreToolUse 입력을 넣어 판정을 확인한다.
 *
 * settings.json 의 넓은 ask 패턴(gh api 쓰기 플래그 · node/pnpm *migration*·*seed* · gh * delete *)을
 * 이 훅으로 옮겼다. 따라서 (1) 정확한 읽기 전용 형태만 통과하고 (2) 우회 형태는 여전히 ask 이며
 * (3) settings.json 이 이 훅을 등록하고 옛 패턴을 지운 상태가 함께 유지되어야 한다.
 *
 * 실행: node --test .claude/hooks/guard-ask-commands.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 테스트는 OS 확인 대화상자를 띄우지 않는다 — 자식 훅은 이 값을 물려받아 대화상자 대신 deny 한다(lib/shell.mjs confirmDialog).
process.env.O4O_HOOK_CONFIRM_DIALOG = 'off';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(DIR, 'guard-ask-commands.mjs');
const SETTINGS = path.join(DIR, '..', 'settings.json');

/** mode: PreToolUse 입력의 permission_mode. null 이면 필드를 넣지 않는다. */
function runHook(command, { cloud = false, tool = 'Bash', mode = 'default' } = {}) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_REMOTE;
  delete env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (cloud) env.CLAUDE_CODE_REMOTE = 'true';
  const payload = { hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { command }, cwd: process.cwd() };
  if (mode !== null) payload.permission_mode = mode;
  const input = JSON.stringify(payload);
  const r = spawnSync(process.execPath, [HOOK], { input, env, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 0, `훅 종료 코드 0 이어야 함: ${r.stderr}`);
  const out = r.stdout.trim();
  return out ? JSON.parse(out).hookSpecificOutput : null;
}

const assertAsk = (cmd, opts) => {
  const d = runHook(cmd, opts);
  assert.ok(d, `ask 가 반환되지 않음: ${cmd}`);
  assert.equal(d.hookEventName, 'PreToolUse');
  assert.equal(d.permissionDecision, 'ask', cmd);
};
const assertPass = (cmd, opts) => assert.equal(runHook(cmd, opts), null, `통과해야 함: ${cmd}`);

// ⓐ gh api --------------------------------------------------------------------------------------

test('ⓐ 정확한 GitHub 검색 형태는 묻지 않는다', () => {
  for (const cmd of [
    "gh api -X GET search/code -f q='literal repo:Renagang21/o4o-platform' --paginate",
    'gh api -X GET search/issues -f q="is:pr is:open repo:Renagang21/o4o-platform" -f per_page=50',
    "gh api --method GET search/commits -f q='fix' -f sort=committer-date -f order=desc",
    "gh api search/repositories -X GET -f q='o4o' --jq '.items[] | .full_name'",
    "gh api -X GET /search/users -f q='renagang21' -q '.total_count'",
    "gh api -X GET search/code -f q='a' | head -20",
  ]) {
    assertPass(cmd);
  }
});

test('ⓐ 쓰기 플래그가 없는 gh api 조회는 예전처럼 묻지 않는다', () => {
  for (const cmd of [
    'gh api repos/Renagang21/o4o-platform/rulesets',
    "gh api repos/Renagang21/o4o-platform/pulls --jq '.[].number'",
    'gh api user --jq .login',
  ]) {
    assertPass(cmd);
  }
});

test('ⓐ 우회 · 쓰기 형태는 여전히 ask', () => {
  for (const cmd of [
    // -X GET 뒤에 다시 method 지정
    "gh api -X GET search/code -X POST -f q='a'",
    "gh api -X GET search/code --method POST -f q='a'",
    "gh api -X GET search/code -f q='a' --method=PATCH",
    // 결합 · 붙여 쓴 플래그
    "gh api -XPOST search/code -f q='a'",
    "gh api -X GET -fq=a search/code",
    "gh api -iX POST repos/o/r/issues -f title=x",
    // 따옴표 이어붙이기로 플래그 숨기기
    "gh api '-'X POST repos/o/r/issues -f title=x",
    'gh api "-X" POST repos/o/r/issues',
    // 검색이 아닌 endpoint · 허용되지 않은 필드 · 파일 입력
    'gh api -X GET repos/o/r/pulls -f state=open',
    'gh api -X GET search/code/../../repos/o/r -f q=a',
    "gh api -X GET search/code -f q='a' -F per_page=1",
    "gh api -X GET search/code -f q='a' -f q='b'",
    "gh api -X GET search/code -f q='a' -f owner=x",
    "gh api -X GET search/code -f q='a' --input body.json",
    "gh api -X GET search/code -f q='a' -H 'X-HTTP-Method-Override: POST'",
    "gh api -X GET search/code -f q='a' --hostname evil.example",
    // 셸 확장 · 리다이렉션 · 환경 변수 접두어
    'gh api -X GET search/code -f q="$(cat secret)"',
    'gh api -X GET search/code -f q=a $EXTRA',
    "gh api -X GET search/code -f q=`id`",
    "gh api -X GET search/code -f q='a' > out.json",
    "GH_HOST=evil.example gh api -X GET search/code -f q='a'",
    // 일반 쓰기
    'gh api repos/o/r/issues -f title=x',
    'gh api graphql -f query=\'mutation { x }\'',
    'gh api -X PUT repos/o/r/topics --input t.json',
    'gh api --method POST repos/o/r/labels -F name=x',
    // 복합 명령 안
    "git status && gh api -X POST repos/o/r/issues -f title=x",
    // 따옴표 미종결
    "gh api -X GET search/code -f q='a",
  ]) {
    assertAsk(cmd);
  }
});

test('ⓐ 클라우드 · PowerShell 에서도 같은 판정', () => {
  assertAsk("gh api -X GET search/code -X POST -f q='a'", { cloud: true });
  assertAsk("gh api -X GET search/code -X POST -f q='a'", { tool: 'PowerShell' });
  assertAsk('& gh api -X POST repos/o/r/issues -f title=x', { tool: 'PowerShell' });
  assertPass("gh api -X GET search/code -f q='a'", { cloud: true });
  assertPass("gh api -X GET search/code -f q='a'", { tool: 'PowerShell' });
});

// ⓑ node ----------------------------------------------------------------------------------------

test('ⓑ CI 정적 검사 · 테스트 파일 실행은 묻지 않는다', () => {
  assertPass('node scripts/db/check-migration-contract.mjs');
  assertPass('node --test scripts/db/__tests__/migration-identity.test.mjs');
  assertPass('node --test scripts/db/__tests__/migration-identity.test.mjs scripts/db/__tests__/setup-local-db-credential-log.test.mjs');
  assertPass('node scripts/quality/check-literal-consumers.mjs --source x.ts'); // migration · seed 없음
});

test('ⓑ migration · seed 실행 형태는 ask', () => {
  for (const cmd of [
    'node scripts/db/check-migration-contract.mjs --write-historical',
    'node scripts/db/check-migration-contract.mjs --write-historical --maintenance',
    'node scripts/testing/migration-fingerprint-postgres.mjs',
    'node dist/database/run-migration.js',
    'node apps/api-server/dist/database/seeds/index.js',
    'node --test scripts/db/__tests__/migration-identity.test.mjs --test-name-pattern=x',
    'node --test ../outside/migration.test.mjs',
    'node -e "require(\'./migration\')"',
    'DATABASE_URL=x node scripts/db/check-migration-contract.mjs',
    'node scripts/db/check-migration-contract.mjs > x.log',
    "node scripts/db/check-mig''ration-contract.mjs --write-historical",
    'cd apps/api-server && node dist/migration.js',
  ]) {
    assertAsk(cmd);
  }
});

// ⓒ pnpm ----------------------------------------------------------------------------------------

test('ⓒ 테스트 파일 실행 · 계약 검사는 묻지 않는다', () => {
  for (const cmd of [
    'pnpm --filter @o4o/api-server test -- src/database/__tests__/migration-manifest.test.ts',
    'pnpm --filter @o4o/api-server exec jest src/database/__tests__/seed-guard.spec.ts --runInBand',
    'pnpm -F @o4o/api-server run test src/x/migration.spec.ts',
    'pnpm --filter @o4o/api-server migration:check-contract',
    'pnpm --filter @o4o/api-server run migration:check-contract',
    'pnpm --filter @o4o/web-admin build', // migration · seed 없음
  ]) {
    assertPass(cmd);
  }
});

test('ⓒ migration · seed 실행 형태는 ask', () => {
  for (const cmd of [
    'pnpm --filter @o4o/api-server migration:run',
    'pnpm --filter @o4o/api-server run migration:revert',
    'pnpm --filter @o4o/api-server migration:show',
    'pnpm --filter @o4o/api-server seed:kpa:signage',
    'pnpm --filter @o4o/api-server test -- --testPathPattern migration',
    'pnpm --filter @o4o/api-server test -- src/migration.test.ts --config other.js',
    'pnpm --filter @o4o/api-server exec tsx src/migrate.ts migration',
    'pnpm --filter @o4o/web test migration:run.test.ts && pnpm --filter @o4o/api-server migration:run',
    'pnpm --filter other-pkg migration:check-contract',
  ]) {
    assertAsk(cmd);
  }
});

// ⓓ gh delete -----------------------------------------------------------------------------------

test('ⓓ delete 가 텍스트 값일 뿐인 조회는 묻지 않는다', () => {
  for (const cmd of [
    'gh pr list --search delete',
    'gh issue list --label delete --state open',
    "gh pr list --search 'branch delete' --json number",
    'gh pr view 1003 --json title --jq .title',
  ]) {
    assertPass(cmd);
  }
});

test('ⓓ 삭제 명령은 ask', () => {
  for (const cmd of [
    'gh release delete v1.0 -y',
    'gh release delete-asset v1.0 a.zip',
    'gh label delete wip',
    'gh issue delete 12',
    'gh cache delete --all',
    'gh run delete 123',
    'gh variable delete X',
    'gh repo deploy-key delete 1',
    'gh -R o/r label delete wip',
    "gh 'label' 'delete' wip",
  ]) {
    assertAsk(cmd);
  }
});

// 권한 모드 -------------------------------------------------------------------------------------
// 2026-11-09: 로컬 auto 모드에서 이 훅의 ask 가 승인 창 없이 통과했다(gh label delete x).

const RISKY = ['gh label delete x', "gh api -X POST repos/o/r/issues -f title=x", 'pnpm --filter @o4o/api-server migration:run'];

test('승인 창이 뜨는 모드(default · acceptEdits · plan)는 ask', () => {
  for (const mode of ['default', 'acceptEdits', 'plan']) {
    for (const cmd of RISKY) assertAsk(cmd, { mode });
  }
});

test('승인 창이 뜨지 않거나 알 수 없는 모드는 deny (fail closed)', () => {
  for (const mode of ['auto', 'bypassPermissions', 'dontAsk', 'something-new', '', null]) {
    for (const opts of [{ mode }, { mode, tool: 'PowerShell' }, { mode, cloud: true }]) {
      for (const cmd of RISKY) {
        const d = runHook(cmd, opts);
        assert.equal(d?.permissionDecision, 'deny', `${String(mode)}: ${cmd}`);
        assert.match(d.permissionDecisionReason, /default 모드/);
      assert.match(d.permissionDecisionReason, /확인 대화상자를 띄울 수 없었다/);
        assert.match(d.permissionDecisionReason, /확인 대화상자를 띄울 수 없었다/);
      }
    }
  }
});

test('예외 · 무관한 명령은 auto 모드에서도 통과한다', () => {
  for (const cmd of ["gh api -X GET search/code -f q='x'", 'gh pr list --search delete', 'git status']) {
    assertPass(cmd, { mode: 'auto' });
  }
});

// 공통 ------------------------------------------------------------------------------------------

test('무관한 명령과 잘못된 입력은 조용히 통과한다', () => {
  for (const cmd of ['git status', 'pnpm install --frozen-lockfile', 'echo seed migration', 'git commit -m "gh api -X POST"']) {
    assertPass(cmd);
  }
  for (const input of ['', 'not json', '{}', '{"tool_input":{}}']) {
    const r = spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8', timeout: 20000 });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  }
});

test('settings.json: 훅이 등록돼 있고 옮긴 ask 패턴 · 남길 deny 가 그대로다', () => {
  const s = JSON.parse(readFileSync(SETTINGS, 'utf8'));
  const pre = s.hooks.PreToolUse.find((h) => h.matcher === 'Bash|PowerShell');
  assert.ok(pre, 'Bash|PowerShell PreToolUse 훅 그룹이 있어야 한다');
  assert.ok(
    pre.hooks.some((h) => h.command.includes('.claude/hooks/guard-ask-commands.mjs')),
    '옛 ask 패턴을 지웠으므로 이 훅이 반드시 등록돼 있어야 한다',
  );
  for (const p of ['node *migration*', 'pnpm *seed*', 'gh * delete *', 'gh api -X *', 'gh api * -f *']) {
    assert.ok(!s.permissions.ask.includes(`Bash(${p})`), `옮긴 패턴이 남아 있음: ${p}`);
  }
  for (const p of ['Bash(gh api *DELETE*)', 'Bash(gh pr merge *--delete-branch*)']) {
    assert.ok(s.permissions.deny.includes(p), `deny 가 유지돼야 함: ${p}`);
  }
  for (const p of ['Bash(pnpm *db:seed*)', 'Bash(npm run *migration*)', 'Bash(gh repo delete *)', 'Bash(gh secret *)']) {
    assert.ok(s.permissions.ask.includes(p), `ask 가 유지돼야 함: ${p}`);
  }
});
