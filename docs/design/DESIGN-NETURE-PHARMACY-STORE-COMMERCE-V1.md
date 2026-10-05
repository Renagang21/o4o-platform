# DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05 (§13 인증·가입 트랙 인계 계약 · §14 K-Cosmetics 퇴역 반영 · §15 미완료 범위 · 구현 결정 반영)
> **근거 WO/IR**: [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](../work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) 단계 1-7 · 입력 [`IR-NETURE-PHARMACY-STORE-COMMERCE-STEP1-CENSUS-V1`](../investigations/IR-NETURE-PHARMACY-STORE-COMMERCE-STEP1-CENSUS-V1.md)

Neture 약국 서비스의 **약국별 하나의 내 매장 · 기본 가입 · 세미프랜차이즈 가입 · 복수 공급 제안 · 선택 제안 주문 · 테스트 결제** 를 구현하기 위한 확정 설계다. IR 의 "사용자 판단 필요" 항목 중 기술 항목은 여기서 근거와 함께 확정한다(WO 단계 1 "보류" 절의 마지막 항목). 사업 판단 항목은 §11 에 남긴다.

설계 원칙:

- **대체, 누적 아님.** Neture 약국 흐름의 이용 자격은 새 기본 가입 · 세미프랜차이즈 가입 · 대상 약국 조건으로 **판정한다**. 과거 축(`kpa-society` service membership · `kpa:store_owner` · `offer_service_approvals(kpa-society)` · `distribution_type` · `allowed_seller_ids`)을 AND 로 덧붙이지 않는다. 그 축들은 다른 서비스 흐름을 위해 **코드와 데이터를 보존**하되 Neture 약국 흐름의 판정에는 쓰지 않는다.
- **세미프랜차이즈는 serviceKey 가 아니라 데이터 행이다.** 세미프랜차이즈를 추가할 때 코드 분기를 늘리지 않는다.
- **재고 · 이벤트 수량 · 구매 한도 · 예약 · 차감 · 복원 로직은 함수 그대로 재사용한다.** 새로 짜지 않는다.
- 범용 권한 엔진 · 업종 확장 프레임워크 · 다중 PG 프레임워크를 만들지 않는다. 판정 SQL 은 한 모듈(§6 SSOT)에만 둔다.
- 테스트 데이터 승계 · backfill · 옛 주문 읽기 호환을 만들지 않는다(WO §6).

---

## 1. 8개 관계

| # | 관계 | 저장 | 카디널리티 · 제약 |
|---|---|---|---|
| R1 | 약국 조직 ↔ 내 매장 | `organizations` 행 1개 = 약국 = 내 매장 (기존 정의) | 같은 행. 별도 store 테이블 없음 |
| R2 | 약국 조직 ↔ Neture 기본 가입 | **신규** `neture_pharmacy_memberships` | `organization_id UNIQUE` → 약국 1 : 기본 가입 1 : 매장 1. 사용자당 owner 약국 1개(앱 검사) · 진행 중 사업자번호 중복 금지(부분 UNIQUE) |
| R3 | 약국 조직 ↔ 세미프랜차이즈 가입 | **신규** `semi_franchise_memberships` | `UNIQUE(semi_franchise_id, organization_id)`. 한 약국 N 세미프랜차이즈. 재신청은 같은 행을 `pending` 으로 되돌린다 |
| R4 | 운영자 ↔ 담당 세미프랜차이즈 | **신규** `semi_franchise_operators` | `UNIQUE(semi_franchise_id, user_id) WHERE revoked_at IS NULL`. 판정 = `neture:operator` role ∧ 활성 담당 행 |
| R5 | 제품 ↔ 복수 공급 제안 | 제품 = `supplier_product_offers`(SPO, 공급자 × master 1행 · 설명 · 재고 · 기본가 유지) → **신규** `supply_proposals`(SPO 하위 N행, 가격 · 대상 · 승인만) | SPO unique 유지(CHECK 판정 A). 제안은 unique 없음 |
| R6 | 제안 ↔ 대상 | `supply_proposals.semi_franchise_id`(필수) + `target_organization_id`(선택, 개별 약국) | 개별 약국 대상도 그 세미프랜차이즈 가입 active 필요 |
| R7 | 제안 ↔ 주문 항목 | `store_cart_items.supply_proposal_id` · `seller_recruitment_id`(신규 컬럼) + 기존 `event_offer_id` → `checkout_orders.items[].metadata` 스냅샷 | 주문 항목은 jsonb 스냅샷(별도 item 테이블 없음, 기존 구조) |
| R8 | 주문 · 결제 ↔ 수취 주체 | `semi_franchises.payment_receiver_key`(NULL = 미확정) → `checkout_orders.metadata.receiverKey` · `o4o_payments.metadata.receiverKey` | 수취 주체가 다른 주문은 같은 `paymentGroupId` 에 넣지 않는다 |

공급 경로 4종(주문 항목의 `supplyKind`):

| supplyKind | 원장 | 대상 세미프랜차이즈 | 단가 | 승인 |
|---|---|---|---|---|
| `default` | SPO (공급처 미지정 = `service_keys` 비어 있음) | `pharmacy` 고정 | `spo.price_general` | 제품 등록 승인(Neture 운영자)만 |
| `proposal` | `supply_proposals` | 제안의 `semi_franchise_id` | `proposal.unit_price` | 제품 등록 승인 + 대상 세미프랜차이즈 담당 운영자 승인 |
| `event` | `organization_product_listings`(`service_key='neture-event-offer'`, `source_type='event-offer'`) | 이벤트 행의 `organization_id` = 세미프랜차이즈 운영 조직 | `opl.event_price` | 대상 세미프랜차이즈 담당 운영자 승인 |
| `recruitment` | `seller_recruitments` + 조직 단위 `seller_recruitment_applications` | 모집의 `semi_franchise_id` | `recruitment.supply_unit_price` | 운영자 조건 승인(`exposure_status`) + 공급자 참여 승인 |

---

## 2. 스키마 변경 (migration 1개 — `CreateNeturePharmacyCommerce<epoch13>`)

신규 테이블:

```text
neture_pharmacy_memberships
  id uuid PK, organization_id uuid NOT NULL UNIQUE → organizations(id) ON DELETE CASCADE,
  applicant_user_id uuid NOT NULL → users(id),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (pending|active|rejected|suspended|terminated),
  pharmacy_name varchar(255) NOT NULL, business_number varchar(20) NOT NULL,
  pharmacist_license_number varchar(30) NOT NULL,
  applied_at, decided_by uuid NULL, decided_at NULL, reason text NULL, created_at, updated_at
  UNIQUE (business_number) WHERE status IN ('pending','active','suspended')

semi_franchises
  id uuid PK, key varchar(64) NOT NULL UNIQUE, name varchar(255) NOT NULL,
  organization_id uuid NOT NULL UNIQUE → organizations(id)   -- 운영 조직(이벤트 원장 소유)
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (active|closed),
  payment_receiver_key varchar(100) NULL,                     -- D1: NULL = 수취 주체 미확정
  community_key varchar(100) NULL UNIQUE,                     -- 세미프랜차이즈 커뮤니티(communities.slug)
  created_at, updated_at
  seed: key='pharmacy' (+ 운영 조직 organizations(type='semi_franchise', code='semi-franchise-pharmacy'))

semi_franchise_memberships
  id uuid PK, semi_franchise_id → semi_franchises, organization_id → organizations,
  status CHECK (pending|active|rejected|suspended|terminated),
  applied_by uuid, applied_at, decided_by NULL, decided_at NULL, reason NULL, created_at, updated_at,
  UNIQUE (semi_franchise_id, organization_id), INDEX (organization_id, status)

semi_franchise_operators
  id uuid PK, semi_franchise_id → semi_franchises, user_id → users,
  assigned_by uuid, assigned_at, revoked_at NULL,
  UNIQUE (semi_franchise_id, user_id) WHERE revoked_at IS NULL

supply_proposals
  id uuid PK, offer_id → supplier_product_offers(id) ON DELETE CASCADE,
  semi_franchise_id → semi_franchises, target_organization_id → organizations NULL,
  unit_price int NOT NULL CHECK (unit_price > 0), note text NULL,
  status CHECK (pending|approved|rejected|ended),
  requested_by uuid, decided_by NULL, decided_at NULL, reason NULL, ended_at NULL, created_at, updated_at,
  INDEX (offer_id), INDEX (semi_franchise_id, status)
```

기존 테이블 변경:

| 테이블 | 변경 | 이유 |
|---|---|---|
| `store_cart_items` | `+ supply_proposal_id uuid NULL`, `+ seller_recruitment_id uuid NULL` | R7 — 선택한 제안을 장바구니에 저장 |
| `seller_recruitments` | `+ semi_franchise_id uuid NULL`, `+ supply_unit_price int NULL` | 모집의 대상 경로 · 모집 공급 조건 가격(IR B §4) |
| `seller_recruitment_applications` | `+ applicant_organization_id uuid NULL` + `UNIQUE (recruitment_id, applicant_organization_id) WHERE applicant_organization_id IS NOT NULL` | 참여 단위 = 약국 조직(WO §3-6) |
| `organization_product_listings` | `idx_org_listing_unique_v2` 를 `WHERE service_key <> 'neture-event-offer'` 부분 UNIQUE 로 교체 | 세미프랜차이즈 이벤트 원장만 재신청 · 같은 제품 복수 승인 이벤트(WO §3-5). KPA/KCos 이벤트 원장 · 진열 행(`source_type='event-offer'` 매장 진열 포함) 유일성은 그대로 |
| `seller_recruitments` | UNIQUE 를 `(product_id, seller_id, service_id, semi_franchise_id) NULLS NOT DISTINCT` 로 | 세미프랜차이즈별 모집 1건. 기존 행(semi_franchise_id NULL) 유일성 동일 |

- `idx_org_listing_unique_v2` 를 쓰는 `ON CONFLICT (organization_id, service_key, offer_id)` 소비처 9곳에 같은 predicate(`WHERE service_key <> 'neture-event-offer'`)를 붙인다. PostgreSQL 은 predicate 를 준 ON CONFLICT 가 비부분 인덱스도 추론하므로 **코드 변경을 migration 보다 먼저 배포해도 안전**하다.
- 만들지 않는 것: `checkout_orders` 컬럼(서비스 · 수취 주체는 metadata), 독립 `*_orders` · `*_payments`, `neture_orders` · `o4o_payments` unique 인덱스(운영 중복 데이터가 있으면 migration 이 깨질 수 있으므로 멱등은 advisory lock + 조건부 UPDATE 로 코드에서 보장 — §8).
- migration 규약: epoch13 은 manifest 최대값 초과, `manifest.ts` append + `expected-schema-states.ts` 지문을 같은 커밋에(격리 PostgreSQL 15 실행값). ESM 엔티티 규칙(CLAUDE.md §2).

---

## 3. 가입 · 승인 흐름

### 3-1. Neture 기본 가입 (R2)

```text
약국 사용자 (로그인만 된 계정)
 → POST /api/v1/neture/pharmacy/membership {pharmacyName, businessNumber, pharmacistLicenseNumber, address?, phone?}
     · 이미 owner 인 Neture 약국이 있으면 409 · 진행 중 사업자번호 중복 409
     · 트랜잭션: organizations(type='pharmacy', code='neture-pharm-<uuid12>', business_number)
                 + organization_members(owner) + neture_pharmacy_memberships(pending)
 → (Neture 운영자) GET  /api/v1/neture/operator/pharmacy-memberships?status=
                   POST .../:id/approve | reject {reason} | suspend {reason} | terminate {reason} | reactivate
     guard: requireAuth → requireNetureScope('neture:operator')
     · 자격 확인 = 운영자가 신청 원장의 사업자번호 · 약사 면허번호를 검토(operator_review). 점수 · 자동 검증 없음
 → active 가 되면 내 매장 기본 기능 이용(§5)
```

- `kpa-society` 가입 · `kpa_members` · `kpa_pharmacist_profiles` 를 자격 근거로 읽지 않는다(재해석 금지). 기존 가입자를 자동 전환하지 않는다.
- 기본 승인은 어떤 세미프랜차이즈 가입도 만들지 않는다.
- 상태 전이: `pending→active|rejected`, `active→suspended|terminated`, `suspended→active|terminated`, `rejected|terminated→pending`(재신청, 같은 행).

### 3-2. 세미프랜차이즈 가입 (R3) · 운영자 담당 (R4)

```text
약국(기본 가입 active) → POST /api/v1/neture/pharmacy/semi-franchises/:key/apply      (pending)
                       → POST /api/v1/neture/pharmacy/semi-franchises/:key/withdraw   (terminated)
                       → GET  /api/v1/neture/pharmacy/semi-franchises                  (목록 + 내 가입 상태)
담당 운영자            → GET  /api/v1/neture/operator/semi-franchises/:key/memberships
                       → POST /api/v1/neture/operator/semi-franchises/:key/memberships/:id/{approve|reject|suspend|terminate|reactivate}
                         guard: neture:operator ∧ semi_franchise_operators 활성 행(:key) — 아니면 403 NOT_SEMI_FRANCHISE_OPERATOR
Neture 관리자          → POST /api/v1/neture/admin/semi-franchises                      (생성: 행 + 운영 조직)
                       → POST/DELETE /api/v1/neture/admin/semi-franchises/:key/operators (담당 지정 · 해제)
                         guard: neture:admin
```

- `pharmacy` 도 같은 절차다(자동 가입 없음).
- 세미프랜차이즈 운영자는 약국 자격을 독립적으로 확인할 수 있도록 신청 목록에 기본 가입 원장의 사업자번호 · 면허번호 · 기본 가입 상태를 함께 보여준다.
- 운영 role 은 기존 `neture:operator` 를 재사용한다(새 role 없음 → F9 role 추가 절차 불필요). "어느 세미프랜차이즈인가" 는 담당 행이 정한다. `role_assignments.scope_id` 는 쓰지 않는다(부분 유니크 때문에 불가 — IR A §3-3).

### 3-3. 공급자 · 제품 등록 (현행 유지 + 결함 1건 수정)

- 공급자 가입 승인: 현행 유지(`neture_suppliers` PENDING→ACTIVE, `supplier:operator`).
- 제품 등록 승인 = `supplier_product_offers.approval_status = 'APPROVED'`. 승인자는 Neture 운영자(현행 `approveProduct`).
- **수정**: 공급처 미지정(`service_keys` 비어 있음) 제품은 OSA 행이 0 이라 `approveProduct` 로 APPROVED 가 될 수 없었다(IR B §1-3 결함). OSA 행이 하나도 없으면 `approval_status='APPROVED'`, `is_active=true` 를 직접 기록한다. OSA 행이 있는 제품(다른 서비스 흐름)은 기존 파생 규칙 그대로. → Supplier Domain §4 "approval_status = OSA 파생" 에 "OSA 0행 = 제품 등록 승인 직접 기록" 예외를 이 WO 근거로 명시한다(§10).

### 3-4. 공급 제안 (R5 · R6)

```text
공급자(ACTIVE, 자기 SPO, SPO APPROVED)
 → POST /api/v1/neture/supplier/supply-proposals {offerId, semiFranchiseKey, targetOrganizationId?, unitPrice, note?}  (pending)
 → POST /api/v1/neture/supplier/supply-proposals/:id/end                                                              (ended — 가격 변경은 종료 후 새 제안)
 → GET  /api/v1/neture/supplier/supply-proposals
담당 운영자
 → GET  /api/v1/neture/operator/semi-franchises/:key/supply-proposals?status=
 → POST .../:id/approve | reject {reason} | end {reason}
```

- 제안 가격 수정 경로를 두지 않는다. 같은 제품 · 같은 세미프랜차이즈 복수 제안 허용.
- 개별 약국 대상 제안: 대상 약국이 그 세미프랜차이즈 가입 active 일 때만 노출 · 주문.
- 제안 반려 · 종료는 제품(SPO) 상태에 연쇄하지 않는다.

### 3-5. 이벤트

```text
공급자 → POST /api/v1/neture/supplier/semi-franchise-events {offerId, semiFranchiseKey, eventPrice, startAt, endAt, totalQuantity?, perStoreLimit?, perOrderLimit?}
         → OPL(organization_id = 세미프랜차이즈 운영 조직, service_key='neture-event-offer', source_type='event-offer', status='pending')
         · eventPrice ≤ spo.price_general, 기간 필수(기존 createListing 규칙)
       → POST .../:id/cancel   (status='canceled', is_active=false — 삭제 · 종료)
담당 운영자 → GET .../semi-franchises/:key/events?status=  ·  POST .../events/:id/{approve|reject|cancel}
```

- 가격 수정 경로 없음. 재신청 = 새 행(§2 부분 인덱스로 가능). 같은 제품 복수 승인 이벤트 공존.
- 종료는 단방향: Neture 이벤트에는 visibility 토글이 없다. KPA `groupbuy-admin/:id/visibility` 의 canceled→approved 되돌림은 **수정**한다(종료된 행은 되살리지 않음 — 승인 우회 제거).
- 주문은 OPL 을 jsonb 로만 참조하므로 취소해도 주문 기록이 손상되지 않는다(현행).
- 수량 · 한도 · 예약 · 복원은 `reserveEventOfferListing` · `incrementListingQuantity` · `STORE_ORDERED_QTY_SQL` 을 그대로 호출한다.

### 3-6. 취급매장 모집

```text
공급자 → POST /api/v1/neture/supplier/seller-recruitments {..., semiFranchiseKey, supplyUnitPrice}   (기존 생성 경로에 2필드)
담당 운영자 → 조건 승인 = 기존 exposure_status 승인 (재승인 반복 없음) — 담당 세미프랜차이즈만
약국(그 세미프랜차이즈 가입 active) → 신청 시 applicant_organization_id = 내 약국 조직
공급자 → 참여 승인(기존 approveApplication) → 승인 약국은 바로 주문(supplyKind='recruitment', 단가 = supply_unit_price)
```

- Neture 약국 모집 참여 승인은 `allowed_seller_ids` 추가 · OPL bridge 를 만들지 않는다(취급 등록 강제 제거). 컬럼과 다른 서비스 bridge 코드는 보존.
- 모집 대상 offer 는 공급처 미지정(PRIVATE) 제한을 두지 않는다(Neture 약국 모집 한정, IR B §4 결함).

---

## 4. 이용 가능 판정 — 단일 SQL 모듈 (SSOT)

`apps/api-server/src/modules/neture-pharmacy/services/pharmacy-supply-access.ts` 한 곳이 4개 공급 경로의 "이 약국 조직이 지금 이용 · 주문할 수 있는가" 를 판정한다. 목록 · 검색 · 상세 · 장바구니 담기 · 주문 확정이 **모두 같은 함수**를 쓴다(메뉴 숨김으로 대신하지 않음).

공통 조건(모든 경로): SPO `is_active` ∧ `deleted_at IS NULL` ∧ `approval_status='APPROVED'` ∧ 공급자 `status='ACTIVE'`.

| 경로 | 추가 조건 |
|---|---|
| default | `cardinality(spo.service_keys)=0` ∧ 약국의 `pharmacy` 세미프랜차이즈 가입 active |
| proposal | `sp.status='approved'` ∧ 세미프랜차이즈 `status='active'` ∧ 약국의 해당 세미프랜차이즈 가입 active ∧ (`target_organization_id IS NULL` ∨ = 약국) |
| event | OPL `service_key='neture-event-offer'` ∧ `status='approved'` ∧ `is_active` ∧ 기간 내 ∧ 운영 조직 → 세미프랜차이즈 active ∧ 약국 가입 active |
| recruitment | `exposure_status='approved'` ∧ `status='recruiting'` ∧ 약국 조직의 application `approved` ∧ 세미프랜차이즈 가입 active ∧ `supply_unit_price IS NOT NULL` |

- 미가입 · 미승인 · 정지 · 종료 세미프랜차이즈 항목은 전체 탭 · 검색 · 상세 · 주문 API 어디에도 나오지 않는다(상세는 404 `SUPPLY_OPTION_NOT_AVAILABLE`).
- 출처 탭(`source=all|pharmacy|semi-franchise:<key>|event|recruitment`)은 접근 집합을 만든 **뒤** 거른다.
- 가격 비교 · 최저가 자동 선택 · 경고 없음. 응답은 공급 경로 · 공급자 · 조건 · 단가를 그대로 보여준다.

API: `GET /api/v1/neture/pharmacy/store/supply-options?source=&q=&page=` · `GET .../supply-options/:kind/:id`.

---

## 5. 내 매장 기본 게이트 (대체)

- 약국 매장 API(`/api/v1/kpa/...` 의 매장 controller 들 — 사이니지 · QR · 태블릿 · 자체 콘텐츠 · 매장 정보 등)는 공통 유틸 `isStoreOwner(ds, userId, 'kpa')` · `createRequireStoreOwner(ds, 'kpa')` 로 판정한다.
- **변경 (구현 `91155708c`)**: `kpa` 키의 판정을 "kpa-society active membership ∧ `kpa:store_owner` role ∧ kpa-society 연결 조직" 에서 **"사용자가 owner/admin/manager 인 조직 중 `neture_pharmacy_memberships.status='active'` 인 조직"** 으로 대체한다. 매장 경영자 계약 게이트 · ambiguous 409 · 선택 매장 헤더 규칙은 그대로.
  - 세미프랜차이즈(pharmacy 포함) 미가입이어도 내 매장 기본 기능 이용 가능 → WO §3-1 충족.
  - `cosmetics` · `pharmacy-hub` 키의 판정은 변경 없음.
- 같은 기준을 `resolveWorkScopeStore`(kpa-society membership 선검사 제거) · 매장 경영자 계약 게이트(`getPendingStoreOwnerAgreementsForUser` — kpa-society 계약은 원장 active 약국에 요구)에도 적용한다. 매장 목록(`accessible-stores`)은 조직 owner 관계만 보므로 그대로 나온다.
- **매장 표식(구현 결정)**: 매장 판정은 원장이지만, JWT role 로 화면 · 콘텐츠 사본(F3 `asset-copy-core` allowedRoles)을 여는 기존 소비처가 있어 기본 가입 승인 · 재활성 시 표식을 붙이고 정지 · 종료 시 거둔다 — role `neture:store_owner`(신규, `service_memberships('neture')` ensure 동반 — F11), `organization_service_enrollments('kpa-society')`(매장의 약국 업무 영역 = web-store 서비스 문맥, 세미프랜차이즈 가입이 아님), `platform_store_slugs('kpa')`(공개 주소). `service_memberships('neture')` 는 공급자 축과 공유될 수 있어 정지 시 건드리지 않는다. 표식 동기화 실패는 원장 판정에 영향이 없다.
- 승인 우회 차단: `POST /api/v1/store/enrollment` 의 `ENROLLABLE_SERVICE_KEYS` 에서 `kpa` 제거(약국 매장은 기본 가입 신청으로만).
- KPA 회원 승인 시 매장 프로비저닝(`ensureKpaStoreOrganization`, member.controller 2곳)은 새 게이트에서 매장 권한을 주지 않는다(실효 없음). 호출 제거는 KPA 운영 콘솔 흐름 · F10 승인 엔진 kpa 분기와 얽혀 있어 **별도 정리 WO** 로 남긴다.

---

## 6. 내 매장 직접 이용 · HUB 단계 제거

- web-store 약국 문맥에서 `/hub` 메뉴 · 진입 · "취급 신청(apply) → OPL → orderable" 을 주문 전제에서 제거한다. 내 매장 메뉴에 **상품 · 주문**(공급 옵션 목록 · 장바구니 · 결제 · 주문 내역), **세미프랜차이즈**(가입 신청 · 상태 · 커뮤니티 링크), **기본 가입** 화면을 둔다.
- 콘텐츠: 세미프랜차이즈 콘텐츠 자료함은 §15-1. "가져가기" 진열 화면 대신 내 매장 자료함에서 접근 가능한 콘텐츠를 출처별로 보고 기존 사본 API(`/kpa/assets/copy` 등)를 그대로 호출한다. HUB 콘텐츠 API(`/api/v1/hub/contents`, F5 Stable)는 변경하지 않는다.
- 이번 범위에서 지우지 않은 것: web-store `/hub/*` 라우트 코드 · 서비스 앱 `/store-hub` · 공급자 · 운영자 게시 화면 · `@o4o/store-ui-core` · `hub-core` · `asset-copy-core`(F3). **K-Cosmetics 보존은 이 구조의 전제가 아니다**(§14) — 이 코드들은 약국 흐름이 거치지 않을 뿐이며, 실제 제거 여부 · 범위는 K-Cosmetics 퇴역 작업이 파일 단위로 정한다.

---

## 7. 커뮤니티

- 세미프랜차이즈 커뮤니티 = `communities` 행(`slug = semi_franchises.community_key`).
- `requireCommunityAccess(communityKey)` 에서 `communityKey` 가 어떤 세미프랜차이즈의 `community_key` 이면: **세미프랜차이즈 가입 active 인 약국 조직의 owner/admin/manager 인가** 만 판정한다. `community_memberships` 승인 검사를 건너뛰고 행을 만들지 않는다(복제 · 동기화 0). 정지 · 종료 · 미가입 = 403.
- 일반 커뮤니티(`pharmacy` 약사 커뮤니티 등)의 독립 가입 정책은 그대로.
- **구현 범위**: 접근 판정(`requireCommunityAccess` · `GET /communities/:key/access`)만 연결했다. 포럼 원장은 정적 카탈로그(`forumStorageCodes`)에 묶여 있어 DB 커뮤니티(개설 승인 커뮤니티 포함) 전반에 게시판 mount 가 없다 — 세미프랜차이즈 커뮤니티 게시판은 공통 Forum 구조(o4o-common-structure) 변경이 필요해 **후속 WO**.

---

## 8. 장바구니 · 주문 · 결제

### 8-1. 장바구니 (R7)

- 저장소 `store_cart_items`(기존) · `service_key='neture-pharmacy'` · `buyer_id` = 사용자 · `organization_id` = 서버가 해석한 약국 조직.
- API: `GET/POST/PATCH/DELETE /api/v1/neture/pharmacy/cart(/items/:id)` — 담기 입력 `{kind, id, quantity}`(`kind`: default=SPO id · proposal · event · recruitment). 담을 때 §4 판정. `price_snapshot` 은 표시용(신뢰 안 함).
- 장바구니 단위 = **(구매자, 약국 조직)**. 조회 · 담기 병합 · 수량 · 삭제 · 확정 · 확정 후 삭제 모두 `organization_id` 를 건다 — 여러 약국을 운영하는 사용자가 A 약국에 담은 행을 B 약국 문맥(`X-Store-Organization-Id`)에서 보거나 주문하지 않는다(Codex 리뷰 반영 `fed5afe1e`).

### 8-2. 주문 확정 `POST /api/v1/neture/pharmacy/cart/checkout`

1. 약국 조직 서버 확정(§5 게이트) · 장바구니 행 잠금.
2. 각 행을 §4 로 **재판정** · 단가 서버 확정(경로별 단가표 §1). 권한 없는 제안 = 400 `SUPPLY_OPTION_NOT_AVAILABLE`.
3. 기존 검사 유지: 수량 1..1000(D2 — 기존 검사 유지, 신규 상한 없음) · SPO 재고 `stock - reserved ≥ qty`(검사만, 현행과 같음) · 의약품 차단.
4. 이벤트 행: `reserveEventOfferListing` 원자 차감(per_order · total · per_store). 이후 실패 시 `incrementListingQuantity` 보상.
5. 그룹 = `(receiverKey, supplierId)`; `paymentGroupId` 는 **receiverKey 별 1개**. `checkoutService.createOrder()` 단일 지점 호출.
   - order metadata: `serviceKey='neture-pharmacy'`, `source='neture_pharmacy_cart'`, `paymentGroupId`, `receiverKey`, `sellerOrganizationId`, 배송지 = 약국 조직 주소 스냅샷.
   - item metadata: `supplyKind`, `supplyProposalId` | `eventOfferId`+`productListingId` | `sellerRecruitmentId`, `semiFranchiseKey`, `unitPrice`, `conditions`(기간 · 한도 스냅샷). `productId` = SPO id(공급자 스코프 계약).
6. 확정된 행만 장바구니에서 삭제.

`receiverKey = semi_franchises.payment_receiver_key ?? 'undetermined:' || key`. 미확정 수취 주체는 세미프랜차이즈마다 따로 묶는다(서로 같은 수취 주체인지 모르므로 합치지 않는다).

### 8-3. 결제 (PG 독립 · 테스트 결제)

- 모드 env `NETURE_PHARMACY_PAYMENT_MODE` = `test` | `live`. 미설정: production 이면 결제 불가(503 `PAYMENT_NOT_CONFIGURED`), 그 밖은 `test`.
- `live` 는 PG 미선정 상태이므로 503 `PAYMENT_PROVIDER_NOT_SELECTED`(D1 · 대기). 키 부재를 성공으로 처리하지 않는다.
- `POST /api/v1/neture/pharmacy/payments/prepare {paymentGroupId}`:
  group 의 모든 주문이 본인 소유 ∧ `paymentStatus IN (pending, failed)` ∧ `status IN (created, pending_payment)` ∧ 같은 `receiverKey`. 금액 = Σ `totalAmount`(서버). advisory lock(group) 아래에서 같은 group 의 `CREATED` payment 가 같은 금액이면 재사용, 금액이 다르면 기존 것을 `CANCELLED` 로 닫고 새로 만든다. `o4o_payments(orderId = paymentGroupId, amount, metadata{buyerId, checkoutOrderIds, receiverKey, mode})`.
- `POST /api/v1/neture/pharmacy/payments/confirm {paymentId, paymentGroupId}`:
  `payment.orderId === paymentGroupId` ∧ `payment.metadata.buyerId === 사용자` ∧ 현재 Σ totalAmount === `payment.amount` 아니면 거부. 이미 `PAID` 면 기존 결과 반환(멱등). test 모드 = PG 호출 없이 `PAID`(`metadata.testPayment=true`).
- 완료 처리(동기, 같은 요청 안): 주문별 `UPDATE ... SET paymentStatus='paid', status='paid' WHERE id=$1 AND paymentStatus IN ('pending','failed') RETURNING` 이 행을 돌려준 경우에만 공급자 전달(bridge) — 중복 확인 · 재시도에서 전달 1회. bridge 자체도 `pg_advisory_xact_lock(checkoutOrderId)` + 기존 행 조회로 멱등.
- `metadata.testPayment=true` 를 주문 · `neture_orders.metadata` 로 승계하고 공급자 화면에 "테스트 결제" 로 표시한다. 테스트 결제는 실제 공급자 지급 · 정산 근거가 아니다(결제 완료 ≠ 공급자 지급).
- 결제 전 취소: `POST /api/v1/neture/pharmacy/orders/:id/cancel` → 기존 `cancelStoreOrderBeforePayment` 재사용(이벤트 수량 복원).

### 8-4. 공급자 주문 처리

- 공급자 목록 · KPI · unified 의 서비스 필터를 `COALESCE(o.service_key,'neture') = 'neture'` 에서 **공급자 가시 서비스 집합**(`fulfillment-service-scope.ts` 상수 1곳: `neture` · `neture-pharmacy` · `kpa-society` · `kpa-groupbuy` · `pharmacy-hub`)으로 바꾼다. 공급자 격리(`spo.supplier_id = 요청 공급자`)는 그대로.
- bridge 가 `sellerOrganizationId` · 약국명 · 배송지 · `testPayment` 를 `neture_orders` 로 승계 → 공급자가 구매 약국을 식별한다.
- 준비 · 배송 · 배송 완료 흐름과 배송 완료 시 SPO 재고 차감(`updateOrderStatus`)은 그대로.
- 정산(`neture_settlements`)의 `'neture'` 고정 필터는 **변경하지 않는다**(WO §4 정산 임의 확대 금지) — 보고 항목.

---

## 9. 유지 · 대체 · 제거 구분

| 구분 | 대상 |
|---|---|
| **유지(그대로 호출)** | SPO 재고 검사 · 배송 완료 차감 · 취소 해제, `reserveEventOfferListing` · `incrementListingQuantity` · `STORE_ORDERED_QTY_SQL`, 결제 전 취소 복원, 수량 1..1000 기존 검사(D2), 공급자 가입 승인, 제품 등록 승인(운영자), 공급자 계좌 정보, `checkoutService.createOrder()` |
| **대체(Neture 약국 흐름의 판정 근거 교체)** | 매장 기본 게이트(`kpa` 키) → 기본 가입 원장 · 상품 노출 판정(PUBLIC/SERVICE/PRIVATE · OSA kpa-society · `allowed_seller_ids`) → §4 · 모집 참여 사용자 → 조직 · 커뮤니티 별도 가입 → 세미프랜차이즈 가입 상태 · 이벤트 운영 조직 LIMIT 1 → 세미프랜차이즈 운영 조직 |
| **수정(결함)** | 공급처 미지정 제품 승인 불가 · 이벤트 재신청 불가 · visibility 승인 우회 · 공급자 목록 service_key 고정 · 장바구니 이벤트 주문 한도 집계 누락(D3 — `productListingId` 연결, 기준은 사용자 유지) · 결제 대응 · 금액 · 멱등 결함(Neture 약국 결제 경로) |
| **제거(약국 문맥만)** | web-store 약국 HUB 메뉴 · 진입 · apply 주문 전제, `/store/enrollment` 의 `kpa`, KPA 회원 승인 시 매장 프로비저닝 |
| **이번 범위에서 미변경(다른 흐름 · 퇴역 작업 소관)** | OSA · OSP · `product_approvals` · PUBLIC 자동 확산 · `allowed_seller_ids` · KPA/KCos/PH 결제 컨트롤러 3벌 · `/hub/*` 라우트 · 서비스 앱 `/store-hub` · `/api/v1/hub/contents`. K-Cosmetics 전용 부분의 제거는 퇴역 작업(§14) |

---

## 10. Frozen · 정본 예외 기록 (이 WO 근거)

| 기준 | 내용 |
|---|---|
| Supplier Domain §4 (approval_status = OSA 파생) | OSA 0행 제품은 Neture 운영자 승인이 `approval_status` 를 직접 기록 |
| F8 §7 Checkout Guard | Neture 약국 주문은 §4 판정 + 별도 확정 서비스(`neture_pharmacy_cart`). 기존 3개 strategy 는 무변경 |
| B2B-ORDER-CONTRACT §13-2 (strategy 가 유일한 서비스 분기점) | Neture 약국 축은 strategy 대신 §4 SSOT 모듈을 쓴다 |
| F3 Store Layer | `isStoreOwner` 의 `kpa` 키 판정만 교체. 공통 Core 패키지 Public API 무변경 |
| ROLE-WORKSPACE §5 (커뮤니티 policy 2종) | 세미프랜차이즈 커뮤니티 판정 추가 |

---

## 11. 대기 · 사용자 결정 항목

- **D1 결제 수취 주체 · 실제 PG**: 미확정. 구조(`payment_receiver_key` · receiver 단위 결제 묶음)와 테스트 결제만 구현. 세미프랜차이즈 운영자를 수취 주체로 간주하지 않는다. 실제 PG 연결은 대기.
- **D2 수량 1..1000**: 기존 검사 유지(결정 완료 — 대기 항목 아님).
- **D3 이벤트 한도 기준**: 사용자 기준 유지(결정 완료). 장바구니 주문 집계 누락만 참조 키 연결로 수정.
- production 에서 테스트 결제를 켜려면 `NETURE_PHARMACY_PAYMENT_MODE=test` env 설정이 필요하다(인프라 변경 = 사용자 승인).
- 테스트 데이터 초기화 실행(§12)은 운영 DB write → 사용자 명시 승인.

---

## 12. 테스트 데이터 초기화 범위 (실행은 사용자 승인 후)

| 대상 | 처리 |
|---|---|
| 기존 약국 매장 조직(`kpa-pharm-*` · `store-kpa-*`)의 `kpa:store_owner` · kpa-society 매장 연결 | 삭제 불필요 — 새 게이트에서 매장 권한을 주지 않는다. 정리는 선택 |
| `store_cart_items` (`service_key` 가 `kpa-society` · `kpa-groupbuy`) | 삭제 후보(옛 장바구니) |
| `checkout_orders` · `neture_orders` 중 `kpa-society` · `kpa-groupbuy` 테스트 주문 | 옛 주문 읽기 호환을 만들지 않으므로 삭제 후보 |
| `organization_product_listings` `service_key='kpa-groupbuy'` 이벤트 · `seller_recruitment` bridge 행 | 삭제 후보 |
| `seller_recruitments` · `seller_recruitment_applications`(사용자 단위) | 삭제 후보 — 조직 단위로 새로 신청 |
| 보존 | 사용자 계정 · 공급자 · 제품(SPO · master) · K-Cosmetics · PharmacyHub · KPA 분회 · 커뮤니티 데이터 · 공통 운영 설정 |

실제 삭제 SQL 과 대상 건수는 dry-run(SELECT count) 결과와 함께 사용자 승인 요청 시 제시한다.

---

## 13. 담당 경계 · 인계 계약 (인증 · 가입 트랙 ↔ Store/Commerce 트랙)

사용자 결정(2026-10-05): 가입 원장 · 추가정보 · 신청 상태 · 승인/반려 · role 발급 · 승인 orchestration 은 **인증 · 가입 트랙**, 약국 조직 · 내 매장 · 업무 enrollment · slug 연결은 **Store/Commerce 트랙**이다. 이 WO 가 먼저 구현한 코드를 기준으로 인계하며, 두 트랙이 같은 승인 · role · 조직 생성 로직을 따로 만들지 않는다.

| 구분 | 현재 코드 (`apps/api-server/src/modules/neture-pharmacy/`) | 소유 | 인계 방식 |
|---|---|---|---|
| 기본 가입 원장 테이블 `neture_pharmacy_memberships` (상태 · 자격 정보 · 결정 이력) | migration `CreateNeturePharmacyCommerce1791160000000` | **인증 · 가입** | 테이블 · 상태 전이(`constants.ts` `nextMembershipStatus` · `canReapply`) 소유 이전. Store 는 읽기만(아래 계약) |
| 신청 · 재신청 · 운영자 처리(승인 · 반려 · 정지 · 재개 · 종료) | `services/pharmacy-membership.service.ts` · 라우트 `/neture/pharmacy/membership` · `/neture/operator/pharmacy-memberships/*` · web-store `/start-pharmacy` · web-neture `/operator/pharmacy-memberships` | **인증 · 가입** | 파일 · 라우트 · 화면 그대로 이관. 인증 트랙의 공통 가입 · 추가정보 흐름에 편입할 때 이 서비스를 확장하고 새로 만들지 않는다 |
| 승인 orchestration · role 발급/회수 (`neture:store_owner` + `service_memberships('neture')` ensure) | `services/pharmacy-store-provisioner.ts` | **인증 · 가입** | 그대로 이관. Store 쪽 작업은 아래 계약 함수를 호출만 한다 |
| 약국 조직(= 내 매장) 생성 · owner 관계 · 재신청 시 표시 정보 갱신 | `services/pharmacy-store-link.ts` `createPharmacyStoreOrganization` · `updatePharmacyStoreProfile` | **Store** | 계약 함수(아래) |
| 약국 업무 영역 enrollment(`kpa-society`) · 매장 공개 주소 slug(`kpa`) 연결 · 해제 | `pharmacy-store-link.ts` `activatePharmacyStore` · `deactivatePharmacyStore` | **Store** | 계약 함수(아래) |
| 매장 접근 판정 · 매장 목록 | `utils/store-organization.resolver.ts`(`kpa` 후보) · `utils/store-owner.utils.ts` · `utils/service-tenant.resolver.ts`(`accessible-stores`) | **Store** | 원장 `status='active'` 를 읽는다 |
| 세미프랜차이즈 가입 · 공급 제안 · 이벤트 · 모집 · 장바구니 · 주문 · 결제 · 커뮤니티 접근 | 나머지 services · 라우트 · 화면 | **Store/Commerce** | 유지 |

**Store 가 제공하는 계약 (`pharmacy-store-link.ts`)**

```text
createPharmacyStoreOrganization(exec, userId, {pharmacyName, businessNumber, address?, phone?}) → organizationId
    신청 트랜잭션 안에서 호출. 약국 조직(type='pharmacy') 1개 + owner 관계.
updatePharmacyStoreProfile(exec, organizationId, profile)        재신청 시 같은 조직 갱신(약국 1 : 매장 1)
activatePharmacyStore(ds, {organizationId, pharmacyName})       기본 가입 active 전이 후 호출(멱등)
deactivatePharmacyStore(ds, organizationId)                     정지 · 종료 전이 후 호출(조직 · 데이터 보존)
```

**Store 가 읽는 것**: `neture_pharmacy_memberships.organization_id` · `status`(active 판정) — 그 밖의 컬럼 · 테이블 구조는 인증 트랙이 바꿀 수 있다. 판정 기준을 바꾸려면 Store 트랙과 함께 바꾼다.

**중복 금지**: 인증 트랙은 조직 · enrollment · slug 를 직접 만들지 않고 위 계약을 호출한다. Store 트랙은 원장 상태 전이 · role 발급을 하지 않는다. 경계 분리 커밋 `ebbe5e910`(동작 변경 0).

---

## 14. K-Cosmetics 퇴역 결정 반영 (2026-10-05)

- 사용자 결정: K-Cosmetics(`retail.neture.co.kr`, serviceKey `k-cosmetics`)는 퇴역한다. 이 설계는 **K-Cosmetics 보존을 전제로 두지 않는다** — web-store `/hub/*` · 일반 매장 분기를 "K-Cosmetics 가 쓰니 남긴다" 는 근거는 철회한다.
- 이 WO 에서 K-Cosmetics 전용 코드를 지우지 않았다. 실제 제거 파일(web-store `/hub/*` · `/work/k-cosmetics/*` · 서비스 앱 · cosmetics 라우트 · `store-service-scoped-owner-entry.spec.ts` 의 KCos `/hub` 링크 고정 등)은 **퇴역 담당 작업이 범위를 정하고**, 이 트랙은 그 범위와 겹치는 파일을 따로 정리하지 않는다.
- 유지: 약국이 쓰는 공통 기능(매장 Core · 콘텐츠 사본 · 사이니지 · QR · 태블릿 등)과 **화장품 제품군**(Neture 공급 제품 · 카테고리) — 퇴역 대상은 서비스이지 제품군이 아니다.

---

## 15. 콘텐츠 자료함 · 미완료 범위

### 15-1. 세미프랜차이즈 콘텐츠 자료함 (TODO 3-3 — 구현 완료)

- 원장 `semi_franchise_contents`(같은 migration): 세미프랜차이즈 담당 운영자가 작성 · 게시(draft → published ↔ archived). 공통 콘텐츠 Core(`cms_contents` · `/api/v1/hub/contents`, F4 · F5)는 바꾸지 않았다 — `cms_contents` 는 serviceKey 공개 조회 경로가 있어 가입 약국 한정 콘텐츠를 담을 수 없다.
- 열람 · 사본 판정: 콘텐츠 published ∧ 세미프랜차이즈 active ∧ **약국 조직의 해당 세미프랜차이즈 가입 active**(§4 와 같은 가입 기준). 볼 수 없으면 404(존재 비노출). 정지 · 종료 · 미가입 즉시 차단.
- 사본: 기존 공개 API `AssetCopyService.copyResolved()` → `o4o_asset_snapshots(asset_type='content', source_service='semi-franchise')`. 사본은 매장 소유 독립 사본 — 원본 수정 · 보관이 사본에 전파되지 않는다. 이후 편집 · 채널 게시는 기존 매장 자료함 경로 그대로.
- 출처별 자료함: 매장 자료함 피드 source `franchise` 추가(`store-library-feed.controller.ts`) — 전체 · 운영자 제공 · 커뮤니티 가져옴 · **세미프랜차이즈** · 내가 만든 콘텐츠. 공급자 자료는 기존 매장 HUB 자료 화면.
- API: 약국 `GET /api/v1/neture/pharmacy/store/contents(?sf,q)` · `GET …/:id` · `POST …/:id/copy` / 담당 운영자 `GET|POST /api/v1/neture/operator/semi-franchises/:key/contents` · `GET|PATCH …/:id` · `POST …/:id/{publish|archive}`.
- 화면: web-store `/store/pharmacy/contents`(이용 가능 콘텐츠) · 매장 자료함 "세미프랜차이즈" 탭 / web-neture 담당 세미프랜차이즈 "콘텐츠" 탭 · 작성 · 수정.
- 검증: 통합 테스트(게시 전 비노출 · 가입 약국만 · 사본 독립성 · 보관 · 정지 차단) + 로컬 브라우저(운영자 작성 · 게시 → 약국 목록 · 사본 → 자료함 탭) — CHECK 문서.

### 15-2. 미완료 범위 (완료로 표시하지 않는다)

| 항목 | 현재 상태 | 남은 일 | 담당 · 연결 |
|---|---|---|---|
| 세미프랜차이즈 커뮤니티 게시판 (WO §3-8, TODO 3-4) | **접근 판정만** 구현(`8c1cab8f2`). 게시판 이용(글 · 댓글) **미구현** — 포럼 원장이 정적 카탈로그(`forumStorageCodes`)에 묶여 DB 커뮤니티에 게시판 mount 가 없다 | DB 커뮤니티(세미프랜차이즈 포함) 게시판 저장 파티션 · mount · 운영 권한 · 화면 진입 | **공통 커뮤니티 · Forum 트랙** — [`WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1`](../work-orders/WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1.md)(DRAFT). 이 WO 의 3-4 완료 조건과 연결 |
| 기존 KPA 매장 provisioning 제거 (TODO 6-2) | 새 게이트에서 실효 없음(매장 권한 0). 코드(`member.controller.ts` 2곳 · `kpa-store-organization.provisioning.ts`) 잔존 | 호출 제거 · 관련 spec 정리 | **인증 · 가입 트랙** — [`WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1`](../work-orders/WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1.md) §4 (KPA 회원 승인 흐름 · F10 승인 엔진 kpa 분기와 함께) |
| pharmacy-hub 인프라(서버 · 도메인 · 인증서) 삭제 | 보존 — 새 기능과 QR 경로의 운영 검증 전까지 유지(사용자 지시) | §16-4 조건 충족 후 삭제 | **웹 서비스 정비 트랙** |

접근 판정 구현만으로 커뮤니티 이용 완료를 선언하지 않는다.

### 15-3. 완료 범위 구분 (2026-10-05)

| 구분 | 항목 |
|---|---|
| **이 PR 에서 완료** (코드 · 테스트 · 로컬 검증) | 기본 가입 · 세미프랜차이즈 · 공급 제안 · 이벤트 · 모집 · 장바구니(조직 단위) · 주문 · 테스트 결제 · 공급자 처리 · 콘텐츠 자료함(§15-1) · 커뮤니티 접근 판정 · PH 신규 가입 은퇴 · PH commerce 화면 이전 · QR 착지 이전 준비(§16-2) · 리다이렉트 구현안(§16-7) |
| **운영 적용 대기** (사용자 승인) | main 통합 · migration · 배포 · `NETURE_PHARMACY_PAYMENT_MODE=test` · 운영 검증 · 테스트 데이터 초기화(§12) · QR link 4행 처리(§16-3 A) · 실제 PG(D1) |
| **결정 대기** | PH opt-in 배송 이전 위치(§16-5) · PH 소식 · 안내 위치(§16-6) |
| **다른 트랙 인계** | 커뮤니티 게시판 → 공통 Forum 트랙(`WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1`) · KPA 매장 생성 코드 제거 → 인증 · 가입 트랙(`WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1` §4) · 리다이렉트 적용 · PH 인프라 정리 → 웹 서비스 정비 트랙(§16-4 · §16-7) |

---

## 16. pharmacy-hub 기능 정리 (유지 · 이전 · 폐지)

PharmacyHub(`pharmacyhub.co.kr`, serviceKey `pharmacy-hub`)는 Neture 약국 매장으로 흡수한다. 이 PR 은 **신규 진입과 commerce 흐름만** 옮기고, 서버 · 도메인 · 인증서와 공개 QR/태블릿 경로는 운영 검증 전까지 보존한다.

### 16-1. 분류

| 구분 | 대상 | 처리 (이 PR) |
|---|---|---|
| **폐지** | 신규 가입 `POST /api/v1/pharmacy-hub/join` | 410 `PHARMACY_HUB_JOIN_RETIRED` + `next=/api/v1/neture/pharmacy/membership`(`f7abec50c`). `/join/status` · 운영 콘솔은 기존 신청 처리용으로 유지 |
| **폐지** | store 자가 업무 가입의 `pharmacy-hub` 선택지("병원 약국" 오표기) | `ENROLLABLE_SERVICE_KEYS=['cosmetics']` · web-store 선택지 제거 |
| **이전(완료)** | web-store `/work/pharmacy-hub` 상품 · 상품 상세 · 장바구니 · 주문 · 주문 상세 · 결제 시작 | Neture 약국 공급 상품 · 장바구니 · 주문으로 Navigate. PG 복귀 `payment/success` · `payment/fail` 은 유지 |
| **폐지 보류** | PH 결제 컨트롤러 · `PharmacyHubPaymentEventHandler` · bridge source `pharmacy_hub_cart` | 남은 `CREATED` PH 결제(기능 조사 시점 6건)가 닫힐 때까지 유지. 이미 결제된 PH 주문이 bridge 되면 `service_key='pharmacy-hub'` — 공급자 가시 집합에 포함(§8-4, `fed5afe1e`) |
| **이전(공용 경로 이미 존재)** | 매장 실행 자산 · 태블릿 · 취급/로컬 상품 · 매장 정보 · 운영 콘솔 | 매장 Core 공용 경로 · Neture 운영자 화면이 담당. 추가 구현 없음 |
| **유지(옛 호스트)** | 공개 QR(`/api/v1/pharmacy-hub/qr/public/:slug`) · 태블릿 · 다국어 · 제휴 페이지 · forum 저장 코드 `pharmacy-hub` | 운영 검증 전까지 그대로. 같은 slug 를 새 호스트에서도 열 수 있게 준비(§16-2) |
| **결정 보류** | 공급자 opt-in 배송(PH 전용) | 조사 결과 · 선택지 §16-5. 이전 위치 미확정(`supply_proposals` 이전도 확정 아님) |
| **결정 보류** | 이용 안내(guide) · 소식(news) · 안내 문구 · 제품 설명서 목록 | 조사 결과 · 권장 위치 §16-6 |

PH 고정 spec(`service-catalog.canonical-domain.test.ts` · `service-public-origin-qr-hosts.spec.ts` — pharmacyhub.co.kr origin 생성)은 인프라 삭제 시점에 함께 정리하고 이 PR 에서는 바꾸지 않는다.

### 16-2. QR 착지 이전 준비 (`f6c4e0596` · `427a715d3`)

- 공개 QR 랜딩의 Screen Set 서비스 축: 매장이 **호출 호스트 서비스의 slug 를 하나도 갖지 않을 때만** 매장의 최신 slug 서비스 축을 쓴다. 호출 서비스 slug 가 있으면(여러 서비스에 걸친 매장 포함) 종전과 같다(`427a715d3` — 직접 리뷰에서 발견한 다중 서비스 매장 축 변경 위험 수정). → PH 매장 QR slug 를 `pharmacy.neture.co.kr` 공개 QR API(`/api/v1/kpa/qr/public/:slug`)로 열어도 PH 호스트와 같은 결과.
- 새 호스트 QR 화면이 product QR 의 상품 요약 · 매장 설명서를 화면 안에 표시한다(옛 PH 화면과 같은 계약). "제품 보기" 버튼이 여는 매장 상품 상세는 B2C 공개 노출 설정을 따르므로 비공개 상품은 404 — 기존 KPA 동작, 표시 정보는 화면 안에서 이미 제공.
- 로컬 검증: 같은 PH QR slug 를 두 공개 API 로 열어 product · link 결과 동일, KPA 앱 `/qr/:slug` · `/tablet/:slug` 렌더.

### 16-3. QR 두 가지 — 따로 관리한다

**(A) 착지 URL 이 pharmacyhub.co.kr 인 link QR 4행 — 비활성 E2E 테스트 데이터** (운영 읽기 확인 2026-10-05)

식별자는 `store_qr_codes.slug`(전역 유일). 4행 모두 `landing_type='link'` · `is_active=false` · PH 약국 조직 소속 · E2E 테스트 생성 slug. 새 착지 경로는 새 호스트에 존재(`/guide` → `/guide/intro`, `/`).

| # | 식별자 (slug) | 기존 값 `landing_target_id` | 새 값 | 변경 조건 |
|---|---|---|---|---|
| 1 | `e2e-qr-mttrdan3` | `https://pharmacyhub.co.kr/guide` | `https://pharmacy.neture.co.kr/guide` | 사용자 승인 ∧ 실행 직전 재조회 결과가 기존 값 · `is_active=false` 와 일치 ∧ 대상 1행 |
| 2 | `e2e-test-msl2gezv` | `https://pharmacyhub.co.kr/` | `https://pharmacy.neture.co.kr/` | 같음 |
| 3 | `e2e-test-w9-mskho4g9` | `https://pharmacyhub.co.kr/` | `https://pharmacy.neture.co.kr/` | 같음 |
| 4 | `e2e-test-w9-qr-mskhnl5t` | `https://pharmacyhub.co.kr/` | `https://pharmacy.neture.co.kr/` | 같음 |

- 처리 선택지(사용자 결정): ① 위 새 값으로 변경 ② 테스트 데이터 정리(§12 와 함께 삭제) ③ 그대로 둠(비활성이라 스캔해도 착지하지 않음). 비활성 테스트 행이라 운영 영향은 없다 — **인쇄 QR 보존(B)과 무관**.
- 운영 DB write — **실행하지 않았다**. 승인 시 행별로 기존 값을 조건에 넣어 실행한다(대상 1행이 아니면 중단):

```sql
-- 확인(읽기)
SELECT slug, landing_type, landing_target_id, is_active FROM store_qr_codes
 WHERE slug IN ('e2e-qr-mttrdan3','e2e-test-msl2gezv','e2e-test-w9-mskho4g9','e2e-test-w9-qr-mskhnl5t');
-- 행별 적용(승인 후, 각 1행 기대)
UPDATE store_qr_codes SET landing_target_id = 'https://pharmacy.neture.co.kr/guide', updated_at = NOW()
 WHERE slug = 'e2e-qr-mttrdan3' AND landing_target_id = 'https://pharmacyhub.co.kr/guide' AND is_active = false;
UPDATE store_qr_codes SET landing_target_id = 'https://pharmacy.neture.co.kr/', updated_at = NOW()
 WHERE slug = $1 AND landing_target_id = 'https://pharmacyhub.co.kr/' AND is_active = false;  -- #2 · #3 · #4 각각
```

**(B) 인쇄 · 배포된 QR 이 담은 pharmacyhub.co.kr 주소 — 기존 도메인 보존 대상**

- QR 이미지가 담은 주소(서버 생성 규칙): `https://pharmacyhub.co.kr/qr/{slug}`(매장 QR · Screen Set QR · POP v2 QR), `/multilingual-products/{publicKey}`, `/foreign-visitor/affiliate/{shortCode}`. 태블릿 기기 URL `/tablet/{slug}` 도 보존 대상.
- 규모: PH `/qr` 활성 21 · 스캔 72(URL 조사 2026-09-25 기준), PH 매장 QR 활성 product 18 · screen_set 3(2026-10-05 읽기).
- 이 주소들은 DB 를 바꿔도 이미 인쇄된 이미지에서 바뀌지 않는다 → **도메인 · 인증서를 유지한 채 리다이렉트(§16-7)** 로만 옮길 수 있다. 리다이렉트 전환 전까지 옛 서버가 그대로 응답한다.

### 16-4. 인프라 삭제 인계 조건 (웹 서비스 정비 트랙)

1. PR #308 main 통합 · 배포 후 새 호스트에서 콘텐츠 자료함 · 공급 주문 · QR(product · screen_set · link) · 다국어 상품 · 제휴 QR 운영 검증.
2. §16-7 1단계 리다이렉트 적용 · 검증(인쇄 QR 경로 보존). 이후에도 **pharmacyhub.co.kr 도메인 · DNS · 인증서는 리다이렉트를 위해 계속 유지**한다(인쇄 QR 이 남아 있는 한).
3. 남은 PH `CREATED` 결제 정리 · 결정 보류 항목(§16-5 · §16-6) 결정과 이전.
4. 그 뒤 §16-7 2단계(호스트 전체 리다이렉트) → PH web 서버(`pharmacy-hub-web`) · PH 고정 spec 정리. 도메인 · 인증서 해지는 인쇄 QR 폐기 판단 이후 별도.

### 16-5. 공급자 opt-in 배송 (PH 전용) — 조사 결과

| 항목 | 내용 |
|---|---|
| 현재 기능 | 공급자가 자기 제품(SPO)마다 PH 공급을 켜고 끈다. 켜면 `supplier_product_offers.service_keys` 에 `pharmacy-hub` 추가 + 선택적 서비스 단가 `offer_service_prices`. **운영자 승인 없이** PH 매장 진열에 즉시 노출(노출 게이트가 `approval_status` 를 보지 않음). 주문은 PH 장바구니 → `checkout_orders(source=pharmacy_hub_cart)` → bridge `neture_orders(service_key='pharmacy-hub')` → 공급자 처리(수락 · 발송) |
| 화면 · API | web-neture 공급자 "서비스 제공 설정" `/supplier/services/pharmacy-hub` · API `/neture/supplier/services/:serviceKey/products · orders` (`SUPPLIER_OPTIN_SERVICE_KEYS=['pharmacy-hub']` 만 허용) |
| 이용 대상 | 공급자(설정 · 주문 처리) → PH 약국(진열 · 주문). PH 운영자 개입 없음 |
| Neture 대체 가능 여부 | **배송 · 주문 처리는 대체됨**(같은 공급자 배송 정책 · bridge · 공통 공급자 주문 목록). **노출 방식은 대체 안 됨**: 기본 공급은 운영자 제품 승인 + `service_keys` 빈 제품 + 일반가, 공급 제안은 공급자 단가 지정이 되지만 세미프랜차이즈 담당 운영자 승인이 필요. "공급자 혼자 켜는 즉시 노출 · 서비스 단가" 는 없다 |
| 주의 | opt-in 제품은 `service_keys` 가 비어 있지 않아 Neture 기본 공급에 안 보인다. PH 은퇴 때 `pharmacy-hub` 키를 지우면 APPROVED · 다른 키 없는 제품이 **기본 공급으로 새로 노출**될 수 있다 — 대상 제품 확인 후 정리 |

**권장**: 공급자 자가 노출은 Neture 약국 모델(운영자 승인 기반)과 맞지 않으므로 **새로 만들지 않는다**. 서비스 단가가 필요한 제품은 공급 제안(공급자 단가 + 담당 운영자 승인), 일반가면 기본 공급(제품 등록 승인)으로 안내한다. 필요한 변경: 공급자 "서비스 제공 설정" 화면에 Neture 약국 경로 안내 · PH 은퇴 시점에 opt-in 메뉴 숨김 · 진행 중 PH 주문 처리 경로 유지. 데이터 정리(`service_keys` 의 `pharmacy-hub` · `offer_service_prices`)는 PH 주문 종료 후 영향 제품 목록(dry-run)으로. **이전 위치는 확정하지 않았다** — 사용자 결정.

### 16-6. 이용 안내 · 소식 · 안내 문구 · 제품 설명서 — 조사 결과

새 호스트 `pharmacy.neture.co.kr` = `web-kpa-society`(serviceKey `kpa-society`).

| PH 콘텐츠 | 현재 (PH) | 새 호스트 대응 | 권장 위치 · 필요한 변경 |
|---|---|---|---|
| 이용 안내 `/guide/*` (소개 · 이용 방법 · 기능 9종) — 약국 · 비로그인 | 코드 고정 문구(`shared-space-ui` copy `pharmacy-hub.ts`), 운영자 편집 불가 | `/guide` · `/guide/intro` · 이용 방법 · 기능 10종 존재. 운영자 편집 가능(`guide_contents`, `/operator/guide-contents`) | 공통 항목(소개 · 포럼 · 콘텐츠 · QR · POP · 사이니지)은 **기존 KPA `/guide/*` 사용**. 빠진 것: **공급 주문 · 매장 상품** 기능 안내 2쪽(Neture 약국 공급 상품 · 장바구니 · 주문 경로 기준), 태블릿 · 설명서는 QR 쪽 문구에 흡수. 소개 문구가 "KPA-Society" 기준이라 Neture 약국 기준 문구 정비 필요 |
| 소식 `/news` · `/news/:id` — 공개 | `cms_contents`(serviceKey `pharmacy-hub`, type news), 운영자 편집 가능 | 운영자 콘텐츠 관리(`kpa-society`) 있음, **공개 소식 목록 · 상세 화면 없음**(홈 공지만) | 결정 필요: ① 공개 소식 목록 · 상세 추가 ② 홈 공지로 대체. PH 기존 소식 행은 옛 호스트에 두거나 일회성 이전(운영 write) |
| 안내 문구 관리 `/operator/guide-contents` (PH) | 콘솔은 있으나 PH 화면이 읽지 않음(사실상 빈 데이터) | KPA 같은 콘솔 존재 | **폐지**(이전 대상 없음) |
| 제품 설명서 목록 `/store-owner/manuals` — 약국 | 공용 제품 설명(읽기 전용) 목록 · QR | 매장 상품 설명 편집 `/store/marketing/product-descriptions` + QR 화면 설명서 표시 | 새 기능 없이 **기존 경로로 안내**. 읽기 전용 다국어 설명서 목록이 꼭 필요하면 별도 판단 |

`e2e-qr-mttrdan3` 의 새 착지 `/guide` 는 이미 존재한다.

### 16-7. 인쇄 QR 경로 보존 리다이렉트 — 구현안 (실행 안 함)

**사실**: pharmacyhub.co.kr 는 전역 LB `o4o-global-lb` 의 path matcher `path-matcher-pharmacy-hub`(규칙 없이 defaultService = `backend-pharmacy-hub-web`) · 인증서 `cm-cert-pharmacyhub`(root · www) · DNS 는 Gabia. PH web 은 nginx 없이 `serve -s`. 인쇄 QR 경로 4종은 새 호스트에 **같은 경로로 존재**하고 공개 API 조회가 서비스 무관(QR slug · 다국어 public key · 제휴 shortCode)이라 **경로 재작성 없이 호스트만 바꾸면 된다**. 스캔 기록은 착지 화면이 API 를 부를 때 서버에서 남으므로 리다이렉트 후에도 유지(리다이렉트 자체는 기록 안 함, referer 는 리다이렉트 체인 반영).

**방식**: 저장소 선례(`www.neture.co.kr/hospital*` → LB `urlRedirect`, export → validate → import · fingerprint · backup 롤백)를 따른다. 앱 코드 변경 없음.

1단계 — 인쇄 QR 경로만(PH 서버 유지, 나머지 경로는 옛 서버가 계속 응답):

```yaml
# path-matcher-pharmacy-hub 에 pathRules 추가 (defaultService 는 backend-pharmacy-hub-web 그대로)
pathRules:
- paths: ['/qr/*', '/tablet/*', '/multilingual-products/*', '/foreign-visitor/affiliate/*']
  urlRedirect:
    hostRedirect: pharmacy.neture.co.kr
    httpsRedirect: true
    redirectResponseCode: FOUND        # 1단계 302 — 검증 뒤 MOVED_PERMANENTLY_DEFAULT
    stripQuery: false                  # ?tabletId= 등 보존
```

2단계 — PH 은퇴 완료 후 호스트 전체: `defaultUrlRedirect`(같은 hostRedirect · 301). 옛 서버만 가진 경로(`/store-owner/*` · 결제 복귀 · `/operator/*` · `/news`)는 그때까지 이전 · 종료돼 있어야 한다.

**검증**(적용 직후 · 롤백 판단):
1. `curl -sI https://pharmacyhub.co.kr/qr/<활성 slug>` → 302 · `Location: https://pharmacy.neture.co.kr/qr/<slug>`. `www.` 도 같음. `/tablet/<slug>?tabletId=x` 쿼리 보존.
2. 리다이렉트 대상 4종이 새 호스트에서 정상 렌더(활성 product · screen_set · 다국어 · 제휴 각 1건 실기기 스캔).
3. 스캔 후 `store_qr_scan_events` 증가(읽기, 5초 dedupe 고려).
4. 리다이렉트하지 않는 경로(`/`, `/store-owner/...`, 결제 복귀)는 옛 서버 응답 그대로.
5. `cm-cert-pharmacyhub` ACTIVE 유지(관리형 인증서 — 만료 표기 2026-11-01 전에 갱신 상태 확인) · API CORS 에 pharmacyhub.co.kr 유지.
6. 롤백: 적용 전 export 한 url-map 을 import.

**전제**: PR #308 배포 후(새 호스트 QR 화면 · 서비스 축 해석이 운영에 있어야 함). 적용 주체 = 웹 서비스 정비 트랙(LB 변경 = 인프라 변경, 사용자 승인). 이 PR 은 실행하지 않는다.
