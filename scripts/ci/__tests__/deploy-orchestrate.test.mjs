/**
 * WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1 — 자동 배포 결정 · 실행 순서 (node:test · 네트워크 0 · GitHub 주입)
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FRONTENDS,
  STATE_OF,
  annotatePendingLevel3,
  autoTagName,
  buildPlan,
  commitStatus,
  computeApiDependency,
  decideAll,
  decideOne,
  decidePromote,
  executeDecisions,
  finalizeStates,
  githubClient,
  isFrozen,
  isNetworkError,
  promoteCommand,
  wiringPlan,
} from '../deploy-orchestrate.mjs';
import { DEPLOY_TARGETS, LEVEL_1, LEVEL_2, LEVEL_3, assessRisk } from '../deploy-risk.mjs';
import { buildWorkspaceGraph } from '../detect-affected.mjs';

const SHA = 'c'.repeat(40);
const ok = { frozen: false, ciGreen: true, headIsTarget: true };
const e = (over = {}) => ({ status: 'BEHIND', deploy_required: true, level: LEVEL_2, level3: [], rollout_pending: false, reasons: [], ...over });
const none = () => e({ status: 'BEHIND_NO_RUNTIME_CHANGE', deploy_required: false, level: LEVEL_1 });
const all = (fn) => Object.fromEntries(DEPLOY_TARGETS.map((t) => [t.key, fn(t.key)]));

describe('F. DEPLOY_FREEZE 해석 (fail-closed)', () => {
  it("정확히 'false'(대소문자 무관)만 배포 허용", () => {
    for (const v of ['false', 'FALSE', 'False', ' false ']) assert.equal(isFrozen(v), false, v);
  });
  it('true · 1 · yes · 부재 · 공백 · 오타 → freeze', () => {
    for (const v of ['true', 'TRUE', '1', 'yes', '', undefined, null, 'flase', '0', 'no']) assert.equal(isFrozen(v), true, String(v));
  });
});

describe('D. 서비스 결정', () => {
  it('LEVEL_1 → NO_DEPLOY (freeze · CI 와 무관)', () => {
    assert.equal(decideOne(none(), { ...ok, frozen: true, ciGreen: false }).decision, 'NO_DEPLOY');
  });
  it('LEVEL_2 → AUTO_DEPLOY', () => {
    assert.equal(decideOne(e(), ok).decision, 'AUTO_DEPLOY');
  });
  it('LEVEL_3 → AUTO_DEPLOY_BLOCKED reason=LEVEL_3', () => {
    const d = decideOne(e({ level: LEVEL_3, level3: [{ rule: 'db-migration', file: 'x.ts' }] }), ok);
    assert.equal(d.decision, 'AUTO_DEPLOY_BLOCKED');
    assert.match(d.reason, /^LEVEL_3 \(db-migration x\.ts\)/);
  });
  it('serving SHA 불명(UNKNOWN) → LEVEL_3 차단', () => {
    assert.equal(decideOne(e({ status: 'UNKNOWN', level: LEVEL_3, reasons: ['serving SHA 판정 불가'] }), ok).decision, 'AUTO_DEPLOY_BLOCKED');
  });
  it('rollout_pending (배포 방식 변경 뒤 첫 배포) → CONTROLLED_FIRST_ROLLOUT_REQUIRED', () => {
    assert.equal(decideOne(e({ level: LEVEL_3, rollout_pending: true }), ok).decision, 'CONTROLLED_FIRST_ROLLOUT_REQUIRED');
  });
  it('runtime L3 + rollout_pending → LEVEL_3 가 우선', () => {
    assert.equal(decideOne(e({ level: LEVEL_3, rollout_pending: true, level3: [{ rule: 'auth-backend', file: 'a.ts' }] }), ok).decision, 'AUTO_DEPLOY_BLOCKED');
  });
  it('우선순위: freeze → CI → superseded', () => {
    assert.equal(decideOne(e(), { ...ok, frozen: true }).decision, 'BLOCKED_DEPLOY_FREEZE');
    assert.equal(decideOne(e(), { ...ok, ciGreen: false }).decision, 'BLOCKED_CI_NOT_GREEN');
    assert.equal(decideOne(e(), { ...ok, ciGreen: null }).decision, 'BLOCKED_CI_NOT_GREEN');
    assert.equal(decideOne(e(), { ...ok, headIsTarget: false }).decision, 'SUPERSEDED_BY_NEWER_MAIN');
  });
});

describe('I. 서비스 독립 판정 + API 의존 규칙', () => {
  it('API 무변경 · KPA L2 · store L3 → KPA 만 자동, store 차단 (서로 독립)', () => {
    const per = all((k) => (k === 'kpa-society' ? e() : k === 'store' ? e({ level: LEVEL_3, level3: [{ rule: 'auth-frontend', file: 's' }] }) : none()));
    const d = decideAll(per, ok);
    assert.equal(d['kpa-society'].decision, 'AUTO_DEPLOY');
    assert.equal(d.store.decision, 'AUTO_DEPLOY_BLOCKED');
  });
  it('API L3 차단 → 같은 target 의 프런트 L2 도 HELD_API_NOT_DEPLOYED', () => {
    const per = all((k) => (k === 'api' ? e({ level: LEVEL_3, level3: [{ rule: 'db-migration', file: 'm' }] }) : k === 'neture' ? e() : none()));
    const d = decideAll(per, ok);
    assert.equal(d.api.decision, 'AUTO_DEPLOY_BLOCKED');
    assert.equal(d.neture.decision, 'HELD_API_NOT_DEPLOYED');
  });
  it('API 무변경이면 API 결정은 프런트에 영향 없음', () => {
    const per = all((k) => (k === 'neture' ? e() : none()));
    assert.equal(decideAll(per, ok).neture.decision, 'AUTO_DEPLOY');
  });
  it('API · 프런트 모두 L2 → 둘 다 AUTO_DEPLOY', () => {
    const per = all((k) => (k === 'api' || k === 'neture' ? e() : none()));
    const d = decideAll(per, ok);
    assert.equal(d.api.decision, 'AUTO_DEPLOY');
    assert.equal(d.neture.decision, 'AUTO_DEPLOY');
    assert.ok(FRONTENDS.includes('neture') && !FRONTENDS.includes('api'));
  });
});

function fakeGh({ apiConclusion = 'success', tagSha = null } = {}) {
  const calls = [];
  let t = 0;
  return {
    calls,
    now: () => new Date(Date.UTC(2026, 9, 1) + t),
    sleep: async (ms) => {
      t += ms;
    },
    gh: {
      ensureTag: async (tag, sha) => {
        calls.push(['tag', tag]);
        if (tagSha && tagSha !== sha) throw new Error('태그 불일치');
        return 'created';
      },
      dispatch: async (file, ref, inputs) => calls.push(['dispatch', file, ref, JSON.stringify(inputs)]),
      findRun: async (file) => ({ id: file === 'deploy-api.yml' ? 1 : 2 }),
      runStatus: async () => ({ status: 'completed', conclusion: apiConclusion }),
      headSha: async () => SHA,
    },
  };
}

describe('X. 실행 순서 · target 고정', () => {
  const decisions = (auto) => all((k) => ({ decision: auto.includes(k) ? 'AUTO_DEPLOY' : 'NO_DEPLOY' }));

  it('자동 배포 0 → 태그 · dispatch 0', async () => {
    const f = fakeGh();
    await executeDecisions(decisions([]), SHA, f.gh, { sleep: f.sleep, now: f.now, log: () => {} });
    assert.equal(f.calls.length, 0);
  });

  it('target 고정: deploy/auto-<sha12> 태그 ref 로 verified dispatch', async () => {
    const f = fakeGh();
    await executeDecisions(decisions(['neture']), SHA, f.gh, { sleep: f.sleep, now: f.now, log: () => {} });
    assert.deepEqual(f.calls[0], ['tag', autoTagName(SHA)]);
    assert.equal(autoTagName(SHA), `deploy/auto-${'c'.repeat(12)}`);
    const d = f.calls.find((c) => c[0] === 'dispatch');
    assert.equal(d[1], 'deploy-web-services.yml');
    assert.equal(d[2], autoTagName(SHA));
    assert.deepEqual(JSON.parse(d[3]), { service: 'neture', rollout_mode: 'verified' });
  });

  it('API 먼저 → 성공 뒤 프런트 dispatch', async () => {
    const f = fakeGh({ apiConclusion: 'success' });
    const r = await executeDecisions(decisions(['api', 'neture']), SHA, f.gh, { sleep: f.sleep, now: f.now, log: () => {} });
    const order = f.calls.filter((c) => c[0] === 'dispatch').map((c) => c[1]);
    assert.deepEqual(order, ['deploy-api.yml', 'deploy-web-services.yml']);
    assert.equal(r.api.conclusion, 'success');
  });

  it('API 실패 → 프런트 dispatch 하지 않음 (HELD)', async () => {
    const f = fakeGh({ apiConclusion: 'failure' });
    const r = await executeDecisions(decisions(['api', 'neture']), SHA, f.gh, { sleep: f.sleep, now: f.now, log: () => {} });
    assert.deepEqual(f.calls.filter((c) => c[0] === 'dispatch').map((c) => c[1]), ['deploy-api.yml']);
    assert.equal(r.neture.dispatched, false);
    assert.match(r.neture.error, /HELD_API_NOT_DEPLOYED/);
  });

  it('기존 태그가 다른 SHA 를 가리키면 dispatch 0 (target 불일치 = 중단)', async () => {
    const f = fakeGh({ tagSha: 'd'.repeat(40) });
    await assert.rejects(executeDecisions(decisions(['neture']), SHA, f.gh, { sleep: f.sleep, now: f.now, log: () => {} }));
    assert.equal(f.calls.filter((c) => c[0] === 'dispatch').length, 0);
  });
});

// ---------------------------------------------------------------------------
// WO-O4O-CICD-DEPLOY-AUTO-GITHUB-API-CONNECTION-RETRY-V1 — 연결 오류 재시도 (GET 만)
// ---------------------------------------------------------------------------

const socketErr = (code = 'UND_ERR_SOCKET') => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('other side closed'), { code }) });
const res = (status, json) => ({ status, ok: status >= 200 && status < 300, text: async () => (json === undefined ? '' : JSON.stringify(json)) });
// 응답 · 예외를 차례로 돌려주는 fetch 대역
const scripted = (steps) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(`${init.method} ${url.replace('https://api.github.com/repos/o/r', '')}`);
    const step = steps.shift();
    if (step instanceof Error) throw step;
    return step;
  };
  return { calls, fetchImpl };
};
const client = (fetchImpl) => githubClient('o/r', 't', fetchImpl, { sleep: async () => {} });
const TAG = 'deploy/auto-cccccccccccc';

describe('R. GitHub API 연결 오류 재시도', () => {
  it('연결 오류 판정: undici 소켓 계열만 · HTTP 오류 · 일반 예외는 아님', () => {
    assert.equal(isNetworkError(socketErr()), true);
    assert.equal(isNetworkError(socketErr('ECONNRESET')), true);
    assert.equal(isNetworkError(new TypeError('fetch failed')), false);
    assert.equal(isNetworkError(new SyntaxError('bad json')), false);
  });

  it('실측 재현: ensureTag 의 첫 GET 이 끊긴 소켓 → 재시도 후 태그 생성', async () => {
    const { calls, fetchImpl } = scripted([socketErr(), res(404, { message: 'Not Found' }), res(201, { ref: `refs/tags/${TAG}` })]);
    assert.equal(await client(fetchImpl).ensureTag(TAG, SHA), 'created');
    assert.deepEqual(calls, [`GET /git/ref/tags/${TAG}`, `GET /git/ref/tags/${TAG}`, 'POST /git/refs']);
  });

  it('GET 은 최대 3회 — 계속 끊기면 원래 오류를 던진다', async () => {
    const { calls, fetchImpl } = scripted([socketErr(), socketErr(), socketErr(), res(200, {})]);
    await assert.rejects(client(fetchImpl).headSha(), (err) => isNetworkError(err));
    assert.equal(calls.length, 3);
  });

  it('HTTP 오류 status 는 재시도하지 않고 그대로 돌려준다', async () => {
    const { calls, fetchImpl } = scripted([res(500, { message: 'x' })]);
    assert.equal(await client(fetchImpl).headSha(), null);
    assert.equal(calls.length, 1);
  });

  it('dispatch POST 는 연결 오류여도 재시도하지 않는다 (중복 배포 방지)', async () => {
    const { calls, fetchImpl } = scripted([socketErr(), res(204)]);
    await assert.rejects(client(fetchImpl).dispatch('deploy-api.yml', TAG, {}), (err) => isNetworkError(err));
    assert.deepEqual(calls, ['POST /actions/workflows/deploy-api.yml/dispatches']);
  });

  it('태그 생성 POST 가 연결 오류: 실제 생성됐으면 created, 아니면 원래 오류', async () => {
    const made = scripted([res(404, {}), socketErr(), res(200, { object: { sha: SHA } })]);
    assert.equal(await client(made.fetchImpl).ensureTag(TAG, SHA), 'created');
    assert.equal(made.calls.filter((c) => c.startsWith('POST')).length, 1);

    const notMade = scripted([res(404, {}), socketErr(), res(404, {})]);
    await assert.rejects(client(notMade.fetchImpl).ensureTag(TAG, SHA), (err) => isNetworkError(err));
    assert.equal(notMade.calls.filter((c) => c.startsWith('POST')).length, 1);
  });

  it('commit status POST 는 멱등 — 연결 오류면 재시도한다 (실측 066dde821: 판정 뒤 첫 POST fetch failed)', async () => {
    const { calls, fetchImpl } = scripted([socketErr(), res(201, { state: 'pending' })]);
    await client(fetchImpl).setStatus(SHA, { state: 'pending', context: 'production', description: 'x' });
    assert.deepEqual(calls, [`POST /statuses/${SHA}`, `POST /statuses/${SHA}`]);
  });
});

// ---------------------------------------------------------------------------
// WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1 — Unified Delivery 판정 (fixture §31 · 네트워크 0 · git 주입)
// ---------------------------------------------------------------------------

const graph = buildWorkspaceGraph();
const BASE = 'b'.repeat(40);
const TARGET = 'f'.repeat(40);
const C = (n) => String(n).repeat(40).slice(0, 40);

/** 실제 판정기(assessRisk)로 base → target 변경 파일을 판정해 서비스별 entry 를 만든다 (모든 서비스가 BASE 를 서빙) */
function fromFiles(paths, over = {}) {
  const r = assessRisk(paths.map((p) => ({ status: 'M', path: p })), graph, {});
  return all((k) => {
    const s = r.services[k];
    return {
      serving_sha: BASE,
      serving_source: 'fixture',
      status: s.affected ? 'BEHIND' : 'BEHIND_NO_RUNTIME_CHANGE',
      deploy_required: s.affected,
      level: s.affected ? s.level : LEVEL_1,
      level3: s.affected ? s.level3.concat(r.pipeline_hits) : [],
      rollout_pending: s.rollout.length > 0,
      reasons: s.reasons,
      ...(over[k] ?? {}),
    };
  });
}

/** git 이력 대역: commits = [{ sha, files, keys }] (오래된 것부터, BASE..TARGET) */
function fakeHistory(commits) {
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  return {
    history: {
      firstParentCommits: () => ({ ok: true, commits: commits.map((c) => c.sha) }),
      parent: (sha) => `p${sha.slice(1)}`,
      workKeys: (sha) => new Set(bySha.get(sha)?.keys ?? []),
      originOf: (_b, _t, file) => {
        const c = [...commits].reverse().find((x) => x.files.includes(file));
        return c ? { sha: c.sha, subject: `subject ${c.sha.slice(0, 4)}` } : null;
      },
    },
    provider: {
      changedFiles: (_parent, sha) => (bySha.has(sha) ? { ok: true, files: bySha.get(sha).files.map((p) => ({ status: 'M', path: p })) } : { ok: false }),
      readLock: () => undefined,
    },
  };
}

const API_FILE = 'apps/api-server/src/routes/health.ts';
const MIGRATION = 'apps/api-server/src/database/migrations/20271001000000-X.ts';
const NETURE_FILE = 'services/web-neture/src/pages/HomePage.tsx';
const STORE_FILE = 'services/web-store/src/pages/HomePage.tsx';

describe('U1. fixture §31 — LEVEL 판정 → Delivery 결정 · 계획', () => {
  it('L1 docs only → 전 서비스 NO_DEPLOY · 계획 0', () => {
    const d = decideAll(fromFiles(['docs/x.md']), ok, {});
    assert.ok(Object.values(d).every((x) => x.decision === 'NO_DEPLOY'));
    assert.deepEqual(buildPlan(d, {}), { deploy_api: false, admin_after_api: false, admin_parallel: false, web_after_api: [], web_parallel: [] });
  });
  it('L1 CI control only (판정 스크립트 · delivery/promote workflow) → NO_DEPLOY', () => {
    const per = fromFiles(['scripts/ci/deploy-orchestrate.mjs', '.github/workflows/delivery.yml', '.github/workflows/promote.yml']);
    assert.ok(Object.values(decideAll(per, ok, {})).every((x) => x.decision === 'NO_DEPLOY'));
  });
  it('L2 web only → 그 서비스만 병렬 배포', () => {
    const d = decideAll(fromFiles([NETURE_FILE]), ok, {});
    assert.equal(d.neture.decision, 'AUTO_DEPLOY');
    assert.deepEqual(buildPlan(d, {}).web_parallel, ['neture']);
  });
  it('L2 API only → API 만', () => {
    const d = decideAll(fromFiles([API_FILE]), ok, {});
    assert.equal(d.api.decision, 'AUTO_DEPLOY');
    assert.equal(buildPlan(d, {}).deploy_api, true);
  });
  it('L2 API + web (같은 commit) → 둘 다 배포 · web 은 API 성공 뒤', () => {
    const { history, provider } = fakeHistory([{ sha: C(1), files: [API_FILE, NETURE_FILE], keys: ['WO-A-V1'] }]);
    const per = fromFiles([API_FILE, NETURE_FILE]);
    const deps = computeApiDependency(TARGET, per, graph, { history, provider });
    assert.equal(deps.neture.dependent, true);
    const plan = buildPlan(decideAll(per, ok, deps), deps);
    assert.equal(plan.deploy_api, true);
    assert.deepEqual(plan.web_after_api, ['neture']);
    assert.deepEqual(plan.web_parallel, []);
  });
  for (const [label, file, rule] of [
    ['L3 auth', 'apps/api-server/src/modules/auth/auth.controller.ts', 'auth-backend'],
    ['L3 migration', MIGRATION, 'db-migration'],
    ['L3 RBAC', 'apps/api-server/src/config/service-scopes.ts', 'rbac'],
  ]) {
    it(`${label} → API HOLD (HELD_LEVEL_3) · 계획 0`, () => {
      const per = fromFiles([file]);
      const d = decideAll(per, ok, {});
      assert.equal(d.api.decision, 'AUTO_DEPLOY_BLOCKED');
      assert.equal(STATE_OF[d.api.decision], 'HELD_LEVEL_3');
      assert.ok(per.api.level3.some((h) => h.rule === rule), `${rule} hit`);
      assert.equal(buildPlan(d, {}).deploy_api, false);
    });
  }
  it('rollout_pending → HELD_ROLLOUT_PENDING', () => {
    const d = decideAll(fromFiles([NETURE_FILE], { neture: { rollout_pending: true } }), ok, {});
    assert.equal(STATE_OF[d.neture.decision], 'HELD_ROLLOUT_PENDING');
  });
  it('freeze → BLOCKED_FREEZE (L2 도) · CI failure → BLOCKED_CI', () => {
    const per = fromFiles([NETURE_FILE]);
    assert.equal(STATE_OF[decideAll(per, { ...ok, frozen: true }, {}).neture.decision], 'BLOCKED_FREEZE');
    assert.equal(STATE_OF[decideAll(per, { ...ok, ciGreen: false }, {}).neture.decision], 'BLOCKED_CI');
  });
});

describe('U2. API ↔ 프런트 의존 정밀화 (§17)', () => {
  it('API held + 의존 web(같은 WO) → HELD_API_NOT_DEPLOYED · 무관 web(다른 WO) → 독립 배포', () => {
    const { history, provider } = fakeHistory([
      { sha: C(1), files: [MIGRATION], keys: ['WO-A-V1'] },
      { sha: C(2), files: [NETURE_FILE], keys: ['WO-A-V1'] },
      { sha: C(3), files: [STORE_FILE], keys: ['WO-B-V1'] },
    ]);
    const per = fromFiles([MIGRATION, NETURE_FILE, STORE_FILE]);
    const deps = computeApiDependency(TARGET, per, graph, { history, provider });
    assert.equal(deps.neture.dependent, true);
    assert.match(deps.neture.reason, /같은 작업 WO-A-V1/);
    assert.equal(deps.store.dependent, false);
    const d = decideAll(per, ok, deps);
    assert.equal(d.api.decision, 'AUTO_DEPLOY_BLOCKED');
    assert.equal(d.neture.decision, 'HELD_API_NOT_DEPLOYED');
    assert.equal(d.store.decision, 'AUTO_DEPLOY');
    assert.deepEqual(buildPlan(d, deps).web_parallel, ['store']);
  });
  it('API 와 같은 commit 에서 바뀐 web → 의존', () => {
    const { history, provider } = fakeHistory([{ sha: C(1), files: [MIGRATION, NETURE_FILE], keys: ['WO-A-V1'] }]);
    const deps = computeApiDependency(TARGET, fromFiles([MIGRATION, NETURE_FILE]), graph, { history, provider });
    assert.equal(deps.neture.dependent, true);
    assert.match(deps.neture.reason, /같은 commit/);
  });
  it('WO 키 없는 commit 이 있으면 관련성 판단 불가 → 의존 (fail-closed)', () => {
    const noKeyWeb = fakeHistory([
      { sha: C(1), files: [MIGRATION], keys: ['WO-A-V1'] },
      { sha: C(3), files: [STORE_FILE], keys: [] },
    ]);
    assert.equal(computeApiDependency(TARGET, fromFiles([MIGRATION, STORE_FILE]), graph, noKeyWeb).store.dependent, true);
    const noKeyApi = fakeHistory([
      { sha: C(1), files: [MIGRATION], keys: [] },
      { sha: C(3), files: [STORE_FILE], keys: ['WO-B-V1'] },
    ]);
    assert.equal(computeApiDependency(TARGET, fromFiles([MIGRATION, STORE_FILE]), graph, noKeyApi).store.dependent, true);
  });
  it('git 판정 실패 · serving 불명 → 의존 (fail-closed)', () => {
    const broken = fakeHistory([{ sha: C(1), files: [MIGRATION], keys: ['WO-A-V1'] }]);
    broken.history.firstParentCommits = () => ({ ok: false });
    assert.equal(computeApiDependency(TARGET, fromFiles([MIGRATION, STORE_FILE]), graph, broken).store.dependent, true);
    const fine = fakeHistory([
      { sha: C(1), files: [MIGRATION], keys: ['WO-A-V1'] },
      { sha: C(3), files: [STORE_FILE], keys: ['WO-B-V1'] },
    ]);
    const per = fromFiles([MIGRATION, STORE_FILE], { store: { serving_sha: null } });
    assert.equal(computeApiDependency(TARGET, per, graph, fine).store.dependent, true);
  });
  it('공유 계약 package(@o4o/types) 변경은 API · 프런트를 같은 commit 에서 바꾼다 → 의존', () => {
    const TYPES = 'packages/types/src/index.ts';
    const { history, provider } = fakeHistory([{ sha: C(1), files: [TYPES], keys: ['WO-A-V1'] }]);
    const deps = computeApiDependency(TARGET, fromFiles([TYPES]), graph, { history, provider });
    assert.ok(Object.keys(deps).length > 0);
    for (const [k, v] of Object.entries(deps)) assert.equal(v.dependent, true, k);
  });
  it('API 배포 대상이 아니면 의존 없음 · deps 없는 decideAll = 종전 규칙(프런트 전부 보류)', () => {
    assert.equal(computeApiDependency(TARGET, fromFiles([NETURE_FILE]), graph, fakeHistory([])).neture.dependent, false);
    assert.equal(decideAll(fromFiles([MIGRATION, STORE_FILE]), ok).store.decision, 'HELD_API_NOT_DEPLOYED');
  });
});

describe('U3. LEVEL_3 누적 표시 (§15)', () => {
  it('이전 commit 의 L3 때문에 막힌 L2 → BLOCKED_BY_PENDING_LEVEL3 since <sha>', () => {
    const AUTH = 'packages/auth-client/src/client.ts';
    const { history } = fakeHistory([
      { sha: C(1), files: [AUTH], keys: ['WO-A-V1'] },
      { sha: TARGET, files: [NETURE_FILE], keys: ['WO-B-V1'] },
    ]);
    const per = fromFiles([AUTH, NETURE_FILE]);
    const d = annotatePendingLevel3(decideAll(per, ok, {}), per, TARGET, history);
    assert.match(d.neture.reason, new RegExp(`^BLOCKED_BY_PENDING_LEVEL3 since ${C(1).slice(0, 9)}`));
    assert.equal(d.neture.pending_level3.since, C(1));
  });
  it('target 자신이 L3 면 누적 표시 없음', () => {
    const { history } = fakeHistory([{ sha: TARGET, files: [MIGRATION], keys: ['WO-A-V1'] }]);
    const per = fromFiles([MIGRATION]);
    assert.doesNotMatch(annotatePendingLevel3(decideAll(per, ok, {}), per, TARGET, history).api.reason, /PENDING_LEVEL3/);
  });
});

describe('U4. promote — SHA 하나로 승인 (§13 · §14)', () => {
  it('L3 · 첫 rollout · L2 를 함께 승격 · 최신 서비스는 NO_DEPLOY', () => {
    const per = fromFiles([MIGRATION, NETURE_FILE], { store: { rollout_pending: true, deploy_required: true, status: 'BEHIND', level: LEVEL_2 } });
    const d = decidePromote(per, ok, undefined);
    assert.equal(d.api.decision, 'PROMOTE');
    assert.match(d.api.reason, /승인된 LEVEL_3 \(db-migration/);
    assert.equal(d.store.decision, 'PROMOTE');
    assert.match(d.store.reason, /첫 verified rollout/);
    assert.equal(d.neture.decision, 'PROMOTE');
    assert.equal(d['kpa-society'].decision, 'NO_DEPLOY');
    const plan = buildPlan(d, undefined);
    assert.equal(plan.deploy_api, true);
    assert.deepEqual([...plan.web_after_api].sort(), ['neture', 'store']);
  });
  it('SHA ≠ main HEAD → 거절 (승인 범위 고정)', () => {
    assert.equal(decidePromote(fromFiles([MIGRATION]), { ...ok, headIsTarget: false }).api.decision, 'PROMOTE_REFUSED_NOT_HEAD');
  });
  it('freeze · CI 실패 → 승인으로도 배포 0', () => {
    assert.equal(decidePromote(fromFiles([MIGRATION]), { ...ok, frozen: true }).api.decision, 'BLOCKED_DEPLOY_FREEZE');
    assert.equal(decidePromote(fromFiles([MIGRATION]), { ...ok, ciGreen: false }).api.decision, 'BLOCKED_CI_NOT_GREEN');
  });
  it('serving 불명(UNKNOWN) 서비스는 승인으로도 배포하지 않는다', () => {
    const per = fromFiles([MIGRATION], { api: { status: 'UNKNOWN', serving_sha: null, reasons: ['serving SHA 판정 불가'] } });
    assert.equal(decidePromote(per, ok).api.decision, 'PROMOTE_REFUSED_UNKNOWN_SERVING');
  });
  it('services 입력으로 좁히기 · API 를 빼면 의존 프런트는 보류', () => {
    const d = decidePromote(fromFiles([MIGRATION, NETURE_FILE]), ok, undefined, { services: ['neture'] });
    assert.equal(d.api.decision, 'NOT_SELECTED');
    assert.equal(d.neture.decision, 'HELD_API_NOT_DEPLOYED');
  });
});

describe('U5. 상태 표현 · commit status · report (§10 · §26 · §27)', () => {
  const st = (pairs) => Object.entries(pairs).map(([key, state]) => ({ key, state }));
  it('HOLD → pending + promote 명령 1줄 (≤140자)', () => {
    const s = commitStatus(st({ api: 'HELD_LEVEL_3', neture: 'DEPLOYING', admin: 'HELD_LEVEL_3', store: 'HELD_LEVEL_3', 'kpa-society': 'HELD_LEVEL_3', 'k-cosmetics': 'HELD_LEVEL_3' }), TARGET);
    assert.equal(s.overall, 'HELD_LEVEL_3');
    assert.equal(s.state, 'pending');
    assert.ok(s.description.endsWith(promoteCommand(TARGET)));
    assert.ok(s.description.length <= 140, `${s.description.length}`);
  });
  it('freeze · CI 차단에는 promote 안내를 붙이지 않는다', () => {
    assert.doesNotMatch(commitStatus(st({ api: 'BLOCKED_FREEZE' }), TARGET).description, /promote/);
    assert.equal(commitStatus(st({ api: 'BLOCKED_CI' }), TARGET).state, 'failure');
  });
  it('NO_DEPLOY · DEPLOYED · SUPERSEDED → success · FAILED → failure', () => {
    assert.equal(commitStatus(st({ api: 'NO_DEPLOY' }), TARGET).state, 'success');
    assert.equal(commitStatus(st({ api: 'DEPLOYED', neture: 'NO_DEPLOY' }), TARGET).overall, 'DEPLOYED');
    assert.equal(commitStatus(st({ api: 'SUPERSEDED' }), TARGET).state, 'success');
    assert.equal(commitStatus(st({ api: 'DEPLOYED', neture: 'FAILED' }), TARGET).state, 'failure');
  });
  it('report: serving == target → DEPLOYED · 아니면 FAILED · API 실패 뒤 의존 프런트 → HELD_DEPENDENCY', () => {
    const record = {
      target_sha: TARGET,
      execute: true,
      plan: { deploy_api: true, web_after_api: ['neture'], web_parallel: ['store'], admin_after_api: false, admin_parallel: false },
      services: [
        { key: 'api', decision: 'AUTO_DEPLOY' },
        { key: 'neture', decision: 'AUTO_DEPLOY' },
        { key: 'store', decision: 'AUTO_DEPLOY' },
        { key: 'lecture', decision: 'NO_DEPLOY' },
      ],
    };
    const good = finalizeStates(record, { api: { sha: TARGET }, neture: { sha: TARGET }, store: { sha: TARGET } });
    assert.deepEqual(good.map((s) => s.state), ['DEPLOYED', 'DEPLOYED', 'DEPLOYED', 'NO_DEPLOY']);
    const apiFail = finalizeStates(record, { api: { sha: BASE }, neture: { sha: BASE }, store: { sha: TARGET } });
    assert.deepEqual(apiFail.map((s) => s.state), ['FAILED', 'HELD_DEPENDENCY', 'DEPLOYED', 'NO_DEPLOY']);
  });
  it('배선 검증 계획: api 포함 → 프런트는 after-api · 미포함 → 병렬 · 항상 dry_call', () => {
    assert.deepEqual(wiringPlan(['api', 'neture', 'admin']), {
      execute: 'true',
      dry_call: 'true',
      deploy_api: 'true',
      admin_after_api: 'true',
      admin_parallel: 'false',
      web_after_api: ['neture'],
      web_parallel: [],
      state: 'WIRING_TEST',
    });
    assert.deepEqual(wiringPlan(['store']).web_parallel, ['store']);
  });
});

// WO-O4O-DELIVERY-NOT-SELECTED-CLASSIFICATION-CORRECTION-V1
// promote `services` 입력에서 빠진 서비스(NOT_SELECTED)가 표시 단계에서 HELD_LEVEL_3 로 바뀌던 결함. 5개 의미를 분리해 고정한다.
describe('U6. NOT_SELECTED 표시 정합 — 5개 의미 분리', () => {
  const st = (pairs) => Object.entries(pairs).map(([key, state]) => ({ key, state }));

  it('재현: promote services=[api] → 선택 안 된 서비스는 NOT_SELECTED (HELD_LEVEL_3 아님)', () => {
    const d = decidePromote(fromFiles([MIGRATION, NETURE_FILE, STORE_FILE]), ok, undefined, { services: ['api'] });
    assert.equal(d.api.decision, 'PROMOTE');
    assert.equal(STATE_OF[d.api.decision], 'DEPLOYING');
    for (const k of ['neture', 'store']) {
      assert.equal(d[k].decision, 'NOT_SELECTED', k);
      assert.equal(STATE_OF[d[k].decision], 'NOT_SELECTED', k);
    }
    assert.equal(STATE_OF[d['kpa-society'].decision], 'NO_DEPLOY');
  });

  it('5개 의미: 실제 L3 → HELD_LEVEL_3 · 미선택 → NOT_SELECTED · L2 → AUTO_DEPLOY · runtime diff 없음 → NO_DEPLOY · 선행 API 미배포 → HELD_DEPENDENCY', () => {
    assert.equal(STATE_OF[decideAll(fromFiles([MIGRATION]), ok, {}).api.decision], 'HELD_LEVEL_3');
    assert.equal(decidePromote(fromFiles([MIGRATION, STORE_FILE]), ok, undefined, { services: ['api'] }).store.decision, 'NOT_SELECTED');
    const l2 = decideAll(fromFiles([API_FILE]), ok, {});
    assert.equal(l2.api.decision, 'AUTO_DEPLOY');
    assert.equal(STATE_OF[l2['kpa-society'].decision], 'NO_DEPLOY');
    const dep = decidePromote(fromFiles([MIGRATION, NETURE_FILE]), ok, undefined, { services: ['neture'] });
    assert.equal(STATE_OF[dep.neture.decision], 'HELD_DEPENDENCY');
  });

  it('L3 다운그레이드 0 — HELD_LEVEL_3 로 가는 decision 은 실제 L3 보류 2종뿐', () => {
    const toL3 = Object.entries(STATE_OF).filter(([, s]) => s === 'HELD_LEVEL_3').map(([k]) => k).sort();
    assert.deepEqual(toL3, ['AUTO_DEPLOY_BLOCKED', 'PROMOTE_REFUSED_UNKNOWN_SERVING']);
    const unknown = fromFiles([MIGRATION], { api: { status: 'UNKNOWN', serving_sha: null, reasons: ['serving SHA 판정 불가'] } });
    assert.equal(STATE_OF[decidePromote(unknown, ok).api.decision], 'HELD_LEVEL_3');
  });

  it('commit status: 미선택은 not-selected 로 표기 · L3 표기 없음 · target 미도달이라 pending 유지', () => {
    const s = commitStatus(st({ api: 'DEPLOYING', store: 'NOT_SELECTED', 'kpa-society': 'NO_DEPLOY' }), TARGET);
    assert.equal(s.overall, 'NOT_SELECTED');
    assert.equal(s.state, 'pending');
    assert.match(s.description, /held: store\(not-selected\)/);
    assert.doesNotMatch(s.description, /\(L3\)|HELD_LEVEL_3/);
    // 실제 L3 가 함께 있으면 L3 가 전체 상태를 대표한다
    assert.equal(commitStatus(st({ api: 'HELD_LEVEL_3', store: 'NOT_SELECTED' }), TARGET).overall, 'HELD_LEVEL_3');
  });
});
