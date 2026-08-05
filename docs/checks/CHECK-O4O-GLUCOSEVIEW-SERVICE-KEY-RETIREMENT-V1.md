# CHECK-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1

> **WO**: `WO-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1`
> **목표**: 과거 혈당측정 서비스에서 남은 `glucoseview` service key 를 코드·설정·UI에서 제거
> **선행**: [`CHECK-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1`](CHECK-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1.md)
> **일자**: 2026-08-05
> **판정**: ⛔ **STOPPED — 중지 조건 발동 (운영 DB에 `glucoseview` row 존재). 코드 변경 0건.**

---

## 0. 결론 요약

WO 의 원칙은 "**먼저 운영 DB의 `glucoseview` 사용 row를 read-only로 확인 / 운영 row 0일 때만 코드 제거**"
이고, 중지 조건 1번은 "**운영 DB에 `glucoseview` row 존재**" 다.

프로덕션 read-only census 결과 **`glucoseview` row 6건이 실재**한다.
따라서 **코드를 한 줄도 변경하지 않고 중지**했다. 아래는 census 와, 이후 재개할 때 그대로 쓸 수 있는
잔존 참조 전수 목록이다.

| 테이블 | row | 상태 |
|---|---:|---|
| `platform_services` | 1 | `code='glucoseview'` · **status = `active`** · `service_type='tool'` · `entry_url='https://glucoseview.co.kr'` · `approval_required=true` · `is_featured=false` |
| `roles` | 4 | `glucoseview:admin` / `:operator` / `:pharmacist` / `:user` — 전부 `is_active=true` |
| `operator_notification_settings` | 1 | `service_code='glucoseview'` (created 2026-02-04) |

이 row 들이 **현재 admin UI 의 표시 계약을 실제로 소비**하므로, 코드부터 지우면 회귀가 난다 (§3).

---

## 1. 운영 DB census (read-only)

접속: `cloud-sql-proxy` → `netureyoutube:asia-northeast3:o4o-platform-db` (전용 포트, 다른 세션 프록시 미간섭).
자격증명은 Cloud Run `o4o-core-api` 리비전 env 에서 **런타임에만** 읽었고 파일·문서·커밋에 남기지 않았다.
수행한 SQL 은 전부 `SELECT` / `information_schema` 조회다. **write 0.**

### 1-1. service key 계열 컬럼 전수 스캔

`information_schema.columns` 에서 컬럼명이 `service` 를 포함하는 `varchar`/`text`/`json(b)`/`ARRAY`
컬럼 전체를 동적으로 생성해 `ilike '%glucoseview%'` 로 집계했다.

| 컬럼 | 건수 |
|---|---:|
| `public.roles.service_key` | **4** |
| `public.operator_notification_settings.service_code` | **1** |
| 그 외 모든 service 계열 컬럼 | **0** |

0 으로 확인된 주요 축: `service_memberships.service_key` · `cms_contents."serviceKey"` ·
`cms_content_slots."serviceKey"` · `channels."serviceKey"` · `platform_store_policies.service_key` ·
`platform_store_slugs.service_key` · `offer_service_approvals.service_key` ·
`service_point_budgets.service_key` · `organization_product_listings.service_key` ·
`signage_*` 전 계열 · `store_*` 전 계열.

### 1-2. 개별 확인

| 확인 | 결과 |
|---|---|
| `platform_services` | `glucoseview \| GlucoseView \| status=active \| type=tool \| featured=false \| entry=https://glucoseview.co.kr \| approval_required=true` |
| `platform_services` 전체 code | `glycopharm, kpa-society, k-cosmetics, neture, kpa, cosmetics, kpa-groupbuy, **glucoseview**, pharmacy-hub` |
| `roles` (service_key='glucoseview') | 4행 — `glucoseview:admin` `glucoseview:operator` `glucoseview:pharmacist` `glucoseview:user`, 전부 `is_active=true` |
| **`role_assignments` 중 role 이 `glucose*`** | **0 (active 0)** — 실제로 이 역할을 보유한 사용자 없음 |
| `service_memberships` | **0** |
| 테이블명에 `glucose` 포함 | **0** (`20260600000000-DropGlucoseviewAndCgmTables` 로 이미 DROP) |
| `glucose` 라벨을 가진 **enum** | **0** |
| 정의에 `glucose` 를 포함한 **CHECK 제약** | **0** |

> **중요**: DB enum·CHECK 제약에는 `glucoseview` 가 **없다**. 즉 후속 DB 작업은 "enum 값 제거"가 아니라
> **데이터 row 정리**(platform_services 1 / roles 4 / operator_notification_settings 1)다.
> WO 말미의 "필요할 경우 DB enum·CHECK 제약 마이그레이션 WO" 는 **불필요**한 것으로 확정됐다.

---

## 2. 중지 조건 대조

| 중지 조건 | 해당 | 근거 |
|---|:---:|---|
| 운영 DB에 `glucoseview` row 존재 | ⛔ **해당** | §1 — 6행 |
| 현재 서비스가 해당 key를 실제 소비 | ⛔ **부분 해당** | `platform_services` 행이 `status='active'` 이며, admin RBAC 카탈로그가 살아있는 `roles` 4행의 라벨·badge 를 이 key 로 렌더한다 (§3) |
| 코드 제거에 DB enum·CHECK 제약 변경이 필수 | ✅ 미해당 | enum·CHECK 에 `glucoseview` 없음 |
| 공유 enum 변경이 예상보다 넓게 확장 | ✅ 미해당 | 확장 필요 없음 |

첫 번째 조건만으로 중지 요건이 성립하므로 **코드 변경 없이 중지**했다.

---

## 3. 왜 "코드부터 지우면 안 되는가" — 실제 회귀 경로

| 코드 | 역할 | DB row 가 남은 채 지우면 |
|---|---|---|
| [apps/admin-dashboard/src/lib/rbac-catalog.ts](../../apps/admin-dashboard/src/lib/rbac-catalog.ts):17·34·138 | `ServiceKey` union 멤버 + `SERVICE_META` 라벨·badge + `EXCLUDED_FROM_FACET` | 살아있는 `glucoseview:*` **4개 role 이 admin 역할 목록에서 라벨·색상 없이 깨진다.** 해당 파일 주석이 이미 "신규 할당 옵션에서는 제외하되 **표시·badge 는 정상 유지**" 라고 의도를 명시하고 있다 |
| [apps/admin-dashboard/src/hooks/useOperatorPolicy.ts](../../apps/admin-dashboard/src/hooks/useOperatorPolicy.ts):100 | `scope.startsWith('glucoseview:')` → `'glycocare'` 매핑 | 위 4개 role scope 의 정책 도메인 해석이 사라진다 |
| [apps/admin-dashboard/src/pages/operator/PointBudgetPage.tsx](../../apps/admin-dashboard/src/pages/operator/PointBudgetPage.tsx):67 | 서비스 라벨 맵 `'glucoseview': '글루코스뷰'` | `service_point_budgets` row 는 0 이라 당장은 무해하나, `platform_services` 가 active 인 동안은 노출 후보 |
| `platform_services` 소비 화면 (`PlatformServicesPage`, `RecommendedServicesSection` 등) | DB 카탈로그를 그대로 렌더 | 코드가 아니라 **DB 행**이 소스이므로, 코드만 지워도 `glucoseview` 는 계속 노출된다 |

즉 **순서가 반대**다. 올바른 순서는 **DB row 정리 → 코드 제거**다.

---

## 4. 잔존 참조 전수 (재개 시 그대로 사용)

식별자 `glucoseview` / `glucoseView` / `GlucoseView` / `GLUCOSEVIEW` / `glucose_view` 전역 검색:
**102 파일 / 290 occurrence**. 아래는 **주석·문서·migration 을 제외한 실 코드**만 분류한 것이다.

### 4-A. DB row 정리 후 제거 대상 (BLOCKED — 지금 건드리면 안 됨)

| 파일 | 라인 | 내용 |
|---|---:|---|
| `apps/admin-dashboard/src/lib/rbac-catalog.ts` | 17 · 34 · 138 | `ServiceKey` union · `SERVICE_META` entry · `EXCLUDED_FROM_FACET` |
| `apps/admin-dashboard/src/hooks/useOperatorPolicy.ts` | 100 | `scope.startsWith('glucoseview:')` |
| `apps/admin-dashboard/src/pages/operator/PointBudgetPage.tsx` | 67 | 라벨 맵 |

### 4-B. row 0 이지만 정책 판단 필요 (UNBLOCKED, 그러나 본 WO 중지로 미수행)

| 파일 | 라인 | 내용 | 비고 |
|---|---:|---|---|
| `apps/api-server/src/routes/cms-content/cms-content-slot.handler.ts` | 42 | `SCOPE_TO_CMS_KEYS` 의 `glucoseview: ['glucoseview']` | cms 관련 row 0 |
| `apps/api-server/src/routes/kpa/controllers/supplier-campaign-request.controller.ts` | 36 | `ALLOWED_SERVICES` 에 `'glucoseview'` | 캠페인 요청 허용 서비스 |
| `apps/api-server/src/modules/neture/services/offer.service.ts` | 1028 | `filter(k => k !== 'neture' && k !== 'glucoseview')` | **방어 필터** — 제거 시 승인 정책이 완화되는 방향이라 신중 |
| `apps/api-server/src/modules/partner/entities/PartnerApplication.ts` | 21 | `ServiceInterest = 'GlycoPharm' \| 'K-Cosmetics' \| 'GlucoseView'` | union 축소는 파트너 신청 데이터 확인 선행 필요 |
| `apps/api-server/src/database/entities.ts` | 168-170 | 내용 없는 `// GLUCOSEVIEW ENTITIES` 배너 주석 | **완전 dead** — 가장 안전한 제거 후보 |

### 4-C. 디버그·테스트 (별도 판단)

| 파일 | 라인 | 내용 |
|---|---:|---|
| `apps/api-server/src/routes/debug/user-debug.controller.ts` | 335 | 진단용 `allServices` 배열 |
| `apps/api-server/src/routes/debug/approval-test.controller.ts` | 90 | 진단 HTML 버튼 |
| `apps/api-server/src/__tests__/security/cross-service.spec.ts` | 17 · 41 · 67 · 87 | `'glucoseview:admin'` — **타 서비스 scope 가 차단되는지** 검증하는 음성 fixture |
| `apps/api-server/src/__tests__/kpa-role-guard.spec.ts` | 82 | 동일 목적 |

> 테스트 4-C 는 "존재하지 않는 서비스 scope 도 거부되는가" 를 확인하는 **음성 대조군**이므로,
> key 폐지 후에도 그대로 두는 편이 검출력 유지에 유리하다. 교체한다면 다른 미등록 key 로 치환한다.

### 4-D. 동명이인 — 제거 대상 아님 (RETAIN)

| 항목 | 이유 |
|---|---|
| `apps/api-server/src/routes/glycopharm/controllers/public.controller.ts:58` · `services/web-glycopharm/src/api/public.ts:76` 의 `supplier: 'GlucoseView'` | **fallback mock 데이터의 공급자 표시 문자열**. service key 가 아니다 |
| `packages/security-core/src/service-scope-guard.ts:32` 등 다수 | JSDoc **예시 주석**. 실행 코드 아님 |
| `apps/api-server/src/database/migrations/**` (약 30 파일) | **실행 이력**. WO 제외 범위 — 삭제 금지 |
| `apps/api-server/src/utils/operator-alert.utils.ts` | 주석의 origin WO 표기 |
| GlycoPharm CGM 제품 기능 · `pharmacy-ai-insight` · 일반 health check | WO 제외 범위 |
| `docs/**` (약 60 파일) | 감사·CHECK **기록 문서**. 이력 보존 |

### 4-E. 이미 정리 완료 (선행 WO)

`WO-O4O-SHARED-PACKAGES-GLUCOSEVIEW-RESIDUE-CLEANUP-V1` / `WO-O4O-GLUCOSEVIEW-RESIDUAL-CLEANUP-PHASE1-V1` /
`WO-O4O-API-SERVER-AUTH-GLUCOSEVIEW-RESIDUE-CLEANUP-V1` / `WO-O4O-GLUCOSEVIEW-POST-DROP-CLEANUP-V1` /
`WO-NETURE-EXCLUDE-GLUCOSEVIEW-FROM-PRODUCT-SERVICE-SELECTION-V1` 로
CMS 필터·채널·슬롯 옵션, service-applications union, 공유 패키지 badge/option, store 정책 entity,
auth allowed origin, glycopharm 디버그 endpoint 등은 **이미 제거**되었고 자리마다 사유 주석만 남아 있다.
`apps/api-server/src/constants/service-keys.ts` 의 canonical `SERVICE_KEYS` 에도 `glucoseview` 는 **없다**.

---

## 5. 수행하지 않은 것

| 항목 | 상태 |
|---|:---:|
| 코드·설정·UI 변경 | **0건** |
| DB write | **0건** (read-only SELECT 만) |
| migration 생성·삭제 | **0건** |
| commit / push | **본 CHECK 문서 1개만** |
| 병렬 세션 WIP (`hff-zh-*`) | **미접촉** |

typecheck·test·build·CI 검증은 변경이 없으므로 수행하지 않았다(직전 커밋 `898862460` 기준 CI GREEN 상태 유지).

---

## 6. 재개 조건 — 권장 순서

1. **DB row 정리 WO** (사용자 승인 필요 — write 작업)
   - `platform_services` 의 `glucoseview` 행: `status` 를 비활성으로 내리거나 삭제
   - `roles` 4행: `role_assignments` 참조가 **0** 이므로 안전하게 비활성화/삭제 가능
   - `operator_notification_settings` 1행 정리
   - enum·CHECK 제약 변경은 **불필요** (§1-2)
2. 정리 후 재-census → row 0 확인
3. 그때 본 WO 재개: §4-A → §4-B → §4-C 순으로 코드 제거 + typecheck·test·build·CI

---

## 7. 후속 DB migration 필요 여부 (WO 보고 항목)

| 질문 | 답 |
|---|---|
| DB enum 값 제거 migration 필요? | **불필요** — `glucoseview` 라벨을 가진 enum 0건 |
| CHECK 제약 변경 migration 필요? | **불필요** — 해당 정의 0건 |
| 그렇다면 무엇이 필요한가? | **데이터 row 정리 migration** — `platform_services` 1 / `roles` 4 / `operator_notification_settings` 1. 전부 `role_assignments` 참조 0 이라 FK 연쇄 없음 |
