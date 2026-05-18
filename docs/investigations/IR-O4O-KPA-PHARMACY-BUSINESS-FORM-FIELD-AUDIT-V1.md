# IR-O4O-KPA-PHARMACY-BUSINESS-FORM-FIELD-AUDIT-V1

**목적**: KPA 약국 경영자/약국 사업자 정보 입력·수정 화면에서 사용하는 필드 구성이 화면마다 다르게 나타나는 문제 조사  
**날짜**: 2026-05-18  
**상태**: 조사 완료 — 코드 수정 없음  
**범위**: `services/web-kpa-society/src/` + `apps/api-server/src/routes/kpa/` + `apps/api-server/src/routes/o4o-store/`

---

## 1. 화면별 필드 구성

### 1-1. 가입 신청 (RegisterModal)

**파일**: `services/web-kpa-society/src/components/RegisterModal.tsx:108-119`  
**진입 경로**: 회원가입 모달 → 약사 타입 선택 → 개설약사 직역

| 필드 | UI 라벨 | 상태 변수 | 전송 키 |
|------|---------|----------|--------|
| 약국명 | 약국명 (사업장명) | `pharmacyName` | `pharmacyName` |
| 약국 전화 | 약국 전화번호 | `pharmacyPhone` | `pharmacyPhone` |
| 사업자등록번호 | 사업자등록번호 | `businessNumber` | `businessNumber` |
| **대표자명** | 대표자명 | `ceoName` | `ceoName` |
| **세금계산서 이메일** | 세금계산서 이메일 | `taxInvoiceEmail` | `taxInvoiceEmail` |
| **담당자 전화** | 담당자 전화 | `managerPhone` | `managerPhone` |
| 사업장 주소 | 사업장 주소 (3-part) | `businessZipCode/Address/AddressDetail` | storeAddress |

**저장 위치**: `users.businessInfo` JSONB

---

### 1-2. 내 프로필 (MyProfilePage — 역할 탭)

**파일**: `services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:579-634`  
**진입 경로**: 마이페이지 → 역할 정보 탭 → 약국 정보 섹션

| 필드 | UI 라벨 | 상태 변수 | 읽기 소스 | 쓰기 키 |
|------|---------|----------|----------|--------|
| 약국명 | 약국명 (사업장명) | `businessName` | `biz.businessName` | `businessName` |
| **대표자명** | 대표자명 | `ceoName` | `biz.ceoName \|\| biz.representativeName` | `ceoName` |
| **세금계산서 이메일** | 세금계산서 이메일 | `taxInvoiceEmail` | `biz.taxInvoiceEmail \|\| biz.taxEmail` | `taxInvoiceEmail` |
| **약국 전화** | 약국 전화 | `businessPhone` | `biz.phone` | `phone` |
| **담당자 전화** | 담당자 전화 | `managerPhone` | `biz.managerPhone` | `managerPhone` |
| 약국 주소 | 약국 주소 (3-part) | `storeZipCode/BaseAddress/DetailAddress` | `biz.storeAddress` | `storeAddress` |

**저장 위치**: `users.businessInfo` JSONB (via `PATCH /auth/me/profile`)

---

### 1-3. 운영자 회원 수정 (EditUserModal)

**파일**: `services/web-kpa-society/src/pages/operator/EditUserModal.tsx:293-358`  
**진입 경로**: 운영자 대시보드 → 회원 목록 → 수정

| 필드 | UI 라벨 | form 키 | 비고 |
|------|---------|---------|------|
| 약국명 | 약국명 | `businessName` | |
| 사업자등록번호 | 사업자등록번호 | `businessNumber` | |
| **대표자명** | 대표자명 | `ceoName` | |
| **세금계산서 이메일** | 세금계산서 이메일 | `taxInvoiceEmail` | |
| **담당자 전화** | 담당자 전화 | `managerPhone` | |
| 업태/업종 | 업태/업종 | `businessType/businessCategory` | |
| 주소 | 주소 (3-part) | `zipCode/address1/address2` | AddressSearch 컴포넌트 |
| ❌ **약국 전화** | — | — | **누락** |

**저장 위치**: `users.businessInfo` JSONB (via `PUT /kpa/operator/users/:id`)

---

### 1-4. 약국 정보 (PharmacyInfoPage)

**파일**: `services/web-kpa-society/src/pages/pharmacy/PharmacyInfoPage.tsx:191-295`  
**진입 경로**: 내 매장(Store Hub) → 사이드바 "약국 정보"

| 필드 | UI 라벨 | form 키 | 읽기 소스 | 쓰기 API |
|------|---------|---------|----------|---------|
| 약국명 | 약국명 | `name` | `org.name` | ✅ |
| **약국 전화번호** | 약국 전화번호 | `phone` | `org.phone` | ✅ |
| **개설자 연락처** | 개설자 연락처 | `ownerPhone` | `org.metadata.ownerPhone` | ✅ |
| 사업자등록번호 | 사업자등록번호 | — (display-only) | `org.business_number` | ❌ 변경 불가 |
| **세금계산서 이메일** | 세금계산서 이메일 | `taxInvoiceEmail` | `org.metadata.taxInvoiceEmail` | ✅ |
| 주소 | 주소 (3-part) | `zipCode/baseAddress/detailAddress` | `org.metadata.addressDetail` | ✅ |
| ❌ **대표자명** | — | — | — | **누락** |
| ❌ **담당자 전화** | — | — | — | **누락** |

**저장 위치**: `organizations` 테이블 (via `PUT /pharmacy/info`)

---

### 1-5. 약국 승인 게이트 (PharmacyApprovalGatePage)

**파일**: `services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx`  
**진입 경로**: 약국 개설 신청 단계 (PharmacyGuard 진입 전)

| 필드 | form 키 |
|------|---------|
| 사업자등록번호 | `businessRegistrationNumber` |
| 세금계산서 이메일 | `taxInvoiceEmail` |
| 약국명 | `pharmacyName` |
| 약국 전화번호 | `pharmacyPhone` |
| 개설자 핸드폰 번호 | `ownerPhone` |

**저장 위치**: `kpa_pharmacy_requests` 테이블 (승인 전 단계)

---

## 2. DB 저장 구조

### 2-1. users.businessInfo (JSONB) — 메인 사업자 정보 cache

```
{
  businessName,       // 약국명
  businessNumber,     // 사업자등록번호
  phone,              // 약국 전화 (canonical)
  ceoName,            // 대표자명 (canonical) ← 가입/마이페이지/운영자에서 저장
  taxInvoiceEmail,    // 세금계산서이메일 (canonical)
  managerPhone,       // 담당자 전화 (canonical) ← 가입/마이페이지/운영자에서 저장
  storeAddress: { zipCode, baseAddress, detailAddress },
  // legacy fallback (읽기 전용, 재저장 금지)
  representativeName, // ceoName의 레거시 키
  taxEmail,           // taxInvoiceEmail의 레거시 키
}
```

`member.controller.ts:363-379` — 운영자 조회 응답에서 `ceoName`/`taxInvoiceEmail` canonical 키로 통일해 반환.

### 2-2. organizations 테이블 — PharmacyInfoPage의 SSOT

```
organizations.name              → 약국명
organizations.phone             → 약국 전화
organizations.business_number   → 사업자등록번호
organizations.metadata: {
  ownerPhone,       → 개설자 연락처 (PharmacyApprovalGate에서 채워짐)
  taxInvoiceEmail,  → 세금계산서이메일
  addressDetail: { zipCode, baseAddress, detailAddress }
}
```

**주의**: `organizations.metadata`에 `ceoName`/`managerPhone` 없음. PharmacyInfoPage는 organizations을 SSOT로 사용하므로 이 두 필드를 표시할 데이터 소스가 없다.

### 2-3. kpa_pharmacy_requests 테이블 — 개설 신청 (PharmacyApprovalGatePage)

```
pharmacy_name       → 약국명
business_number     → 사업자등록번호
pharmacy_phone      → 약국 전화
owner_phone         → 개설자 연락처 (managerPhone과 별개 필드)
tax_invoice_email   → 세금계산서이메일
payload: jsonb      → 기타 (ceoName 없음)
```

`kpa-pharmacy-request.entity.ts:32-47` — `ceo_name` 컬럼 없음. 대표자명은 request 테이블에 저장되지 않는다.

---

## 3. 화면별 필드 매트릭스

| 필드 | 가입 신청 | 내 프로필 | 운영자 수정 | 약국 정보 | DB 저장 위치 |
|------|:---:|:---:|:---:|:---:|------|
| 약국명 | ✅ | ✅ | ✅ | ✅ | 전체 |
| 사업자등록번호 | ✅ | ❌ | ✅ | ✅(RO) | users.biz / org / request |
| **대표자명 (ceoName)** | ✅ | ✅ | ✅ | ❌ | users.businessInfo |
| **담당자 전화 (managerPhone)** | ✅ | ✅ | ✅ | ❌ | users.businessInfo |
| **약국 전화 (phone)** | ✅ | ✅ | ❌ | ✅ | org / users.biz / request |
| **개설자 연락처 (ownerPhone)** | ❌ | ❌ | ❌ | ✅ | org.metadata / request |
| 세금계산서 이메일 | ✅ | ✅ | ✅ | ✅ | 전체 |
| 사업장 주소 | ✅ | ✅ | ✅ | ✅ | users.biz / org.metadata |
| **담당자명 (이름)** | ❌ | ❌ | ❌ | ❌ | **존재하지 않음** |

---

## 4. 핵심 문제

### 문제 A: PharmacyInfoPage — 대표자명·담당자 전화 누락

**PharmacyInfoPage**는 매장 운영의 canonical 정보 수정 화면이나 `ceoName`(대표자명)과 `managerPhone`(담당자 전화)가 없다.

원인: PharmacyInfoPage는 `organizations` 테이블을 SSOT로 사용하는데, organizations의 metadata에 이 두 필드가 저장되지 않는다. 데이터가 `users.businessInfo`에만 있으므로, 현재 구조에서는 표시할 데이터를 PharmacyInfoPage가 독립적으로 가져오지 못한다.

**해결 방향**:
1. PharmacyInfoPage API(`GET /pharmacy/info`)가 `users.businessInfo`에서 `ceoName`/`managerPhone` fallback 조회
2. `PUT /pharmacy/info`가 이 두 필드를 organizations.metadata에 저장하거나 users.businessInfo에 업데이트

---

### 문제 B: EditUserModal — 약국 전화 누락

`EditUserModal`(운영자 회원 수정)에 `phone`(약국 전화) 필드가 없다. 운영자가 약국 전화를 수정할 수 없다.

`users.businessInfo.phone` 필드는 존재하나 form state에 없음 (line 80-96 참조).

---

### 문제 C: "개설자 연락처" vs "담당자 전화" — 별개 필드, 혼용 표기

| 필드 | UI 라벨 | 저장 위치 | 가입 경로 |
|------|---------|----------|---------|
| `managerPhone` | 담당자 전화 | users.businessInfo | RegisterModal (가입 단계) |
| `ownerPhone` | 개설자 연락처 / 개설자 핸드폰 | org.metadata, kpa_pharmacy_requests.owner_phone | PharmacyApprovalGatePage (별도 개설 신청) |

두 필드는 **의미상 동일**(약국 개설자/담당자 연락처)하지만 서로 다른 경로로 저장되며 이름도 다르다.

- 가입 신청 시(`RegisterModal`) → `users.businessInfo.managerPhone`
- 개설 승인 신청 시(`PharmacyApprovalGatePage`) → `kpa_pharmacy_requests.owner_phone` → `organizations.metadata.ownerPhone`

결과적으로 `PharmacyInfoPage`에서 표시하는 "개설자 연락처"(`ownerPhone`)와 `MyProfilePage`에서 표시하는 "담당자 전화"(`managerPhone`)가 다른 값일 수 있다.

---

### 문제 D: 대표자명(ceoName)이 kpa_pharmacy_requests에 없음

`kpa_pharmacy_requests` 테이블에 `ceo_name` 컬럼이 없다. 개설 신청 시 대표자명을 입력했어도 (`RegisterModal.ceoName`) 이 테이블에는 저장되지 않으며, 승인 처리 시 운영자가 신청서에서 대표자명을 확인할 수 없다. (users.businessInfo에는 저장되나 신청서 뷰에서 노출 여부 별도 확인 필요)

---

### 문제 E: 담당자명(이름/text)은 시스템에 없음

전화번호(`managerPhone`)는 있으나 담당자 이름(`contactName`) 필드는 어떤 화면, entity, JSONB에도 없다. 약국 개설자명은 사업자등록증의 대표자명(`ceoName`)이 대신하고 있고, 담당자가 대표자와 다른 경우 기록할 방법이 없다.

---

## 5. 필드 의미 정의 (현재 혼용 현황)

| 한국어 | 현재 사용 필드명 | 의미 | 비고 |
|--------|----------------|------|------|
| 약국명/사업장명 | `pharmacyName`, `businessName`, `name` | 약국 상호 | 화면마다 변수명 다름 |
| 대표자명 | `ceoName` (canonical), `representativeName` (legacy) | 사업자등록증 대표자 | canonical 통일됨 |
| 담당자 전화 | `managerPhone` (canonical) | 업무 담당자 연락처 | users.businessInfo에만 |
| 개설자 연락처 | `ownerPhone` | 약국 개설자 핸드폰 | org.metadata, request table |
| 약국 전화 | `pharmacyPhone` (가입), `phone` (org/biz), `businessPhone` (MyPage state) | 약국 대표 번호 | 변수명 3종 혼용 |
| 세금계산서이메일 | `taxInvoiceEmail` (canonical), `taxEmail` (legacy) | 세금계산서 수신 | canonical 통일됨 |
| 담당자명 | — | 업무 담당자 이름 | **존재하지 않음** |

---

## 6. 표준 양식 제안

약국 경영자 정보 수정 화면의 **표준 필드 세트 (제안)**:

| 필드 | 라벨 | 키 | 필수 | 비고 |
|------|------|----|:---:|------|
| 약국명 | 약국명 (사업장명) | `businessName` / `name` | ✅ | |
| 사업자등록번호 | 사업자등록번호 | `businessNumber` | ✅ | 변경 시 관리자 문의 |
| 대표자명 | 대표자명 | `ceoName` | ✅ | 사업자등록증 기준 |
| 약국 전화 | 약국 전화번호 | `phone` | — | 대표 번호 |
| 담당자 전화 | 담당자 전화 | `managerPhone` | — | 업무 연락처 (=개설자 연락처) |
| 세금계산서이메일 | 세금계산서 이메일 | `taxInvoiceEmail` | — | |
| 사업장 주소 | 사업장 주소 | storeAddress (3-part) | — | |

**제외 제안**: `ownerPhone`(개설자 연락처) — `managerPhone`으로 통합하고, 기존 `ownerPhone` 값을 마이그레이션 fallback으로 읽기

---

## 7. 최소 수정 WO 후보

### [P1] PharmacyInfoPage — 대표자명·담당자 전화 추가 (저리스크)

**WO-O4O-KPA-PHARMACY-INFO-FIELD-ALIGN-V1**

1. `GET /pharmacy/info` 응답에 `ceoName`, `managerPhone` 추가
   - 파일: `apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts`
   - users.businessInfo fallback으로 조회
2. `PUT /pharmacy/info` — `ceoName`, `managerPhone` 저장 허용
   - organizations.metadata에 저장 또는 users.businessInfo 동기화
3. `PharmacyInfoPage.tsx` — 대표자명, 담당자 전화 입력 필드 추가
4. `pharmacyInfo.ts` API 타입에 `ceoName`, `managerPhone` 추가

**리스크**: 낮음 — frontend 필드 추가 + backend fallback 조회 확장

---

### [P2] EditUserModal — 약국 전화 추가 (저리스크)

**포함 가능**: WO-O4O-KPA-PHARMACY-INFO-FIELD-ALIGN-V1 범위 확장

1. `EditUserModal.tsx` form state에 `businessPhone` 추가
2. `PUT /kpa/operator/users/:id` — `businessInfo.phone` 업데이트 지원 확인

**리스크**: 낮음 — form field 추가만

---

### [P3] ownerPhone / managerPhone 통합 정책 결정 (중기)

**WO-O4O-KPA-PHARMACY-CONTACT-UNIFICATION-V1** (별도 WO)

- `ownerPhone`(organizations.metadata) ↔ `managerPhone`(users.businessInfo) 관계 정책 결정
- 옵션 A: `managerPhone`을 SSOT로 — `ownerPhone`에서 read 시 fallback
- 옵션 B: 별도 유지 (개설자 연락처 ≠ 담당자 전화)
- DB migration 필요 여부 결정

**리스크**: 중간 — 정책 결정이 선행되어야 함

---

### [P4] 담당자명(이름) 필드 추가 (신규 기능)

필요 시 별도 WO. `users.businessInfo.contactName` 추가 → 모든 화면에 적용. 현재 긴급 우선순위 아님.

---

## 8. 수정 영향 범위

| 수정 | 프론트엔드 | 백엔드 | DB 마이그레이션 | 리스크 |
|------|-----------|--------|----------------|--------|
| P1 PharmacyInfoPage 필드 추가 | PharmacyInfoPage.tsx, pharmacyInfo.ts | pharmacy-info.controller.ts | 없음 | **낮음** |
| P2 EditUserModal 약국전화 추가 | EditUserModal.tsx | 확인 필요 | 없음 | **낮음** |
| P3 ownerPhone/managerPhone 통합 | 다수 | 다수 | 없음(JSONB) | 중간 |
| P4 담당자명 신규 | 다수 | 다수 | 없음(JSONB) | 낮음 |

---

## 결론

| 항목 | 상태 |
|------|------|
| 대표자명(ceoName) — 모든 화면 통일 | ❌ PharmacyInfoPage 누락 |
| 담당자 전화(managerPhone) — 모든 화면 통일 | ❌ PharmacyInfoPage, EditUserModal 누락 |
| 약국 전화(phone) — 모든 화면 통일 | ❌ EditUserModal 누락 |
| 개설자 연락처(ownerPhone) vs 담당자 전화(managerPhone) | ⚠️ 동의어인데 별개 필드로 관리 중 |
| 세금계산서 이메일 | ✅ 모든 화면 통일 |
| 사업장 주소 | ✅ 모든 화면 통일 |
| 담당자명(이름/text) | ❌ 시스템에 없음 |

**즉시 수정 가능**: P1 (PharmacyInfoPage 대표자명·담당자 전화 추가) + P2 (EditUserModal 약국 전화 추가) — 2-3개 파일, 저리스크, DB 변경 없음  
**중기 결정 필요**: `ownerPhone` vs `managerPhone` 통합 정책
