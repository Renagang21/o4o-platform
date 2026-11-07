// WO-O4O-DOCS-FAST-AGENT-CONFIG-V1 — `.claude/` 경량 검사(scripts/ci/check-agent-config.mjs) 회귀 시험.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAgentConfig } from '../check-agent-config.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../check-agent-config.mjs');

function repo(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'o4o-agent-config-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
}
const withRepo = (files, fn) => {
  const root = repo(files);
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
};

const GOOD = {
  '.claude/settings.json': '{"permissions":{"allow":[]}}',
  '.claude/hooks/a.mjs': 'export const a = 1;\n',
  '.claude/hooks/lib/b.mjs': 'export function b() { return 2; }\n',
  '.claude/skills/x/SKILL.md': '# not checked\n',
};

test('정상 설정 · 훅 · 단위 테스트는 통과하고 대상 수를 센다', () => withRepo({
  ...GOOD,
  '.claude/hooks/a.test.mjs': "import test from 'node:test';\nimport assert from 'node:assert';\nimport { a } from './a.mjs';\ntest('a', () => assert.equal(a, 1));\n",
}, (root) => {
  const r = checkAgentConfig(root);
  assert.equal(r.ok, true, r.lines.join('\n'));
  assert.deepEqual(r.counts, { json: 1, scripts: 3, tests: 1 });
}));

test('훅 단위 테스트가 없어도 통과하되 0건임을 알린다', () => withRepo(GOOD, (root) => {
  const r = checkAgentConfig(root);
  assert.equal(r.ok, true);
  assert.equal(r.counts.tests, 0);
  assert.ok(r.lines.some((l) => l.includes('훅 단위 테스트 0건')));
}));

test('settings.json 이 깨지면 실패한다', () => withRepo({ ...GOOD, '.claude/settings.json': '{"permissions": [' }, (root) => {
  const r = checkAgentConfig(root);
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.startsWith('FAIL JSON') && l.includes('.claude/settings.json')));
}));

test('.claude 아래 다른 JSON 도 검사한다', () => withRepo({ ...GOOD, '.claude/skills/x/meta.json': '{oops}' }, (root) => {
  assert.equal(checkAgentConfig(root).ok, false);
}));

test('훅 구문 오류는 node --check 로 실패한다 (lib 하위 포함)', () => withRepo({ ...GOOD, '.claude/hooks/lib/b.mjs': 'export function b( {\n' }, (root) => {
  const r = checkAgentConfig(root);
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.startsWith('FAIL node --check') && l.includes('.claude/hooks/lib/b.mjs')));
}));

test('훅 단위 테스트가 실패하면 실패한다', () => withRepo({
  ...GOOD,
  '.claude/hooks/a.test.mjs': "import test from 'node:test';\nimport assert from 'node:assert';\ntest('x', () => assert.equal(1, 2));\n",
}, (root) => {
  const r = checkAgentConfig(root);
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.startsWith('FAIL node --test')));
}));

test('.claude 가 없으면 검사 대상 0 으로 통과한다', () => withRepo({ 'README.md': '# x\n' }, (root) => {
  const r = checkAgentConfig(root);
  assert.equal(r.ok, true);
  assert.deepEqual(r.counts, { json: 0, scripts: 0, tests: 0 });
}));

test('CLI 는 실패 시 exit 1, 정상 시 exit 0 이다', () => {
  withRepo(GOOD, (root) => assert.equal(spawnSync(process.execPath, [SCRIPT, '--root', root]).status, 0));
  withRepo({ ...GOOD, '.claude/settings.json': 'x' }, (root) => assert.equal(spawnSync(process.execPath, [SCRIPT, '--root', root]).status, 1));
});
