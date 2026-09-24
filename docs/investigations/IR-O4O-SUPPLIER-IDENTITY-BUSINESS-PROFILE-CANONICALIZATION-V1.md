# IR-O4O-SUPPLIER-IDENTITY-BUSINESS-PROFILE-CANONICALIZATION-V1

> **성격:** INVESTIGATION ONLY — 코드 구현 0 · DB write 0 · migration 0 · 배포 0 · 운영 데이터 수정 0
> **기준 `origin/main`:** `ea0dbee6f` (`HEAD == origin/main` · reset/rebase 0 · 타 세션 dirty/untracked 불가침)
> **조사일:** 2026-09-24
> **선행 CLOSED(재판단 안 함):** SUPPLIER_PRODUCT_REGISTRATION · SUPPLIER_POST_REGISTRATION_PRODUCT · ORDER_PAYMENT_FULFILLMENT
> **핵심 결론 3줄:**
> 1. `neture_suppliers.user_id` 는 **CANONICAL 이 아니라 LEGACY_SHORTCUT** 이다. 등록 코드가 Organization owner membership 도 함께 만들면서 **두 관계를 이중 기록**하고, guard 만 shortcut 을 읽는다.
> 2. 운영 3건은 `user_id` NULL + **org owner membership 0건 + `created_by_user_id` NULL** → **AMBIGUOUS**. deterministic repair 불가.
> 3. `users.businessInfo` 에 사업자 정보 **13키가 실재**한다(이전 IR 의 "2필드" 판정은 과소평가). Business Identity 가 3원장에 흩어져 있고 `PATCH /supplier/profile` 이 **트랜잭션 없이 3원장에 순차 write** 한다.

---

# 1. 기준 · 방법

```bash
git rev-parse HEAD → ea0dbee6f == origin/main
```

- 코드: `modules/neture/{controllers,services,entities}` · `supplier.service.ts`(1,626) · `supplier-onboarding.service.ts` · `supplier-regulated-category.service.ts` · `neture-identity.middleware.ts` · `operator-supplier.controller.ts` · `admin.controller.ts` · `services/web-neture/**` supplier 화면.
- 프로덕션 read-only SELECT (Cloud SQL Auth Proxy · write 0). 민감정보는 **ID 앞 8자 · count · boolean** 으로만 기록한다.

---

# 2. 현재 Identity Architecture Map (실제)

```text
Google User (users · 1건)
  ├─ service_memberships(5 · 전부 active · 서비스별 1)
  ├─ role_assignments(11)
  └─ users.businessInfo (json · 13키 — 사업자 정보가 여기에도 있다)

neture_suppliers (3건)
  ├─ user_id          → 3/3 NULL  ⚠ guard 가 읽는 유일한 축
  ├─ organization_id  → 3/3 존재
  └─ status           ACTIVE 2 / PENDING 1

organizations (25 · type=supplier 7 · 그중 business_number 보유 5)
  ├─ business_number · address · address_detail   ← Business Identity 일부
  ├─ created_by_user_id → 세 supplier org 전부 NULL ⚠
  └─ organization_members → **세 supplier org 전부 0건** ⚠

등록 코드 경로 (registerSupplier → syncSupplierOrganization):
  users.id ──(user_id 직접 기록)──▶ neture_suppliers
                                       │ ensureOrganization(type='supplier', createdByUserId)
                                       ▼
                                  organizations ──setOwner(orgId, userId)──▶ organization_members
                                       │ enrollService('neture')  (ACTIVE 일 때만)
                                       ▼
                                  service enrollment
```

**관계가 두 벌 만들어지고 하나만 읽힌다** — 등록은 `user_id` 와 `organization_members.owner` 를 **둘 다** 쓰는데, 인가(`requireLinkedSupplier`/`requireActiveSupplier`)는 `WHERE user_id = $1` **하나만** 읽는다.

## 2.1 운영 3건 실측 (2026-09-24)

| supplier | status | org | org 이름 | business_number | user_id | org owner member | created_by_user_id | approved_by |
|---|---|---|---|:--:|:--:|:--:|:--:|---|
| `91169739` | ACTIVE | `95aad740` | (주)네뚜레 공급자 테스트 | 있음 | **NULL** | **0건** | **NULL** | `cfd2a5e7` |
| `251adaaf` | ACTIVE | `69e985ae` | (주)쓰라이프존 | 없음 | **NULL** | **0건** | **NULL** | `cfd2a5e7` |
| `5de3098e` | PENDING | `a79e18fd` | 초윤 | 있음 | **NULL** | **0건** | **NULL** | — |

기타: `users` **1건**(`cfd2a5e7` · password NULL = Google-only) · `organization_members` 전체 3건(전부 **다른** org) · `service_memberships` 5(전부 active) · `role_assignments` 11 · `neture_supplier_regulated_categories` 7(not_requested 5 · submitted 2).

`approved_by = cfd2a5e7` 은 **승인한 운영자**이지 공급자 소유자가 아니다. 소유권 근거로 쓸 수 없다.

---

# 3. Q1~Q3 — User ↔ Supplier ↔ Organization 관계 판정

## Q1. `neture_suppliers.user_id` 는 최종 canonical relationship 인가? → **아니다 (LEGACY_SHORTCUT)**

| 근거 | 내용 |
|---|---|
| 등록 코드가 관계를 **두 번** 만든다 | `registerSupplier()` 가 `user_id` 를 세팅하고, 곧바로 `syncSupplierOrganization()` 이 `setOwner(orgId, userId)` 로 `organization_members` owner 를 만든다 |
| guard 는 shortcut 만 읽는다 | `createRequireActiveSupplier`/`createRequireLinkedSupplier` : `SELECT id, status FROM neture_suppliers WHERE user_id = $1 LIMIT 1` |
| `LIMIT 1` + 등록 시 `USER_ALREADY_HAS_SUPPLIER`(409) | **1 User : 1 Supplier** 를 강제한다(Q3) |
| nullable | 컬럼이 `nullable: true` 라 관계 없는 supplier 가 스키마상 허용된다 — canonical FK 라면 성립하지 않는 상태 |
| 실제로 끊겼다 | 운영 3/3 NULL. canonical 관계였다면 데이터 reset 이 인가 전체를 끊지 못했어야 한다 |

## Q2. 권한은 `user_id` 직접 연결인가, Organization Relationship 인가? → **Organization Relationship 이어야 한다**

O4O 는 이미 `organizations` + `organization_members`(role · is_primary · joined_at/left_at) 를 **범용 조직 관계 모델**로 갖고 있고, 다른 서비스(pharmacy 15 · store 2 · association 1)가 같은 테이블을 쓴다. Supplier 만 별도 shortcut 을 쓸 이유가 없다.

권장 인가 경로:

```text
user.id → organization_members(active, role ∈ {owner, …}) → organizations(type='supplier')
        → neture_suppliers(organization_id) → status 검사
```

`user_id` 는 제거 대상이 아니라 **compatibility pointer 로 강등**(읽기 fallback)하는 것이 안전하다 — 즉시 제거하면 org membership 이 없는 기존 데이터가 전부 막힌다(현재 운영이 정확히 그 상태).

## Q3. `neture_suppliers.organization_id` 의 최종 의미 → **Supplier = Organization 의 Neture 서비스 프로필**

| 후보 | 판정 |
|---|---|
| Supplier = Organization 자체 | ✕ — `organizations.type='supplier'` 7건 vs `neture_suppliers` 3건. 1:1 아님 |
| Supplier = 별도 사업 entity | ✕ — 사업자 identity(번호·주소)는 이미 `organizations` 소유 |
| **Supplier = Organization 에 연결된 service-specific profile** | **○** — `ensureOrganization(metadata.serviceKey='neture')` · `enrollService('neture')` 구조가 이를 말한다 |

즉 **조직(사업자)은 `organizations`, 그 조직의 Neture 공급자 활동 프로필은 `neture_suppliers`**.

## Q3-보강. 1 User : N Supplier

현재 스키마·guard·등록 코드 **전부 1:1 을 가정**한다(`LIMIT 1` · 409). Organization 모델로 옮기면 `organization_members` 가 N:M 을 자연히 지원하므로 **별도 다대다 migration 제안 불필요**. 다만 "한 사람이 두 공급사를 운영" 이 실제 사업 요구인지는 **정책 질문(P2)** 으로 남긴다 — 이 IR 은 임의로 확장을 제안하지 않는다.

---

# 4. Q4 — status 4종 책임표

| Resource | 의미 | SSOT | write 주체 | 읽는 guard |
|---|---|---|---|---|
| `neture_suppliers.status` | **공급자 자격**(PENDING→ACTIVE / 정지) | `neture_suppliers` | Operator 승인 · Admin 정지/재활성 | `requireActiveSupplier`(write route) |
| `service_memberships.status` | **서비스 가입** 여부(neture 포함 5서비스) | `service_memberships` | 서비스 가입/탈퇴 경로 | 서비스 진입 guard |
| `organization_members.role/left_at` | **조직 내 사람의 역할** | `organization_members` | `setOwner` · 조직 관리 | (Supplier 경로에서는 **미사용** ⚠) |
| `role_assignments` | **플랫폼 역할**(operator/admin 등) | `role_assignments` | Admin | operator/admin scope guard |

**"Supplier ACTIVE" ≠ "Neture service active membership".** 전자는 *이 조직이 공급자로 승인됐다*, 후자는 *이 사용자가 Neture 서비스에 가입했다* — 의미가 다르므로 **합치지 않는다**(`NO_ISSUE`). 다만 Supplier 경로가 `organization_members` 를 전혀 읽지 않는 것은 `AUTHORIZATION_DRIFT` 다.

---

# 5. Q5~Q7 — Business Profile Ownership Matrix

`users.businessInfo` 실측 키 **13개**: `businessName · businessNumber · businessType · businessItem · businessCategory · businessAddress · businessAddressDetail · address · address2 · zipCode · storeAddress · taxInvoiceEmail · metadata`
(※ `businessEntityType` · `businessStartDate` 는 **키 자체가 없다** — `updateSupplierProfile` 이 `if (supplier.userId)` 가드 뒤에서 쓰는데 3/3 NULL 이라 **조용히 저장되지 않았다**.)

| Field | 현재 저장 | 현재 read | 현재 write | 권장 SSOT | 근거 |
|---|---|---|---|---|---|
| businessName(상호) | `organizations.name` + **`users.businessInfo`** | org 우선 | 등록/프로필 | **Organization** | 공통 사업자 identity · 타 서비스 공유 |
| businessNumber | `organizations.business_number` + **`users.businessInfo`** | org | 프로필 | **Organization** | `neture_suppliers` 에서 의도적 drop 완료(20260327000300) |
| businessAddress / ZipCode / Detail | `organizations.address(+address_detail)` + **`users.businessInfo`** | org | 프로필 | **Organization** | 동일 |
| representativeName | `neture_suppliers` | supplier | 프로필 | **Organization** | 사업자등록증 기재사항 = 조직 identity |
| businessType / businessItem(업태·종목) | `neture_suppliers` + **`users.businessInfo`** | supplier | 프로필 | **Organization** | 동일 |
| businessEntityType / businessStartDate | `users.businessInfo`(**미저장**) | — | 프로필(userId 필요) | **Organization** | 사업자등록증 기재사항 |
| managerName / managerPhone | `neture_suppliers` | supplier | 프로필 | **Supplier service profile** | Neture 담당자 = 서비스별 |
| contactEmail/Phone/Website/Kakao + visibility 4 | `neture_suppliers` | supplier | 프로필 | **Supplier service profile** | 공개 정책이 Neture 전용 |
| taxInvoiceEmail | `neture_suppliers` + **`users.businessInfo`** · **profile·onboarding 양쪽 API** | supplier | 둘 다 | **Supplier onboarding** | 정산 축 · 중복 진입 해소 필요 |
| settlementBankName/AccountNumber/AccountHolder/ContactName/ContactEmail | `neture_suppliers` | supplier | onboarding | **Supplier onboarding(민감)** | 금융정보 · 접근 최소화 |
| mailOrderSalesStatus / RegistrationNumber | `neture_suppliers` | supplier | onboarding | **Organization**(법적 등록) 또는 onboarding | 정책 질문 P3 |
| baseShippingFee / freeShippingThreshold / averageDispatchDays / returnExchangeNotice / shippingStandard·Island·Mountain | `neture_suppliers` | supplier | 프로필 | **Supplier commercial policy** | Neture 공급 정책 |
| minOrderAmount / minOrderSurcharge / orderConditionNote | `neture_suppliers` | supplier | 프로필 | **Supplier commercial policy** | 동일 |
| regulated categories + 증빙 | `neture_supplier_regulated_categories` + `kyc_documents` | supplier/operator | 양쪽 | **Supplier 자격**(§7) | — |

## Q6. `users.businessInfo` 최종 판정 → **MIGRATE_TO_ORGANIZATION + KEEP_AS_INPUT_SNAPSHOT**

- 13키 중 대부분이 `organizations` · `neture_suppliers` 와 **중복**(`DUPLICATE_SSOT`).
- `storeAddress` · `businessCategory` 등은 **매장(약국) 가입 축**에서도 쓰는 키다 — Supplier 전용이 아니므로 **Supplier WO 가 단독으로 지울 수 없다**(중지 조건 후보).
- 알려진 함정: 컬럼 실제 타입이 **`json`(≠`jsonb`)** 이라 `COALESCE(…,'{}'::jsonb)` 가 실패한다(정본 헬퍼 `utils/business-info-write.ts`).
- **권장:** 가입 입력 snapshot 으로 유지하되 **읽기 SSOT 에서 제외**하고, 프로필 write 경로에서 제거한다. 물리 삭제·타 서비스 키 정리는 별도 축.

## Q7. `neture_suppliers` 에 남아야 할 데이터 → **Neture 서비스 프로필 + 상거래 정책 + 서비스 상태**

```text
KEEP : status · slug · logo/description · 담당자 · 연락처+공개정책 · 배송정책 · 주문조건
       · 정산정보(또는 onboarding 분리) · onboarding/문서 상태 · organization_id
MOVE : representativeName · businessType · businessItem (+ 이미 옮겨진 번호/주소) → Organization
DROP : user_id (→ compatibility pointer 로 강등 후 최종 제거)
```

---

# 6. Q8 — Profile vs Onboarding 경계

| API | 소유 필드 | 성격 |
|---|---|---|
| `PATCH /supplier/profile` | 사업자정보 · 담당자 · 연락처+공개정책 · 배송정책 · 주문조건 · `taxInvoiceEmail` | **상시 운영정보** |
| `PATCH /supplier/onboarding` | 정산 계좌 5 · 통신판매업 2 · `taxInvoiceEmail` | **가입 절차 + 민감 금융정보** |

- **경계가 있다**(onboarding = 정산/법적등록/문서). 다만 **`taxInvoiceEmail` 이 양쪽에 있다** → `PROFILE_FRAGMENTATION`(경미).
- onboarding 은 일회성이 아니다 — 승인 후에도 `updateOnboarding` · 문서 재업로드가 가능하다. 이름이 "onboarding" 이라 일회성으로 오해될 뿐 실제로는 **민감정보 영역**이다.

# 7. Q9 — Regulated Category 의미

코드 주석 정본: *"공급자 품목군(규제 카테고리) 선택 + 증빙 PDF 제출 + O4O 내부 등록 가능 상태 검토. **제품 등록 gate 미연결**"*

> **한 문장 정의: 이 테이블은 "이 공급자가 해당 품목군을 취급할 자격이 있는지" 를 증명한다. 제품의 규제 유형(`ProductMaster.regulatoryType`)도, 서비스별 공급 승인(`offer_service_approvals`)도 아니다.**

lifecycle: 공급자 선택(`not_requested`) → 증빙 제출(`submitted`) → Operator/Admin 검토(`approved`/`rejected`/`needs_update`/`suspended`). 공급자는 `not_requested·rejected·needs_update` 에서만 해제 가능. 운영 7건(not_requested 5 · submitted 2) — **검토 대기 2건이 처리되지 않고 있다**(운영 관찰).

**제품 등록 gate 에 미연결**이므로 현재는 *선언·증빙 원장*일 뿐이다. 연결 여부는 정책 질문(P4).

# 8. Q10 — Operator vs Platform Admin

| 기능 | 현재 guard | 판정 |
|---|---|---|
| 공급자 목록·대기·상세 조회 | `operator-supplier.controller`(operator scope) | 적절 — 서비스 운영 |
| 승인/일괄 처리(`/suppliers/batch`) | operator | 적절 |
| onboarding·문서 열람 | operator **와** admin **둘 다** | 중복이나 **의도적**(감독 계층) — 정리 대상 아님 |
| 규제 품목군 검토 | operator | 적절 |
| **정지/재활성**(`/suppliers/:id/deactivate|reactivate`) | `requireNetureScope('neture:admin')` | 적절 — **공급자 관계 거버넌스** |
| Organization/service membership governance | platform admin | 적절 |

경계가 이미 서 있다: **Operator = 서비스 운영(승인·검토), Admin = 관계 거버넌스(정지·재활성·조직)**. `NO_ISSUE`.

---

# 9. Q11~Q12 — 운영 데이터 판정

## Q11. `user_id NULL` 3건 → **AMBIGUOUS** (deterministic repair 불가)

| 복구 단서 | 상태 |
|---|---|
| `neture_suppliers.user_id` | NULL (3/3) |
| `organization_members`(해당 org) | **0건** — owner 관계도 함께 소실 |
| `organizations.created_by_user_id` | **NULL** (3/3) |
| `organizations.metadata` | 비어 있음 |
| `approved_by` | `cfd2a5e7` — **승인 운영자**이지 소유자 아님 |
| 현존 users | **1건**(`cfd2a5e7` = 운영자) |

세 supplier 를 **어느 사용자에게 연결해야 하는지 DB 안에 근거가 없다.** `docs/local/TEST-ACCOUNTS.local.md` 는 `sohae21@naver.com` 을 "(주)쓰라이프존 공급자" 로 적지만 **그 계정은 현재 users 에 없다**(1건뿐). 즉 복구하려면 계정 생성이 선행되고, 이는 추측이 아니라 **사용자 확인 사항**이다.

> **REPAIR PLAN READY (실행 금지)** — 승인 시 다음 순서. ① 각 supplier 의 실제 소유자 이메일을 **사용자가 지정** ② 해당 Google 계정 로그인으로 users 행 생성 확인 ③ `organization_members`(role=owner) 생성 ④ (호환 기간 동안) `neture_suppliers.user_id` 설정 ⑤ ACTIVE 2건만 우선, PENDING 1건(`초윤`)은 승인 절차와 함께. **이 IR 은 UPDATE 를 실행하지 않았다.**
>
> 대안 판정: `91169739`(슬러그·org명이 "네뚜레 공급자 **테스트**")는 `STALE_TEST_DATA` 후보다. 삭제 여부는 사용자 판단.

## Q12. 신규 Google User 가입 시 재발하는가? → **부분적으로 재발한다**

- `registerSupplier()` 는 `user_id` 를 **정상적으로 채운다** → 로그인 즉시 진입 가능(신규는 깨지지 않음).
- 그러나 **여전히 `user_id` 중심 legacy 관계를 만든다.** 인가가 org membership 을 읽지 않으므로 같은 종류의 사고(계정 재생성·이관·조직 담당자 교체)가 나면 **또 끊긴다**.
- 또한 `user_id` 가 NULL 인 동안 `businessEntityType`/`businessStartDate` write 가 **조용히 skip** 된다(오류 없음) — 관측되지 않는 데이터 손실.

---

# 10. Q13~Q14 · REMAINING

## Q13. DB migration 필요 → **YES (최소)**

- 필수: `organization_members` 기반 인가로 전환하면 **스키마 변경 없이** 가능(테이블이 이미 있다).
- 다만 **`user_id` 최종 제거**와 `representativeName·businessType·businessItem` 의 Organization 이관은 **컬럼 변경/데이터 이동 = migration**이다. 단계 분리 권장(§11).

## Q14. production repair 필요 → **YES · 사용자 승인 필수** (Q11)

## REMAINING (Drift 분류)

| # | 발견 | 분류 |
|---|---|---|
| R1 | 인가가 `user_id` shortcut 만 읽고 `organization_members` 를 무시 | `AUTHORIZATION_DRIFT` · `RELATIONSHIP_DRIFT` |
| R2 | Business Identity 가 3원장 분산(`users.businessInfo` 13키 실재) | `DUPLICATE_SSOT` · `PROFILE_FRAGMENTATION` |
| R3 | `PATCH /supplier/profile` 이 **트랜잭션 없이** org → supplier → users 순차 write | `DUPLICATE_SSOT`(부분 성공 위험) |
| R4 | `user_id` NULL 시 businessInfo write 가 **조용히 skip** | `IDENTITY_BOUNDARY_VIOLATION`(관측 불가 손실) |
| R5 | 운영 3건 관계 소실 + owner membership 0 | `LEGACY_DATA` |
| R6 | `taxInvoiceEmail` 이 profile·onboarding 양쪽 | `PROFILE_FRAGMENTATION`(경미) |
| R7 | `organizations.type='supplier'` 7 vs `neture_suppliers` 3 | `LEGACY_DATA`(고아 org 후보 · 확인 필요) |
| R8 | 규제 품목군 `submitted` 2건 미검토 | 운영 이슈(코드 결함 아님) |
| — | status 4종 의미 분리 · Operator/Admin 경계 · onboarding 민감정보 분리 | `NO_ISSUE` |

**LEGACY_RUNTIME 은 0건** — email 기반 supplier lookup · 구 password 가정 · stale registration API 는 발견되지 않았다.

---

# 11. Q15 — 다음 구현 WO **1개**

## 권고: `Supplier Identity Relationship Canonicalization + Business Profile SSOT Realignment`

우선순위 §40 의 1·2·3·4위에 동시에 해당한다. **단계는 한 WO 안에서 분리**한다:

```text
단계 1 (code · migration 0)
  인가를 organization_members 기반으로 전환 + user_id 는 compatibility fallback 유지
  profile write 를 단일 트랜잭션으로 · userId 없을 때의 silent skip 제거(R3·R4)
단계 2 (code · migration 0)
  Business Identity 읽기 SSOT 를 organizations 로 고정 · users.businessInfo 를 프로필 write 경로에서 제거
단계 3 (deploy)
단계 4 (승인된 data repair)  ← 사용자 명시 승인 필수
  소유자 지정 → org owner membership 생성 → user_id 설정(호환) → smoke
단계 5 (migration · 선택)
  representativeName·businessType·businessItem → Organization 이관 · user_id 최종 제거
```

단계 4 전까지는 **어떤 공급자 인증 smoke 도 불가**하다는 점이 이 WO 의 실행 순서를 결정한다.

---

# 12. 정책 결정 / STOP 필요

| # | 항목 | 왜 사용자 판단인가 |
|---|---|---|
| P1 | 세 supplier 의 **실제 소유자** | DB 에 근거 없음(Q11). 추측 연결 금지 |
| P2 | 1 User : N Supplier 를 지원할 것인가 | 사업 모델 결정. 현재 코드는 1:1 강제 |
| P3 | `mailOrderSalesStatus/RegistrationNumber` 의 SSOT(Organization vs onboarding) | 법적 등록정보의 조직 귀속 판단 |
| P4 | 규제 품목군을 **제품 등록 gate 에 연결**할 것인가 | 현재 미연결 · 연결은 사업 정책 |
| P5 | `91169739`("공급자 테스트") 를 `STALE_TEST_DATA` 로 삭제할지 | 운영 DELETE |
| P6 | `users.businessInfo` 의 **매장 축 키**(`storeAddress` 등) 정리 | Supplier WO 단독 범위 밖 — 타 서비스 영향 |

---

# 13. 문서 정합 · Git

`발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`(§11)

- **발견:** 선행 IR(`IR-O4O-SUPPLIER-DOMAIN-FULL-ARCHITECTURE-…-V1`) §5 R2 는 `users.businessInfo` 를 "사업자유형·개업일 2필드" 로 적었으나 **실측 13키**이고 그 두 키는 오히려 **저장된 적이 없다**. 기록물이므로 수정하지 않고 이 IR 이 대체한다.
- active canonical 문서만 조사했고 stale canonical 문서는 발견되지 않았다. 과거 IR/CHECK 수정 0.
- 코드 0 · DB write 0 · migration 0 · 배포 0. 이 문서만 path-specific commit.
