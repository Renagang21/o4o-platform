# CHECK-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1

- **대상 WO**: [`WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1`](../work-orders/WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1.md)
- **선행 CHECK**: [`CHECK-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1`](CHECK-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1.md)
- **실행일**: 2026-09-04
- **base**: `origin/main` = `6eb88fff4`
- **상태**: **완료 (A·B·C 정리 · D 판정)**

---

## 0. 요약

| 축 | 대상 | 결과 |
|---|---|---|
| A | `requirePermission` / `requireAnyPermission` + permission 스냅샷 grant 분기 | **제거 5곳** (중지 없음) |
| B | `NotificationType` dead member + `notifySupplierSettlementPaid` | **18 제거 · `settlement.paid` 활성화** |
| C | sellerops / supplierops / partnerops 카탈로그 | **sellerops 은퇴 · 나머지 2 RETAIN** |
| D | `store_events` / `organization_product_applications` | **판정만 수행 (DROP·migration 0)** |

**production DROP 0건 · migration 파일 0건 · 금전 write 0건 · POS 개발 0건.**

---

# A. requirePermission / permission 스냅샷

## A-1. census 결과

| 대상 | 위치 | 판정 |
|---|---|---|
| `requirePermission` | `common/middleware/auth/authorization.middleware.ts:193` | **DEAD_UNMOUNTED** — api-server route mount 0건 |
| `requireAnyPermission` | 같은 파일 `:263` | **DEAD_UNMOUNTED** — mount 0건 |
| 두 미들웨어의 재수출 | `common/middleware/auth.middleware.ts:40-41` | **DEAD_UNMOUNTED** |
| `user.permissions?.includes('signage:admin')` | `middleware/signage-role.middleware.ts:92` | **LEGACY_ROLE_SNAPSHOT** — grant-only, 실행 0 |
| `user.permissions?.includes(operatorPermission)` | 같은 파일 `:177` | **LEGACY_ROLE_SNAPSHOT** |
| `user.permissions?.includes(storePermission)` | 같은 파일 `:274` | **LEGACY_ROLE_SNAPSHOT** |
| `users.permissions` 컬럼 | `modules/auth/entities/User.ts:91-93` | **COMPATIBILITY** (DB schema — 범위 밖) |
| JWT `permissions` claim | `utils/token.utils.ts:93` | **COMPATIBILITY** (아래 A-3) |
| `account-linking.service.ts:568` 병합 | — | **COMPATIBILITY** (컬럼 유지에 종속) |
| `@o4o/organization-core` `PermissionGuard` | `packages/organization-core/src/guards/` | **DEAD (소비처 0)** — 단 동결 Core §3 → **RETAIN + 보고** |
| admin-dashboard `utils/permissions.ts` | — | **ACTIVE_CANONICAL** (역할 fallback 계약 · 전용 테스트 존재) |

## A-2. 중지하지 않은 근거 (프로덕션 실측)

`requirePermission` 계열의 1차 판정은 `users.permissions` 스냅샷이었다.

```text
프로덕션 users 57행 중 permissions 가 비어 있지 않은 행 = 0
```

→ grant-only 분기는 **한 번도 실행된 적이 없다.** 제거해도 현재 active auth contract 의
허용/거부 결과가 달라지지 않으므로 WO 지시의 "A축만 중지" 조건에 해당하지 않는다.
canonical 경로(`roleAssignmentService.hasPermission` / `hasAnyRole`)는 그대로 유지했다.
**새 RBAC framework 는 만들지 않았다.**

## A-3. RETAIN 판단 (UNJUDGED 아님 · 의도적 보류)

| 항목 | 유지 이유 |
|---|---|
| `users.permissions` 컬럼 | DB schema 변경 = CLAUDE.md 중지 조건 |
| JWT `permissions` claim | repo 전체 reader 0 이지만 JWT payload 형태 변경은 auth contract 변경. 값이 항상 `[]` 라 무해하므로 별도 WO 로 분리 |
| `PermissionGuard` (organization-core) | 동결 Core(§3) 의 export 제거 = 구조 변경 → 명시적 WO 필요 |

## A-4. 회귀 검증 (§8)

`requirePermission` 계열이 어떤 라우트에도 마운트되지 않았으므로 **허용/거부 경로가 바뀐 라우트가 없다.**
signage 3분기는 grant-only 였으므로 제거 후에도 **거부가 늘어나지 않는다**(실행 0건).
전체 회귀는 api-server Jest 219 suites / 3,641 tests 전부 통과로 확인했다(§F).

---

# B. NotificationType / settlement 알림

## B-1. member 별 census (current main · `dist/` 제외)

`dist/` 는 빌드 산출물이라 소비처로 세지 않았다.

**DEAD (producer 0 · consumer 0) — 제거 18종**

```text
order.new                          order.status_changed
settlement.new_pending             price.changed
stock.low                          role.approved
role.application_submitted
member.license_expiring            member.license_expired
member.verification_expired        member.fee_overdue_warning
member.fee_overdue                 member.report_rejected
member.education_deadline
pharmacy.request_submitted         pharmacy.request_approved
pharmacy.request_rejected
store.online_sales_order_created
```

- 앞 7종의 유일한 src 참조는 `apps/admin-dashboard/src/types/index.ts` 의 PD-7 블록이었고,
  그 블록 자체가 **소비처 0**(아래 B-3) 이라 실질 consumer 0 이다.
- `pharmacy.request_*` 3종은 직전 WO 가 "과거 row 판독" 목적으로 union 을 유지했으나,
  프로덕션 실측 결과 해당 row 가 0건이라 유지 근거가 소멸했다.

**ACTIVE_PRODUCER — 유지 24종**: `settlement.paid`(§11 로 활성화) · `lms.*` 3 · `market_trial.*` 8 ·
`contact.new` · `member.registration_*` 3 · `recruitment.*` 3 · `store.consultation_requested` ·
`store.product_request_*` 4 · `custom`.

## B-2. serialized contract 확인 (§12)

프로덕션 `notifications.type` distinct **16종**:

```text
contact.new 21 · custom 4 · lms.course_approved 16 · lms.course_rejected 1 ·
lms.course_submitted 11 · market_trial.approved 4 · market_trial.fulfilled 2 ·
market_trial.joined 4 · market_trial.outcome_confirming 1 ·
market_trial.recruiting_success 2 · member.registration_approved 16 ·
member.registration_pending 18 · store.consultation_requested 4 ·
store.product_request_approved 1 · store.product_request_rejected 1 ·
store.product_request_submitted 2
```

제거 대상 18종의 **저장 row = 0건** → DB serialized contract 0.
frontend switch · API response · test fixture 참조도 0건.
**alias/compatibility layer 는 불필요해 만들지 않았다.**

## B-3. admin-dashboard PD-7 블록 (dead mirror)

`apps/admin-dashboard/src/types/index.ts:196-212` 의 `NotificationChannel` ·
`NotificationType` · `interface Notification` 3종은 **소비처 0** 이었다.
화면이 실제로 쓰는 union 은 `pages/dashboard/unified/types.ts:102`
(`'system' | 'business' | 'organization' | 'information'`) 로 **전혀 다른 타입**이다.
즉 직전 WO 가 RETAIN 근거로 삼았던 "backend ↔ admin mirror 계약" 은 실재하지 않았다. → 제거.

## B-4. §11 settlement 수렴

`neture-settlement.service.ts` 의 `notifySupplierSettlementPaid` 는 canonical
정산 완료 producer 이며(호출처 1건), type 만 `'custom'` → **`'settlement.paid'`** 로 바꿨다.
legacy 전용 helper 는 없었고, **새 notification transport 는 만들지 않았다**(기존 `notificationService` 재사용).

---

# C. sellerops / supplierops / partnerops

## C-1. census

프로덕션 `app_registry` 등록 6종: `annualfee-yaksa` · `digital-signage` ·
`digital-signage-core` · `membership-yaksa` · `partnerops` · `reporting-yaksa`.

`AppRouteGuard` → `useAppStatus` → `GET /api/v1/apps/availability` → `app_registry` 이므로
**registry 미등록 appId 의 라우트는 항상 `/error/app-disabled` 로 리다이렉트된다.**

| 대상 | 판정 | 처리 |
|---|---|---|
| admin `/sellerops/*` + `pages/sellerops` 10파일 | **DEAD_CATALOG** | **제거** |
| admin `/supplierops/*` + `pages/supplierops` | **ACTIVE_RUNTIME** | RETAIN (아래 C-3) |
| admin `/partnerops/*` + 안내화면 2파일 | **COMPATIBILITY** | RETAIN — registry active · 직전 WO 가 의도적으로 만든 dead-flow 안내 |
| `appsCatalog` appId `partnerops` | **COMPATIBILITY** | RETAIN — registry 에 실제 등록됨 |
| `appsCatalog` appId `sellerops`/`supplierops` | 이미 없음 | `WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1` 에서 제거 완료 |
| ServiceGroup id `sellerops`/`supplierops`/`partnerops` | **COMPATIBILITY** | RETAIN — 살아 있는 카탈로그 항목이 소비 (C-4) |
| `packages/partnerops` (`@o4o/partnerops`) | **DEAD (소비처 0)** | **RETAIN + 보고** — package/lockfile 변경 = 중지 조건 |
| `2026012200002-SeedDefaultApps.ts` 의 partnerops 행 | **HISTORY_ONLY** | 불변 |

## C-2. sellerops 은퇴 근거 (§14 전부 충족)

```text
runtime route      0  — appId 'sellerops' registry 미등록 → 항상 app-disabled
menu/nav           0  — admin 전체에서 '/sellerops' 링크·navigate 0건
actual consumer    0  — 9화면 중 8화면이 setTimeout 데모 데이터
                        유일한 write POST /sellerops/listings 는 api-server 에 없음
                        (프로덕션 실측 404 text/html)
build entry        불필요 — lazy import 1곳뿐, 제거 후 빌드 통과
외부 plugin 계약   없음 — appsCatalog appId 0 · ViewComponentRegistry 등록 0
```

추가로 판매자(플랫폼 직접판매) 축은 `PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE` (2026-08-25).

직전 감사(§5-4)가 `pages/{sellerops,supplierops}` 를 보존 판정했으나, 본 WO §13-16 의
재census 로 sellerops 만 위 5조건을 모두 충족함이 확인되어 판정을 갱신했다.
`ViewComponentRegistry.ts` 의 해당 주석도 현재 상태에 맞게 갱신했다.

## C-3. ⚠️ supplierops — 별도 판단이 필요한 발견

`/supplierops/*` 역시 `supplierops` 가 `app_registry` 에 없어 **현재 도달 불가**다.
그러나 sellerops 와 달리 화면들이 **살아 있는 canonical backend** 를 호출한다.

```text
BulkImportPage          → /neture/supplier/csv-import/upload · /products/template
MarketingMaterials(+Create) → 공급자 콘텐츠 제출 (WO-O4O-SUPPLIER-CONTENT-SUBMISSION-PHASE1-V1)
SignageReport           → WO-O4O-SIGNAGE-SUPPLIER-REPORT-UI-V1
CampaignRequestPage     → WO-O4O-SIGNAGE-SUPPLIER-CAMPAIGN-REQUEST-V1
```

즉 이것은 legacy 잔여물이 아니라 **게이팅 결함(기능 은폐)** 이다.
"registry 에 등록한다" 와 "화면을 은퇴한다" 는 서로 반대 방향의 정책 결정이며 둘 다
본 WO 범위(작은 residue 정리) 밖이다. → **RETAIN + 별도 WO 제안.**

## C-4. serviceGroup id 를 유지한 이유

```text
sellerops   ← 'cosmetics-seller-extension' · 'market-trial'
supplierops ← 'market-trial'
partnerops  ← 'partner-core' (F7 · 살아 있음)
```

소비 중인 union 값이라 제거하면 `appsCatalog.ts` · `packages/cms-core/view-system/types.ts` ·
`middleware/tenant-context.middleware.ts` · `admin-apps.ts` · multi-tenant 테스트로 연쇄된다.
이름이 비슷하다는 이유로 `partner-core`/F7 은 건드리지 않았다.

## C-5. §16 재등록 방지

`apps/api-server/src/__tests__/legacy-followup-auth-notification-catalog-final-closure.spec.ts`
(신규, 30 케이스) 가 A·B·C 축 재등록을 정적으로 차단한다. DB·네트워크 접근 0.

---

# D. DROP_READY 테이블 2개 — **판정만 수행**

> §20 · §21 준수: **production DROP 0건 · DROP migration 파일 작성 0건.**
> `database/migrations/*` 는 merge 후 CI/CD 에서 자동 실행되므로 파일 작성 자체를
> 자동 destructive change 로 간주해 수행하지 않았다.

## D-1. `organization_product_applications`

```text
프로덕션 존재 여부 : 없음 (이미 제거됨)
```

**판정: RETAIN 불필요 · DROP 불요.** 대상이 존재하지 않으므로 추가 조치 없음.

## D-2. `store_events`

프로덕션 실측(read-only):

```text
row count        : 0
inbound FK       : 0
outbound FK      : store_events_organization_id_fkey → organizations
view 의존        : 0
trigger          : 0
index            : store_events_pkey · IDX_store_events_org · IDX_store_events_org_active
컬럼             : id, organization_id, title, description, image_url,
                   start_date, end_date, is_active, sort_order, created_at, updated_at
```

**판정: `DROP_APPROVED_READY`**

### §22 증거 패키지

| 항목 | 내용 |
|---|---|
| row 수 | 0 |
| 참조 무결성 | inbound FK 0 · view 0 · trigger 0 → 삭제 시 연쇄 영향 없음 |
| 백업 | row 0 이므로 데이터 백업 불필요. 스키마 원복은 아래 rollback SQL |
| rollback | `CREATE TABLE` + 인덱스 2개 재생성 (아래) |
| 실행 조건 | **명시적 production DROP 승인 필요.** 승인 전까지 실행하지 않는다 |

```sql
-- 실행 계획 (승인 후에만)
DROP TABLE IF EXISTS store_events;

-- rollback (스키마 원복)
CREATE TABLE store_events (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  title           varchar NOT NULL,
  description     text,
  image_url       varchar,
  start_date      timestamp,
  end_date        timestamp,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "IDX_store_events_org"        ON store_events (organization_id);
CREATE INDEX "IDX_store_events_org_active" ON store_events (organization_id, is_active);
```

> 위 `CREATE TABLE` 은 실측 컬럼 목록 기반 재구성이다. 실제 rollback 시에는
> 엔티티 정의(`store_events` Entity)와 대조해 타입·길이를 확정한다.

---

# E. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/common/middleware/auth/authorization.middleware.ts` | requirePermission·requireAnyPermission 제거 (320→195줄) |
| `apps/api-server/src/common/middleware/auth.middleware.ts` | 두 미들웨어 재수출 제거 |
| `apps/api-server/src/middleware/signage-role.middleware.ts` | permission 스냅샷 grant 분기 3곳 제거 |
| `apps/api-server/src/entities/Notification.ts` | NotificationType dead member 18 제거 |
| `apps/api-server/src/modules/neture/services/neture-settlement.service.ts` | `custom` → `settlement.paid` |
| `apps/admin-dashboard/src/types/index.ts` | dead PD-7 Notification 블록 3종 제거 |
| `apps/admin-dashboard/src/routes/apps.routes.tsx` | `/sellerops/*` 라우트 + lazy import 제거 |
| `apps/admin-dashboard/src/components/routing/ViewComponentRegistry.ts` | 주석 현행화 |
| `apps/admin-dashboard/src/pages/sellerops/**` (10파일) | 삭제 |
| `apps/api-server/src/__tests__/legacy-followup-auth-notification-catalog-final-closure.spec.ts` | 신규 재등록 방지 계약 (30 케이스) |

**미변경**: `database/migrations/**` · `package.json` · lockfile · Docker/CI ·
Frozen Baseline · `packages/partner-core` · `packages/partnerops` · `packages/organization-core`.

---

# F. 검증 결과

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | ✅ 통과 |
| api-server Jest (전체) | ✅ **219 suites / 3,641 tests 통과** |
| 신규 가드 spec | ✅ 30/30 통과 |
| admin-dashboard `tsc --noEmit` | ✅ 통과 |
| admin-dashboard Vitest | ✅ 13 files / 229 tests 통과 |
| admin-dashboard **`vite build`** | ✅ 통과 (§27 — Vitest 만으로 판정하지 않음) |
| `scripts/check-unsafe-routes.mjs` | ✅ 1,156 파일 · 위반 0 |
| `scripts/check-typeorm-entities.mjs` | ✅ 정합성 통과 |
| `scripts/lint-ratchet.mjs` | ✅ 62 errors (baseline 62 유지) |
| 프로덕션 read-only smoke | `/health` 200 · `/api/v1/sellerops/listings` 404 · `/api/v1/partnerops/dashboard` 404 |
| 금전 write | **0건** (§28) |
| production DROP · migration | **0건** (§20 · §21) |
| POS 개발 | **0건** (§33) |

---

# G. UNKNOWN / UNJUDGED / DEFERRED

## G-1. UNKNOWN

없음. D축 두 테이블 모두 프로덕션 read-only census 를 수행했으므로
`NO_PRODUCTION_DB_CENSUS` 해당 사항 없다.

## G-2. UNJUDGED

없음. A~D 전 대상에 판정을 부여했다.

## G-3. DEFERRED — 별도 WO 제안 5건

| # | 대상 | 사유 |
|---|---|---|
| 1 | **`/supplierops/*` 게이팅 결함** (C-3) | 살아 있는 backend 화면이 registry 미등록으로 도달 불가. 등록 vs 은퇴 = 정책 결정 |
| 2 | `packages/partnerops` (`@o4o/partnerops`) 삭제 | 소비처 0 · backend 마운트 0 이지만 package/lockfile 변경 = 중지 조건 |
| 3 | `@o4o/organization-core` `PermissionGuard` 제거 | 소비처 0 이지만 동결 Core(§3) 구조 변경 |
| 4 | JWT `permissions` claim · `users.permissions` 컬럼 · account-linking 병합 | auth contract / DB schema 변경 |
| 5 | `signage-role.middleware` 의 `user.dbRoles` 분기 4곳 | `dbRoles` relation 은 로드되지 않아 dead 이나, role 판정 축이라 A축 범위 밖 |

기타 잔여 관측: `apps/admin-dashboard/src/api/product-library.api.ts` 의
`searchProductMaster` 는 sellerops 제거로 admin 내 소비처 0 이 되었다.
범용 검색 helper 라 제거하지 않고 기록만 남긴다.

---

# H. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건
```

기준 문서(`docs/baseline/` · `docs/architecture/` · `docs/rules/`) 중 본 WO 범위와
충돌하는 서술은 발견되지 않았다. 갱신한 주석은 모두 소스 인라인이다.
