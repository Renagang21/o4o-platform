/**
 * guard-mcp-github.mjs 회귀 테스트 — 실제 훅 프로세스에 PreToolUse 입력을 넣어 판정을 확인한다.
 *
 * GitHub 조회는 가짜 `gh`(PATH 앞에 둔 스크립트)가 응답한다 — 네트워크 없이 등록 · 변경 파일 · workflow 경로를 흉내 낸다.
 * 실행: node --test .claude/hooks/*.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.O4O_HOOK_CONFIRM_DIALOG = 'off';

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guard-mcp-github.mjs');
const SHA = 'a'.repeat(40);
const ME = 'cse_TESTSESSION';

/**
 * 가짜 gh: 인자 문자열에 맞는 응답을 FAKE_GH_MAP(JSON {부분 문자열: 출력})에서 찾아 출력한다. 없으면 exit 1.
 * Windows 에서는 실행 파일 형식이 달라 가짜 gh 를 쓰는 테스트를 건너뛴다.
 */
const FAKE_DIR = mkdtempSync(path.join(os.tmpdir(), 'fake-gh-'));
const FAKE_OK = process.platform !== 'win32';
if (FAKE_OK) {
  const script = path.join(FAKE_DIR, 'gh');
  writeFileSync(
    script,
    `#!${process.execPath}\n` +
      'const map = JSON.parse(process.env.FAKE_GH_MAP || "{}"); const a = process.argv.slice(2).join(" ");\n' +
      'for (const [k, v] of Object.entries(map)) if (a.includes(k)) { process.stdout.write(v); process.exit(0); }\n' +
      'process.stderr.write("fake gh: no match " + a); process.exit(1);\n',
  );
  chmodSync(script, 0o755);
}

const registry = (sessions) =>
  Buffer.from(JSON.stringify({ cloud: sessions.map((s) => ({ session: s })) })).toString('base64');

function runHook(tool, input, { cloud = false, mode = 'auto', gh = null } = {}) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_REMOTE;
  delete env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (cloud) {
    env.CLAUDE_CODE_REMOTE = 'true';
    env.CLAUDE_CODE_REMOTE_SESSION_ID = ME;
  }
  if (gh) {
    env.PATH = `${FAKE_DIR}${path.delimiter}${env.PATH}`;
    env.FAKE_GH_MAP = JSON.stringify(gh);
  } else {
    env.O4O_HOOK_GH_OFFLINE = '1';
  }
  const payload = {
    hook_event_name: 'PreToolUse',
    tool_name: `mcp__github__${tool}`,
    tool_input: { owner: 'Renagang21', repo: 'o4o-platform', ...input },
    cwd: process.cwd(),
    permission_mode: mode,
  };
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), env, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 0, `훅 종료 코드 0 이어야 함: ${r.stderr}`);
  const out = r.stdout.trim();
  return out ? JSON.parse(out).hookSpecificOutput : null;
}

const merge = (extra = {}) => ({ pullNumber: 7, merge_method: 'squash', expectedHeadSha: SHA, ...extra });

test('읽기 · 일반 도구는 판정하지 않는다', () => {
  for (const tool of ['pull_request_read', 'list_pull_requests', 'create_pull_request', 'update_pull_request_branch', 'create_branch']) {
    assert.equal(runHook(tool, { pullNumber: 1, head: 'claude/x', base: 'main' }, { cloud: true }), null, tool);
  }
});

test('auto-merge 는 클라우드 · 로컬 모두 거부', () => {
  for (const cloud of [true, false]) {
    assert.equal(runHook('enable_pr_auto_merge', { pullNumber: 1 }, { cloud, mode: 'default' })?.permissionDecision, 'deny');
  }
});

test('main(또는 branch 미지정)에 직접 쓰는 파일 도구는 거부, 작업 branch 는 통과', () => {
  for (const tool of ['push_files', 'create_or_update_file', 'delete_file']) {
    for (const branch of ['main', 'refs/heads/main', '', undefined]) {
      assert.equal(runHook(tool, { branch, path: 'a', files: [] }, { cloud: false, mode: 'default' })?.permissionDecision, 'deny', `${tool} ${branch}`);
    }
    assert.equal(runHook(tool, { branch: 'claude/x', path: 'a', files: [] }, { cloud: true }), null, tool);
  }
});

test('배포 · 운영 workflow 실행은 클라우드에서 거부 (파일명 · 경로)', () => {
  for (const wf of ['deploy-api.yml', 'delivery.yml', 'promote.yml', '.github/workflows/deploy-web-services.yml', 'account-erasure-activation.yml', 'pharmacyhub-qr-cutover.yml']) {
    const r = runHook('actions_run_trigger', { method: 'run_workflow', workflow_id: wf, ref: 'main' }, { cloud: true });
    assert.equal(r?.permissionDecision, 'deny', wf);
  }
});

test('검사 전용 workflow 실행은 클라우드에서도 통과', () => {
  assert.equal(runHook('actions_run_trigger', { method: 'run_workflow', workflow_id: 'ci-pipeline.yml', ref: 'claude/x' }, { cloud: true }), null);
});

test('숫자 workflow ID · run ID 를 조회하지 못하면 클라우드에서 거부 (fail closed)', () => {
  assert.equal(runHook('actions_run_trigger', { method: 'run_workflow', workflow_id: '372207241', ref: 'main' }, { cloud: true })?.permissionDecision, 'deny');
  for (const method of ['rerun_workflow_run', 'rerun_failed_jobs', 'cancel_workflow_run']) {
    assert.equal(runHook('actions_run_trigger', { method, run_id: 123 }, { cloud: true })?.permissionDecision, 'deny', method);
  }
});

test('run 로그 삭제는 클라우드 거부 · 로컬 승인 창', () => {
  assert.equal(runHook('actions_run_trigger', { method: 'delete_workflow_run_logs', run_id: 1 }, { cloud: true })?.permissionDecision, 'deny');
  assert.equal(runHook('actions_run_trigger', { method: 'delete_workflow_run_logs', run_id: 1 }, { cloud: false, mode: 'default' })?.permissionDecision, 'ask');
});

test('로컬: 운영 workflow 는 승인 창이 뜨는 모드에서 ask, auto 모드에서 대화상자를 못 띄우면 deny', () => {
  const input = { method: 'run_workflow', workflow_id: 'promote.yml', ref: 'main' };
  assert.equal(runHook('actions_run_trigger', input, { cloud: false, mode: 'default' })?.permissionDecision, 'ask');
  assert.equal(runHook('actions_run_trigger', input, { cloud: false, mode: 'auto' })?.permissionDecision, 'deny');
});

test('병합: squash 가 아니거나 expectedHeadSha 가 없으면 모든 세션에서 거부', () => {
  for (const cloud of [true, false]) {
    for (const bad of [{ merge_method: 'merge' }, { merge_method: 'rebase' }, { merge_method: undefined }, { expectedHeadSha: undefined }, { expectedHeadSha: 'abc' }]) {
      assert.equal(runHook('merge_pull_request', merge(bad), { cloud, mode: 'default' })?.permissionDecision, 'deny', JSON.stringify(bad));
    }
  }
});

test('병합 로컬: 조건을 갖추면 승인 창(ask)', () => {
  assert.equal(runHook('merge_pull_request', merge(), { cloud: false, mode: 'default' })?.permissionDecision, 'ask');
});

test('병합 클라우드: 등록을 확인하지 못하면 거부 (fail closed)', () => {
  assert.equal(runHook('merge_pull_request', merge(), { cloud: true })?.permissionDecision, 'deny');
});

test('병합 클라우드: 등록 · 변경 파일 판정 (가짜 gh)', { skip: !FAKE_OK }, () => {
  const reg = `contents/.claude/integration-sessions.json`;
  // 등록 안 됨 → 거부
  let r = runHook('merge_pull_request', merge(), { cloud: true, gh: { [reg]: registry(['cse_OTHER']), 'pulls/7/files': 'a.ts\n' } });
  assert.equal(r?.permissionDecision, 'deny');
  assert.match(r.permissionDecisionReason, /등록돼 있지 않다/);

  // 등록됨(session_ 표기) · 일반 파일 → 통과
  r = runHook('merge_pull_request', merge(), { cloud: true, gh: { [reg]: registry(['session_TESTSESSION']), 'pulls/7/files': 'services/web/a.tsx\ndocs/x.md\n' } });
  assert.equal(r, null);

  // 등록됨 · 보호 경로 → 거부
  for (const f of [
    '.github/workflows/deploy-api.yml', '.claude/hooks/x.mjs', '.claude/settings.json', '.claude/integration-sessions.json',
    'scripts/ci/ci-gate.mjs', 'apps/api-server/Dockerfile', 'cloudbuild.yaml',
    'scripts/deployment/pharmacy-hub-domain-detachment.mjs', 'scripts/privacy/account-erasure-operations.mjs',
    'scripts/db/migration-identity.mjs', 'scripts/ci-build-app.sh', 'infra/artifact-registry/x.json', 'deploy/chatgpt-review-demo/compose.yml',
  ]) {
    r = runHook('merge_pull_request', merge(), { cloud: true, gh: { [reg]: registry([ME]), 'pulls/7/files': `docs/a.md\n${f}\n` } });
    assert.equal(r?.permissionDecision, 'deny', f);
  }

  // rename: 가짜 gh 는 jq 를 적용하지 않으므로 훅이 받는 출력(새 경로 · 이전 경로 줄)을 그대로 준다 — 이전 경로가 보호면 거부
  r = runHook('merge_pull_request', merge(), { cloud: true, gh: { [reg]: registry([ME]), 'pulls/7/files': 'docs/settings.json\n.claude/settings.json\n' } });
  assert.equal(r?.permissionDecision, 'deny');

  // 변경 파일 조회 실패 → 거부
  r = runHook('merge_pull_request', merge(), { cloud: true, gh: { [reg]: registry([ME]) } });
  assert.equal(r?.permissionDecision, 'deny');
});

test('클라우드: 숫자 ID 를 조회해 검사 전용이면 통과, 배포면 거부 (가짜 gh)', { skip: !FAKE_OK }, () => {
  assert.equal(
    runHook('actions_run_trigger', { method: 'rerun_failed_jobs', run_id: 5 }, { cloud: true, gh: { 'actions/runs/5': '.github/workflows/ci-pipeline.yml\n' } }),
    null,
  );
  assert.equal(
    runHook('actions_run_trigger', { method: 'rerun_workflow_run', run_id: 6 }, { cloud: true, gh: { 'actions/runs/6': '.github/workflows/delivery.yml\n' } })?.permissionDecision,
    'deny',
  );
  assert.equal(
    runHook('actions_run_trigger', { method: 'run_workflow', workflow_id: '99', ref: 'main' }, { cloud: true, gh: { 'actions/workflows/99': '.github/workflows/promote.yml\n' } })?.permissionDecision,
    'deny',
  );
});

test('JSON 이 아닌 입력 · GitHub 밖 도구는 통과', () => {
  const r = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});
