/**
 * WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1
 *
 * `users."businessInfo"` 부분 갱신 표현식 생성기의 계약을 고정한다.
 *
 * 판정 계약:
 *   - 애플리케이션이 읽어 온 스냅샷을 되쓰지 않는다 (표현식이 컬럼 현재값을 참조).
 *   - 요청이 명시한 키만 patch 에 들어간다.
 *   - 중첩 객체는 통째로 교체하지 않고 하위 키만 병합한다.
 *   - 값은 전부 파라미터 바인딩 (문자열 보간 금지 — CLAUDE.md §7 Guard Rule 2).
 *   - 컬럼 타입이 json 이므로 최종 결과는 ::json 으로 되돌린다.
 */

import {
  applyBusinessInfoPatch,
  buildBusinessInfoUpdate,
  buildBusinessInfoUpdateStatement,
} from '../business-info-write.js';

describe('buildBusinessInfoUpdate — 부분 갱신 표현식', () => {
  it('바꿀 것이 없으면 null 을 반환한다 (write 자체를 생략시킨다)', () => {
    expect(buildBusinessInfoUpdate({}, 1)).toBeNull();
    expect(buildBusinessInfoUpdate({ root: {} }, 1)).toBeNull();
    // 하위 키가 없는 중첩 patch 로 빈 객체를 덮어쓰지 않는다
    expect(buildBusinessInfoUpdate({ nested: { metadata: {} } }, 1)).toBeNull();
  });

  it('최상위 patch 는 기존 컬럼값에 concat 한다 (스냅샷 되쓰기 아님)', () => {
    const f = buildBusinessInfoUpdate({ root: { address: 'A' } }, 1)!;

    expect(f.expression).toContain('"businessInfo"::jsonb');
    expect(f.expression).toContain('|| $1::jsonb');
    expect(f.params).toEqual([JSON.stringify({ address: 'A' })]);
    expect(f.nextIndex).toBe(2);
  });

  it('중첩 patch 는 해당 중첩 객체의 현재값에만 concat 한다 (형제 키 보존)', () => {
    const f = buildBusinessInfoUpdate({ nested: { metadata: { pharmacy_phone: '02-1' } } }, 1)!;

    expect(f.expression).toContain(`jsonb_set(`);
    expect(f.expression).toContain(`'{metadata}'`);
    expect(f.expression).toContain(`"businessInfo"::jsonb -> 'metadata'`);
    expect(f.params).toEqual([JSON.stringify({ pharmacy_phone: '02-1' })]);
  });

  it('NULL·비객체 businessInfo 를 빈 객체로 방어한다 (jsonb || 스칼라 오류 방지)', () => {
    const f = buildBusinessInfoUpdate({ root: { a: 1 }, nested: { metadata: { b: 2 } } }, 1)!;

    // 최상위 / 중첩 양쪽 모두 jsonb_typeof 가드를 통과한다
    expect(f.expression.match(/jsonb_typeof/g)).toHaveLength(2);
    expect(f.expression).toContain(`ELSE '{}'::jsonb END`);
  });

  it('컬럼 타입(json)에 맞춰 ::json 으로 되돌린다', () => {
    const f = buildBusinessInfoUpdate({ root: { a: 1 } }, 1)!;
    expect(f.expression.endsWith('::json')).toBe(true);
  });

  it('startIndex 를 존중해 다른 SET 절과 하나의 UPDATE 로 합칠 수 있다', () => {
    const f = buildBusinessInfoUpdate({ root: { a: 1 }, nested: { metadata: { b: 2 } } }, 7)!;

    expect(f.expression).toContain('$7::jsonb');
    expect(f.expression).toContain('$8::jsonb');
    expect(f.nextIndex).toBe(9);
    expect(f.params).toHaveLength(2);
  });

  it('값은 전부 파라미터로 나가고 표현식에 보간되지 않는다', () => {
    const f = buildBusinessInfoUpdate({ root: { address: "'; DROP TABLE users; --" } }, 1)!;
    expect(f.expression).not.toContain('DROP TABLE');
    expect(f.params[0]).toContain('DROP TABLE');
  });

  it('키 이름은 화이트리스트로 검증한다 (경로 리터럴 주입 차단)', () => {
    // 중첩 키는 SQL 경로 리터럴 '{key}' 에 들어가므로 따옴표·중괄호가 섞이면 즉시 거부한다
    const evilKey = "a'}, '{injected}', '\"x\"', true) --";

    expect(() => buildBusinessInfoUpdate({ root: { [evilKey]: 1 } }, 1)).toThrow(/unsafe/);
    expect(() => buildBusinessInfoUpdate({ nested: { [evilKey]: { b: 1 } } }, 1)).toThrow(/unsafe/);
  });

  it('같은 키를 root 와 nested 양쪽에 넣으면 거부한다 (의도 모호)', () => {
    expect(() =>
      buildBusinessInfoUpdate({ root: { metadata: {} }, nested: { metadata: { a: 1 } } }, 1),
    ).toThrow(/both root and nested/);
  });
});

describe('buildBusinessInfoUpdateStatement — 단독 UPDATE 문', () => {
  it('userId 를 마지막 파라미터로 바인딩하고 updatedAt 을 갱신한다', () => {
    const s = buildBusinessInfoUpdateStatement({ root: { address: 'A' } }, 'user-1')!;

    expect(s.sql).toMatch(/UPDATE users/);
    expect(s.sql).toContain('"updatedAt" = NOW()');
    expect(s.sql).toMatch(/WHERE id = \$2/);
    expect(s.params).toEqual([JSON.stringify({ address: 'A' }), 'user-1']);
    // SELECT 후 되쓰기가 아니라는 증거: 문장 하나로 끝난다
    expect(s.sql).not.toMatch(/SELECT/i);
  });

  it('바꿀 것이 없으면 null 이다', () => {
    expect(buildBusinessInfoUpdateStatement({ root: {} }, 'user-1')).toBeNull();
  });
});

describe('applyBusinessInfoPatch — DB 병합의 메모리 재현', () => {
  it('요청이 모르는 최상위·중첩 형제 키를 보존한다', () => {
    const current = {
      sentinelRoot: 'keep-me',
      businessNumber: '1',
      metadata: { workplace: 'W', pharmacy_phone: '02-1' },
    };

    const next = applyBusinessInfoPatch(current, {
      root: { address: 'NEW' },
      nested: { metadata: { pharmacy_phone: '02-9' } },
    });

    expect(next.sentinelRoot).toBe('keep-me');
    expect(next.businessNumber).toBe('1');
    expect(next.address).toBe('NEW');
    expect(next.metadata).toEqual({ workplace: 'W', pharmacy_phone: '02-9' });
    // 원본 불변
    expect(current.metadata.pharmacy_phone).toBe('02-1');
  });

  it('NULL·비객체 현재값을 빈 객체로 취급한다', () => {
    expect(applyBusinessInfoPatch(null, { root: { a: 1 } })).toEqual({ a: 1 });
    expect(applyBusinessInfoPatch('scalar', { root: { a: 1 } })).toEqual({ a: 1 });
    expect(applyBusinessInfoPatch({ metadata: 'not-an-object' }, { nested: { metadata: { a: 1 } } }))
      .toEqual({ metadata: { a: 1 } });
  });

  it('null 과 빈 문자열은 그 값 그대로 저장한다 (키 삭제 아님)', () => {
    const next = applyBusinessInfoPatch({ address: 'OLD', address2: 'OLD2' }, {
      root: { address: null, address2: '' },
    });
    expect(next).toHaveProperty('address', null);
    expect(next).toHaveProperty('address2', '');
  });
});
