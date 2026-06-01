# IR-O4O-BUSINESS-INFO-CANONICAL-PLATFORM-INTEGRATION-V1

> 플랫폼 전체 사업자 정보 SSOT 구조 조사
>
> 조사 일자: 2026-05-26
> 상태: COMPLETE
> 코드 수정 없음

---

## 1. 조사 목적

```
사업자 정보의 SSOT(Source of Truth)를 어디에 둘 것인가?
```

O4O 플랫폼 5개 서비스(Neture, KPA, GlycoPharm, K-Cosmetics, GlucoseView)에 걸쳐 사업자 정보가 어떻게 저장되고 이동하는지를 코드 기준으로 확인하고, Canonical SSOT 구조를 확정한다.

---

## 2. 현재 저장 구조 — 실제 코드 기준

### 2.1 business_info 독립 엔티티: **없음**

조사 결과, O4O 플랫폼에 `business_info`라는 독립 테이블/엔티티는 **존재하지 않는다.**

모든 사업자 정보는 아래 5개 저장소에 분산 저장된다.

---

### 2.2 저장소별 실제 역할

#### users.businessInfo (JSONB)

| 항목 | 내용 |
|---|---|
| 위치 | `users."businessInfo"` JSONB 컬럼 |
| 쓰기 시점 | 가입 시 1회 (`auth-register.controller.ts`) + 프로필 PATCH |
| 읽기 파일 | operator-registration.service, supplier.service (prefill), kpa member.controller, auth-account.controller |
| 역할 | **가입 시점 스냅샷** — 서비스 가입 원본 입력값 보존 |
| 역동기화 | **없음** — 이후 서비스 테이블 수정이 businessInfo에 반영되지 않음 |

**현재 Canonical 필드 (WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1 완료):**
```
businessName, businessNumber, businessType, businessItem,
representativeName, taxInvoiceEmail, managerPhone, contactName,
businessAddress, businessAddressDetail, zipCode,
phone, email, website, storeAddress, telecomLicense, metadata
```

**Legacy 필드 (read-fallback만, 백필 완료):**
```
ceoName → representativeName
address / address2 → businessAddress / businessAddressDetail
businessCategory → businessItem
```

---

#### organizations

| 항목 | 내용 |
|---|---|
| 테이블 | `organizations` |
| 엔티티 | `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts` |
| 역할 | **조직 계층 구조 + 사업자 공통 정보 SSOT (Phase 5-B 확정)** |

**사업자 관련 컬럼:**
```
name            VARCHAR(255)    — 상호명
business_number VARCHAR(20)     — 사업자등록번호
address         VARCHAR(500)    — 사업장 주소
address_detail  JSONB           — 구조화 주소 { zipCode, baseAddress, detailAddress }
phone           VARCHAR(50)     — 대표 전화번호
metadata        JSONB           — 확장 정보 (taxInvoiceEmail 등 일부 서비스에서 사용)
```

**서비스별 사용:**
- Neture: `neture_suppliers.organization_id` → organizations (Phase 5-B: business_number, address → org only)
- KPA: `kpa_members.organization_id` → organizations (계층형, type='branch'/'pharmacy')
- GlycoPharm: 승인 시 organization_store 생성 (type='pharmacy')
- K-Cosmetics: `cosmetics_stores.organization_id` → organizations

---

#### physical_stores

| 항목 | 내용 |
|---|---|
| 테이블 | `physical_stores` |
| 엔티티 | `apps/api-server/src/routes/platform/entities/physical-store.entity.ts` |
| 역할 | **cross-service 매장 연계 매핑 테이블** — SSOT 아님 |

**컬럼:**
```
business_number VARCHAR(20) UNIQUE   — 사업자등록번호 (연계 key)
store_name      VARCHAR(255)         — 매장명
region          VARCHAR(100)         — 지역
```

**특징:** 상세 사업자 정보(대표자명, 세금계산서 이메일 등) 미저장. cosmetics_stores, glycopharm_pharmacies를 `business_number` 기준으로 cross-service 연결하는 브릿지 역할.

---

#### neture_suppliers

| 항목 | 내용 |
|---|---|
| 테이블 | `neture_suppliers` |
| 엔티티 | `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` |
| 역할 | **Neture 공급자 운영 확장 정보** |

**사업자 관련 컬럼:**
```
representative_name VARCHAR(100)     — 대표자명 (supplier SSOT)
business_type       VARCHAR(100)     — 업태
business_item       VARCHAR(100)     — 종목
tax_invoice_email   VARCHAR(255)     — 세금계산서 이메일 (supplier SSOT)
manager_name        VARCHAR(100)     — 담당자명
manager_phone       VARCHAR(50)      — 담당자 전화
organization_id     UUID FK          — organizations 연계
```

**org 위임 현황 (Phase 5-B):**
```
organization_id로 READ:   name, business_number, address, address_detail, phone
neture_suppliers에 WRITE: representative_name, tax_invoice_email, business_type, business_item
```

---

#### service_memberships

| 항목 | 내용 |
|---|---|
| 역할 | 서비스 가입 상태 관리 — 사업자 정보 미포함 |
| 컬럼 | service_key, user_id, status, role, operator_notes |

---

### 2.3 서비스별 저장 경로 비교표

| 서비스 | 가입 → 저장 | 승인 → 저장 | 프로필 수정 → SSOT | 비고 |
|---|---|---|---|---|
| **Neture 공급자** | users.businessInfo | neture_suppliers (1회 복사) + organizations (생성) | organizations (business_number, address) + neture_suppliers (대표자, 세금계산서) | Phase 5-B 완료 |
| **KPA 약사** | users.businessInfo + kpa_members (자동) | kpa_members 활성화 | kpa_pharmacist_profiles (SSOT) + users.businessInfo (merge) | 2-track SSOT |
| **KPA 약국 (개설약사)** | users.businessInfo + kpa_pharmacy_requests | organizations (type='pharmacy') 생성 | organizations (SSOT) | organizations 완전 위임 |
| **GlycoPharm** | users.businessInfo + glycopharm_applications.metadata | organizations + glycopharm_pharmacy_extension | organizations (SSOT) | **org 링크 누락 이슈** |
| **K-Cosmetics** | users.businessInfo + cosmetics_store_applications | organizations + cosmetics_stores | organizations (SSOT) + cosmetics_stores (이중화) | **business_number 이중화 이슈** |

---

## 3. Drift 분석 — 중복 저장 현황

### 3.1 business_number (심각도: 🔴)

| 테이블 | 컬럼명 | 역할 |
|---|---|---|
| organizations | `business_number` | **SSOT** (Neture, KPA, Cosmetics) |
| neture_suppliers | `business_number` | org 위임 후 직접 쓰기 금지 |
| glycopharm_pharmacies | `business_number` | **독립 저장** (org 미링크) |
| cosmetics_stores | `businessNumber` | org 링크 있으나 **자체 unique 제약도 유지** |
| physical_stores | `business_number` | cross-service 매핑 key (정규화됨) |
| kpa_pharmacy_requests | `business_number` | 신청 단계 임시 저장 |
| users.businessInfo | `businessNumber` | 가입 스냅샷 |

**문제:** glycopharm_pharmacies는 organizations와 별도로 business_number 관리 → 일관성 위험

### 3.2 representativeName (심각도: 🟡)

| 테이블 | 컬럼명 | SSOT |
|---|---|---|
| neture_suppliers | `representative_name` | Neture SSOT |
| users.businessInfo | `representativeName` | 가입 스냅샷 |
| organizations.metadata | 없음 (일부만 taxInvoiceEmail 저장) | 미반영 |

**문제:** Neture 공급자의 대표자명이 organizations에 반영되지 않음

### 3.3 taxInvoiceEmail (심각도: 🟡)

| 테이블 | 컬럼명 | SSOT |
|---|---|---|
| neture_suppliers | `tax_invoice_email` | Neture SSOT |
| organizations.metadata | 일부 KPA만 저장 | 불완전 |
| users.businessInfo | `taxInvoiceEmail` | 가입 스냅샷 |

**문제:** Neture supplier의 tax_invoice_email이 organizations에 sync되지 않음

### 3.4 businessAddress (심각도: 🟡)

| 테이블 | 컬럼명 | SSOT |
|---|---|---|
| organizations | `address` + `address_detail` | **SSOT** |
| neture_suppliers | `business_address` | 읽기 폴백용 — org 쓰기 우선 |
| glycopharm_pharmacies | `address` | 자체 저장 (org 미링크) |
| cosmetics_stores | `address` | 자체 저장 (이중화) |
| users.businessInfo | `businessAddress` | 가입 스냅샷 |

---

## 4. Lifecycle 분석

### 4.1 Neture 공급자

```
[가입]
RegisterModal
  ↓ POST /auth/register
users.businessInfo ← 저장 (스냅샷)
service_memberships ← status='pending'

[1단계 승인 - 회원 승인]
operator → POST /neture/registrations/{id}/approve
  ↓ approveRegistration()
service_memberships.status = 'active'
users.status = 'active'
role_assignments ← INSERT (neture:supplier)
neture_suppliers ← INSERT (PENDING, 1회 복사: representativeName, businessNumber, businessAddress, taxInvoiceEmail)
organizations ← INSERT (code='neture-{slug}', type='supplier')

[2단계 승인 - 공급 승인]
admin → POST /neture/admin/suppliers/{id}/approve
  ↓
neture_suppliers.status = PENDING → ACTIVE
organizations.isActive = true

[프로필 수정]
PATCH /neture/supplier/profile
  ↓ updateSupplierProfile()
neture_suppliers ← UPDATE (representativeName, taxInvoiceEmail, businessType, businessItem, managerName, managerPhone)
organizations ← UPDATE (business_number, address, address_detail, phone) [Phase 5-B SSOT]
users.businessInfo ← NO SYNC (outdated 유지)
```

### 4.2 KPA 약사 (개설약사)

```
[가입]
KpaRegisterModal
  ↓ POST /auth/register
users.businessInfo ← 저장
kpa_members ← AUTO (status='pending')
kpa_pharmacist_profiles ← AUTO (activity_type)

[프로필 수정]
PATCH /auth/me/profile
  ↓
kpa_pharmacist_profiles ← UPSERT (SSOT: activity_type)
kpa_members ← SYNC (activity_type, pharmacy_name, pharmacy_address)
users.businessInfo ← UPDATE (merge)
  [개설약사 → 다른 직역 전환 시 kpa:store_owner role revoke]

SSOT: kpa_pharmacist_profiles (직역) + organizations (약국 정보)
```

### 4.3 GlycoPharm

```
[가입]
PharmacyOwnerModal
  ↓ POST /auth/register
users.businessInfo ← 저장
glycopharm_applications ← AUTO (metadata: ceoName, address, taxInvoiceEmail...)

[승인]
admin → PATCH /glycopharm/applications/{id}
  ↓
organization_store ← INSERT (name=organizationName, business_number)
glycopharm_pharmacy_extension ← INSERT
organization_service_enrollments ← INSERT
organization_members ← INSERT (owner)
[상품 자동 진열]

SSOT 확정: organizations (but glycopharm_pharmacies도 독립 존재 → drift)
users.businessInfo ← NO SYNC
```

### 4.4 K-Cosmetics

```
[가입]
cosmetics_store_applications ← (storeName, businessNumber, ownerName, contactPhone, address)

[승인]
organizations ← INSERT
cosmetics_stores ← INSERT (organization_id FK + 자체 business_number 유지)

SSOT: organizations 우선, cosmetics_stores 이중화 현존
```

---

## 5. 단방향/양방향 동기화 매트릭스

| 경로 | 방향 | 시점 | 비고 |
|---|---|---|---|
| users.businessInfo → neture_suppliers | 단방향 → | 승인 시 1회 | 이후 역동기화 없음 |
| users.businessInfo → organizations | 단방향 → | 승인 시 1회 (간접) | neture_suppliers 경유 |
| neture_suppliers → organizations | 단방향 → | 프로필 수정 시 | Phase 5-B: org SSOT |
| organizations → users.businessInfo | **없음** | — | 의도된 설계 |
| neture_suppliers → users.businessInfo | **없음** | — | 의도된 설계 |
| users.businessInfo → kpa_members | 단방향 → | 프로필 수정 시 | pharmacy_name/address만 |
| kpa_pharmacist_profiles ↔ kpa_members | 쓰기 → sync | 프로필 수정 | profiles=SSOT, members=denorm |
| users.businessInfo → glycopharm_applications.metadata | 단방향 → | 가입 시 1회 | 임시 스냅샷 |
| glycopharm_applications → organizations | 단방향 → | 승인 시 1회 | |

**핵심 패턴:** users.businessInfo는 항상 단방향 출발점. 역동기화 없음 = **의도된 설계**.

---

## 6. SSOT 권장안 확정

### Option D 채택: Organization 중심 + 서비스 확장 Entity

```
[입력]
users.businessInfo (가입 스냅샷 — 폐지 또는 audit 전용)

        ↓ 승인 시 이관 (1회)

[운영 SSOT]
organizations
  ├─ name (businessName)
  ├─ business_number
  ├─ address / address_detail
  ├─ phone
  └─ metadata (확장 정보)

[서비스 확장 정보]
neture_suppliers
  ├─ representative_name    ← Neture 공급자 SSOT
  ├─ tax_invoice_email      ← Neture 공급자 SSOT
  ├─ business_type / item   ← Neture 공급자 SSOT
  ├─ manager_name / phone
  ├─ contact_* (visibility)
  └─ B2B 조건 (min_order_amount 등)

kpa_pharmacist_profiles
  ├─ activity_type          ← KPA SSOT
  └─ license_number

glycopharm_pharmacies       ← GlycoPharm 고유 정보
cosmetics_stores            ← K-Cosmetics 고유 정보

[cross-service 연계]
physical_stores
  └─ business_number 기반 매핑 (브릿지)
```

**각 저장소의 책임 확정:**

| 저장소 | 책임 | 수정 권한 |
|---|---|---|
| `users.businessInfo` | 가입 시점 스냅샷 — 이후 변경 금지 (audit용) | 가입 시 1회만 |
| `organizations` | 사업자 공통 정보 SSOT (name, business_number, address, phone) | 서비스 운영자/Admin |
| `neture_suppliers` | Neture 공급자 운영 확장 (대표자, 세금계산서, 담당자, B2B, contact) | Neture 공급자 본인 |
| `kpa_pharmacist_profiles` | KPA 약사 직역 SSOT (activity_type) | KPA 약사 본인 + 운영자 |
| `physical_stores` | cross-service 브릿지 (business_number key) | 시스템 자동 |

---

## 7. O4O Philosophy Conflict Check

| 항목 | 현재 구조 | 충돌 여부 |
|---|---|---|
| 책임 중복 | glycopharm_pharmacies ↔ organizations, cosmetics_stores ↔ organizations | 🔴 중복 있음 |
| 매장 중심 구조 | organizations가 Canonical, physical_stores가 cross-service 연계 | ✅ 정합 |
| 1인 운영 유지 | users.businessInfo → 단일 진입점 → 서비스별 확장 | ✅ 정합 |
| 서비스별 확장 | neture_suppliers, kpa_pharmacist_profiles로 확장 분리 | ✅ 정합 |
| 공통화 가능성 | organizations를 중심으로 공통화 가능 | ✅ 방향 올바름 |

---

## 8. 즉시 수정 필요 항목

### [P0] GlycoPharm organizations 미링크
- `glycopharm_pharmacies`에 `organization_id` FK 없음
- business_number가 organizations와 독립적으로 관리됨
- **위험:** cross-service lookup 불가, 일관성 위험

### [P1] K-Cosmetics business_number 이중화
- `cosmetics_stores.businessNumber` + `organizations.business_number` 동시 유지
- SSOT 불명확

### [P2] Neture representativeName/taxInvoiceEmail org 미반영
- neture_suppliers에만 저장, organizations.metadata에 미반영
- **현재 영향:** Neture 내부 조회 시 문제 없음 (supplier SSOT로 운영)
- **미래 위험:** cross-service 조회 시 representative 정보 접근 불가

---

## 9. 후속 WO 제안

### WO-1 (단기): `WO-O4O-GLYCOPHARM-ORG-BRIDGE-V1`
- glycopharm_pharmacies에 organization_id FK 추가
- 승인 시 기존 생성 org와 연결

### WO-2 (단기): `WO-O4O-COSMETICS-STORE-BUSINESS-NUMBER-DEDUP-V1`
- cosmetics_stores.businessNumber를 read-only 또는 제거
- organizations.business_number 단일 SSOT 확립

### WO-3 (중기): `WO-O4O-BUSINESSINFO-SNAPSHOT-FREEZE-V1`
- users.businessInfo를 가입 스냅샷으로 공식 선언 (코드/문서화)
- PATCH /auth/me/profile에서 businessInfo 업데이트 범위 제한
- 서비스별 프로필 수정은 각 서비스 PATCH API로만

### WO-4 (장기): `WO-O4O-NETURE-SUPPLIER-ORG-METADATA-SYNC-V1`
- neture_suppliers의 representativeName, taxInvoiceEmail, businessItem을 organizations.metadata에 mirror
- cross-service 조회 표준화

---

## 10. 결론

| 구분 | 확정 |
|---|---|
| business_info 독립 엔티티 | **없음** |
| users.businessInfo 역할 | **가입 스냅샷** (역동기화 없음 — 의도된 설계) |
| Canonical SSOT | **organizations** (name, business_number, address) |
| 서비스 확장 SSOT | **neture_suppliers** (Neture), **kpa_pharmacist_profiles** (KPA) |
| cross-service 연계 | **physical_stores** (business_number 기반 브릿지) |
| 즉시 해결 필요 | GlycoPharm organizations 미링크 (P0) |
| 권장 Option | **D — Organization 중심 + 서비스 확장 Entity** |

**최종 권고 구조:**

```
users.businessInfo     → 가입 스냅샷 (audit용, 신규 write 점진 축소)
organizations          → 사업자 공통 SSOT (name, business_number, address)
neture_suppliers       → Neture 운영 확장 (대표자, 세금계산서, 담당자, B2B)
kpa_pharmacist_profiles→ KPA 직역 SSOT
physical_stores        → cross-service 브릿지 (business_number key)
glycopharm/cosmetics   → organizations 완전 위임 (WO 후속)
```
