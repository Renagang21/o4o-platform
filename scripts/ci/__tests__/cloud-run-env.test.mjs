/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 §22 · §28 Env — undefined optional variable → empty overwrite 하지 않음
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertCurrentKnown, assertPlainEnvKnown, currentPlainEnv, planOptionalEnv, resolveOptionalEnv, setEnvFlag, workflowMaskValue } from '../cloud-run-env.mjs';

const svc = (env) => ({ spec: { template: { spec: { containers: [{ env }] } } } });

describe('optional env', () => {
  it('가격 catalog를 제공하면 set·미제공이면 carry·둘 다 없으면 omit하며 secret 연결은 누락으로 처리하지 않는다', () => {
    const name = 'AI_PRICING_CATALOG';
    const current = svc([{ name, value: 'existing-reviewed-catalog' }]);
    assert.deepEqual(planOptionalEnv([name], { [name]: 'new-reviewed-catalog' }, current), [{ name, action: 'set', value: 'new-reviewed-catalog' }]);
    assert.deepEqual(planOptionalEnv([name], {}, current), [{ name, action: 'carry', value: 'existing-reviewed-catalog' }]);
    assert.deepEqual(planOptionalEnv([name], {}, svc([])), [{ name, action: 'omit' }]);
    assert.doesNotThrow(() => assertPlainEnvKnown(current, [name]));
    assert.throws(() => assertPlainEnvKnown(svc([{ name, valueFrom: { secretKeyRef: { name: 'fixture-reference' } } }]), [name]));
    assert.doesNotThrow(() => assertPlainEnvKnown(svc([{ name: 'OTHER_SECRET', valueFrom: { secretKeyRef: {} } }]), [name]));
  });

  it('가격 JSON의 쉼표·기존 delimiter가 다른 env flag를 만들지 않으며 NUL은 거부한다', () => {
    const value = JSON.stringify({ version: 'fixture', models: ['synthetic@@model', 'synthetic-second'] });
    const flag = setEnvFlag('AI_PRICING_CATALOG', value);
    const prefix = '--set-env-vars=^';
    assert.ok(flag.startsWith(prefix));
    const rest = flag.slice(prefix.length), boundary = rest.indexOf('^');
    const delimiter = rest.slice(0, boundary), assignment = rest.slice(boundary + 1);
    assert.ok(!value.includes(delimiter));
    assert.deepEqual(assignment.split(delimiter), [`AI_PRICING_CATALOG=${value}`]);
    assert.throws(() => setEnvFlag('AI_PRICING_CATALOG', 'first\0--set-env-vars=OTHER=value'));
  });

  it('여러 줄 값의 mask 등록이 로그 명령이나 raw 다음 줄로 해석되지 않는다', () => {
    assert.equal(workflowMaskValue('first%\r\n::notice::not-a-command'), 'first%25%0D%0A::notice::not-a-command');
  });
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

  it('--require-current: 서비스 조회 실패면 판정하지 않고 실패 (외부 AI 설정을 지우지 않는다)', () => {
    assert.throws(() => assertCurrentKnown(null, true));
    assert.doesNotThrow(() => assertCurrentKnown(null, false));
    assert.doesNotThrow(() => assertCurrentKnown(svc([]), true));
  });

  it('외부 AI 설정: 저장소 값 없음 · 운영 값 있음 → carry (쉼표 목록 포함)', () => {
    const names = ['EXTERNAL_AI_ISSUER_URL', 'EXTERNAL_AI_REDIRECT_URIS'];
    const plan = planOptionalEnv(names, {}, svc([
      { name: 'EXTERNAL_AI_ISSUER_URL', value: 'https://api.example.invalid' },
      { name: 'EXTERNAL_AI_REDIRECT_URIS', value: 'https://a.example.invalid/cb,https://b.example.invalid/cb' },
    ]));
    assert.deepEqual(plan.map((p) => p.action), ['carry', 'carry']);
    assert.equal(
      setEnvFlag(plan[1].name, plan[1].value),
      '--set-env-vars=^@@^EXTERNAL_AI_REDIRECT_URIS=https://a.example.invalid/cb,https://b.example.invalid/cb',
    );
  });

  it('flag 형식 — 쉼표 값은 구분자 문법 · 잘못된 이름 거부', () => {
    assert.equal(setEnvFlag('A', 'x'), '--set-env-vars=A=x');
    assert.equal(setEnvFlag('A', 'x,y'), '--set-env-vars=^@@^A=x,y');
    assert.throws(() => setEnvFlag('a-b', 'x'));
  });

  it('상담 정리 apply 배포에서도 운영 중지 flag를 보존하고 없던 enabled 값을 만들지 않는다', () => {
    const names = ['CONSULTATION_STATE_CLEANUP_MODE', 'CONSULTATION_STATE_CLEANUP_ENABLED'];
    const provided = { CONSULTATION_STATE_CLEANUP_MODE: 'apply' };
    const plan = planOptionalEnv(names, provided, svc([
      { name: names[0], value: 'dry-run' }, { name: names[1], value: 'false' },
    ]));
    assert.deepEqual(plan.map(p => setEnvFlag(p.name, p.value)), [
      '--set-env-vars=CONSULTATION_STATE_CLEANUP_MODE=apply',
      '--set-env-vars=CONSULTATION_STATE_CLEANUP_ENABLED=false',
    ]);
    assert.equal(planOptionalEnv(names, provided, svc([]))[1].action, 'omit');
    assert.throws(() => assertCurrentKnown(null, true));
  });
});
