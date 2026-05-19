# IR-O4O-KPA-STORE-INFO-AND-PHARMACY-OWNER-DATA-FLOW-AUDIT-V1

**유형:** Investigation Report  
**우선순위:** P1  
**상태:** 조사 완료  
**날짜:** 2026-05-19  
**작성자:** Claude Code (정적 분석)  
**대상 서비스:** KPA Society — `/store/info` (약국 정보 페이지)

---

## 1. 증상 요약

| 화면 | 표시 상태 |
|------|----------|
| 운영자 회원 상세정보 | 약국명, 사업자번호, 대표자명, 담당자명, 세금계산서 이메일, 약국 전화번호 **정상 표시** |
| `/store/info` (약국 경영자 화면) | 약국 전화번호, 개설자 연락처, 사업자등록번호, 세금계산서 이메일 **비어 있음** |

---

## 2. 가입 경로 — 2가지 병존

KPA 약국 경영자는 **두 가지 독립된 경로**를 통해 승인된다.

### 경로 A — `pharmacy-request` 경로

```
사용자 POST /kpa/pharmacy-requests
  → kpa_pharmacy_requests 테이블 저장
    (pharmacy_name, business_number, pharmacy_phone, owner_phone, tax_invoice_email)
  → 운영자 PATCH /kpa/pharmacy-requests/:id/approve
    → organizations 생성
    → kpa_members.organization_id 설정
    → organization_members(owner) 추가
    → kpa_pharmacist_profiles upsert
    → role_assignments('kpa:store_owner') 부여
    → platform_store_slugs 생성
```

**관련 파일:**  
- `apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts:171–265`  
- `apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts`

### 경로 B — `member.controller` 경로 (pharmacy_owner 자동 활성화)

```
사용자 KPA 가입 (activity_type='pharmacy_owner')
  → users.businessInfo JSONB 저장
    (businessNumber, ceoName, taxInvoiceEmail, phone, storeAddress, ...)
  → kpa_members 생성 (pharmacy_name, pharmacy_address)
  → 운영자 PATCH /kpa/members/:id/status (pending → active)
    → organizations 생성
    → kpa_members.organization_id 설정
    → organization_members(owner) 추가
    → role_assignments('kpa:store_owner') 부여
    → platform_store_slugs 생성
```

**관련 파일:**  
- `apps/api-server/src/routes/kpa/controllers/member.controller.ts:607–688`

---

## 3. 데이터 저장 구조 상세

### 3-1. 저장소별 필드 매핑

| 필드 | kpa_pharmacy_requests | users.businessInfo | kpa_members | organizations |
|------|:---:|:---:|:---:|:---:|
| 약국명 | pharmacy_name ✅ | businessName ✅ | pharmacy_name ✅ | name ✅ (승인 시 복사) |
| 사업자번호 | business_number ✅ | businessNumber ✅ | — | **business_number ❌ (NULL)** |
| 약국 전화 | pharmacy_phone ✅ | metadata.pharmacy_phone ✅ | — | **phone ❌ (NULL)** |
| 개설자 연락처 | owner_phone ✅ | — | — | **metadata.ownerPhone ❌ (NULL)** |
| 대표자명 | — | ceoName ✅ | — | **metadata.ceoName ❌ (NULL)** |
| 담당자명 | — | contactName ✅ | — | **metadata.contactName ❌ (NULL)** |
| 세금계산서 이메일 | tax_invoice_email ✅ | taxInvoiceEmail ✅ | — | **metadata.taxInvoiceEmail ❌ (NULL)** |
| 주소 (구조화) | payload (선택적) | storeAddress ✅ | pharmacy_address (평문) | **address_detail ❌ (NULL)** |
| 주소 (평문) | — | address, address2 ✅ | — | **address ❌ (NULL)** |

**핵심 발견:** `ensureOrganization()` 호출 시 두 경로 모두 `name`, `code`, `type`, `createdByUserId`만 전달한다. `phone`, `business_number`, `address`, `metadata` 필드는 **한 번도 전달되지 않는다.**

```typescript
// pharmacy-request.controller.ts:206 및 member.controller.ts:636 (동일 패턴)
await organizationOpsService.ensureOrganization({
  name: pharmacyName,
  code: orgCode,          // 'kpa-pharm-{사업자번호}'
  type: 'pharmacy',
  createdByUserId: userId,
  // ❌ phone, business_number, address, metadata 없음
});
```

`ensureOrganization` SQL:
```sql
INSERT INTO organizations
  (id, name, code, type, metadata, "parentId", created_by_user_id, "isActive", level, path, "childrenCount", "createdAt", "updatedAt")
  VALUES (...)
-- business_number, phone, address, address_detail 컬럼 없음
```

---

## 4. 운영자 뷰 데이터 소스

**API:** `GET /api/v1/kpa/members`  
**소스:** `users."businessInfo"` JSONB 컬럼

```typescript
// member.controller.ts:361-391
const businessInfo = r.user_business_info as Record<string, any>;
const metadata = businessInfo?.metadata as Record<string, any>;

business_info = {
  businessNumber: businessInfo.businessNumber,          // ← users.businessInfo
  ceoName: businessInfo.ceoName ?? businessInfo.representativeName,
  contactName: businessInfo.contactName,
  taxInvoiceEmail: businessInfo.taxInvoiceEmail ?? businessInfo.taxEmail ?? businessInfo.email,
  managerPhone: businessInfo.managerPhone,
  pharmacy_phone: metadata?.pharmacy_phone,             // ← users.businessInfo.metadata.pharmacy_phone
  zipCode: businessInfo.zipCode,
  address: businessInfo.address,
  address2: businessInfo.address2,
}
```

**결론:** 운영자 뷰는 `users.businessInfo`를 직접 읽으므로 가입 시 입력한 정보가 모두 보인다.

---

## 5. `/store/info` 데이터 소스 및 Fallback 흐름

**API:** `GET /api/v1/pharmacy/info`  
**Controller:** `apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts`

### Fallback 체인

```
PRIMARY: organizations 테이블
  → phone, businessNumber, address, address_detail, metadata.* 조회
  → 대부분 NULL (승인 시 복사 안 됨)

needsFallback = !data.phone && !data.addressDetail && !data.businessNumber
  → organizations.business_number가 항상 NULL이므로 needsFallback = true

FALLBACK #1: kpa_pharmacy_requests 조회 (approved, 최신)
  → pharmacy_phone → data.phone
  → business_number → data.businessNumber
  → owner_phone → data.ownerPhone
  → tax_invoice_email → data.taxInvoiceEmail
  (단, 경로 B 사용자는 kpa_pharmacy_requests 레코드 없음 → 결과 없음)

FALLBACK #2: users."businessInfo" 조회 (조건: !data.phone || !data.addressDetail)
  → biz.phone → data.phone
  → biz.ceoName → data.ceoName
  → biz.contactName → data.contactName
  → biz.managerPhone → data.managerPhone
  → biz.storeAddress → data.addressDetail
  ❌ taxInvoiceEmail 복사 없음
  ❌ businessNumber 복사 없음
  ❌ ownerPhone 복사 없음
  ❌ 레거시 address/address2 → addressDetail 변환 없음
```

---

## 6. 경로별 /store/info 표시 결과

### 경로 A (pharmacy-request → approve)

| 필드 | PRIMARY | Fallback #1 | 최종 결과 |
|------|---------|-------------|----------|
| 약국명 | ✅ (name) | — | ✅ |
| 사업자번호 | ❌ NULL | ✅ business_number | ✅ |
| 약국 전화 | ❌ NULL | ✅ pharmacy_phone | ✅ |
| 개설자 연락처 | ❌ NULL | ✅ owner_phone | ✅ |
| 세금계산서 이메일 | ❌ NULL | ✅ tax_invoice_email | ✅ |
| 주소 | ❌ NULL | ❌ (없음) | ❌ **공백** |
| 대표자명 | ❌ NULL | ❌ (없음) | ❌ **공백** |
| 담당자명 | ❌ NULL | ❌ (없음) | ❌ **공백** |

> 경로 A도 주소/대표자명/담당자명이 비어 있으나, 전화/사업자번호/이메일은 채워짐.

### 경로 B (member.controller → status=active)

| 필드 | PRIMARY | Fallback #1 | Fallback #2 | 최종 결과 |
|------|---------|-------------|-------------|----------|
| 약국명 | ✅ (name) | — | — | ✅ |
| 사업자번호 | ❌ NULL | ❌ (레코드 없음) | ❌ (복사 안 함) | ❌ **공백** |
| 약국 전화 | ❌ NULL | ❌ | biz.phone (≠ pharmacy_phone) | ⚠️ 대표전화로 부분 채움 |
| 개설자 연락처 | ❌ NULL | ❌ | ❌ (복사 안 함) | ❌ **공백** |
| 세금계산서 이메일 | ❌ NULL | ❌ | ❌ (복사 안 함) | ❌ **공백** |
| 주소 | ❌ NULL | ❌ | biz.storeAddress (구조화 주소 있으면) | ⚠️ 조건부 |
| 대표자명 | ❌ NULL | ❌ | biz.ceoName | ✅ (있으면) |
| 담당자명 | ❌ NULL | ❌ | biz.contactName | ✅ (있으면) |

> **`renagang21@gmail.com` 계정은 경로 B 사용자** — 사업자번호, 세금계산서 이메일, 개설자 연락처가 공백.

---

## 7. 주소 구조 불일치

| 저장소 | 구조 |
|--------|------|
| users.businessInfo | `storeAddress: { zipCode, baseAddress, detailAddress }` (신규) 또는 `zipCode / address / address2` (레거시 평문) |
| kpa_members | `pharmacy_address: string` (단일 평문) |
| organizations.address | `varchar(500)` (평문) |
| organizations.address_detail | `jsonb: { zipCode, baseAddress, detailAddress, region }` |
| /store/info 화면 | zipCode + baseAddress + detailAddress 분리 표시 |
| 운영자 뷰 | 단일 평문 string |

**문제:**
- 가입 시 구조화 주소(`storeAddress`)로 저장한 경우 → `/store/info` 표시 가능 (Fallback #2 경유)
- 레거시 `address`/`address2` 필드만 있는 계정 → Fallback #2에서 `biz.address` 미처리 → **주소도 공백**
- 어떤 경로에서도 `kpa_members.pharmacy_address`(평문)는 `/store/info`에 사용되지 않음

---

## 8. 구조 불일치 정리

```
운영자 뷰 데이터 소스 ← users.businessInfo (JSONB)  ─┐
                                                       │ 서로 다른 소스
/store/info 데이터 소스 ← organizations 테이블 (주) ──┘
                          + kpa_pharmacy_requests (Fallback #1)
                          + users.businessInfo (Fallback #2, 불완전)
```

| 항목 | 운영자 뷰 | /store/info |
|------|----------|-------------|
| 약국 전화 | `businessInfo.metadata.pharmacy_phone` | `org.phone` → Fallback: `biz.phone` (다른 필드) |
| 주소 | `businessInfo.address` + `address2` (평문) | `org.address_detail` (구조화) |
| 사업자번호 | `businessInfo.businessNumber` | `org.business_number` → Fallback #1만 |
| 세금계산서 이메일 | `businessInfo.taxInvoiceEmail` | `org.metadata.taxInvoiceEmail` → Fallback #1만 |

---

## 9. Canonical 저장소 판단

현재 **canonical SSOT가 없다**. 구조적으로 `organizations` 테이블이 SSOT로 설계되었으나 실제로는 비어 있다.

| 저장소 | 역할 | 현재 상태 |
|--------|------|----------|
| `kpa_pharmacy_requests` | 신청 원본 데이터 (경로 A) | 경로 A의 사실상 SSOT |
| `users.businessInfo` | 가입 시 사용자 입력값 | 경로 B의 사실상 SSOT, 운영자 뷰 소스 |
| `organizations` | 공식 SSOT (설계 의도) | 실제로는 name/code/type만 채워짐 |
| `kpa_members` | KPA 회원 프로필 | 약국명, 주소 평문 별도 보관 |

---

## 10. 현재 구조의 문제점

1. **승인 시 organization 필드 복사 누락** — 가장 근본적 원인. `ensureOrganization()` 호출 시 phone, business_number, address, metadata를 전달하지 않아 organizations 테이블이 항상 부분 채움 상태.

2. **Fallback #2의 불완전한 필드 복사** — `taxInvoiceEmail`, `businessNumber`, `ownerPhone`이 `users.businessInfo`에 있어도 Fallback #2에서 복사되지 않음.

3. **약국 전화번호 필드 불일치** — 운영자 뷰는 `metadata.pharmacy_phone`, /store/info Fallback은 `biz.phone` (대표전화) 사용. 같은 번호가 아닐 수 있음.

4. **경로 B 사용자는 Fallback #1 작동 불가** — `kpa_pharmacy_requests` 레코드가 없어 결정적 필드들이 항상 누락.

5. **레거시 주소 미지원** — `biz.address`/`biz.address2` → `addressDetail` 변환 로직 없음.

6. **`needsFallback` 조건이 의도와 다르게 동작** — `business_number`가 organizations에 저장되지 않으므로 fallback 조건이 항상 true. 의도는 "organization에 정보가 있으면 fallback 건너뜀"이었겠지만 실제로는 항상 fallback 진입.

7. **`kpa_members.pharmacy_address` 미활용** — 이 필드에 주소가 있어도 /store/info에서 사용하지 않음.

---

## 11. 기존 데이터 보정 필요 여부

**필요.** 이미 승인된 계정들의 `organizations` 테이블에 약국 정보가 누락되어 있다.

Backfill 우선순위:
- **P1 — organizations.business_number 보정:** `kpa_pharmacy_requests` 또는 `users.businessInfo`에서 JOIN하여 채움
- **P1 — organizations.phone 보정:** `kpa_pharmacy_requests.pharmacy_phone` 또는 `businessInfo.metadata.pharmacy_phone`
- **P1 — organizations.metadata 보정:** `taxInvoiceEmail`, `ownerPhone`, `ceoName`, `contactName`, `managerPhone`
- **P2 — organizations.address/address_detail 보정:** 주소 구조화 변환 포함

---

## 12. 수정 권장 방향 (구현 제안, 실제 수정 아님)

### 12-1. 근본 수정 — 승인 시 organization 필드 채우기

두 승인 경로 모두 `ensureOrganization` 이후 별도 UPDATE를 추가:

```typescript
// 경로 A (pharmacy-request.controller.ts)
await dataSource.query(
  `UPDATE organizations SET
     phone = $1,
     business_number = $2,
     metadata = metadata || $3::jsonb
   WHERE id = $4`,
  [
    request.pharmacy_phone,
    request.business_number,
    JSON.stringify({
      ownerPhone: request.owner_phone,
      taxInvoiceEmail: request.tax_invoice_email,
    }),
    orgResult.id,
  ]
);

// 경로 B (member.controller.ts)
// biz = users.businessInfo
await dataSource.query(
  `UPDATE organizations SET
     phone = $1,
     business_number = $2,
     metadata = metadata || $3::jsonb
   WHERE id = $4`,
  [
    biz.metadata?.pharmacy_phone ?? biz.phone,
    biz.businessNumber,
    JSON.stringify({
      taxInvoiceEmail: biz.taxInvoiceEmail,
      ceoName: biz.ceoName,
      contactName: biz.contactName,
      managerPhone: biz.managerPhone,
    }),
    orgResult.id,
  ]
);
```

### 12-2. Fallback #2 보완

`pharmacy-info.controller.ts` Fallback #2에 누락 필드 추가:

```typescript
if (!data.taxInvoiceEmail && biz.taxInvoiceEmail) data.taxInvoiceEmail = biz.taxInvoiceEmail;
if (!data.businessNumber && biz.businessNumber) data.businessNumber = biz.businessNumber;
// 레거시 주소 지원
if (!data.addressDetail && !data.address && biz.address) {
  data.address = [biz.address, biz.address2].filter(Boolean).join(' ');
}
```

### 12-3. Backfill Migration

```sql
-- organizations.business_number 보정 (경로 A)
UPDATE organizations o
SET business_number = pr.business_number
FROM kpa_pharmacy_requests pr
JOIN organization_members om ON om.user_id = pr.user_id AND om.role = 'owner'
WHERE om.organization_id = o.id
  AND o.business_number IS NULL
  AND pr.status = 'approved';

-- organizations.business_number 보정 (경로 B, businessInfo)
UPDATE organizations o
SET business_number = (u."businessInfo"->>'businessNumber')
FROM organization_members om
JOIN users u ON u.id = om.user_id
WHERE om.organization_id = o.id
  AND om.role = 'owner'
  AND o.business_number IS NULL
  AND u."businessInfo"->>'businessNumber' IS NOT NULL;
```

### 12-4. 중장기 — SSOT 명확화

`organizations` 테이블을 진정한 SSOT로 만들고, 운영자 뷰도 동일 소스에서 읽도록 통일. `users.businessInfo`는 가입 원본 데이터 보관용으로만 사용.

---

## 13. 브라우저 검증 계획

실제 브라우저 검증이 필요한 항목:

| 순서 | 항목 | 확인 포인트 |
|------|------|------------|
| 1 | 신규 약국 경영자 가입 (경로 A: pharmacy-request) | POST `/kpa/pharmacy-requests` 응답 확인 |
| 2 | 가입 신청 데이터 확인 | 운영자 화면에서 상세정보 표시 여부 |
| 3 | 승인 후 /store/info 확인 | 어떤 필드가 채워지고 비어 있는지 |
| 4 | 경로 B (member.controller 경유) 계정 /store/info | renagang21@gmail.com 계정으로 직접 확인 |
| 5 | 수정 저장 후 새로고침 | 저장 후 `/store/info` 재조회 시 유지 여부 |

> 브라우저 검증은 별도 WO에서 수정 후 진행 예정.

---

## 14. 영향받는 파일 목록

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts` | 경로 A 승인 — organization 필드 미복사 |
| `apps/api-server/src/routes/kpa/controllers/member.controller.ts` | 경로 B 승인 — organization 필드 미복사 |
| `apps/api-server/src/modules/organization/services/organization-ops.service.ts` | ensureOrganization — business_number 등 컬럼 미포함 |
| `apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts` | /store/info — Fallback #2 불완전 |
| `apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts` | 경로 A 신청 데이터 (주소 컬럼 없음) |
| `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts` | organizations — 필드 정의 |
| `apps/api-server/src/types/user.ts` | users.businessInfo 타입 |
| `services/web-kpa-society/src/pages/pharmacy/PharmacyInfoPage.tsx` | /store/info 프론트엔드 |
| `services/web-kpa-society/src/api/pharmacyInfo.ts` | /pharmacy/info API 클라이언트 |

---

*본 IR은 코드 정적 분석 기반이며 실제 수정은 포함하지 않습니다.*  
*후속 작업: WO-O4O-KPA-STORE-INFO-PHARMACY-OWNER-DATA-FIX-V1 생성 권장*
