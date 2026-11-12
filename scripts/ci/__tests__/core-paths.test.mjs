/**
 * scripts/ci/core-paths.mjs · .github/CODEOWNERS 회귀 테스트 — WO-O4O-CORE-OWNERSHIP-AND-CHANGE-BOUNDARY-V1.
 * 의존성 · 네트워크 0.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_PATHS, corePathOf, coreChangesOf } from '../core-paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OWNER = '@Renagang21';

test('패턴 형식: 루트 기준 · glob 없음 · 중복 없음 · 실제로 존재하고 디렉터리/파일 구분이 맞다', () => {
  const seen = new Set();
  for (const { area, path: p } of CORE_PATHS) {
    assert.ok(area && typeof area === 'string', p);
    assert.match(p, /^\/[^*?[\]\s]+$/, `형식: ${p}`);
    assert.ok(!seen.has(p), `중복: ${p}`);
    seen.add(p);
    const abs = path.join(root, p);
    assert.ok(existsSync(abs), `없는 경로: ${p}`);
    assert.equal(statSync(abs).isDirectory(), p.endsWith('/'), `디렉터리는 / 로 끝나고 파일은 아니어야 한다: ${p}`);
  }
});

test('CODEOWNERS: 모든 Core 경로가 같은 문자열로 있고, 소유자는 확인된 계정 하나뿐이다', () => {
  const text = readFileSync(path.join(root, '.github/CODEOWNERS'), 'utf8');
  const rules = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/));
  const owners = new Set(rules.flatMap((r) => r.slice(1)));
  assert.deepEqual([...owners], [OWNER], '확인되지 않은 계정 · 팀을 지정하지 않는다');
  assert.ok(rules.every((r) => r.length >= 2), '소유자 없는 줄이 없다');
  assert.ok(!rules.some((r) => r[0] === '*'), '전체 기본 소유자는 두지 않는다');
  const patterns = new Set(rules.map((r) => r[0]));
  for (const { path: p } of CORE_PATHS) assert.ok(patterns.has(p), `CODEOWNERS 에 없음: ${p}`);
});

test('판정: 디렉터리는 접두어, 파일은 정확히 일치. 앞의 / 유무는 무관', () => {
  assert.equal(corePathOf('apps/api-server/src/modules/auth/routes/auth.routes.ts')?.area, 'identity');
  assert.equal(corePathOf('/apps/api-server/src/modules/auth/routes/auth.routes.ts')?.area, 'identity');
  assert.equal(corePathOf('apps/api-server/src/services/checkout.service.ts')?.area, 'commerce');
  assert.equal(corePathOf('apps/api-server/src/services/checkout.service.ts.bak'), null, '파일 패턴은 접두어로 매칭하지 않는다');
  assert.equal(corePathOf('apps/api-server/src/modules/authz/x.ts'), null, '디렉터리 경계를 넘지 않는다');
  assert.equal(corePathOf('packages/ai-core/src/orchestration/execute.ts')?.area, 'ai');
  assert.equal(corePathOf('apps/api-server/src/database/migrations/1790000000000-AddX.ts')?.area, 'schema');
  // 일반 개발(A) 경로
  for (const p of [
    'services/web-neture/src/App.tsx',
    'packages/ui/src/Button.tsx',
    'apps/api-server/src/modules/neture/services/neture-dashboard.service.ts',
    'apps/api-server/src/modules/store-ai/services/x.ts',
    'apps/api-server/src/common/middleware/validation.middleware.ts',
    'docs/baseline/O4O-CORE-REGISTRY-V1.md',
  ]) {
    assert.equal(corePathOf(p), null, p);
  }
});

test('coreChangesOf: 이름 변경 전 경로도 본다 · 같은 파일은 한 번만', () => {
  const files = [
    { filename: 'apps/api-server/src/modules/x/moved.ts', previous_filename: 'apps/api-server/src/modules/auth/old.ts' },
    { filename: 'packages/payment-core/src/index.ts' },
    { filename: 'packages/payment-core/src/index.ts' },
    { filename: 'README.md' },
  ];
  assert.deepEqual(coreChangesOf(files), [
    { file: 'apps/api-server/src/modules/auth/old.ts', area: 'identity' },
    { file: 'packages/payment-core/src/index.ts', area: 'commerce' },
  ]);
  assert.deepEqual(coreChangesOf([]), []);
});

test('Core 정본 문서가 이 목록을 가리킨다', () => {
  const doc = readFileSync(path.join(root, 'docs/baseline/O4O-CORE-REGISTRY-V1.md'), 'utf8');
  assert.match(doc, /scripts\/ci\/core-paths\.mjs/);
  assert.match(doc, /core-change/);
});
