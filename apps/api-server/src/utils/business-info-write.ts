/**
 * WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1
 *
 * `users."businessInfo"` **부분 갱신(partial update)** SQL 조각 생성기.
 *
 * ## 왜 필요한가
 *
 * 프로필 write 경로들은 지금까지 전부 다음 형태였다.
 *
 * ```ts
 * const [row] = await q(`SELECT "businessInfo" FROM users WHERE id = $1`, [id]);
 * const merged = { ...(row?.businessInfo || {}), ...patch };
 * await q(`UPDATE users SET "businessInfo" = $1 WHERE id = $2`, [JSON.stringify(merged), id]);
 * ```
 *
 * read → 병합 → **전체 재저장** 이므로 두 가지 손실이 생긴다.
 *
 *   1. **lost update** — SELECT 와 UPDATE 사이에 다른 경로가 commit 한 키가 통째로 덮인다.
 *      (같은 transaction 안이어도 READ COMMITTED 에서 SELECT 는 잠그지 않는다.)
 *   2. **중첩 형제 키 손실** — `metadata` / `storeAddress` 같은 중첩 객체를 통째로 새로
 *      만들어 넣으면, 이번 요청이 모르는 하위 키가 사라진다.
 *      (실측: `metadata.pharmacy_phone` 은 KPA 운영자 경로가, `metadata.workplace` 는
 *       KPA 마이페이지 경로가 각각 쓴다 — 서로를 모른다.)
 *
 * 이 모듈은 **PostgreSQL 이 단일 statement 안에서 현재 값을 읽어 부분 병합**하도록
 * 표현식을 만들어 준다. 애플리케이션이 읽어 온 스냅샷을 되쓰지 않으므로 위 두 손실이 없다.
 *
 * ## 컬럼 타입 주의 (실측 2026-08-12, 프로덕션 `o4o_platform`)
 *
 * `users."businessInfo"` 의 실제 타입은 **`json`** 이다 (`jsonb` 아님).
 * `information_schema.columns` → `data_type = json`, entity 선언도 `@Column({ type: 'json' })`.
 *
 * 따라서 저장소 곳곳에 있는 아래 패턴은 **런타임에 실패한다.**
 *
 * ```sql
 * -- ERROR: COALESCE could not convert type jsonb to json
 * SET "businessInfo" = COALESCE("businessInfo", '{}'::jsonb) || $2::jsonb
 * ```
 *
 * 그래서 이 모듈은
 *   - 읽을 때 `"businessInfo"::jsonb` 로 **명시 캐스트**하고,
 *   - 마지막에 `::json` 으로 **되돌려** 컬럼 타입에 맞춘다.
 *
 * ## 안전 규칙
 *
 *   - `businessInfo` 가 NULL 이거나 객체가 아니면(스칼라·배열) `{}` 로 간주한다.
 *     (`jsonb` 의 `||` 는 객체와 스칼라를 이어붙일 수 없어 그냥 두면 에러가 된다.)
 *   - 중첩 키도 같은 방식으로 방어한다.
 *   - 키 이름은 식별자 화이트리스트로 검증한다 (경로 리터럴을 SQL 에 넣기 때문).
 *   - 값은 전부 **파라미터 바인딩**이다. 문자열 보간 없음 (CLAUDE.md §7 Guard Rule 2).
 *   - **키 삭제는 하지 않는다.** 이 모듈은 추가·덮어쓰기만 한다. `null` 을 넣으면
 *     `null` 이 저장되며(키 제거 아님) 기존 계약과 동일하다.
 */

/** 부분 갱신 대상 컬럼 — 현재 사용처는 `users."businessInfo"` 하나뿐이다. */
const COLUMN = '"businessInfo"';

/** SQL 경로 리터럴에 들어가는 키 이름 화이트리스트. */
const SAFE_KEY = /^[A-Za-z0-9_]+$/;

export interface BusinessInfoPatch {
  /** 최상위 키 patch — 이번 요청이 **명시적으로 수정하는 키만** 담는다. */
  root?: Record<string, unknown>;
  /**
   * 중첩 객체 patch — `{ metadata: { pharmacy_phone: '02-...' } }` 형태.
   * 해당 중첩 객체의 **명시된 하위 키만** 갱신하고 형제 키는 보존한다.
   */
  nested?: Record<string, Record<string, unknown>>;
}

export interface BusinessInfoUpdateFragment {
  /** `UPDATE users SET "businessInfo" = <expression>` 에 그대로 넣는 SQL 조각. */
  expression: string;
  /** `expression` 이 참조하는 파라미터 값 (startIndex 부터 순서대로). */
  params: string[];
  /** 이 조각이 소비한 다음의 파라미터 인덱스. */
  nextIndex: number;
}

/** 현재 저장된 값을 "객체이면 그대로, 아니면 빈 객체" 로 읽는 표현식. */
function objectOrEmpty(path: string): string {
  return `CASE WHEN jsonb_typeof(${path}) = 'object' THEN ${path} ELSE '{}'::jsonb END`;
}

function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key)) {
    throw new Error(`[businessInfoWrite] unsafe businessInfo key: ${key}`);
  }
}

/**
 * 부분 갱신 표현식을 만든다. 실제로 바꿀 것이 없으면 `null` 을 반환한다
 * (호출부는 이때 `businessInfo` write 자체를 생략해야 한다).
 *
 * @param startIndex 이 조각이 사용할 첫 파라미터 번호 (`$n` 의 n).
 */
export function buildBusinessInfoUpdate(
  patch: BusinessInfoPatch,
  startIndex: number,
): BusinessInfoUpdateFragment | null {
  const root = patch.root ?? {};
  const nestedEntries = Object.entries(patch.nested ?? {})
    // 하위 키가 하나도 없는 중첩 patch 는 write 대상이 아니다 (빈 객체로 덮어쓰지 않는다).
    .filter(([, value]) => value && Object.keys(value).length > 0);

  const rootKeys = Object.keys(root);
  if (rootKeys.length === 0 && nestedEntries.length === 0) return null;

  for (const key of rootKeys) assertSafeKey(key);
  for (const [key] of nestedEntries) {
    assertSafeKey(key);
    // 같은 키를 root(전체 교체)와 nested(부분 병합) 양쪽에 넣으면 의도가 모호해진다.
    // 호출부의 실수이므로 조용히 넘기지 않는다.
    if (key in root) {
      throw new Error(`[businessInfoWrite] key present in both root and nested: ${key}`);
    }
  }

  const params: string[] = [];
  let idx = startIndex;

  // 1) 최상위 부분 병합 — 기존 키는 보존되고 patch 키만 덮인다.
  let expression = objectOrEmpty(`${COLUMN}::jsonb`);
  if (rootKeys.length > 0) {
    expression = `(${expression} || $${idx}::jsonb)`;
    params.push(JSON.stringify(root));
    idx += 1;
  }

  // 2) 중첩 부분 병합 — 형제 하위 키를 보존한 채 명시된 하위 키만 덮는다.
  //    중첩 현재값은 (1)의 결과가 아니라 **컬럼 원본**에서 읽는다.
  //    UPDATE 의 SET 표현식은 모두 갱신 전 row 를 보므로 동일하며,
  //    root/nested 키 중복은 위에서 이미 막았다.
  for (const [key, value] of nestedEntries) {
    const current = objectOrEmpty(`${COLUMN}::jsonb -> '${key}'`);
    expression = `jsonb_set(${expression}, '{${key}}', ${current} || $${idx}::jsonb, true)`;
    params.push(JSON.stringify(value));
    idx += 1;
  }

  // 3) 컬럼 타입(json)에 맞춰 되돌린다 — 위 상단 "컬럼 타입 주의" 참조.
  return { expression: `(${expression})::json`, params, nextIndex: idx };
}

/**
 * 단독 `UPDATE users SET "businessInfo" = ... WHERE id = ...` 문을 만든다.
 * 다른 컬럼과 함께 갱신해야 하면 `buildBusinessInfoUpdate` 를 직접 써서
 * 하나의 UPDATE 에 합친다 (statement 가 하나면 원자성이 보장된다).
 */
export function buildBusinessInfoUpdateStatement(
  patch: BusinessInfoPatch,
  userId: string,
): { sql: string; params: unknown[] } | null {
  const fragment = buildBusinessInfoUpdate(patch, 1);
  if (!fragment) return null;

  return {
    sql: `UPDATE users
             SET "businessInfo" = ${fragment.expression},
                 "updatedAt" = NOW()
           WHERE id = $${fragment.nextIndex}`,
    params: [...fragment.params, userId],
  };
}

/**
 * DB 가 수행할 부분 병합을 **메모리 상에서 동일하게** 재현한다.
 * 같은 요청 안에서 갱신 결과를 곧바로 참조해야 하는 호출부(예: 주소 합성)를 위한 것이며,
 * 저장 자체는 언제나 위 SQL 표현식이 담당한다.
 */
export function applyBusinessInfoPatch(
  current: unknown,
  patch: BusinessInfoPatch,
): Record<string, any> {
  const base: Record<string, any> = (current && typeof current === 'object' && !Array.isArray(current))
    ? { ...(current as Record<string, any>) }
    : {};

  Object.assign(base, patch.root ?? {});

  for (const [key, value] of Object.entries(patch.nested ?? {})) {
    if (!value || Object.keys(value).length === 0) continue;
    const currentNested = base[key];
    const nestedBase: Record<string, any> = (currentNested && typeof currentNested === 'object' && !Array.isArray(currentNested))
      ? { ...currentNested }
      : {};
    base[key] = { ...nestedBase, ...value };
  }

  return base;
}
