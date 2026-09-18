# CHECK-O4O-RETIRED-SERVICE-SCHEMA-ENUM-CLEANUP-V1

> **WO**: WO-O4O-RETIRED-SERVICE-SCHEMA-ENUM-CLEANUP-V1
> **실행일**: 2026-09-18 · **환경**: 격리 PostgreSQL 15(docker) 검증 → PR/CI → production 은 canonical Deploy API migration Job 경로로만 적용
> **선행**: WO-O4O-RETIRED-SERVICE-CLEANUP-MAIN-INTEGRATION-AND-DB-RESIDUAL-AUDIT-V1 (`bbd61992a` · `REPOSITORY_ACTIVE_RESIDUAL = 0`) · WO-O4O-RETIRED-SERVICE-SAFE-DATA-RESIDUAL-CLEANUP-V1 (`65cc6b8f5` · `DB_STRUCTURED_RESIDUAL = 0`)
> **대상**: `public.checkout_orders_order_type_enum` 의 retired enum label 1개 (`DB_SCHEMA_RESIDUAL = 1 → 0`)

이 문서는 은퇴 서비스 식별자를 본문에 반복 기재하지 않는다. "retired enum label" 은 선행 CHECK 가 `DB_SCHEMA_RESIDUAL = 1` 로 식별한 enum label 을 가리킨다. 실제 DB host · 계정 · 비밀번호 · 개인식별정보는 기록하지 않는다.

---

## 1. BASE

```text
main 최신화: git fetch origin · git checkout main · git pull --ff-only → HEAD == origin/main == be247421c (SHA 고정 아님 · 시작 시점 최신)
worktree: C:/tmp/o4o-retired-enum-cleanup · branch work/retired-service-schema-enum-cleanup-v1 (base be247421c)
메인 체크아웃의 다른 세션 dirty/미추적 파일 5건 = 불가침 · 미접촉
```

## 2. PRECHECK (production · read-only · SELECT only · `default_transaction_read_only = on`)

| 항목 | 결과 |
|---|---|
| enum label (enumsortorder) | 5개 — GENERIC · DROPSHIPPING · **retired** · COSMETICS · TOURISM (3번째) |
| label 별 사용 row | GENERIC 23 · 그 외 label 0 |
| **retired label 사용 row** | **0** (STOP 조건 미해당) |
| `checkout_orders.order_type` | `DEFAULT 'GENERIC'::checkout_orders_order_type_enum` · NOT NULL |
| 인덱스 | `IDX_checkout_orders_order_type` btree(order_type) |
| 이 타입을 소비하는 컬럼 | `public.checkout_orders.order_type` 1개뿐 · domain/array 파생 타입 0 |
| view · function · check constraint · 타 컬럼 default 참조 | 0 (컬럼 default 만 타입 참조) |
| typeorm_migrations | 683행 · 최신 `CreateUserPolicyAcceptances1789649959243` (id 684) · 은퇴 서비스명 포함 행 31 = 역사 이력 · 불변 |
| 서버 | PostgreSQL 15.18 |

runtime: `CheckoutOrder.entity.ts` 는 `order_type` 컬럼을 매핑하지 않고, `apps/api-server/src` 에 `order_type` / retired label 참조 0 (neture 는 별도 `NetureOrderType`). → entity 변경 없음 (WO §6).

## 3. MIGRATION

- 신규 incremental: `apps/api-server/src/database/migrations/1789690338675-RemoveRetiredCheckoutOrderTypeEnumValue.ts` · class/name `RemoveRetiredCheckoutOrderTypeEnumValue1789690338675` (파일/클래스명에 은퇴 서비스명 없음).
- `manifest.ts` `INCREMENTAL_MIGRATIONS` 7번째로 append (append-only · epoch 증가).
- **historical migration 104개 · `historical-migrations.manifest.json` · `historical-migration-names.ts` · `legacy-history.facts.ts` · `typeorm_migrations` 행: 수정 0** (WO §7).
- `up()` (단일 트랜잭션 · fail-closed):
  1. 가드 — 타입 존재 · label 집합/순서 == 사전 조사 5개 · 임시 타입 잔존 0 · retired label 사용 row == 0 · 소비 컬럼 == `checkout_orders.order_type` 1개 · domain 0 — 하나라도 어긋나면 throw → ROLLBACK
  2. row 총계 캡처
  3. `DROP DEFAULT` → `CREATE TYPE …_new AS ENUM (4 label)` → `ALTER COLUMN … TYPE …_new USING order_type::text::…_new` → `DROP TYPE` 구 타입 → `RENAME TO` canonical 이름 → `SET DEFAULT 'GENERIC'`
  4. post-assert — label 4개 순서 · row 총계 불변 · default/NOT NULL/udt · 인덱스 존재 · 임시 타입 0
- `down()`: 동일 절차로 legacy label 을 원래 3번째 위치에 되돌리는 **schema rollback 계약만** 제공. 데이터 · route · service · config 복구 0 (WO §9).
- SQL 은 모두 상수 label 로 조립 · 사용자 입력 0 · 값 비교는 parameter binding.

## 4. BASELINE / EXPECTED SCHEMA STATE (WO §13 · §14)

repo 정본 절차 = **신규 incremental 에 대응하는 `EXPECTED_SCHEMA_STATES` 항목 1개 추가**. canonical baseline(`2026-09-15-id678`) 은 재생성하지 않았다 — baseline 은 bootstrap 시점 스냅샷이고 fresh DB 는 baseline 이 enum 을 5 label 로 만든 뒤 이 migration 이 제거하는 것이 canonical 흐름이다(선행 6개 incremental 과 동일한 방식). baseline 재스냅샷은 migration squash WO 에서 새 `baselineVersion` 으로 수행한다.

| appliedThrough | fingerprint | lines | 산출 |
|---|---|---|---|
| `RemoveRetiredCheckoutOrderTypeEnumValue1789690338675` | `0ca1a71b9a511f0147583c919eb37814b1ad28f1ba042ceba1038393bb54df70` | 5745 | 격리 PG 15.17 · fresh bootstrap + 1..7 · `dist/migrate.js` 의 `LIVE_FINGERPRINT` 보고값 그대로 (수기 계산 0) |

직전 상태 `dfc42b8e…`(5745) 대비 ENUM fingerprint line 1개만 변경 · line count 동일.

## 5. VALIDATION (격리 PostgreSQL 15.17 · docker `postgres:15`)

| 시나리오 | 결과 |
|---|---|
| **A** fresh DB → bootstrap + 1..7 (`o4o_a`, 상태 등록 전) | `INCREMENTAL_EXECUTED = 7` · 7번째 실행 성공 · `LIVE_FINGERPRINT = 0ca1a71b…(5745)` · 상태 미등록으로 `POST_MIGRATION_SCHEMA_ASSERTION = FAILED`(기대) → 이 값으로 상태 등록 |
| A 재실행 (같은 DB) | `BOOTSTRAPPED · 7/7 · PRE PASS · EXECUTED 0 · POST PASS · MIGRATION_JOB = SUCCESS` (idempotent) |
| A' 새 fresh DB (`o4o_c`, 상태 등록 후 end-to-end) | `FRESH_EMPTY → EXECUTED 7 → 0ca1a71b… → POST PASS · SUCCESS` |
| **B** pre-state (`o4o_b`): main(origin) 의 6-migration dist 로 bootstrap + 1..6 → `dfc42b8e…` (= production 현재 fingerprint) · label 5 · GENERIC 23행 seed · retired row 0 | 신규 dist 실행 → `BOOTSTRAPPED · 6/7 · PRE PASS · EXECUTED 1 · LIVE 0ca1a71b… · POST PASS · SUCCESS` |
| B 후 schema | label 4 (GENERIC,DROPSHIPPING,COSMETICS,TOURISM) · GENERIC 23 불변 · default/NOT NULL 유지 · 인덱스 1 · `…_enum%` 타입 1개 |
| B 재실행 | `7/7 · EXECUTED 0 · POST PASS · SUCCESS` |
| down()/up() 왕복 | down OK(label 5, 원 위치) → down 재호출 THROW(가드) → up OK(label 4) → up 재호출 THROW(가드) · row 23/default/index 불변 |
| 음성 가드 | down 후 retired label row 1건 삽입 → up **THROW** `1 checkout_orders row(s) still use the retired label` · ROLLBACK 후 label 5 그대로 → 행 제거 후 up OK |

검증 SQL/스크립트는 세션 scratchpad 에만 두었고 repository 에 추가하지 않았다.

## 6. 계약 · 테스트

```text
node scripts/db/check-migration-contract.mjs                       → 21 pass / 0 fail (등록 전 C22 만 실패 → 등록 후 PASS)
node --test scripts/db/__tests__/migration-identity.test.mjs        → 26 pass / 0 fail
jest canonical-database-bootstrap-incremental-migration-separation
   + database-state-classifier-schema-drift-and-connection-log-hardening → 2 suites · 43 passed · 4 skipped(기존 skip)
pnpm run build:packages · pnpm --filter @o4o/api-server run type-check · pnpm --filter @o4o/api-server run build → PASS (dist/main.js · dist/migrate.js)
node scripts/check-typeorm-entities.mjs                              → PASS
api-server 전체 jest                                                  → 308 suites passed · 3 skipped(기존) · 4985 tests passed · 31 skipped · 0 failed
```

## 7. Census (WO §18)

```text
git grep -niE '<retired keywords>' -- ':!apps/api-server/src/database/**' → 1
  = docs/investigations/IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1.md:221 (2026-09-17 · 다른 세션 IR · "서비스 종료 사례" 로 은퇴 사실을 인용한 기록물)
```

코드 · 설정 · 라우트 · 테스트 = 0. 남은 1건은 CLAUDE.md §16-1 기록물(`investigations/`)이며 은퇴 사실 자체를 서술하는 문장이라 REPOSITORY_ACTIVE_RESIDUAL 산정에서 제외(HISTORICAL_RECORD). 이 WO 범위 밖 · 미수정.

`apps/api-server/src/database/**` 내부: 신규 migration 1건이 가드 대상으로 label 문자열을 필연적으로 포함한다(제거 대상 자체). historical 104 파일은 불변.

## 8. PR · CI

```text
__PR_CI__
```

## 9. PRODUCTION (canonical Deploy API migration Job 경로 · 직접 SQL 0)

```text
__PRODUCTION__
```

## 10. 판정

```text
__FINAL__
```

`RETIRED_SERVICE_TOTAL_REPOSITORY_RESIDUAL = 0` 은 선언하지 않는다 (migration history 104 는 최종 squash WO 대상).

## 11. 다음

- migration history squash WO (`MIGRATION_HISTORY_RESIDUAL` 104 + 이번 incremental 1) — 이 WO 의 production 성공 이후에만 착수. 그 WO 에서 canonical baseline 재스냅샷(새 `baselineVersion`) 수행.
- `checkout_orders.metadata.serviceKey` 4행(취소 주문 이력) · `organizations.name` 1 · `store_playlists.name` 1 · `users.name` 1 = 영구 KEEP.
