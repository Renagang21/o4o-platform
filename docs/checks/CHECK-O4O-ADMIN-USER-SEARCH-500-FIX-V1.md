# CHECK-O4O-ADMIN-USER-SEARCH-500-FIX-V1

> WO: `WO-O4O-ADMIN-USER-SEARCH-500-FIX-V1`
> 작업일: 2026-07-31 · 브랜치: `main` · 작업 전 HEAD `1007337a0`

---

## 1. 500 재현 결과

| 요청 | 결과 |
|------|------|
| `GET /api/v1/admin/users` | ✅ 200 |
| `GET /api/v1/admin/users?limit=2` | ✅ 200 |
| `GET /api/v1/admin/users?search=test` | ❌ **500** `{"success":false,"error":"Failed to fetch users"}` |
| `GET /api/v1/admin/users?search=sohae21` | ❌ **500** (검색어 종류 무관) |
| `GET /api/v1/admin/users/:id` | ✅ 200 |

인증은 `renariver21@gmail.com` (`platform:super_admin`) 토큰 사용.

## 2. 정확한 원인

Cloud Run 로그 실측:

```
Error fetching users: syntax error at or near "."
```

실패 SQL (`query failed` 로그에서 추출):

```sql
WHERE ("user"."firstName" ILIKE $1 OR "user"."lastName" ILIKE $1
       OR "user"."email" ILIKE $1 OR user.company ILIKE $1)
ORDER BY "user"."createdAt" DESC LIMIT 20 OFFSET 0  -- PARAMETERS: ["%test%"]
```

- 수정 전 조건: `(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.company ILIKE :search)`
- `User` 엔티티에는 **`company` 속성이 없다** (`email`/`firstName`/`lastName`/`name`/`nickname`/`phone`/`businessInfo` 등만 존재).
- TypeORM 은 **매핑된 속성만** `"user"."x"` 로 치환한다. 매핑되지 않은 `user.company` 는 문자열 그대로 SQL 에 남는다.
- PostgreSQL 에서 `user` 는 **예약어**(niladic `USER` 함수)다. 따옴표 없는 `user.company` 는 컬럼 참조로 파싱되지 않아
  `column ... does not exist` 가 아니라 **`syntax error at or near "."`** 가 된다.

### 검색 없는 경로와의 차이

`search` 가 없으면 이 `where()` 자체가 호출되지 않는다. 그래서 목록·단건 조회는 정상이고
**검색어가 있을 때만 100% 실패**했다. `getManyAndCount()` 는 동일 QueryBuilder 를 쓰므로
count/목록 양쪽이 같은 이유로 실패한다(조건 불일치 문제는 아니었다).

## 3. 구현

`apps/api-server/src/controllers/admin/AdminUserController.ts`

```ts
export const ADMIN_USER_SEARCH_FIELDS = ['name','firstName','lastName','email','phone'] as const;
export function normalizeUserSearch(search: unknown): string { ... }   // trim, 비문자열 → ''
export function buildUserSearchWhere(alias: string): string { ... }    // :search 단일 바인딩
```

- **`company` 제거** (존재하지 않는 속성)
- **`name` 추가** — 한글 이름의 실제 저장 위치. `firstName`/`lastName` 은 nullable 이고 대부분 비어 있어
  이것 없이는 §5 의 "이름 검색" 계약이 성립하지 않는다.
- **`phone` 추가** — §5 검색 계약(이메일·이름·전화번호)
- **검색어 trim** + 공백만 입력 시 검색 없는 목록과 동일 분기
- 필드 목록을 상수로 분리하고 WHERE 절을 그로부터 생성 → 같은 유형의 회귀를 테스트로 차단

### 검색 대상 필드 / 방식

| 항목 | 값 |
|------|------|
| 대상 | `name`, `firstName`, `lastName`, `email`, `phone` |
| 방식 | `ILIKE '%term%'` (대소문자 무시 · 부분 일치) |
| 바인딩 | `:search` 단일 파라미터 (raw interpolation 0) |
| NULL | `NULL ILIKE ...` → NULL 평가 → 매칭 제외 (오류 아님) |
| 공백 | trim 후 빈 문자열이면 검색 미적용 |

> 검색 범위는 §5 가 명시한 최소 계약(이메일·이름·전화번호)까지만 확장했다.
> `nickname`·`businessInfo`(JSONB) 는 기존 계약에 없어 포함하지 않았다.
> 전화번호는 저장된 형식 그대로 부분 일치한다(하이픈 정규화는 별도 판단 사항).

## 4. 계약 보존

| 항목 | 상태 |
|------|------|
| 페이지네이션 (`page`/`limit`/`total`/`totalPages`) | 무변경 |
| 정렬 (`sortBy`/`sortOrder`, allowlist) | 무변경 |
| `status` 필터 | 무변경 |
| `role` 필터 (`role_assignments` EXISTS) | 무변경 |
| 응답 shape (`{ success, users, pagination }`, password 제거, roles 배치 조회) | 무변경 |
| 권한 가드 `ADMIN_ROLES = ['platform:admin','platform:super_admin']` | 무변경 |
| `GET /admin/users/:id` 단건 조회 | 무변경 |
| `DELETE /admin/users/:id` | 무변경 |

검색 없는 목록은 코드 경로 자체가 이전과 동일하다(분기 진입 조건만 `search` → `trim(search)` 로 정밀화).

> 본 파일은 `@core O4O_PLATFORM_CORE — Approval` (Freeze `WO-O4O-CORE-FREEZE-V1`) 이다.
> CLAUDE.md §14 "모든 Freeze 항목 공통: **버그 수정**·성능 개선·문서·테스트는 허용" 에 해당하며,
> 구조·스키마·계약 변경은 없다.

## 5. 데이터 변경

```
migration        0
신규 테이블      0
신규 컬럼        0
검색 인덱스      0
사용자 데이터 write 0
```

현재 `users` 총계는 40행 규모라 인덱스 없이 `ILIKE` 로 충분하다. 성능 목적의 인덱스는 별도 WO 로 분리한다.

## 6. 보안

| 항목 | 결과 |
|------|------|
| SQL injection | 차단 — 검색어는 `:search` 바인딩으로만 전달, 문자열 결합 0 |
| 특수문자 검색 | `'`, `%`, `;`, `--` 포함 입력도 바인딩되어 SQL 구조에 영향 없음 |
| 미인증 | 401 |
| 권한 없는 사용자 | 403 `ROLE_REQUIRED` |
| 민감 필드 | 응답 shape 무변경. `password` 는 기존대로 제거, token/credential 미노출 |

`phone` 은 **검색 조건**으로만 쓰이며 응답 필드는 기존과 동일하다(관리자 전용 엔드포인트).

## 7. 테스트

신규: `apps/api-server/src/controllers/admin/__tests__/admin-user-search.test.ts` — **10건 전부 통과**

DB 연결 없이 `getMetadataArgsStorage()` 로 엔티티 컬럼을 읽어 검증한다.

| 그룹 | 검증 |
|------|------|
| 검색 대상 필드 | 모든 필드가 User 실제 컬럼 · `company` 미참조 · 계약 필드(email/name/phone) 포함 |
| WHERE 절 | alias 한정 + OR 결합 · 바인딩 `:search` 단일 · 따옴표/`%` 미포함 · count·목록 동일 SSOT |
| 검색어 정규화 | trim · 공백만 → `''` · 비문자열(undefined/null/array/object) → `''` · 한글·특수문자 보존 |

```
Test Suites: 1 passed   Tests: 10 passed
```

## 8. 빌드 · 회귀

| 검사 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.build.json` (api-server) | ✅ 0 errors |
| `jest --testPathPattern=admin-user-search` | ✅ 10/10 |

프론트 변경 0. 관리자 UI(`UsersListClean.tsx`·`OperatorsPage.tsx`)는 `/admin/users` 를
`{ limit: 1000 }` 로만 호출하고 **`search` 파라미터를 보내지 않는다**(클라이언트 필터).
따라서 이번 수정이 admin frontend 동작을 바꾸지 않으며 targeted build 를 생략했다.

## 9. 배포 후 프로덕션 스모크

배포: `32628b03c` → Deploy API Server (Cloud Run) **success**.
인증 `renariver21@gmail.com`(`platform:super_admin`). 개인정보는 기록하지 않고 status·total·필드 정상 여부만 남긴다.

### 9-1. 권한

| 시나리오 | 결과 |
|---|---|
| 미인증 | ✅ 401 |
| 일반 사용자(비관리자) | ✅ 403 `ROLE_REQUIRED` |

### 9-2. 검색 (모두 **수정 전에는 500**)

| 검색 유형 | 결과 |
|---|---|
| 검색 없음 | ✅ 200 · total=40 |
| 이메일 전체 | ✅ 200 · total=1 |
| 이메일 일부 | ✅ 200 · total=1 |
| 이름 일부 (한글) | ✅ 200 · total=2 |
| 이름 전체 (한글) | ✅ 200 · total=2 |
| 전화번호 일부 | ✅ 200 · total=4 |
| 존재하지 않는 검색어 | ✅ 200 · **total=0** |
| 공백만 입력 | ✅ 200 · total=40 — **검색 없음(40)과 동일** |
| 특수문자 `%` | ✅ 200 (와일드카드로 해석되지 않고 리터럴 매칭) |
| 특수문자 `'` (`o'brien`) | ✅ 200 · total=0 — **SQL 오류 없음** |

응답 shape 정상: `total`/`page`/`limit`/`totalPages` + row 필드 `id`·`email`·`status`·`roles`·`role` 모두 존재.

### 9-3. 미완 회귀 항목 — 스모크 중 IP 차단 발생

`'; DROP TABLE users; --` 를 검색어로 보낸 **마지막 프로브**에서 400 `Invalid request` 가 반환되고
(SQL injection 탐지 미들웨어가 정상 동작), **그 시점부터 해당 출발지 IP 가 차단**되어 이후 요청이 전부
403 `Your IP address has been blocked due to suspicious activity` 가 되었다.

그래서 다음 회귀 항목은 **미실행**이다 (모두 이번 수정이 건드리지 않은 경로):

```
검색 + status/role 필터 조합
검색 없는 목록 페이지네이션(page=2)
status / role 단독 필터
단건 조회 GET /admin/users/:id
```

차단 메커니즘 (`SecurityAuditService`):

- `blockedIPs` 는 **TTL 없는 in-memory `Set`** 이다. `blockIP()` 로 추가되고 `unblockIP()` 로만 제거된다.
- `unblockIP` 를 노출하는 라우트는 없다 → API 로 자가 해제 불가.
- Cloud Run `minScale=1` 이라 유휴로 인한 인스턴스 소멸도 기대하기 어렵다.
- 즉 **새 리비전 배포(인스턴스 교체) 전까지 해당 IP 차단이 유지**된다.

> 재현 시 주의: 특수문자 검색 검증은 §10.1 이 요구한 범위(`%`, `'` 등)까지만 하고
> **실제 injection 문자열은 프로덕션에 보내지 않는다.**

## 9-A. 부수 발견 (본 WO 에서 수정하지 않음)

### A-1. 목록 응답에 `refreshTokenFamily` 노출

`getUsers` 는 `password` 만 제거하고 나머지 엔티티 필드를 그대로 반환한다.
그 결과 `refreshTokenFamily`(refresh token 회전용 식별자)가 관리자 목록·단건 응답에 포함된다.

- §8 "비밀번호 hash · token · credential 노출 없음" 검증 항목이 **실패**한다.
- 다만 §6-B 가 **응답 shape 무변경**을 요구하므로 이번 WO 에서 필드를 제거하지 않았다.
- 수정 전부터 존재한 동작이며 `platform:admin` 이상 전용 엔드포인트라 즉시 위험은 낮다.
- 별도 WO 로 `password` 와 동일하게 제외 대상에 추가할 것을 권고한다.

### A-2. IP 차단이 영구적이고 해제 수단이 없음

§9-3 참조. 오탐 1회로 정상 사용자가 무기한 차단될 수 있고 운영자가 해제할 방법이 없다.
TTL 또는 관리자 해제 엔드포인트가 필요하다 — 별도 WO 권고.

## 10. 미실행 항목과 사유

| 항목 | 사유 |
|------|------|
| 검색+필터 조합 · 페이지네이션 · 단건 조회 회귀 | 스모크 중 IP 차단(§9-3)으로 미실행. 모두 이번 수정이 건드리지 않은 경로이며, 차단 해제(새 리비전 배포) 후 재실행 필요 |
| admin frontend build | 프론트 변경 0 · `search` 미사용 확인 (§8) |
| 전화번호 하이픈 정규화 검색 | §5 "근거 없이 검색 범위를 확대하지 않는다" — 저장 형식 그대로 부분 일치. 필요 시 별도 WO |
| 검색 인덱스 | §7 데이터 변경 0 원칙 · 현재 규모에서 불필요 |
