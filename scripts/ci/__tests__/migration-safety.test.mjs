/**
 * WO-O4O-CICD-PROMOTE-APPROVAL-REDUCTION-V1 — migration 파괴형 판정 회귀 시험 (node:test · 의존성 0)
 *
 *   A  추가형만 ADDITIVE (표 · 열 · 인덱스 · 주석 · NOT NULL 해제 · 새 표의 부속 객체)
 *   D  파괴형은 DESTRUCTIVE (DROP · RENAME · TYPE · 일괄 UPDATE / DELETE / TRUNCATE · 구조 API drop*)
 *   R  애매하면 REVIEW (동적 SQL · 함수 · 권한 · 기존 표 제약 · 기존 표 INSERT · 원문 없음)
 *   S  스캐너 (주석 · 문자열 · 정규식 리터럴 안의 문자, down() 무시)
 *   X  저장소의 실제 migration 전수 — 파괴형으로 알려진 것이 ADDITIVE 로 새지 않는다
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ADDITIVE, DESTRUCTIVE, REVIEW, classifyMigrationSource, isAppendOnly } from '../migration-safety.mjs';

const wrap = (up, down = "await q.query('DROP TABLE x')") => `import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Fixture1790000000000 implements MigrationInterface {
  name = 'Fixture1790000000000';
  async up(q: QueryRunner): Promise<void> {
    ${up}
  }
  async down(q: QueryRunner): Promise<void> {
    ${down}
  }
}`;
const verdictOf = (up, down) => classifyMigrationSource(wrap(up, down)).verdict;

describe('A additive', () => {
  it('table · index · column · comment · NOT NULL relaxation · enum · sequence are additive', () => {
    for (const up of [
      'await q.query(`CREATE TABLE t (id uuid PRIMARY KEY, name text NOT NULL)`);',
      'await q.query(`CREATE UNIQUE INDEX idx_t ON existing (a, b)`);',
      'await q.query(`CREATE INDEX IF NOT EXISTS idx_t ON existing (a)`);',
      "await q.query('ALTER TABLE existing ADD COLUMN note text');",
      "await q.query(`ALTER TABLE existing ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}', ADD COLUMN x uuid NULL`);",
      "await q.query(`ALTER TABLE existing ADD COLUMN mode varchar(16) NOT NULL DEFAULT 'a'`);",
      'await q.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);',
      "await q.query(`COMMENT ON COLUMN existing.note IS '설명; 세미콜론 포함'`);",
      "await q.query(`CREATE TYPE mode_enum AS ENUM ('a', 'b')`);",
      "await q.query(`ALTER TYPE mode_enum ADD VALUE IF NOT EXISTS 'c'`);",
      'await q.query(`CREATE SEQUENCE seq_t START 1`);',
      "await q.query(`CREATE TABLE \"users-staging\" (id int, payload jsonb DEFAULT '{}'::jsonb) WITH (fillfactor = 90)`);",
    ]) assert.equal(verdictOf(up), ADDITIVE, up);
  });

  it('constraints · defaults on a table created in the same migration are additive', () => {
    const up = `await q.query(\`CREATE TABLE public.fresh (id uuid PRIMARY KEY, kind text, owner uuid)\`);
    await q.query(\`ALTER TABLE fresh ADD CONSTRAINT fresh_kind CHECK (kind IN ('a')), ADD CONSTRAINT fresh_owner FOREIGN KEY (owner) REFERENCES users(id) ON DELETE CASCADE\`);
    await q.query(\`ALTER TABLE "fresh" ALTER COLUMN kind SET DEFAULT 'a', ALTER COLUMN kind SET NOT NULL\`);`;
    assert.equal(verdictOf(up), ADDITIVE);
  });

  it('down() is never analysed — its DROP does not make the migration destructive', () => {
    assert.equal(verdictOf("await q.query('CREATE TABLE t (id int)');", "await q.query('DROP TABLE t'); await q.query('DELETE FROM users');"), ADDITIVE);
  });

  it('QueryRunner structure API that only adds is additive', () => {
    assert.equal(verdictOf("await q.createTable(new Table({ name: 't', columns: [] })); await q.createIndex('t', idx);"), ADDITIVE);
  });

  it('any dollar sign in SQL (dollar-quote with digits, parameters) needs review', () => {
    assert.equal(verdictOf("await q.query(\"COMMENT ON TABLE users IS $note1$owner's note$note1$; DELETE FROM users;\");"), REVIEW);
    assert.equal(verdictOf("await q.query('COMMENT ON TABLE users IS $$x$$');"), REVIEW);
  });

  it('a backslash in SQL (E-string escape) needs review', () => {
    assert.equal(verdictOf("await q.query(`ALTER TABLE users ADD COLUMN note text DEFAULT E'it\\\\'s', DROP COLUMN email`);"), REVIEW);
    assert.equal(verdictOf("await q.query(`CREATE TABLE t (a text DEFAULT E'x\\\\')') AS SELECT 1`);"), REVIEW);
  });

  it('code inside a template interpolation anywhere in up() needs review', () => {
    assert.equal(verdictOf("await q.query('CREATE INDEX i ON t (a)');\nconsole.log(`deleted: ${await q.query('DELETE FROM users')}`);"), REVIEW);
  });

  it('only a single up() outside comments and strings is analysed', () => {
    const real = "export class M { async up(q: QueryRunner): Promise<void> { await q.query('DELETE FROM users'); } async down(q) {} }";
    const commented = "// Example: up(q) { await q.query('CREATE TABLE example (id int)'); }\n" + real;
    const blockCommented = "/* up(q) { await q.query('CREATE TABLE example (id int)'); } */\n" + real;
    assert.equal(classifyMigrationSource(commented).verdict, DESTRUCTIVE);
    assert.equal(classifyMigrationSource(blockCommented).verdict, DESTRUCTIVE);
    const two = "class A { async up(q) { await q.query('CREATE INDEX i ON t (a)'); } }\nclass B { async up(q) { await q.query('DELETE FROM users'); } }";
    assert.equal(classifyMigrationSource(two).verdict, REVIEW);
  });

  it('addColumn(s) options cannot be analysed — review', () => {
    assert.equal(verdictOf("await q.addColumn('users', new TableColumn({ name: 'required', type: 'text', isNullable: false }));"), REVIEW);
    assert.equal(verdictOf("await q.addColumns('users', [col]);"), REVIEW);
  });

  it('escapes whose value is not fixed by the scanner need review', () => {
    assert.equal(verdictOf("await q.query('COMMENT ON TABLE users IS NULL\\u003b DELETE FROM users');"), REVIEW);
    assert.equal(verdictOf("await q.query('COMMENT ON TABLE users IS NULL\\x3b DELETE FROM users');"), REVIEW);
    assert.equal(verdictOf("await q.query('COMMENT ON TABLE users IS \\'a\\'');"), ADDITIVE);
    assert.equal(verdictOf("await q.query(`COMMENT ON TABLE users IS 'a\\nb'`);"), ADDITIVE);
  });
});

describe('D destructive', () => {
  it('drop · rename · type change · bulk data change are destructive', () => {
    for (const up of [
      "await q.query('DROP TABLE legacy');",
      "await q.query('DROP INDEX idx_legacy');",
      "await q.query('ALTER TABLE existing DROP COLUMN legacy');",
      "await q.query('ALTER TABLE existing DROP CONSTRAINT legacy_check');",
      "await q.query('ALTER TABLE existing RENAME COLUMN a TO b');",
      "await q.query('ALTER TABLE existing RENAME TO renamed');",
      "await q.query('ALTER TABLE existing ALTER COLUMN amount TYPE numeric(20,8)');",
      "await q.query('ALTER TABLE existing ALTER COLUMN amount SET DATA TYPE bigint');",
      "await q.query(`UPDATE existing SET mode='x' WHERE enabled=true`);",
      "await q.query(`DELETE FROM existing WHERE kind='identity'`);",
      "await q.query('TRUNCATE TABLE existing');",
      "await q.query('ALTER TABLE existing ADD COLUMN a int, DROP COLUMN b');",
      "await q.dropColumn('existing', 'legacy');",
      "await q.renameColumn('existing', 'a', 'b');",
      "await q.changeColumn('existing', 'a', new TableColumn({ name: 'a', type: 'text' }));",
    ]) assert.equal(verdictOf(up), DESTRUCTIVE, up);
  });

  it('one destructive statement among additive ones decides the migration', () => {
    assert.equal(verdictOf("await q.query('CREATE TABLE t (id int); ALTER TABLE existing ADD COLUMN c int; DROP TABLE legacy');"), DESTRUCTIVE);
  });
});

describe('R ambiguous → approval', () => {
  it('dynamic SQL, functions, permissions and other existing-table changes need review', () => {
    for (const up of [
      'for (const t of tables) await q.query(`ALTER TABLE ${t} ADD COLUMN c int`);',
      'const sql = "CREATE TABLE t (id int)"; await q.query(sql);',
      "await q.query('CREATE TABLE ' + name + ' (id int)');",
      'await q.query(`CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);',
      "await q.query(`DO $$ BEGIN EXECUTE 'DROP TABLE x'; END $$`);",
      "await q.query('GRANT SELECT ON existing TO reader');",
      "await q.query('REVOKE ALL ON existing FROM reader');",
      "await q.query(`ALTER TABLE existing ADD CONSTRAINT c CHECK (a > 0)`);",
      "await q.query(`ALTER TABLE existing ALTER COLUMN a SET NOT NULL`);",
      "await q.query(`ALTER TABLE existing ALTER COLUMN a SET DEFAULT 'x'`);",
      "await q.query(`INSERT INTO existing(a) VALUES (1)`);",
      'await q.query(`CREATE TRIGGER fence BEFORE INSERT ON existing FOR EACH ROW EXECUTE FUNCTION f()`);',
      'await q.query(`CREATE OR REPLACE VIEW v AS SELECT 1`);',
      "await q.query(`SELECT setval('seq', 10)`);",
      'await helper(q);',
      'await q.manager.save(entity);',
      // query() 첫 인자가 문자열 상수 하나가 아님
      "await q.query('CREATE TABLE a (id int)'.concat('; DROP TABLE users'));",
      "await q.query('CREATE INDEX i ON t (a)'.replace('INDEX', 'TABLE'));",
      "await q.query(flag ? 'CREATE INDEX i ON t (a)' : 'DROP TABLE t');",
      // 기존 표 열 정의 안의 제약 · 기본값 없는 NOT NULL
      "await q.query(`ALTER TABLE existing ADD COLUMN mode varchar(16) NOT NULL DEFAULT 'a' CHECK (mode IN ('a','b'))`);",
      'await q.query(`ALTER TABLE existing ADD COLUMN code text UNIQUE`);',
      'await q.query(`ALTER TABLE existing ADD COLUMN id2 int PRIMARY KEY`);',
      'await q.query(`ALTER TABLE existing ADD COLUMN total int GENERATED ALWAYS AS (a + b) STORED`);',
      'await q.query(`ALTER TABLE existing ADD COLUMN k int CONSTRAINT k_chk CHECK (k > 0)`);',
      'await q.query(`ALTER TABLE existing ADD COLUMN required text NOT NULL`);',
      // 2026-11-12 허용 목록 전환 — 아래는 전부 승인 대상
      'const [row] = await q.query(`SELECT EXISTS(SELECT 1 FROM existing) AS used`); if (row.used) throw new Error("x");',
      "await q.query('LOCK TABLE existing IN EXCLUSIVE MODE');",
      'await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);',
      'await q.query(`CREATE SCHEMA audit`);',
      'await q.query(`CREATE TABLE copy AS SELECT * FROM existing`);',
      'await q.query(`CREATE TABLE copy (id int) INHERITS (existing)`);',
      "await q.query(`CREATE TABLE p2026 PARTITION OF existing FOR VALUES IN ('x')`);",
      'await q.query(`CREATE SEQUENCE seq_t OWNED BY existing.id`);',
      'await q.query(`ALTER TABLE existing ADD COLUMN owner uuid REFERENCES users(id) ON DELETE CASCADE`);',
      'await q.query(`ALTER TABLE existing ALTER COLUMN a DROP DEFAULT`);',
      'await q.query(`MERGE INTO existing USING src ON true WHEN MATCHED THEN DO NOTHING`);',
      "await q.createForeignKey('existing', fk);",
      "await q.createCheckConstraint('existing', check);",
      "await q.createView(view);",
    ]) assert.equal(verdictOf(up), REVIEW, up);
  });

  it('missing source, missing up() and empty up() need review', () => {
    assert.equal(classifyMigrationSource(undefined).verdict, REVIEW);
    assert.equal(classifyMigrationSource('export const x = 1;').verdict, REVIEW);
    assert.equal(verdictOf('// nothing'), REVIEW);
  });

  // PR #1028 Codex 리뷰 — 판정을 빠져나가던 세 경로
  it('CREATE TABLE IF NOT EXISTS does not make an existing table count as new', () => {
    assert.equal(verdictOf("await q.query('CREATE TABLE IF NOT EXISTS users (id uuid); DELETE FROM users;');"), DESTRUCTIVE);
    assert.equal(verdictOf("await q.query('CREATE TABLE IF NOT EXISTS t (id uuid)'); await q.query(`INSERT INTO t(id) VALUES (gen_random_uuid())`);"), REVIEW);
    assert.equal(verdictOf("await q.query('CREATE TABLE IF NOT EXISTS t (id uuid)');"), ADDITIVE);
  });

  it('data written to a table created in the same migration is never additive', () => {
    const mk = 'await q.query(`CREATE TABLE fresh (id uuid, kind text)`);\n';
    assert.equal(verdictOf(mk + "await q.query(`INSERT INTO fresh(id, kind) VALUES (gen_random_uuid(), 'a')`);"), REVIEW);
    assert.equal(verdictOf(mk + 'await q.query(`CREATE TRIGGER fence BEFORE INSERT ON fresh FOR EACH ROW EXECUTE FUNCTION f()`);'), REVIEW);
    assert.equal(verdictOf(mk + "await q.query(`UPDATE fresh SET kind = 'b'`);"), DESTRUCTIVE);
    assert.equal(verdictOf(mk + 'await q.query(`DELETE FROM fresh`);'), DESTRUCTIVE);
    assert.equal(verdictOf(mk + 'await q.query(`TRUNCATE fresh`);'), DESTRUCTIVE);
  });

  it('a conditionally executed CREATE TABLE gives no new-table exception', () => {
    for (const up of [
      "if (!(await q.hasTable('users'))) { await q.query('CREATE TABLE users (id int)'); }\nawait q.query(`ALTER TABLE users ADD CONSTRAINT u_fk FOREIGN KEY (id) REFERENCES orgs(id) ON DELETE CASCADE`);",
      "try { await q.query('CREATE TABLE users (id int)'); } catch {}\nawait q.query(`ALTER TABLE users ALTER COLUMN id SET DEFAULT 1`);",
      "(await q.hasTable('users')) || await q.query('CREATE TABLE users (id int)');\nawait q.query(`ALTER TABLE users ADD PRIMARY KEY (id)`);",
    ]) assert.equal(verdictOf(up), REVIEW, up);
  });

  it('QueryRunner used through an alias, destructuring or a sub-object needs review', () => {
    for (const up of [
      "await q.query('ALTER TABLE existing ADD COLUMN c int'); const manager = q.manager; await manager.query('DELETE FROM users');",
      "await q.query('ALTER TABLE existing ADD COLUMN c int'); const { manager } = q; await manager.query('DELETE FROM users');",
      "await q.query('ALTER TABLE existing ADD COLUMN c int'); await q.connection.query('DELETE FROM users');",
      "await q.query('ALTER TABLE existing ADD COLUMN c int'); await dataSource.query('DELETE FROM users');",
    ]) assert.notEqual(verdictOf(up), ADDITIVE, up);
  });
});

describe('S scanner', () => {
  it('ignores SQL words inside JS comments and handles regex literals', () => {
    const up = `// DROP TABLE users — 주석일 뿐이다
    const quote = (v: string) => '"' + v.replace(/"/g, '""') + '"';
    await q.query(\`CREATE TABLE t (id int)\`);`;
    assert.equal(verdictOf(up), ADDITIVE);
  });

  it('SQL comment markers inside string literals do not hide the next statement', () => {
    assert.equal(verdictOf(`await q.query("COMMENT ON TABLE users IS 'user -- account'; DELETE FROM users;");`), DESTRUCTIVE);
    assert.equal(verdictOf(`await q.query("COMMENT ON TABLE users IS 'a /* b'; DELETE FROM users; -- */");`), DESTRUCTIVE);
    assert.equal(verdictOf(`await q.query("COMMENT ON TABLE users IS E'it\\\\'s -- x'; DELETE FROM users;");`), DESTRUCTIVE);
    assert.equal(verdictOf(`await q.query("ALTER TABLE existing ADD COLUMN c int; -- DROP TABLE users\\n/* DELETE FROM users; */");`), ADDITIVE);
  });

  it('quoted identifiers keep case and are matched whole ("Users" ≠ users · "users-live" ≠ "users-staging")', () => {
    const fk = 'ADD CONSTRAINT c CHECK (id > 0)';
    assert.equal(verdictOf(`await q.query(\`CREATE TABLE "Users" (id int)\`);\nawait q.query(\`ALTER TABLE users ${fk}\`);`), REVIEW);
    assert.equal(verdictOf(`await q.query(\`CREATE TABLE "Users" (id int)\`);\nawait q.query(\`ALTER TABLE "Users" ${fk}\`);`), ADDITIVE);
    assert.equal(verdictOf(`await q.query(\`CREATE TABLE new_t (id int)\`);\nawait q.query(\`ALTER TABLE public."new_t" ${fk}\`);`), ADDITIVE);
    assert.equal(verdictOf(`await q.query(\`CREATE TABLE new_t (id int)\`);\nawait q.query(\`ALTER TABLE "New_t" ${fk}\`);`), REVIEW);
    assert.equal(verdictOf(`await q.query(\`CREATE TABLE "users-staging" (id int)\`);\nawait q.query(\`ALTER TABLE "users-live" ${fk}\`);`), REVIEW);
    assert.equal(verdictOf(`await q.query(\`CREATE TABLE "a""b" (id int)\`);\nawait q.query(\`ALTER TABLE "a" ${fk}\`);`), REVIEW);
  });

  it('runner manager alias is not additive', () => {
    assert.equal(verdictOf("await q.query('ALTER TABLE a ADD COLUMN b int');\nconst manager = q.manager;\nawait manager.query('DELETE FROM users');"), REVIEW);
  });

  it('findings name the reason', () => {
    const r = classifyMigrationSource(wrap("await q.query('DROP TABLE legacy');"));
    assert.match(r.findings.join(' '), /DROP TABLE legacy/);
  });

  it('isAppendOnly accepts appended lines only', () => {
    assert.equal(isAppendOnly('a\nb\n];', 'a\nb\nc\n];'), true);
    assert.equal(isAppendOnly('a\nb\n];', 'a\n];'), false);
    assert.equal(isAppendOnly('a\nb', 'b\na'), false);
    assert.equal(isAppendOnly(undefined, 'a'), false);
  });
});

describe('X repository migrations', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const dir = path.join(root, 'apps/api-server/src/database', ['migr', 'ations'].join(''));
  const read = (name) => readFileSync(path.join(dir, name), 'utf8');

  it('known destructive migrations are never classified additive', () => {
    for (const name of [
      '1790251584623-DropLegacyPasswordAuthSchema.ts',
      '1791870434349-CreateAiUsageReservations.ts',
      '1791795139475-RetireLegacyErasureIdentityHashes.ts',
      '1793322213345-AddAssistantStorageAuthority.ts',
      '1793457683032-RenameDrugstoreCooperation.ts',
    ]) assert.notEqual(classifyMigrationSource(read(name)).verdict, ADDITIVE, name);
  });

  it('a new table with a trigger needs approval (trigger is outside the allowlist)', () => {
    assert.equal(classifyMigrationSource(read('1793186241009-CreateCentralOperationMenuGrants.ts')).verdict, REVIEW);
  });

  it('known purely additive migrations are additive', () => {
    for (const name of [
      '1793586897000-AddAdminOperationsDelegation.ts',
      '1793750400000-AddTemporaryPasswordExpiry.ts',
      '1793857542325-AddStorePlaylistTags.ts',
      '1794357598911-AllowUsersWithoutEmail.ts',
    ]) assert.equal(classifyMigrationSource(read(name)).verdict, ADDITIVE, name);
  });
});
