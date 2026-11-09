/**
 * block-cloud-deploy.mjs 회귀 테스트 — 실제 훅 프로세스에 PreToolUse 입력을 넣어 판정을 확인한다.
 *
 * 2026-11-09: 로컬 auto 권한 모드에서 gcloud 배포 명령이 settings.json 의 ask 규칙을 거치지 않고 실행됐다.
 * 그래서 로컬에서도 훅이 직접 "ask" 를 반환해야 한다 — 이 테스트가 그 계약을 지킨다.
 *
 * 네트워크(gh api) 조회가 필요한 숫자 ID 경로는 다루지 않는다. 실행: node --test .claude/hooks/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'block-cloud-deploy.mjs');

function runHook(command, { cloud, tool = 'Bash' } = {}) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_REMOTE;
  delete env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (cloud === 'remote') env.CLAUDE_CODE_REMOTE = 'true';
  if (cloud === 'session-id') env.CLAUDE_CODE_REMOTE_SESSION_ID = 'session_test';
  const input = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { command }, cwd: process.cwd() });
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

test('로컬 세션: 배포 명령은 권한 모드와 무관하게 ask 를 반환한다', () => {
  for (const cmd of DEPLOY_COMMANDS) {
    const d = runHook(cmd, {});
    assert.ok(d, `ask 가 반환되지 않음: ${cmd}`);
    assert.equal(d.hookEventName, 'PreToolUse');
    assert.equal(d.permissionDecision, 'ask', cmd);
    assert.match(d.permissionDecisionReason, /AGENTS\.md §9/);
  }
});

test('로컬 세션: PowerShell 도구 입력도 ask (& 호출 연산자 포함)', () => {
  for (const cmd of ['gcloud run deploy svc --region asia-northeast3', '& gcloud run deploy svc', '& "gcloud.cmd" builds submit']) {
    assert.equal(runHook(cmd, { tool: 'PowerShell' })?.permissionDecision, 'ask', cmd);
  }
});

test('클라우드 세션: 배포 명령은 deny (두 판별 변수 모두)', () => {
  for (const cloud of ['remote', 'session-id']) {
    for (const cmd of DEPLOY_COMMANDS) {
      assert.equal(runHook(cmd, { cloud })?.permissionDecision, 'deny', `${cloud}: ${cmd}`);
    }
  }
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
