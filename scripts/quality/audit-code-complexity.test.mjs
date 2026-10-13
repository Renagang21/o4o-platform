import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = resolve(root, 'scripts/quality/audit-code-complexity.mjs');
function fixture(files, run) {
  const directory = mkdtempSync(
    resolve(root, 'scripts/quality/.audit-fixture-'),
  );
  try {
    for (const [name, text] of Object.entries(files))
      writeFileSync(resolve(directory, name), text);
    const paths = Object.keys(files).map((name) =>
      relative(root, resolve(directory, name)),
    );
    const output = execFileSync(process.execPath, [cli, ...paths], {
      cwd: root,
      encoding: 'utf8',
    });
    run(JSON.parse(output), output);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('parent metrics exclude nested function decisions while each function remains inspectable', () => {
  fixture(
    {
      'nested.ts': `export function outer(flag: boolean) {
    function inner(x: boolean) {
      if (x) {
        return 1;
      }
      return 0;
    }
    if (flag) return inner(flag);
    return 0;
  }`,
    },
    (report) => {
      const outer = report.functions.find((fn) => fn.name === 'outer');
      const inner = report.functions.find((fn) => fn.name === 'inner');
      assert.equal(outer.branches, 1);
      assert.equal(inner.branches, 1);
      assert.equal(outer.nestedFunctions, 1);
      assert.ok(outer.ownLines < outer.lines);
    },
  );
});
test('duplicate hashes ignore formatting/comments but preserve literal differences and never print source literals', () => {
  const body = (value) =>
    `{ const marker = '${value}'; let result = 0; for (let i = 0; i < 8; i++) { if (i > 2) { result += i; } else { result -= i; } } result += marker.length; return marker + result + result + result; }`;
  fixture(
    {
      'dup.ts': `export function one() ${body('private-literal-ALPHA')}
    export function two() ${body('private-literal-ALPHA').replace('let result', '/* ignored */ let result')}
    export function three() ${body('private-literal-BETA')}`,
    },
    (report, output) => {
      assert.equal(report.duplicates.length, 1);
      assert.deepEqual(
        report.duplicates[0].members.map((fn) => fn.name),
        ['one', 'two'],
      );
      assert.ok(!output.includes('private-literal-'));
    },
  );
});
test('relative runtime cycles are detected while both forms of type-only imports are excluded', () => {
  fixture(
    {
      'a.ts': `import { b } from './b.js'; export const a = () => b();`,
      'b.ts': `import { a } from './a.js'; export const b = () => a();`,
      'types.ts': `import type { A } from './other.js'; import { type B } from './other.js'; export type C = A | B;`,
      'other.ts': `import { C } from './types.js'; export type A = C; export type B = C;`,
    },
    (report) => {
      assert.equal(report.runtimeCycles.length, 1);
      assert.ok(
        report.runtimeCycles[0].every(
          (path) => path.endsWith('/a.ts') || path.endsWith('/b.ts'),
        ),
      );
    },
  );
});
test('paths outside the repository and empty input are rejected', () => {
  for (const args of [[], ['../outside.ts']]) {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
  }
});

test('regex and template whitespace remain part of literal identity', () => {
  const body = (pattern) =>
    `{ let value = 0; for (let i = 0; i < 5; i++) { if (i > 1) { value += i; } else { value -= i; } } return ${pattern}.test('a  b') ? value + value + value + value : value + value + value + 1; }`;
  fixture(
    {
      'literal.ts': `export function regexOne() ${body('/a  b/')}
    export function regexTwo() ${body('/a b/')}
    export function regexSame() ${body('/a  b/')}
    export function templateOne() { let value = 0; const text = \`one  two\`; ${'value += text.length;'.repeat(12)} return value; }
    export function templateTwo() { let value = 0; const text = \`one two\`; ${'value += text.length;'.repeat(12)} return value; }`,
    },
    (report) => {
      assert.equal(report.duplicates.length, 1);
      assert.deepEqual(
        report.duplicates[0].members.map((fn) => fn.name),
        ['regexOne', 'regexSame'],
      );
    },
  );
});
