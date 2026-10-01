/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 §22 · §28 Env — undefined optional variable → empty overwrite 하지 않음
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { currentPlainEnv, planOptionalEnv, resolveOptionalEnv, setEnvFlag } from '../cloud-run-env.mjs';

const svc = (env) => ({ spec: { template: { spec: { containers: [{ env }] } } } });

describe('optional env', () => {
  it('정의 없음 · 현재도 빈 값 → omit (빈 문자열을 만들지 않는다)', () => {
    assert.deepEqual(resolveOptionalEnv('', ''), { action: 'omit' });
    assert.deepEqual(resolveOptionalEnv(undefined, undefined), { action: 'omit' });
    assert.deepEqual(resolveOptionalEnv('   ', undefined), { action: 'omit' });
  });

  it('정의 없음 · 현재 값 있음 → carry (전체 교체로 지워지지 않게 현재 값 유지)', () => {
    assert.deepEqual(resolveOptionalEnv('', 'openai'), { action: 'carry', value: 'openai' });
  });

  it('정의 있음 → set (현재 값보다 우선)', () => {
    assert.deepEqual(resolveOptionalEnv('gemini', 'openai'), { action: 'set', value: 'gemini' });
  });

  it('gcloud JSON 은 빈 값 env 의 value 키를 생략한다 — 현재 값 없음으로 읽는다 (2026-09-30 실측 형태)', () => {
    const cur = currentPlainEnv(svc([{ name: 'AI_DEFAULT_PROVIDER' }, { name: 'GEMINI_API_KEY', value: 'k' }, { name: 'X', valueFrom: { secretKeyRef: {} } }]));
    assert.deepEqual(cur, { GEMINI_API_KEY: 'k' });
  });

  it('실측 상태 재현: 네 변수 모두 정의 없음 · 현재 빈 값 → 전부 omit', () => {
    const names = ['AI_DEFAULT_PROVIDER', 'AI_DEFAULT_MODEL_OPENAI', 'TOSS_PAYMENTS_CLIENT_KEY', 'TOSS_PAYMENTS_SECRET_KEY'];
    const plan = planOptionalEnv(names, {}, svc(names.map((name) => ({ name }))));
    assert.deepEqual(plan.map((p) => p.action), ['omit', 'omit', 'omit', 'omit']);
  });

  it('서비스 조회 실패(null) → carry 없이 set/omit', () => {
    assert.deepEqual(planOptionalEnv(['A', 'B'], { A: 'v' }, null).map((p) => p.action), ['set', 'omit']);
  });

  it('flag 형식 — 쉼표 값은 구분자 문법 · 잘못된 이름 거부', () => {
    assert.equal(setEnvFlag('A', 'x'), '--set-env-vars=A=x');
    assert.equal(setEnvFlag('A', 'x,y'), '--set-env-vars=^@@^A=x,y');
    assert.throws(() => setEnvFlag('a-b', 'x'));
  });
});
