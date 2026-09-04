# WO-O4O-FINAL-PRODUCTION-DB-RESIDUE-CLOSURE-V1 — CHECK

> **성격**: production DB write 승인형 마감 작업.
> **승인된 write 범위**: ① main 에 이미 존재하는 두 DROP migration 의 적용 ② `app_registry` stale 4 row DELETE — **그 외 write 0**.
> **산출물**: 본 CHECK 1개 (신규 migration 0 · 코드 변경 0).
> **작성일**: 2026-09-04

---

## 1. 기준선 (Baseline)

| 항목 | 값 |
|---|---|
| START_HEAD | `466c8ec3cad833a04063526f30ba94bc75710fa1` |
| START_ORIGIN_MAIN | `466c8ec3cad833a04063526f30ba94bc75710fa1` |
| 작업 트리 | `c:/Users/sohae/o4o-platform` (공유 worktree · 시작 시 **clean**) |
| 브랜치 | `main` (HEAD == origin/main → 별도 worktree 불필요) |
| `git status --short` (시작) | 0 line |

선행 CHECK 의 수치는 복사하지 않고 **현재 production 을 재조회**했다 (WO §4).

---

## 2. Production 접속 (WO §5)

| 항목 | 값 |
|---|---|
| 채널 | Cloud SQL Auth Proxy v2 (`bin/cloud-sql-proxy-v2.exe`) → `127.0.0.1:5455` |
| 인스턴스 | `netureyoutube:asia-northeast3:o4o-platform-db` |
| DB | `o4o_platform` |
| 계정 | `o4o_api_v2` (production runtime 계정) |
| 자격증명 | **Secret Manager runtime read** — `gcloud secrets versions access latest --secret=o4o-db-password`, 프로세스 환경변수로만 전달 |

- 비밀번호 **로그 출력 0 · CHECK 기록 0 · commit 저장 0 · shell history 평문 0**.
- 모든 write 이전 단계는 `BEGIN READ ONLY; ... ROLLBACK;` 으로 감쌌다 (WO §6).

> **부수 관측 (범위 외 · 조치 없음)**: 로컬 `apps/api-server/.env` 의 `DB_USERNAME=o4o_api` 자격증명은
> production 에서 **인증 실패**한다(`password authentication failed`). `CHECK-O4O-CLOUDSQL-AND-RUNTIME-SECRET-HARDENING-V1`
> §17 이 남긴 미해소 잔여(`o4o_api` credential 미보유)와 일치한다. 본 WO 는 rotation 범위가 아니므로 조치하지 않고 기록만 한다.

---

## 3. Migration 식별 (WO §7)

| 대상 | Migration 파일 | 클래스 / `name` | timestamp | 현재 main 존재 |
|---|---|---|---:|:---:|
| `users.permissions` DROP | `apps/api-server/src/database/migrations/20270320000000-DropUsersPermissionsColumn.ts` | `DropUsersPermissionsColumn20270320000000` | `270320000000` | O |
| `store_events` DROP | `apps/api-server/src/database/migrations/20270321000000-DropStoreEventsTable.ts` | `DropStoreEventsTable20270321000000` | `270321000000` | O |

**migration 내용 검토 (WO §11)**: 두 파일 모두 의도한 DROP 만 수행하며 **unrelated DDL 0**.

- `DropUsersPermissionsColumn.up()` = `ALTER TABLE "users" DROP COLUMN IF EXISTS "permissions"` 1문.
- `DropStoreEventsTable.up()` = `DROP INDEX IF EXISTS` 2문 + `DROP TABLE IF EXISTS store_events` 1문.
- 양쪽 모두 `down()` 에 원복 DDL 보유.

---

## 4. Migration 적용 상태 — 판정 `ALREADY_APPLIED` (WO §8)

migration 이력 테이블 이름은 `typeorm_migrations` 이다 (`connection.ts:117` · `migration-config.ts:68` · `migrate.ts:100`).

| 항목 | 실측 |
|---|---|
| `typeorm_migrations` 총 건수 | **654** |
| 최대 적용 id | **655** (`CreateCafe24MemberLinksAndSeedCafe24B2bService20270322000000`) |
| `DropUsersPermissionsColumn20270320000000` | **id 653 · 적용됨** |
| `DropStoreEventsTable20270321000000` | **id 654 · 적용됨** |

### 판정: `ALREADY_APPLIED`

선행 census(`WO-O4O-POST-CLEANUP-FINAL-RESIDUE-AND-CLOSURE-CENSUS-V1-CHECK` §5) 시점의 최대 적용 id 는 **652** 였다.
그 이후 `6d53fd1f2`(Cafe24 B2B) 배포가 나가면서 **CI/CD 자동 migration 이 653 · 654 · 655 를 순차 적용**했다.

→ 따라서 본 WO 의 A축(migration 적용)에 대해 **이번 세션이 수행한 production write 는 0 이다.**
WO §12 의 canonical runner 요구는 자동 충족된다(적용 주체 = `deploy-api.yml` 의 migration job = canonical runner).
`psql` 직접 `DROP TABLE` / `ALTER TABLE DROP COLUMN` / migration SQL 복사 실행은 **하지 않았다**.

---

## 5. Schema 실측 — before / after (WO §9 · §13 · §23)

두 migration 이 이미 적용된 상태이므로 **본 세션의 관측값이 곧 after-state** 이며, before-state 는 선행 census 기록이다.

| 대상 | before (선행 census 시점) | after (본 세션 실측) |
|---|---|---|
| `to_regclass('public.store_events')` | `store_events` (존재 · 0 rows) | **NULL (absent)** |
| `users.permissions` 컬럼 | 존재 (`json NOT NULL DEFAULT '[]'` · 57행 전부 `[]`) | **`information_schema.columns` 0 rows (absent)** |

---

## 6. Consumer zero 재확인 (WO §10)

`git grep -n -I` 전수, 현재 HEAD 기준.

### 6-1. `store_events`

| 분류 | 건수 | 근거 |
|---|---:|---|
| TEST_GUARD | 3 | `__tests__/legacy-production-schema-final-closure.spec.ts` (B축 재생성 방지 assertion) |
| MIGRATION | 2 파일 | `20260301200000-CreateStoreEvents` (역사적) · `20270321000000-DropStoreEventsTable` |
| HISTORICAL_DOC | 11 파일 | `docs/**` |
| **ACTIVE** | **0** | entity · repository · query · raw SQL 0 |

`StoreEvent` 엔티티 파일 = **부재** (spec 이 `/^StoreEvent\.(ts|js)$/` 로 0건 단언).

### 6-2. `users.permissions`

| 분류 | 건수 | 근거 |
|---|---:|---|
| TEST_GUARD | 4 spec | `legacy-production-schema-final-closure` · `auth-runtime-and-legacy-package-final-closure` · `frozen-auth-permissions-and-kpa-supplier-final-closure` · `legacy-followup-auth-notification-catalog-final-closure` |
| COMMENT | 2 | `authorization.middleware.ts:185,195` (제거 이력 주석) |
| **ACTIVE** | **0** | `User` 엔티티 컬럼 정의 0 · `permissions: user.permissions` 0 · `user.permissions?.includes` 0 |

→ **ACTIVE consumer 0 확정.** 추가로, 두 DROP 이 이미 적용된 상태에서 API 가 정상 서빙 중(§10-2)이라는 점이 실증적 증거다.

---

## 7. `app_registry` stale rows — before (WO §14 · §15)

`app_registry` before = **6 rows** (전부 `status='active'` · `source='local'` · `installedAt = updatedAt = 2026-01-22 13:36:28.617352`).

| appId | name | type | 판정 |
|---|---|---|---|
| `annualfee-yaksa` | 연회비 관리 | core | **STALE → DELETE 대상** |
| `digital-signage` | Digital Signage | standalone | **STALE → DELETE 대상** |
| `membership-yaksa` | 회원 관리 | core | **STALE → DELETE 대상** |
| `reporting-yaksa` | 신상신고 관리 | core | **STALE → DELETE 대상** |
| `digital-signage-core` | Digital Signage Core | core | **KEEP (ACTIVE)** |
| `partnerops` | PartnerOps | standalone | **KEEP (ACTIVE)** |

target count before = **정확히 4**.

### 7-1. stale 4건 consumer 판정

소비 경로의 정본은 하나다: `GET /api/v1/apps/availability` → `AppManager.listInstalled()` → `app_registry` read.
그 응답을 쓰는 곳은 `useAppStatus` → ①`useAdminMenu` 메뉴 게이팅 ②`AppGuard` ③`AppRouteGuard` 뿐이다.

| 축 | `annualfee-yaksa` | `digital-signage` | `membership-yaksa` | `reporting-yaksa` |
|---|:---:|:---:|:---:|:---:|
| `appsCatalog.ts` 등재 | 0 (주석만) | 0 (주석만) | 0 (주석만) | 0 (주석만) |
| runtime package | 0 (패키지 삭제됨) | 0 | 0 (패키지 삭제됨) | 0 (패키지 삭제됨) |
| route mount | 0 | 0 | 0 | 0 |
| `AppGuard` / `AppRouteGuard` `appId` 인자 | 0 | **0** | 0 | 0 |
| 메뉴 `appId` 게이트 키 | 0 | **0** | 0 | 0 |
| frontend import | 0 | 0 | 0 | 0 |
| CI | 0 | 0 (§7-3) | 0 | 0 |
| external contract | 0 | 0 | 0 | 0 |
| **ACTIVE consumer** | **0** | **0** | **0** | **0** |

`appsCatalog.ts` 가 선언하는 `appId` 전수 = `auth-core` · `platform-core` · `cms-core` · `forum-core` · `organization-core` · `lms-core` · `partner-core` · **`digital-signage-core`** · `organization-forum` · `pharmacy-ai-insight` · `signage` · **`partnerops`** · `market-trial` · `organization-lms` · `forum-cosmetics`.
→ stale 4건은 **카탈로그에 없다**. 반대로 KEEP 2건은 카탈로그에 있다.

### 7-2. `digital-signage` vs `digital-signage-core` 별개 증명 (WO §16)

WO §16 이 요구한 핵심 확인이다. **둘은 서로 다른 row 이고, 살아 있는 signage 기능은 `-core` 쪽만 소비한다.**

| 증거 | 내용 |
|---|---|
| DB | 별개 row — `digital-signage` = `49a6ed59-...` / `type=standalone`, `digital-signage-core` = `70142070-...` / `type=core`. `UQ_fd8bf599bc4e979ef5de3424554("appId")` 로 appId 유일 |
| 유일한 `AppGuard` 호출부 | `apps/admin-dashboard/src/pages/digital-signage/DigitalSignageRouter.tsx:53` → `appId="digital-signage-core"` |
| ViewComponentRegistry | 등록키 `'digital-signage.router'` 의 메타데이터 `appId` = **`digital-signage-core`** (`ViewComponentRegistry.ts:249`). 등록키 문자열이지 registry appId 가 아니다 |
| 관리자 메뉴 | `admin-menu.static.tsx:341` 블록은 `id: 'digital-signage'` 이나 **`appId` 속성이 없다**. `useAdminMenu.ts:162` 의 게이트 조건이 `(item as any).appId && ...` 로 시작하므로 `appId` 없는 항목은 **숨김 대상이 되지 않는다** |
| 패키지 | 살아 있는 패키지는 `@o4o-apps/digital-signage-core`. 은퇴한 `apps/digital-signage` 앱과는 이름 부분일치일 뿐 (선행 census §2-2 의 `UNRELATED_NAME_MATCH` 14건과 동일 결론) |

→ **`app_registry.appId='digital-signage'` row 의 소비처 = 0. `digital-signage-core` 와 동일 계약이 아니다.** (WO §29 중지 조건 해당 없음)

### 7-3. `ci-build-app.sh` 의 `digital-signage`

`scripts/ci-build-app.sh:57,73` 의 `"digital-signage"` 는 **빌드 타깃 별칭 문자열**(`signage` 의 alias)이며 `app_registry` 를 조회하지 않는다 → `UNRELATED_NAME_MATCH`.

---

## 8. FK / 참조 census (WO §17)

| 검사 | 결과 |
|---|---|
| `app_registry` 를 참조하는 **inbound FK** | **0** |
| `app_registry` 의 outbound FK | **0** |
| 제약 전체 | `PK_0ad3967947b8e96a4e6cbc4827e` (PK on `id`) · `UQ_fd8bf599bc4e979ef5de3424554` (UNIQUE on `appId`) — FK 없음 |
| trigger | **0** |
| view / matview 의존 | **0** |
| soft-ref 후보 컬럼 | `app_instances."appId"` (uuid · **0 rows**) · `app_usage_logs."appId"` (uuid · **0 rows**) — 둘 다 `uuid` 타입이라 `app_registry."appId"`(varchar slug)와 **타입 자체가 불일치**하며 FK 도 없다. `neture_seller_partner_contracts.application_id` 는 파트너 신청 축으로 무관 |

→ **FK cascade 유발 가능성 0** (WO §29 중지 조건 해당 없음).

### 8-1. DELETE 내구성 — 재seed 되지 않음

`2026012200002-SeedDefaultApps` 가 이 6행을 최초 seed 했다. 재생성 위험을 두 경로 모두 확인했다.

| 경로 | 판정 |
|---|---|
| 정상 `AppDataSource.runMigrations()` | `typeorm_migrations` **id 50** 에 이미 기록됨 → TypeORM 이 재실행하지 않는다 |
| `startup.service.ts:181-184` 의 seed 폴백 (migration 오류 시에만 동작) | 필터가 `m.name.includes('Seed')` **AND** `parseInt(name.match(/\d+/)[0]) >= 9900000000000`. `SeedDefaultApps2026012200002` → `2026012200002` (약 2.03e12) **< 9.9e12** → **필터에서 제외됨** |
| 런타임 write 축 | `AppManager` 의 install/write 축은 선행 WO 에서 은퇴. 현재 canonical 책임은 **read 하나**(`app-manager.facade.ts:13`) |

**실증 증거**: `SeedDefaultApps` 의 `DEFAULT_APPS` 에는 `cosmetics-partner` 가 포함되어 있으나 production `app_registry` 에는 **0행**이다. 즉 과거에 삭제된 row 가 재seed 되지 않았음이 이미 관측된다.

---

## 9. 승인된 DELETE 실행 (WO §18 · §19 · §20)

단일 트랜잭션 + 사전/사후 가드(`DO ... RAISE EXCEPTION`) + `ON_ERROR_STOP on` 으로 실행했다.

```sql
BEGIN;
  -- 가드: target before = 4, total before = 6 아니면 EXCEPTION -> 트랜잭션 abort
  DELETE FROM app_registry
   WHERE "appId" IN ('annualfee-yaksa','digital-signage','membership-yaksa','reporting-yaksa');
  -- 가드: target after = 0, total after = 2 아니면 EXCEPTION -> 트랜잭션 abort
COMMIT;
```

| 안전 조건 (WO §19) | 실측 | 판정 |
|---|---:|:---:|
| target count **before** = 4 | 4 | PASS |
| **affected rows** = 4 | 4 | PASS |
| target count **after** = 0 | 0 | PASS |
| total before | 6 | — |
| total after | 2 | PASS |

`RETURNING` 실측 삭제 목록: `annualfee-yaksa, digital-signage, membership-yaksa, reporting-yaksa` — **정확히 대상 4건**.

### 9-1. 다른 row 보호 (WO §20)

post-commit 재조회 결과 `app_registry` = **2 rows**:

| appId | name | type | status | installedAt |
|---|---|---|---|---|
| `digital-signage-core` | Digital Signage Core | core | active | `2026-01-22 13:36:28.617352` |
| `partnerops` | PartnerOps | standalone | active | `2026-01-22 13:36:28.617352` |

`installedAt` 이 삭제 전 값과 **동일** → 두 row 는 **변경 0** (UPDATE 접촉 없음). 대상 외 row 영향 = **0**.

---

## 10. 검증 (WO §23 · §24 · §25 · §26)

### 10-1. DB after-state (WO §23)

| 항목 | 결과 |
|---|:---:|
| `store_events` | **absent** (`to_regclass` = NULL) |
| `users.permissions` | **absent** |
| target migration ids (653 · 654) | **applied** |
| `app_registry` stale 4 | **0** |
| `app_registry` 기타 row | **unchanged (2건)** |

### 10-2. Production smoke (WO §24)

엔드포인트는 `https://api.neture.co.kr` (run.app 직접 호출은 ingress LB-only 로 404).

| 검증 | 결과 |
|---|---|
| `GET /health` | **200** |
| `GET /health/detailed` | `status: healthy` · database healthy (PostgreSQL 15.18 · pingMs 19 · longRunningQueries 0) · system healthy · memory healthy |
| `GET /health/database` | `status: healthy` (pingMs 3) |
| `GET /api/v1/auth/status` | **200** |
| `POST /api/v1/auth/login` (admin 계정 · L1) | **200** |
| **`GET /api/v1/apps/availability` (인증됨)** | **200** → `{"apps":[{"appId":"digital-signage-core","active":true},{"appId":"partnerops","active":true}]}` |
| `GET /api/v1/apps/availability` (미인증) | 401 (`AUTH_REQUIRED`) — 기존 계약대로 |

> **핵심 검증**: `/apps/availability` 는 `app_registry` 의 **유일한 런타임 소비 경로**다. 삭제 후 응답이
> 정확히 KEEP 2건이며 `digital-signage-core` 가 `active: true` 로 살아 있다 → 살아 있는 사이니지 게이팅이
> 손상되지 않았음이 **end-to-end 로 실증**되었다 (§7-2 의 정적 분석과 일치).

> 서비스별(KPA · Neture · PharmacyHub · K-Cosmetics) 대표 read-only endpoint 는 **미실측**이다.
> 무인증 공개 read 경로를 특정하지 못했고(추정 경로 4건 전부 404), 서비스 웹 로그인 자격은
> `TEST-ACCOUNTS.local.md` §2 기준 전부 unknown 이다. 다만 네 서비스는 모두 동일한 `o4o-core-api`
> 리비전을 공유하며 그 health · DB · 인증 · `app_registry` 소비 경로가 위와 같이 PASS 다.

### 10-3. Production logs (WO §26)

| 검사 | 결과 |
|---|---|
| `severity>=ERROR` (최근 30분 · `o4o-core-api`) | **0건** |
| 키워드 스캔 (최근 2시간): `store_events` · `column "permissions"` · `app registry` · `AppAvailability` | **0건** |

→ `relation "store_events" does not exist` · `column "permissions" does not exist` · app registry lookup error **신규 발생 0**.

### 10-4. Tests / type-check (WO §25)

| 검증 | 결과 |
|---|---|
| api-server `tsc --noEmit` | **PASS** (exit 0) |
| 은퇴·스키마 가드 spec 7종 (jest, `--runInBand`) | **7 suites / 160 tests 전부 PASS** |
| ↳ 포함 spec | `legacy-production-schema-final-closure` · `auth-runtime-and-legacy-package-final-closure` · `frozen-auth-permissions-and-kpa-supplier-final-closure` · `legacy-followup-auth-notification-catalog-final-closure` · `app-instances-retirement` · `app-management-runtime-residue-retirement` · `public-appstore-read-retirement` |
| api-server Jest **전수** | **미완주** — 아래 참조 |
| `tests/multi-tenant/appstore.spec.ts` | **미실행** — 아래 참조 |

> **숨기지 않고 기록한다 (미완주 2건)**
>
> 1. **api-server Jest 전수**: `pnpm --filter @o4o/api-server test` 가 V8 힙 한계로 중단됐다
>    (`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`, exit status 134).
>    **로컬 실행 환경의 메모리 제약이며 테스트 실패가 아니다.** 본 WO 는 코드 변경 0 이므로 회귀 위험 표면이
>    없고, 대신 이번 작업과 직접 관련된 가드 spec 7종을 힙 상향(`--max-old-space-size=6144`) 후 전수 PASS 로 확인했다.
>    참고: 직전 census CHECK 는 동일 코드베이스에서 `225 suites / 3786 tests` 전부 PASS 를 기록했다.
> 2. **`tests/multi-tenant/appstore.spec.ts`**: 이 파일은 **jest 가 아니라 vitest** 스위트다
>    (`import { ... } from 'vitest'`). jest 로 강제 실행하면 import 단계에서 실패하며, 이는 **하네스 불일치이지
>    테스트 실패가 아니다.** 또한 이 spec 의 `expect(appIds).not.toContain('reporting-yaksa')` 류 단언은
>    `app_registry` 가 아니라 **`appsCatalog`(코드 상수)** 를 대상으로 하므로 이번 DELETE 와 무관하다.

---

## 11. 선행 CHECK drift 정정 (WO §21)

`docs/checks/CHECK-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1.md:260` 은
"프로덕션 재조회: `users` 에 `permissions` 컬럼 부재 · `to_regclass('store_events')` = NULL" 이라고 기록했다.

**정정**: 그 기술은 **당시 production 실제 상태와 불일치**했다. 두 DROP migration 은 main 에는 병합되어 있었으나
**production 에는 아직 적용되지 않은 상태**였고(그 시점 최대 적용 id 652), 따라서 두 대상은 **production 에 여전히 존재**했다.
`WO-O4O-POST-CLEANUP-FINAL-RESIDUE-AND-CLOSURE-CENSUS-V1-CHECK` §5 가 이 불일치를 최초로 포착해 `DEFERRED_APPROVED` 로 분류했다.

**현재 상태**: 두 migration 은 id **653**(`users.permissions`) · **654**(`store_events`) 로 **실제 적용 완료**되었고,
본 CHECK §5 의 실측이 이를 확인한다. 즉 원래 기술의 결론(둘 다 부재)은 **지금은 참**이지만, 기록 시점에는 거짓이었다.

과거 기록물 본문은 **수정하지 않았다** — `docs/checks/**` 는 CLAUDE.md §16-1 상 **기록물**이므로 인라인 정비 대상이 아니다.
정정 이력은 본 CHECK 에만 남긴다.

---

## 12. 범위 외 — `organization_channels` B2C row (WO §22)

본 WO 기본 범위에 **포함하지 않는다**. 보고만 한다.

`organization_channels` 실측 3 rows:

| id | organization_id | channel_type | status | updated_at | 비고 |
|---|---|---|---|---|---|
| `83b70814-...` | `ec596c46-...` | **B2C** | APPROVED | 2026-05-15 06:51:54 | **stale · 이번 범위 외** |
| `5063860e-...` | `ec596c46-...` | KIOSK | APPROVED | 2026-05-15 06:51:54 | 범위 외 |
| `39b87365-...` | `e3d14288-...` | TABLET | APPROVED | 2026-09-04 03:28:19 | **active** |

code-only WO 에서 `channels/b2c` activate/deactivate route 는 이미 은퇴했으나, DB row 는 `app_registry` 와
**다른 domain** 이고 자동 DELETE 승인 범위가 아니다. 필요 시 최종 housekeeping 에서 별도 처리한다.

> 참고: 이번 census 에서 `KIOSK` row 1건도 동일하게 stale 로 관측된다(B2C 와 같은 조직 · 같은 시각 seed).
> 판단하지 않고 **관측 사실만** 기록한다.

---

## 13. 변경 / 부작용 (WO §27 · §28 · §30 · §31)

| 항목 | 값 |
|---|---|
| production DB write 종류 | **`app_registry` stale 4 row DELETE 1건뿐** |
| migration 적용 (본 세션 실행) | **0** — 두 대상은 배포 파이프라인이 이미 적용 (`ALREADY_APPLIED`) |
| 신규 migration 작성 | **0** (WO §27 준수) |
| 임의 UPDATE / 추가 DELETE / 새 DROP / schema 재설계 / data migration | **0** |
| 코드 변경 | **0** |
| guard 추가 (WO §28) | **0** — 기존 `legacy-production-schema-final-closure.spec.ts` 가 `store_events` · `users.permissions` 재생성을 이미 가드한다. 새 구조를 만들지 않는다 |
| 실제 변경 파일 | **본 CHECK 1개** |
| `DEAD_REFERENCE` | **0** |
| `UNKNOWN` | **0** |

---

## 14. 최종 판정 (WO §35)

| 완료 기준 | 결과 |
|---|:---:|
| `store_events` = absent | PASS |
| `users.permissions` = absent | PASS |
| target migrations = applied | PASS (id 653 · 654) |
| `app_registry` stale rows = 0 | PASS |
| other `app_registry` rows unchanged | PASS (2건 · `installedAt` 동일) |
| production health = PASS | PASS |
| new DB/schema error = 0 | PASS |
| production DB write = 승인된 migration + stale row 4 DELETE 만 | PASS |
| UNKNOWN = 0 | PASS |

### 판정: `FINAL_PRODUCTION_DB_RESIDUE_CLOSED`

이에 따라 cleanup 트랙 전체를 `POST_CLEANUP_CLOSURE_READY` 로 닫는다.

---

## 15. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

- 발견 1건 = §11 의 `CHECK-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1.md:260` drift.
  `docs/checks/**` 는 기록물이므로 인라인 수정 대상이 아니다 (CLAUDE.md §16-1) → 본 CHECK 에 정정 이력만 기록.
