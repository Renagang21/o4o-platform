/**
 * WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1 — 자동 배포 결정 · 실행 순서 (node:test · 네트워크 0 · GitHub 주입)
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FRONTENDS, autoTagName, decideAll, decideOne, executeDecisions, isFrozen } from '../deploy-orchestrate.mjs';
import { DEPLOY_TARGETS, LEVEL_1, LEVEL_2, LEVEL_3 } from '../deploy-risk.mjs';

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
