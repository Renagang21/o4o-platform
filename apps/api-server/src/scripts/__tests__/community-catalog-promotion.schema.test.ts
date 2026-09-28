/**
 * 승격 CLI 의 SQL 이 **실제 스키마의 컬럼만** 참조하는지 — 정본에서 확인
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 생긴 이유 (2026-09-27 사고)
 *
 *   증거 질의를 `JOIN forum_post p ON p.id = c.post_id` 로 썼다. entity 를 grep 했지만
 *   글 참조 컬럼은 확인하지 않고 `post_id` 로 **가정**했다. 그 가정대로 격리 PG 에
 *   fixture 테이블을 만들어 돌렸더니 삽입·멱등까지 "PASS" 가 나왔다 — SQL 과 fixture 가
 *   같은 가정을 공유했기 때문이다. 실제 컬럼은 camelCase `"postId"` 였고, 운영에 그대로
 *   갔으면 증거 0건 → 이행 대상 0으로 조용히 끝났다. 다른 세션이 main 에서 고쳤다.
 *
 *   그래서 검사 방향을 뒤집는다. fixture 를 손으로 만들지 않고,
 *   **CLI 가 참조하는 컬럼을 스키마 정본(baseline DDL · 이 WO 의 migration)에서 확인**한다.
 *   격리 DB 도 Docker 도 필요 없고, 내가 만든 fixture 를 상대로 통과할 수도 없다.
 *
 * 한계(정직하게): 컬럼의 **존재**를 보는 검사다. 타입·NULL 여부·조인 방향의 의미가
 * 맞는지는 보지 않는다. 그 부분은 공식 dry-run 의 실측 수치로 확인한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, ...rel.split('/')), 'utf-8');

const CLI = read('scripts/community-catalog-promotion.ts');
const BASELINE = read('database/bootstrap/canonical-schema-baseline.ts');
const COMMUNITY_MIGRATION = read('database/migrations/1790400000000-CreateCommunityDomain.ts');

/**
 * `CREATE TABLE ... <table> (` 다음부터 컬럼 정의가 끝나는 `);` 까지.
 * baseline 은 `CREATE TABLE public.<t> (`, migration 은 스키마 접두가 없을 수 있다.
 */
function createTableBody(source: string, table: string): string | null {
  const patterns = [`CREATE TABLE public.${table} (`, `CREATE TABLE ${table} (`, `CREATE TABLE IF NOT EXISTS ${table} (`];
  for (const p of patterns) {
    const at = source.indexOf(p);
    if (at < 0) continue;
    const from = at + p.length;
    const end = source.indexOf(');', from);
    if (end < 0) continue;
    return source.slice(from, end);
  }
  return null;
}

function tableBody(table: string): string {
  const body = createTableBody(BASELINE, table) ?? createTableBody(COMMUNITY_MIGRATION, table);
  if (!body) throw new Error(`스키마 정본에서 ${table} 의 CREATE TABLE 을 찾지 못했다`);
  return body;
}

/**
 * 컬럼 정의의 첫 토큰만 본다 — 다른 컬럼의 DEFAULT 문구나 제약 이름에 우연히
 * 같은 문자열이 들어 있어도 통과하지 않게 한다.
 */
function declaredColumns(table: string): string[] {
  return tableBody(table)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(/[\s(]/)[0])
    .filter((t) => t.length > 0 && !/^(CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|CHECK|KEY)$/i.test(t))
    .map((t) => t.replace(/,$/, ''));
}

/** SQL 에서 쓴 표기 그대로 비교한다 — `"postId"` 와 `postid` 는 다른 컬럼이다. */
function hasColumn(table: string, column: string): boolean {
  return declaredColumns(table).includes(column);
}

/** CLI 가 참조하는 (테이블, 컬럼) — SQL 을 읽고 손으로 적은 목록이 아니라 검사 대상이다. */
const REFERENCED: Array<[string, string[]]> = [
  ['forum_post', ['id', 'author_id', 'forum_id']],
  ['forum_comment', ['author_id', '"postId"']],
  ['forum_category_requests', ['id', 'service_code']],
  ['service_memberships', ['user_id', 'status', 'service_key']],
  ['communities', ['id', 'slug', 'name', 'status']],
  ['community_memberships', ['community_id', 'user_id', 'role', 'status', 'approved_at']],
];

describe('승격 CLI — 참조 컬럼이 스키마 정본에 있다', () => {
  it('검사 전제: 정본 파일을 읽었고 CLI 의 SQL 이 있다', () => {
    expect(BASELINE).toContain('CREATE TABLE public.forum_comment (');
    expect(COMMUNITY_MIGRATION).toContain('community_memberships');
    expect(CLI).toContain('WITH ev AS (');
  });

  for (const [table, columns] of REFERENCED) {
    for (const column of columns) {
      it(`${table}.${column} 이 정본에 선언돼 있다`, () => {
        expect(hasColumn(table, column)).toBe(true);
      });
    }
  }

  it('CLI 가 실제로 그 컬럼들을 쓴다 (목록이 죽은 채 통과하지 않게)', () => {
    // jest 의 expect 는 메시지 인자를 받지 않으므로, 어느 항목에서 깨졌는지
    // 알 수 있게 누락 목록을 모아 한 번에 단언한다.
    const missing: string[] = [];
    for (const [table, columns] of REFERENCED) {
      if (!CLI.includes(table)) missing.push(table);
      for (const column of columns) {
        // 따옴표 표기까지 같아야 한다.
        if (!CLI.includes(column)) missing.push(`${table}.${column}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('틀렸던 컬럼명(post_id)으로 되돌아가지 않는다', () => {
    // forum_comment 에는 post_id 가 없다 — 있으면 이 검사 자체가 무의미해진다.
    expect(hasColumn('forum_comment', 'post_id')).toBe(false);
    expect(CLI).toContain('c."postId"');
    expect(CLI).not.toContain('c.post_id');
  });

  it('검사기 자체가 동작한다 — 없는 컬럼은 false 여야 한다', () => {
    expect(hasColumn('forum_comment', 'definitely_not_a_column')).toBe(false);
    expect(hasColumn('forum_post', 'author_id')).toBe(true);
  });
});
