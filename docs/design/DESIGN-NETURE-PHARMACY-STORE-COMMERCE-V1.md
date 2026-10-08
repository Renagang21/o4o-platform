# DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-08 (사업별 개발·한 약국 복수 서비스·전체 ToDo · §3 이메일 확인 기반 메인 자격·모집 기준 · §4 실제 모듈·필터 · §6 HUB 재배치 · §7 커뮤니티 배치) · 2026-10-07 (명칭 정정 "기본 가입" → "내 매장(약국) 신청" · 매장 표식의 `service_memberships('neture')` ensure 제거 ·  당시 수동 메인 승인 전제 — 2026-10-08 이메일 확인 기준으로 정정 · §3-3 공급자 승인의 Neture 결합 제거 · §13 이관 표 ensure 취소선 — [CHECK §10](../checks/CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md)) · 2026-10-06 (§17 운영 전환 호환 — 인덱스 2단계 · pharmacy 호스트 이용 자격 · §13 인증·가입 트랙 인계 계약 · §14 K-Cosmetics 퇴역 반영 · §15 미완료 범위 · 구현 결정 반영)
> **근거 WO/IR**: [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](../work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) 단계 1-7 · 입력 [`IR-NETURE-PHARMACY-STORE-COMMERCE-STEP1-CENSUS-V1`](../investigations/IR-NETURE-PHARMACY-STORE-COMMERCE-STEP1-CENSUS-V1.md)

Neture 약국 서비스의 **약국별 하나의 내 매장 · 내 매장(약국) 신청 · 세미프랜차이즈 가입 · 복수 공급 제안 · 선택 제안 주문 · 테스트 결제** 를 구현하기 위한 확정 설계다. IR 의 "사용자 판단 필요" 항목 중 기술 항목은 여기서 근거와 함께 확정한다(WO 단계 1 "보류" 절의 마지막 항목). 사업 판단 항목은 §11 에 남긴다.

설계 원칙:

- **대체, 누적 아님.** Neture 약국 흐름의 이용 자격은 새 내 매장(약국) 신청 · 세미프랜차이즈 가입 · 대상 약국 조건으로 **판정한다**. 과거 축(`kpa-society` service membership · `kpa:store_owner` · `offer_service_approvals(kpa-society)` · `distribution_type` · `allowed_seller_ids`)을 AND 로 덧붙이지 않는다. 그 축들은 다른 서비스 흐름을 위해 **코드와 데이터를 보존**하되 Neture 약국 흐름의 판정에는 쓰지 않는다.
- **세미프랜차이즈의 공통 식별은 serviceKey 가 아니라 데이터 행이다.** 각 사업자는 독립적으로 약국을 지원하며, 혈당관리의 무료 혈당기 사업·협동조합의 협력 사업처럼 업무는 사업별로 개발한다. 가입 식별·담당 사업 격리·기존 공급 계약을 공유한다는 이유로 사업 기능을 표준화하거나 모든 신규 사업을 행 등록만으로 완성한다고 가정하지 않는다.
- **관리자(=운영자)는 해당 서브도메인에 배치한다**(2026-10-08 사용자 결정). pharmacy 사업 관리와 store의 약국 신청 검토를 구분하고, 공급자·펀딩·커뮤니티 관리도 각 서비스 호스트에서 제공한다. 전체관리자는 `admin.neture.co.kr`에만 둔다. 아래 `neture:operator`·`neture:admin`은 현재 구현 식별이며 호스트 이전의 기능별 권한 정합은 전체 작업안 T03에서 처리한다.
- **경영자 한 명·약국 하나·내 매장 하나**를 기준으로 한다(2026-10-08 사용자 정정). 같은 약국이 pharmacy·혈당관리·협동조합 등 여러 서비스에 가입해 한 내 매장에서 이용하며 서비스별 구획은 탭 등으로 표현할 수 있다. 사용자당 여러 약국 신규 가입을 확장하지 않는다. 별개 내 매장의 데이터와 권한은 각각 독립적이다. 전체 연속 작업은 초안 ToDo를 코드·문서에 대조하고, 필요한 논의·수정 후 재대조한 [서비스 재배치 작업안](../work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)을 따른다.
- **재고 · 이벤트 수량 · 구매 한도 · 예약 · 차감 · 복원 로직은 함수 그대로 재사용한다.** 새로 짜지 않는다.
- 범용 권한 엔진 · 업종 확장 프레임워크 · 다중 PG 프레임워크를 만들지 않는다. 판정 SQL 은 한 모듈(§6 SSOT)에만 둔다.
- 테스트 데이터 승계 · backfill · 옛 주문 읽기 호환을 만들지 않는다(WO §6).

---

## 1. 8개 관계

| # | 관계 | 저장 | 카디널리티 · 제약 |
|---|---|---|---|
| R1 | 약국 조직 ↔ 내 매장 | `organizations` 행 1개 = 약국 = 내 매장 (기존 정의) | 같은 행. 별도 store 테이블 없음 |
| R2 | 약국 조직 ↔ 내 매장(약국) 신청 | **신규** `neture_pharmacy_memberships` | `organization_id UNIQUE` → 약국 1 : 내 매장(약국) 신청 1 : 매장 1. 사용자당 owner 약국 1개(앱 검사) · 진행 중 사업자번호 중복 금지(부분 UNIQUE) |
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
  community_key varchar(100) NULL UNIQUE,                     -- 사업 회원 커뮤니티 주소 (독립 communities.slug 와 충돌 금지)
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
| `organization_product_listings` | ~~`idx_org_listing_unique_v2` 를 부분 UNIQUE 로 교체~~ → **이 migration 에서는 바꾸지 않는다(전체 UNIQUE 유지, §17-1 1단계)**. 부분 UNIQUE 교체는 별도 2단계 migration | 구버전 API 의 `ON CONFLICT (organization_id, service_key, offer_id)` 가 부분 인덱스를 추론하지 못해 실패 → 배포 중 · 롤백 시 구버전과 호환되지 않는다. 이벤트 재신청 · 같은 제품 복수 이벤트는 2단계 전까지 API 가 명시 거절(409) |
| `seller_recruitments` | UNIQUE 를 `(product_id, seller_id, service_id, semi_franchise_id) NULLS NOT DISTINCT` 로 | 세미프랜차이즈별 모집 1건. 기존 행(semi_franchise_id NULL) 유일성 동일 |

재배치 보완 migration `AlignSellerRecruitmentApplicationIdentity1791477914134`는 기존 약국 조직 UNIQUE를 유지하고, 사용자 UNIQUE를 `applicant_organization_id IS NULL`인 신청에만 적용한다. 직접 신청 API도 같은 조직으로 중복을 확인한다. 한 약국의 경영자·내 매장은 하나이며, 담당자가 접근할 수 있는 다른 약국은 각각 독립 조직으로 처리한다. 이 변경은 소유 조직을 추가하거나 합치지 않는다. 조직별 신청이 같은 사용자를 공유하면 `down()`은 데이터를 삭제하지 않고 사용자 UNIQUE 복원을 차단한다. 운영 적용은 검토한 migration/배포 경로로 수행하고 이벤트 2단계 수동 인덱스와 구분한다.

- `idx_org_listing_unique_v2` 를 쓰는 `ON CONFLICT (organization_id, service_key, offer_id)` 소비처 9곳에 같은 predicate(`WHERE service_key <> 'neture-event-offer'`)를 붙인다. PostgreSQL 은 predicate 를 준 ON CONFLICT 가 비부분 인덱스도 추론하므로 **코드 변경을 migration 보다 먼저 배포해도 안전**하다. 반대 방향(부분 인덱스 + 구버전 코드)은 실패하므로 인덱스 교체는 §17-1 2단계에서만 한다.
- 만들지 않는 것: `checkout_orders` 컬럼(서비스 · 수취 주체는 metadata), 독립 `*_orders` · `*_payments`, `neture_orders` · `o4o_payments` unique 인덱스(운영 중복 데이터가 있으면 migration 이 깨질 수 있으므로 멱등은 advisory lock + 조건부 UPDATE 로 코드에서 보장 — §8).
- migration 규약: epoch13 은 manifest 최대값 초과, `manifest.ts` append + `expected-schema-states.ts` 지문을 같은 커밋에(격리 PostgreSQL 15 실행값). ESM 엔티티 규칙(CLAUDE.md §2).

---

## 3. 가입 · 승인 흐름

### 3-1. 내 매장(약국) 신청 · 승인 (R2)

> **명칭·자격 정정 (2026-10-08)**: 과거 "Neture 기본 가입"으로 불렀으나 이 원장(`neture_pharmacy_memberships`)은 **내 매장(약국) 신청 · 승인**이며 Neture 메인 원장과 별개다. 신청 · 승인 모두 신청자의 **현재 메인 이용 자격(active)** 을 확인한다. 메인 이용 자격은 정상 계정·이메일 확인이며 운영자 수동 승인을 전제로 하지 않는다. 명시적 정지·해지는 차단한다. 판정 구현은 `neture-main-membership.ts`, 정책은 [인증·가입 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)을 따른다. 기존 [CHECK §10](../checks/CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md) E1 · E2의 원장 분리 기록은 유지하되 당시 수동 승인 설명은 현행 자격 기준이 아니다.

```text
약국 사용자 (정상 계정·이메일 확인으로 메인 이용 자격 active — 로그인만으로는 신청할 수 없다)
 → POST /api/v1/neture/pharmacy/membership {pharmacyName, businessNumber, pharmacistLicenseNumber, address?, phone?}
     · 메인 이용 자격이 active가 아니면 403 NETURE_MEMBERSHIP_REQUIRED (승인 시점에도 신청자 기준으로 다시 확인 — 아니면 409)
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
- 내 매장(약국) 승인 · 반려 · 정지 · 재활성화는 Neture 가입 원장(`service_memberships` 'neture')을 만들거나 바꾸지 않는다. 거꾸로 Neture 메인 자격 충족 · 재활성화도 내 매장 · 세미프랜차이즈 · 공급자 원장과 역할을 만들거나 복구하지 않는다(원장 분리 기록 — [CHECK §10](../checks/CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md), 현행 자격은 위 정본).
- 상태 전이: `pending→active|rejected`, `active→suspended|terminated`, `suspended→active|terminated`, `rejected|terminated→pending`(재신청, 같은 행).

### 3-2. 세미프랜차이즈 가입 (R3) · 운영자 담당 (R4)

```text
약국(내 매장(약국) 신청 active) → POST /api/v1/neture/pharmacy/semi-franchises/:key/apply      (pending)
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
- 세미프랜차이즈 운영자는 약국 자격을 독립적으로 확인할 수 있도록 신청 목록에 내 매장(약국) 신청 원장의 사업자번호 · 면허번호 · 내 매장(약국) 신청 상태를 함께 보여준다.
- 운영 role 은 기존 `neture:operator` 를 재사용한다(새 role 없음 → F9 role 추가 절차 불필요). "어느 세미프랜차이즈인가" 는 담당 행이 정한다. `role_assignments.scope_id` 는 쓰지 않는다(부분 유니크 때문에 불가 — IR A §3-3).

### 3-3. 공급자 · 제품 등록 (현행 유지 + 결함 1건 수정)

- 공급자 가입 승인: `neture_suppliers` PENDING→ACTIVE, `supplier:operator`. 공급자 신청 · 승인 · 재활성화는 신청자의 현재 메인 이용 자격(active: 정상 계정·이메일 확인)을 **전제조건으로 확인만** 하며, Neture 가입 원장을 승인 · 반려 · 재활성화하지 않는다(과거 결합 제거 기록 — [CHECK §10](../checks/CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md) E3). 메인 자격 충족도 공급자 · 공급자 역할을 만들거나 복구하지 않는다.
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

- 가격 수정 경로 없음. 재신청 = 새 행 · 같은 제품 복수 승인 이벤트 공존 — **§17-1 2단계(부분 인덱스) 이후**. 1단계에서는 같은 세미프랜차이즈 · 같은 offer 의 두 번째 이벤트 신청을 `409 EVENT_REAPPLY_NOT_YET_SUPPORTED` 로 명시 거절한다.
- 종료는 단방향: Neture 이벤트에는 visibility 토글이 없다. KPA `groupbuy-admin/:id/visibility` 의 canceled→approved 되돌림은 **수정**한다(종료된 행은 되살리지 않음 — 승인 우회 제거).
- 주문은 OPL 을 jsonb 로만 참조하므로 취소해도 주문 기록이 손상되지 않는다(현행).
- 수량 · 한도 · 예약 · 복원은 `reserveEventOfferListing` · `incrementListingQuantity` · `STORE_ORDERED_QTY_SQL` 을 그대로 호출한다.

### 3-6. 취급매장 모집

**현재 약국 모집 기준(2026-10-08)**: 세미프랜차이즈가 지정돼 있으면 해당 사업 가입을, 미지정이면 pharmacy 가입을 확인한다. 목록과 참여 신청은 같은 판정을 사용하며 기존 KPA 테스트 데이터 보존용 우회를 추가하지 않는다. 미지정 모집을 보존하는 기존 `SellerRecruitmentService`와 지정 사업을 조회하는 새 경로의 현재 차이는 [전체 작업안](../work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md) §3·T05에서 생성·목록·신청·승인 후 공급까지 정렬할 항목이며, 여기서 구현 완료로 주장하지 않는다.

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

`apps/api-server/src/modules/neture-pharmacy/services/supply-access.ts` 한 곳이 4개 공급 경로의 "이 약국 조직이 지금 이용 · 주문할 수 있는가" 를 판정한다. 목록 · 검색 · 상세 · 장바구니 담기 · 주문 확정이 **모두 같은 모듈**을 쓴다(메뉴 숨김으로 대신하지 않음).

공통 조건(모든 경로): SPO `is_active` ∧ `deleted_at IS NULL` ∧ `approval_status='APPROVED'` ∧ 공급자 `status='ACTIVE'`.

| 경로 | 추가 조건 |
|---|---|
| default | `cardinality(spo.service_keys)=0` ∧ 약국의 `pharmacy` 세미프랜차이즈 가입 active |
| proposal | `sp.status='approved'` ∧ 세미프랜차이즈 `status='active'` ∧ 약국의 해당 세미프랜차이즈 가입 active ∧ (`target_organization_id IS NULL` ∨ = 약국) |
| event | OPL `service_key='neture-event-offer'` ∧ `status='approved'` ∧ `is_active` ∧ 기간 내 ∧ 운영 조직 → 세미프랜차이즈 active ∧ 약국 가입 active |
| recruitment | `exposure_status='approved'` ∧ `status='recruiting'` ∧ 약국 조직의 application `approved` ∧ 세미프랜차이즈 가입 active ∧ `supply_unit_price IS NOT NULL` |

- 미가입 · 미승인 · 정지 · 종료 세미프랜차이즈 항목은 전체 탭 · 검색 · 상세 · 주문 API 어디에도 나오지 않는다(상세는 404 `SUPPLY_OPTION_NOT_AVAILABLE`).
- 출처 탭·세미프랜차이즈 필터(`source=all|default|proposal|event|recruitment|sf:<key>`)는 접근 집합을 만든 **뒤** 거른다. 기존 통합 조회·필터와 회귀 테스트의 실제 범위를 먼저 확인한 뒤 필요한 화면 구획과 검증을 보완한다.
- 가격 비교 · 최저가 자동 선택 · 경고 없음. 응답은 공급 경로 · 공급자 · 조건 · 단가를 그대로 보여준다.

API: `GET /api/v1/neture/pharmacy/store/supply-options?source=&q=&page=` · `GET .../supply-options/:kind/:id`.

---

## 5. 내 매장 기본 게이트 (대체)

- 약국 매장 API(`/api/v1/kpa/...` 의 매장 controller 들 — 사이니지 · QR · 태블릿 · 자체 콘텐츠 · 매장 정보 등)는 공통 유틸 `isStoreOwner(ds, userId, 'kpa')` · `createRequireStoreOwner(ds, 'kpa')` 로 판정한다.
- **변경 (구현 `91155708c`)**: `kpa` 키의 판정을 "kpa-society active membership ∧ `kpa:store_owner` role ∧ kpa-society 연결 조직" 에서 **"사용자가 owner/admin/manager 인 조직 중 `neture_pharmacy_memberships.status='active'` 인 조직"** 으로 대체한다. 매장 경영자 계약 게이트 · ambiguous 409 · 선택 매장 헤더 규칙은 그대로.
  - 세미프랜차이즈(pharmacy 포함) 미가입이어도 내 매장 기본 기능 이용 가능 → WO §3-1 충족.
  - `cosmetics` · `pharmacy-hub` 키의 판정은 변경 없음.
- 같은 기준을 `resolveWorkScopeStore`(kpa-society membership 선검사 제거) · 매장 경영자 계약 게이트(`getPendingStoreOwnerAgreementsForUser` — kpa-society 계약은 원장 active 약국에 요구)에도 적용한다. 매장 목록(`accessible-stores`)은 조직 owner 관계만 보므로 그대로 나온다.
- **매장 표식(구현 결정)**: 매장 판정은 원장이지만, JWT role 로 화면 · 콘텐츠 사본(F3 `asset-copy-core` allowedRoles)을 여는 기존 소비처가 있어 내 매장(약국) 신청 승인 · 재활성 시 표식을 붙이고 정지 · 종료 시 거둔다 — role `neture:store_owner`(신규. ~~`service_memberships('neture')` ensure 동반~~ — 2026-10-07 제거: 내 매장(약국) 승인은 Neture 원장을 만들지 않는다, CHECK §10 E1), `organization_service_enrollments('kpa-society')`(매장의 약국 업무 영역 = web-store 서비스 문맥, 세미프랜차이즈 가입이 아님), `platform_store_slugs('kpa')`(공개 주소). `service_memberships('neture')` 는 공급자 축과 공유될 수 있어 정지 시 건드리지 않는다. 표식 동기화 실패는 원장 판정에 영향이 없다.
- 승인 우회 차단: `POST /api/v1/store/enrollment` 의 `ENROLLABLE_SERVICE_KEYS` 에서 `kpa` 제거(약국 매장은 내 매장(약국) 신청으로만).
- KPA 회원 승인 시 매장 프로비저닝(`ensureKpaStoreOrganization`, member.controller 2곳)은 새 게이트에서 매장 권한을 주지 않는다(실효 없음). 호출 제거는 KPA 운영 콘솔 흐름 · F10 승인 엔진 kpa 분기와 얽혀 있어 **별도 정리 WO** 로 남긴다.

---

## 6. 내 매장 직접 이용 · HUB 단계 제거

- 공급 상품·이벤트·모집은 `/store/pharmacy/supply`, 주문은 기존 장바구니·주문 화면에서 직접 이용한다. 별도 HUB 선택·취급 등록을 요구하지 않는다.
- 사업 제공 콘텐츠는 `/store/pharmacy/contents`, 일반 자료·공급자 공개 자료·QR·POP·블로그·사이니지 등은 `/store/library/*`에 배치한다. 자체 자료와 사본은 기존 자료함을 사용한다.
- 공급자 공개 자료는 현행 `is_public=true` 읽기 전용 계약을 유지한다. 화면 이전으로 사본 권한을 새로 부여하지 않는다. 사업 사본은 기존 Copy API를 사용하며 출처를 유지한다.
- `web-store`의 `/hub/*`·`/store-hub/*`는 기능별 새 위치로 연결하는 주소 adapter다. 중간 HUB 홈과 중복 B2B 탐색 화면은 제거했다. pharmacy 앱의 옛 HUB도 로그인 전달 후 같은 목적지로 연결한다.
- 공통 콘텐츠 API(`/api/v1/hub/contents`)와 다른 서비스가 소비하는 Core는 유지한다. 화면의 HUB 제거와 공통 API 이름 변경을 같은 작업으로 취급하지 않는다.
- 이 branch의 구현·로컬 검증이며 운영 적용 여부는 [전체 재배치 CHECK](../checks/CHECK-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)에 구분한다.

## 7. 커뮤니티

- `community.neture.co.kr`은 독립 가입 커뮤니티와 사업 참여 회원용 커뮤니티의 공통 이용 공간이다. 강좌는 study의 독립 업무이며 커뮤니티 capability·개설 문의·회원 안내에서 분리한다.
- **독립 약사 커뮤니티**: `communityKey=pharmacy`를 보존한다. 별도의 `community_memberships` 승인과 정상 메인 계정을 확인하며, KPA/PH 서비스 가입을 추가로 요구하지 않는다. 기존 게시판 코드는 `kpa-society`·`pharmacy-hub` 합집합으로 보존한다.
- **사업 커뮤니티**: `semi_franchises.community_key`로 식별하고 `communities` 행이나 `community_memberships`를 만들지 않는다. pharmacy 사업 회원 포럼도 독립 약사 커뮤니티와 다른 주소를 지정해야 한다. 신규·변경 주소는 정적 카탈로그, DB 독립 커뮤니티, 대기 중인 개설 신청, 다른 사업과의 충돌을 공통 advisory lock 안에서 검사한다.
- 회원은 정상 메인 계정, 활성 내 매장 승인, 같은 약국 조직의 owner/admin/manager, 해당 사업 가입 active를 만족해야 한다. 현재 담당 지정과 `neture:operator/admin` 역할을 갖춘 사업 운영자는 약국 소유나 일반 회원 가입 없이 자기 사업의 포럼을 관리한다. 폐쇄한 사업은 독립 커뮤니티 판정으로 우회하지 않는다.
- 새로운 사업 포럼의 저장 코드는 `sf:<UUID>`, 신규 DB 독립 커뮤니티는 `community:<UUID>`다. 기존 `varchar(50)` 안에 들어가므로 Forum 원장 migration·이름 변경·백필은 하지 않는다. 주소를 바꾸어도 저장 범위는 같은 UUID다.
- 목록·access·Forum API는 `resolveCommunityWorkspace`의 현재 DB 판정을 재사용한다. `/communities/:key/forum`에서 기존 Forum router/controller로 게시판·글·댓글·좋아요·소유 게시판 회원 관리를 제공한다. 개설 신청은 기존 상태 머신을 재사용하며 담당 운영자의 승인·거절·글/댓글 삭제·공지 범위를 해당 공간에 제한한다.
- 정지·종료는 그 사업의 공급·원본 콘텐츠·포럼을 차단한다. 이미 가져온 매장 사본과 기존 주문의 조회·후속 처리는 보존하고, 다른 사업과 독립 커뮤니티의 자격을 변경하지 않는다.
- 해당 화면·API와 로컬 회귀는 구현했다. 운영 배포·신규 실제 계정 업무 확인까지 마무리되어야 전체 완료다.

---

## 8. 장바구니 · 주문 · 결제

### 8-1. 장바구니 (R7)

- 저장소 `store_cart_items`(기존) · `service_key='neture-pharmacy'` · `buyer_id` = 사용자 · `organization_id` = 서버가 해석한 약국 조직.
- API: `GET/POST/PATCH/DELETE /api/v1/neture/pharmacy/cart(/items/:id)` — 담기 입력 `{kind, id, quantity}`(`kind`: default=SPO id · proposal · event · recruitment). 담을 때 §4 판정. `price_snapshot` 은 표시용(신뢰 안 함).
- 장바구니 단위 = **(구매자, 약국 조직)**. 조회 · 담기 병합 · 수량 · 삭제 · 확정 · 확정 후 삭제 모두 `organization_id` 를 건다 — 다른 조직에 접근할 권한이 있더라도 A 약국에 담은 행을 B 약국 문맥(`X-Store-Organization-Id`)에서 보거나 주문하지 않는다(Codex 리뷰 반영 `fed5afe1e`).

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
| **대체(Neture 약국 흐름의 판정 근거 교체)** | 매장 기본 게이트(`kpa` 키) → 내 매장(약국) 신청 원장 · 상품 노출 판정(PUBLIC/SERVICE/PRIVATE · OSA kpa-society · `allowed_seller_ids`) → §4 · 모집 참여 사용자 → 조직 · 커뮤니티 별도 가입 → 세미프랜차이즈 가입 상태 · 이벤트 운영 조직 LIMIT 1 → 세미프랜차이즈 운영 조직 |
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
| `store_qr_codes` 비활성 E2E link QR 4행(§16-3 A, 착지 pharmacyhub.co.kr) | 삭제 후보(결정 2026-10-06) — 다른 테스트 데이터와 함께 dry-run · 승인 후 실행. 인쇄 QR 보존(§16-3 B)과 별개 |
| 보존 | 사용자 계정 · 공급자 · 제품(SPO · master) · K-Cosmetics · PharmacyHub · KPA 분회 · 커뮤니티 데이터 · 공통 운영 설정 |

실제 삭제 SQL 과 대상 건수는 dry-run(SELECT count) 결과와 함께 사용자 승인 요청 시 제시한다.

---

## 13. 담당 경계 · 인계 계약 (인증 · 가입 트랙 ↔ Store/Commerce 트랙)

사용자 결정(2026-10-05): 가입 원장 · 추가정보 · 신청 상태 · 승인/반려 · role 발급 · 승인 orchestration 은 **인증 · 가입 트랙**, 약국 조직 · 내 매장 · 업무 enrollment · slug 연결은 **Store/Commerce 트랙**이다. 이 WO 가 먼저 구현한 코드를 기준으로 인계하며, 두 트랙이 같은 승인 · role · 조직 생성 로직을 따로 만들지 않는다.

| 구분 | 현재 코드 (`apps/api-server/src/modules/neture-pharmacy/`) | 소유 | 인계 방식 |
|---|---|---|---|
| 내 매장(약국) 신청 원장 테이블 `neture_pharmacy_memberships` (상태 · 자격 정보 · 결정 이력) | migration `CreateNeturePharmacyCommerce1791200000000` | **인증 · 가입** | 테이블 · 상태 전이(`constants.ts` `nextMembershipStatus` · `canReapply`) 소유 이전. Store 는 읽기만(아래 계약) |
| 신청 · 재신청 · 운영자 처리(승인 · 반려 · 정지 · 재개 · 종료) | `services/pharmacy-membership.service.ts` · 라우트 `/neture/pharmacy/membership` · `/neture/operator/pharmacy-memberships/*` · web-store `/start-pharmacy` · web-neture `/operator/pharmacy-memberships` | **인증 · 가입** | 파일 · 라우트 · 화면 그대로 이관. 인증 트랙의 공통 가입 · 추가정보 흐름에 편입할 때 이 서비스를 확장하고 새로 만들지 않는다 |
| 승인 orchestration · role 발급/회수 (`neture:store_owner`. ~~`service_memberships('neture')` ensure~~ — 2026-10-07 제거, Neture 가입 원장을 만들지 않는다 · CHECK §10 E1) | `services/pharmacy-store-provisioner.ts` | **인증 · 가입** | 그대로 이관. Store 쪽 작업은 아래 계약 함수를 호출만 한다 |
| 약국 조직(= 내 매장) 생성 · owner 관계 · 재신청 시 표시 정보 갱신 | `services/pharmacy-store-link.ts` `createPharmacyStoreOrganization` · `updatePharmacyStoreProfile` | **Store** | 계약 함수(아래) |
| 약국 업무 영역 enrollment(`kpa-society`) · 매장 공개 주소 slug(`kpa`) 연결 · 해제 | `pharmacy-store-link.ts` `activatePharmacyStore` · `deactivatePharmacyStore` | **Store** | 계약 함수(아래) |
| 매장 접근 판정 · 매장 목록 | `utils/store-organization.resolver.ts`(`kpa` 후보) · `utils/store-owner.utils.ts` · `utils/service-tenant.resolver.ts`(`accessible-stores`) | **Store** | 원장 `status='active'` 를 읽는다 |
| 세미프랜차이즈 가입 · 공급 제안 · 이벤트 · 모집 · 장바구니 · 주문 · 결제 · 커뮤니티 접근 | 나머지 services · 라우트 · 화면 | **Store/Commerce** | 유지 |

**Store 가 제공하는 계약 (`pharmacy-store-link.ts`)**

```text
createPharmacyStoreOrganization(exec, userId, {pharmacyName, businessNumber, address?, phone?}) → organizationId
    신청 트랜잭션 안에서 호출. 약국 조직(type='pharmacy') 1개 + owner 관계.
updatePharmacyStoreProfile(exec, organizationId, profile)        재신청 시 같은 조직 갱신(약국 1 : 매장 1)
activatePharmacyStore(ds, {organizationId, pharmacyName})       내 매장(약국) 신청 active 전이 후 호출(멱등)
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
- 출처별 자료함: 매장 자료함 피드 source `franchise` 추가(`store-library-feed.controller.ts`) — 전체 · 운영자 제공 · 커뮤니티 가져옴 · **세미프랜차이즈** · 내가 만든 콘텐츠. 공급자 공개 자료는 내 매장 `/store/library/supplier-library`에서 직접 열람한다.
- API: 약국 `GET /api/v1/neture/pharmacy/store/contents(?sf,q)` · `GET …/:id` · `POST …/:id/copy` / 담당 운영자 `GET|POST /api/v1/neture/operator/semi-franchises/:key/contents` · `GET|PATCH …/:id` · `POST …/:id/{publish|archive}`.
- 화면: web-store `/store/pharmacy/contents`(이용 가능 콘텐츠) · 매장 자료함 "세미프랜차이즈" 탭 / pharmacy.neture.co.kr 담당 사업 운영의 "콘텐츠" 탭 · 작성 · 수정.
- 검증: 통합 테스트(게시 전 비노출 · 가입 약국만 · 사본 독립성 · 보관 · 정지 차단) + 로컬 브라우저(운영자 작성 · 게시 → 약국 목록 · 사본 → 자료함 탭) — CHECK 문서.

### 15-2. 현재 구현과 운영 대기 (2026-10-08)

| 항목 | 구현 상태 | 남은 일 |
|---|---|---|
| 독립·사업 커뮤니티 게시판 | 전체 재배치 branch에서 저장 범위·게시판/글/댓글·개설 심사·회원 관리와 화면을 연결. 로컬 API·브라우저 검증 | 최신 HEAD 리뷰·통합·배포·운영 업무 확인 |
| 기존 KPA 매장 provisioning | runtime 호출은 #349에서 제거. 이번 branch에서 미사용 정의·테스트를 제거하고 현행 매장 식별 상수만 별도 유지 | 통합·배포 회귀 |
| 이벤트 2단계 | 수동 전환 도구·인덱스 상태별 API·재신청/복수 신청 로컬 회귀 구현 | 1단계 운영 안정 확인·복구 기준 확정 후 수동 전환 (§17-1) |
| PH QR·인프라·옛 데이터 | 네 경로 이전 구현과 읽기 전용 census·302 URL map 초안 생성 도구 준비 | 실제 QR 업무 확인·외부 설정 적용·대상별 처분·301/서버 종료 조건 확인 (§16) |

전체 연속 작업의 상태는 [재배치 WO](../work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)와 [CHECK](../checks/CHECK-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)를 따른다. 로컬 PASS를 운영 완료로 변경하지 않는다.

### 15-3. 당시 PR 범위 구분 (2026-10-05 기록)

아래는 당시 범위 기록이다. #349 통합 이후 현행 구현·운영 대기는 §15-2와 전체 재배치 CHECK가 기록한다.

| 구분 | 항목 |
|---|---|
| **이 PR 에서 완료** (코드 · 테스트 · 로컬 검증) | 내 매장(약국) 신청 · 세미프랜차이즈 · 공급 제안 · 이벤트 · 모집 · 장바구니(조직 단위) · 주문 · 테스트 결제 · 공급자 처리 · 콘텐츠 자료함(§15-1) · 커뮤니티 접근 판정 · PH 신규 가입 은퇴 · PH commerce 화면 이전 · QR 착지 이전 준비(§16-2) · 리다이렉트 구현안(§16-7) |
| **운영 적용 대기** (사용자 승인) | main 통합 · migration · 배포 · `NETURE_PHARMACY_PAYMENT_MODE=test` · 운영 검증 · 테스트 데이터 초기화(§12) · QR link 4행 처리(§16-3 A) · 실제 PG(D1) |
| **결정 완료 (2026-10-06)** | PH opt-in 은 새로 만들지 않음 · 신규 시작 종료(§16-5) · 이용 안내 → 기존 `/guide/*`, 소식 → 홈 공지, PH 안내 문구 관리 폐지(§16-6) |
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
| **폐지(신규) · 유지(기존 주문)** | 공급자 opt-in 배송(PH 전용) | 결정 §16-5 — Neture 에 새로 만들지 않음. 신규 제공 시작 410 · 기본 공급 노출로 이어지는 제공 중지 409. 기존 PH 주문 처리 경로 유지 |
| **이전 · 폐지(결정)** | 이용 안내(guide) · 소식(news) · 안내 문구 · 제품 설명서 목록 | 결정 §16-6 — 안내는 기존 `/guide/*`, 소식은 홈 공지, PH 안내 문구 관리 화면 제거. 새 관리 구조 없음 |

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

- **결정(2026-10-06): ② 테스트 데이터 초기화 대상** — §12 표에 기록. 운영 DB 삭제는 아직 실행하지 않는다(테스트 데이터 초기화 승인 때 함께 dry-run · 실행). 아래 새 값 변경 SQL 은 쓰지 않는다(참고용으로 남김). 비활성 테스트 행이라 운영 영향은 없다 — **인쇄 QR 보존(B)과 무관**.
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
3. 남은 PH `CREATED` 결제 정리 · 진행 중 PH opt-in 주문 종료 확인(§16-5) · 이용 안내 문구 이전(§16-6, 운영자 편집).
4. 그 뒤 §16-7 2단계(호스트 전체 리다이렉트) → PH web 서버(`pharmacy-hub-web`) · PH 고정 spec 정리. 도메인 · 인증서 해지는 인쇄 QR 폐기 판단 이후 별도.

### 16-5. 공급자 opt-in 배송 (PH 전용) — 조사 결과

| 항목 | 내용 |
|---|---|
| 현재 기능 | 공급자가 자기 제품(SPO)마다 PH 공급을 켜고 끈다. 켜면 `supplier_product_offers.service_keys` 에 `pharmacy-hub` 추가 + 선택적 서비스 단가 `offer_service_prices`. **운영자 승인 없이** PH 매장 진열에 즉시 노출(노출 게이트가 `approval_status` 를 보지 않음). 주문은 PH 장바구니 → `checkout_orders(source=pharmacy_hub_cart)` → bridge `neture_orders(service_key='pharmacy-hub')` → 공급자 처리(수락 · 발송) |
| 화면 · API | web-neture 공급자 "서비스 제공 설정" `/supplier/services/pharmacy-hub` · API `/neture/supplier/services/:serviceKey/products · orders` (`SUPPLIER_OPTIN_SERVICE_KEYS=['pharmacy-hub']` 만 허용) |
| 이용 대상 | 공급자(설정 · 주문 처리) → PH 약국(진열 · 주문). PH 운영자 개입 없음 |
| Neture 대체 가능 여부 | **배송 · 주문 처리는 대체됨**(같은 공급자 배송 정책 · bridge · 공통 공급자 주문 목록). **노출 방식은 대체 안 됨**: 기본 공급은 운영자 제품 승인 + `service_keys` 빈 제품 + 일반가, 공급 제안은 공급자 단가 지정이 되지만 세미프랜차이즈 담당 운영자 승인이 필요. "공급자 혼자 켜는 즉시 노출 · 서비스 단가" 는 없다 |
| 주의 | opt-in 제품은 `service_keys` 가 비어 있지 않아 Neture 기본 공급에 안 보인다. PH 은퇴 때 `pharmacy-hub` 키를 지우면 APPROVED · 다른 키 없는 제품이 **기본 공급으로 새로 노출**될 수 있다 — 대상 제품 확인 후 정리 |

**권장**: 공급자 자가 노출은 Neture 약국 모델(운영자 승인 기반)과 맞지 않으므로 **새로 만들지 않는다**. 서비스 단가가 필요한 제품은 공급 제안(공급자 단가 + 담당 운영자 승인), 일반가면 기본 공급(제품 등록 승인)으로 안내한다. 필요한 변경: 공급자 "서비스 제공 설정" 화면에 Neture 약국 경로 안내 · PH 은퇴 시점에 opt-in 메뉴 숨김 · 진행 중 PH 주문 처리 경로 유지. 데이터 정리(`service_keys` 의 `pharmacy-hub` · `offer_service_prices`)는 PH 주문 종료 후 영향 제품 목록(dry-run)으로.

**결정 (2026-10-06)** — 공급자 자가 opt-in 은 Neture 에 새로 구현하지 않는다. 일반 공급은 기본 공급(제품 등록 승인), 별도 단가는 공급 제안으로 안내한다. 기존 opt-in 데이터를 `supply_proposals` 로 자동 변환하지 않는다. 기존 PH 주문의 공급자 처리 경로(`/neture/supplier/services/:serviceKey/orders` · 수락 · 발송)는 유지한다.

| 반영 (이 PR) | 내용 |
|---|---|
| 신규 제공 시작 차단 | `setServiceDelivery` 에서 opt-in 키(`pharmacy-hub`) 를 새로 켜는 요청 → 410 `SUPPLIER_OPTIN_RETIRED`(안내: 기본 공급 · 공급 제안). 이미 켜진 상품의 단가 변경 · 재저장은 종전대로 |
| 기본 공급 노출 방지 | `service_keys` 가 `pharmacy-hub` 하나뿐인 상품의 제공 중지 → 409 `OPTIN_STOP_WOULD_EXPOSE_DEFAULT_SUPPLY`(키가 비면 `cardinality(service_keys)=0` 으로 Neture 약국 기본 공급 판정). 공급을 멈추려면 상품 비활성. 다른 키가 남는 중지는 종전대로 그 키만 제거 |
| 공급자 화면 | `/supplier/services/pharmacy-hub` — 신규 시작 버튼 제거("신규 제공 종료"), Neture 약국 경로 안내, 기존 주문 처리 유지 문구 |
| 영향 규모(운영 읽기 2026-10-05) | APPROVED · 활성 · `service_keys=['pharmacy-hub']` 만 가진 상품 18건 — 키만 지우면 기본 공급으로 새로 노출되는 대상 |
| 테스트 | `offer-optin-retirement.test.ts` 4건(신규 시작 거부 · 단독 키 중지 거부 · 복수 키 중지 정상 · 소유 검사) |

**PH 은퇴 시 데이터 정리 규칙**: `pharmacy-hub` 키를 단순 제거(`array_remove`)하지 않는다. 키가 단독인 상품은 키 제거와 함께 비활성(또는 `approval_status` 조정)을 같은 dry-run 목록 · 승인으로 처리해 공급 범위가 넓어지지 않게 한다. 실행은 PH 주문 종료 후 별도 승인.

### 16-6. 이용 안내 · 소식 · 안내 문구 · 제품 설명서 — 조사 결과

새 호스트 `pharmacy.neture.co.kr` = `web-kpa-society`(serviceKey `kpa-society`).

| PH 콘텐츠 | 현재 (PH) | 새 호스트 대응 | 권장 위치 · 필요한 변경 |
|---|---|---|---|
| 이용 안내 `/guide/*` (소개 · 이용 방법 · 기능 9종) — 약국 · 비로그인 | 코드 고정 문구(`shared-space-ui` copy `pharmacy-hub.ts`), 운영자 편집 불가 | `/guide` · `/guide/intro` · 이용 방법 · 기능 10종 존재. 운영자 편집 가능(`guide_contents`, `/operator/guide-contents`) | 공통 항목(소개 · 포럼 · 콘텐츠 · QR · POP · 사이니지)은 **기존 KPA `/guide/*` 사용**. 빠진 것: **공급 주문 · 매장 상품** 기능 안내 2쪽(Neture 약국 공급 상품 · 장바구니 · 주문 경로 기준), 태블릿 · 설명서는 QR 쪽 문구에 흡수. 소개 문구가 "KPA-Society" 기준이라 Neture 약국 기준 문구 정비 필요 |
| 소식 `/news` · `/news/:id` — 공개 | `cms_contents`(serviceKey `pharmacy-hub`, type news), 운영자 편집 가능 | 운영자 콘텐츠 관리(`kpa-society`) 있음, **공개 소식 목록 · 상세 화면 없음**(홈 공지만) | 결정 필요: ① 공개 소식 목록 · 상세 추가 ② 홈 공지로 대체. PH 기존 소식 행은 옛 호스트에 두거나 일회성 이전(운영 write) |
| 안내 문구 관리 `/operator/guide-contents` (PH) | 콘솔은 있으나 PH 화면이 읽지 않음(사실상 빈 데이터) | KPA 같은 콘솔 존재 | **폐지**(이전 대상 없음) |
| 제품 설명서 목록 `/store-owner/manuals` — 약국 | 공용 제품 설명(읽기 전용) 목록 · QR | 매장 상품 설명 편집 `/store/marketing/product-descriptions` + QR 화면 설명서 표시 | 새 기능 없이 **기존 경로로 안내**. 읽기 전용 다국어 설명서 목록이 꼭 필요하면 별도 판단 |

`e2e-qr-mttrdan3` 의 새 착지 `/guide` 는 이미 존재한다.

**결정 (2026-10-06)** — 기존 기능으로 처리하고 별도 관리 구조를 추가하지 않는다.

| 대상 | 처리 |
|---|---|
| 이용 안내 | 새 호스트의 기존 `/guide/*` 사용. 빠진 공급 주문 · 매장 상품 안내와 Neture 약국 기준 문구는 **기존 운영자 안내 문구 편집**(`guide_contents`, 새 호스트 `/operator/guide-contents`)으로 반영 — 새 화면 · 라우트 추가 없음. 문구 반영은 배포 후 운영 작업(§16-4 3) |
| 소식 | 홈 공지로 대체. 공개 소식 목록 · 상세 화면은 만들지 않는다. PH 기존 소식 행은 옛 호스트가 응답하는 동안 그대로 두고 이전하지 않는다 |
| PH 안내 문구 관리 | 폐지 — web-pharmacy-hub `/operator/guide-contents` 메뉴 · 라우트 · 화면 · 클라이언트 제거(PH 안내 화면은 코드 고정 문구라 이 데이터를 읽지 않았음). 공통 `GuideContentsConsolePage` · `guide_contents` 테이블은 다른 서비스가 쓰므로 그대로 |
| 제품 설명서 목록 | 새 기능 없이 기존 경로 안내(위 표) |

### 16-7. 인쇄 QR 경로 보존 리다이렉트 — 구현안 (운영 적용 안 함)

`node scripts/deployment/pharmacy-hub-qr-redirect.mjs exported-map.json review-map.json`은 실제 URL map export를 입력받아 검토할 302 초안을 새 파일로 만든다. 외부 API를 호출하지 않는다. 다른 host/route와 PH default backend를 보존하고 충돌·예상하지 못한 rule은 차단한다. 현재 운영 URL map export·실제 QR 검증·외부 적용은 미실행이다.

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

**전제**: PR #308 배포 후(새 호스트 QR 화면 · 서비스 축 해석이 운영에 있어야 함). 적용 주체 = 웹 서비스 정비 트랙(LB 변경 = 인프라 변경, 사용자 승인). 이 PR 은 실행하지 않는다. 운영 검증 전까지 옛 서버 · 도메인 · 인증서를 보존한다.

**리다이렉트 대상 4종 새 화면 확인 (코드 추적 2026-10-06, 실행 검증 아님)** — 같은 경로 문자열만으로 판단하지 않고 화면 · 매장/상품 문맥 · 쿼리를 대조했다.

| 경로 | 새 호스트 화면 | 매장 · 상품 문맥 | 경로 · 쿼리 |
|---|---|---|---|
| `/qr/:slug` | 존재(공개) | 공개 QR 해석이 serviceKey 필터 없이 slug 전역 조회 → 같은 매장 · 같은 product/screen_set/link 대상(§16-2 서비스 축 규칙) | slug 그대로 |
| `/tablet/:slug` | 존재(공개) | 매장 slug 전역 조회 → 같은 매장 | `tabletId` · `language` 를 같은 이름으로 읽음 |
| `/multilingual-products/:publicKey` | 존재(공개) | public key 전역 조회 → 같은 상품 · 매장 | `locale` · `mode=tablet` 양쪽 동일 |
| `/foreign-visitor/affiliate/:shortCode` | 존재(공개) | shortCode 전역 조회 → 같은 제휴 매장 | 그대로 |

판정: **차단 격차 없음**. 아래 1 은 **해당 경로의 302 전환 전 해결 조건**이며 이 PR 에서 해결했다. 2~4 는 1단계 302 → 검증 → 301 전환 전에 웹 서비스 정비 트랙이 확인 · 정리할 조건(이 PR 범위 밖, 기존 KPA 화면 동작):
1. ~~제휴 페이지 "매장 안내 보기" 가 은퇴한 `/store/{slug}` 로 연결돼 404~~ → **해결(2026-10-06)**: 매장 공개 storefront 는 `WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1` 로 폐지된 기능이므로 링크를 제거하고 PH 화면과 같은 안내 문구(상품별 QR 안내 · 직원 문의)만 표시(`services/web-kpa-society/.../ForeignVisitorAffiliatePublicLandingPage.tsx`).
2. product QR "제품 보기" 가 B2C 비공개 상품이면 404(상품 요약 · 설명서는 화면 안에 표시됨, §16-2).
3. link QR 은 자동 이동 대신 안내 카드 표시 · 대상 콘텐츠가 삭제된 page QR 은 `/content/:id` 로 떨어짐 — PH 와 동작 차이.
4. 다국어 · 제휴 화면의 서비스명 표기가 "KPA-Society" — Neture 약국 기준 문구 정비.

---

## 17. 운영 전환 호환 (WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1, 2026-10-06)

운영 promote 전 해결 대상 2건(구버전 API `ON CONFLICT` 호환 · 승인 약국의 pharmacy 호스트 403)의 확정 방식이다. 검증 기록: [`CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1`](../checks/CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1.md).

### 17-1. `idx_org_listing_unique_v2` 2단계 전환

| 단계 | 인덱스 | API | 구버전 API 롤백 |
|---|---|---|---|
| **1단계** (`CreateNeturePharmacyCommerce1791200000000`) | 전체 UNIQUE `(organization_id, service_key, offer_id)` 유지 | 신버전 `ON CONFLICT ... WHERE service_key <> 'neture-event-offer'` · 구버전 `ON CONFLICT (cols)` 모두 동작. 이벤트 재신청 · 같은 offer 복수 이벤트 → `409 EVENT_REAPPLY_NOT_YET_SUPPORTED` | **가능** — 인덱스가 바뀌지 않았으므로 migration 이전 API 로 되돌려도 쿼리가 실패하지 않는다(새 테이블 · 컬럼은 구버전이 읽지 않는다) |
| **2단계** (수동 전환 도구, 자동 migration에 미등록) | 부분 UNIQUE `WHERE service_key <> 'neture-event-offer'` 로 교체 | 실제 인덱스 상태가 phase-two일 때 재신청·같은 offer 복수 이벤트 허용 | **불가** — 구버전 `ON CONFLICT (cols)` 가 `no unique or exclusion constraint matching` 으로 실패. 롤백은 1단계 이후 API 까지만 |

수동 CLI: 검토한 checkout에서 API를 tsc로 빌드한 뒤 `node --import tsx dist/modules/neture-pharmacy/operations/event-index-transition-cli.js`를 실행한다. 기본은 읽기 전용이며, 적용에는 `--apply --phase-one-verified --rollback-floor=<검토된 API commit SHA>`가 필요하다. 이 옵션은 운영 검증 기록을 대신하지 않는다. 전환은 한 transaction과 테이블 잠금으로 처리하며, 원복 시 중복 행이 있으면 인덱스를 건드리기 전에 차단한다.

2단계 착수 조건: 1단계 API 가 운영에 배포 · 안정화되어 구버전 롤백 필요성이 없어진 뒤. 그 전에 남은 `ON CONFLICT (cols)` 소비처 0 건 재확인(이미 적용된 옛 migration 파일 2개는 재실행되지 않으므로 대상 아님).

### 17-2. pharmacy.neture.co.kr 이용 자격

- 판정: **같은 약국 조직에서 내 매장(약국) 신청 active ∧ pharmacy 세미프랜차이즈 가입 active**, 사용자는 그 조직 owner/admin/manager(`left_at IS NULL`). SSOT = `modules/neture-pharmacy/services/semi-franchise-service-access.ts`. 카탈로그 `semiFranchiseAccessKey`(kpa-society → `pharmacy`) 로 대상 서비스를 정한다.
- 적용 지점(같은 판정): 이메일 · Google 직접 로그인 · handoff 발급 · handoff 교환 · 화면 게이트(`MembershipGate` → `GET /neture/pharmacy/service-access/:serviceKey`).
- kpa-society `service_memberships` 가 active 이면 기존 경로 그대로(세미프랜차이즈 조회 0). 기존 kpa-society 가입 · `kpa:store_owner` 를 Neture 자격으로 **재해석하지 않는다**. 판정은 membership · role 을 만들지 않는다(읽기만).
- 미충족은 상태별 `next`(`apply_pharmacy` · `pharmacy_pending` · `pharmacy_suspended` · `apply_semi_franchise` · `semi_franchise_pending` · `semi_franchise_suspended`) + 안내 문구 + 신청 링크(store.neture.co.kr `/start-pharmacy` · `/store/pharmacy/semi-franchises`, 정지는 링크 없음).
- 포럼은 사업 서비스 가입과 구분한다. 옛 pharmacy `/forum/*`는 community의 독립 약사 커뮤니티로 연결하며, 사업 회원 포럼은 별도 community_key와 해당 사업 가입을 검사한다(§7).
