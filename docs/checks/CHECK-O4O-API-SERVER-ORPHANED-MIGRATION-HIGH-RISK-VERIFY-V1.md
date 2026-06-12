# CHECK-O4O-API-SERVER-ORPHANED-MIGRATION-HIGH-RISK-VERIFY-V1

> `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1` 의 HIGH 후보(operator_action_dismissals / store_contents / store_content_blocks / content_analytics) production 실재·runtime 영향 검증.
> **결과: 1건 확정 위험(operator_action_dismissals — o4o_payments 패턴), 3건 다운그레이드(ContentAnalyticsService 미연결 → unwired/dead).**
> 성격: read-only(코드 정적 분석 + 구조 증거). prod SQL 직접 미수행(방화벽) — 결정은 migration-applied 대조 + scanned 커버리지 + runtime guard 분석.
> 상위: `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1` — 2026-06-12

---

## 1. 요약 판정 (IR HIGH 4 → 정밀화)
| table | scanned dir 생성 | typeorm_migrations | runtime 참조 | guard | 판정 |
|-------|:---:|:---:|------|------|:---:|
| **operator_action_dismissals** | ❌ NONE | ❌ 미적용 | ✅ **live** (common action-queue, KPA/Glyco/KCos 마운트) | read=graceful / **dismiss-write=미가드(500)** | **A 🔴 CONFIRMED_MISSING (구조적 고확신)** |
| store_contents | ❌(kpa_store_contents 는 substring 오탐) | ❌ | ⚠️ ContentAnalyticsService 만 | — | **D unwired** |
| content_analytics | ❌ | ❌ | ⚠️ ContentAnalyticsService 만 | — | **D unwired** |
| store_content_blocks | ❌ | ❌ | **0 refs** | — | **D unused** |

→ **IR 의 HIGH 3그룹 중 실제 live 위험은 `operator_action_dismissals` 1건.** 나머지(store_contents/content_analytics/store_content_blocks)는 **ContentAnalyticsService 가 어떤 route/controller 에도 연결되지 않은 미사용(dead) 서비스**라 runtime 도달 불가 → 다운그레이드.

## 2. operator_action_dismissals — CONFIRMED_MISSING (o4o_payments 패턴)
- orphaned `CreateOperatorActionDismissals1771200000020` 만 이 테이블 생성. **scanned `database/migrations` 에 생성 migration 없음**(grep NONE).
- prod `typeorm_migrations`(applied 501) 에 **미등록**. `synchronize=false`(connection/migration-config) → migration 외 자동 생성 경로 없음.
- → **구조적으로 prod 에 존재할 수 없음**(o4o_payments 와 동일 메커니즘: orphaned dir 미스캔 → 영구 미적용). 고확신 MISSING.
- **runtime 영향 (live)**: 공통 `createActionQueueRouter`(`src/common/action-queue/action-queue.controller.ts`)가 **KPA·GlycoPharm·K-Cosmetics** operator 라우트에 마운트:
  - 읽기 `getDismissedActionIds`(action-queue-dismiss.ts): **try/catch graceful** — 테이블 없으면 빈 Set + warn 로그(액션 큐 목록은 정상). 500 아님.
  - 쓰기 `/actions/dismiss/:actionId` INSERT: **개별 가드 없음** → 테이블 부재 시 outer catch → **HTTP 500 INTERNAL_ERROR**. (execute 자동 dismiss INSERT 는 try/catch 가드되어 무시됨.)
  - → **운영자가 액션 큐에서 "dismiss" 클릭 시 500**(3 서비스 공통). 액션 큐 로드/실행 자체는 graceful 하여 가시성 낮음 — 그래서 지금까지 미발견(o4o_payments 와 유사한 잠재화).
- **잔여 100% 확인 방법**(read-only 한계): `gcloud sql to_regclass('public.operator_action_dismissals')` 또는 operator 계정으로 `/actions/dismiss` 1회 probe(500=부재/200=존재). 본 CHECK 는 구조 증거로 MISSING 확정.

## 3. store_contents / content_analytics / store_content_blocks — 다운그레이드
- `ContentAnalyticsService.ts`(src/modules/lms)가 `content_analytics ca ⋈ store_contents` 조회. 그러나 **이 서비스를 import 하는 controller/route 0건**(grep) → **runtime 미도달(unwired/dead 서비스)**.
- `store_content_blocks`: 코드 참조 0.
- IR §4 의 "store_contents 가 scanned 에 있음"·"care_actions 매칭" 은 **substring 오탐**(scanned 의 `kpa_store_contents` 가 `store_contents` 를 포함). **실 store content 런타임 테이블 = `kpa_store_contents`**(scanned dir `20260219000003-CreateKpaStoreContents` 외 다수, 적용됨 — 커버).
- → 이 3개는 **미사용 orphaned + 미연결 서비스**. live 위험 아님. cleanup 대상(dead-confirm 후), 또는 LMS analytics 활성화 시 별도 설계.

## 3.5 IR 정정
- IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1 §1/§4 의 "store_contents/content_analytics HIGH" 는 본 검증으로 **D(unwired)로 정정**. content_analytics 의 store-content 런타임은 `kpa_store_contents`(별개·커버). HIGH 실위험은 operator_action_dismissals 단일.

## 4. A~E 판정
- **A CONFIRMED_MISSING_HIGH_RISK**: `operator_action_dismissals` (CreateOperatorActionDismissals1771200000020) → relocate.
- **D NOT_USED/OBSOLETE**: `store_contents`/`store_content_blocks`/`content_analytics` (ContentAnalyticsService unwired); care_actions(IR §D, DropCareTables). → cleanup(dead-confirm 후).
- (C/B/E: IR §6 유지 — 본 CHECK 범위 밖.)

## 5. 후속 WO
1. **`WO-O4O-OPERATOR-ACTION-DISMISSALS-MIGRATION-RELOCATE-V1`** (즉시 권장) — `CreateOperatorActionDismissals1771200000020` 을 `src/database/migrations/` 로 이전(o4o_payments 패턴, `CREATE TABLE IF NOT EXISTS` + unique(user_id,service_key,action_id) 안전). 배포 migration job 적용 → 3 서비스 operator dismiss-write 정상화. 적용 후 `[X] ...OperatorActionDismissals` typeorm_migrations 등록 확인 + operator dismiss probe.
2. `IR/WO-O4O-LMS-CONTENT-ANALYTICS-WIRING-OR-CLEANUP-V1` — ContentAnalyticsService(+store_contents/content_analytics orphaned migration) 가 미사용인지 최종 확인 후 (a) 기능 활성화(라우트+테이블) 또는 (b) 서비스+orphaned migration cleanup.
3. (병행) `WO-O4O-API-SERVER-ORPHANED-MIGRATION-CLEANUP-V1` — IR C/D orphaned 파일 정리.

## 6. 검증 방식/한계
- 방식: 코드 정적(grep) + orphaned↔scanned 커버리지 + prod typeorm_migrations(applied 501, migrate job 로그) 대조 + runtime guard 분석. **prod schema 직접 SQL 미수행(방화벽).**
- operator_action_dismissals MISSING 은 **구조적 고확신**(미적용+미커버+synchronize off). 100% 확정은 §2 잔여 방법(gcloud sql / dismiss probe) — relocate WO 에서 적용 후 확인으로 갈음 가능(CREATE IF NOT EXISTS 라 존재해도 무해).

## 7. 완료 기준 체크 (WO §11)
1(HIGH 4 table 존재 여부 — 구조적 판정) ✅. 2(class name) ✅. 3(typeorm_migrations 적용 — 미적용) ✅. 4(scanned 중복 재확인 — NONE/오탐 정정) ✅. 5(column/index — orphaned 파일 기준) ✅. 6(A~E 판정) ✅. 7(즉시 relocate 필요 여부 — operator_action_dismissals YES) ✅. 8(후속 WO) ✅. 9(코드/DB 무변경) ✅. 10(CHECK) ✅. 11(path-specific) ✅. 12(다른 세션 무접촉) ✅.

## 8. 이번 CHECK 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. migration 이동·실행 없음. prod write probe 미수행. 다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · read-only · 코드/DB 무변경 · operator_action_dismissals = A CONFIRMED_MISSING(o4o_payments 패턴, 3서비스 dismiss-write 500) → relocate. store_contents/content_analytics/store_content_blocks = D unwired(다운그레이드). prod SQL 직접 확인은 relocate 적용으로 갈음.*
