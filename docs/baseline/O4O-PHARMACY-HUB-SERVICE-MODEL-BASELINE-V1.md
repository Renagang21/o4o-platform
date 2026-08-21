# O4O Pharmacy-Hub Service Model Baseline V1

> **상태**: ACTIVE · **제정일**: 2026-08-21
> **근거 WO**: `WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1`
> **적용 범위**: Pharmacy-Hub 서비스의 역할 모델 · 가입 · 운영자 capability · 매장 HUB 공급 유입
> **상위 규칙**: [`CLAUDE.md`](../../CLAUDE.md) → [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) → [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md)

---

## 1. 핵심 판정문 (SSOT)

```text
PharmacyHub = KPA류 공통 매장경영 구조 − 공급 승인/매장지원 operator capability
```

**이 한 문장이 이 문서의 전부다.** Pharmacy-Hub 는 새로운 역할 모델·새로운 도메인이 아니라
**이미 있는 O4O/KPA류 공통 매장경영 구조에서 두 개의 operator capability 를 뺀 것**이다.

- 뺀 것 ①: **공급 승인** — Pharmacy-Hub 운영자는 공급자·상품을 승인하지 않는다.
- 뺀 것 ②: **매장 지원(공급자 대행)** — Pharmacy-Hub 운영자는 공급자 업무를 대행하지 않는다.
- 그 외 매장경영 기능은 **공통 Core 재사용**이며, Pharmacy-Hub 전용 재구현을 만들지 않는다.

따라서 **Pharmacy-Hub 의 차이는 기능 추가가 아니라 capability 축소로만 표현한다.**

---

## 2. 핵심 원칙 (9)

| # | 원칙 |
|---|------|
| 1 | Pharmacy-Hub 는 별도 역할 모델을 만들지 않는다. |
| 2 | **공급자는 Pharmacy-Hub 회원이 아니다.** |
| 3 | 공급자는 Neture 에서만 활동한다. |
| 4 | Neture 공급자가 Pharmacy-Hub 대상으로 등록한 결과는 **Pharmacy-Hub 운영자 승인 없이** 매장 HUB 로 유입된다. |
| 5 | Pharmacy-Hub 에는 supplier 회원가입 / `pharmacy-hub:supplier` membership / supplier 전용 shell / supplier 전용 가입 흐름을 **두지 않는다**. |
| 6 | Pharmacy-Hub 회원은 **약사·약국 경영자 중심**이다. |
| 7 | 강사·커뮤니티 운영자 등은 **가입 역할이 아니라 사후 부여 역할**이다 (self-signup 금지). |
| 8 | 약국 경영자 기능은 기존 O4O/KPA류 공통 Core 를 최대한 재사용한다. |
| 9 | Pharmacy-Hub 의 차이는 기능 추가가 아니라 **operator capability 축소**로 표현한다. |

---

## 3. 공급 흐름 (canonical)

```text
Neture supplier
  → Neture 에서 Pharmacy-Hub 대상 제공 설정 (/supplier/services/pharmacy-hub)
  → 공통 eligibility/offer 계약 (supplier_product_offers.service_keys + offer_service_prices)
  → 운영자 승인 없음
  → Pharmacy-Hub 매장 HUB 자동 노출
```

### 3-1. 두 개의 공급 축

플랫폼에는 공급자가 자기 Offer 를 서비스에 연결하는 축이 **두 가지** 있다. 섞지 않는다.

| 축 | 서비스 | 게이트 | 코드 SSOT |
|---|---|---|---|
| ① 운영자 승인 축 | `glycopharm` · `kpa-society` · `k-cosmetics` | 공급자 신청 → `offer_service_approvals` → 서비스 운영자 승인 | `modules/neture/constants/approval-service-keys.ts` |
| ② **공급자 직접 opt-in 축** | **`pharmacy-hub`** | 없음. `spo.service_keys` 포함 + 공급자 ACTIVE + 상품 ACTIVE 뿐 | `modules/neture/constants/supplier-optin-services.ts` |

한 서비스 키가 두 목록에 동시에 들어가면 같은 키를 두 계약이 다르게 해석한다.
`isSupplierOptinServiceKey()` 가 방어적으로 배제하지만, **목록 추가 전 이 문서에 먼저 명문화한다.**

### 3-2. 쓰기 경로 (유일)

| 계층 | 경로 |
|---|---|
| Frontend | `services/web-neture` → `/supplier/services/:serviceKey` (`SupplierServiceDeliveryPage`) |
| API | `GET/PATCH /api/v1/neture/supplier/services/:serviceKey/products[/:offerId/delivery]` |
| Controller | `apps/api-server/src/modules/neture/controllers/supplier-service-delivery.controller.ts` |
| Service | `NetureOfferService.setServiceDelivery(offerId, supplierId, serviceKey, {enabled, unitPrice})` |
| Guard | `requireAuth` + serviceKey allowlist + `createRequireActiveSupplier(dataSource)` — **membership scope 아님** |

> ⚠️ Neture 제품 등록 화면의 `updateDistribution()` 는 승인 축 전용이다. 비승인 키는
> `currentKeys` 에서만 보존되므로 입력으로 넣어도 조용히 탈락한다. `pharmacy-hub` 를
> `AVAILABLE_SERVICES` 에 넣어 해결하려 하지 않는다 — canonical 쓰기 경로는 위 표 하나다.

### 3-3. 읽기 경로 (매장 HUB, 이미 승인 무관)

`PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL` 은 `$1 = ANY(spo.service_keys)` + 공급자 ACTIVE +
master ACTIVE 만 본다. **`offer_service_approvals` 를 보지 않는다.** 즉 노출 게이트는
처음부터 승인 무관이었고, 이번 재정렬은 잘못 놓여 있던 **쓰기 경로의 이동**이다.

---

## 4. 역할 모델 (최종)

| Role | 가입 경로 | 성격 |
|---|---|---|
| `pharmacy-hub:store_owner` | `/join` (유일한 self-signup 역할) | 약국 경영자 — 사업자 신분 |
| `pharmacy-hub:operator` | 사후 부여 | 서비스 운영 |
| `pharmacy-hub:admin` | 사후 부여 | 구조·정책·거버넌스 |

- **`pharmacy-hub:supplier` 는 존재하지 않는다.** 역할 union · `ROLE_REGISTRY` ·
  `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` · `scopeRoleMapping` 어디에도 없다.
  `apps/api-server/src/__tests__/security/pharmacy-hub-scope-guard.spec.ts` 가 재유입을 잠근다.
- 강사·커뮤니티 운영자 등은 **가입 역할이 아니다**. 사후 부여만 허용한다 (원칙 7).
- `roles` 테이블의 seed row 와 migration `20270216000000` 은 **이력이므로 보존**한다
  (migration 은 불변 이력 — 편집 금지). 실사용 배정은 0건이었다 (§6).
- **카탈로그 폐기(해소됨)**: seed 직후 그 row 는 `is_assignable = true` · `is_active = true` 라
  운영자 역할 관리 화면(`roleService.getRolesByService('pharmacy-hub')`)에 **선택지로 남아 있었다**.
  `WO-O4O-PHARMACYHUB-RETIRED-SUPPLIER-ROLE-CATALOG-CLOSURE-V1` 이 신규 migration
  `20270314000000-DeactivatePharmacyHubSupplierRole` 로 `is_assignable = false` ·
  `is_active = false` 로 닫았다. role.service 의 조회·검증이 모두 `isActive: true` 필터이므로
  **목록 노출과 신규 배정이 동시에** 닫힌다. row 자체는 이력으로 보존한다(hard delete 금지).
  → [`CHECK-O4O-PHARMACYHUB-RETIRED-SUPPLIER-ROLE-CATALOG-CLOSURE-V1`](../checks/CHECK-O4O-PHARMACYHUB-RETIRED-SUPPLIER-ROLE-CATALOG-CLOSURE-V1.md)

---

## 5. Operator capability (KEEP / REMOVE)

| Capability | 판정 | 근거 |
|---|:---:|---|
| 회원 가입 **승인/반려** (`PharmacyHubMembershipConsoleController`) | **KEEP** | 서비스 자체 회원 관리. 공급 승인이 아니다. |
| 결제 fulfillment bridge 복구 (`PharmacyHubOperatorFulfillmentController`) | **KEEP** | 서비스 자체 운영(멱등·결제 상태/금액 불변·감사 로그). 공급 승인도, 매장 경영 대행도 아니다. |
| 매장·회원 조회, 운영 대시보드 | **KEEP** | 공통 Operator OS 재사용. |
| **공급자 승인 / 상품 승인** | **REMOVE (신설 금지)** | 원칙 4. Pharmacy-Hub 에는 승인 축이 없다. |
| **공급자 업무 대행(매장 지원)** | **REMOVE (신설 금지)** | 판정문의 "− 매장지원 operator capability". |

**금지**: 운영자에게 공급 승인 화면·엔드포인트를 추가하는 것. 필요가 생기면 이 문서를 먼저 고친다.

---

## 6. 매장 HUB 판정 (A/B/C/D)

| 구분 | 대상 | 판정 |
|---|---|---|
| A | 매장(약국 경영자) 상품 조회·상세·주문 (`PharmacyHubStoreProductController` 등) | **KEEP · COMMON** |
| B | 공통 매장경영 Core(대시보드·계정·알림·커뮤니티) | **KEEP · COMMON** |
| C | Pharmacy-Hub supplier 역할/가입/shell/menu/header/nav/홈 카드 | **REMOVE** |
| D | Pharmacy-Hub supplier 상품·주문 컨트롤러 | **MOVE-TO-NETURE** |

매장 측 응답 필드 `pharmacyHubUnitPrice` 는 **매장 화면 계약**이므로 그대로 둔다 (A).
공급자 측 응답만 서비스 중립 이름(`delivered` / `serviceUnitPrice`)으로 바꿨다.

---

## 7. 재유입 방지 (Drift Guard)

다음이 발견되면 **이 문서 위반**이다.

1. `pharmacy-hub:supplier` 역할·membership·scope 재등장
   (`roles` row 는 이력으로 보존하되 `is_active = false` 로 닫혀 있다 — 다시 `true` 로 되돌리는
   변경이 나타나면 그 자체가 신호다)
2. `services/web-pharmacy-hub` 에 `/supplier` route · SupplierShell · supplier 메뉴 재등장
3. `routes/pharmacy-hub/**` 에 `/supplier/*` 엔드포인트 재등장
4. Pharmacy-Hub 운영자 화면에 공급자/상품 **승인** 기능 등장
5. `supplier_product_offers` 를 Pharmacy-Hub 전용 테이블로 복제
6. Pharmacy-Hub 전용 supplier identity/원장 신설
7. `/join` 에 store_owner 외 역할 선택지 추가

---

## 8. 이전 문서 정정

아래는 **기록물(WO)이므로 편집하지 않는다** (CLAUDE.md §16-1). 현재 기준은 본 문서다.

| 기록물 | 당시 서술 | 현재 기준 |
|---|---|---|
| `WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1` | 가입 역할에 supplier 포함 | store_owner 단일 (§4) |
| `WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1` | `pharmacy-hub:supplier` 부여 | 해당 역할 없음 (§4) |
| `WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1` | 역할표에 Supplier | 3역할 (§4) |
| `WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1` | Pharmacy-Hub 내 공급자 상품/주문 화면 | Neture 로 이동 (§3-2) |
| `WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1` | SupplierShell 공통 Core 채택 | shell 자체 제거 (§6-C) |

---

*Version: 1.0 · Status: ACTIVE*
