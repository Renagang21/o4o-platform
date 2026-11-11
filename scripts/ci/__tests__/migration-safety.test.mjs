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
  it('table · index · column · comment · NOT NULL relaxation are additive', () => {
    for (const up of [
      'await q.query(`CREATE TABLE t (id uuid PRIMARY KEY, name text NOT NULL)`);',
      'await q.query(`CREATE UNIQUE INDEX idx_t ON existing (a, b)`);',
      'await q.query(`CREATE INDEX IF NOT EXISTS idx_t ON existing (a)`);',
      "await q.query('ALTER TABLE existing ADD COLUMN note text');",
      "await q.query(`ALTER TABLE existing ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}', ADD COLUMN x uuid NULL`);",
      "await q.query(`ALTER TABLE existing ADD COLUMN mode varchar(16) NOT NULL DEFAULT 'a' CHECK (mode IN ('a','b'))`);",
      'await q.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);',
      "await q.query(`COMMENT ON COLUMN existing.note IS '설명; 세미콜론 포함'`);",
      'await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);',
      'const [row] = await q.query(`SELECT EXISTS(SELECT 1 FROM existing) AS used`); if (row.used) throw new Error("x");',
    ]) assert.equal(verdictOf(up), ADDITIVE, up);
  });

  it('constraints · triggers · rows on a table created in the same migration are additive', () => {
    const up = `await q.query(\`CREATE TABLE public.fresh (id uuid PRIMARY KEY, kind text)\`);
    await q.query(\`ALTER TABLE fresh ADD CONSTRAINT fresh_kind CHECK (kind IN ('a'))\`);
    await q.query(\`CREATE TRIGGER fence BEFORE INSERT OR UPDATE ON public.fresh FOR EACH ROW EXECUTE FUNCTION f()\`);
    await q.query(\`INSERT INTO fresh(id, kind) VALUES (gen_random_uuid(), 'a')\`);`;
    assert.equal(verdictOf(up), ADDITIVE);
  });

  it('down() is never analysed — its DROP does not make the migration destructive', () => {
    assert.equal(verdictOf("await q.query('CREATE TABLE t (id int)');", "await q.query('DROP TABLE t'); await q.query('DELETE FROM users');"), ADDITIVE);
  });

  it('QueryRunner structure API that only adds is additive', () => {
    assert.equal(verdictOf("await q.createTable(new Table({ name: 't', columns: [] })); await q.addColumn('existing', new TableColumn({ name: 'c', type: 'int' }));"), ADDITIVE);
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
    ]) assert.equal(verdictOf(up), REVIEW, up);
  });

  it('missing source, missing up() and empty up() need review', () => {
    assert.equal(classifyMigrationSource(undefined).verdict, REVIEW);
    assert.equal(classifyMigrationSource('export const x = 1;').verdict, REVIEW);
    assert.equal(verdictOf('// nothing'), REVIEW);
  });
});

describe('S scanner', () => {
  it('ignores SQL words inside JS comments and handles regex literals', () => {
    const up = `// DROP TABLE users — 주석일 뿐이다
    const quote = (v: string) => '"' + v.replace(/"/g, '""') + '"';
    await q.query(\`CREATE TABLE t (id int)\`);`;
    assert.equal(verdictOf(up), ADDITIVE);
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

  it('known purely additive migrations are additive', () => {
    for (const name of [
      '1793586897000-AddAdminOperationsDelegation.ts',
      '1793750400000-AddTemporaryPasswordExpiry.ts',
      '1793857542325-AddStorePlaylistTags.ts',
      '1793186241009-CreateCentralOperationMenuGrants.ts',
      '1794357598911-AllowUsersWithoutEmail.ts',
    ]) assert.equal(classifyMigrationSource(read(name)).verdict, ADDITIVE, name);
  });
});
