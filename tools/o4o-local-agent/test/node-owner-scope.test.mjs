/**
 * Phase D — 노드 원장 소유 주체 분리(local.db v8) · heartbeat 노드 보고
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1 (V2 §3-1 · §9-2 · §11-1)
 *
 * 고정하려는 것:
 *   ① 한 노드에서 소유 주체 A 가 남긴 경험(검증 방법 · Candidate · 업무 키)은 B 의 조회에 나오지 않는다
 *   ② 소유 주체를 모르는 이전 행(owner_key NULL)은 소유 주체를 지정한 조회에 나오지 않는다(격리)
 *   ③ ownerKey 가 없는 요청(이전 서버)은 이전 묶음으로 예전처럼 동작한다
 *   ④ 형식이 아닌 ownerKey 는 명령 전체를 거절한다
 *   ⑤ heartbeat 보고는 boolean capability 와 버전뿐이다
 * 격리된 임시 O4O_AGENT_HOME — 실제 PC 의 local.db 를 건드리지 않는다.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmpHome;
before(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'o4o-owner-scope-test-'));
  process.env.O4O_AGENT_HOME = tmpHome;
});
after(() => {
  try {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

const db = await import('../src/local-db.mjs');
const handlers = await import('../src/handlers.mjs');
const { buildHeartbeatReport } = await import('../src/node-report.mjs');

const OWNER_A = `o_${'a'.repeat(32)}`;
const OWNER_B = `o_${'b'.repeat(32)}`;
const run = (action, args) => handlers.runAction(`local.data.${action}`, {}, args);

const menuEvent = (strategy) => ({
  kind: 'assistance', stageKey: 'statement_menu', askKind: 'menu_location', providedKind: 'path', structured: { strategy },
  resolution: 'resolved', progressedSteps: 2, reusability: 'reusable_knowledge', correction: null,
  validation: { result: 'verified', evidence: 'system_verified' },
});
const STEPS = [
  { actionKind: 'set_input', locator: { role: 'searchbox', name: '검색어' }, slot: 1, expect: { navigated: false, changed: false }, path: '/' },
  { actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true }, path: '/' },
];

test('v8 적용 — 패턴 · Candidate · run 에 owner_key 가 있다', () => {
  db.localDbHealth();
  assert.equal(db.SCHEMA_VERSION, 8);
  const h = db.openLocalDb();
  for (const t of ['local_experience_patterns', 'local_workflow_candidates', 'local_work_runs', 'local_work_run_assistance']) {
    assert.ok(h.prepare(`PRAGMA table_info(${t})`).all().some((c) => c.name === 'owner_key'), t);
  }
});

test('① 검증 방법 · 업무 키는 소유 주체별로 나뉜다', async () => {
  const pathA = { ops: [{ op: 'open_menu', label: '거래관리' }] };
  const rec = await run('work_run_assistance_record', { runId: 'g_own_a1', targetId: 'healthkr', taskKey: 'wholesale.statement_download', event: menuEvent(pathA), ownerKey: OWNER_A });
  assert.equal(rec.status, 'success');
  assert.equal(rec.data.patternCount, 1);

  const forA = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: 'wholesale.statement_download', ownerKey: OWNER_A });
  assert.equal(forA.data.patterns.length, 1);
  const forB = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: 'wholesale.statement_download', ownerKey: OWNER_B });
  assert.deepEqual(forB.data.patterns, []);
  const keysB = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: null, ownerKey: OWNER_B });
  assert.equal(keysB.data.taskKeys.includes('wholesale.statement_download'), false);
  const keysA = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: null, ownerKey: OWNER_A });
  assert.ok(keysA.data.taskKeys.includes('wholesale.statement_download'));

  // B 가 반대 극성을 검증해도 A 의 방법을 은퇴시키지 않는다.
  await run('work_run_assistance_record', {
    runId: 'g_own_b1', targetId: 'healthkr', taskKey: 'wholesale.statement_download', ownerKey: OWNER_B,
    event: { ...menuEvent(null), askKind: 'success_confirmation', providedKind: 'correction', structured: null,
      kind: 'correction', correction: { type: 'procedure_method', reason: 'site_feature_exists', wrong: pathA, alternative: { ops: [{ op: 'search' }] } } },
  });
  const stillA = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: 'wholesale.statement_download', ownerKey: OWNER_A });
  assert.deepEqual(stillA.data.patterns.map((p) => p.polarity), ['preferred']);
});

test('② 소유 주체를 모르는 행(이전 서버 · 이전 데이터)은 소유 주체 조회에 나오지 않는다 · ③ 이전 서버 요청은 예전처럼', async () => {
  const legacyPath = { ops: [{ op: 'open_menu', label: '주문조회' }] };
  await run('work_run_assistance_record', { runId: 'g_legacy1', targetId: 'healthkr', taskKey: 'wholesale.order_lookup', event: menuEvent(legacyPath) });
  const scoped = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: 'wholesale.order_lookup', ownerKey: OWNER_A });
  assert.deepEqual(scoped.data.patterns, []);
  const legacy = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: 'wholesale.order_lookup' });
  assert.equal(legacy.data.patterns.length, 1);
});

test('① Candidate 대조도 소유 주체 안에서만 — 같은 요청 문장이라도 B 는 A 의 재생 단계를 받지 않는다', async () => {
  const saved = await run('work_run_candidate_save', { runId: 'g_wf_a', targetId: 'healthkr', template: '약학정보원에서 {{1}} 검색해줘', steps: STEPS, ownerKey: OWNER_A });
  assert.equal(saved.status, 'success');
  const a = await run('work_run_candidate_match', { targetId: 'healthkr', request: '약학정보원에서 타이레놀 검색해줘', ownerKey: OWNER_A });
  assert.equal(a.data.matched, true);
  const b = await run('work_run_candidate_match', { targetId: 'healthkr', request: '약학정보원에서 타이레놀 검색해줘', ownerKey: OWNER_B });
  assert.equal(b.data.matched, false);
  const legacy = await run('work_run_candidate_match', { targetId: 'healthkr', request: '약학정보원에서 타이레놀 검색해줘' });
  assert.equal(legacy.data.matched, false);
  // 같은 템플릿을 B 가 저장하면 별개 Candidate 다(유일키에 owner_key).
  const savedB = await run('work_run_candidate_save', { runId: 'g_wf_b', targetId: 'healthkr', template: '약학정보원에서 {{1}} 검색해줘', steps: STEPS, ownerKey: OWNER_B });
  assert.notEqual(savedB.data.candidateId, saved.data.candidateId);
});

test('run upsert 는 owner_key 를 남긴다', async () => {
  const r = await run('work_run_upsert', { runId: 'g_up_a', status: 'active', targetId: 'healthkr', ownerKey: OWNER_A });
  assert.equal(r.status, 'success');
  const row = db.openLocalDb().prepare('SELECT owner_key FROM local_work_runs WHERE run_id=?').get('g_up_a');
  assert.equal(row.owner_key, OWNER_A);
});

test('④ 형식이 아닌 ownerKey 는 명령 전체를 거절한다', async () => {
  for (const bad of ['user-123', `o_${'g'.repeat(32)}`, 42, null]) {
    const r = await run('work_run_experience_recall', { targetId: 'healthkr', taskKey: null, ownerKey: bad });
    assert.equal(r.status, 'denied', String(bad));
  }
  const r2 = await run('work_run_candidate_match', { targetId: 'healthkr', request: '약학정보원에서 타이레놀 검색해줘', ownerKey: 'U:00000000-0000-0000-0000-000000000001' });
  assert.equal(r2.status, 'denied');
});

test('v7 → v8 업그레이드: 기존 패턴 · Candidate 행은 보존되고 owner_key NULL(격리)로 남는다', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const file = path.join(tmpHome, 'upgrade-v7.db');
  const h = new DatabaseSync(file);
  for (const m of db.MIGRATIONS.filter((x) => x.version <= 7)) m.up(h);
  const now = new Date().toISOString();
  h.prepare("INSERT INTO local_experience_patterns(pattern_id, target_id, task_key, stage_key, polarity, pattern_json, pattern_sig, source_run_id, verified_count, status, created_at, updated_at) VALUES('lp_old', 'healthkr', 'a.b', 's1', 'preferred', '{\"ops\":[]}', 'sig', 'g_old', 3, 'verified', ?, ?)").run(now, now);
  h.prepare("INSERT INTO local_workflow_candidates(candidate_id, target_id, request_template, steps_json, source_run_id, created_at, updated_at) VALUES('wc_old', 'healthkr', 't {{1}}', '[]', 'g_old', ?, ?)").run(now, now);
  db.MIGRATIONS.find((x) => x.version === 8).up(h);
  const p = h.prepare("SELECT owner_key, verified_count FROM local_experience_patterns WHERE pattern_id='lp_old'").get();
  assert.deepEqual({ ...p }, { owner_key: null, verified_count: 3 });
  const c = h.prepare("SELECT owner_key, request_template FROM local_workflow_candidates WHERE candidate_id='wc_old'").get();
  assert.deepEqual({ ...c }, { owner_key: null, request_template: 't {{1}}' });
  h.close();
});

test('⑤ heartbeat 보고 = 버전 + boolean capability 뿐', () => {
  const ready = buildHeartbeatReport({ agentVersion: handlers.AGENT_VERSION, extensionConnected: true, platform: 'win32', dbState: { ready: true, schemaVersion: 8 }, hasLocalData: true });
  assert.deepEqual(ready, { agentVersion: handlers.AGENT_VERSION, capabilities: { browser: true, windowsUia: true, localData: true, ownerScopedLedger: true, taskUnit: true } });
  const cold = buildHeartbeatReport({ agentVersion: '0.2.0', extensionConnected: false, platform: 'linux', dbState: { ready: false, schemaVersion: 0 }, hasLocalData: true });
  assert.deepEqual(cold.capabilities, { browser: false, windowsUia: false, localData: false, ownerScopedLedger: false, taskUnit: false });
  const v7 = buildHeartbeatReport({ agentVersion: '0.2.0', extensionConnected: true, platform: 'win32', dbState: { ready: true, schemaVersion: 7 }, hasLocalData: false });
  assert.equal(v7.capabilities.ownerScopedLedger, false);
});
