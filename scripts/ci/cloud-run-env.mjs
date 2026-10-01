#!/usr/bin/env node
/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 §22 — 정의되지 않은 optional env 를 빈 값으로 덮어쓰지 않는다
 *
 * 조사(CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1 §C-D6):
 *   deploy-api.yml 은 `--set-env-vars="AI_DEFAULT_PROVIDER=${{ vars.AI_DEFAULT_PROVIDER }}"` 처럼 쓰는데
 *   저장소에 해당 variable/secret 이 없으면 Actions 가 빈 문자열을 넣어 **매 배포마다 빈 값으로 덮는다.**
 *   (2026-09-30 실측: AI_DEFAULT_PROVIDER · AI_DEFAULT_MODEL_OPENAI · TOSS_PAYMENTS_CLIENT_KEY · TOSS_PAYMENTS_SECRET_KEY 전부 빈 값)
 *
 * 규칙 (값을 만들거나 추측하지 않는다):
 *   제공된 값 있음            → set   (그 값으로 설정)
 *   제공 없음 · 현재 값 있음   → carry (현재 Cloud Run 값을 그대로 다시 넣는다 — `--set-env-vars` 는 전체 교체라서
 *                                     생략하면 지워진다)
 *   제공 없음 · 현재 값 없음   → omit  (빈 문자열을 만들지 않는다)
 *
 * 값은 로그에 쓰지 않는다. carry 한 값은 `::add-mask::` 로 가린다.
 * 출력 파일은 NUL 구분 `--set-env-vars=NAME=VALUE` 목록 — bash 에서 `mapfile -d ''` 로 읽는다.
 *
 * 사용법
 *   OPTENV_AI_DEFAULT_PROVIDER="${{ vars.AI_DEFAULT_PROVIDER }}" … \
 *   node scripts/ci/cloud-run-env.mjs optional --service o4o-core-api --names A,B --out "$RUNNER_TEMP/optional-env"
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @returns {{action: 'set'|'carry'|'omit', value?: string}} */
export function resolveOptionalEnv(provided, current) {
  if (typeof provided === 'string' && provided.trim() !== '') return { action: 'set', value: provided };
  if (typeof current === 'string' && current !== '') return { action: 'carry', value: current };
  return { action: 'omit' };
}

/** `gcloud run services describe --format=json` → {NAME: value} (plain value 만. secretKeyRef 는 대상 아님). */
export function currentPlainEnv(service) {
  const env = service?.spec?.template?.spec?.containers?.[0]?.env ?? [];
  const out = {};
  for (const e of env) if (e?.name && typeof e.value === 'string') out[e.name] = e.value;
  return out;
}

/** gcloud 가 쉼표를 목록 구분자로 쓰므로 값에 쉼표가 있으면 `^@@^` 구분자 문법을 쓴다. */
export function setEnvFlag(name, value) {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) throw new Error(`env 이름 형식 오류: ${name}`);
  return value.includes(',') ? `--set-env-vars=^@@^${name}=${value}` : `--set-env-vars=${name}=${value}`;
}

export function planOptionalEnv(names, providedByName, service) {
  const current = currentPlainEnv(service);
  return names.map((name) => ({ name, ...resolveOptionalEnv(providedByName[name], current[name]) }));
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd !== 'optional') throw new Error(`알 수 없는 명령: ${cmd}`);
  const args = {};
  for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, '')] = rest[i + 1];
  const names = String(args.names ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const provided = Object.fromEntries(names.map((n) => [n, process.env[`OPTENV_${n}`]]));

  const out = spawnSync(
    'gcloud',
    ['run', 'services', 'describe', args.service, '--project=netureyoutube', '--region=asia-northeast3', '--format=json'],
    { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024, shell: process.platform === 'win32' },
  );
  // 서비스 조회 실패 = 현재 값을 모름 → carry 없이 set/omit 만 (빈 값은 여전히 만들지 않는다)
  const service = out.status === 0 ? JSON.parse(out.stdout || 'null') : null;
  if (!service) console.log(`⚠️ ${args.service} describe 실패 — carry 없이 판정`);

  const plan = planOptionalEnv(names, provided, service);
  const flags = [];
  for (const p of plan) {
    if (p.action === 'carry') console.log(`::add-mask::${p.value}`);
    if (p.action !== 'omit') flags.push(setEnvFlag(p.name, p.value));
    console.log(`optional env ${p.name}: ${p.action}${p.action === 'omit' ? ' (정의 없음 — 빈 값으로 덮지 않음)' : ''}`);
  }
  writeFileSync(args.out, flags.map((f) => `${f}\0`).join(''));
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
