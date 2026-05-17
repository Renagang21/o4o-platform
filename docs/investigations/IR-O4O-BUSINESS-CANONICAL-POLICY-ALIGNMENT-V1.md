# IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1

**작성일**: 2026-05-17
**상태**: Investigation — **정책 정렬 IR** (조사 전용, 코드/migration/schema/rename/구현 WO 작성 금지, **commit/push 금지**)
**대상**: O4O 전체의 business entity / account identity / store execution / organization lifecycle / role ownership / address canonical / business write-path 에 대한 **canonical policy 정렬**

**조사 목적**:
- 선행 2 개 IR 이 매핑한 transitional drift 상태에서 **정책 결정 prerequisite** 도출
- 8 개 핵심 질문에 명확히 답하여 향후 WO 의 기준 구조 제공
- "이상적 설계" 가 아닌 "현재 O4O 현실 + 향후 방향" 기준

**선행 IR**:
- `IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1` (entity / schema / SSOT 후보 매핑)
- `IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1` (실제 코드 read/write trace, lifecycle, runtime consumer)

**방법론**:
- 새 코드 trace 없음 — 선행 IR 의 데이터 + 정책 판단 종합
- pharmacy/store terminology 분포만 추가 spot-check (KPA/GlycoPharm = 도메인 어휘 확인)
- "추정" 이 아닌 "현재 코드 + 향후 방향" 기준 판단

---

## 0. 결론 요약 — Canonical Policy Declarations

> **본 IR 은 7 개 canonical policy declaration 으로 정리**:

### P0-1. Business Entity SSOT 선언

**`organizations` = O4O business entity SSOT** (full canonical SSOT 로 승격).
- Currently partial SSOT — bidirectional sync 부재로 인한 drift 잔존
- 권장 정렬: write-back 추가 + service-specific 컬럼 통합 + reverse sync 강제

### P0-2. User Identity / RBAC / Membership SSOT 유지

기존 F9 / F10 / F11 frozen SSOT 그대로 유지 (변경 없음):
- `users` (F10) = Identity SSOT
- `role_assignments` (F9) = RBAC SSOT
- `service_memberships` (F11) = Service Membership SSOT
- `organization_members` = Layer B (org-internal role)

### P0-3. `users.businessInfo` 미래 = "Identity-side Business Profile Cache"

**deprecate 가 아니라 명시적 cache 역할 부여**:
- form input + display cache + organization ensure read source 의 3-역할 명시적 인정
- `organizations` 와의 bidirectional sync 의무화 (write 양방향)
- 단 SSOT 권리 없음 — runtime canonical 은 organizations

### P0-4. Store/Pharmacy Terminology 정책

**legacy 아님 — layer 별 도메인 어휘 정책으로 정리**:
- **Platform layer (packages/, organizations, store-core, etc.)** = `store` (generic)
- **Service-local layer (KPA / GlycoPharm)** = `pharmacy` (도메인 자연 어휘) 유지
- **Cosmetics / Neture** = `store` / `supplier` (도메인 어휘)
- terminology rename migration **불필요**

### P0-5. Address Canonical = `StoreAddress` type + `organizations.address_detail`

- `StoreAddress` (zipCode / baseAddress / detailAddress / region) = 4-field canonical type
- 저장: `organizations.address_detail` (jsonb) — full canonical
- 비표준 deprecate: legacy varchar (`organizations.address`), denormalized (`kpa_members.pharmacy_address`), flat fields (`users.businessInfo.zipCode/address2`), custom 6-field (`neture_partners.address`)

### P0-6. Tax Invoice Email = **결정 보류 (Invoice System Prerequisite)**

- 다운스트림 invoice 시스템 부재 → 현재 dead-or-display data
- Single canonical home 결정은 **invoice 시스템 도입 시점** 으로 deferring
- Interim: `organizations.metadata.taxInvoiceEmail` (de-facto, KPA store) + `neture_suppliers.tax_email` (Neture-local) 유지
- 단 **`taxEmail → businessInfo.email` overwrite 패턴은 즉시 제거 권장** (semantic confusion)

### P0-7. Business Write-Path = "Single Canonical Service Layer"

- 현재 7 개 분산 write entrypoint → **`BusinessProfileWriteService` 단일 service layer 신설** 후 모든 write 경유
- atomic transaction 의무화 (users.businessInfo + organizations + 관련 sync 한 묶음)

### 0-8. 8 핵심 질문 답변 (요약)

| 질문 | 답 |
|---|---|
| organizations 는 business SSOT 인가? | **YES (canonical 선언)**, 단 실제 코드는 partial — bidirectional sync + 통합 컬럼 추가로 full SSOT 승격 가능 |
| store 는 무엇인가? | **execution place — organization 의 한 instance (type='store' or type='pharmacy')**. 별도 entity 아님. organizations 내 type discriminator 로 표현 |
| pharmacy 는 legacy terminology 인가? | **NO** — KPA-Society + GlycoPharm 의 도메인 자연 어휘. Platform-layer 에서는 store (generic) 사용. terminology migration 불필요 |
| users.businessInfo 는 앞으로 무엇? | **Identity-side Business Profile Cache** — form input + display cache + ensure source. SSOT 아님. organizations 와 bidirectional sync 의무화 |
| operator/profile/register 동일 write-path 통합 가능? | **YES (권장)** — BusinessProfileWriteService 단일 layer 로 통합. atomic transaction 보장 |
| address canonical 은? | **`StoreAddress` type → `organizations.address_detail` (jsonb)**. 비표준 모두 deprecate |
| store_owner prerequisite 는? | **organizations(type∈{pharmacy,store}) ensure + organization_members(owner) + role_assignments(kpa:store_owner)** 3 단계. businessNumber + storeName 이 ensure 필수 |
| terminology migration 지금 가능? | **NO — 불필요**. P0-4 참조. layer 별 어휘 정책으로 정리 |

---

## 1. 조사 방법 + 선행 IR 데이터 종합

### 1-1. 본 IR 의 입력 데이터 (재조사 없이 활용)

| 출처 | 핵심 데이터 |
|---|---|
| `IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1` | 10 entity 매핑, 12-row drift matrix, frozen baselines (F9/F10/F11), 6 baseline docs canonical claims |
| `IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1` | 7 write × 9 read entrypoints, 8 org create × 4 ensure call sites, lifecycle diagrams, 12 runtime consumers + 5 부재 시스템, 6 prior-IR 정정 |
| 본 IR spot-check | pharmacy terminology depth (KPA: 60+ / GlycoPharm: 72+ / Platform packages: store 우세) |

### 1-2. 본 IR 의 판단 기준

- ❌ "이상적 SSOT 설계" — 향후 모든 시스템 처음부터 재설계 가정
- ✅ "현재 O4O 현실 + 향후 방향" — 다음 12-18 개월 진화 경로
- ✅ "frozen baseline 존중" — F9/F10/F11 의 SSOT 결정은 변경 없음
- ✅ "domain-specific 어휘 보존" — KPA 약사회 / GlycoPharm 글라이코팜 의 자연 도메인 어휘 유지
- ✅ "실 runtime consumer 우선" — operator UI / PharmacyInfoPage / supplier profile 등 active consumer 기반 정렬

---

## 2. Canonical Domain Model

### 2-1. 5-Layer 모델

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: ACCOUNT IDENTITY                                          │
│    users (Frozen F10) — email, name, phone, businessInfo (cache)    │
│    purpose: who I am                                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 1:N
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: SERVICE MEMBERSHIP                                        │
│    service_memberships (Frozen F11) — userId, serviceKey, status    │
│    purpose: which services I belong to (pending/active/withdrawn)   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 1:N (조건부)
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: BUSINESS ENTITY (★ canonical 선언)                        │
│    organizations — business_number, address_detail, type,           │
│                    metadata (서비스별 확장)                          │
│    type discriminator: 'pharmacy' | 'store' | 'supplier'            │
│                      | 'community' | 'kpa-branch' | 'kpa-group' ... │
│    purpose: WHAT business entity (매장/약국/공급자/지회)             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ N:N (via organization_members)
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: ORGANIZATION MEMBERSHIP (Layer B 권한)                    │
│    organization_members — orgId, userId, role (owner/manager/staff) │
│    purpose: 이 사업체에서 내 역할                                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 1:N (parallel)
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 5: RBAC PERMISSION (Layer A 권한)                            │
│    role_assignments (Frozen F9) — userId, role                      │
│    role 예시: kpa:store_owner / neture:supplier / platform:admin    │
│    purpose: 이 시스템에서 내 권한                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2-2. 각 Layer 의 책임

| Layer | Entity | 책임 | 변경 시 trigger |
|---|---|---|---|
| L1 Account | users | 인증 + 신원 정보 + business cache | signup / profile edit |
| L2 Service Membership | service_memberships | 서비스 가입 상태 (pending → active → withdrawn) | apply / approval |
| L3 Business Entity | **organizations (canonical SSOT)** | 사업체 정보 (business_number / address / phone / type) | ensure (auto/manual approval) / profile edit |
| L4 Org Membership | organization_members | 사업체 내 역할 (owner / manager / staff) | activation / role transition |
| L5 RBAC | role_assignments | 시스템 권한 | activation / admin grant / role transition |

### 2-3. 현재 Drift vs 권장 정렬

| 항목 | 현재 (drift) | 권장 정렬 |
|---|---|---|
| L1 ↔ L3 sync | 단방향 (L1 → L3) — auto-activation 시 only | **bidirectional** — 양쪽 모두 write 시 다른 쪽 sync |
| L3 dual maintenance | kpa_organizations (legacy) + organizations | **organizations 단일** — kpa_organizations 완전 통합 |
| L3 service-local 컬럼 | neture_suppliers.{representative_name, manager_*, tax_email} 별도 SSOT | **canonical 컬럼화** (organizations 표준 컬럼) 또는 **명시적 service-local 정책 선언** |
| L4 transition 시 L3 cleanup | role 만 deactivate, org 미삭제 → orphan | **soft-archive** policy 정립 |
| L1 의 type-외 free fields | businessInfo.representativeName (free) / metadata.* | **type 정리** (ceoName 으로 통일) + metadata typed schema 전환 |

---

## 3. Layer Responsibility Matrix

| Layer | Stores | Writes | Reads | Frozen? |
|---|---|---|---|:---:|
| **L1 Account (users)** | email, name, phone, **businessInfo (cache)** | signup / profile-edit / admin / account-link | auth / display / business ensure source | ✅ F10 |
| **L2 ServiceMembership** | userId, serviceKey, status, role | apply / approve / withdraw | service gate / RBAC eval | ✅ F11 |
| **L3 Organization (canonical)** | business_number, name, type, address_detail (jsonb), phone, metadata, parent/level/path | ensure (auto/manual) / PharmacyInfo PUT / supplier profile / store settings | order routing / display / authorization | partial (design canonical) |
| **L4 OrgMember** | orgId, userId, role (owner/manager/staff/member) | activation / role transition | UI role display / org-scoped queries | ✅ active |
| **L5 RoleAssignment** | userId, role (예: kpa:store_owner) | activation / admin grant / revoke | RBAC middleware / guard | ✅ F9 |

**핵심 분리 원칙**:
- **인증과 권한 분리** — L1 (who) ≠ L5 (what can)
- **business 와 role 분리** — L3 (entity) ≠ L4/L5 (role)
- **service 와 organization 분리** — L2 (service 가입) ≠ L3 (business entity). 한 사업체가 multi-service 가능 (organizations.metadata.serviceKey)

---

## 4. SSOT Ownership Matrix

| Data | Current SSOT | Recommended SSOT | Gap | 정렬 Action |
|---|---|---|---|---|
| User Identity (email, name, phone) | `users` ✅ | `users` | 없음 | 유지 |
| User Roles | `role_assignments` ✅ | `role_assignments` | 없음 | 유지 |
| Service Membership | `service_memberships` ✅ | `service_memberships` | 없음 | 유지 |
| Org Membership | `organization_members` ✅ | `organization_members` | 없음 | 유지 |
| **Business Entity** | partial (organizations + users.businessInfo + kpa_members + neture_suppliers 분산) | **organizations** | bidirectional sync 부재 | sync 의무화 + 통합 컬럼 |
| Business Number | scattered (6+) | `organizations.business_number` | 통합 진행 중 | personal cache (businessInfo) 는 sync target 으로 격하 |
| Business Name | scattered | `organizations.name` (post-approval) / businessInfo.businessName (cache) | 동일 | sync 의무화 |
| Address (구조화) | partial (`organizations.address_detail` 표준 진행) | **`organizations.address_detail` (jsonb StoreAddress)** | kpa_members denormalized 잔존 | denormalized deprecate |
| Address (legacy varchar) | scattered | (deprecate) | — | 마이그레이션 후 제거 |
| Phone (사업장) | businessInfo.phone + organizations.phone | `organizations.phone` | sync 부재 | sync 의무화 |
| Tax Invoice Email | 5 곳 분산 | **결정 보류 (invoice 시스템 prerequisite)** | runtime consumer 없음 | interim: organizations.metadata.taxInvoiceEmail / neture_suppliers.tax_email |
| Representative Name | businessInfo.representativeName (free field!) / neture_suppliers.representative_name / **BusinessInfo.ceoName (typed but unused)** | **`BusinessInfo.ceoName` (canonical type)** | code 표기 drift | code rename + jsonb migration |
| Manager Name / Phone | neture_suppliers only | (현재 결정 없음 — service-local 유지 OR organizations 표준 컬럼화) | cross-service 필요 시 결정 | invoice/settlement 시스템 도입 시 결정 |
| Activity Type (직역) | `kpa_pharmacist_profiles.activity_type` ✅ (per WO-ROLE-NORMALIZATION-PHASE3-B-V1) | 동일 | mirror 다수 | mirror 정리 |
| Store Slug | `platform_store_slugs` | `platform_store_slugs` | 없음 | 유지 |
| Storefront Config | `organizations.storefront_config` + `glycopharm_pharmacies.storefront_config` (3-field) + (KPA = 1-field) | 표준화 필요 | jsonb schema drift | 별도 IR |

---

## 5. Business / Store Separation Policy

### 5-1. Business Entity (organizations) vs Store (execution place)

**Policy 선언**:
> **Store 는 별도 entity 아님 — organizations.type ∈ {'pharmacy', 'store', 'supplier', ...} 의 한 instance**.

근거:
- `organizations` 가 이미 type discriminator 보유 (pharmacy/store/supplier/community/kpa-branch/kpa-group)
- 기존 service-specific 테이블 (glycopharm_pharmacies, cosmetics_stores) 도 `organization_id` FK 로 organizations 와 연결
- 추가 "Store" entity 만들면 dual-write 추가 위험

### 5-2. 현재 혼재 양상

| Service | Business Entity (organizations) | Execution Place (별도 테이블) | 관계 |
|---|---|---|---|
| KPA pharmacy | type='pharmacy' | (없음 — organizations 가 곧 약국) | 1:1 |
| GlycoPharm | type='pharmacy' | `glycopharm_pharmacies` (organization_id FK) | 1:1 (확장 컬럼 보유) |
| Cosmetics | type='store' | `cosmetics_stores` (organization_id FK) | 1:1 |
| Neture supplier | type='supplier' | `neture_suppliers` (user_id FK, org metadata.netureSupplierSlug 으로 역링크) | 1:1 |
| KPA-branch | type='kpa-branch' | (없음) | 1:1 |
| Forum/Community | type='community' | (없음) | 1:1 |

→ **service-specific 테이블은 organizations 의 "확장 컬럼 보유 entity"** — execution place 자체가 아니라 service-local extension. canonical 정렬 시 점진적으로 organizations 표준 컬럼으로 흡수 가능.

### 5-3. 권장 분리 정책

```
[L3 Business Entity = organizations (canonical SSOT)]
   ↓ type discriminator
   ├── type='pharmacy'  → KPA / GlycoPharm 약국 (extension: glycopharm_pharmacies)
   ├── type='store'     → Cosmetics / 일반 매장 (extension: cosmetics_stores)
   ├── type='supplier'  → Neture 공급자 (extension: neture_suppliers)
   ├── type='community' → Forum / Community
   ├── type='kpa-branch'→ KPA 지회
   └── type='kpa-group' → KPA 분회

[Extension tables]
   Service-local 컬럼만 보유 (storefront_config, b2b_order_condition, manager 등)
   common 컬럼 (business_number / address / phone) 은 organizations 가 SSOT
```

→ **Store** 라는 이름의 별도 entity 만들지 않음. organizations 의 type='store' 가 곧 매장. 매장의 추가 metadata 가 필요하면 type-specific extension 또는 organizations.metadata.

---

## 6. Pharmacy Terminology Policy

### 6-1. 현재 사용 범위 (spot-check 결과)

| Layer | pharmacy 사용 | store 사용 | 정책 |
|---|---|---|---|
| **packages/** (platform-level) | 거의 없음 | 우세 (store-core, store-ui-core, store-products-ui 등) | **store** (generic) |
| **apps/api-server/** | 60+ occurrences | 다수 | layer 혼재 — KPA / GlycoPharm route 는 pharmacy, store-core / organization 은 store |
| **services/web-kpa-society/** | 49+ occurrences (도메인 어휘) | 다수 (`/store/*` routes) | hybrid — domain (pharmacy_owner / 약국) + execution layer (`/store` route) |
| **services/web-glycopharm/** | 72+ occurrences (글라이코팜 = glyco + pharmacy) | 다수 | 동일 hybrid |
| **services/web-k-cosmetics/** | 거의 없음 | 우세 | **store** |
| **services/web-neture/** | 거의 없음 | supplier 우세 | **supplier** |

### 6-2. Legacy 판정 — **NO**

**Pharmacy 는 legacy terminology 가 아니다.**

근거:
- KPA-Society = 한국약사회 → pharmacy 가 도메인 본질
- GlycoPharm = 글라이코팜 (제약사 서비스명에 pharmacy 포함) → pharmacy 자연 어휘
- Cosmetics / Neture / Platform-layer 는 이미 store/supplier 사용 중 — terminology drift 없음

→ pharmacy 사용은 **domain-specific intentional terminology**. legacy 가 아니라 도메인 정합 어휘.

### 6-3. Migration Readiness

**Pharmacy → Store terminology rename migration 불필요.**

오히려 다음 정책 권장:

| Layer | 어휘 | 사유 |
|---|---|---|
| Platform packages (`packages/store-*`, `packages/organization-*`) | **store / organization** (generic) | cross-service 재사용 |
| Service-local (KPA / GlycoPharm) frontend / routes | **pharmacy** 유지 | 사용자에게 자연스러운 어휘 (약사가 "약국" 이라고 부름) |
| Service-local entities (kpa_pharmacy_requests, glycopharm_pharmacies) | **pharmacy** 유지 | 도메인 명시 |
| Platform-level entities (organizations, organization_members) | **organization / store** (generic) | layer abstraction |
| Cross-service shared (auth-utils, security-core) | **store_owner / kpa:store_owner** (이미 generic) | platform-wide 추상화 |

→ 현재 코드의 layer 분리가 사실상 이미 이 정책에 맞춰져 있음. 추가 migration 불필요.

---

## 7. users.businessInfo 미래 역할

### 7-1. 3 후보 분석

| 후보 | 의미 | Pros | Cons |
|---|---|---|---|
| **A. Deprecate** | businessInfo 완전 제거. frontend 가 organizations 직접 호출 | SSOT 단순화 | 7 write entrypoint 모두 리팩토링 필요. signup 시점 (organizations 없을 때) 처리 복잡 |
| **B. Identity-side Cache (★ 권장)** | businessInfo 명시적 cache 역할 부여, organizations 와 bidirectional sync 의무화 | 기존 code 보존 + drift 해소 | sync layer 추가 필요 |
| **C. Promote to SSOT** | businessInfo 를 사업체 정보 SSOT 로, organizations 는 type discriminator 만 | 단순 (1 곳 read/write) | F10 (users frozen) 정책 위반 — users 는 Identity-only |

### 7-2. 권장: **Option B (Identity-side Business Profile Cache)**

**정의**:
> `users.businessInfo` 는 사용자가 입력한 사업자 정보의 **identity-side cache**. SSOT 권리 없음. `organizations` 와 **양방향 sync 의무**. 사용자 view (MyProfile / EditUserModal 등) 의 source.

근거:
- F10 (users frozen Identity SSOT) 정책 존중
- 7 write entrypoint 의 기존 동작 보존 (큰 리팩토링 회피)
- runtime consumer 다수 (R1-R9) 가 이미 businessInfo 사용
- bidirectional sync 만 추가하면 drift 해소

**역할 명시**:
- ✅ form input target (signup / profile / operator edit)
- ✅ display source (operator member list / EditUserModal / UserDetailPage / MyProfilePage)
- ✅ organization ensure 의 read source (businessNumber / businessName)
- ❌ canonical SSOT 권리 없음 (runtime canonical = organizations)
- ✅ post-write → organizations sync (자동, 트랜잭션 내)
- ✅ organizations 수정 시 → businessInfo sync (자동, 트랜잭션 내)

### 7-3. 제거 / 축소 대상 필드

**Type 외 free fields (jsonb 에 박힌 비공식 필드)**:
- `representativeName` → `ceoName` 으로 통일 (BusinessInfo type 의 canonical 필드)
- `metadata.representativeName` (dead duplicate) → 제거
- `metadata.taxEmail` (dead duplicate) → 제거
- `metadata.pharmacy_phone` → organizations.phone 으로 sync 후 cache 만 유지 또는 제거 검토

**Dead writes (read 안 됨)**:
- `address2` (flat) → storeAddress.detailAddress 만 사용
- `zipCode` (flat) → storeAddress.zipCode 만 사용

**Semantic overwrite**:
- `taxEmail → email` overwrite 패턴 제거. businessInfo.email 의미를 "대표 이메일" 으로 복원.

---

## 8. organizations Canonical Scope

### 8-1. 통합 후보 필드 (organizations 표준 컬럼화)

| 필드 | 현재 위치 | 통합 후 | 정책 |
|---|---|---|---|
| `business_number` | scattered (6+) | `organizations.business_number` ✅ (이미 있음) | personal cache 는 sync target |
| `name` (사업체명) | 분산 | `organizations.name` ✅ | 동일 |
| `address_detail` | partial (organizations / glycopharm / cosmetics) | `organizations.address_detail` (jsonb StoreAddress) ✅ | denormalized 제거 |
| `phone` | 분산 | `organizations.phone` ✅ | 동일 |
| **`ceo_name` (대표자명)** | businessInfo.representativeName (free) / neture_suppliers.representative_name | `organizations.ceo_name` (varchar, **신설 권장**) | 통합 candidate |
| **`tax_invoice_email`** | 5 곳 분산 | `organizations.tax_invoice_email` (varchar, **신설 권장 — invoice 시스템 도입 시**) | deferring |
| **`manager_name` / `manager_phone`** | neture_suppliers only | `organizations.manager_name` / `manager_phone` (varchar, **신설 권장 — cross-service 필요 시**) | deferring |
| `business_type` (개인/법인/...) | businessInfo.businessType / neture_suppliers.business_type | `organizations.business_type` (varchar enum, **신설 권장**) | 통합 candidate |
| `business_category` (업종) | businessInfo.businessCategory | `organizations.business_category` (varchar, **신설 권장**) | 통합 candidate |
| `telecom_license` (통신판매업) | businessInfo.telecomLicense | `organizations.telecom_license` (varchar, **신설 권장 — 전자상거래 시스템 도입 시**) | deferring |

### 8-2. Service-Local 유지 필드

다음 필드는 **service-local SSOT 로 유지** 권장 (cross-service 의미 없음):

| 필드 | 위치 | 유지 사유 |
|---|---|---|
| `storefront_config` / `storefront_blocks` (GlycoPharm) | glycopharm_pharmacies | GlycoPharm-specific layout |
| `enabled_services` | glycopharm_pharmacies | GlycoPharm-specific feature flags |
| Neture supplier 의 `contact_*_visibility` | neture_suppliers | supplier-specific visibility 정책 |
| Neture supplier 의 `min_order_amount`, `order_condition_note` | neture_suppliers | B2B 거래 조건 — supplier-specific |
| Neture supplier 의 `pricing_policy`, `shipping_*` | neture_suppliers | 동일 |
| `kpa_members.pharmacy_*` denormalized | (현재) | denormalized cache — kpa_members 가 약사 정보 entity, 약국 정보는 organizations 가 SSOT. **denormalized 제거 권장** |

### 8-3. 통합 Timing

| Phase | 대상 | Trigger |
|---|---|---|
| Phase A (즉시) | `bidirectional sync` 정책 정착 (businessInfo ↔ organizations) | 정책 결정만 |
| Phase B (1-2 month) | `ceo_name` 통합 — representativeName free field → canonical ceoName | 코드 정리 + jsonb migration |
| Phase C (3-6 month) | `business_type` / `business_category` 통합 | 통합 schema migration |
| Phase D (invoice 시스템 도입 시) | `tax_invoice_email` / `manager_*` / `telecom_license` 통합 | invoice 시스템 prerequisite |
| Phase E (장기) | `kpa_members.pharmacy_address` (varchar) 완전 제거 | denormalized cleanup |

---

## 9. Address Canonical Policy

### 9-1. Canonical 선언

> **`StoreAddress` type (zipCode / baseAddress / detailAddress / region) = O4O address canonical type**.
> 
> 저장: **`organizations.address_detail` (jsonb)**.

### 9-2. 비표준 deprecate 대상

| 비표준 | 현재 위치 | 처리 |
|---|---|---|
| flat varchar `address` | organizations.address (legacy) / users.businessInfo.address | post-migration 제거 (현재 backfill source 역할) |
| flat `address2` | organizations + users.businessInfo | dead write → 제거 |
| flat `zipCode` | users.businessInfo (with storeAddress 동시 존재) | dead write → 제거 |
| denormalized `kpa_members.pharmacy_address` (varchar) | kpa_members | deprecate → organizations.address_detail 조회로 대체 |
| custom 6-field `neture_partners.address` (jsonb) | neture_partners | StoreAddress 로 migration |
| `glycopharm_applications.metadata.address` snapshot | (snapshot) | 자체 dead → glycopharm_applications 자체 활용도 재검토 |

### 9-3. RegisterModal 의 free-text 주소

**현재**: `pharmacyAddress` (single free-text) → `users.businessInfo.address`

**권장 정렬** (장기):
- RegisterModal 도 3-part 입력 (`AddressSearch` component) 사용
- 단 신규 가입자 input UX 부담 감안 → free-text + post-signup 보완 패턴도 허용
- 보완 시점: PharmacyApprovalGate (현재 주소 미수집!) 또는 PharmacyInfoPage 에서 3-part 강제

---

## 10. Tax Invoice Email 정책

### 10-1. 현재 상태

| 항목 | 결론 |
|---|---|
| 다운스트림 invoice 시스템 | **부재** (`invoice.generate`, `settlement.generate`, `tax.generate` grep 결과 무관한 연회비 invoice 만 발견) |
| Data 사용처 | operator UI display 만 (KPA member list / Supplier profile) |
| 정비 시급도 | 🟡 **LOW** (현재) — runtime critical 아님 |
| 향후 시급도 | 🟠 **MID** (invoice 시스템 도입 시) — drift 가 5 곳 분산되어 있어 어떤 데이터가 정답인지 결정 어려움 |

### 10-2. 정책 선언

**P0-6**: tax_invoice_email canonical home 결정은 **invoice 시스템 도입 시점으로 deferring**.

**Interim 정책 (현재 시점)**:
- KPA store: `organizations.metadata.taxInvoiceEmail` (PharmacyInfoPage PUT 가 SSOT)
- Neture: `neture_suppliers.tax_email` (supplier-local SSOT)
- 다른 위치 (`users.businessInfo.email` overwrite / metadata.taxEmail / kpa_pharmacy_requests.tax_invoice_email) 는 **legacy / fallback** 으로 명시
- **`taxEmail → businessInfo.email` overwrite 패턴은 즉시 제거 권장** — semantic confusion (대표 이메일 ≠ 세금계산서 이메일)

**Invoice 시스템 도입 시**:
- `organizations.tax_invoice_email` 컬럼 신설 (varchar 255 nullable)
- 5 곳 분산 데이터를 backfill (우선순위: PharmacyInfoPage PUT 결과 > kpa_pharmacy_requests > businessInfo.metadata.taxEmail > businessInfo.email)
- 다른 위치 deprecate

---

## 11. Business Write-Path Policy

### 11-1. 현재 7 분산 write-path 문제

| 문제 | 영향 |
|---|---|
| 각 controller 가 자체 merge 로직 | partial update / overwrite 패턴 불일치 |
| `users.businessInfo` 와 `organizations` 의 sync 가 흐름마다 다름 | drift 발생 |
| atomic transaction 보장 안 됨 (FLOW P 4 query 분리) | partial failure 시 데이터 불일치 |
| `representativeName` free field 등 type-violating write | jsonb 정리 시 데이터 손실 위험 |
| account-linking shallow merge | non-null-safe overwrite |

### 11-2. 권장: Single Canonical Service Layer

```
BusinessProfileWriteService (신설 권장)
  ├─ upsertBusinessProfile(userId, fields, context: 'signup'|'self-edit'|'operator-edit'|'merge')
  │   ├── INSIDE transaction:
  │   │   ├─ users.businessInfo UPDATE (cache, typed schema)
  │   │   ├─ organizations ensure/UPDATE (canonical)
  │   │   ├─ kpa_pharmacist_profiles.activity_type sync (if applicable)
  │   │   ├─ role_assignments grant/revoke (if pharmacy_owner transition)
  │   │   └─ organization_members upsert (if pharmacy_owner activation)
  │   └─ COMMIT
  ├─ readBusinessProfile(userId, source: 'cache'|'canonical'|'merged')
  │   └─ 명시적 source 지정
  └─ syncBusinessProfile(orgId | userId, direction: 'identity→canonical'|'canonical→identity')
      └─ bidirectional sync utility
```

**모든 기존 controller 가 이 service 호출**:
- auth-register.controller — `signup`
- auth-account.controller — `self-edit`
- MembershipConsoleController — `operator-edit`
- member.controller — `operator-edit` + activation
- pharmacy-request.controller — `operator-approval` 시 ensureOrganization 만 호출 (cache write 없음)
- pharmacy-info.controller — direct organizations.* update (canonical-side) + cache sync 트리거
- supplier.service.ts — Neture-specific extension + canonical sync

### 11-3. atomic transaction 의무화

**모든 business write** 는 단일 transaction:
- users.businessInfo write + organizations sync + 관련 role/membership change 한 묶음
- partial failure 시 전체 rollback
- (현재 FLOW P 의 4 separate queries 문제 해소)

---

## 12. Role / Business 관계 정책

### 12-1. Activation Prerequisite 명시

**`kpa:store_owner` 권한 부여 prerequisite** (canonical 정렬):

```
prerequisite chain:
  1. users 가 존재
  2. service_memberships(serviceKey='kpa-society', status='active') 활성
  3. kpa_pharmacist_profiles.activity_type='pharmacy_owner'
  4. users.businessInfo.businessNumber 존재 (digits-only)
  5. users.businessInfo.businessName OR kpa_members.pharmacy_name 존재
  6. organizations ensure (code=kpa-pharm-{bizno}) 성공
  7. organization_members(owner) INSERT 성공
  8. → role_assignments(kpa:store_owner) 부여
```

**현재 동작 vs 권장**:
- 현재: 4-5번 누락 시 graceful skip + warn (operator 알림 없음)
- 권장: **operator UI 에 prerequisite 누락 명시 경고** + `organizations.metadata.activation_skip_reason` 기록

### 12-2. Role Transition Policy

| Transition | 현재 동작 | 권장 |
|---|---|---|
| `pharmacy_owner` → `pharmacy_employee` (등) | role_assignments deactivate, organizations 미삭제 (orphan) | **soft-archive**: organizations.is_active=false + organization_members 보존 + role_assignments deactivate. 향후 재진입 시 reactivate 가능 |
| Other → `pharmacy_owner` (forward) | frontend guard 로 차단, backend 차단 부재 | **backend guard 추가** — operator 만 forward 가능 |
| `kpa:store_owner` 제거 + service withdraw | 단계 분리 | atomic transaction |

### 12-3. Multi-Role 사용자 정책

한 사용자가 여러 role 보유 가능:
- 예: `kpa:store_owner` + `platform:admin` + `neture:supplier`
- `organization_members` 는 multiple org 가능 (한 사용자가 여러 사업체 owner)
- L4 (org membership) 와 L5 (RBAC) 가 독립적으로 multi-cardinality

→ Operator UI 가 single-role 가정으로 단순화하면 안 됨 (현재 일부 화면이 single-role 가정).

---

## 13. Runtime Consumer Classification

### 13-1. 분류 매트릭스

| Classification | 정의 | 예시 |
|---|---|---|
| **Live Critical** | 실패 시 운영 차단 | PharmacyGuard (`/store/*` 접근), Organization ensure, role_assignments check, Glycopharm pharmacy resolve (order routing) |
| **Live Optional** | 실패 시 graceful degradation | PharmacyInfoPage GET fallback chain, MyProfilePage 의 businessInfo.storeAddress fallback, supplier profile prefill |
| **Dormant** | 코드 alive, 실제 호출 빈도 낮거나 unverified | KPA mypage.service:138-147 (`metadata.workplace` write), KPA member info (PATCH /kpa/members/:id/info) 의 일부 분기 |
| **Dead** | write 됨 but read 없음 | `glycopharm_applications.metadata`, `users.businessInfo.address2/zipCode` flat, `kpa_pharmacy_requests.pharmacy_phone/owner_phone` (fallback 외) |
| **Legacy Compatibility** | deprecate 진행 중 / migration backfill source | `organizations.address` (legacy varchar), `kpa_organizations` (legacy table), `users.businessInfo.address` |

### 13-2. 정비 우선순위 매핑

| Classification | 정비 시급 |
|---|---|
| Live Critical | 🔴 P0 — 보존 + 강화 (atomic transaction, error handling) |
| Live Optional | 🟠 P1 — drift 해소 (sync 보장, fallback 명시) |
| Dormant | 🟡 P2 — 사용 빈도 검증 후 cleanup |
| Dead | 🟢 P3 — 검증 후 즉시 제거 가능 |
| Legacy Compatibility | 🟢 P4 — migration 완료 후 제거 |

---

## 14. Migration Readiness 판단

### 14-1. Terminology Migration (pharmacy → store)

**판단**: **불필요** (§6 참조).
- Service-local layer (KPA / GlycoPharm) 는 pharmacy 도메인 어휘 유지
- Platform layer 는 이미 store/organizations 사용 중
- Rename migration 의 비용 > 이득

### 14-2. Business Canonical Migration

**판단**: **선행 prerequisite (정책 결정)** 후 단계적 실행 가능.

| Phase | Prerequisite | 가능 시점 |
|---|---|---|
| Phase A: businessInfo ↔ organizations bidirectional sync | 정책 결정만 | **즉시** |
| Phase B: representativeName → ceoName code 통일 | type 정리 + jsonb migration | **1-2 month** |
| Phase C: ceo_name / business_type / business_category 컬럼화 | schema migration | **3-6 month** |
| Phase D: tax_invoice_email / manager_* 컬럼화 | invoice 시스템 prerequisite | **invoice 도입 시** |
| Phase E: kpa_members.pharmacy_* denormalized 제거 | Phase A-C 완료 | **6-12 month** |
| Phase F: kpa_organizations 완전 통합 + 제거 | sync 안정화 | **6-12 month** |

### 14-3. KPA-First 정렬 가능 여부

**판단**: **YES, KPA-first 권장**.

근거:
- KPA-Society 가 가장 복잡한 business 흐름 (auto + manual activation, multi-flow write)
- KPA 정렬 후 GlycoPharm/K-Cosmetics 재공통화 가능 (CLAUDE.md §13: KPA-Society = reference implementation)
- KPA-Society 의 frontend 흐름 5 개가 정렬되면 다른 service 의 pattern 도입 용이

### 14-4. GlycoPharm / K-Cosmetics 재공통화 Readiness

**판단**: **부분적 ready** (organizations 통합 이미 적용).

| Service | Org 통합 상태 | 공통화 준비도 |
|---|:---:|:---:|
| KPA-Society | partial (kpa_organizations + organizations dual) | 🟡 정비 진행 중 |
| GlycoPharm | ✅ organization_id FK (migration 20260215300002) | 🟢 ready |
| K-Cosmetics | ✅ organization_id FK (migration 20260311200000) | 🟢 ready |
| Neture | partial (org metadata 로 reverse link) | 🟡 supplier 컬럼 통합 결정 필요 |

→ KPA 정렬이 prerequisite. 그 후 GlycoPharm/K-Cosmetics 공통화 진행 가능.

---

## 15. 핵심 질문 8 개 답변 (상세)

### Q1. organizations 는 business SSOT 인가?

**답**: **canonical 선언 YES, 실 구현 partial**.

- ✅ Per-docs: `O4O-ORGANIZATION-ROLE-STANDARD-V1` 가 명시 선언 ("Organizations 테이블 = 事業体 SSOT")
- ✅ Per-code: 8 create + 6 update + 10 read 경로, ensure logic + dedup key (code) 보유
- ❌ Bidirectional sync 부재 (users.businessInfo ↔ organizations)
- ❌ Service-specific 컬럼 (neture_suppliers.representative_name 등) 잔존
- ❌ kpa_organizations dual maintenance

→ **정책: organizations 를 full SSOT 로 승격**. Phase A (bidirectional sync) + Phase B-F (점진적 통합) 으로 완성.

### Q2. store 는 무엇인가?

**답**: **organizations 의 type='store' instance — 별도 entity 아님**.

- `organizations.type ∈ {'pharmacy', 'store', 'supplier', 'community', 'kpa-branch', 'kpa-group'}` 의 discriminator
- 매장 = `organizations(type='store')` 또는 `organizations(type='pharmacy')` (KPA/GlycoPharm 의 경우)
- Service-specific 확장 컬럼이 필요하면 별도 extension 테이블 (organization_id FK)
- 별도 "Store" entity 만들지 않음

### Q3. pharmacy 는 legacy terminology 인가?

**답**: **NO — domain-specific intentional terminology**.

- KPA-Society = 한국약사회 도메인 → pharmacy 자연 어휘
- GlycoPharm = 글라이코팜 (glyco + pharmacy) → pharmacy 도메인
- Platform-layer (packages) 는 이미 store/organization (generic)
- Rename migration 불필요. Layer 별 어휘 정책으로 정리 (§6-3 참조)

### Q4. users.businessInfo 는 앞으로 무엇인가?

**답**: **Identity-side Business Profile Cache** (§7-2 참조).

- form input + display cache + organization ensure 의 read source 3-역할 명시적 인정
- SSOT 권리 없음 — runtime canonical = organizations
- organizations 와 bidirectional sync 의무화
- Type 외 free fields (representativeName 등) 정리

### Q5. operator/profile/register 동일 write-path 통합 가능?

**답**: **YES — BusinessProfileWriteService 단일 layer 권장** (§11 참조).

- 7 분산 write entrypoint → 1 service layer
- atomic transaction 의무화
- 각 caller 의 context (`signup` / `self-edit` / `operator-edit` / `merge`) 만 다름
- 기존 controller 인터페이스 유지 가능

### Q6. address canonical 은 무엇인가?

**답**: **`StoreAddress` type → `organizations.address_detail` (jsonb)** (§9 참조).

- 4-field: zipCode / baseAddress / detailAddress / region
- 비표준 deprecate: flat varchar, denormalized, custom 6-field, dead writes
- 신규 가입 UX 는 free-text 허용 (단 post-signup 3-part 보완 강제)

### Q7. store_owner prerequisite 는 무엇인가?

**답**: **8 단계 chain** (§12-1 참조).

```
users → service_memberships(kpa-society, active)
      → kpa_pharmacist_profiles.activity_type='pharmacy_owner'
      → users.businessInfo.businessNumber + (businessName OR pharmacy_name)
      → organizations ensure (code=kpa-pharm-{bizno})
      → organization_members(owner) INSERT
      → role_assignments(kpa:store_owner) 부여
```

**Activation gate 강화 권장**: 4-5 단계 누락 시 graceful skip 대신 **operator UI 명시 경고** + `metadata.activation_skip_reason` 기록.

### Q8. terminology migration 은 지금 가능한가?

**답**: **NO — 불필요**.

- pharmacy 는 legacy 가 아님 (§6 참조)
- 현재 layer 분리 (platform=store / service-local=pharmacy) 가 이미 정합
- 추가 정책: 신규 도메인 (예: 새 service) 도입 시 layer 정책 준수

---

## 16. Migration Priority Roadmap

### Phase 0: 정책 결정 (즉시)

본 IR 의 7 canonical policy declaration 합의:
- P0-1 organizations = business SSOT
- P0-2 users / role_assignments / service_memberships frozen 유지
- P0-3 users.businessInfo = identity-side cache
- P0-4 pharmacy/store layer 별 어휘 정책
- P0-5 StoreAddress + organizations.address_detail canonical
- P0-6 tax_invoice_email 결정 deferring (invoice 시스템 prerequisite)
- P0-7 BusinessProfileWriteService single canonical write-path

### Phase 1: Atomic + Bidirectional (1-2 month) — P0/P1 위험 해소

| Order | WO | 해소 위험 (선행 IR) | 의존 |
|---|---|---|---|
| 1 | `WO-O4O-AUTH-PROFILE-ATOMIC-TRANSACTION-V1` | N1 (FLOW P 비-원자적) | 없음 |
| 2 | `WO-O4O-BUSINESSINFO-CEO-NAME-CANONICAL-V1` | H2 (representativeName free field) | type 정리 |
| 3 | `WO-O4O-BUSINESSINFO-EMAIL-SEMANTIC-RESTORE-V1` | H1 (taxEmail → email overwrite) | invoice 시스템 결정 prerequisite |
| 4 | `WO-O4O-ADMIN-DASHBOARD-EDIT-USER-MODAL-AUDIT-V1` | N2 (admin-dashboard silent discard 우려) | admin-dashboard 코드 접근 |

### Phase 2: Single Write-Path + Sync (3-6 month)

| Order | WO | 의존 |
|---|---|---|
| 5 | `WO-O4O-BUSINESS-PROFILE-WRITE-SERVICE-V1` — BusinessProfileWriteService 신설 + 7 caller migration | Phase 1 완료 |
| 6 | `WO-O4O-BUSINESSINFO-ORG-BIDIRECTIONAL-SYNC-V1` — write 양방향 자동 sync | WO-5 |
| 7 | `WO-O4O-PHARMACY-OWNER-ROLE-TRANSITION-ORG-CLEANUP-V1` — orphan org soft-archive | WO-5 + 정책 결정 |

### Phase 3: Canonical 컬럼 통합 (3-6 month)

| Order | WO | 의존 |
|---|---|---|
| 8 | `WO-O4O-ORGANIZATIONS-CANONICAL-COLUMNS-V1` — ceo_name / business_type / business_category 컬럼 신설 | Phase 2 |
| 9 | `WO-O4O-KPA-MEMBERS-PHARMACY-ADDRESS-DEPRECATE-V1` — denormalized 제거 | WO-8 |

### Phase 4: Dead Cleanup (병행 가능)

| Order | WO | 의존 |
|---|---|---|
| 10 | `WO-O4O-DEAD-WRITE-CLEANUP-V1` (선행 IR P3) | 검증 후 |
| 11 | `WO-O4O-GLYCOPHARM-APPLICATIONS-METADATA-AUDIT-V1` | dead 확정 |

### Phase 5: Invoice 시스템 도입 시점

| Order | WO | Trigger |
|---|---|---|
| 12 | `WO-O4O-ORGANIZATIONS-TAX-INVOICE-EMAIL-CANONICAL-V1` — 5 곳 → organizations.tax_invoice_email 통합 | Invoice 시스템 도입 |
| 13 | `WO-O4O-ORGANIZATIONS-MANAGER-FIELDS-V1` — manager_name/manager_phone 표준 컬럼 | Cross-service 필요 시 |

### Phase 6: 장기 (6-12 month)

| Order | WO | 의존 |
|---|---|---|
| 14 | `WO-O4O-KPA-ORGANIZATIONS-LEGACY-TABLE-REMOVE-V1` — kpa_organizations 완전 제거 | Phase 2-3 완료 |
| 15 | `WO-O4O-NETURE-SUPPLIER-CANONICAL-COLUMN-CONSOLIDATION-V1` — supplier 자체 컬럼 organizations 통합 (또는 service-local 정책 명시) | 정책 결정 |
| 16 | `WO-O4O-GLYCOPHARM-KCOSMETICS-CANONICAL-RE-COMMONIZATION-V1` — KPA 정렬 후 다른 service 재공통화 | KPA 정렬 완료 |

---

## 17. Risk Matrix (정책 정렬 측면)

| # | 위험 | 영향 | 심각도 | 완화 |
|---|---|---|:---:|---|
| R1 | 정책 결정 없이 WO 진행 | 각 WO 가 다른 SSOT 가정으로 drift 확대 | 🔴 HIGH | 본 IR 의 P0-1 ~ P0-7 합의 prerequisite |
| R2 | BusinessProfileWriteService 도입 시 기존 7 controller 의 회귀 위험 | major refactoring | 🟠 MID | 단계적 migration, 모든 controller 의 typecheck/smoke test |
| R3 | bidirectional sync 도입 시 무한 sync loop 위험 | runtime 영향 | 🟠 MID | sync direction marker + transaction-level dedup |
| R4 | tax_invoice_email 결정 deferring 으로 invoice 시스템 도입 시 backfill 복잡 | 향후 마이그레이션 부담 | 🟡 LOW (현재) / 🟠 MID (도입 시) | Interim 정책 (P0-6) 으로 신규 write 정렬 |
| R5 | pharmacy → store rename 진행 시 KPA-Society 의 UX 어휘 어색함 | UX 회귀 | 🟠 MID | 본 IR 의 P0-4 정책으로 rename 차단 |
| R6 | Neture supplier 자체 컬럼 organizations 통합 시 기존 supplier UI 회귀 | 도메인 기능 손상 | 🟠 MID | service-local 정책 유지 vs 통합 결정 (Phase 6) |
| R7 | KPA-first 정렬 중 GlycoPharm/K-Cosmetics 의 신규 변경 발생 | sync 부담 증가 | 🟡 LOW | KPA-Society = reference implementation 원칙 (CLAUDE.md §13) |
| R8 | dead writes 정비 중 hidden consumer 발견 | 회귀 | 🟡 LOW | grep 검증 + staging deploy 시 모니터링 |

---

## 18. Recommended Next Phase

### 18-1. 즉시 결정 필요 (사용자/팀)

1. **본 IR 의 7 canonical policy (P0-1 ~ P0-7) 합의 여부** — 합의 시 Phase 1 진입
2. **`users.businessInfo` 정책** — Option B (cache) 승인 여부
3. **pharmacy/store terminology 정책** — Layer-별 어휘 유지 합의
4. **tax_invoice_email deferring** — invoice 시스템 도입 시점 결정까지 보류 OK 여부

### 18-2. 합의 후 즉시 진행 가능 (Phase 1)

- `WO-O4O-AUTH-PROFILE-ATOMIC-TRANSACTION-V1` (가장 작은 작업, N1 해소)
- `WO-O4O-BUSINESSINFO-CEO-NAME-CANONICAL-V1` (representativeName 통일)

### 18-3. 후속 IR 권장

본 IR 의 범위 외 (정책 결정 후 follow-up 조사):
- `IR-O4O-BUSINESS-PROFILE-WRITE-SERVICE-DESIGN-V1` — service layer 인터페이스 설계
- `IR-O4O-ORGANIZATIONS-METADATA-TYPED-SCHEMA-V1` — metadata jsonb 표준화
- `IR-O4O-GLYCOPHARM-KCOSMETICS-CANONICAL-GAP-V2` — KPA 정렬 후 재공통화 prerequisite
- `IR-O4O-NETURE-SUPPLIER-COLUMN-STRATEGY-V1` — service-local vs canonical 결정

---

## 19. 본 IR 범위 외

다음은 본 IR 의 후속 작업 영역 (정책 결정 후):
- 구체적 WO 작성 (Phase 1-6 의 16 WO)
- BusinessProfileWriteService 인터페이스 설계
- Bidirectional sync 의 구체적 알고리즘 (loop 방지)
- Pharmacy_owner soft-archive policy 의 세부 (UI 표시 / re-activation 흐름)
- Invoice 시스템 도입 시 tax_invoice_email backfill 마이그레이션 계획

---

## 20. 참조

### 선행 IR
- [IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1](docs/investigations/IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1.md) — entity / schema / SSOT 후보
- [IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1](docs/investigations/IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1.md) — 실제 코드 trace
- [IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1](docs/investigations/IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1.md) — auto-activation

### Canonical / Governance docs (선언적 canonical 근거)
- [USER-DOMAIN-SSOT-V1](docs/baseline/USER-DOMAIN-SSOT-V1.md) (Frozen 2026-03-16)
- [O4O-ORGANIZATION-ROLE-STANDARD-V1](docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md) (★ "organizations = 事業体 SSOT")
- [O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1](docs/architecture/O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md)
- [USER-OPERATOR-FREEZE-V1](docs/architecture/USER-OPERATOR-FREEZE-V1.md) (Frozen F11)
- [O4O-CORE-FREEZE-V1](docs/architecture/O4O-CORE-FREEZE-V1.md) (Frozen F10)
- [RBAC-FREEZE-DECLARATION-V1](docs/rbac/RBAC-FREEZE-DECLARATION-V1.md) (Frozen F9)
- [USER-STRUCTURE-V1](docs/architecture/USER-STRUCTURE-V1.md) (pending)

### CLAUDE.md sections
- §3 Core 동결 정책 (organization-core frozen)
- §13 O4O 공통 구조 원칙 (KPA-Society = reference implementation)
- §14 Frozen Baselines (F9, F10, F11)

### Types
- [BusinessInfo type](apps/api-server/src/types/user.ts) — canonical (사용 현실과 drift)
- [StoreAddress type](apps/api-server/src/types/store-address.ts) — address canonical

---

*조사 전용 — 코드 / DB / migration / schema / UI / contract / rename / 구현 WO 작성 모두 금지. 본 IR 은 **정책 정렬** 단계. **commit/push 금지** (사용자 명시) — IR 파일은 working tree 에 두고 정책 합의 대기.*
