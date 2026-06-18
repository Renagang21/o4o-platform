# IR-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** 4서비스 사업자 가입/정보수정/운영자 화면의 연락처 3종(회사전화/회사이메일/담당자이메일) 존재·저장·표시.
> **핵심 결론: 3종 중 `businessPhone`(회사전화)만 GlycoPharm/K-Cosmetics 정보수정·mypage 경로에 단편 존재(가입·operator·Neture/KPA 부재). 회사이메일은 전 서비스 부재. 담당자이메일은 Neture supplier 의 '외부 공개 연락처'(다른 의미)로만 존재.** 백엔드는 `users.businessInfo` JSONB schema-less → **migration 불요**, DTO+register 저장+account white-list+서비스별 mypage 확장만 필요. Neture supplier 는 `neture_suppliers` entity 사용(businessInfo 아님) — 별도 경로.
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-SIGNUP-FIELD-AUDIT-V1 §11.3(연락처 3필드 전 서비스 부재 — 본 IR 정밀화)

---

## 1. 목적

4서비스 사업자 가입/정보수정/운영자 검토 화면에서 연락처 3종이 어디에 있고 없는지, 저장 경로·운영자 표시까지 read-only 확정한다. 의미 분리: 기존 `phone`(개인 휴대폰) / `contactPhone`·`managerPhone`(담당자 전화) / `taxInvoiceEmail`(세금계산서)은 본 3종과 다른 필드다.

대상 3종(후보 canonical 키):
1. 회사전화/사업장전화 — `businessPhone` (일부 기존)
2. 회사이메일/대표업무이메일 — `businessEmail` (신규)
3. 담당자 이메일 — `contactEmail` (신규 in businessInfo)

## 2. 화면별 현황 (실측)

| 화면 | 회사전화 | 회사이메일 | 담당자이메일 | 목적 |
|------|:---:|:---:|:---:|------|
| Neture RegisterModal (supplier/partner 가입) | ❌ | ❌ | ❌ | 가입 |
| Neture SupplierProfilePage (정보수정) | ❌ | ❌ | ⚠️ `contactEmail`(외부 공개 연락처 — 담당자 의미 아님) | profile |
| Neture operator supplier 승인/목록 | ❌ | ❌ | ❌ | 운영자검토 |
| GlycoPharm RegisterFlowModal (가입) | ❌ | ❌ | ❌ | 가입 |
| GlycoPharm PharmacyInfoPage (정보수정) | ✅ `businessPhone` | ❌ | ❌ | 정보수정 |
| GlycoPharm operator ApplicationDetail | ❌ | ❌ | ❌ | 운영자검토 |
| K-Cosmetics RegisterPage (가입) | ❌ | ❌ | ❌ | 가입 |
| K-Cosmetics StoreInfoPage (정보수정) | ✅ `businessPhone` | ❌ | ❌ | 정보수정 |
| K-Cosmetics operator (CommonEditUserModal) | ❌ | ❌ | ❌ | 운영자검토 |
| KPA RegisterModal (개설약사 가입) | ❌(pharmacyPhone=근무처, 별개) | ❌ | ❌ | 가입 |
| KPA PharmacyInfoPage (정보수정) | ❌(phone=약국, ownerPhone=개설자, 별개) | ❌ | ❌ | 정보수정 |
| KPA operator (KpaEditUserModal) | ❌ | ❌ | ❌ | 운영자검토 |

## 3. 서비스 단위 판정

| 서비스 | 판정 | 근거 |
|--------|:---:|------|
| Neture | **FAIL** | 가입 0, 정보수정의 contactEmail 은 '외부 공개 연락처'(다른 의미), operator 0 |
| GlycoPharm | **PARTIAL** | businessPhone 만 정보수정/mypage. 가입·operator·회사이메일·담당자이메일 0 |
| K-Cosmetics | **PARTIAL** | businessPhone 만 정보수정/mypage. 나머지 0 |
| KPA | **FAIL** | 3종 전부 0 (pharmacyPhone/ownerPhone 은 별개 개념) |

→ **회사전화(businessPhone)는 GP/KCos 정보수정 경로에만 단편 존재**(가입·operator·Neture/KPA 부재). **회사이메일은 전 서비스 부재. 담당자이메일은 사실상 부재**(Neture 의 contactEmail 은 의미 상이).

## 4. 백엔드 수용 현황 (실측)

| 키 | register.dto | register 저장 | account PATCH white-list | GP/KCos mypage | Neture supplier | operator 응답 |
|----|:---:|:---:|:---:|:---:|:---:|:---:|
| `businessPhone` | ❌ | ❌ | ❌ | ✅ read/write | ❌ | ❌ |
| `businessEmail`(회사) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `contactEmail`(담당자) | ❌ | ❌ | ❌ | ❌ | ✅ neture_suppliers | ❌(businessInfo 미노출) |

- `users.businessInfo` 는 **schema-less JSONB**(`types/user.ts BusinessInfo` 인터페이스는 문서용) → **새 키 추가 시 migration 불요**.
- 단 실제 저장/수정은 **white-list 강제**: `auth-account.controller` allowedFields, 서비스별 mypage 컨트롤러 projection/PATCH white-list 확장 필요.
- `businessPhone` 은 GlycoPharm/K-Cosmetics **mypage 컨트롤러**에서만 read/write(공통 auth 경로엔 없음) → 서비스 단편화.
- **Neture supplier 는 `neture_suppliers` entity 컬럼**(contactEmail/contactPhone) 사용 — `users.businessInfo` 와 별도 경로. 연락처 보강 시 Neture supplier 만 별도 처리 필요.

## 5. 명칭 판단 (canonical 권장)

| 의미 | 권장 키 | 근거 |
|------|--------|------|
| 회사/사업장 전화 | **`businessPhone`** | GP/KCos 이미 사용 — 신규 `companyPhone` 도입 금지(중복 키 drift) |
| 회사/대표 업무 이메일 | **`businessEmail`** | businessPhone/businessAddress 명명 일관 |
| 담당자 이메일 | **`contactEmail`** | contactName(담당자명)/contactPhone 와 짝. **단 Neture supplier 의 외부 공개 contactEmail(neture_suppliers)과 의미 충돌 주의** — businessInfo 의 담당자 contactEmail 과 구분 문서화 필요 |

## 6. 후속 WO 후보 / 우선순위

### 1순위 — 백엔드 저장/응답 지원
`WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1`
- register.dto 에 businessPhone/businessEmail/contactEmail 추가, register 저장, auth-account white-list + GP/KCos mypage white-list/projection 확장, operator 상세 응답 노출. **migration 0**(JSONB).
- 가드: `companyPhone` 신규 키 금지(businessPhone 재사용). Neture supplier 는 neture_suppliers 경로 별도.

### 2순위 — Neture supplier UI 보강
`WO-O4O-NETURE-SUPPLIER-CONTACT-FIELDS-EXTEND-V1`
- Neture supplier 가입/프로필에 3종 입력 추가. **Neture supplier 저장은 neture_suppliers entity** 이므로 backend 경로가 다름 — 1순위와 별개 처리.

### 3순위 — 4서비스 UI + operator 정렬
`WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-UI-ALIGNMENT-V1`
- GlycoPharm/K-Cosmetics/KPA 가입·정보수정 UI + operator 검토 표시 정렬. KPA pharmacyPhone/ownerPhone 과 의미 구분.

**권장 순서:** 1(backend) → 2(Neture supplier) → 3(cross-service UI) → (그 다음) 주소 정렬 중규모 WO.

## 7. 비범위

- 코드 수정 / DB migration / 기존 연락처 필드(phone/managerPhone/taxInvoiceEmail) 변경 / 주소 정렬 / 가입 정책 변경.

## 8. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만 (프로덕션 DB 미조회)
✅ 산출물 = 본 문서 1개(path-specific), 동시 세션 파일 무간섭
```

---

*read-only · 연락처 3종: businessPhone=GP/KCos 정보수정/mypage 단편(가입·operator·Neture/KPA 부재) · businessEmail=전 서비스 부재 · contactEmail=Neture supplier 외부공개용(의미 상이)만 · businessInfo JSONB schema-less→migration 불요, white-list 확장 필요 · Neture supplier=neture_suppliers entity 별도 경로 · canonical=businessPhone(재사용)/businessEmail/contactEmail · 후속 1=backend support, 2=Neture supplier UI, 3=cross-service UI.*
