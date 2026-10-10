# O4O Pharmacy-Hub Service Model Baseline V1

> **상태**: ACTIVE — PharmacyHub 완전 폐기 정책. 서비스 운영 ACTIVE가 아니다.
> **확정일**: 2026-10-11 · **승인 근거**: 사용자의 PharmacyHub 전면 제거·재사용 없음·전용 데이터 제거 지시.
> **문서 작업**: #427. 아래 현행 정책은 이 문서의 이전 서비스 모델 전체와 연결된 정본의 PH 전용 계약을 대체한다. 공통·Neture 계약은 변경하지 않는다.

## 현행 정책: PharmacyHub 완전 폐기

1. **서비스와 기능**: PharmacyHub 앱·API·CI/CD·전용 Cloud Run/backend·가입·업무공간·operator capability·공급 opt-in·cart/checkout/payment producer를 제거한다. 재활성화·새 가입·역할 발급·서비스 복구를 하지 않는다. 현행 공통화·parity·Freeze의 유지/확장 대상으로 PH를 포함하지 않는다.
2. **식별자와 권한**: `pharmacy-hub` 서비스 등록, PH namespace의 membership/role/권한·호환 adapter를 제거 대상으로 삼는다. 옛 식별자를 공통 resolver·등록 목록에 남긴 사실은 현행 운영 근거가 아니다. Neture 및 다른 서비스의 가입·역할·권한은 유지한다.
3. **공급과 결제**: PH 직접 opt-in·`pharmacy_hub_cart` producer·PH 주문/결제 표면은 폐기한다. 공용 offer/checkout/payment/fulfillment/콘텐츠 테이블 전체를 지우지 않는다. `service_keys`에서 PH만 제거해 빈 배열의 기본 공급 의미로 상품이 새로 노출되지 않도록 현행 소비처와 노출 계약을 확인한다. Neture B2B·Store B2B·Neture 약국·구독 및 공통 PaymentCore/Freeze 계약은 그대로다.
4. **데이터**: PH 전용 데이터는 재사용을 위해 보관하지 않고 삭제한다. 실제 schema/FK·전용 귀속·타 서비스 소비처를 확인한 뒤 계획을 고정하고 transaction 단위로 삭제·잔여 검증한다. 공용 조직/사용자/상품/약사 자격/Neture 데이터는 PH 표기만으로 삭제하지 않는다. 법정 보유 대상은 별도 확인하며 서비스 폐기를 보유기간 면제로 해석하지 않는다. 과거 migration과 migration history는 보존하고 다시 실행하지 않는다.
5. **인쇄 QR 연결**: `pharmacyhub.co.kr`·`www.pharmacyhub.co.kr`의 도메인·DNS·인증서는 Neture 약국 리다이렉트에 필요한 연결 자원으로 유지한다. `/qr/*`, `/tablet/*`, `/multilingual-products/*`, `/foreign-visitor/affiliate/*`와 기타 호스트 경로는 Neture 약국으로 302 전환해 path/query를 보존한다. `/terms`·`/terms/`는 `/policy`로 전환한다. 실제 QR/tablet은 동작을 검증하고 없는 나머지 경로는 규칙을 검증한다. 인쇄 QR/Neture가 사용하는 공용 식별자와 연결은 삭제하지 않는다. 필요한 귀속 이전은 명시적인 이전·검증 후 수행한다.
6. **완료 경계**: 정책 확정·코드 push·main 병합·API 배포는 운영 삭제 완료와 다르다. 전체 호스트 전환·검증 후 PH backend 참조를 제거하고 전용 Cloud Run을 삭제한다. 현행 실행 상태와 blocker는 [폐기 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md)에 기록한다. 이 문서 작업은 운영 전환·데이터 삭제를 실행하지 않는다.

## 대체 범위와 우선순위

연결 문서에서 PH를 운영 중인 서비스·공통화 대상으로 열거하거나 가입/role/opt-in/checkout/parity를 유지하도록 한 **PH 전용 판정만** 위 1~6항으로 대체한다. 해당 절의 다른 서비스와 공통 계약은 그대로 유효하다. Frozen Distribution의 PH checkout 적용 축, Frozen Supplier의 PH 소비처 역시 이 승인된 별도 정본 작업으로 부분 대체하며 Neture/Common B2B/Core/Freeze는 유지한다. 각 연결 문서의 관련 절에도 부분 대체를 표기한다.

## 이전 서비스 계약 — SUPERSEDED 이력

아래 원문은 폐기 전 구조의 설명·감사 이력이다. 그 안의 ACTIVE·최종·유효·보존·가입/역할 발급·호환 유지 문구를 현행 PH 정책으로 적용하지 않는다. 아래에서 참조하는 공통·다른 서비스 문서의 비-PH 계약은 해당 정본을 따른다.

---

> **2026-10-09 실행 갱신:** PharmacyHub 전용 앱·API·배포 경로 제거는 [WO-O4O-PHARMACYHUB-RETIREMENT-V1](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-V1.md)이 현재 실행 범위다. 기존 식별자와 운영 데이터는 보존하며 운영 인프라 정리는 아직 미실행이다.

> **상태**: ACTIVE · **제정일**: 2026-08-21
> **근거 WO**: `WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1`
> **적용 범위**: Pharmacy-Hub 서비스의 역할 모델 · 가입 · 운영자 capability · 매장 HUB 공급 유입
> **호스트 정합 (2026-10-03)**: `pharmacyhub.co.kr` 은 **호환 호스트**다 — 새 독립 서비스를 두지 않고 기능은 약국 서비스(`pharmacy.neture.co.kr`)로 흡수하는 방향, `pharmacy-hub` 키 · role 은 호환 식별자로 보존 ([`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) §2-2 · `CHECK-O4O-URL-FIRST-CENSUS-V1` §9). 본문의 역할 모델은 그대로 유효하다.
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
| ① 운영자 승인 축 | `kpa-society` · `k-cosmetics` | 공급자 신청 → `offer_service_approvals` → 서비스 운영자 승인 | `modules/neture/constants/approval-service-keys.ts` |
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

> 2026-08-21 개정 — `WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1`
> 일반 약사 회원(`pharmacy-hub:member`) 을 추가하고, **자격(qualification) 축**을 역할 축과 분리해 명문화했다.

| Role | 가입 경로 | 성격 | 매장 경영 capability |
|---|---|---|:---:|
| `pharmacy-hub:member` | `/join` (self-signup) | **일반 약사 회원** — 서비스 회원 자격 | ✕ |
| `pharmacy-hub:store_owner` | `/join` (self-signup) | **약국 경영자** — 사업자 신분 | ○ |
| `pharmacy-hub:operator` | 사후 부여 | 서비스 운영 | ✕ |
| `pharmacy-hub:admin` | 사후 부여 | 구조·정책·거버넌스 | ✕ |

### 4-1. 세 축의 분리 (자격 ≠ 가입 유형 ≠ capability)

| 축 | 저장소 | Pharmacy-Hub 표현 |
|---|---|---|
| **Identity** | `users` | 공통 |
| **가입/승인** | `service_memberships` (`service_key`, `role`, `status`) | `pharmacy-hub:member` / `pharmacy-hub:store_owner` |
| **RBAC** | `role_assignments` | 승인 시 membership.role 을 그대로 부여 (member 는 **장부 기록**일 뿐 scope 아님) |
| **자격(Qualification)** | `kpa_pharmacist_profiles` (person 단위 — `service_key` 컬럼 없음) | 약사 면허·활동유형. **role 로 만들지 않는다** |

**왜 자격을 role 로 만들지 않는가 (KPA 선례):** `kpa:pharmacist` · `kpa:student` 는
`20260326300000-DeactivateQualificationRoles` 로 비활성화되고 profile 축으로 대체됐다.
자격 profile 은 **실제 자격 데이터가 있을 때만** 생성한다
(`auth-register.controller.ts` — `activityType` 또는 `licenseNumber` 가 있을 때만 write).
빈 skeleton profile 을 만들어 "약사임"을 표시하지 않는다.
Pharmacy-Hub 는 이 축을 **재사용**하며 전용 자격 테이블·전용 자격 role 을 신설하지 않는다.

### 4-2. 두 가입 유형의 유일한 차이

- **일반 약사 회원**: membership `status = 'active'` 만으로 커뮤니티·교육·콘텐츠를 이용한다.
  scope guard 를 통과할 필요가 없으므로 `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 에 **넣지 않는다**
  (넣으면 mapping 없는 scope 에서 fallback 으로 전체 allowedRoles 가 허용된다).
  `PharmacyHubStoreProvisioningService` 도 store_owner 가 아니면 `skipped` 이므로 매장/조직이 생기지 않는다.
- **약국 경영자**: 위에 **매장 경영 capability** 가 더해진다 (매장 HUB · 매장 경영 API · 조직/매장 프로비저닝).
- 승격은 사후 role/membership 변경이며, 가입 화면이 자격으로 이를 부여하지 않는다.

### 4-3. 가입 write-path SSOT

허용 목록은 `apps/api-server/src/constants/pharmacy-hub-signup-roles.ts` 하나다.
공통 Core(`AuthRegisterController.register`) 와 얇은 래퍼(`PharmacyHubJoinController`) 가 **같은 목록**을 본다.
과거 래퍼만 막고 Core 경로를 열어둬 우회 가입이 가능했던 잔여 결함이 있었다 — 목록 사본을 만들지 않는다.

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
7. `/join` 에 **member · store_owner 외** 역할 선택지 추가 (operator·admin·강사·공급자 self-signup)
8. `pharmacy-hub:member` 가 `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 또는 `scopeRoleMapping` 에 등장
   (= 일반 약사 회원이 매장 경영 capability 를 무단 획득)
9. 약사 **자격**을 뜻하는 role(`pharmacy-hub:pharmacist` 등) 신설 또는 Pharmacy-Hub 전용 자격 테이블 신설
10. 가입 write-path 가 `constants/pharmacy-hub-signup-roles.ts` 대신 자체 허용 목록을 갖는 것
11. 로그인 사용자 화면(홈 역할 카드 · 헤더/사이드 메뉴)에 **보유하지 않은 역할의 진입점**이 노출되는 것
    (클릭 시 "접근 권한이 없습니다" 로 끝나는 dead link — 판정은 `config/service.ts` 의
    `satisfiesRole` 하나로만 한다)

1~4 · 7~10 은 다음 spec 이 잠근다:
`apps/api-server/src/__tests__/pharmacy-hub-member-model-contract.spec.ts` ·
`apps/api-server/src/__tests__/security/pharmacy-hub-scope-guard.spec.ts`

---

## 8. 프로덕션 검증 상태 (최종)

> `WO-O4O-PHARMACYHUB-FINAL-ROLE-ENTRY-AND-PRODUCTION-ADOPTION-CLOSURE-V1` (2026-08-21)
> 실제 프로덕션(`pharmacyhub.co.kr` · `api.neture.co.kr`)에서 역할별 가입·승인·진입을
> end-to-end 로 검증했다. 아래가 **최종 상태**이며, 이 축은 더 이상 분할 WO 로 쪼개지 않는다.
> 상세 결과 → [`CHECK-O4O-PHARMACYHUB-FINAL-ROLE-ENTRY-AND-PRODUCTION-ADOPTION-CLOSURE-V1`](../checks/CHECK-O4O-PHARMACYHUB-FINAL-ROLE-ENTRY-AND-PRODUCTION-ADOPTION-CLOSURE-V1.md)

**활성 role 카탈로그 = 정확히 4개** (운영자 역할 관리 화면 실측 "역할 관리 (4개)"):
`pharmacy-hub:admin` · `pharmacy-hub:operator` · `pharmacy-hub:member` · `pharmacy-hub:store_owner`
— 모두 `is_active = is_assignable = true`. `pharmacy-hub:supplier` 는 둘 다 `false` 로
목록·배정 양쪽에서 닫혀 있다(row 는 이력 보존).

| 축 | 프로덕션 실측 |
|---|---|
| 일반 약사 회원 | `/join` member 선택 → 약국명 요구 없음 → pending → 운영자 승인 → 로그인 → `roles = ["pharmacy-hub:member"]` · `entryPoints = { storeOwner: false, operator: false }` |
| store_owner API (member 호출) | `403 FORBIDDEN · Required scope: pharmacy-hub:store_owner` |
| operator API (member 호출) | `403 FORBIDDEN · Required scope: pharmacy-hub:operator` |
| 약국 경영자 | `/join` store_owner 선택 → 약국명 필수 → 승인 → 프로비저닝(조직/매장 `connected`) → 매장 HUB·상품·콘텐츠·QR·매장정보 정상 |
| store_owner → operator 화면 | 라우트 차단 + API 403 |
| operator / admin | `/operator` 5화면 · `/admin` 법정정보 설정 정상. 운영자 화면에 **공급자 승인 기능 없음** |
| supplier 잔재 | route 0 · shell 0 · menu 0 · scope 0 (`supplierId` 등 Neture 공급 **데이터** 필드는 §6-A 로 정상) |

**`service_memberships.role` 표기**: PharmacyHub 는 prefixed 표기(`pharmacy-hub:<role>`)가 정본이다.
승인 시 `MembershipApprovalService` 가 이 값을 그대로 `role_assignments` 에 부여하기 때문이다.
prefix 없는 잔여 3건(`admin`/`operator`/`store_owner` — 모두 suspended 계정)은
`20270317000000-NormalizePharmacyHubBareMembershipRoles` 가 **이미 같은 prefixed role 을
활성 보유한 사용자에 한해서만**(EXISTS 가드) 표기를 교정한다. 권한 결과는 변하지 않는다
(authz 는 `role_assignments` + `membership.status` 만 읽고 `membership.role` 을 읽지 않는다).

---

## 9. 이전 문서 정정

아래는 **기록물(WO)이므로 편집하지 않는다** (CLAUDE.md §16-1). 현재 기준은 본 문서다.

| 기록물 | 당시 서술 | 현재 기준 |
|---|---|---|
| `WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1` | 가입 역할에 supplier 포함 | store_owner 단일 (§4) |
| `WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1` | `pharmacy-hub:supplier` 부여 | 해당 역할 없음 (§4) |
| `WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1` | 역할표에 Supplier | 4역할 (§4) |
| `WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1` | 가입 역할 = store_owner 단일 | member / store_owner 2유형 (§4) |
| `WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1` | Pharmacy-Hub 내 공급자 상품/주문 화면 | Neture 로 이동 (§3-2) |
| `WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1` | SupplierShell 공통 Core 채택 | shell 자체 제거 (§6-C) |

---

*Version: 1.0 · Status: ACTIVE*
