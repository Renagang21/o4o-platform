# CHECK-O4O-CHANNEL-CODE-DATABASE-UNIQUENESS-INTEGRITY-V1

- WO: `WO-O4O-CHANNEL-CODE-DATABASE-UNIQUENESS-INTEGRITY-V1`
- 기준 commit(base): `f8c9aedfc` (origin/main)
- 결과 commit: `9cc838ff0`
- worktree: `C:\tmp\o4o-integration` (branch `work/channel-code-database-uniqueness-integrity-v1`)
- 작성일: 2026-08-26

---

## 1. 문제

`channels.code` 는 signage player 의 **익명 단건 주소**다
(`GET /api/v1/channels/code/:code`, WO-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1).
그런데 유일성이 application 사전 검사 하나에만 걸려 있었다:

```text
POST /channels : findOne({ code }) → 있으면 409 DUPLICATE_CODE → 없으면 INSERT
```

검사와 INSERT 가 같은 트랜잭션이 아니므로 두 동시 요청이 **모두** 검사를 통과할 수 있다.
그러면 같은 code 가 두 행이 되고, 디바이스 주소가 모호해진다.

---

## 2. 유일성 범위 판정 (§8) — **A. UNIQUE(code) 전역**

최신 코드로 재확인한 근거:

| 근거 | 내용 |
|---|---|
| `POST /channels` | `findOne({ where: { code } })` — serviceKey 를 조건에 넣지 않는다 |
| `PUT /channels/:id` | 동일. serviceKey 무관 |
| player | serviceKey 없이 `code` 만으로 채널을 주소지정한다 |

→ 실제 제품 계약은 `UNIQUE(serviceKey, code)` 가 **아니다**. serviceKey 컬럼이 있다는 사실만으로
service-scoped 로 바꾸지 않았다(§8 마지막 문장).

---

## 3. Case sensitivity (§9) / Trim (§10) / NULL (§11)

| 항목 | 현재 계약 | 이번 WO |
|---|---|---|
| 대소문자 | `ABC` != `abc` (Postgres 기본 collation, application 정규화 없음) | 유지. `lower(code)` / citext 도입 안 함 |
| 공백 | `abc` != ` abc ` (create/update 어디에도 trim 없음) | 유지. 정규화 안 함 |
| NULL | `code` nullable — 코드 없는 채널 허용 | nullable 유지. NOT NULL 로 바꾸지 않음 |

Postgres NULL semantics: 유니크 인덱스는 NULL 을 서로 다른 값으로 취급하므로 code 가 NULL 인 행은
여러 개 존재할 수 있다. 여기서는 기존 조회 인덱스와 같은 형태로 `WHERE code IS NOT NULL`
**부분** 유니크 인덱스를 써서 그 의도를 명시했다(실 DB 로 검증 — §7 표의 NULL 항목).

---

## 4. `code` 컬럼 schema census (§5)

| 항목 | 값 |
|---|---|
| entity | `packages/cms-core/src/entities/Channel.entity.ts` — `@Column({ type: 'varchar', length: 50, nullable: true })`, `@Index()` |
| migration | `1736600000000-CreateChannelsTable` — `code VARCHAR(50)`, default 없음, `CREATE INDEX idx_channels_code ON channels (code) WHERE code IS NOT NULL` |
| unique constraint | **없었음** |
| collation | 지정 없음 → DB 기본 (case-sensitive) |
| synchronize | `false` (connection.ts, migration-config.ts 양쪽) |

판정: **SCHEMA_MATCH** (type/length/nullable/index 모두 일치).
단 이 테이블은 인덱스 *이름* 을 entity decorator 로 표현하지 않는다(모든 인덱스가 migration 에서
명시 이름으로 생성된다). 즉 decorator 는 표시용이고 인덱스 정본은 migration 이다 — 기존부터
그런 구조이며 이번 WO 도 그 관례를 따랐다. 엔티티에는 그 사실과 새 유니크 인덱스를 주석으로 명시했다.

---

## 5. Write 경로 전수 census (§6)

`Channel` 저장은 3곳뿐이다(`getRepository(Channel)` 15개 중 write 는 3개).

| 경로 | code 취급 | 중복 검사 | transaction | 자기 row 제외 |
|---|---|---|---|---|
| `POST /channels` (requireAdmin) | `code \|\| null` | `if (code)` → `findOne({ code })` → 409 | **없음** | 해당 없음 |
| `PUT /channels/:id` (requireAdmin) | `channel.code = code` | `code !== undefined && code !== channel.code` 일 때만 `findOne({ code })` → 409 | **없음** | 값 비교로 제외 (같은 code 면 조회 자체를 안 함) |
| `PATCH /channels/:id/status` (requireAdmin) | 건드리지 않음 | — | — | — |

- `DELETE /channels/:id` 는 code 를 만들지 않는다.
- `admin/channel-ops`, `admin/channel-heartbeat`, `admin/ops-metrics` 는 Channel 을 **읽기만** 한다.
- case-sensitive, trim 없음(위 §3과 동일).
- 미조사 0.

기존 결함 1건(이번 WO 범위 밖, §12 잔존 부채로 기록):
`POST` 는 `code: ''` 를 `null` 로 저장하지만 `PUT` 은 빈 문자열을 그대로 저장한다. 빈 문자열도
유니크 인덱스의 대상이므로 두 번째 빈 문자열은 이제 409 가 된다. 정규화는 trim/format 정책
변경이라 §32 범위 밖이다.

---

## 6. Race condition 재현 (§7)

**실 Postgres 15.17**(docker `postgres:15`, production 과 동일 메이저)에서 실증했다.
production 이 아니라 throwaway DB 다.

애플리케이션 로직을 그대로 흉내낸 시나리오 — 두 요청이 사전 검사를 모두 통과한 뒤 INSERT:

```text
유니크 인덱스 없음 → created 2건, channels 안의 해당 code = 2행   ← 중복 생성 실증
유니크 인덱스 있음 → created 1건, 23505/UQ_channels_code 1건, 1행
```

즉 사전 검사만으로는 막히지 않는다는 것이 실측으로 확인되었다.

---

## 7. 검증 결과 (§15 §19 §20 §29)

신규 spec `apps/api-server/src/__tests__/channels-code-unique-integrity.spec.ts` — **28/28 PASS**
(그중 10건은 실 Postgres 통합 검증, `CHANNELS_UQ_PG_URL` 이 주어질 때만 등록된다).

| # | 검증 | 결과 |
|---|---|---|
| 1 | 해당 인덱스의 23505 만 중복으로 인식(driverError 포함) | PASS |
| 2 | 다른 unique constraint / 다른 SQLSTATE 는 변환하지 않음 | PASS |
| 3 | 사전 검사 409 유지(KEEP_PRECHECK), 검사 조건은 `{ code }` 뿐 | PASS |
| 4 | 경쟁 상태 DB 위반 → 409 DUPLICATE_CODE | PASS |
| 5 | 응답에 `duplicate key value` / `23505` / 인덱스명 / `Key (code)` 미노출 | PASS |
| 6 | 다른 제약의 23505 → 500 INTERNAL_ERROR (409 로 둔갑 안 함), 원문 미노출 | PASS |
| 7 | code 없는 생성은 중복 검사 안 함 | PASS |
| 8 | same-row code 재저장 update 정상 | PASS |
| 9 | other-row code 로 update → 409 | PASS |
| 10 | exact lookup 은 여전히 `order: createdAt ASC` 유지(§21 — 즉시 제거 안 함) | PASS |
| 11 | migration static contract: unique index / 부분 조건 / 중복 시 throw / DELETE·UPDATE·TRUNCATE 없음 / SET NOT NULL 없음 / lower(code)·citext 없음 | PASS |
| **실 DB** | 12 index 없는 경쟁 → 2행 (§7) | PASS |
| **실 DB** | 13 중복 있으면 `runMigrations()` 실패 + 중복 행 그대로 + 인덱스 미생성 (§24) | PASS |
| **실 DB** | 14 정리 후 up → `UQ_channels_code` 존재, `indexdef` 에 `CREATE UNIQUE INDEX` + `WHERE (code IS NOT NULL)`, `idx_channels_code` 대체됨 (§15) | PASS |
| **실 DB** | 15 동시 동일 code → 1 성공 / 1 위반(23505, constraint=UQ_channels_code) / **row 1개** (§20 핵심 증거) | PASS |
| **실 DB** | 16 NULL code 다중 행 허용 (§11) | PASS |
| **실 DB** | 17 `CASE-ABC` / `case-abc` 둘 다 삽입 가능 (§9) | PASS |
| **실 DB** | 18 `TRIM-X` / ` TRIM-X ` 둘 다 삽입 가능 (§10) | PASS |
| **실 DB** | 19 same-row UPDATE 정상 / other-row UPDATE 는 DB 가 23505 (§19) | PASS |
| **실 DB** | 20 `undoLastMigration()` → 유니크 제거 + `idx_channels_code` 복원 (§15) | PASS |

전체 검증:

| 대상 | 명령 | 결과 |
|---|---|---|
| api-server 타입 | `tsc --noEmit` | PASS |
| api-server 테스트 | `jest` 전체 | 208 suite 중 207 PASS, **3474/3485 PASS, 10 skipped(위 실 DB 게이트), 1 실패** |
| packages/cms-core | `npm run build` | PASS |
| admin-dashboard | `npm run type-check` | PASS (코드 변경 없음 — §29) |

실패 1건은 이 WO 와 무관한 **로컬 환경 잔재**다: `ecommerce-core-and-commerce-residue-retirement.spec.ts`
의 "packages/ecommerce-core 디렉토리가 존재하지 않는다". `git ls-tree origin/main packages/ecommerce-core`
와 `git ls-files packages/ecommerce-core` 모두 비어 있고(= main 에서 이미 은퇴), 이 worktree 에
추적되지 않는 빌드 잔재(`dist/`, `node_modules/`)만 남아 있다 → `PRE_EXISTING_LOCAL_ENV_ARTIFACT`.
직전 WO 에서도 동일하게 관측된 건이며, 정리는 auto-mode 권한 정책으로 차단되어 수행하지 않았다.

---

## 8. Migration 설계 (§12 §13 §14)

`apps/api-server/src/database/migrations/20270319000000-AddChannelsCodeUniqueIndex.ts`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_channels_code"
  ON channels (code)
  WHERE code IS NOT NULL;

DROP INDEX IF EXISTS idx_channels_code;   -- 같은 컬럼/같은 조건의 비유니크 조회 인덱스 (완전 중복)
```

- **constraint vs index 판정(§13)**: 이 저장소의 관례는 `ALTER TABLE ... ADD CONSTRAINT` 가 아니라
  `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_..."` 다(UQ_kpa_organizations_slug, UQ_cafe24_connections_mall_shop,
  ux_role_assignments_user_role_active 등 12곳). 게다가 `code` 가 nullable 이고 기존 조회 인덱스가
  부분 인덱스였으므로 **부분 유니크 인덱스**만이 형태를 맞출 수 있다(부분 조건은 constraint 로 표현 불가).
  → unique index 채택.
- **적용 전 census 를 migration 안에 넣었다**: 총 행수/code 보유 행/NULL 행/중복 그룹 수를 로그로 남기고,
  중복이 있으면 `throw` 한다. 어떤 채널이 정본인지는 운영 판단이므로 자동 삭제/rename 을 하지 않는다(§24).
- **안전성(§14)**: `CREATE UNIQUE INDEX`(CONCURRENTLY 아님)는 해당 테이블에 `SHARE` 락을 잡아
  쓰기를 막지만 읽기는 막지 않는다. production `channels` 는 0행이므로 DDL 은 사실상 즉시 끝난다.
  이름 충돌 없음(`UQ_channels_code` 는 신규), 기존 인덱스와 정의 충돌 없음.
  rollback 은 `down()` 이 조회 인덱스를 먼저 복원한 뒤 유니크를 제거한다(조회 인덱스 공백 없음).
- migration 은 glob 으로 자동 수집된다(`migration-config.ts`) — 등록 파일 수정 불필요.
  `synchronize` 는 양쪽 DataSource 에서 `false` 다(§3).

---

## 9. DB violation → API 계약 (§16 §17 §18)

`apps/api-server/src/routes/channels/channels.routes.ts`

```ts
const CHANNEL_CODE_UNIQUE_INDEX = 'UQ_channels_code';

export function isChannelCodeDuplicateViolation(err: unknown): boolean {
  const code = e?.code ?? e?.driverError?.code;
  const constraint = e?.constraint ?? e?.driverError?.constraint;
  return code === '23505' && constraint === CHANNEL_CODE_UNIQUE_INDEX;
}
```

POST / PUT 의 catch 에서 이 판정이 참이면 `409 DUPLICATE_CODE`, 아니면 기존대로 500.

- **모든 23505 를 변환하지 않는다**(§17 금지). constraint 이름이 일치할 때만이다.
  이 방식은 저장소에 이미 있는 관례(`offer.service.ts: asOfferDuplicateViolation`)와 같은 형태다.
- TypeORM 이 driver 오류를 wrap 하므로 `err` 와 `err.driverError` 양쪽을 본다.
- **pre-check 판정(§18): `KEEP_PRECHECK`**. 사전 검사는 정상 경로에서 빠르고 명확한 409 를 주고,
  경쟁 상태의 최종 방어는 DB 가 한다. 중복 로직의 대규모 refactor 는 하지 않았다.

---

## 10. 회귀 (§21 §22 §23)

| 대상 | 상태 |
|---|---|
| exact code lookup | `order: { createdAt: 'ASC' }` **유지**. 유니크 인덱스로 모호성 자체는 사라졌지만 §21 대로 즉시 제거하지 않았다(테스트로 고정) |
| player (`signage-player-web`) | **코드 변경 0**. canonical endpoint / envelope unwrap / contents adapter / telemetry channelId 그대로 |
| channels auth | **변경 0**. enumeration=serviceKey 필수, platform admin cross-service, id/code 단건=익명, telemetry=의도된 익명 ingest |
| CMS slot linkage | **변경 0**. `['kpa-society','kpa']` alias 경로 그대로 (직전 WO 의 회귀 테스트가 계속 통과) |

---

## 11. 배포 / migration 적용 (§24 §25 §30)

- push: `9cc838ff0` → `origin/main`
- 파이프라인: `Deploy API Server (Cloud Run)` — 이미지 빌드 → `o4o-api-migrations` Cloud Run Job 실행 → API 배포
- **적용 전 최종 gate(§24)**: production 은 익명 read 로 확인 가능한 8개 serviceKey
  (`kpa`, `kpa-society`, `kpa-branch`, `k-cosmetics`, `cosmetics`, `glycopharm`, `neture`, `pharmacy-hub`)
  전부 `total: 0`, 인증 없는 전체 목록은 계약대로 400 이다.
  cross-service 전체 행수/중복 여부는 익명 API 로는 확인할 수 없고(platform admin 필요),
  production DB credential 접근은 이 환경의 권한 정책상 차단되어 있다.
  → 그래서 **census 를 migration 안에 넣었다**. 적용 시점에 실제 DB 에서 총 행수/NULL/중복 그룹을
  세어 로그로 남기고, 중복이 하나라도 있으면 인덱스를 만들지 않고 실패한다. 데이터는 건드리지 않는다.
- (배포/적용 결과는 §12)

---

## 12. Production 적용 결과 및 smoke (§25 §26 §31)

### 12.1 배포

| 항목 | 값 |
|---|---|
| `Deploy API Server (Cloud Run)` (run 32935999896) | **success** |
| serving image | `asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:9cc838ff0dfde705cc4f2fabe5be1eebb6a650af` |
| image tag == commit SHA | **YES** (`9cc838ff0dfde705cc4f2fabe5be1eebb6a650af`) |
| `Deploy Admin Dashboard`, `CodeQL` | success |
| `CI Pipeline`, `Deploy Web Services` | failure — 원인은 이 WO 와 무관 (§16) |

### 12.2 Migration 적용 + production census (§4 §24 §25 — 정본 증거)

마이그레이션은 API 컨테이너 부팅 시점에 실행됐다(`o4o-core-api`, 2026-08-26T06:07:33Z).
직후 실행된 `o4o-api-migrations` Job 은 `[X] 652 AddChannelsCodeUniqueIndex20270319000000`
= 이미 적용됨, `Migrations executed: 0`, `SUCCESS` 로 확인했다.

```text
2026-08-26T06:07:33.473Z  [AddChannelsCodeUniqueIndex] census: total=0 withCode=0 nullCode=0 duplicateCodeGroups=0
2026-08-26T06:07:33.491Z  [AddChannelsCodeUniqueIndex] done: indexes=UQ_channels_code
2026-08-26T06:07:58.222Z  [X] 652 AddChannelsCodeUniqueIndex20270319000000
2026-08-26T06:07:58.246Z  Migration completed successfully! (Migrations executed: 0)
```

이것이 요구된 **production duplicate census** 다. 실제 DB 에서 측정된 값:

| 항목 | 값 |
|---|---|
| `channels` 총 행수 | **0** |
| `code` 보유 행 | **0** |
| `code IS NULL` 행 | **0** |
| **중복 code 그룹** | **0** ← 중지 조건(§33) 해당 없음 |
| 적용 후 인덱스 | `UQ_channels_code` **존재**, `idx_channels_code` 제거됨 (`indexes=UQ_channels_code` 만 반환) |
| 데이터 변경 | **0행** (DDL 만) |

중복이 0 이었으므로 migration 의 duplicate gate 는 발동하지 않았고, 어떤 행도 삭제/rename 되지 않았다.

### 12.3 Production read-only smoke (§31)

`https://api.neture.co.kr` — 쓰기 0, fixture 0.

| # | 요청 | 기대 | 실제 | 결과 |
|---|---|---|---|---|
| 1 | `GET /api/v1/channels/health` | 200 | `200 {"status":"ok","service":"channels",...}` | PASS |
| 2 | `GET /api/v1/channels` (무인증, serviceKey 없음) | 기존 auth contract 유지 | `400 SERVICE_KEY_REQUIRED` | PASS |
| 3 | `GET /api/v1/channels/code/does-not-exist-9cc838ff0` | 404 | `404 NOT_FOUND "Channel not found"` | PASS |
| 4 | `GET /api/v1/channels?serviceKey=kpa` | 200 목록 | `200 {"success":true,"data":[],"pagination":{"total":0,...}}` | PASS |
| 5 | DB unique constraint 존재 | 존재 | `UQ_channels_code` (12.2) | PASS |
| 6 | duplicate rows | 0 | 0 (12.2) | PASS |

serviceKey 8개 전수 재확인(적용 후): `kpa`, `kpa-society`, `kpa-branch`, `k-cosmetics`,
`cosmetics`, `glycopharm`, `neture`, `pharmacy-hub` — 모두 `total: 0`.

`channels` 가 0행이라 409 의 production 실행 경로는 여기서 관측할 수 없다(§31 이 허용한 상태).
409/23505 매핑은 실 Postgres 통합 테스트로 증명했다(§7 #15) → `SMOKE_409_NOT_OBSERVABLE_NO_PRODUCTION_CHANNEL_ROW`.

---

## 13. Production write 원칙 (§26)

unique constraint 검증을 위해 production 에 채널을 만들지 않았다.
production 에서는 schema/index 확인(migration job 로그)과 read API 만 사용했다.
duplicate 409 의 실제 write 검증은 throwaway Postgres 통합 테스트로 수행했다(§6 §7).

- production row 삭제/변경 0
- production fixture 생성 0
- schema 변경 = 인덱스 1개 추가 + 완전히 중복인 인덱스 1개 대체 (데이터 변경 0행)

---

## 14. 잔존 부채 / 범위 밖 (§32)

- `PUT` 이 `code: ''` 를 빈 문자열로 저장하는 비대칭(POST 는 null). 유니크 인덱스 아래에서는
  두 번째 빈 문자열이 409 가 된다. 정규화는 trim/format 정책 변경이라 범위 밖.
- case-insensitive code 정책, code format/regex, device credential 체계,
  signage-player-web 배포, channels organization authorization, legacy KPA CMS migration — 모두 범위 밖.
- 단건 조회는 여전히 "code/UUID 를 아는 것 = 신뢰" 다(device credential 부재).

## 15. UNKNOWN

없음 (0건).

---

## 16. CI 실패 귀속 (이 WO 와 무관)

`9cc838ff0` 에서 실패한 두 워크플로는 **동일한 단일 원인**이며 이 WO 의 변경과 무관하다.

| 워크플로 | 실패 지점 | 원인 |
|---|---|---|
| `CI Pipeline` → Code Quality Check | `src/pages/store-management/b2b-order/B2BOrderPage.tsx(467,17): error TS1109: Expression expected` | 아래 동일 |
| `Deploy Web Services (Cloud Run)` → deploy-glycopharm | `vite:esbuild ... B2BOrderPage.tsx:467:17: ERROR: Expected identifier but found "/"` | 아래 동일 |

원인: `services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx:466` 의
JSX 주석이 닫히지 않았다 — 줄이 `*/` 로 끝나고 `}` 가 없다(`*/}` 이어야 한다).
도입 커밋은 **`2bb1a3e65 feat(b2b): 공급자→매장 B2B 주문 canonical contract 확정 및 결함 4건 수정`**
(다른 세션). 해당 커밋의 Web Services 배포도 이미 실패했다(2026-08-26T03:34Z).

- `CI Pipeline` 은 `9cc838ff0` 뿐 아니라 `f8c9aedfc`, `20cb1d6c8`, `cc0f28709`, `f6b35153e` …
  모든 선행 커밋에서 실패한다 → **PRE_EXISTING**.
- `Deploy Web Services` 는 `f8c9aedfc` 에서 "success" 였지만 그 실행의 `deploy-glycopharm` 은
  **skipped** 였다(detect-changes 가 glycopharm 변경 없음으로 판정). 즉 그 success 는 공허하다.
  이번 커밋은 `packages/cms-core` 를 건드렸으므로 detect-changes 가 전 서비스를 재빌드했고,
  그 결과 기존에 깨져 있던 glycopharm 빌드가 드러났다. 새로 깨뜨린 것이 아니다.
- `Deploy Admin Dashboard`, `CodeQL` 은 success.

### 16.1 후속 조치 (별건 커밋 `9c2e8970c`)

이 WO 의 변경이 아니지만 main 의 CI 와 glycopharm production 배포를 계속 막고 있었으므로,
사용자 지시에 따라 **별개 커밋**으로 분리해 종료 문자 `}` 하나만 추가했다.

- 채널 유일성 커밋(`9cc838ff0`)과 섞지 않았다 — path-specific stage, 파일 1개, 1문자.
- 렌더 결과/동작 변경 없음(주석은 여전히 주석이다).
- 검증: `services/web-glycopharm` 단독 `tsc -b` PASS,
  루트 `pnpm run type-check:frontend` → **OK (실패 단계 0)**.
  수정 전 같은 명령은 `1 step(s) FAILED — type-check services/web-glycopharm` 였다.

### 16.2 ESLint ratchet — 내 spec 의 규칙명 오기 (커밋 `ca0338c78`)

glycopharm type 오류가 걷히자 CI 는 다음 단계인 `node scripts/lint-ratchet.mjs` 에서 멈췄다:
`ESLint 오류가 baseline 을 초과했습니다 (71 > 69)`.

원인은 **이 WO 가 추가한 spec** 이었다.
`channels-code-unique-integrity.spec.ts` 가 `/* eslint-disable @typescript-eslint/no-var-requires */`
로 억제를 시도했지만, 이 저장소가 켜 놓은 규칙은 `@typescript-eslint/no-require-imports` 다.
규칙명이 달라 억제가 걸리지 않았고 require 4곳(59, 346, 349, 352)이 그대로 오류로 집계됐다
(67 → 71).

- 규칙명을 맞추고 `jest.mock` 줄에 사유를 적은 inline disable 을 붙였다.
- `require` 자체는 유지한다: `jest.mock` factory 는 hoist 되므로 `import` 를 쓸 수 없고,
  실 Postgres 블록은 `CHANNELS_UQ_PG_URL` 이 없으면 로드되지 않아야 한다.
- 규칙 완화 0 / 검사 범위 축소 0 / 남의 파일 억제 0.
- 결과: `ESLint: 67 errors, 2194 warnings (baseline 69)` exit 0. spec 28건 그대로.
- **`ERROR_BASELINE` 은 내리지 않았다.** 스크립트가 67 로 낮추라고 안내하지만
  갱신 규칙은 "오류를 실제로 고친 뒤 낮춘다" 이고, 남은 2건 감소분은 다른 세션의 성과다.

### 16.3 최종 CI 상태 (`ca0338c78`)

| 워크플로 | 결과 |
|---|---|
| `CI Pipeline` | **success** (이 계열에서 처음으로 green) |
| `CodeQL Security Analysis` | success |
| `Deploy API Server (Cloud Run)` | success |
| `Deploy Web Services (Cloud Run)` (`f2d304808`) | success — glycopharm 빌드 복구 확인 |
