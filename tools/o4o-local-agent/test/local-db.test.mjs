/**
 * Local Data Runtime V0 — 런타임 동작 테스트 (WO-O4O-LOCAL-DATA-SQLITE-V0 §48)
 *
 * 의존성 0 — node:test + node:assert + node:sqlite(내장). 실행:
 *   node --test tools/o4o-local-agent/test/
 *
 * 실제 SQLite 를 도는 항목들(생성·재기동·마이그레이션·트랜잭션·파라미터 쿼리·설정·
 * import·export)을 여기서 검증한다. 정적 경계(임의 SQL/파일 tool 부재 등)는
 * api-server jest 의 local-agent-runtime.spec.ts 가 CI 에서 함께 본다(§49).
 *
 * 각 실행은 격리된 임시 O4O_AGENT_HOME 을 쓴다 — 실제 매장 PC 의 local.db 를 건드리지 않는다.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmpHome;
before(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'o4o-localdb-test-'));
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

test('1. DB 자동 생성 — 열면 local.db 파일과 핵심 테이블이 생긴다', () => {
  const h = db.localDbHealth();
  assert.equal(h.ok, true);
  assert.ok(fs.existsSync(path.join(tmpHome, 'local.db')));
  // local_ prefix 테이블: V0 핵심 7(meta·migrations·settings·mappings·imports·exports·work_state) + V1 datasets 2
  //   + PHASE 1 same-run(WEB-AUTOMATION-RESUME-V1) work_runs 1 + 게이트2(HOSPITAL-DRUG) source_bindings 1
  //   + PHASE 2 work_run_steps · workflow_candidates 2 = 13.
  //   고정 숫자 대신 실측 대조 — migration 추가 시 stale 방지.
  const actualTables = db.openLocalDb()
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name LIKE 'local\\_%' ESCAPE '\\'")
    .get().n;
  assert.equal(h.tableCount, actualTables);
});

test('2. 재기동 — 닫았다 다시 열어도 local_db_id 가 유지된다', () => {
  const id1 = db.LocalMetaRepository.get('local_db_id');
  assert.match(id1, /^[0-9a-f-]{36}$/i);
  db.closeLocalDb();
  db.openLocalDb();
  const id2 = db.LocalMetaRepository.get('local_db_id');
  assert.equal(id2, id1);
});

test('3. 스키마 버전 — meta 와 health 가 일치한다', () => {
  const h = db.localDbHealth();
  assert.equal(h.schemaVersion, db.SCHEMA_VERSION);
  assert.equal(h.expectedSchemaVersion, db.SCHEMA_VERSION);
  assert.equal(h.migrationOk, true);
  assert.equal(Number(db.LocalMetaRepository.get('schema_version')), db.SCHEMA_VERSION);
});

test('4. 마이그레이션 적용 — local_schema_migrations 에 version 1 이 기록된다', () => {
  const handle = db.openLocalDb();
  const row = handle.prepare('SELECT version, name FROM local_schema_migrations WHERE version=1').get();
  assert.equal(row.version, 1);
  assert.equal(row.name, 'core_v0');
});

test('5. 마이그레이션 idempotency — 다시 열어도 마이그레이션 행이 늘지 않는다', () => {
  const handle = db.openLocalDb();
  const before = handle.prepare('SELECT COUNT(*) AS n FROM local_schema_migrations').get().n;
  db.closeLocalDb();
  db.openLocalDb();
  const after = db.openLocalDb().prepare('SELECT COUNT(*) AS n FROM local_schema_migrations').get().n;
  assert.equal(after, before);
});

test('6. 트랜잭션 롤백 — fn 이 던지면 변경이 남지 않는다', () => {
  db.LocalSettingsRepository.set('tx_probe', 'before');
  assert.throws(() =>
    db.withTransaction((handle) => {
      handle
        .prepare(
          'INSERT INTO local_settings(key,value,updated_at) VALUES(?,?,?) ' +
            'ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run('tx_probe', 'after', new Date().toISOString());
      throw new Error('boom');
    }),
  );
  assert.equal(db.LocalSettingsRepository.get('tx_probe'), 'before');
});

test('7. 파라미터 쿼리 — 주입 시도 문자열이 리터럴로만 저장된다', () => {
  const evil = "x'); DROP TABLE local_settings; --";
  db.LocalSettingsRepository.set('inj_key', evil);
  assert.equal(db.LocalSettingsRepository.get('inj_key'), evil);
  // 테이블이 여전히 살아 있다 → 값이 SQL 로 실행되지 않았다.
  const h = db.localDbHealth();
  const actualTables = db.openLocalDb()
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name LIKE 'local\\_%' ESCAPE '\\'")
    .get().n;
  assert.equal(h.tableCount, actualTables);
});

test('9. 설정 쓰기/읽기 — set 한 값이 그대로 읽힌다', () => {
  db.LocalSettingsRepository.set('store_hint', '피앤디약국');
  assert.equal(db.LocalSettingsRepository.get('store_hint'), '피앤디약국');
});

test('10~12. CSV import — 매핑 적용·불필요 컬럼 폐기·부족 필드 감지', () => {
  // 47 필드 흉내: 필요한 2개 + 버릴 것들. 헤더는 실제 약국 Excel 을 모사한 합성 fixture.
  const csv = [
    '품목명,규격,재고수량,매입처,메모,사용안함1,사용안함2',
    '타이레놀정500mg,10정,120,대한약품,,zzz,qqq',
    '판콜에이,30ml,,종근당,,zzz,qqq',
  ].join('\n');
  const result = db.importCsv({
    csvText: csv,
    sourceType: 'pharmacy_excel',
    profileName: 'pnd_v0',
    columnMapping: { 품목명: 'item_name', 재고수량: 'stock_qty' },
    requiredFields: ['item_name', 'stock_qty'],
  });
  // 10. 매핑: 품목명→item_name
  assert.equal(result.importedRows[0].item_name, '타이레놀정500mg');
  assert.equal(result.rowCount, 2);
  // 11. 불필요 컬럼 폐기: 규격·매입처·메모·사용안함1·사용안함2 는 mapped 에 없다.
  assert.deepEqual(result.droppedColumns.sort(), ['규격', '매입처', '메모', '사용안함1', '사용안함2'].sort());
  assert.equal('규격' in result.importedRows[0], false);
  // 12. 부족 필드: 2행 stock_qty 가 비어 강제 완성하지 않고 missing 으로 돌려준다.
  assert.deepEqual(result.missingFields, ['stock_qty']);
});

test('12b. 매핑에 아예 없는 required 필드도 missing 으로 돌려준다 (억지 완성 안 함)', () => {
  const csv = 'a,b\n1,2';
  const result = db.importCsv({
    csvText: csv,
    sourceType: 't',
    profileName: 't',
    columnMapping: { a: 'item_name' },
    requiredFields: ['item_name', 'price'],
  });
  assert.deepEqual(result.missingFields, ['price']);
});

test('13. CSV export — 행을 CSV 로 만들고 콤마/따옴표를 escape 한다', () => {
  const csv = db.toCsv(
    [
      { item_name: '타이레놀', note: 'a,b' },
      { item_name: '판콜에이', note: '"q"' },
    ],
    ['item_name', 'note'],
  );
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'item_name,note');
  assert.equal(lines[1], '타이레놀,"a,b"');
  assert.equal(lines[2], '판콜에이,"""q"""');
  db.recordExport({ target: 'items', format: 'csv', rowCount: 2 });
});

// ─── runAction 경유 (agent tool 계약) ───────────────────────────────────────

test('runAction: local.data.health 성공', async () => {
  const r = await handlers.runAction('local.data.health', { deviceName: 'x' }, undefined);
  assert.equal(r.status, 'success');
  assert.equal(r.data.ok, true);
  // 경로 누출 금지 — 응답 어디에도 임시 홈 경로가 없다(§38).
  assert.equal(JSON.stringify(r).includes(tmpHome), false);
});

test('runAction: local.data.get_meta 는 allowlist 된 key 하나의 key/value 만 돌려준다', async () => {
  const r = await handlers.runAction('local.data.get_meta', {}, { key: 'schema_version' });
  assert.equal(r.status, 'success');
  assert.equal(r.data.key, 'schema_version');
  // 단일 key/value 계약 — 전체 meta 덤프(meta 배열)가 아니다.
  assert.equal('meta' in r.data, false);
  assert.ok('value' in r.data);
});

test('runAction: local.data.get_meta 는 allowlist 밖 key 를 거부한다 (§26)', async () => {
  // local_db_id 는 상관 지문이라 meta allowlist 에서 일부러 빠졌다(§18).
  const denied = await handlers.runAction('local.data.get_meta', {}, { key: 'local_db_id' });
  assert.equal(denied.status, 'denied');
  assert.equal(denied.errorCode, 'LOCAL_DATA_KEY_NOT_ALLOWED');
  const noArgs = await handlers.runAction('local.data.get_meta', {}, undefined);
  assert.equal(noArgs.status, 'denied');
  assert.equal(noArgs.errorCode, 'LOCAL_DATA_INVALID_ARGUMENT');
});

test('runAction: local.data.set_setting 성공 (값 원문은 응답에 없음)', async () => {
  const r = await handlers.runAction('local.data.set_setting', {}, { key: 'locale', value: 'ko' });
  assert.equal(r.status, 'success');
  assert.equal(r.data.key, 'locale');
  assert.equal(r.data.saved, true);
  assert.equal('value' in r.data, false);
  assert.equal(db.LocalSettingsRepository.get('locale'), 'ko');
});

test('8. runAction: 잘못된 set_setting 인자는 거부된다', async () => {
  // 허용 밖 key.
  const badKey = await handlers.runAction('local.data.set_setting', {}, { key: 'ui.lang', value: 'ko' });
  assert.equal(badKey.status, 'denied');
  assert.equal(badKey.errorCode, 'LOCAL_DATA_KEY_NOT_ALLOWED');
  // 허용 key + 허용 밖 value (locale 은 enum).
  const badValue = await handlers.runAction('local.data.set_setting', {}, { key: 'locale', value: 'de' });
  assert.equal(badValue.status, 'denied');
  assert.equal(badValue.errorCode, 'LOCAL_DATA_INVALID_ARGUMENT');
  const noArgs = await handlers.runAction('local.data.set_setting', {}, undefined);
  assert.equal(noArgs.status, 'denied');
  assert.equal(noArgs.errorCode, 'LOCAL_DATA_INVALID_ARGUMENT');
});

test('14. runAction: 임의 SQL tool 은 존재하지 않는다 (denied)', async () => {
  const r = await handlers.runAction('local.sqlite.execute_sql', {}, { sql: 'SELECT 1' });
  assert.equal(r.status, 'denied');
  assert.equal(r.errorCode, 'DENIED_UNKNOWN_ACTION');
  // 등록 목록에도 execute_sql 류가 없다.
  const listed = handlers.listAllowedActions();
  // DOM-CONTROL-V0 의 local.browser.dom.read_text / read_table 은 등재 site 탭의 **화면 텍스트** 읽기다 —
  // 파일 · 행 · SQL 읽기가 아니므로 제외한다. 그 밖의 read_* 이름은 여전히 없어야 한다.
  assert.equal(listed.some((a) => /sql|exec|file/i.test(a)), false);
  assert.equal(listed.filter((a) => /read/i.test(a)).every((a) => a.startsWith('local.browser.dom.read_')), true);
  assert.ok(listed.includes('local.data.health'));
});

test('local.data.* 는 #appId 형태를 허용하지 않는다', async () => {
  const r = await handlers.runAction('local.data.health#windows.notepad', {}, undefined);
  assert.equal(r.status, 'denied');
  assert.equal(r.errorCode, 'DENIED_UNKNOWN_ACTION');
});

// ─── PHASE 2 Workflow Candidate (WEB-AUTOMATION-RESUME-V1 · IR §8·§9-2·§9-3) ─────────────
// 값 없는 semantic 단계 + 요청 템플릿만 저장하고, 대조는 이 PC 에서 한다. 돌려주는 것은 이번 요청의 값을 채운 재생 단계뿐이다.

const WF_STEPS = [
  { actionKind: 'set_input', locator: { role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' }, slot: 1, expect: { navigated: false, changed: false }, path: '/' },
  { actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true }, path: '/' },
];

test('PHASE 2: candidate_save → candidate_match 는 이번 요청 값을 채운 단계만 돌려준다(템플릿 · 통계 미반환)', async () => {
  const saved = await handlers.runAction('local.data.work_run_candidate_save', {}, {
    runId: 'g_wf1', targetId: 'healthkr', template: '약학정보원에서 {{1}} 검색해줘', steps: WF_STEPS,
  });
  assert.equal(saved.status, 'success');
  assert.equal(saved.data.saved, true);
  assert.match(saved.data.candidateId, /^wc_[a-z0-9]{6,32}$/);

  const hit = await handlers.runAction('local.data.work_run_candidate_match', {}, { targetId: 'healthkr', request: '약학정보원에서 아스피린 검색해줘' });
  assert.equal(hit.status, 'success');
  assert.equal(hit.data.matched, true);
  assert.equal(hit.data.candidateId, saved.data.candidateId);
  assert.deepEqual(hit.data.steps, [
    { actionKind: 'set_input', locator: WF_STEPS[0].locator, expect: WF_STEPS[0].expect, value: '아스피린' },
    { actionKind: 'click', locator: WF_STEPS[1].locator, expect: WF_STEPS[1].expect },
  ]);
  // 과거 요청 템플릿 · 통계 · source run 은 응답에 없다.
  const text = JSON.stringify(hit.data);
  assert.equal(text.includes('{{1}}'), false);
  assert.equal(text.includes('g_wf1'), false);
  assert.equal(/success_count|failure_count|template/.test(text), false);

  // 형태가 다른 요청 · 다른 대상은 맞지 않는다.
  const miss = await handlers.runAction('local.data.work_run_candidate_match', {}, { targetId: 'healthkr', request: '아스피린 부작용 알려줘' });
  assert.equal(miss.data.matched, false);

  // 저장된 단계 원장(run 단계)과 Candidate 에 입력값이 없다.
  const rows = db.openLocalDb().prepare('SELECT steps_json, request_template FROM local_workflow_candidates').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].steps_json.includes('타이레놀'), false);
  assert.equal(db.openLocalDb().prepare("SELECT COUNT(*) AS n FROM local_work_run_steps WHERE run_id='g_wf1'").get().n, 2);
});

test('PHASE 2: 같은 (대상, 템플릿) 재저장은 갱신 · 재생 결과가 반복 실패면 Candidate 를 끈다', async () => {
  const again = await handlers.runAction('local.data.work_run_candidate_save', {}, {
    runId: 'g_wf2', targetId: 'healthkr', template: '약학정보원에서 {{1}} 검색해줘', steps: WF_STEPS,
  });
  const id = again.data.candidateId;
  assert.equal(db.openLocalDb().prepare('SELECT COUNT(*) AS n FROM local_workflow_candidates').get().n, 1);
  for (let i = 0; i < 3; i += 1) {
    const r = await handlers.runAction('local.data.work_run_candidate_result', {}, { candidateId: id, outcome: 'replay_diverged' });
    assert.equal(r.status, 'success');
  }
  const status = db.openLocalDb().prepare('SELECT status FROM local_workflow_candidates WHERE candidate_id=?').get(id).status;
  assert.equal(status, 'disabled');
  const off = await handlers.runAction('local.data.work_run_candidate_match', {}, { targetId: 'healthkr', request: '약학정보원에서 게보린 검색해줘' });
  assert.equal(off.data.matched, false);
  // 같은 형태를 다시 성공하면(AI 가 고친 경로) 다시 켠다.
  await handlers.runAction('local.data.work_run_candidate_save', {}, { runId: 'g_wf3', targetId: 'healthkr', template: '약학정보원에서 {{1}} 검색해줘', steps: WF_STEPS });
  const on = await handlers.runAction('local.data.work_run_candidate_match', {}, { targetId: 'healthkr', request: '약학정보원에서 게보린 검색해줘' });
  assert.equal(on.data.matched, true);
});

test('PHASE 2: candidate_* 는 형상 밖 인자를 거부한다(좌표 · elementRef · 값 · 미등재 대상 · 자리 불일치)', async () => {
  const bad = [
    { runId: 'g_x', targetId: 'healthkr', template: '{{1}} 검색', steps: [{ ...WF_STEPS[0], elementRef: 'e_2' }, WF_STEPS[1]] },
    { runId: 'g_x', targetId: 'healthkr', template: '{{1}} 검색', steps: [{ ...WF_STEPS[1], x: 0.3, y: 0.4 }] },
    { runId: 'g_x', targetId: 'healthkr', template: '{{1}} 검색', steps: [{ ...WF_STEPS[0], value: '타이레놀' }] },
    { runId: 'g_x', targetId: 'not_registered', template: '{{1}} 검색', steps: WF_STEPS },
    { runId: 'g_x', targetId: 'healthkr', template: '{{2}} 검색', steps: WF_STEPS },
    { runId: 'g_x', targetId: 'healthkr', template: '{{1}}', steps: WF_STEPS },
    { runId: 'g_x', targetId: 'healthkr', template: '{{1}} 검색', steps: [{ ...WF_STEPS[1], locator: { role: 'button', name: '<script>' } }] },
  ];
  for (const args of bad) {
    const r = await handlers.runAction('local.data.work_run_candidate_save', {}, args);
    assert.equal(r.status, 'denied', JSON.stringify(args));
  }
  const badMatch = await handlers.runAction('local.data.work_run_candidate_match', {}, { targetId: 'healthkr', request: 'x', extra: 1 });
  assert.equal(badMatch.status, 'denied');
  const badResult = await handlers.runAction('local.data.work_run_candidate_result', {}, { candidateId: 'wc_abcdef', outcome: 'deleted' });
  assert.equal(badResult.status, 'denied');
});

test('PHASE 2: matchWorkflowTemplate — 공백 정규화 · 같은 자리 같은 값 · 빈 값 거부', () => {
  assert.deepEqual(db.matchWorkflowTemplate('{{1}} 검색해줘', '  타이레놀   500mg  검색해줘 '), ['타이레놀 500mg']);
  assert.deepEqual(db.matchWorkflowTemplate('{{1}}에서 {{2}} 찾아줘', '약학정보원에서 아스피린 찾아줘'), ['약학정보원', '아스피린']);
  assert.equal(db.matchWorkflowTemplate('{{1}} 검색해줘', '타이레놀 찾아줘'), null);
  assert.equal(db.matchWorkflowTemplate('{{1}} 과 {{1}} 비교', '타이레놀 과 아스피린 비교'), null);
});

// ─── Experience 원장 (WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1) ──────

const EXP_METRIC = { totalMs: 4200, aiMs: 1800, aiCalls: 2, commandWaitMs: null, executionMs: null, settleMs: 300, actionCount: 2, stepCount: 3, retryCount: 0 };
const expStep = (seq, over = {}) => ({
  seq, stage: 'activate', actionKind: 'click', method: 'browser_dom', locator: { role: 'button', name: '검 색' }, actor: 'ai_normal',
  resultStatus: 'success', resultEvidence: 'system_verified', errorCode: null, durationMs: 120, ...over,
});
const expFailure = (over = {}) => ({
  stepSeq: null, stage: null, layer: null, failureClass: null, errorCode: null, method: null, recoveryTier: null, recoveryResult: null, uiChangeSuspected: false, ...over,
});
const expArgs = (over = {}) => ({
  runId: 'g_exp1',
  segment: { startedAt: '2026-10-01T01:00:00.000Z', endedAt: '2026-10-01T01:00:04.200Z', endState: 'completed', resumed: false },
  target: { targetId: 'healthkr', targetKind: 'browser_site' },
  outcome: { status: 'SUCCESS', evidence: 'agent_inferred' },
  metric: EXP_METRIC,
  steps: [
    expStep(1, { stage: 'observe', actionKind: 'inspect', locator: null }),
    expStep(2, { stage: 'input', actionKind: 'set_input', locator: { role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' } }),
    expStep(3),
  ],
  failures: [],
  ...over,
});

test('Experience: 성공 run — Run · Segment · Step(전 단계) · Metric · Outcome 이 남는다', async () => {
  const r = await handlers.runAction('local.data.work_run_experience_record', {}, expArgs());
  assert.equal(r.status, 'success');
  assert.deepEqual(r.data, { saved: true, duplicate: false, segmentIndex: 1, stepCount: 3, failureCount: 0 });
  const e = db.LocalWorkRunExperienceRepository.get('g_exp1');
  assert.equal(e.run.outcome_status, 'SUCCESS');
  assert.equal(e.run.outcome_evidence, 'agent_inferred');
  assert.equal(e.run.target_id, 'healthkr');
  assert.equal(e.run.target_kind, 'browser_site');
  assert.equal(e.run.task_key, null);
  assert.equal(e.run.task_provisional, 1);
  assert.equal(e.run.segment_count, 1);
  assert.equal(e.run.started_at, '2026-10-01T01:00:00.000Z');
  assert.equal(e.run.ended_at, '2026-10-01T01:00:04.200Z');
  assert.equal(e.segments.length, 1);
  assert.equal(e.segments[0].ai_ms, 1800);
  assert.equal(e.segments[0].command_wait_ms, null, '근거 없는 metric 은 추정하지 않고 NULL');
  assert.equal(e.segments[0].user_wait_ms, null);
  assert.deepEqual(e.steps.map((s) => [s.seq, s.stage, s.action_kind, s.result_status]), [
    [1, 'observe', 'inspect', 'success'],
    [2, 'input', 'set_input', 'success'],
    [3, 'activate', 'click', 'success'],
  ]);
  assert.deepEqual(JSON.parse(e.steps[2].locator_json), { role: 'button', name: '검 색' });
  // 같은 segment 재전송은 중복으로 무시된다(idempotent).
  const again = await handlers.runAction('local.data.work_run_experience_record', {}, expArgs());
  assert.equal(again.data.duplicate, true);
  assert.equal(db.LocalWorkRunExperienceRepository.get('g_exp1').steps.length, 3);
});

test('Experience: 실패 step · runtime 실패 이벤트 · run 상태는 건드리지 않는다', async () => {
  db.LocalWorkRunRepository.upsert({ runId: 'g_exp2', status: 'active', targetId: 'healthkr', goalSummary: '약학정보원 검색' });
  db.LocalWorkRunRepository.setStatus('g_exp2', 'taken_over');
  const r = await handlers.runAction('local.data.work_run_experience_record', {}, expArgs({
    runId: 'g_exp2',
    segment: { startedAt: '2026-10-01T02:00:00.000Z', endedAt: '2026-10-01T02:00:09.000Z', endState: 'taken_over', resumed: false },
    outcome: { status: 'FAILED', evidence: 'system_verified' },
    steps: [expStep(1, { stage: 'observe', actionKind: 'inspect', locator: null, resultStatus: 'failed', errorCode: 'DOM_CONTENT_UNAVAILABLE' })],
    failures: [
      expFailure({ stepSeq: 1, stage: 'observe', layer: 'runtime', failureClass: 'OBSERVATION_FAILURE', errorCode: 'DOM_CONTENT_UNAVAILABLE', method: 'browser_dom', recoveryTier: 'normal_retry', recoveryResult: 'not_recovered' }),
    ],
  }));
  assert.equal(r.status, 'success');
  const e = db.LocalWorkRunExperienceRepository.get('g_exp2');
  assert.equal(e.run.status, 'taken_over', 'experience 기록은 run 상태 전이를 하지 않는다');
  assert.equal(e.run.outcome_status, 'FAILED');
  assert.equal(e.steps[0].error_code, 'DOM_CONTENT_UNAVAILABLE');
  assert.equal(e.failures.length, 1);
  assert.equal(e.failures[0].layer, 'runtime');
  assert.equal(e.failures[0].step_seq, 1);
  assert.equal(e.failures[0].ui_change_suspected, 0);
  // goal_summary 는 기존 그대로 — 복제하지 않는다.
  assert.equal(db.LocalWorkRunRepository.get('g_exp2').goal_summary, '약학정보원 검색');
});

test('Experience: QUESTION 대기 → 재개는 같은 run · segment 2개 · 사용자 대기 시간 분리 · seq 이어짐', async () => {
  const wait = await handlers.runAction('local.data.work_run_experience_record', {}, expArgs({
    runId: 'g_exp3',
    segment: { startedAt: '2026-10-01T03:00:00.000Z', endedAt: '2026-10-01T03:00:05.000Z', endState: 'waiting_for_user', resumed: false },
    outcome: null,
    steps: [expStep(1, { stage: 'observe', actionKind: 'inspect', locator: null })],
  }));
  assert.equal(wait.data.segmentIndex, 1);
  let e = db.LocalWorkRunExperienceRepository.get('g_exp3');
  assert.equal(e.run.outcome_status, null, '대기 segment 는 최종 결과가 아니다');
  const resumed = await handlers.runAction('local.data.work_run_experience_record', {}, expArgs({
    runId: 'g_exp3',
    segment: { startedAt: '2026-10-01T03:01:05.000Z', endedAt: '2026-10-01T03:01:08.000Z', endState: 'completed', resumed: true },
    steps: [expStep(1), expStep(2, { stage: 'read', actionKind: 'read_text', locator: null })],
  }));
  assert.equal(resumed.data.segmentIndex, 2);
  e = db.LocalWorkRunExperienceRepository.get('g_exp3');
  assert.equal(e.run.segment_count, 2);
  assert.equal(e.run.started_at, '2026-10-01T03:00:00.000Z');
  assert.equal(e.run.ended_at, '2026-10-01T03:01:08.000Z');
  assert.equal(e.run.outcome_status, 'SUCCESS');
  assert.equal(e.segments[1].resumed, 1);
  assert.equal(e.segments[1].user_wait_ms, 60_000);
  assert.deepEqual(e.steps.map((s) => [s.seq, s.segment_index]), [[1, 1], [2, 2], [3, 2]]);
});

test('Experience: 형상 밖 인자는 거부 — 자유 텍스트 · 입력값 · 좌표 · elementRef · 대기 segment 의 결과 · 미등재 대상', async () => {
  const bad = [
    expArgs({ note: '사용자 답변 원문' }),
    expArgs({ steps: [expStep(1, { value: '타이레놀' })] }),
    expArgs({ steps: [expStep(1, { locator: { role: 'button', name: '검 색', x: 0.3 } })] }),
    expArgs({ steps: [expStep(1, { locator: { role: 'button', name: '검 색' }, elementRef: 'e_2' })] }),
    expArgs({ steps: [expStep(1, { method: 'windows_uia' })] }),
    expArgs({ steps: [expStep(2)] }),
    expArgs({ steps: [expStep(1, { stage: 'confirm_payment' })] }),
    expArgs({ steps: [expStep(1, { errorCode: 'password=1234' })] }),
    expArgs({ failures: [expFailure({ layer: 'network_glitch' })] }),
    expArgs({ failures: [expFailure({ stepSeq: 9 })] }),
    expArgs({ failures: [expFailure({ reason: '화면에 보인 글' })] }),
    expArgs({ segment: { startedAt: '2026-10-01T01:00:00.000Z', endedAt: '2026-10-01T01:00:04.200Z', endState: 'waiting_for_user', resumed: false } }),
    expArgs({ target: { targetId: 'not_registered', targetKind: 'browser_site' } }),
    expArgs({ outcome: { status: 'SUCCESS', evidence: 'llm_said_so' } }),
    expArgs({ metric: { ...EXP_METRIC, aiMs: 1.5 } }),
    expArgs({ metric: { ...EXP_METRIC, prompt: 'x' } }),
  ];
  for (const args of bad) {
    const r = await handlers.runAction('local.data.work_run_experience_record', {}, args);
    assert.equal(r.status, 'denied', JSON.stringify(args).slice(0, 200));
  }
});

test('Experience: 민감 sentinel 이 어디에도 저장되지 않는다 · Candidate 원장(local_work_run_steps)과 분리', async () => {
  // 인자 형상에 값 자리가 없으므로, 거부된 시도의 sentinel 이 DB 어느 테이블에도 남지 않아야 한다.
  for (const sentinel of ['SENTINEL_SLOT_VALUE_타이레놀', 'SENTINEL_USER_ANSWER', 'pw=SENTINEL_PASSWORD', 'Bearer SENTINEL_TOKEN']) {
    await handlers.runAction('local.data.work_run_experience_record', {}, expArgs({ runId: 'g_exp_s', steps: [expStep(1, { value: sentinel })] }));
    await handlers.runAction('local.data.work_run_experience_record', {}, expArgs({ runId: 'g_exp_s', answer: sentinel }));
  }
  const h = db.openLocalDb();
  const tables = h.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'local\\_%' ESCAPE '\\'").all().map((t) => t.name);
  for (const t of tables) {
    const dump = JSON.stringify(h.prepare(`SELECT * FROM ${t}`).all());
    assert.equal(/SENTINEL_/.test(dump), false, t);
  }
  // experience 단계는 Candidate 저장의 run 단계 원장에 섞이지 않는다.
  assert.equal(h.prepare("SELECT COUNT(*) AS n FROM local_work_run_steps WHERE run_id LIKE 'g_exp%'").get().n, 0);
});
