/**
 * block-cloud-deploy.mjs 회귀 테스트 — 실제 훅 프로세스에 PreToolUse 입력을 넣어 판정을 확인한다.
 *
 * 2026-11-09: 로컬 auto 권한 모드에서 gcloud 배포 명령이 settings.json 의 ask 규칙을 거치지 않고 실행됐고,
 * 같은 날 훅이 반환한 "ask" 도 auto 모드에서는 승인 창 없이 통과했다(guard-ask-commands · gh label delete).
 * 그래서 로컬은 승인 창이 뜨는 모드에서만 ask, 그 밖은 deny 다 — 이 테스트가 그 계약을 지킨다.
 *
 * 네트워크(gh api) 조회가 필요한 숫자 ID 경로는 다루지 않는다. 실행: node --test .claude/hooks/*.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 테스트는 OS 확인 대화상자를 띄우지 않는다 — 자식 훅은 이 값을 물려받아 대화상자 대신 deny 한다(lib/shell.mjs confirmDialog).
process.env.O4O_HOOK_CONFIRM_DIALOG = 'off';

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'block-cloud-deploy.mjs');

/** mode: PreToolUse 입력의 permission_mode. null 이면 필드를 넣지 않는다. */
function runHook(command, { cloud, tool = 'Bash', mode = 'default' } = {}) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_REMOTE;
  delete env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (cloud === 'remote') env.CLAUDE_CODE_REMOTE = 'true';
  if (cloud === 'session-id') env.CLAUDE_CODE_REMOTE_SESSION_ID = 'session_test';
  const payload = { hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { command }, cwd: process.cwd() };
  if (mode !== null) payload.permission_mode = mode;
  const input = JSON.stringify(payload);
  const r = spawnSync(process.execPath, [HOOK], { input, env, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 0, `훅 종료 코드 0 이어야 함: ${r.stderr}`);
  const out = r.stdout.trim();
  return out ? JSON.parse(out).hookSpecificOutput : null;
}

const DEPLOY_COMMANDS = [
  'gcloud run deploy o4o-core-api --image x --region asia-northeast3',
  'gcloud --project p run deploy svc',
  'gcloud beta run services update-traffic svc --to-latest',
  'gcloud run jobs execute migrate',
  'gcloud builds submit --config cloudbuild.yaml',
  'gcloud app deploy',
  'gcloud functions deploy fn',
  'gcloud deploy releases create r1',
  'CLOUDSDK_CORE_PROJECT=p gcloud run deploy svc',
  'cd apps/api-server && gcloud run deploy svc',
  'gcloud.cmd run deploy svc',
  'gh workflow run deploy-api.yml',
  'gh workflow run promote.yml -f level=3',
  'gh -R Renagang21/o4o-platform workflow run delivery.yml',
  'gh workflow run', // 대상 불명 — fail closed
  'gh run rerun', // 대상 불명 — fail closed
];

const SAFE_COMMANDS = [
  'gcloud run services list',
  'gcloud run services describe o4o-core-api --region asia-northeast3',
  'gcloud builds list --limit 5',
  'gcloud config get-value project',
  'gh workflow run ci-pipeline.yml',
  'gh pr list --state open',
  'git commit -m "gcloud run deploy 문구는 따옴표 안이라 명령이 아니다"',
  'echo done',
];

test('로컬 세션: 승인 창이 뜨는 모드(default · acceptEdits · plan)에서 배포 명령은 ask', () => {
  for (const mode of ['default', 'acceptEdits', 'plan']) {
    for (const cmd of DEPLOY_COMMANDS) {
      const d = runHook(cmd, { mode });
      assert.ok(d, `ask 가 반환되지 않음: ${cmd}`);
      assert.equal(d.hookEventName, 'PreToolUse');
      assert.equal(d.permissionDecision, 'ask', `${mode}: ${cmd}`);
      assert.match(d.permissionDecisionReason, /AGENTS\.md §9/);
    }
  }
});

// 2026-11-09: 로컬 auto 모드에서 훅의 ask 가 승인 창 없이 통과했다 — 그 모드에서는 OS 확인 대화상자로 묻고,
// 띄울 수 없으면(테스트는 O4O_HOOK_CONFIRM_DIALOG=off) deny 로 막는다.
test('로컬 세션: 승인 창이 뜨지 않거나 알 수 없는 모드에서 배포 명령은 deny (fail closed)', () => {
  for (const mode of ['auto', 'bypassPermissions', 'dontAsk', 'something-new', '', null]) {
    for (const cmd of DEPLOY_COMMANDS) {
      const d = runHook(cmd, { mode });
      assert.equal(d?.permissionDecision, 'deny', `${String(mode)}: ${cmd}`);
      assert.match(d.permissionDecisionReason, /AGENTS\.md §9/);
      assert.match(d.permissionDecisionReason, /default 모드/);
      assert.match(d.permissionDecisionReason, /확인 대화상자를 띄울 수 없었다/);
    }
  }
});

// 2026-11-10 Codex 리뷰(#1017): 대화상자에 명령 일부만 보이면 숨은 배포까지 승인될 수 있다 — 자르지 않고 묻지 않은 채 deny.
test('로컬 세션: 대화상자 표시 한도를 넘는 긴 명령은 묻지 않고 deny, 승인 창이 뜨는 모드는 그대로 ask', () => {
  const long = `echo ${'x'.repeat(450)}; gcloud run deploy svc --region asia-northeast3`;
  for (const mode of ['auto', 'bypassPermissions', null]) {
    const d = runHook(long, { mode });
    assert.equal(d?.permissionDecision, 'deny', String(mode));
    assert.match(d.permissionDecisionReason, /400자를 넘어 묻지 않고 거부했다/);
    assert.doesNotMatch(d.permissionDecisionReason, /확인 대화상자를 띄울 수 없었다/);
  }
  assert.equal(runHook(long, { mode: 'default' })?.permissionDecision, 'ask');
});

test('로컬 세션: PowerShell 도구 입력도 ask (& 호출 연산자 포함)', () => {
  for (const cmd of ['gcloud run deploy svc --region asia-northeast3', '& gcloud run deploy svc', '& "gcloud.cmd" builds submit']) {
    assert.equal(runHook(cmd, { tool: 'PowerShell' })?.permissionDecision, 'ask', cmd);
  }
});

test('클라우드 세션: 배포 명령은 권한 모드와 무관하게 deny (두 판별 변수 모두)', () => {
  for (const cloud of ['remote', 'session-id']) {
    for (const mode of ['default', 'auto']) {
      for (const cmd of DEPLOY_COMMANDS) {
        const d = runHook(cmd, { cloud, mode });
        assert.equal(d?.permissionDecision, 'deny', `${cloud}/${mode}: ${cmd}`);
        assert.match(d.permissionDecisionReason, /클라우드 세션/);
      }
    }
  }
});

test('배포가 아닌 명령은 auto 모드에서도 아무것도 반환하지 않는다', () => {
  for (const cmd of SAFE_COMMANDS) assert.equal(runHook(cmd, { mode: 'auto' }), null, cmd);
});

test('배포가 아닌 명령은 로컬 · 클라우드 모두 아무것도 반환하지 않는다', () => {
  for (const cloud of [undefined, 'remote']) {
    for (const cmd of SAFE_COMMANDS) {
      assert.equal(runHook(cmd, { cloud }), null, `${cloud ?? 'local'}: ${cmd}`);
    }
  }
});

test('잘못된 입력은 조용히 통과한다 (일반 명령을 막지 않는다)', () => {
  for (const input of ['', 'not json', '{}', '{"tool_input":{}}']) {
    const r = spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8', timeout: 20000 });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  }
});
