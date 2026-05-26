# IR-O4O-BUSINESS-REGISTRATION-STANDARD-AUDIT-V1

> **조사 목표**: O4O 플랫폼 전체에서 사용할 표준 사업자 등록 정보 구조를 조사하고, 서비스별 현황 갭을 분석하여 후속 WO 방향을 확정한다.
>
> **상태**: COMPLETE  
> **일자**: 2026-05-26  
> **조사자**: Claude Code (AI)

---

## 1. 조사 범위 및 방법

**조사 대상:**
- Neture 공급자 가입 화면 (RegisterModal, SupplierProfilePage)
- GlycoPharm 약국 경영자 가입 (RegisterPage, PharmacyApplyPage)
- K-Cosmetics 매장 경영자 가입 (RegisterPage)
- KPA Society 약사 가입 (PharmacyJoinPage)
- API 공통 DTO (RegisterRequestDto)
- DB Entity 구조 (BusinessInfo, organizations, neture_suppliers, glycopharm_pharmacies, cosmetics_stores, kpa_pharmacy_requests, physical_stores)
- Operator 승인 화면 (GlycoPharm 기준 가장 완성도 높음)

---

## 2. 서비스별 현재 가입 시점 수집 필드

### 2.1 Neture 공급자 가입 (RegisterModal.tsx)

```
기본 회원 정보:
  ✅ email (필수)
  ✅ password (필수)
  ✅ firstName / lastName (필수)
  ✅ phone
  ✅ agreeTerms / agreePrivacy / agreeMarketing

공급자 추가 정보 (공급자 선택 시):
  ✅ companyName (회사명)
  ✅ businessNumber (사업자등록번호)
  ✅ businessType (업종) — 선택사항
```

**누락 필드 (가입 시점):**
```
  ❌ representativeName (대표자명)
  ❌ taxEmail (세금계산서 이메일)
  ❌ managerName (담당자명)
  ❌ managerPhone (담당자 전화)
  ❌ businessAddress (사업장 주소)
  ❌ businessCategory (업태)
```

→ **이 필드들은 가입 후 SupplierProfilePage에서 별도 입력** (운영자 승인 전 필수 여부 불명확)

### 2.2 Neture 공급자 프로필 관리 (SupplierProfilePage.tsx) — 가입 후 입력

```
섹션 A: 사업자 기본정보
  ✅ name (상호명) — 가입 시 설정, 읽기 전용
  ✅ representativeName (대표자명)
  ✅ businessNumber (사업자등록번호)
  ✅ businessType (업종)
  ✅ businessZipCode / businessAddress / businessAddressDetail (사업장 주소)
  ✅ taxEmail (세금계산서 이메일)

섹션 B: 담당자 정보
  ✅ managerName (담당자명)
  ✅ managerPhone (담당자 전화)

섹션 C: 외부 공개 연락처 (visibility 관리)
  ✅ contactEmail / contactPhone / contactWebsite / contactKakao + Visibility

섹션 D: B2B 주문 조건
  ✅ minOrderAmount / minOrderSurcharge / orderConditionNote
```

→ 가입 후 프로필 페이지에는 필요한 필드가 존재하나, 승인 전 필수 입력 여부가 UX상 불명확

### 2.3 GlycoPharm 약국 경영자 가입 (RegisterPage.tsx) — 가장 완성도 높음

```
기본 정보:
  ✅ lastName / firstName / nickname
  ✅ email / password / passwordConfirm
  ✅ phone

사업자 정보 (가입 시점 수집):
  ✅ businessName (약국명)
  ✅ businessNumber (사업자등록번호)
  ✅ representativeName (대표자명)
  ✅ licenseNumber (약사 면허번호)
  ✅ taxEmail (세금계산서 이메일)
  ✅ businessType (업태)
  ✅ businessCategory (업종)
  ✅ zipCode / address1 / address2 (주소)

동의:
  ✅ agreeTerms / agreePrivacy / agreeMarketing
```

→ **가입 시점에 사업자 정보 전체를 수집하는 가장 완성된 형태**

### 2.4 GlycoPharm 약국 참여 신청 (PharmacyApplyPage.tsx) — 별도 신청 단계

```
  ✅ organizationName (약국명)
  ✅ businessNumber (사업자등록번호)
  ✅ serviceTypes (dropshipping / sample_sales / digital_signage)
  ✅ requestedSlug (매장 URL)
  ✅ note (추가 메모)
```

### 2.5 K-Cosmetics 매장 경영자 가입 (RegisterPage.tsx) — 최소 수준

```
기본 정보:
  ✅ lastName / firstName / nickname
  ✅ email / password / passwordConfirm
  ✅ phone

판매자 추가 정보:
  ✅ businessName (회사명)
  ✅ businessNumber (사업자등록번호)
  
  ❌ representativeName — 누락
  ❌ taxEmail — 누락
  ❌ businessType / businessCategory — 누락
  ❌ 주소 — 누락
```

### 2.6 KPA Society 약사 가입

```
약사 면허 중심:
  ✅ membershipType (pharmacist / student)
  ✅ licenseNumber (약사 면허번호)
  ✅ pharmacyAddress (근무처 주소)
  ✅ pharmacyPhone (근무처 전화)
  ✅ activityType (pharmacy_owner / pharmacy_employee / hospital 등)
  
  — 사업자 정보는 별도 약국 신청(KpaPharmacyRequest)에서 수집
```

### 2.7 KPA 약국 신청 (kpa_pharmacy_requests)

```
  ✅ pharmacy_name (약국명)
  ✅ business_number (사업자등록번호)
  ✅ pharmacy_phone
  ✅ owner_phone
  ✅ tax_invoice_email (세금계산서 이메일)
```

---

## 3. DB/Entity 구조 분석

### 3.1 플랫폼 공통 사업자 엔티티 — BusinessInfo

**파일**: `apps/api-server/src/entities/BusinessInfo.ts`  
**테이블**: `business_info`

가장 완성된 공통 사업자 구조가 이미 존재하나 **실제 활용도 낮음**.

```typescript
businessName: string                    // 상호명
tradingName?: string                    // 상호 (DBA)
businessType: ENUM                     // sole_proprietorship, corporation 등
industry: ENUM                         // technology, healthcare, pharmaceutical 등
businessSize: ENUM                     // micro, small, medium, large, enterprise

address: BusinessAddress               // street1, street2, city, state, postalCode, country
billingAddress?: BusinessAddress

contact: BusinessContact               // phone, fax, website, email

legal: BusinessLegal                   // taxId, vatNumber, businessLicense, businessLicenseExpiry
financials: BusinessFinancials         // annualRevenue, numberOfEmployees, foundedYear

defaultCommissionRate: DECIMAL(5,2)
isVerified: boolean
```

**문제**: 이 엔티티는 users.id와 1:1 연결되어 있으나, 각 서비스(Neture, GlycoPharm, Cosmetics, KPA)는 이 테이블을 사용하지 않고 **독자적인 필드/테이블에 사업자 정보를 저장**하고 있음.

### 3.2 서비스별 사업자 정보 저장 위치

| 서비스 | 테이블 | 주요 사업자 필드 |
|--------|--------|-----------------|
| Neture 공급자 | `neture_suppliers` | business_number, representative_name, business_address, manager_name, manager_phone, business_type, tax_email |
| GlycoPharm 약국 | `glycopharm_pharmacies` | business_number(UNIQUE), owner_name, address, phone, email |
| K-Cosmetics 매장 | `cosmetics.cosmetics_stores` | businessNumber(UNIQUE), ownerName, address, contactPhone |
| KPA 약국 신청 | `kpa_pharmacy_requests` | business_number, pharmacy_name, pharmacy_phone, owner_phone, tax_invoice_email |
| Organizations | `organizations` | business_number, name, address, phone |
| Physical Stores | `physical_stores` | businessNumber(UNIQUE) — **크로스 서비스 통합 식별자** |

### 3.3 organizations 테이블의 역할

**파일**: `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts`

organizations는 서비스 중립적 조직 계층 구조이나, 사업자 정보 일부를 보유:
```
business_number: VARCHAR(20)  — 사업자번호
name: VARCHAR(255)            — 조직명
address: VARCHAR(500)         — 주소 (단순 텍스트)
address_detail: JSONB         — 구조화된 주소
phone: VARCHAR(50)
```

GlycoPharm, K-Cosmetics는 organization_id를 통해 organizations와 연결되나, 사업자 상세는 각자 테이블에 별도 보유.

### 3.4 physical_stores — 통합 사업자번호 식별자

**파일**: `apps/api-server/src/routes/platform/entities/physical-store.entity.ts`

```
businessNumber: VARCHAR(20) UNIQUE  — 사업자번호 (통합 식별자)
storeName: VARCHAR(255)
region: VARCHAR(100)
```

사업자번호로 GlycoPharm 약국, Cosmetics 매장, KPA 약국을 연결하는 의도로 설계되었으나, 현재 Neture 공급자는 미연결.

---

## 4. Operator 승인 화면 분석

### 4.1 GlycoPharm 약국 참여 신청 승인 (ApplicationDetailPage.tsx) — 가장 완성도 높음

```
회원 정보:
  ✅ 이름, 이메일, 전화번호

약국/사업자 정보:
  ✅ 약국명 (organizationName)
  ✅ 대표자명 (metadata.representativeName)
  ✅ 사업자등록번호 (businessNumber)
  ✅ 약사 면허번호 (metadata.licenseNumber)
  ✅ 세금계산서 이메일 (metadata.taxEmail)
  ✅ 업태 (metadata.businessType)
  ✅ 업종 (metadata.businessCategory)
  ✅ 주소 (metadata.zipCode + address + addressDetail)

신청 정보:
  ✅ 신청 서비스 (무재고 판매, 샘플 판매, 디지털 사이니지)
  ✅ 추가 메모

처리:
  ✅ 승인 (slug 입력)
  ✅ 반려 (사유 입력)
  ✅ 처리 이력
```

### 4.2 GlycoPharm 스토어 판매 참여 승인 (StoreApprovalDetailPage.tsx)

심사 체크포인트 기반:
```
  ✅ 사업자등록번호 확인
  ✅ 통신판매업 신고번호 확인
  ✅ 약사 면허 확인
  ✅ 정산 계좌 정보 확인
  ✅ 필수 약관 동의 확인
```

### 4.3 Neture 공급자 승인 화면 — 현황 미확인

Neture 측 공급자 승인 UI에서 표시하는 사업자 정보 필드가 명확히 특정되지 않음.  
RegisterModal에서 수집하는 정보(companyName, businessNumber, businessType)만으로 운영자 승인 판단에 충분한지 검토 필요.

---

## 5. 공통 사업자 등록 표준 필드 정의

### 5.1 사업자등록증 기준 필드

| 구분 | 필드 | 타입 | 필수/선택 | 비고 |
|------|------|------|-----------|------|
| **P0 필수** | businessName / companyName | string | 필수 | 상호명 |
| **P0 필수** | businessNumber | string(10) | 필수 | 사업자등록번호 (xxx-xx-xxxxx 형식) |
| **P0 필수** | representativeName / ownerName | string | 필수 | 대표자명 |
| **P1 중요** | businessType | string | 권장 | 업태 (예: 도소매) |
| **P1 중요** | businessCategory | string | 권장 | 업종 (예: 의약품) |
| **P1 중요** | businessAddress | string | 권장 | 사업장 주소 |
| **P1 중요** | businessZipCode | string | 권장 | 우편번호 |
| **P2 선택** | businessAddressDetail | string | 선택 | 상세 주소 |

### 5.2 세금계산서/정산 정보

| 구분 | 필드 | 타입 | 필수/선택 | 비고 |
|------|------|------|-----------|------|
| **P1 중요** | taxEmail / taxInvoiceEmail | string | 권장 | 세금계산서 수신 이메일 |
| **P2 선택** | bankAccount | string | 선택 | 정산 계좌 (결제 서비스 연동 시) |

### 5.3 담당자 정보

| 구분 | 필드 | 타입 | 필수/선택 | 비고 |
|------|------|------|-----------|------|
| **P1 중요** | managerName / contactName | string | 권장 | 담당자명 |
| **P1 중요** | managerPhone / contactPhone | string | 권장 | 담당자 휴대폰 |
| **P2 선택** | managerEmail / contactEmail | string | 선택 | 담당자 이메일 |

### 5.4 서비스별 추가 필드

| 서비스 | 추가 필드 | 비고 |
|--------|----------|------|
| KPA / GlycoPharm | licenseNumber (약사 면허번호) | 약사 자격 확인용 |
| GlycoPharm | communicationSalesNumber (통신판매업 신고번호) | 온라인 판매 시 필요 |
| Neture | minOrderAmount, orderConditionNote | B2B 주문 조건 |

---

## 6. 현황 갭 분석

### 6.1 Neture 공급자 가입 시점 갭

| 필드 | GlycoPharm 가입 시 | Neture 가입 시 | 갭 |
|------|:------------------:|:---------------:|:---:|
| businessName | ✅ | ✅ | — |
| businessNumber | ✅ | ✅ | — |
| representativeName | ✅ | ❌ (프로필 후입력) | **Gap** |
| taxEmail | ✅ | ❌ (프로필 후입력) | **Gap** |
| businessType | ✅ | △ (선택) | 경미 |
| businessCategory | ✅ | ❌ | **Gap** |
| 주소 (zipCode+address) | ✅ | ❌ (프로필 후입력) | **Gap** |
| managerName | ❌ (프로필) | ❌ (프로필 후입력) | 동일 |
| managerPhone | ❌ (프로필) | ❌ (프로필 후입력) | 동일 |

**결론**: Neture 공급자 가입 시점에 대표자명, 세금계산서 이메일, 주소가 빠져 있어 운영자 승인 판단 시 정보 부족.

### 6.2 운영자 승인 화면 갭

- **GlycoPharm**: 승인에 필요한 모든 사업자 정보 표시 ✅
- **Neture**: 공급자 승인 화면에서 표시되는 사업자 정보 범위 불명확 ⚠️
- **K-Cosmetics**: 승인 화면 구조 미확인 ⚠️

### 6.3 필드명 불일치 문제

같은 개념이 서비스별로 다른 이름으로 사용됨:

| 개념 | Neture | GlycoPharm | K-Cosmetics | KPA | 정책 |
|------|--------|------------|-------------|-----|------|
| 세금계산서 이메일 | taxEmail | taxEmail | — | tax_invoice_email | **taxEmail 통일 권장** |
| 대표자명 | representativeName | representativeName | ownerName | — | **representativeName 통일 권장** |
| 사업자번호 | businessNumber | businessNumber | businessNumber | business_number | DB: snake_case, DTO/UI: camelCase |
| 담당자명 | managerName | contactName (DTO) | — | — | **managerName 통일 권장** |

### 6.4 BusinessInfo 엔티티 활용 문제

`business_info` 테이블에 가장 완성된 공통 사업자 구조가 존재하나:
- 각 서비스 도메인이 이 테이블을 참조하지 않음
- 대신 서비스별 테이블(neture_suppliers, glycopharm_pharmacies 등)에 사업자 필드를 중복 보유
- `physical_stores`가 사업자번호 기반 통합 식별자로 설계되었으나 Neture 공급자와 미연결

---

## 7. 서비스별 적용 범위 검토

| 서비스 | 역할 | 사업자 정보 필요성 | 현재 수준 |
|--------|------|:-----------------:|:---------:|
| Neture 공급자 | 상품 공급 B2B | **높음** (세금계산서, 정산) | 부족 (가입 시점) |
| Neture 파트너 | 제휴 판매 | 중간 (제휴 계약) | 최소 |
| GlycoPharm 약국 | 무재고 판매 | **높음** (통신판매업, 약사 면허) | 완성 |
| K-Cosmetics 매장 | 화장품 판매 | 높음 (사업자 확인) | 부족 |
| KPA 약사 | 커뮤니티 + 약국 | 중간 (면허 확인) | 면허 중심 OK |
| KPA 약국 | 서비스 참여 | **높음** (세금계산서) | 별도 신청 OK |

---

## 8. 데이터 모델 방향

### 8.1 현재 구조의 문제

```
현재:
  User (1:1) → BusinessInfo (활용 미흡)
  ↓
  neture_suppliers.business_number (별도 보유)
  glycopharm_pharmacies.business_number (별도 보유)
  cosmetics_stores.businessNumber (별도 보유)
  physical_stores.businessNumber (통합 시도, 미완성)
```

### 8.2 권장 방향 (점진적)

**단기 (현 WO 범위):**
- 서비스별 테이블에 누락 필드 추가 (마이그레이션)
- 가입 폼 UI 필드 추가 (RegisterModal, K-Cosmetics RegisterPage)
- RegisterRequestDto에 누락 필드 추가 (representativeName, businessCategory, 주소)

**중기 (별도 WO):**
- Neture 공급자 승인 화면에 사업자 정보 표시 섹션 추가
- K-Cosmetics 매장 승인 화면 표준화
- `physical_stores`를 Neture 공급자까지 확장 (업자번호 기반 통합)

**장기 (플랫폼 방향):**
- `BusinessInfo` 엔티티를 실제 활용하거나 deprecated 처리
- 공통 BusinessProfile 구조 표준화

---

## 9. 후속 WO 제안

### WO-O4O-NETURE-SUPPLIER-REGISTRATION-BUSINESS-INFO-V1
**우선순위**: HIGH  
**범위**: Neture 공급자 가입 화면 사업자 정보 보강

작업 내용:
1. RegisterModal — 공급자 선택 시 필드 추가
   - representativeName (대표자명) — 필수
   - taxEmail (세금계산서 이메일) — 필수
   - businessCategory (업종) — 권장
   - zipCode / businessAddress / businessAddressDetail (사업장 주소) — 권장
2. RegisterRequestDto — 위 필드 추가
3. 공급자 등록 서비스 로직 — neture_suppliers에 신규 필드 저장
4. Neture 공급자 승인 화면 — 수집된 사업자 정보 표시 확인

**예상 공수**: 백엔드 0.5일 + 프론트엔드 0.5일

---

### WO-O4O-K-COSMETICS-REGISTRATION-BUSINESS-INFO-V1
**우선순위**: MEDIUM  
**범위**: K-Cosmetics 매장 경영자 가입 화면 사업자 정보 보강

작업 내용:
1. RegisterPage (K-Cosmetics) — 판매자 섹션 필드 추가
   - representativeName (대표자명)
   - taxEmail (세금계산서 이메일)
   - businessType / businessCategory
   - 주소 (zipCode, address1, address2)
2. RegisterRequestDto — 이미 필드 존재, 프론트엔드 수집만 추가
3. cosmetics_stores 테이블 — 사업자 상세 필드 마이그레이션

**예상 공수**: 백엔드 0.5일 + 프론트엔드 0.5일

---

### WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1
**우선순위**: LOW  
**범위**: 사업자 정보 필드명 표준화 (점진적 정렬)

작업 내용:
- DTO 레벨: representativeName / taxEmail / managerName 통일
- DB 레벨: snake_case 일관성 확인
- 기존 deprecated alias 정리

---

## 10. 결론

### 현황 요약

| 구분 | 평가 |
|------|------|
| GlycoPharm | 사업자 정보 수집 가장 완성 ✅ |
| KPA | 약사 면허 중심, 약국 신청 분리 구조 ✅ |
| Neture 공급자 | 가입 시점 필드 부족, 프로필에서 보완 가능하나 UX 갭 ⚠️ |
| K-Cosmetics | 가입 시점 필드 최소 (상호명+사업자번호만) ⚠️ |
| 공통 BusinessInfo | 구조는 완성, 실제 활용 거의 없음 ⚠️ |

### 핵심 갭

1. **Neture 공급자 가입 시점**: 대표자명, 세금계산서 이메일, 주소가 누락 → 운영자 승인 판단 어려움
2. **K-Cosmetics 가입 시점**: 사업자 정보 최소 수준 → 운영자 승인 체계 구축 시 문제
3. **필드명 불일치**: taxEmail vs tax_invoice_email, representativeName vs ownerName 등
4. **공통 구조 미활용**: BusinessInfo 엔티티가 존재하나 각 서비스가 독자 구조 유지

### 권장 즉시 조치

**가장 시급한 작업: Neture 공급자 가입 화면 보강 (WO-O4O-NETURE-SUPPLIER-REGISTRATION-BUSINESS-INFO-V1)**

공급자는 사업자 정보가 없으면 세금계산서 발행, 정산, 계약 등 B2B 핵심 기능이 불가능하므로 가입 시점에 최소한의 필수 정보(대표자명, 세금계산서 이메일)를 반드시 수집해야 한다.

---

*IR 완료 — 2026-05-26*
