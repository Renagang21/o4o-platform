/**
 * WO-O4O-CICD-PROMOTE-APPROVAL-REDUCTION-V1 — 기본 승인 정책 회귀 시험 (node:test · 의존성 0 · 네트워크 0)
 *
 *   P1  인증 · 권한 · 결제 · 배포 설정 변경 → 자동 배포(LEVEL_2) · 탐지는 auto_approved 로 기록
 *   P2  추가형 migration(새 파일 ADDITIVE + 등록부 append) → 자동 배포 · migration_changed=true (백업 대상)
 *   P3  파괴형 · 판정 불가 · 등록부 비-append · 적용된 migration 수정 · 원문 없음 → LEVEL_3 (Promote 승인)
 *   P4  그 밖의 승인 유지 축: 운영 DB write job · secret · 서비스 삭제 · migration runner
 *   P5  strict = 종전 판정 (비상 복귀)
 *   B   백업 신호: serving → target 판정 → 실행 계획(backup_before_migration) · fail-closed
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { buildPlan, decideAll } from '../deploy-orchestrate.mjs';
import { LEVEL_2, LEVEL_3, assessRisk, assessServingGap } from '../deploy-risk.mjs';
import { buildWorkspaceGraph } from '../detect-affected.mjs';

const graph = buildWorkspaceGraph();
const DIR = ['apps/api-server/src/database/', 'migr', 'ations/'].join('');
const NEW = `${DIR}1799999999999-AddFixtureColumn.ts`;
const MANIFEST = 'apps/api-server/src/database/incremental/manifest.ts';
const STATES = 'apps/api-server/src/database/incremental/expected-schema-states.ts';

const source = (up) => `import type { MigrationInterface, QueryRunner } from 'typeorm';
export class AddFixtureColumn1799999999999 implements MigrationInterface {
  name = 'AddFixtureColumn1799999999999';
  async up(q: QueryRunner): Promise<void> { ${up} }
  async down(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE fixtures DROP COLUMN note'); }
}`;
const ADDITIVE_UP = "await q.query('ALTER TABLE fixtures ADD COLUMN note text');";
const REGISTRY = {
  [MANIFEST]: { base: "import { A } from './a.js';\nexport const INCREMENTAL = [\n  A,\n];", head: "import { A } from './a.js';\nimport { B } from './b.js';\nexport const INCREMENTAL = [\n  A,\n  B,\n];" },
  [STATES]: { base: "export const STATES = [\n  { a: 1 },\n];", head: "export const STATES = [\n  { a: 1 },\n  { b: 2 },\n];" },
};

/** 새 migration(up 본문) + 등록부 append diff */
function migrationDiff(up, registry = REGISTRY, extra = []) {
  const src = { [NEW]: { base: undefined, head: source(up) }, ...registry };
  const files = [{ status: 'A', path: NEW }, { status: 'M', path: MANIFEST }, { status: 'M', path: STATES }, ...extra];
  return assessRisk(files, graph, { readFile: (which, p) => src[p]?.[which] });
}
const m = (...paths) => assessRisk(paths.map((p) => (Array.isArray(p) ? { status: p[0], path: p[1] } : { status: 'M', path: p })), graph);

describe('P1 auth · RBAC · payment · deploy config → automatic', () => {
  it('auth backend · auth package · RBAC · middleware · payment · Dockerfile deploy without approval and stay recorded', () => {
    for (const [path, rule] of [
      ['apps/api-server/src/services/auth/kakao-auth.service.ts', 'auth-backend'],
      ['packages/auth-client/src/client.ts', 'auth-package'],
      ['apps/api-server/src/config/service-scopes.ts', 'rbac'],
      ['apps/api-server/src/common/middleware/auth/authentication.middleware.ts', 'auth-backend'],
      ['apps/api-server/src/modules/neture/services/settlement.service.ts', 'payment'],
      ['apps/api-server/Dockerfile', 'deploy-infra'],
    ]) {
      const r = m(path);
      assert.equal(r.level3_hits.length, 0, path);
      for (const key of r.affected_services) assert.equal(r.services[key].level, LEVEL_2, `${path} → ${key}`);
      assert.ok(r.auto_approved.some((h) => h.rule === rule && h.file === path), `${path} recorded as ${rule}`);
    }
  });

  it('a new deploy workflow file (unanalysable config) is deploy config — automatic', () => {
    const r = assessRisk([{ status: 'A', path: '.github/workflows/deploy-api.yml' }], graph, { readFile: () => 'name: x' });
    assert.equal(r.level3_hits.length, 0);
    assert.ok(r.auto_approved.some((h) => h.rule === 'deploy-config'));
  });
});

describe('P2 additive migration → automatic with backup', () => {
  it('new additive migration + append-only registry is LEVEL_2 and marks migration_changed', () => {
    const r = migrationDiff(ADDITIVE_UP);
    assert.equal(r.services.api.level, LEVEL_2);
    assert.equal(r.level3_hits.length, 0);
    assert.equal(r.migration_changed, true);
    assert.deepEqual(r.migrations.map((i) => i.verdict).sort(), ['ADDITIVE', 'REGISTRY_APPEND', 'REGISTRY_APPEND']);
    assert.ok(r.advisories.some((a) => /추가형 migration/.test(a)));
  });

  it('additive migration together with an auth change still deploys automatically', () => {
    const r = migrationDiff(ADDITIVE_UP, REGISTRY, [{ status: 'M', path: 'apps/api-server/src/services/auth/google-auth.service.ts' }]);
    assert.equal(r.services.api.level, LEVEL_2);
  });
});

describe('P3 destructive or ambiguous migration → Promote approval', () => {
  it('destructive statement holds the API with the migration verdict attached', () => {
    const r = migrationDiff("await q.query('ALTER TABLE fixtures DROP COLUMN legacy');");
    assert.equal(r.services.api.level, LEVEL_3);
    const hit = r.services.api.level3.find((h) => h.file === NEW);
    assert.equal(hit.migration, 'DESTRUCTIVE');
    assert.match(hit.detail.join(' '), /DROP COLUMN/i);
  });

  it('bulk UPDATE · ambiguous SQL hold the API', () => {
    assert.equal(migrationDiff("await q.query(`UPDATE fixtures SET note='x'`);").services.api.level, LEVEL_3);
    assert.equal(migrationDiff('for (const t of ts) await q.query(`ALTER TABLE ${t} ADD COLUMN c int`);').services.api.level, LEVEL_3);
  });

  it('a registry edit that removes lines is not an append — approval', () => {
    const registry = { ...REGISTRY, [MANIFEST]: { base: REGISTRY[MANIFEST].base, head: "export const INCREMENTAL = [\n  B,\n];" } };
    assert.equal(migrationDiff(ADDITIVE_UP, registry).services.api.level, LEVEL_3);
  });

  it('editing or deleting an existing migration file needs approval', () => {
    assert.equal(m(`${DIR}1793857542325-AddStorePlaylistTags.ts`).services.api.level, LEVEL_3);
    assert.equal(m(['D', `${DIR}1793857542325-AddStorePlaylistTags.ts`]).services.api.level, LEVEL_3);
  });

  it('without source text (no reader) a new migration is ambiguous — approval (fail-closed)', () => {
    assert.equal(m(['A', NEW], MANIFEST, STATES).services.api.level, LEVEL_3);
  });

  it('a registry change without a new migration file needs approval', () => {
    const src = REGISTRY;
    const r = assessRisk([{ status: 'M', path: MANIFEST }], graph, { readFile: (which, p) => src[p]?.[which] });
    assert.equal(r.services.api.level, LEVEL_3);
  });
});

describe('P4 other approval axes are unchanged', () => {
  it('production DB write job · secret handling · migration runner · bootstrap stay LEVEL_3', () => {
    for (const path of [
      'apps/api-server/src/jobs/privacy-retention.job.ts',
      'apps/api-server/src/env-loader.ts',
      'apps/api-server/src/migrate.ts',
      'apps/api-server/src/database/bootstrap/bootstrap-runner.ts',
    ]) assert.equal(m(path).services.api.level, LEVEL_3, path);
  });

  it('service deletion stays LEVEL_3', () => {
    const r = m(['D', 'services/web-store/package.json']);
    assert.ok(r.level3_hits.some((h) => h.rule === 'service-deletion'));
  });
});

describe('P5 strict = previous behaviour', () => {
  it('strict keeps auth and additive migrations under approval', () => {
    assert.equal(assessRisk([{ status: 'M', path: 'apps/api-server/src/services/auth/kakao-auth.service.ts' }], graph, { approvalPolicy: 'strict' }).services.api.level, LEVEL_3);
    const src = { [NEW]: { head: source(ADDITIVE_UP) }, ...REGISTRY };
    const r = assessRisk([{ status: 'A', path: NEW }, { status: 'M', path: MANIFEST }], graph, { readFile: (w, p) => src[p]?.[w], approvalPolicy: 'strict' });
    assert.equal(r.services.api.level, LEVEL_3);
  });
});

describe('B backup signal before migration', () => {
  const SERVING = 'a'.repeat(40);
  const TARGET = 'b'.repeat(40);
  const provider = (files, src = {}) => ({
    exists: () => true,
    isAncestor: () => true,
    changedFiles: () => ({ ok: true, files }),
    readLock: () => null,
    readFile: (sha, p) => src[p]?.[sha === SERVING ? 'base' : 'head'],
  });
  const serving = Object.fromEntries(['api', 'admin', 'partner', 'neture', 'kpa-society', 'lecture', 'store', 'kpa-branch', 'hospital-pharmacy'].map((k) => [k, { sha: SERVING, source: 'fixture' }]));
  const ctx = { frozen: false, ciGreen: true, headIsTarget: true };

  it('additive migration: API deploys automatically and the plan asks for a backup', () => {
    const src = { [NEW]: { head: source(ADDITIVE_UP) }, ...REGISTRY };
    const per = assessServingGap(TARGET, serving, graph, provider([{ status: 'A', path: NEW }, { status: 'M', path: MANIFEST }, { status: 'M', path: STATES }], src));
    assert.equal(per.api.migration_changed, true);
    const decisions = decideAll(per, ctx, {});
    assert.equal(decisions.api.decision, 'AUTO_DEPLOY');
    assert.equal(buildPlan(decisions, {}, per).backup_before_migration, true);
  });

  it('API change without migration: no backup', () => {
    const per = assessServingGap(TARGET, serving, graph, provider([{ status: 'M', path: 'apps/api-server/src/modules/neture/services/product.service.ts' }]));
    assert.equal(per.api.migration_changed, false);
    assert.equal(buildPlan(decideAll(per, ctx, {}), {}, per).backup_before_migration, false);
  });

  it('unknown serving state or missing judgement backs up (fail-closed)', () => {
    const per = assessServingGap(TARGET, { ...serving, api: { sha: null, source: 'missing' } }, graph, provider([]));
    assert.equal(per.api.migration_changed, true);
    assert.equal(buildPlan({ api: { decision: 'PROMOTE' } }, {}, {}).backup_before_migration, true);
    assert.equal(buildPlan({ api: { decision: 'PROMOTE' } }, {}, undefined).backup_before_migration, true);
  });
});

describe('W workflow wiring — backup before migration', () => {
  const ROOT = new URL('../../../', import.meta.url);
  const read = (p) => readFileSync(new URL(p, ROOT), 'utf-8');
  const api = read('.github/workflows/deploy-api.yml');
  const stepOf = (name) => {
    const start = api.indexOf(`- name: ${name}`);
    assert.ok(start > 0, `${name} step exists`);
    const next = api.indexOf('\n    - name:', start + 1);
    return { start, text: api.slice(start, next < 0 ? undefined : next) };
  };

  it('the Cloud SQL backup step runs before the migration Job and before the Cloud Run deploy', () => {
    const backup = stepOf('Back up Cloud SQL before migrations');
    const migrate = stepOf('Run database migrations');
    assert.ok(backup.start < migrate.start, 'backup precedes migrations');
    const deploy = api.indexOf('gcloud run deploy');
    assert.ok(deploy < 0 || backup.start < deploy, 'backup precedes Cloud Run deploy');
  });

  it('the backup is skipped only on an explicit false and a failure stops the job', () => {
    const { text } = stepOf('Back up Cloud SQL before migrations');
    assert.match(text, /if: inputs\.backup_before_migration != 'false'/);
    assert.doesNotMatch(text, /continue-on-error/);
    assert.doesNotMatch(text, /\|\|\s*true/);
    assert.match(text, /set -euo pipefail/);
    assert.match(text, /gcloud sql backups create/);
    assert.doesNotMatch(text, /--async/);
    assert.match(text, /SUCCESSFUL/);
    assert.match(text, /exit 1/);
  });

  it('both entry points default to backing up, and Delivery passes its judgement through', () => {
    const inputs = [...api.matchAll(/backup_before_migration:\n(?:\s+.*\n){0,4}?\s+default: '([a-z]+)'/g)].map((m) => m[1]);
    assert.deepEqual(inputs, ['true', 'true']);
    const delivery = read('.github/workflows/delivery.yml');
    assert.match(delivery, /api_backup_before_migration: \$\{\{ steps\.decide\.outputs\.api_backup_before_migration \}\}/);
    assert.match(delivery, /backup_before_migration: \$\{\{ needs\.classify\.outputs\.api_backup_before_migration \}\}/);
  });
});
