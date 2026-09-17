/**
 * migration-identity.mjs contract test (node --test)
 * WO-O4O-MIGRATION-HISTORICAL-MANIFEST-IDENTITY-AND-LOCAL-DB-CREDENTIAL-LOG-FINAL-CLOSURE-V1
 *
 *   node --test scripts/db/__tests__/migration-identity.test.mjs
 *
 * Fixtures reproduce the three production migrations whose `name` the pre-V1 regex parser took from
 * SQL text (`SET name = 'pharmacy'`), plus every declaration form found in the repository.
 * The second block runs the parser over the real migration directory and cross-checks the frozen
 * historical manifest, so the CI guard, this test and the generated runtime name list can never
 * disagree on identity.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMigrationIdentity, MigrationIdentityError } from '../migration-identity.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MIGRATIONS_DIR = join(REPO, 'apps', 'api-server', 'src', 'database', 'migrations');
const MANIFEST = join(REPO, 'apps', 'api-server', 'src', 'database', 'incremental', 'historical-migrations.manifest.json');
const NAMES_TS = join(REPO, 'apps', 'api-server', 'src', 'database', 'incremental', 'historical-migration-names.ts');
const INCREMENTAL_MANIFEST = join(REPO, 'apps', 'api-server', 'src', 'database', 'incremental', 'manifest.ts');

const parse = (src, file = 'fixture.ts') => parseMigrationIdentity(src, file);
const expectError = (src, code) => {
  assert.throws(() => parse(src), (e) => e instanceof MigrationIdentityError && e.code === code, `expected ${code}`);
};
const wrap = (body, cls = 'Fixture1700000000000') => `import { MigrationInterface, QueryRunner } from 'typeorm';
export class ${cls} implements MigrationInterface {
${body}
  public async up(queryRunner: QueryRunner): Promise<void> {}
  public async down(queryRunner: QueryRunner): Promise<void> {}
}
`;

// ---- §6.1 false positives that must NOT become the identity
test('SQL text `SET name = \'pharmacy\'` inside a query string is not a declared name (UnifyRolesCatalog shape)', () => {
  const r = parse(wrap(`  public async up2(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(\`
      UPDATE roles SET name = 'pharmacy', role_key = 'pharmacy', updated_at = NOW()
      WHERE name = 'legacy:pharmacy'
        AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'pharmacy')
    \`);
  }`, 'UnifyRolesCatalog1711882400000'));
  assert.equal(r.className, 'UnifyRolesCatalog1711882400000');
  assert.equal(r.declaredName, null);
  assert.equal(r.runtimeName, 'UnifyRolesCatalog1711882400000');
});

test('`SET name = \'seller\'` / DELETE ... WHERE name = \'seller\' (UnifyCosmeticsRolesCatalog · BackfillStoreOwnerRoles shape)', () => {
  const r = parse(wrap(`  async up(q: QueryRunner) { await q.query(\`UPDATE roles SET name = 'seller' WHERE name = 'cosmetics:seller'\`); await q.query(\`DELETE FROM roles WHERE name = 'seller' AND service_key = 'cosmetics'\`); }`, 'BackfillStoreOwnerRoles20260900000000'));
  assert.equal(r.declaredName, null);
  assert.equal(r.runtimeName, 'BackfillStoreOwnerRoles20260900000000');
});

test('SQL `name = EXCLUDED.name` (AlignGeminiEngineRegistry shape) is ignored', () => {
  const r = parse(wrap(`  async up(q: QueryRunner) { await q.query(\`INSERT INTO x (slug, name) VALUES ('a', 'b') ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name\`); }`));
  assert.equal(r.declaredName, null);
});

test('a local variable `const name = ...` inside a method is not a declared name', () => {
  const r = parse(wrap(`  async up(q: QueryRunner) { const name = 'pharmacy'; await q.query(name); }`));
  assert.equal(r.declaredName, null);
  assert.equal(r.runtimeName, 'Fixture1700000000000');
});

test('an object-literal property `{ name: \'seller\' }` / column option `name:` is not a declared name', () => {
  const r = parse(wrap(`  async up(q: QueryRunner) {
    const table = { name: 'seller', columns: [{ name: 'service_key', type: 'varchar' }] };
    await q.createTable(new Table(table));
  }`));
  assert.equal(r.declaredName, null);
});

test('a `name` property on a non-exported helper class is not the migration identity', () => {
  const src = `class Helper { name = 'seller'; }\n` + wrap('');
  assert.equal(parse(src).declaredName, null);
});

test('a static `name` member is not the instance identity', () => {
  assert.equal(parse(wrap(`  static name2 = 'x'; static readonly name = 'StaticName';`)).declaredName, null);
});

// ---- accepted declaration forms
for (const [label, decl] of [
  ['name = \'X\'', `  name = 'Declared1700000000001';`],
  ['readonly name = \'X\'', `  readonly name = 'Declared1700000000001';`],
  ['public name: string = \'X\'', `  public name: string = 'Declared1700000000001';`],
  ['public readonly name = \'X\'', `  public readonly name = 'Declared1700000000001';`],
  ['name = "X" (double quotes)', `  name = "Declared1700000000001";`],
  ['name = `X` (template without substitutions)', '  name = `Declared1700000000001`;'],
  ['name: string; + constructor this.name = \'X\'', `  name: string;\n  constructor() { this.name = 'Declared1700000000001'; }`],
  ['constructor this.name = \'X\' without a field', `  constructor() { this.name = 'Declared1700000000001'; }`],
]) {
  test(`declared name form: ${label}`, () => {
    const r = parse(wrap(decl));
    assert.equal(r.className, 'Fixture1700000000000');
    assert.equal(r.declaredName, 'Declared1700000000001');
    assert.equal(r.runtimeName, 'Declared1700000000001');
  });
}

test('no explicit name → runtime name falls back to the class name', () => {
  const r = parse(wrap(''));
  assert.equal(r.declaredName, null);
  assert.equal(r.runtimeName, 'Fixture1700000000000');
});

test('the migration class is chosen among several exported classes by `implements MigrationInterface`', () => {
  const src = `export class Other { name = 'seller'; }\n` + wrap('');
  assert.equal(parse(src).runtimeName, 'Fixture1700000000000');
});

// ---- hard failures: identity is never guessed
test('dynamic name (template with substitution) fails', () => {
  expectError(wrap('  name = `${prefix}${timestamp}`;'), 'DYNAMIC_NAME');
});
test('dynamic name (identifier / call) fails', () => {
  expectError(wrap(`  name = MIGRATION_NAME;`), 'DYNAMIC_NAME');
  expectError(wrap(`  name = buildName();`), 'DYNAMIC_NAME');
  expectError(wrap(`  name: string;\n  constructor() { this.name = compute(); }`), 'DYNAMIC_NAME');
});
test('name declared without any static value fails', () => {
  expectError(wrap(`  name: string;`), 'DYNAMIC_NAME');
});
test('getter name fails', () => {
  expectError(wrap(`  get name() { return 'X'; }`), 'DYNAMIC_NAME');
});
test('two `name` members fail', () => {
  expectError(wrap(`  name = 'A';\n  readonly name = 'B';`), 'DUPLICATE_NAME_PROPERTY');
});
test('no exported class / two ambiguous exported migration classes fail', () => {
  expectError(`const x = 1;`, 'NO_MIGRATION_CLASS');
  expectError(wrap('', 'A1700000000000') + wrap('', 'B1700000000001'), 'AMBIGUOUS_MIGRATION_CLASS');
});
test('non-identifier declared name fails', () => {
  expectError(wrap(`  name = 'has space';`), 'INVALID_NAME');
});

// ---- real repository cross-check (§6.3 single parser · §13.1)
test('every migration file in the repository yields a static identity; file / class / runtime name are unique', () => {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.ts')).sort();
  assert.ok(files.length > 600);
  const classes = new Set();
  const runtime = new Set();
  for (const f of files) {
    const r = parseMigrationIdentity(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'), f);
    assert.ok(!classes.has(r.className), `duplicate class ${r.className}`);
    assert.ok(!runtime.has(r.runtimeName), `duplicate runtime name ${r.runtimeName}`);
    classes.add(r.className);
    runtime.add(r.runtimeName);
    assert.match(r.runtimeName, /^[A-Z][A-Za-z0-9_]*\d{13,14}$/, `${f}: runtime name '${r.runtimeName}' is not a migration identifier`);
  }
});

test('frozen historical manifest == parser output for every entry; runtime name list in lockstep; historical ∩ incremental = ∅', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  assert.equal(manifest.count, manifest.entries.length);
  const runtimeNames = [];
  for (const e of manifest.entries) {
    const r = parseMigrationIdentity(readFileSync(join(MIGRATIONS_DIR, e.file), 'utf8'), e.file);
    assert.deepEqual({ className: e.className, declaredName: e.declaredName, name: e.name }, { className: r.className, declaredName: r.declaredName, name: r.runtimeName }, e.file);
    runtimeNames.push(r.runtimeName);
  }
  const namesTs = readFileSync(NAMES_TS, 'utf8');
  const listed = [...namesTs.matchAll(/^\s+'([A-Za-z0-9_]+)',$/gm)].map((m) => m[1]);
  assert.deepEqual(listed, runtimeNames);
  const incremental = new Set([...readFileSync(INCREMENTAL_MANIFEST, 'utf8').matchAll(/from\s+['"]\.\.\/migrations\/([^'"]+?)(?:\.js)?['"]/g)].map((m) => `${m[1]}.ts`));
  for (const e of manifest.entries) assert.ok(!incremental.has(e.file), `${e.file} is historical AND incremental`);
  const incRuntime = [...incremental].map((f) => parseMigrationIdentity(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'), f).runtimeName);
  for (const n of incRuntime) assert.ok(!runtimeNames.includes(n), `${n} is historical AND incremental`);
});
