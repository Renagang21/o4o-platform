/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 · PR #257 보완 4 — `email_verification_tokens` DROP 가드.
 *
 * 이 migration 은 신규 2테이블을 만들고, 기존 고아 `email_verification_tokens`(평문 token · camelCase)를
 * **DROP 후 재생성**한다. 적용 직전 조건이 달라졌으면(행 존재 · 예상 밖 형태) DROP 을 **실행하기 전에**
 * 실패해야 한다 — migrate.ts 는 migration 마다 트랜잭션을 쓰므로 실패하면 앞의 CREATE 도 되돌아간다.
 *
 * 증명하지 않는 것: 실제 PostgreSQL 왕복(QueryRunner 대역). 최종 스키마 지문은 expected-schema-states 가 본다.
 */
import { CreateEmailPasswordAuthTables1790683000000 } from '../database/migrations/1790683000000-CreateEmailPasswordAuthTables.js';

const LEGACY_COLS = ['id', 'token', 'userId', 'expiresAt', 'email', 'usedAt', 'createdAt'].map((column_name) => ({ column_name }));
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function runner(opts: { count: number; cols: Array<{ column_name: string }> }) {
  const sql: string[] = [];
  const query = jest.fn(async (text: string) => {
    const q = norm(text);
    sql.push(q);
    if (/^SELECT count\(\*\) AS n FROM email_verification_tokens/i.test(q)) return [{ n: String(opts.count) }];
    if (/information_schema\.columns/i.test(q)) return opts.cols;
    return [];
  });
  return { q: { query } as any, sql };
}

const isDrop = (s: string) => /^DROP TABLE email_verification_tokens$/i.test(s);

describe('CreateEmailPasswordAuthTables — email_verification_tokens DROP 가드', () => {
  it('0행 · 옛 형태 → DROP 후 token_hash 형태로 재생성', async () => {
    const { q, sql } = runner({ count: 0, cols: LEGACY_COLS });
    await new CreateEmailPasswordAuthTables1790683000000().up(q);
    const drop = sql.findIndex(isDrop);
    expect(drop).toBeGreaterThan(-1);
    expect(sql.slice(0, drop).some((s) => /count\(\*\)/i.test(s))).toBe(true);
    expect(sql.slice(drop + 1).some((s) => /CREATE TABLE email_verification_tokens .*token_hash/i.test(s))).toBe(true);
  });

  it('행이 있으면 DROP 전에 실패 — DROP · 재생성 0', async () => {
    const { q, sql } = runner({ count: 3, cols: LEGACY_COLS });
    await expect(new CreateEmailPasswordAuthTables1790683000000().up(q)).rejects.toThrow(/3 row\(s\) — refusing to DROP/);
    expect(sql.some(isDrop)).toBe(false);
    expect(sql.some((s) => /CREATE TABLE email_verification_tokens/i.test(s))).toBe(false);
  });

  it.each([
    ['이미 새 형태(token_hash)', ['id', 'token_hash', 'user_id'].map((column_name) => ({ column_name }))],
    ['평문 token 컬럼 없음', ['id', 'userId'].map((column_name) => ({ column_name }))],
  ])('%s → 예상 밖 형태로 실패 — DROP 0', async (_label, cols) => {
    const { q, sql } = runner({ count: 0, cols });
    await expect(new CreateEmailPasswordAuthTables1790683000000().up(q)).rejects.toThrow(/not the expected legacy shape/);
    expect(sql.some(isDrop)).toBe(false);
  });
});
