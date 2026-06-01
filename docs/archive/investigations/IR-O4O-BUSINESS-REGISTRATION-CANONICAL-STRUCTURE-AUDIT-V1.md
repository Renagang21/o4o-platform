# IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB/UI/contract 수정 없음)
**대상**: O4O 전체에서 **사업자/매장/약국 등록 데이터** 가 어떻게 분산 저장되는지 매핑, canonical business registration 구조 정의, 향후 정비 WO 기준 확보.

**조사 범위**:
- Backend entity / table schema
- Frontend 입력 흐름 (signup / profile / operator-edit / pharmacy onboarding / supplier 등록)
- Activation logic (store_owner / pharmacy_owner) + organization ensure
- Baseline / canonical / governance docs
- Cross-cutting fields (address / tax invoice email / 담당자 / postcode / 대표자명)
- 서비스 비교 (KPA / GlycoPharm / K-Cosmetics / Neture)

**선행 IR / 관련**:
- `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` (auto-activation 흐름)
- `IR-O4O-BUSINESS-CORE-AUDIT-PHASE1-V1` (dual organization 시스템 fragmentation)
- `WO-O4O-NETURE-ORG-DATA-MODEL-V1` (Neture supplier → organizations 통합 design, **미실행**)
- `WO-O4O-STORE-PROFILE-UNIFICATION-V1` (address_detail jsonb migration, **실행됨**)

**기준 baseline 문서**:
- `docs/baseline/USER-DOMAIN-SSOT-V1.md` (Frozen 2026-03-16)
- `docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md` (Design Standard)
- `docs/architecture/O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md`
- `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (Frozen F11, 2026-03-19)
- `docs/architecture/O4O-CORE-FREEZE-V1.md` (Frozen F10, 2026-03-11)
- `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (Frozen F9, 2026-02-27)

---

## 0. 결론 요약

> **결론: O4O 사업자 등록 데이터는 8 개 entity + 5 개 frontend 흐름 + 1 개 design-only 마이그레이션 미실행 상태에서 transitional drift 중**. Per docs canonical SSOT 는 `organizations` (사업체 entity), 그러나 실제 코드는 `users.businessInfo` (JSON) 를 form-input source 로 사용하고 `organizations` 로 단방향 일회성 sync. 5 곳에 분산된 `taxInvoiceEmail` 과 type 외 free-field 로 jsonb 에 박힌 `representativeName` 이 가장 위험.

### 핵심 발견 (요약)

1. **Per-docs canonical 명시적 선언 존재** — [O4O-ORGANIZATION-ROLE-STANDARD-V1](docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md) 가 `organizations` 를 "事業体 SSOT" 로 선언. 다만 실제 구현은 부분적.
2. **`users.businessInfo` 는 form-input layer** — RegisterModal/MyProfile/EditUserModal/PharmacyApprovalGate 모두 이쪽 read/write. Auto-activation 시 `organizations` 로 단방향 read-only sync.
3. **🚨 `taxInvoiceEmail` 5 곳 drift** — Backend column 이 분명히 존재함에도 (A1 보고 오류 — 본 IR 에서 정정) `users.businessInfo.email` (덮어쓰기) / `users.businessInfo.metadata.taxEmail` / `kpa_pharmacy_requests.tax_invoice_email` / `organizations.metadata.taxInvoiceEmail` / `neture_suppliers.tax_email` 5 곳에 분산. Single canonical 부재.
4. **🚨 `representativeName` 이중 표기 + type 위반** — `BusinessInfo` type 의 canonical 필드는 `ceoName` 이나 실제 코드는 `representativeName` 으로 저장 (jsonb 의 free field). 같은 데이터를 다른 키 이름으로.
5. **Address 구조 transitional** — `StoreAddress` type (zipCode/baseAddress/detailAddress/region) 가 canonical. `organizations.address_detail` (jsonb) 로 통일 진행 중 (migration `20260318200000` 실행). 그러나 `users.businessInfo` 에는 legacy `address` + `storeAddress` 양쪽 보유, `kpa_members.pharmacy_address` 는 여전히 varchar denormalized.
6. **PharmacyApprovalGate 가 주소 미수집** — 다른 4 개 흐름은 주소 수집하는데 이 흐름만 누락. Canonical 정렬 시 prerequisite 보완 필요.
7. **`pharmacy_owner` role layer 모호** — USER-STRUCTURE-V1 은 sub-role 이라고, O4O-ORGANIZATION-ROLE-STANDARD-V1 은 Layer A 예시로, RBAC-ROLE-CATALOG-V1 에는 미등록. 실제 코드는 `role_assignments(role='kpa:store_owner')` 사용 — service-prefix 형식.
8. **Neture supplier 통합 미실행** — `WO-O4O-NETURE-ORG-DATA-MODEL-V1` 가 `neture_suppliers` → `organizations` 통합을 design 했으나 코드 미변경. 향후 정비 시 별도 phase.
9. **Admin 사업자 form 미존재** — admin-dashboard 에 `OrganizationForm`/`BusinessForm` 자체가 없음. operator-only 흐름.
10. **GlycoPharm/K-Cosmetics 자체 RegisterPage** — KPA RegisterModal 과 별도 흐름. 서비스별 signup form drift 확인 필요 (본 IR 에서 핵심만 매핑, 상세는 후속).

### SSOT 후보 판단 (요약)

| 영역 | SSOT 후보 | 근거 |
|---|---|---|
| User Identity | `users` (Frozen F10) | USER-DOMAIN-SSOT-V1, CORE-FREEZE-V1 |
| RBAC | `role_assignments` (Frozen F9) | RBAC-FREEZE-DECLARATION-V1 |
| Service Membership | `service_memberships` (Frozen F11) | USER-OPERATOR-FREEZE-V1 |
| **Business Entity** | **`organizations`** (★) | O4O-ORGANIZATION-ROLE-STANDARD-V1 (design canonical) |
| Org Membership Role | `organization_members` | O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1 |
| Address Structure | `StoreAddress` type | store-address.ts (WO-O4O-STORE-PROFILE-UNIFICATION-V1) |
| Personal Business Cache | `users.businessInfo` (DTO) | types/user.ts (form-input layer) |
| Tax Invoice Email | **❌ 미정의** | DB drift 5 곳, doc 명시 없음 |
| 담당자 (Manager) | **❌ 미정의** | Neture 만 존재 (managerName/managerPhone), 다른 곳 없음 |

→ **canonical 정렬 방향**: `organizations` 를 사업체 SSOT 로, `users.businessInfo` 를 personal-side input cache 로 명시적 분리. `taxInvoiceEmail` 과 `managerName/managerPhone` 의 canonical home 결정이 가장 시급.

---

## 1. 조사 범위 & 방법론

### 1-1. 14 개 조사 대상 커버리지

| # | 항목 | 본 IR 커버 | 상세 위치 |
|---|---|:---:|---|
| 1 | users.businessInfo 구조 | ✅ | §2-2, §3 |
| 2 | organizations 테이블 구조 | ✅ | §2-1 |
| 3 | kpa_members 약국 정보 구조 | ✅ | §2-1 |
| 4 | pharmacy/store onboarding 구조 | ✅ | §2-3, §6 |
| 5 | store_owner 자동 활성화 로직 | ✅ | §7 (+ 선행 IR) |
| 6 | 세금계산서 이메일 저장 위치 | ✅ | §5-3 |
| 7 | 담당자명 / 담당자 전화번호 | ✅ | §5-4 |
| 8 | 주소 구조 | ✅ | §5-2 |
| 9 | 회원가입(RegisterModal) | ✅ | §2-3, §6 |
| 10 | MyProfilePage 수정 | ✅ | §2-3, §6 |
| 11 | operator MemberManagement 수정 | ✅ | §2-3, §6 |
| 12 | admin 사업자 정보 입력 | ⚠️ 부재 확인 | §2-3, §6 (form 미존재) |
| 13 | Neture supplier/business registration | ✅ | §2-1, §8 |
| 14 | K-Cosmetics / GlycoPharm 재사용 | ⚠️ 부분 | §8 (entity-level 매핑 + 자체 RegisterPage 존재 확인) |

### 1-2. 방법론

- 4 개 Explore agent 병렬 (Backend entity / Frontend flow / Activation / Baseline docs)
- 본 작성자 직접 cross-cutting grep 으로 정정 (특히 `taxInvoiceEmail`/`representativeName` 의 실제 저장 위치)
- 실제 동작 코드 추적 (frontend 입력 → API endpoint → backend handler → DB column/jsonb)
- 모든 entity 정의 + 모든 frontend form 의 submit shape 까지 확인
- "현재 dead / 실제 사용 중" 구분은 각 항목 옆에 명시

---

## 2. Source Map

### 2-1. Entity / Table Layer (10 개)

| # | Entity | Table | 파일 | 용도 | 상태 |
|---|---|---|---|---|:---:|
| 1 | `User` | `users` | [User.ts](apps/api-server/src/modules/auth/entities/User.ts) | Identity SSOT. `businessInfo` (jsonb) 컬럼 보유 | ALIVE (Frozen F10) |
| 2 | `OrganizationStore` | `organizations` | [organization-store.entity.ts](apps/api-server/src/modules/store-core/entities/organization-store.entity.ts) | Business entity SSOT (design). `business_number`/`address`/`address_detail`/`phone`/`metadata` 보유 | ALIVE (Frozen design) |
| 3 | `KpaMember` | `kpa_members` | [kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts) | KPA 약사 회원. `pharmacy_name`/`pharmacy_address` (varchar denormalized) 보유 | ALIVE |
| 4 | `KpaPharmacyRequest` | `kpa_pharmacy_requests` | [kpa-pharmacy-request.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts) | 약국 운영 신청. `pharmacy_name`/`business_number`/`pharmacy_phone`/`owner_phone`/`tax_invoice_email` 보유 | ALIVE (manual path) |
| 5 | `GlycopharmPharmacy` | `glycopharm_pharmacies` | [glycopharm-pharmacy.entity.ts](apps/api-server/src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts) | GlycoPharm 약국. `business_number`/`owner_name`/`address`/`address_detail`/`phone`/`email` 보유 | ALIVE |
| 6 | `CosmeticsStore` | `cosmetics_stores` | [cosmetics-store.entity.ts](apps/api-server/src/routes/cosmetics/entities/cosmetics-store.entity.ts) | Cosmetics 매장. `business_number`/`owner_name`/`address`/`address_detail`/`contact_phone` 보유 (**email 컬럼 없음**) | ALIVE |
| 7 | `NetureSupplier` | `neture_suppliers` | [NetureSupplier.entity.ts](apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts) | Neture dropship 공급자. `representative_name`/`manager_name`/`manager_phone`/`tax_email`/`business_type` + contact_* visibility 컬럼 (**address 컬럼 없음**) | ALIVE |
| 8 | `NeturePartner` | `neture_partners` | [neture-partner.entity.ts](apps/api-server/src/routes/neture/entities/neture-partner.entity.ts) | Neture generic partner. `business_number`/`address` (jsonb)/`contact` (jsonb name/email/phone/position) | ALIVE |
| 9 | `Supplier` | `suppliers` | [Supplier.ts](apps/api-server/src/entities/Supplier.ts) | Legacy supplier. `contact_person`/`contact_phone`/`contact_email`/`tax_id` | **DEPRECATED stub** |
| 10 | `OrganizationMember` | `organization_members` | (table-only, no entity) | user ↔ organization 관계. role: owner/manager/staff/member | ALIVE (Layer B SSOT) |
| 11 | `ServiceMembership` | `service_memberships` | [ServiceMembership.ts](apps/api-server/src/modules/auth/entities/ServiceMembership.ts) | Service-level membership SSOT (Frozen F11) | ALIVE |
| 12 | `RoleAssignment` | `role_assignments` | [RoleAssignment.ts](apps/api-server/src/modules/auth/entities/RoleAssignment.ts) | RBAC SSOT (Frozen F9) | ALIVE |

**Dual organization 시스템 (legacy)**:
- `kpa_organizations` (legacy, KPA-only) — `20260411100000-BackfillKpaOrgsToOrganizations.ts` 가 `organizations` 로 sync 진행 중 (formal FK 없음, 데이터 sync 만)
- `organizations` (canonical hub)

### 2-2. Type / DTO Layer

#### `BusinessInfo` 타입 ([apps/api-server/src/types/user.ts](apps/api-server/src/types/user.ts))

```typescript
export interface BusinessInfo {
  businessName?: string;          // 상호명
  businessNumber?: string;        // 사업자등록번호 (XXX-XX-XXXXX)
  businessType?: string;          // 개인/법인/개인사업자
  ceoName?: string;               // 대표자명 ⚠️ (실제 코드는 representativeName 으로 저장)
  storeAddress?: StoreAddress;    // WO-O4O-STORE-PROFILE-UNIFICATION-V1 구조화 주소
  address?: string;               // 사업장 주소 — 레거시
  address2?: string;              // 상세주소 — 레거시
  businessCategory?: string;      // 업종
  telecomLicense?: string;        // 통신판매업 신고번호
  phone?: string;                 // 대표 전화번호
  email?: string;                 // 사업자 이메일 ⚠️ (실제 코드가 taxEmail 을 여기 덮어씀)
  website?: string;
  metadata?: Record<string, any>; // 확장 jsonb — representativeName, taxEmail 등 비공식 필드 저장처
}
```

**중요**:
- ⚠️ Type 정의에는 `ceoName` 이나 실제 RegisterModal 흐름은 `representativeName` 으로 저장 → **type-code drift**
- ⚠️ Type 정의에는 `taxEmail`/`taxInvoiceEmail` 필드 없음. 실제 코드는 `email` 필드를 덮어쓰거나 `metadata.taxEmail` 에 저장
- `apps/api-server/src/types/auth.ts` 에도 **동일 type 중복 정의** (dual definition drift)

#### `StoreAddress` 타입 ([apps/api-server/src/types/store-address.ts](apps/api-server/src/types/store-address.ts))

```typescript
export interface StoreAddress {
  zipCode?: string;          // 우편번호 (5자리)
  baseAddress: string;       // 기본주소 (도로명/지번) — required
  detailAddress?: string;    // 상세주소 (동/호수)
  region?: string;           // 시/도 분류
}
```

저장처: `organizations.address_detail` (jsonb) / `glycopharm_pharmacies.address_detail` / `cosmetics_stores.address_detail` — migration `20260318200000-AddStructuredAddress` 로 추가 + legacy `address` → `address_detail.baseAddress` backfill.

**미적용 entity**: `users.businessInfo` (type 에는 storeAddress 있으나 실제 사용 미확인) / `kpa_members.pharmacy_address` (여전히 varchar) / `neture_partners.address` (자체 jsonb 구조 — zipCode/address1/address2/city/province/country) / `neture_suppliers` (address 컬럼 자체 없음).

### 2-3. Frontend 입력 흐름 (5 개 + 1 부재)

| # | 흐름 | 파일 | 라우트 | 상태 |
|---|---|---|---|:---:|
| F1 | RegisterModal (KPA 회원가입) | [RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx) | KPA root 진입 modal | ALIVE |
| F2 | MyProfilePage (KPA 내 프로필) | [MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx) | `/mypage/profile` | ALIVE (business 정보 read-only) |
| F3 | EditUserModal (KPA operator 회원 수정) | [EditUserModal.tsx](services/web-kpa-society/src/pages/operator/EditUserModal.tsx) | `/operator/members/:id` | ALIVE |
| F4 | PharmacyApprovalGatePage (KPA 약국 신청) | [PharmacyApprovalGatePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx) | `/pharmacy` | ALIVE (manual fallback) |
| F5 | PharmacyInfoPage (KPA 약국 정보 조회/수정) | [PharmacyInfoPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyInfoPage.tsx) | `/store/info` 등 | ALIVE |
| F6 | GlycoPharm RegisterPage | [RegisterPage.tsx](services/web-glycopharm/src/pages/auth/RegisterPage.tsx) | GlycoPharm `/register` | ALIVE (별도 흐름) |
| F7 | K-Cosmetics RegisterPage | [RegisterPage.tsx](services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx) | K-Cosmetics `/register` | ALIVE (별도 흐름) |
| F? | Admin 사업자 정보 form | (없음) | — | **부재 확인** |
| F? | Neture supplier 등록 frontend | (admin 측 supplier-management 일부) | — | 부분 확인 (`SupplierForm` stub) |

### 2-4. Baseline / Governance 매핑

| 문서 | 상태 | 본 IR 도메인 관련 claim |
|---|---|---|
| [USER-DOMAIN-SSOT-V1](docs/baseline/USER-DOMAIN-SSOT-V1.md) | Frozen 2026-03-16 | `users.businessInfo` = 사업자 데이터 JSON 보관 / users = Identity SSOT (만!) |
| [O4O-ORGANIZATION-ROLE-STANDARD-V1](docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md) | Design Standard | **organizations = 事業体 SSOT** 명시 선언. `business_number`/`address` 필드 명시 |
| [O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1](docs/architecture/O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md) | Active | organization_members = Layer B role (owner/manager/staff/member) |
| [RBAC-FREEZE-DECLARATION-V1](docs/rbac/RBAC-FREEZE-DECLARATION-V1.md) | Frozen F9 | role_assignments = RBAC SSOT (Layer A). users.role/roles 금지 |
| [USER-OPERATOR-FREEZE-V1](docs/architecture/USER-OPERATOR-FREEZE-V1.md) | Frozen F11 | service_memberships = Service Membership SSOT |
| [WO-O4O-NETURE-ORG-DATA-MODEL-V1](docs/work-orders/WO-O4O-NETURE-ORG-DATA-MODEL-V1.md) | **Design only, 미실행** | neture_suppliers → organizations 통합 설계 (코드 변경 없음) |
| [WO-O4O-STORE-PROFILE-UNIFICATION-V1] | **실행됨 (migration 20260318)** | `address_detail` (jsonb StoreAddress) 컬럼 추가 + backfill |

---

## 3. Canonical Schema 후보 (Per Docs vs Per Code)

### 3-1. Per Docs (선언적 canonical)

```
User (Identity SSOT)
  └── businessInfo (JSON DTO) — 사용자 본인 입력
       (BusinessInfo type: businessName/businessNumber/ceoName/storeAddress/...)

Organization (Business Entity SSOT)  ★
  ├── business_number (varchar, unique 의도)
  ├── address (varchar legacy) + address_detail (jsonb StoreAddress)
  ├── phone, type, code, parent/level/path
  └── metadata (jsonb 확장)

OrganizationMember (Layer B Role)
  └── user ↔ organization 관계, role: owner/manager/staff/member

ServiceMembership (Service Membership SSOT)
  └── user ↔ service_key 관계, role: member/user/pharmacy/...

RoleAssignment (RBAC SSOT, Layer A)
  └── user → role (예: kpa:store_owner, kpa:operator)
```

### 3-2. Per Code (실제 동작)

```
RegisterModal (form input)
  └→ POST /api/v1/auth/register
      └→ users.businessInfo (JSON 저장) + (taxEmail → businessInfo.email overwrite)
                                       + (representativeName → businessInfo.representativeName, 비공식 필드)
                                       + KPA pharmacy_owner 신청 시 metadata.{representativeName, taxEmail, ...}

MyProfilePage (read-only display)
  └→ users.businessInfo 읽어서 표시 (편집 불가)

EditUserModal (operator)
  └→ PUT /api/v1/operator/members/{userId}
      └→ users.businessInfo (zipCode/address1/address2/businessName/businessNumber/taxEmail/businessType/businessCategory)

PharmacyApprovalGatePage (manual flow)
  └→ POST /pharmacy-requests
      └→ kpa_pharmacy_requests (pharmacy_name/business_number/pharmacy_phone/owner_phone/tax_invoice_email)

PharmacyInfoPage (PUT /pharmacy/info)
  └→ organizations (address_detail jsonb) + organizations.metadata.{taxInvoiceEmail, ownerPhone}

Auto-activation (운영자 회원 승인)
  └→ users.businessInfo READ
      └→ organizations ensure (code=kpa-pharm-{bizno digits}, name=pharmacy_name)
          └→ organization_members(owner) + role_assignments(kpa:store_owner)
      [⚠️ users.businessInfo → organizations 단방향 일회성 sync, write-back 없음]
```

### 3-3. Per-docs vs Per-code 불일치

| 항목 | Per docs (canonical) | Per code (실제) | 차이 |
|---|---|---|---|
| 사업체 SSOT | `organizations` | `users.businessInfo` (form-input layer) + `organizations` (auto-activation 시 ensure) | 두 layer 가 양립. **bidirectional sync 없음** → drift 발생 |
| 대표자명 | `BusinessInfo.ceoName` | `users.businessInfo.representativeName` (free field) + `metadata.representativeName` | **type 위반 + 이중 표기** |
| 세금계산서 이메일 | (canonical 미정의) | 5 곳 분산 — businessInfo.email overwrite / metadata.taxEmail / kpa_pharmacy_requests.tax_invoice_email / organizations.metadata.taxInvoiceEmail / neture_suppliers.tax_email | **silent silent silent drift** |
| 담당자명/전화 | (canonical 미정의) | Neture 만 (managerName/managerPhone), 다른 곳 부재 | service-local schema |
| 주소 구조 | `StoreAddress` (4-field) | organizations/glycopharm/cosmetics 는 address_detail (jsonb) ✅, kpa_members 는 varchar denormalized ❌, neture_partners 는 자체 6-field jsonb ❌ | **mixed adoption** |
| 약국 식별 | organizations(type='pharmacy') | 추가 entity 3 종 (kpa_members.organization_id + glycopharm_pharmacies + kpa_organizations legacy) | dual+ organization 시스템 |

---

## 4. SSOT 후보 판단

### 4-1. Business Entity SSOT: `organizations` (★)

**근거**:
- [O4O-ORGANIZATION-ROLE-STANDARD-V1](docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md) 가 "Organizations 테이블 (事業体 SSOT)" 명시 선언
- Auto-activation 이 `organizations` 를 ensure 함 — `code=kpa-pharm-{bizno}` 기준 dedup
- `WO-O4O-NETURE-ORG-DATA-MODEL-V1` 도 organizations 를 통합 target 으로 설정 (실행 전)
- `address_detail` (jsonb StoreAddress) 가 organizations 에 표준 적용됨
- `glycopharm_pharmacies` / `cosmetics_stores` 가 `organization_id` FK 로 organizations 와 연결 (각각 migration `20260215300002`, `20260311200000`)
- CLAUDE.md §3 Core 동결 정책: organization-core frozen

**현실 보완 사항**:
- ⚠️ `kpa_organizations` legacy 잔존 — `organizations` 로 sync (`20260411100000`) 진행 중. 완전 통합까지 transitional 상태.
- ⚠️ `neture_suppliers` 가 별도 (organizations 연결 없음). `WO-O4O-NETURE-ORG-DATA-MODEL-V1` 실행 시 통합.
- ⚠️ `kpa_members.pharmacy_address` (varchar) 가 여전히 denormalized — organizations 로 이전 필요.

### 4-2. Personal Business Cache: `users.businessInfo`

**판정**: **Identity-layer DTO**, business entity SSOT 아님.

**근거**:
- USER-DOMAIN-SSOT-V1 가 users 를 "Identity SSOT" 라고만 선언 (auth attribute 금지)
- `businessInfo` 는 사용자 본인이 입력한 사업자 정보 cache
- Auto-activation 시 organizations 로 sync 후 사실상 **organizations 가 truth**, businessInfo 는 input source 역할
- 그러나 MyProfile 이 businessInfo 를 표시함 → 사용자 view 와 organizations canonical 의 sync 가 필요

**개선 방향**:
- `users.businessInfo` 를 sync target (organizations.* 의 cache view) 으로 명시
- 또는 `users.businessInfo` 사용을 deprecate 하고 frontend 가 organizations 직접 조회

### 4-3. Service Membership / RBAC / OrganizationMember

**판정**: 기존 frozen SSOT 그대로 유지 (수정 불필요).

- `service_memberships` (F11) — service-level membership 의 단일 진실
- `role_assignments` (F9) — RBAC 권한의 단일 진실
- `organization_members` (Layer B) — org 내 역할 (owner/manager/staff/member)

본 IR 의 정비 대상이 아님.

### 4-4. Tax Invoice Email / Manager 정보

**판정**: **canonical home 미정의 — 정책 결정 필요**

3 가지 방안:
- **A. `organizations.metadata.taxInvoiceEmail`** — 이미 PharmacyInfoPage 가 사용 중. 가장 작은 변경. 단 jsonb metadata 는 typed schema 부재.
- **B. `organizations.tax_invoice_email` 컬럼 신설** — varchar column 추가. typed, indexable. migration 1건.
- **C. 별도 entity (`organization_tax_info` 등)** — tax 관련 데이터 (이메일/계좌/세금 신고번호 등) 묶음 entity. overengineering 위험.

→ **권장: B (컬럼 신설)**. taxInvoiceEmail/managerName/managerPhone 모두 organizations 의 standard 필드로 승격. 별도 후속 WO.

---

## 5. Drift Matrix

### 5-1. Business Number drift (6 곳)

| 저장 위치 | 사용 흐름 | Format | 상태 |
|---|---|---|---|
| `users.businessInfo.businessNumber` | RegisterModal / EditUserModal / Auto-activation read | string (digits + dashes) | ALIVE (form cache) |
| `organizations.business_number` | Auto-activation ensure (code 생성에 사용) | varchar(20) | ALIVE (canonical) |
| `kpa_pharmacy_requests.business_number` | PharmacyApprovalGate 신청 | varchar | ALIVE (manual path) |
| `glycopharm_pharmacies.business_number` | GlycoPharm | varchar(20), unique, indexed | ALIVE |
| `cosmetics_stores.business_number` | Cosmetics | varchar(100), unique | ALIVE |
| `neture_suppliers.business_number` | Neture supplier | varchar(50), nullable, indexed | ALIVE |
| `neture_partners.business_number` | Neture partner | varchar(50), nullable, indexed | ALIVE |
| (`kpa_members.business_number` **없음**) | — | — | **부재** |

**Sync 방향**: form → users.businessInfo + (auto-activation 시) organizations. 그 후 sync 없음 → 사용자가 businessInfo 수정 시 organizations stale.

**Dedup key**: `organizations.code = kpa-pharm-{businessNumber digits}` (자연 key).

### 5-2. Address drift (8 곳)

| 저장 위치 | 구조 | StoreAddress 표준 | 상태 |
|---|---|:---:|---|
| `users.businessInfo.storeAddress` | StoreAddress type | ✅ (type 적용) | type 정의됨, 실제 사용 미확인 |
| `users.businessInfo.address` (+`address2`) | legacy varchar | ❌ | 레거시 |
| `organizations.address` | legacy varchar | ❌ | 레거시 (backfill source) |
| `organizations.address_detail` | jsonb StoreAddress | ✅ | **표준** (migration 적용) |
| `glycopharm_pharmacies.address_detail` | jsonb StoreAddress | ✅ | 표준 |
| `cosmetics_stores.address_detail` | jsonb StoreAddress | ✅ | 표준 |
| `kpa_members.pharmacy_address` | varchar(300) | ❌ denormalized | **drift** |
| `neture_partners.address` | jsonb (zipCode/address1/address2/city/province/country) | ❌ 자체 구조 | drift (글로벌 호환 의도?) |
| `neture_suppliers.*` | **address 컬럼 자체 없음** | — | 부재 |

**Frontend 입력 구조 5 종**:

| Frontend | 입력 구조 | API → DB |
|---|---|---|
| RegisterModal | single free-text `pharmacyAddress` | → `users.businessInfo.address` (legacy varchar) |
| EditUserModal | 3-part `zipCode`/`address1`/`address2` (AddressSearch component) | → `users.businessInfo` 의 zipCode/address1/address2 |
| MyProfilePage | read-only display from `businessInfo.storeAddress` (zipCode + baseAddress + detailAddress) | — |
| PharmacyApprovalGatePage | **주소 미수집** ⚠️ | — |
| PharmacyInfoPage | 3-part `zipCode`/`baseAddress`/`detailAddress` (`addressDetail` 객체) | → `organizations.address_detail` jsonb |

### 5-3. Tax Invoice Email drift (5 곳)

> 🚨 본 IR 의 최우선 정비 후보

| 저장 위치 | 사용 흐름 | Format | 상태 |
|---|---|---|---|
| `users.businessInfo.email` **overwrite** | RegisterModal `taxEmail` → [auth-register.controller.ts:124](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L124) | varchar | ⚠️ **의미 충돌** ("대표 이메일" 과 동일 필드) |
| `users.businessInfo.metadata.taxEmail` | RegisterModal KPA pharmacy_owner 신청 metadata [L561](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L561) | jsonb free field | drift |
| `kpa_pharmacy_requests.tax_invoice_email` | PharmacyApprovalGate POST | varchar(100) | ALIVE (manual path) |
| `organizations.metadata.taxInvoiceEmail` | PharmacyInfoPage PUT [pharmacy-info.controller.ts:219](apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts#L219) | jsonb metadata key | ALIVE (de-facto canonical for KPA store) |
| `neture_suppliers.tax_email` | Neture supplier management | varchar(255) | ALIVE (Neture-local) |
| `users.businessInfo.taxInvoiceEmail` | (type 외 free field) | — | type 정의 없음 |

**Frontend 수집 위치 4 곳**: RegisterModal / EditUserModal / PharmacyApprovalGatePage (**required**) / PharmacyInfoPage. MyProfilePage 는 read-only.

**결정 필요**: 어디가 canonical home 인가? (§4-4 참조)

### 5-4. 담당자명 / 담당자 전화번호 drift

| 저장 위치 | 사용 흐름 | 상태 |
|---|---|---|
| `neture_suppliers.manager_name` / `manager_phone` | Neture supplier | ALIVE (Neture-local) |
| `Supplier.contact_person` / `contact_phone` | (legacy stub) | DEPRECATED |
| `neture_partners.contact` (jsonb) | Neture partner — name/email/phone/position 묶음 | ALIVE |
| (다른 entity 모두 부재) | — | **canonical home 없음** |

KPA pharmacy 흐름 (PharmacyApprovalGate / PharmacyInfo) 은 `ownerPhone` (개설자 전화) 만 수집, 별도 "담당자" 개념 없음.

### 5-5. Representative Name (대표자명) 이중 표기 drift

| 저장 위치 | 사용 흐름 | Type 정의 | 상태 |
|---|---|---|---|
| `BusinessInfo.ceoName` | (type 의 canonical 필드) | ✅ typed | **코드에서 사용 안 함** |
| `users.businessInfo.representativeName` | RegisterModal [auth-register:127](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L127), [L215](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L215), [L500](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L500) | ❌ type 외 free field | ALIVE (de-facto) |
| `users.businessInfo.metadata.representativeName` | KPA pharmacy_owner 신청 metadata [L559](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L559) | jsonb free | ALIVE |
| `neture_suppliers.representative_name` | Neture supplier | typed varchar(100) | ALIVE (Neture-local) |
| `kpa_members` / `organizations` | — | — | **부재** |

→ **같은 데이터를 `ceoName` (canonical type), `representativeName` (실제 코드), `representative_name` (Neture column) 3 가지 표기로**. canonical key 결정 + drift 정리 필요.

### 5-6. Pharmacy/Store Owner 역할 Layer 불명

| 문서 | 정의 | Layer |
|---|---|---|
| USER-STRUCTURE-V1 (pending) | `pharmacy_owner` = sub-role within `pharmacist_member` Membership Group | User 분류 |
| O4O-ORGANIZATION-ROLE-STANDARD-V1 | `pharmacy_owner` = Layer A Role 예시 | RBAC |
| RBAC-ROLE-CATALOG-V1 | `pharmacy_owner` **미등록** | — |
| 실제 코드 | `role_assignments.role = 'kpa:store_owner'` (service-prefix) | RBAC (Layer A) |
| `kpa_members.activity_type = 'pharmacy_owner'` | User 분류 (직역) | Profile |

→ `activity_type` (직역) 과 `role_assignments` (권한) 가 사실상 분리되어 있으나 **doc 간 표기 불일치**. canonical 정렬 시 명시 필요.

---

## 6. 입력 흐름 비교표 (Frontend × Backend)

### 6-1. Frontend 필드 매핑

| Frontend / Backend | Addr | Tax Invoice Email | Contact Name | Contact Phone | Business Number | 대표자명 |
|---|---|---|---|---|---|---|
| **F1 RegisterModal** (POST /auth/register) | free-text `pharmacyAddress` | `taxEmail` → `businessInfo.email` overwrite | `representativeName` (대표자명) | `pharmacyPhone` (약국 전화, optional) + `phone` (개인) | `businessNumber` (pharmacy_owner 조건부 required) | `representativeName` (canonical 표기 불일치) |
| **F2 MyProfilePage** (read-only) | 3-part `storeAddress` (zipCode+baseAddress+detailAddress) | read-only | — | `ownerPhone` display | read-only | — |
| **F3 EditUserModal** (PUT /operator/members/{id}) | 3-part `zipCode`/`address1`/`address2` (AddressSearch) | `taxEmail` (optional) | **none** | `phone` (사용자 개인) | `businessNumber` (optional) | **none** |
| **F4 PharmacyApprovalGatePage** (POST /pharmacy-requests) | **수집 안 함** ⚠️ | `taxInvoiceEmail` (**required**) | **none** | `ownerPhone` + `pharmacyPhone` (both required) | `businessRegistrationNumber` (required) | **none** |
| **F5 PharmacyInfoPage** (PUT /pharmacy/info) | 3-part `zipCode`/`baseAddress`/`detailAddress` (`addressDetail` 객체) | `taxInvoiceEmail` (optional) | **none** | `ownerPhone` + `phone` (both optional) | read-only | **none** |
| **F6 GlycoPharm RegisterPage** | (미상세 — 후속 IR) | (미상세) | (미상세) | (미상세) | (미상세) | (미상세) |
| **F7 K-Cosmetics RegisterPage** | (미상세 — 후속 IR) | (미상세) | (미상세) | (미상세) | (미상세) | (미상세) |
| **F? Admin business form** | **부재** | — | — | — | — | — |

### 6-2. Backend → DB 저장 매핑 (KPA 흐름)

```
F1 RegisterModal POST /auth/register
  payload: { businessNumber, pharmacyName, pharmacyAddress, representativeName, taxEmail, pharmacyPhone, licenseNumber, activityType, ... }
  ↓
  auth-register.controller:
    - businessInfo = { businessName: pharmacyName, businessNumber, address: pharmacyAddress, representativeName (type 외!), email: taxEmail (overwrite!), ... }
    - KPA pharmacy_owner: metadata = { representativeName, taxEmail, licenseNumber, ... }
  ↓
  users.businessInfo (jsonb)

F3 EditUserModal PUT /operator/members/{userId}
  payload: { businessName, businessNumber, zipCode, address1, address2, taxEmail, businessType, businessCategory, phone, firstName, lastName, ... }
  ↓
  users.businessInfo (jsonb) UPDATE

F4 PharmacyApprovalGate POST /pharmacy-requests
  payload: { pharmacyName, businessNumber, pharmacyPhone, ownerPhone, taxInvoiceEmail }
  ↓
  kpa_pharmacy_requests (typed columns: pharmacy_name, business_number, pharmacy_phone, owner_phone, tax_invoice_email)

F5 PharmacyInfoPage PUT /pharmacy/info
  payload: { name, phone, addressDetail: { zipCode, baseAddress, detailAddress }, taxInvoiceEmail, ownerPhone }
  ↓
  organizations: name, phone, address_detail (jsonb)
  organizations.metadata: { taxInvoiceEmail, ownerPhone }

Auto-activation (운영자 회원 승인 시):
  users.businessInfo READ → organizations ENSURE (code=kpa-pharm-{bizno})
                          → organization_members(owner)
                          → role_assignments(kpa:store_owner)
  [⚠️ users.businessInfo → organizations 단방향, write-back 없음]
```

---

## 7. Activation Prerequisite 정리

### 7-1. Auto path (운영자 회원 승인)

**파일**: [member.controller.ts:550-614](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L550-L614)

**Trigger**: `PATCH /kpa/members/:id/status` with `oldStatus='pending'` → `newStatus='active'` AND `member.activity_type='pharmacy_owner'`

**필수 prerequisite fields**:
- `users.businessInfo.businessNumber` (digits 추출 후 사용)
- `users.businessInfo.businessName` OR `kpa_members.pharmacy_name` (둘 중 하나)

**누락 시 동작**: graceful skip + warn log. 운영자에게 알림 없음. 사용자는 fallback 으로 manual pharmacy_request 진행.

**Side effects (성공 시)**:
1. `organizations` ensure (code=`kpa-pharm-{bizno digits}`, type='pharmacy', name=pharmacy_name)
2. `kpa_members.organization_id` ← org.id (단, null 일 때만 — 기존 branchAssignment 보호)
3. `organization_members(organization_id, user_id, role='owner', is_primary=false)` ← idempotent INSERT
4. `role_assignments(user_id, role='kpa:store_owner', is_active=true)` ← upsert
5. **`users.businessInfo` 로 write-back 없음** (단방향)

### 7-2. Manual path (사용자 → 운영자 승인)

**파일**: [pharmacy-request.controller.ts:169-251](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L169-L251)

**Trigger**: `PATCH /pharmacy-request/:id/approve`

**필수 prerequisite fields** (사용자 신청 시):
- `kpa_pharmacy_requests.pharmacy_name` (POST 시 required)
- `kpa_pharmacy_requests.business_number` (POST 시 required, digits 추출)

**Side effects**: Path A 와 동일 — organizations ensure + organization_members + role_assignments + 추가로 `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` upsert.

### 7-3. Frontend → Backend prerequisite 매핑

| Frontend 입력 | Backend 필수 (auto path) | Backend 필수 (manual path) |
|---|---|---|
| RegisterModal (pharmacy_owner 선택 시 `businessNumber`/`representativeName` 입력) | ✅ businessNumber + (businessName OR pharmacy_name) | — |
| EditUserModal (operator 가 누락 필드 보완) | 보완 후 활성화 가능 | — |
| PharmacyApprovalGate (사용자 직접 신청) | — | ✅ pharmacy_name + business_number |
| MyProfilePage (read-only) | 영향 없음 | 영향 없음 |
| PharmacyInfoPage (사후 수정) | 영향 없음 — 이미 활성화 후 | 영향 없음 |

**Activation Gap**: RegisterModal 에서 `pharmacy_owner` 선택 + businessNumber 누락 시 → kpa_members 생성되나 auto-activation 불가 → 사용자가 PharmacyApprovalGate 로 manual 진행 필요. UX silent fallback.

---

## 8. Service-level 비교

| 영역 | KPA | GlycoPharm | K-Cosmetics | Neture |
|---|---|---|---|---|
| Signup form | RegisterModal (modal) | RegisterPage (별도) | RegisterPage (별도) | (operator-측 supplier-management) |
| Business entity | `organizations` (type='pharmacy', via kpa_organizations sync) + `kpa_members.pharmacy_*` | `glycopharm_pharmacies` (organization_id FK) | `cosmetics_stores` (organization_id FK) | `neture_suppliers` + `neture_partners` (organization 미연결) |
| Address 표준 | ⚠️ kpa_members.pharmacy_address 는 varchar / organizations.address_detail 는 jsonb | ✅ address_detail jsonb | ✅ address_detail jsonb | ❌ neture_partners 자체 6-field jsonb / neture_suppliers 부재 |
| Business number | `kpa_pharmacy_requests.business_number` + `users.businessInfo.businessNumber` + `organizations.business_number` | `glycopharm_pharmacies.business_number` (unique) | `cosmetics_stores.business_number` (unique) | `neture_suppliers.business_number` + `neture_partners.business_number` |
| Owner / contact | `organization_members(role='owner')` | `glycopharm_pharmacies.owner_name` | `cosmetics_stores.owner_name` | `neture_suppliers.representative_name` |
| Tax invoice | `kpa_pharmacy_requests.tax_invoice_email` + `organizations.metadata.taxInvoiceEmail` + `users.businessInfo.email` overwrite | (미확인 — 후속) | (미확인 — 후속) | `neture_suppliers.tax_email` |
| Manager info | (부재) | (부재) | (부재) | `neture_suppliers.manager_name` + `manager_phone` |
| Activation path | Auto + Manual (member.controller + pharmacy-request.controller) | (자체 approval — 후속 조사) | (자체 approval — 후속 조사) | Supplier status (PENDING/ACTIVE/REJECTED) — operator-측 처리 |
| User-Org 연결 | `organization_members` (Layer B) | `organization_members` (Layer B) + glycopharm.owner_name | `organization_members` (Layer B) + cosmetics.owner_name | `neture_partners.user_id` (non-enforced) — Layer B 미연결 |
| **alive / dead** | ALIVE — 이중 흐름 (auto + manual) | ALIVE | ALIVE | ALIVE — 단 organizations 통합 미실행 |

**서비스별 drift 핵심**:
- **KPA**: `kpa_pharmacy_requests` 와 `users.businessInfo` 와 `organizations.metadata` 가 동일 데이터를 다른 곳에 저장
- **GlycoPharm / K-Cosmetics**: `organizations` 통합 일부 적용 (organization_id FK) — 본 IR 정비의 모범 사례
- **Neture**: 가장 큰 transitional — `WO-O4O-NETURE-ORG-DATA-MODEL-V1` 미실행으로 `organizations` 와 별도 system

---

## 9. 위험 매트릭스

| # | 위험 항목 | 영향 범위 | 심각도 | 사유 |
|---|---|---|:---:|---|
| 1 | `taxEmail` → `businessInfo.email` overwrite | 모든 KPA pharmacy_owner 신규 가입자 | 🔴 **HIGH** | 대표 이메일과 세금계산서 이메일 의미 혼재. 추후 분리 시 어떤 게 무엇이었는지 구분 불가 |
| 2 | `representativeName` type 외 free field 저장 | 모든 신규 사업자 가입자 | 🟠 MID | type-code drift. type 변경 또는 jsonb 정리 시 데이터 손실 위험 |
| 3 | businessInfo → organizations 단방향 sync | 모든 활성화된 store_owner | 🟠 MID | 사용자가 MyProfile 에서 businessInfo 수정 시 organizations stale. 세금계산서 발행 등에서 잘못된 정보 |
| 4 | PharmacyApprovalGate 주소 미수집 | manual path 사용자 | 🟡 LOW-MID | 활성화 자체는 가능하나 organizations.address 미설정 → PharmacyInfoPage 에서 별도 입력 필요 |
| 5 | `kpa_pharmacy_requests` ↔ `organizations.metadata` ↔ `users.businessInfo` 3 곳 저장 | 모든 KPA 매장 | 🟠 MID | 진실 단일 출처 없음. 데이터 불일치 시 어느 게 정답인지 결정 규칙 부재 |
| 6 | `kpa_members.pharmacy_address` varchar denormalized | 모든 KPA 약사 회원 | 🟡 LOW | `organizations.address_detail` 표준 미적용. 약국 주소가 두 곳에 다른 형식으로 저장 |
| 7 | Neture supplier 통합 design only | 모든 Neture 공급자 | 🟠 MID | `organizations` 외부에 독립 system 잔존. cross-service business 정보 조회 불가 |
| 8 | `pharmacy_owner` role layer 정의 불명 | doc → code 정합성 | 🟡 LOW | 문서 간 표기 불일치. 신규 직역 도입 시 정책 결정 모호 |
| 9 | `kpa_organizations` legacy 잔존 | KPA 약사회 hierarchical org | 🟡 LOW | `organizations` 로 sync 중. 완전 제거 전까지 dual maintenance |
| 10 | `BusinessInfo` type 중복 정의 (user.ts + auth.ts) | type 변경 시 | 🟡 LOW | 한쪽만 수정 시 silent drift |
| 11 | Admin 사업자 form 미존재 | 운영 절차 | 🟡 LOW | EditUserModal 만으로 처리 → operator 가 모든 사업자 등록 사후 보완. 관리 부담 |
| 12 | GlycoPharm/K-Cosmetics signup 미상세 조사 | 본 IR 범위 외 | 🟡 LOW | 별도 IR 후속 필요 |

---

## 10. SSOT 정렬 정책 제안

### 10-1. 사업체 데이터 (Business Entity)

**Canonical 선언**:
- **SSOT = `organizations`**
- `users.businessInfo` = personal-side input cache (write 시 organizations 로 sync 필수)
- `glycopharm_pharmacies` / `cosmetics_stores` = service-specific extension (organization_id FK 통해 organizations 와 연결, 중복 컬럼 deprecate)
- `kpa_members.pharmacy_*` = denormalized cache, organizations.* 가 진실
- `neture_suppliers` = `WO-O4O-NETURE-ORG-DATA-MODEL-V1` 실행 후 organization_id 통합

### 10-2. Address 데이터

**Canonical 선언**:
- **`StoreAddress` (zipCode/baseAddress/detailAddress/region)** = canonical type
- 저장: `organizations.address_detail` (jsonb)
- `users.businessInfo.storeAddress` 활용 (legacy `address`/`address2` deprecate)
- `kpa_members.pharmacy_address` (varchar) deprecate → `kpa_members.organization_id` 만 유지, 주소는 organizations 에서 조회
- `neture_partners.address` (자체 6-field) → StoreAddress 로 migration

### 10-3. Tax Invoice Email 데이터

**Canonical 선언 제안** (정책 결정 필요):
- **Option B 권장**: `organizations.tax_invoice_email` 컬럼 신설 (varchar 255, nullable)
- 다른 위치 deprecate:
  - `users.businessInfo.email` 의 의미 복원 (대표 이메일만, taxEmail overwrite 금지)
  - `users.businessInfo.metadata.taxEmail` 제거 (organizations 로 sync)
  - `kpa_pharmacy_requests.tax_invoice_email` 유지 (신청 시점 데이터, 승인 후 organizations 로 sync)
  - `organizations.metadata.taxInvoiceEmail` (현재 jsonb) → 새 typed column 으로 마이그레이션
  - `neture_suppliers.tax_email` → organizations 통합 시 정리

### 10-4. 담당자 (Manager) 정보

**Canonical 선언 제안**:
- **`organizations.manager_name` + `organizations.manager_phone` 컬럼 신설** (varchar 100/50)
- Neture supplier 의 `manager_name`/`manager_phone` 을 organizations 로 sync
- KPA pharmacy / GlycoPharm / Cosmetics 의 frontend 입력 흐름에도 담당자 필드 추가

### 10-5. 대표자명 (Representative)

**Canonical 선언**:
- **`BusinessInfo.ceoName`** (canonical type 필드) — 단일 키
- 코드의 `representativeName` 표기를 모두 `ceoName` 으로 통일
- jsonb 의 free field `representativeName` 제거 (migration 으로 ceoName 으로 이전)
- Neture `representative_name` 도 `ceoName` 으로 정렬 가능 (또는 organizations 의 새 표준 컬럼 신설)

### 10-6. 사업자 정보 수정 책임 위치

| 사용자 자격 | 수정 가능 영역 | 위치 |
|---|---|---|
| 본인 (User) | `users.businessInfo` (개인 입력 cache) | MyProfilePage (현재 read-only — **edit 추가 검토**) |
| 매장 owner (organization_member.role='owner') | `organizations.{address, phone, address_detail, tax_invoice_email, manager_*}` | PharmacyInfoPage (현재 부분 지원) |
| Operator | 둘 다 + role 변경 | EditUserModal (현재) + 새로운 admin business form (별도 WO) |

**핵심 원칙**: 사용자가 자신의 사업자 정보를 수정하면 자동으로 `organizations` 로 sync. operator 수정도 마찬가지. **single write path** 강제.

### 10-7. Activation Prerequisite 정의

**최소 필수 prerequisite** (auto-activation 동작):
- `users.businessInfo.businessNumber` (10 digits)
- `users.businessInfo.businessName` OR `kpa_members.pharmacy_name`
- `users.businessInfo.ceoName` (대표자명) — **권장 추가** (현재 미체크)
- `users.businessInfo.storeAddress.baseAddress` — **권장 추가** (현재 미체크, organizations.address 빈 채로 활성화)
- `users.businessInfo.email` (대표 이메일) 또는 새 `tax_invoice_email` — **권장 추가**

→ Auto-activation 가드 강화. 누락 시 graceful skip 이 아니라 **operator UI 에 명시적 경고** 표시.

---

## 11. 마이그레이션 순서 권장 (후속 WO 의 기준)

> **본 IR 은 조사만. 아래 WO 작성 / 실행 / migration 작성 / UI 수정 / contract 변경 금지** (사용자 명시).

```
[Phase 0] (본 IR 단계 — 완료)
  IR 작성 + SSOT 정렬 정책 합의

[Phase 1] schema preparation
  WO-1: organizations 표준 컬럼 신설
    - tax_invoice_email (varchar 255 nullable)
    - manager_name (varchar 100 nullable)
    - manager_phone (varchar 50 nullable)
    - migration (1건, additive only)

  WO-2: BusinessInfo type 정리
    - ceoName 표기 통일 (representativeName 제거)
    - taxEmail/taxInvoiceEmail 명시 필드 추가 (또는 별도 organizations 로 옮기는 결정)
    - dual definition (user.ts + auth.ts) 제거 (single source)

[Phase 2] sync 보완
  WO-3: businessInfo → organizations bidirectional sync
    - users.businessInfo write 시 organizations 도 update
    - 또는 frontend 가 organizations 직접 호출하는 패턴으로 통일

  WO-4: kpa_pharmacy_requests / organizations.metadata.taxInvoiceEmail → 새 organizations.tax_invoice_email 컬럼으로 backfill

[Phase 3] frontend 입력 흐름 정렬
  WO-5: 5 개 frontend 흐름의 입력 구조 통일
    - RegisterModal: free-text 주소 → StoreAddress (zipCode/baseAddress/detailAddress)
    - PharmacyApprovalGate: 주소 필드 추가
    - EditUserModal: 담당자명/담당자전화 필드 추가
    - PharmacyInfoPage: 담당자 입력 영역 추가
    - MyProfilePage: 사업자 정보 편집 모드 추가 (또는 read-only 유지 정책 결정)

  WO-6: GlycoPharm / K-Cosmetics RegisterPage 정렬 (별도 IR 후 결정)

[Phase 4] legacy 정리
  WO-7: kpa_members.pharmacy_address (varchar) deprecate
    - organizations.address_detail 로 통일, kpa_members 의 컬럼은 read-only 유지 후 차후 제거

  WO-8: kpa_organizations → organizations 완전 통합
    - sync 종료, kpa_organizations 제거

  WO-9: Neture supplier 통합 (WO-O4O-NETURE-ORG-DATA-MODEL-V1 실행)
    - neture_suppliers.organization_id FK 추가
    - organizations 와 양방향 sync

[Phase 5] 활성화 강화
  WO-10: Auto-activation prerequisite 강화
    - operator 에게 누락 필드 명시 경고
    - prerequisite 미충족 시 organizations.metadata.activation_skip_reason 기록
```

각 WO 는 **shared package interface 유지 + bidirectional sync 보장** 원칙. 단일 WO 가 schema + UI + sync + activation 을 동시 수정하지 말 것.

---

## 12. 본 IR 범위 외 (후속 별도 IR 권장)

1. **GlycoPharm RegisterPage 상세** — 입력 필드 / submit endpoint / business entity 매핑
2. **K-Cosmetics RegisterPage 상세** — 동일
3. **Neture supplier signup frontend 흐름** — supplier-management 외 사용자가 직접 신청하는 흐름이 있는지
4. **GlycoPharm/K-Cosmetics 의 storefront_config jsonb 구조 정렬** — 3 가지 (KPA 1 field / GlycoPharm 3 fields / generic 미상) 통일
5. **`activity_type` (직역) 과 `role_assignments` 의 표기 정합성** — pharmacy_owner / kpa:store_owner / employed_pharmacist / pharmacy_employee 등 매핑표
6. **Admin business form 신설 필요성 판단** — 현재 EditUserModal 만으로 처리 시 운영 비용 vs 신설 비용
7. **`organizations.metadata` jsonb 구조 표준화** — 현재 taxInvoiceEmail / ownerPhone / serviceKey / cosmeticsStoreId 등 service-별 free key
8. **kpa_member_services vs service_memberships 동기화 계약**

---

## 13. 참조

### Backend Entities (10 개)
- [User.ts](apps/api-server/src/modules/auth/entities/User.ts) — `users` table
- [organization-store.entity.ts](apps/api-server/src/modules/store-core/entities/organization-store.entity.ts) — `organizations` table (canonical)
- [kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts) — `kpa_members`
- [kpa-pharmacy-request.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts) — `kpa_pharmacy_requests`
- [glycopharm-pharmacy.entity.ts](apps/api-server/src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts) — `glycopharm_pharmacies`
- [cosmetics-store.entity.ts](apps/api-server/src/routes/cosmetics/entities/cosmetics-store.entity.ts) — `cosmetics_stores`
- [NetureSupplier.entity.ts](apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts) — `neture_suppliers`
- [neture-partner.entity.ts](apps/api-server/src/routes/neture/entities/neture-partner.entity.ts) — `neture_partners`
- [Supplier.ts](apps/api-server/src/entities/Supplier.ts) — `suppliers` (DEPRECATED stub)
- [ServiceMembership.ts](apps/api-server/src/modules/auth/entities/ServiceMembership.ts) / [RoleAssignment.ts](apps/api-server/src/modules/auth/entities/RoleAssignment.ts)

### Types
- [BusinessInfo type](apps/api-server/src/types/user.ts)
- [StoreAddress type](apps/api-server/src/types/store-address.ts)

### Backend Controllers (활성화 / 사업자 데이터 처리)
- [member.controller.ts:550-614](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L550-L614) — Auto-activation
- [pharmacy-request.controller.ts:169-251](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L169-L251) — Manual activation
- [auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) — 회원가입 POST
- [pharmacy-info.controller.ts](apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts) — PharmacyInfo PUT
- [organization-ops.service.ts:58-92](apps/api-server/src/modules/organization/services/organization-ops.service.ts#L58-L92) — `ensureOrganization`

### Frontend Flows (KPA)
- [RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx)
- [MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx)
- [EditUserModal.tsx](services/web-kpa-society/src/pages/operator/EditUserModal.tsx)
- [PharmacyApprovalGatePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx)
- [PharmacyInfoPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyInfoPage.tsx)

### Frontend Flows (Other services)
- [GlycoPharm RegisterPage.tsx](services/web-glycopharm/src/pages/auth/RegisterPage.tsx)
- [K-Cosmetics RegisterPage.tsx](services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx)

### Migrations (key)
- `1700000000000-CreateUsersTable` — `users.businessInfo` json 추가
- `20260206190000-CreateKpaFoundationTables` — `kpa_organizations` + `kpa_members`
- `20260219000005-CreateKpaPharmacyRequests` — `kpa_pharmacy_requests`
- `20260224100000-CreateRoleAssignmentsTable` — RBAC SSOT
- `1771200000010-CreateServiceMemberships` — Service Membership SSOT
- `1771200000019-AddSupplierBusinessProfileFields` — `neture_suppliers` business profile 필드
- `20260318200000-AddStructuredAddress` — `address_detail` jsonb (organizations/glycopharm/cosmetics)
- `20260411100000-BackfillKpaOrgsToOrganizations` — kpa_organizations → organizations sync
- `20261002000000-BackfillServiceMembershipsActiveFromKpaMembers` — sm.status drift fix

### 연관 IR
- [IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1](docs/investigations/IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1.md) — 자동 활성화 흐름 상세
- [IR-O4O-BUSINESS-CORE-AUDIT-PHASE1-V1](docs/investigations/IR-O4O-BUSINESS-CORE-AUDIT-PHASE1-V1.md) — dual organization fragmentation

### Canonical / Governance docs
- [USER-DOMAIN-SSOT-V1](docs/baseline/USER-DOMAIN-SSOT-V1.md) (Frozen 2026-03-16)
- [O4O-ORGANIZATION-ROLE-STANDARD-V1](docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md) (★ organizations = business SSOT)
- [O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1](docs/architecture/O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md)
- [USER-OPERATOR-FREEZE-V1](docs/architecture/USER-OPERATOR-FREEZE-V1.md) (Frozen F11)
- [O4O-CORE-FREEZE-V1](docs/architecture/O4O-CORE-FREEZE-V1.md) (Frozen F10)
- [RBAC-FREEZE-DECLARATION-V1](docs/rbac/RBAC-FREEZE-DECLARATION-V1.md) (Frozen F9)
- [WO-O4O-NETURE-ORG-DATA-MODEL-V1](docs/work-orders/WO-O4O-NETURE-ORG-DATA-MODEL-V1.md) (Design only, 미실행)

---

*조사 전용 — DB schema 변경 / migration / UI / backend contract 수정 없음. 본 IR 단계에서 후속 WO 작성 금지.*
