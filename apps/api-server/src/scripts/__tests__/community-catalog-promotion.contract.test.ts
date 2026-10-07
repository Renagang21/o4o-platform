/**
 * 폴백 커뮤니티 승격 CLI 계약 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 스크립트는 운영 DB 에 회원 행을 만든다. 실제 동작은 격리 PostgreSQL 15 fixture 로
 * 검증했고(CHECK §2-4), 이 테스트는 **되돌리면 안 되는 성질 네 가지**를 소스에 고정한다.
 *
 *   ① 기본은 dry-run 이다 — `--apply` 가 기본이 되면 검토 없이 운영에 write 한다
 *   ② 승인 기준은 증거 AND 자격이다 — 한쪽만 남으면 일괄 승인이 된다
 *   ③ 기존 행을 덮어쓰지 않는다 — 운영자가 바꾼 이름·상태·역할을 되돌리면 안 된다
 *   ④ raw SQL 은 파라미터 바인딩이다 (CLAUDE.md §7 Guard Rule 2)
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'community-catalog-promotion.ts'),
  'utf-8',
);

const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

describe('① 기본은 dry-run', () => {
  it('--apply 플래그가 있을 때만 write 모드다', () => {
    expect(codeOnly).toMatch(/const APPLY = process\.argv\.includes\('--apply'\)/);
  });

  it('APPLY 가 아니면 측정만 하고 반환한다', () => {
    expect(codeOnly).toMatch(/if \(!APPLY\) return measured;/);
  });

  it('write 는 APPLY 분기 뒤에만 있다 — 그 앞에 INSERT 가 없다', () => {
    const cut = codeOnly.indexOf('if (!APPLY) return measured;');
    expect(cut).toBeGreaterThan(-1);
    expect(codeOnly.slice(0, cut)).not.toMatch(/INSERT INTO/i);
  });
});

describe('② 승인 기준 = 증거 AND 자격', () => {
  it('증거는 글 **또는 댓글** 이다 (댓글만 쓴 참여자를 빼지 않는다)', () => {
    expect(codeOnly).toMatch(/FROM forum_post p/);
    expect(codeOnly).toMatch(/FROM forum_comment c/);
    expect(codeOnly).toMatch(/UNION/);
  });

  it('증거는 그 커뮤니티의 원장 코드로 한정한다', () => {
    expect(codeOnly).toMatch(/r\.service_code = ANY\(\$1\)/);
  });

  it('자격은 현재 active service_memberships 로 판정한다', () => {
    expect(codeOnly).toMatch(/FROM service_memberships sm/);
    expect(codeOnly).toMatch(/sm\.status = 'active'/);
  });

  it('INSERT 는 증거 집합에 자격 조건을 **함께** 적용한다', () => {
    // `FROM ev WHERE <eligibility>` — 둘 중 하나만 남으면 일괄 승인이 된다.
    expect(codeOnly).toMatch(/INSERT INTO community_memberships[\s\S]{0,400}FROM ev\s*\n?\s*WHERE \$\{elig\.sql\}/);
  });

  it('승인되는 행은 일반 회원이다 — 운영자를 만들지 않는다', () => {
    expect(codeOnly).toMatch(/'member', 'active'/);
    expect(codeOnly).not.toMatch(/'operator', 'active'/);
  });
});

describe('③ 기존 행을 덮어쓰지 않는다', () => {
  it('커뮤니티 승격은 멱등이며 이름·상태를 건드리지 않는다', () => {
    expect(codeOnly).toMatch(/ON CONFLICT \(slug\) DO UPDATE SET slug = communities\.slug/);
  });

  it('이미 있는 회원 행은 그대로 둔다', () => {
    expect(codeOnly).toMatch(/ON CONFLICT \(community_id, user_id\) DO NOTHING/);
  });

  it('역할을 부여하지 않는다 — role_assignments 를 건드리지 않는다', () => {
    expect(codeOnly).not.toMatch(/role_assignments/i);
  });
});

describe('④ SQL 안전', () => {
  it('SQL 안에는 고정 조각과 플레이스홀더 번호만 보간한다 (값 보간 0)', () => {
    /**
     * 허용되는 것은 세 가지뿐이다:
     *   EVIDENCE_CTE          모듈 상수인 고정 SQL (사용자 입력 없음)
     *   elig.sql              eligibilityClause 가 만드는 고정 SQL ('TRUE' 또는 EXISTS 절)
     *   paramIndex / 2 + …    `$2` 같은 **플레이스홀더 번호** — 값이 아니다
     * 나머지는 로그·표시용 문자열이며 SQL 에 들어가지 않는다.
     */
    const SQL_SAFE = new Set(['${EVIDENCE_CTE}', '${elig.sql}', '${paramIndex}', '${2 + elig.params.length}']);
    const NON_SQL = /^\$\{(presence\(DB_|isCloudSQLSocket|APPLY|r\.|def\.|measured|total)/;

    const unexpected = (codeOnly.match(/\$\{[^}]+\}/g) ?? []).filter(
      (m) => !SQL_SAFE.has(m) && !NON_SQL.test(m),
    );
    // 새 보간이 생기면 여기서 걸린다 — 값 보간이면 파라미터($n)로 옮긴다.
    expect(unexpected).toEqual([]);
  });

  it('행에서 온 값을 SQL 에 직접 넣지 않는다', () => {
    // params 배열로만 넘긴다 — codes · communityId · userId 가 SQL 텍스트에 없다.
    expect(codeOnly).not.toMatch(/\$\{(codes|communityId|userId|def\.key|request)/);
  });

  it('entity 를 싣지 않는 raw SQL 전용 연결이다', () => {
    expect(codeOnly).toMatch(/entities: \[\]/);
  });

  it('접속값을 로그에 넣지 않는다', () => {
    expect(codeOnly).not.toMatch(/console\.log\([^)]*DB_(HOST|PASSWORD|USERNAME|NAME)/);
  });
});
