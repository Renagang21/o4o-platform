# CHECK-O4O-USERS-TIMESTAMP-DUAL-COLUMN-CANONICALIZATION-V1

> **WO**: `WO-O4O-USERS-TIMESTAMP-DUAL-COLUMN-CANONICALIZATION-V1`
> **기준 commit**: `fa0962cf7` (origin/main)
> **작업공간**: `/c/tmp/o4o-users-timestamp` (별도 worktree · `work/users-timestamp-canonicalization`)
> **수행일**: 2026-08-18
> **선행 WO**: `WO-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1` (계정 상태 오귀속 마감) — 그 오귀속의 배경이 된 이중 timestamp 구조를 닫는 기술부채 작업

---

## A. 실제 users timestamp schema (production, read-only)

`information_schema.columns` (2026-08-18):

| column | type | nullable | default |
|---|---|:---:|---|
| `createdAt` | timestamp | YES | `CURRENT_TIMESTAMP` |
| `created_at` | timestamp | NO | `CURRENT_TIMESTAMP` |
| `updatedAt` | timestamp | YES | `CURRENT_TIMESTAMP` |
| `updated_at` | timestamp | NO | `CURRENT_TIMESTAMP` |

users 전체 컬럼 40개 = camelCase 14 + snake_case 15 + 기타.

### 발생 원인

1. `1700000000000-CreateUsersTable` 이 **snake_case** 로 `created_at` / `updated_at` 을 만들었다.
2. `User` entity(`src/modules/auth/entities/User.ts`)는 `@CreateDateColumn() createdAt` / `@UpdateDateColumn() updatedAt` 이고,
   `database/connection.ts:91` 에서 **`SnakeNamingStrategy` 가 주석 처리**되어 있다 → TypeORM 이 기대하는 컬럼명은 `"createdAt"` / `"updatedAt"`.
3. camelCase 두 컬럼을 users 에 추가하는 **migration 은 저장소에 존재하지 않는다** (`ALTER TABLE users ADD ... "createdAt"` 전수 0건).
   즉 과거 `synchronize` 실행 시점에 entity 기준으로 생성된 것이며, snake 컬럼은 그대로 남았다.
4. 이후 runtime 은 entity/raw SQL 모두 camelCase 를 갱신했고, snake 컬럼은 **INSERT DEFAULT 값에서 정지**했다.

---

## B. Production 분포 census (read-only · users 53행 전수)

```text
users 전체: 53

updated_at NULL   : 0
"updatedAt" NULL  : 0
created_at NULL   : 0
"createdAt" NULL  : 0

updated_at = "updatedAt"        : 1
updated_at ≠ "updatedAt"        : 52
updated_at 이 더 최근            : 0      ← legacy 가 최신인 행이 하나도 없다
"updatedAt" 이 더 최근           : 52

created_at = "createdAt"        : 53
created_at ≠ "createdAt"        : 0

updated_at = created_at         : 53 / 53  ← 결정적 근거
updated_at ≠ created_at         : 0

MIN/MAX(updated_at)  : 2026-05-14 06:11:12 / 2026-08-14 12:52:50
MIN/MAX("updatedAt") : 2026-05-22 03:24:13 / 2026-08-18 01:25:23
MIN/MAX(created_at)  : 2026-05-14 06:11:12 / 2026-08-14 12:52:50
```

**해석**

- `updated_at` 은 **모든 행에서 `created_at` 과 같다**. 생성 이후 단 한 번도 갱신된 적이 없다.
  → legacy 컬럼은 `created_at` 이 이미 갖고 있는 정보 외에 아무것도 보유하지 않는다. (§5 데이터 보존 판정: **stale legacy · 폐기 가능**)
- 유일하게 두 값이 같은 1행은 2026-08-14 생성 후 한 번도 수정되지 않은 계정이다 (예외가 아니라 같은 규칙의 결과).
- `"updatedAt"` 의 MAX 는 census 당일(2026-08-18)이다 → **살아 있는 컬럼은 camelCase 쪽**.
- `created_at` 은 drift 0/53 이다. 같은 naming drift 지만 **stale 위험이 없다**.

---

## C. read/write 소비처 census (미조사 0)

users 테이블을 참조하는 SQL 전수 스캔 후, 별칭 한정 참조(`u.`) 와 **테이블이 users 하나뿐인 문장**의 비한정 참조만 남겨 판정했다.
users 를 JOIN 하는 문장의 비한정 `created_at` / `updated_at` 은 상대 테이블 컬럼이다 (둘 다 존재하면 Postgres 가 ambiguous 오류를 내므로 구조적으로 확정된다).
저장소 전역에서 **users 별칭은 `u` 하나뿐**임을 별도 확인했다 (`FROM/JOIN users <alias>` 전수 132건 모두 `u`).

### C-1. ENTITY_WRITE — canonical

| 위치 | 내용 |
|---|---|
| `src/modules/auth/entities/User.ts:131-135` | `@CreateDateColumn() createdAt` / `@UpdateDateColumn() updatedAt` — TypeORM 런타임의 실제 갱신 기준 |
| `src/entities/User.ts` | 위 entity 의 re-export (back-compat) |

### C-2. RAW_SQL_WRITE — canonical `"updatedAt"` (수정 불필요)

`UPDATE users ... "updatedAt" = NOW()` 을 쓰는 경로 전수:

| 파일 | line |
|---|---|
| `controllers/operator/MembershipConsoleController.ts` | 736 · 912 · 1200/1203 |
| `controllers/pharmacy-hub/PharmacyHubAccountController.ts` | 168 |
| `modules/neture/services/operator-registration.service.ts` | 130 |
| `routes/kpa/controllers/member.controller.ts` | 1262 · 1273 · 1731 |
| `services/approval/MembershipApprovalService.ts` | 331 · 841 · 1279 · 1294 · 1304 |
| `utils/business-info-write.ts` | 146 · 158 |

### C-3. RAW_SQL_WRITE — legacy `updated_at` (**결함 1건 · 수정함**)

| 파일 | line | 판정 |
|---|---|---|
| `scripts/migrate-member-to-user-fields.ts` | 119 | `UPDATE users SET ..., updated_at = NOW()` — **stale 컬럼에 write**. `package.json` 의 `migration:member-dedup` / `:verify` 로 등록된 **살아 있는 스크립트**다. 실행 시 users.name/phone 은 바뀌는데 canonical `"updatedAt"` 은 움직이지 않아 "마지막 갱신 시각" 이 어긋난다 → `"updatedAt"` 으로 교정 |

### C-4. READ / SORT / FILTER

| 분류 | 위치 | 판정 |
|---|---|---|
| READ (legacy) | `routes/kpa/controllers/qualification.controller.ts:227` | `u.created_at AS user_created_at` — 유일한 별칭 한정 legacy read. 값 자체는 `"createdAt"` 과 동일해 오답은 아니지만 legacy 참조다 → `u."createdAt"` 으로 교정 |
| READ (canonical) | `MembershipConsoleController.ts:332 · 468`, `StoreConsoleController`, `signage-public.routes.ts`, `forum-query.service.ts` 외 | `u."createdAt"` / `u."updatedAt"` — canonical |
| SORT | `MembershipConsoleController.ts:311-318` `validSortFields` | `createdAt → u."createdAt"`, `updatedAt → u."updatedAt"`, 기본값도 canonical → **stale legacy 정렬 0** |
| FILTER | users 시각 컬럼 기반 WHERE 절 | 전수 0건 |
| API_RESPONSE | `MembershipConsoleController` 응답, `User.toJSON()` (`entities/User.ts:351-352`) | 필드명 `createdAt` / `updatedAt` — **계약 유지, 변경 없음** |
| SELECT * | `routes/debug/user-debug.controller.ts:120` | 컬럼 목록을 고정하지 않는 디버그 덤프. 컬럼 제거 시 항목이 하나 줄 뿐 계약 영향 없음 |
| SCRIPT (DEAD) | `scripts/p0-add-service-key.sql` · `scripts/p0-check-user-status.sql` | 2026-02 일회성 배포 스크립트. `created_at` 을 읽지만 **이미 존재하지 않는 `approved_at` / `approved_by` 를 참조**하고 status 를 대문자(`'PENDING'`/`'ACTIVE'`)로 비교한다 (`20260317100000-NormalizeUserStatusCase` 이후 무효). 실행 불가능한 dead script → 이번 WO 에서 손대지 않고 별도 정리 부채로 기록 |
| SCRIPT (LIVE) | `scripts/reset/O4O-RESET-DRYRUN-V1.sql:34` | `created_at::date` 읽기. `created_at` 은 이번 범위에서 제거하지 않으므로 영향 없음 |
| MIGRATION | `1700000000000-CreateUsersTable.ts:33-34` (snake 생성) / `1770601460383` · `2026012100001` · `20260927100000` (INSERT — 모두 camelCase 명시, snake 는 DEFAULT 의존) | 이력 정본. 스캔 대상에서 제외 |
| TEST | `routes/kpa/controllers/__tests__/member.controller.writeAtomicity.test.ts:228` | D-1 회귀 — users write 가 `"updatedAt"` 을 쓰는지 이미 고정. (테스트 이름의 "존재하지 않는 updated_at" 이라는 표현은 당시 인식이며 실제로는 존재했다. 이번 migration 이후 사실과 일치하게 된다) |

---

## D. Canonical 판정

```text
CANONICAL_UPDATED_COLUMN = "updatedAt"
LEGACY_UPDATED_COLUMN    = updated_at
```

**증명**

1. entity 계약 — `@UpdateDateColumn() updatedAt` + naming strategy 미적용 → ORM write 는 `"updatedAt"` 뿐이다.
2. raw SQL write 경로 15개 중 14개가 `"updatedAt"`, legacy write 는 dead 가 아닌 스크립트 1건뿐이었다.
3. production 분포 — legacy 가 더 최신인 행 **0**, legacy = created_at **53/53**.

### createdAt 계열 (§3 동일 원인 범위)

```text
CANONICAL_CREATED_COLUMN = "createdAt"
LEGACY_CREATED_COLUMN    = created_at   ← 이번 migration 범위에서 제외
```

- **runtime 코드는 canonical 로 통일**했다 (C-4 의 legacy read 1건 교정 → runtime dual-column 의존 0).
- 다만 **컬럼 제거는 이번 범위에서 제외**한다. 근거:
  - drift 0/53 — 두 값이 완전히 동일하고 stale 판정 위험이 없다. `updated_at` 과 **위험 성격이 다르다**.
  - `scripts/reset/O4O-RESET-DRYRUN-V1.sql` 등 운영 dry-run 스크립트가 `created_at` 을 읽는다.
  - 즉 제거해도 얻는 정합성 이득이 없고 운영 도구 리스크만 생긴다 → §4 "삭제가 필요하면" 요건 불충족.
- 후속 제안: `created_at` 제거는 운영 스크립트 canonical 정리와 묶어 별도 WO 로 다룬다.

---

## E. 수정 내역

| # | 파일 | 변경 | 분류 |
|---|---|---|---|
| 1 | `apps/api-server/src/scripts/migrate-member-to-user-fields.ts:119` | `updated_at = NOW()` → `"updatedAt" = NOW()` | RAW_SQL_WRITE 교정 |
| 2 | `apps/api-server/src/routes/kpa/controllers/qualification.controller.ts:227` | `u.created_at` → `u."createdAt"` | READ 교정 |
| 3 | `apps/api-server/src/database/migrations/20270310000000-DropUsersLegacyUpdatedAt.ts` | 신규 — `users.updated_at` DROP (+ down 복구) | MIGRATION |
| 4 | `apps/api-server/src/__tests__/users-timestamp-canonical.spec.ts` | 신규 — 저장소 전역 legacy 참조 재발 방지 (5 케이스) | TEST |

**하지 않은 것**: API field rename 없음 · entity 변경 없음 · naming strategy 변경 없음 · trigger/dual-write 도입 없음(§4 금지) · 운영 데이터 UPDATE 없음 · dead p0 스크립트 미수정.

### DROP 전 4단계 게이트 (§4)

1. **실제 소비처 0 확인** — 교정 후 runtime `.ts` 에서 `users.updated_at` 참조 0건 (§C, 회귀 테스트가 고정).
2. **값 보존 판정** — `updated_at = created_at` 53/53 → 고유 정보 0. backfill 불필요, `GREATEST()` 병합 없음(§5).
3. **up/down 설계** — up: `DROP COLUMN IF EXISTS`. down: 컬럼 재생성 + `"createdAt"` 으로 backfill (legacy 의미가 INSERT 시각이므로 삭제 직전 값을 정확히 복원).
4. **production 영향 예측** — 아래 의존 객체 조사 결과 **차단 요소 0**.

| 대상 | 결과 |
|---|---|
| index | users 인덱스 7개 — `updated_at` 사용 **0** |
| trigger | users 트리거 **0** |
| view | users 참조 view **0** |
| constraint | `updated_at` 참조 제약 **0** |
| RLS policy | **0** |
| `pg_depend` | `pg_attrdef` 1건(자기 DEFAULT) — 컬럼과 함께 자동 제거 |
| 런타임 INSERT | raw `INSERT INTO users` 는 migration 3건뿐이며 모두 camelCase 명시 → snake DEFAULT 의존, 제거해도 무영향 |

---

## F. 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` (api-server) | **EXIT 0 / 오류 0** |
| 신규 spec `users-timestamp-canonical.spec.ts` | 수정 전 **2 FAIL** (legacy write 1 + legacy read 1 정확히 지목) → 수정 후 **5/5 PASS** (재현 성립) |
| 전체 api-server Jest | **132 suites / 2099 tests PASS** |
| D-1 기존 회귀 (`member.controller.writeAtomicity`) | PASS (users write 가 `"updatedAt"` 사용) |
| user list sort/filter 회귀 | `MembershipConsoleController` 관련 spec 포함 전체 PASS |
| production | **read-only census 만 수행. schema/data write 0** |

### F-1. migration 실행 검증 — 미수행 (정직 기록)

- 로컬 Postgres 인스턴스가 없다(127.0.0.1:5432 connection refused). 프로덕션에 대한 수동 DDL 은 CLAUDE.md §0 상 사용자 승인 대상이며, 마이그레이션의 정본 적용 경로는 **main 배포 시 CI/CD 자동 실행**이다.
- 따라서 `up` 실적용 · 적용 후 schema 확인 · 대표 user update 후 canonical 갱신 확인 · `down` 실행은 **이번 세션에서 수행하지 않았다.**
- 대신 실행 전 확인 가능한 것을 전부 확인했다 — 의존 객체 0(위 표), `IF EXISTS` 로 멱등, down 의 backfill 이 삭제 직전 값과 일치함을 분포 census 로 증명.
- **배포 후 확인 필요**: 배포 리비전에서 `information_schema.columns` 로 `users.updated_at` 부재 확인 + 임의 계정 정보 수정 후 `"updatedAt"` 갱신 확인.

---

## G. 잔존 위험

1. **migration 실적용은 CI/CD 배포 시점에 처음 일어난다** (F-1). DDL 은 metadata-only DROP 이라 잠금 시간은 짧지만, 배포 직후 위 확인 절차를 권장한다.
2. **`created_at` 이중 컬럼은 남아 있다** (§D). 현재 drift 0 이라 무해하지만, 언젠가 raw SQL 이 `created_at` 을 직접 write 하면 같은 문제가 재발할 수 있다. 신규 회귀 테스트가 users 단독 문장·`u.` 한정 참조를 모두 막으므로 재발 경로는 좁다.
3. **dead p0 스크립트 2개** (`p0-add-service-key.sql` · `p0-check-user-status.sql`) 는 이미 존재하지 않는 컬럼을 참조한 채 남아 있다. 실행 불가라 위험은 낮지만 오해 소지가 있어 별도 정리 대상이다.
4. 저장소 밖(외부 BI · 수동 쿼리 등)에서 `users.updated_at` 을 읽는 소비처는 확인 범위 밖이다. 다만 그 값은 `created_at` 과 동일했으므로 대체 가능하다.

---

## H. 완료 기준 대조 (§8)

| 기준 | 결과 |
|---|---|
| timestamp 사용처 미조사 0 | ✅ users 참조 SQL 전수 스캔 · 별칭 전수 확인(`u` 유일) |
| canonical updated column 1개 확정 | ✅ `"updatedAt"` (근거 3종) |
| runtime dual-column 의존 0 | ✅ legacy write 1 · legacy read 1 교정 후 runtime `.ts` 참조 0 (테스트로 고정) |
| stale legacy read/sort/filter 0 | ✅ sort/filter 는 원래 canonical, stale read 1건 제거 |
| 데이터 손실 0 | ✅ 제거 대상 값 = `created_at` 과 53/53 동일. down 으로 정확 복원 |
| API `updatedAt` 계약 유지 | ✅ 응답 필드·entity 무변경 |
| typecheck / Jest PASS | ✅ tsc 0 · 132 suites / 2099 tests PASS |
| migration 필요 여부 명확 | ✅ `updated_at` 제거 = 필요(migration 작성) / `created_at` 제거 = 불필요(근거 명시) |

---

## I. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```

- 발견 1건: `member.controller.writeAtomicity.test.ts` 의 "존재하지 않는 `updated_at`" 표현이 사실과 달랐다(컬럼은 존재했고 stale 이었다). 이번 migration 적용 후 표현이 사실과 일치하므로 문구는 그대로 둔다.
- 별도 WO 제안: (1) dead p0 배포 스크립트 정리, (2) `created_at` legacy 컬럼 제거 + 운영 스크립트 canonical 정리.
