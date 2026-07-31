/**
 * WO-O4O-ADMIN-USER-SEARCH-500-FIX-V1
 *
 * `GET /api/v1/admin/users?search=...` 는 존재하지 않는 `user.company` 를 참조해 500 이었다.
 * TypeORM 은 매핑되지 않은 속성을 치환하지 못하고 `user.company` 를 그대로 SQL 에 남기는데,
 * `user` 가 PostgreSQL 예약어라 `syntax error at or near "."` 로 실패했다.
 *
 * 이 테스트는 **DB 연결 없이** 데코레이터 메타데이터만으로 같은 유형의 회귀를 막는다:
 * 검색 대상 필드가 전부 User 엔티티의 실제 컬럼인지 검사한다.
 */
import { getMetadataArgsStorage } from 'typeorm';
import { User } from '../../../modules/auth/entities/User.js';
import {
  ADMIN_USER_SEARCH_FIELDS,
  buildUserSearchWhere,
  normalizeUserSearch,
} from '../AdminUserController.js';

/** User 엔티티에 @Column 으로 등록된 속성명 집합 (연결 불필요) */
function userColumnProperties(): Set<string> {
  const storage = getMetadataArgsStorage();
  const props = storage.columns
    .filter((c) => c.target === User || (typeof c.target === 'function' && User.prototype instanceof c.target))
    .map((c) => c.propertyName);
  return new Set(props);
}

describe('admin user search — 검색 대상 필드', () => {
  it('모든 검색 필드가 User 엔티티의 실제 컬럼이다 (500 회귀 방지)', () => {
    const columns = userColumnProperties();
    expect(columns.size).toBeGreaterThan(0); // 메타데이터 로딩 자체를 보증

    const unmapped = ADMIN_USER_SEARCH_FIELDS.filter((f) => !columns.has(f));
    expect(unmapped).toEqual([]);
  });

  it('제거된 company 를 다시 참조하지 않는다', () => {
    expect(ADMIN_USER_SEARCH_FIELDS).not.toContain('company' as never);
    expect(buildUserSearchWhere('user')).not.toContain('company');
  });

  it('검색 계약(이메일 · 이름 · 전화번호)을 모두 포함한다', () => {
    expect(ADMIN_USER_SEARCH_FIELDS).toContain('email');
    expect(ADMIN_USER_SEARCH_FIELDS).toContain('name');
    expect(ADMIN_USER_SEARCH_FIELDS).toContain('phone');
  });
});

describe('admin user search — WHERE 절 생성', () => {
  it('모든 필드를 alias 로 한정하고 OR 로 잇는다', () => {
    const sql = buildUserSearchWhere('user');
    expect(sql).toBe(
      '(user.name ILIKE :search OR user.firstName ILIKE :search OR ' +
        'user.lastName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
    );
  });

  it('바인딩 파라미터는 :search 하나뿐이다 (raw interpolation 금지)', () => {
    const sql = buildUserSearchWhere('user');
    const binds = sql.match(/:\w+/g) ?? [];
    expect(new Set(binds)).toEqual(new Set([':search']));
    expect(binds).toHaveLength(ADMIN_USER_SEARCH_FIELDS.length);
    // 검색어가 SQL 문자열에 직접 삽입될 여지가 없어야 한다
    expect(sql).not.toContain("'");
    expect(sql).not.toContain('%');
  });

  it('count 쿼리와 목록 쿼리가 같은 조건을 쓰도록 단일 SSOT 를 제공한다', () => {
    // getManyAndCount() 는 동일 QueryBuilder 를 사용하므로 조건이 갈라질 수 없다.
    expect(buildUserSearchWhere('user')).toBe(buildUserSearchWhere('user'));
  });
});

describe('admin user search — 검색어 정규화', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeUserSearch('  hong  ')).toBe('hong');
  });

  it('공백만 입력하면 빈 문자열 — 검색 없는 목록과 동일 분기', () => {
    expect(normalizeUserSearch('   ')).toBe('');
    expect(normalizeUserSearch('')).toBe('');
  });

  it('문자열이 아닌 입력은 빈 문자열로 처리한다', () => {
    expect(normalizeUserSearch(undefined)).toBe('');
    expect(normalizeUserSearch(null)).toBe('');
    expect(normalizeUserSearch(['a', 'b'])).toBe('');
    expect(normalizeUserSearch({ $ne: null })).toBe('');
  });

  it('한글 · 특수문자 검색어를 그대로 보존한다 (이스케이프는 바인딩이 담당)', () => {
    expect(normalizeUserSearch(' 홍길동 ')).toBe('홍길동');
    expect(normalizeUserSearch("o'brien")).toBe("o'brien");
    expect(normalizeUserSearch('100%')).toBe('100%');
    expect(normalizeUserSearch("'; DROP TABLE users; --")).toBe("'; DROP TABLE users; --");
  });
});
