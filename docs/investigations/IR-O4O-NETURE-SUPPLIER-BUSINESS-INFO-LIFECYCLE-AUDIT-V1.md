# IR-O4O-NETURE-SUPPLIER-BUSINESS-INFO-LIFECYCLE-AUDIT-V1

> Neture 공급자 사업자 정보 전체 생애주기 조사
>
> 조사 일자: 2026-05-26
> 상태: COMPLETE

---

## 1. 조사 범위 및 목적

### 1.1 목적

`WO-O4O-NETURE-SUPPLIER-REGISTRATION-BUSINESS-INFO-V1` 완료 후, 가입 화면에서 수집된 사업자 정보가 **어떤 경로로 저장되고, 어떤 화면에서 편집되며, 어떤 시스템이 실제로 읽는지**를 전체 생애주기로 추적한다. 필드명 drift, 데이터 단절, 누락된 이관 로직을 식별하고 후속 WO를 제안한다.

### 1.2 생애주기 단계

```
[가입] → [운영사업자 승인] → [공급자 프로필 편집] → [Admin 조회] → [정산 사용]
RegisterModal  approveRegistration  SupplierProfilePage  AdminSupplierApproval  (미구현)
```

---

## 2. 필드별 생애주기 매트릭스

| 필드(논리명) | RegisterModal 입력명 | users.businessInfo 키 | neture_suppliers 컬럼 | organizations 컬럼 | 편집 가능 화면 | 정산 연동 |
|---|---|---|---|---|---|---|
| 공급자명(상호) | companyName | businessName / companyName | name (slug 기반) | name | SupplierProfilePage(name) | ❌ |
| 대표자명 | representativeName | **ceoName** | representative_name | — | SupplierProfilePage | ❌ |
| 사업자번호 | businessNumber | businessNumber | business_number | business_number (SSOT 예정) | SupplierProfilePage → organizations | ❌ |
| 업종/업태 | — | businessType | — | — | SupplierProfilePage(businessType) | ❌ |
| 사업장 주소 | businessAddress / businessAddressDetail | **address** / address2 | business_address | address (SSOT 예정) | SupplierProfilePage → organizations | ❌ |
| 담당자명 | contactName | contactName | manager_name | — | SupplierProfilePage(managerName) | ❌ |
| 담당자 전화 | contactPhone(→managerPhone) | managerPhone | manager_phone | — | SupplierProfilePage(managerPhone) | ❌ |
| 세금계산서 이메일 | taxInvoiceEmail | **taxInvoiceEmail** | **tax_email** | — | SupplierProfilePage(taxEmail) | ❌ (미구현) |
| 로그인 이메일 | email | — | contact_email | — | — | — |
| 연락처(공개용) | — | — | contact_phone | — | SupplierProfilePage | — |
| 웹사이트 | — | — | contact_website | — | SupplierProfilePage | — |

**범례**: 굵은 글씨 = 필드명 drift 발생 지점

---

## 3. 단계별 현황

### 3.1 가입 단계 (RegisterModal → auth-register.controller)

**RegisterModal** (`services/web-neture/src/components/RegisterModal.tsx`)
```
입력 필드:
  representativeName  ← 대표자명 (신규 추가)
  businessAddress     ← 사업장 주소 (신규 추가)
  businessAddressDetail ← 상세주소 (신규 추가)
  contactName         ← 담당자명 (신규 추가)
  contactPhone        ← 담당자 전화 (신규 추가)
  taxInvoiceEmail     ← 세금계산서 이메일 (신규 추가)

POST /auth/register 전송 (supplier일 때만):
  representativeName, taxInvoiceEmail, contactName
  managerPhone  ← contactPhone 에서 rename
  address1      ← businessAddress 에서 rename
  address2      ← businessAddressDetail
```

**auth-register.controller** (`apps/api-server/src/modules/auth/`)
```
users.businessInfo JSONB 저장 시 변환:
  ceoName         ← representativeName  [drift: ceoName vs representativeName]
  taxInvoiceEmail ← taxInvoiceEmail     [OK, 그대로 유지]
  managerPhone    ← managerPhone        [OK]
  address         ← address1            [drift: address vs businessAddress]
  address2        ← address2            [OK]
  contactName     ← contactName         [OK]
  businessNumber  ← businessNumber      [OK]
  businessName    ← companyName         [OK]
```

**상태**: ✅ 수집 구조는 정상. `ceoName` 키 이름이 외부 표준과 불일치.

---

### 3.2 승인 단계 (approveRegistration)

**operator-registration.service.ts** (`approveRegistration()`)

현재 구현 (WO-V1 적용 후):
```typescript
const representativeName = bizInfo?.ceoName || userRow?.name || null;  // ✅ 수정됨
const businessNumber = bizInfo?.businessNumber || null;                  // ✅ 수정됨
const businessAddress = bizInfo?.address || null;                        // ✅ 수정됨

// INSERT neture_suppliers:
representative_name  ← bizInfo.ceoName
business_number      ← bizInfo.businessNumber
business_address     ← bizInfo.address
tax_email            ← ❌ NULL (누락)  ← 중요 버그
contact_email        ← user.email
```

**발견된 버그:**
- `tax_email` 컬럼이 승인 시 INSERT에서 누락됨
- `bizInfo.taxInvoiceEmail`이 neture_suppliers.tax_email로 이관되지 않음
- 승인 후 공급자가 SupplierProfilePage에서 직접 입력해야만 tax_email 값이 채워짐

---

### 3.3 공급자 프로필 편집 단계 (SupplierProfilePage)

**SupplierProfilePage** (`services/web-neture/src/pages/supplier/SupplierProfilePage.tsx`)

4개 섹션 구조:
1. 기본 정보 — slug, name, logoUrl, category, shortDescription, description
2. 운송/정책 — pricingPolicy, moq, shippingStandard, shippingIsland, shippingMountain
3. 연락처 — contactEmail, contactPhone, contactWebsite, contactKakao (visibility 설정 포함)
4. 사업자 정보 — representativeName, managerName, managerPhone, businessType, taxEmail

**PATCH /supplier/profile** → neture_suppliers 직접 업데이트

**문제점:**
- businessNumber 편집 UI 없음 (현재 organizations로 이관 중 — WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1)
- businessAddress 편집 UI 없음
- SupplierProfilePage 수정 사항이 `users.businessInfo`에 역방향 동기화되지 않음 (단방향)
- contactName 입력 UI 없음 (managerName으로 분리되어 있음)

---

### 3.4 운영사업자/Admin 조회 단계

**운영사업자 승인 화면** (`RegistrationRequestsPage.tsx`)
- 상태: ✅ WO-V1에서 개선됨
- 표시 필드: representativeName, businessType, businessAddress, contactName, managerPhone, taxInvoiceEmail
- 편집 기능: ❌ 없음 (읽기 전용)

**Admin 공급자 관리** (`AdminSupplierApprovalPage.tsx`)
- 상태: ✅ WO-V1에서 개선됨
- 표시 필드: name, representativeName, businessNumber, email, taxEmail
- 편집 기능: ❌ 없음 (읽기 전용)

---

### 3.5 정산 연동 (미구현)

현재 정산 시스템이 구현되지 않은 상태이나 잠재적 문제 확인:
- `neture_suppliers.tax_email`이 승인 시 NULL로 저장됨
- 향후 세금계산서 발행 시 tax_email 의존 예정이나 데이터 없음
- 공급자가 SupplierProfilePage에서 직접 입력하지 않으면 영구적으로 NULL

---

## 4. 필드명 Drift 목록

| Drift 유형 | 레이어 A | 레이어 B | 심각도 |
|---|---|---|---|
| 대표자명 | `representativeName` (RegisterModal, neture_suppliers, API) | `ceoName` (users.businessInfo) | 🔴 높음 |
| 세금계산서 이메일 | `taxEmail` (neture_suppliers, SupplierProfilePage) | `taxInvoiceEmail` (RegisterModal, users.businessInfo) | 🔴 높음 |
| 사업장 주소 | `businessAddress` (RegisterModal) → `address1` (POST body) → `address` (businessInfo) → `business_address` (neture_suppliers) | organizations.address (SSOT 예정) | 🟡 중간 |
| 담당자명 | `contactName` (RegisterModal, businessInfo) | `managerName` (neture_suppliers, SupplierProfilePage) | 🟡 중간 |
| 담당자 전화 | `contactPhone` (RegisterModal) → `managerPhone` (POST body, businessInfo, neture_suppliers) | — | 🟢 낮음 (rename 문서화만 필요) |
| 상호명 | `companyName` (RegisterModal) → `businessName` (businessInfo) → `name` (neture_suppliers) | — | 🟢 낮음 (각 레이어 역할 명확) |

---

## 5. 즉시 수정 필요 항목

### [P0] tax_email NULL 이관 누락

**위치**: `apps/api-server/src/modules/neture/services/operator-registration.service.ts`
**approveRegistration()** INSERT 수정 필요:

```typescript
// 현재 (버그)
// tax_email 없음

// 수정 후
taxEmail: bizInfo?.taxInvoiceEmail || null,
// SQL: tax_email = ${bizInfo?.taxInvoiceEmail || null}
```

**영향**: 승인 후 tax_email이 항상 NULL → 세금계산서 발행 불가 (미래 critical)

### [P1] ceoName 키 표준화 계획 필요

`users.businessInfo.ceoName`은 O4O 표준 필드명 `representativeName`과 불일치.
현재 auth-register.controller 한 곳에서만 매핑하므로, 단기적으로 허용 가능하나
`ceoName` 사용 위치를 문서화하고 향후 rename 시 일괄 변경 계획 수립 필요.

**현재 ceoName 사용 위치:**
- `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` (저장)
- `apps/api-server/src/modules/neture/services/operator-registration.service.ts` (읽기: `bizInfo?.ceoName`)
- `apps/api-server/src/modules/neture/services/supplier.service.ts` (사용 없음, 완료)

---

## 6. 화면/API별 현재 상태 요약

| 화면/API | 경로 | 사업자 정보 표시 | 사업자 정보 편집 | 주요 이슈 |
|---|---|---|---|---|
| 가입 화면 | RegisterModal | 입력 | ✅ (WO-V1 완료) | — |
| 운영사업자 승인 목록 | `/operator/registrations` | ✅ (WO-V1 완료) | ❌ | — |
| 운영사업자 승인 상세 | 모달 | ✅ (WO-V1 완료) | ❌ | — |
| Admin 공급자 목록 | `/admin/suppliers` | ✅ (WO-V1 완료) | ❌ | — |
| 공급자 프로필 편집 | SupplierProfilePage | ✅ 일부 | 🟡 일부 | businessNumber/Address 편집 불가 |
| 승인 로직 | `approveRegistration()` | — | — | **tax_email NULL 버그** |
| Admin API GET | `GET /admin/suppliers` | ✅ | — | — |
| Supplier Profile PATCH | `PATCH /supplier/profile` | — | ✅ 일부 | businessInfo 역방향 동기화 없음 |

---

## 7. 데이터 저장소별 역할 정리

| 저장소 | 역할 | 사업자 정보 사용 |
|---|---|---|
| `users.businessInfo` (JSONB) | 가입 시점 스냅샷 | 읽기 전용 (승인 이후 미갱신) |
| `neture_suppliers` | 운영 공급자 프로필 | 승인 후 SSOT |
| `organizations` | 사업자번호/주소 SSOT (이관 중) | WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B |
| `service_memberships` | 서비스 가입/상태 | 사업자 정보 미포함 |

**단방향 흐름 (현재):**
```
users.businessInfo → (승인 시 1회 복사) → neture_suppliers
                                          ↕ (편집 가능)
                                     organizations (이관 중)
```

**역방향 동기화 없음**: SupplierProfilePage에서 수정해도 users.businessInfo에 반영되지 않음.
이는 의도된 구조 (businessInfo = 가입 스냅샷)이므로 문서화로 충분.

---

## 8. 후속 WO 제안

### WO-1 (즉시): `WO-O4O-NETURE-SUPPLIER-APPROVAL-TAX-EMAIL-FIX-V1`

**목적**: 승인 시 tax_email 이관 누락 수정
**범위**:
- `operator-registration.service.ts` — `approveRegistration()` INSERT에 `taxEmail` 추가
- 검증: 기존 NULL tax_email 공급자 현황 조회 (SQL)

**예상 공수**: 30분

---

### WO-2 (단기): `WO-O4O-NETURE-SUPPLIER-PROFILE-BUSINESS-INFO-COMPLETE-V1`

**목적**: SupplierProfilePage 사업자 정보 섹션 완성
**범위**:
- businessNumber 편집 UI 추가 (organizations와 연동)
- businessAddress / businessAddressDetail 편집 UI 추가
- contactName (가입 시 담당자명) → managerName 매핑 명확화

**제외 범위**: businessInfo 역방향 동기화 (가입 스냅샷 구조 유지)

---

### WO-3 (중기): `WO-O4O-NETURE-SUPPLIER-FIELD-CANONICAL-V1`

**목적**: 필드명 drift 해소 및 내부 canonical 이름 확정
**범위**:
- `users.businessInfo.ceoName` → `representativeName` rename (auth-register.controller 변경)
- `users.businessInfo.taxInvoiceEmail` → `taxEmail` rename
- 변경 영향 범위: operator-registration.service.ts 읽기 로직 동반 수정

**주의**: 기존 가입 사용자의 `users.businessInfo` JSONB 데이터 마이그레이션 필요 (SQL UPDATE)

---

### WO-4 (장기): `WO-O4O-NETURE-SUPPLIER-SETTLEMENT-VALIDATION-V1`

**목적**: 정산 연동 전 tax_email 완결성 검증 체계 구축
**범위**:
- Admin에서 tax_email NULL 공급자 목록 조회 화면 추가
- 공급자에게 tax_email 미입력 경고 표시
- 정산 실행 전 tax_email 필수 검증 가드

**전제 조건**: 정산 시스템 WO 확정 후 진행

---

## 9. 결론

| 구분 | 상태 |
|---|---|
| 가입 시 사업자 정보 수집 | ✅ WO-O4O-NETURE-SUPPLIER-REGISTRATION-BUSINESS-INFO-V1 완료 |
| 승인 시 neture_suppliers 이관 | 🔴 tax_email 누락 (즉시 수정 필요) |
| 공급자 프로필 편집 | 🟡 businessNumber/Address 편집 불가 |
| 운영사업자 승인 화면 정보 | ✅ WO-V1 완료 |
| Admin 조회 화면 정보 | ✅ WO-V1 완료 |
| 필드명 일관성 | 🔴 ceoName/taxInvoiceEmail drift (단기 WO 필요) |
| 정산 연동 | ⚪ 미구현 (향후 WO) |

**즉시 실행**: WO-1 (tax_email 이관 수정) — 이 버그만 방치하면 향후 정산 시스템 도입 시 전체 공급자 재수집 필요.
