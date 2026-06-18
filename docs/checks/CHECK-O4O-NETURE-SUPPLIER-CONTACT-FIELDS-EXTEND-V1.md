# CHECK-O4O-NETURE-SUPPLIER-CONTACT-FIELDS-EXTEND-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-CONTACT-FIELDS-EXTEND-V1
> **유형:** Neture supplier 가입 UI — 사업자 연락처 3종(회사전화/회사이메일/담당자이메일) 입력 보강.
> **결과: PASS — 가입(RegisterModal) 에 3종 입력 추가 → `users.businessInfo` 저장(백엔드 기수용, migration 0). profile(SupplierProfilePage) 은 `neture_suppliers.contactEmail`(외부공개) 등 의미 충돌로 surfacing 보류 — 후속 판정 본 CHECK §4 에 기록. frontend 1파일 + 본 CHECK. web-neture tsc 통과.**
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-AUDIT-V1 · WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1

---

## 1. 저장 경로 확정 (선행 조사)

| 화면 | 엔드포인트 | 저장 위치 | migration |
|------|-----------|----------|:---:|
| **가입** RegisterModal (supplier) | `POST /auth/register` | `users.businessInfo` JSONB (schema-less) | **불요** |
| **profile** SupplierProfilePage | `GET/PATCH /neture/supplier/profile` | `neture_suppliers` entity (+ organizations + users.businessInfo prefill) | — |

- `auth-register.controller.ts` 는 신규/기존 user 양 flow 의 businessInfo 빌드에서 `data.businessPhone`/`data.businessEmail`/`data.contactEmail` 을 이미 저장(line 211-213, 392-401) — **선행 backend WO 결과**. 본 WO 는 가입 payload 에 3종을 실어 보내기만 하면 됨.
- `register.dto.ts` 3종 모두 `@IsOptional` + (businessEmail/contactEmail 은 `@IsEmail`). **빈 문자열은 @IsEmail 거절** → payload 는 **비어있지 않을 때만 조건부 전송**(기존 `businessItem` 패턴과 동일).

## 2. 변경 (1파일, frontend-only)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/components/RegisterModal.tsx` | (1) formData 에 `businessPhone`/`businessEmail`/`contactEmail` 추가(useState init + reset effect 2곳) · (2) `handleInputChange` digit-strip 목록에 `businessPhone` 추가 · (3) supplier 가입 payload 에 3종 조건부 spread · (4) supplier 분기 UI: 대표자명 다음 **회사 전화/회사 이메일** grid, 담당자명/연락처 grid 다음 **담당자 이메일** 입력 추가 |

- 기존 supplier 사업자 정보 흐름 **무변경 유지**: 회사명 / 대표자명 / AddressSearch / 담당자명(contactName) / 담당자 연락처(contactPhone→managerPhone) / 사업자등록번호 / 세금계산서 이메일 / BusinessRegistrationFields(업태·종목·사업자유형·개업일).
- 3종 모두 **선택(optional)** — 가입 필수 게이트(`NETURE_SUPPLIER_REQUIRED_FIELDS_MISSING`: 회사명/대표자명/담당자명/담당자연락처/사업장주소) **무변경**.
- backend / DTO / neture_suppliers schema / operator UI / 타 서비스 UI **무변경**.

## 3. 가입 payload 매핑

| UI 라벨 | formData 키 | payload 키 | 저장 |
|---------|-------------|-----------|------|
| 회사 전화 | businessPhone (숫자만) | `businessPhone` | users.businessInfo.businessPhone |
| 회사 이메일 | businessEmail | `businessEmail` | users.businessInfo.businessEmail |
| 담당자 이메일 | contactEmail | `contactEmail` | users.businessInfo.contactEmail |

- 기존 의미 분리 유지: `phone`(개인 휴대폰, Step1) / `managerPhone`(담당자 전화 ← contactPhone) / `taxInvoiceEmail`(세금계산서) 와 **무관**.

## 4. profile(SupplierProfilePage) surfacing 보류 — 후속 판정 (중요)

WO 가드("두 의미가 충돌하면 무리하게 같은 컬럼에 합치지 말고 ... CHECK에 한계를 남긴다")에 따라 **profile 화면 surfacing 은 본 WO 에서 보류**한다. 3종 각각 profile 컨텍스트에서 의미 충돌/중첩이 존재한다:

| 가입 필드 | profile 충돌 대상 | 성격 |
|-----------|------------------|------|
| `contactEmail`(담당자이메일) | **Section C 외부 공개 연락처** `contactEmail` (`neture_suppliers.contact_email`, supplier.service.ts:594/667) | **같은 키·다른 의미** — getSupplierProfile 응답 키 `contactEmail` 이 외부공개용으로 점유됨. 담당자이메일 surfacing 은 별도 응답 키(예: `managerEmail`) + 별도 read/write 설계 필요. |
| `businessPhone`(회사전화) | `organizations.phone` (profile 의 Section C `contactPhone` 저장이 이미 org.phone 에 기록 — supplier.service.ts:746) | **저장처 중첩** — 회사 대표 전화 개념이 org.phone 과 이중화될 위험. |
| `businessEmail`(회사이메일) | `taxInvoiceEmail` / Section C `contactEmail` | **개념 중첩** — 업무 이메일 vs 세금계산서/외부공개 이메일 경계 미확정. |

- **무손실 확인:** 가입 시 입력한 3종은 `users.businessInfo` 에 보존되며, operator 멤버십 콘솔 상세는 `businessInfo` 전체를 반환(선행 backend CHECK §3) → **운영자는 3종 조회 가능**. profile 미노출은 "값 손실"이 아니라 "공급자 본인 편집 UI 미제공" 이다.
- **후속 WO 후보:** `WO-O4O-NETURE-SUPPLIER-PROFILE-CONTACT-FIELDS-SURFACE-V1` — profile 응답 키 충돌 해소(담당자이메일 별도 키) + businessPhone↔org.phone 단일화 정책 확정 + supplier.service getSupplierProfile/updateSupplierProfile users.businessInfo 확장(P4 fields 선례 패턴, migration 0). 본 WO 범위 외.

## 5. 검증

- `web-neture` `npx tsc --noEmit` → **exit 0**.
- backend 미수정 → api-server type-check 불요(선행 WO 에서 이미 수용·검증).
- migration 신규 생성 **0**.
- 변경 = frontend 1파일 + 본 CHECK. backend/DTO/schema/operator/타서비스 변경 0.
- 기존 supplier 가입 필수 게이트·필드 흐름 무변경(추가만).

## 6. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| Neture supplier 가입 화면에서 회사전화/회사이메일/담당자이메일 입력 가능 | ✅ |
| backend 저장 경로 확인 + 값 무손실 | ✅ (users.businessInfo, 선행 backend WO 수용 / operator 조회 가능) |
| profile 화면 의미 충돌 없이 표시·수정 가능 **또는** 충돌 시 명확한 후속 판정 CHECK 기록 | ✅ (충돌 3종 명시 + 후속 WO 후보 — §4) |
| DB migration 없이 완료 | ✅ |
| 기존 supplier 가입 흐름 무변경 | ✅ |

## 7. 비범위

- DB migration / neture_suppliers schema 변경 / operator UI / 4서비스 UI alignment / GlycoPharm·K-Cosmetics·KPA UI / 주소 정렬 / 기존 phone·contactPhone·managerPhone·taxInvoiceEmail 의미 변경 / Neture supplier 외부공개 연락처 정책 변경 — 전부 비범위.

---

*Date: 2026-06-18 · CHECK · PASS · Neture supplier 가입 연락처 3종 입력 추가(users.businessInfo, migration 0) · profile surfacing 보류(contactEmail↔외부공개 / businessPhone↔org.phone / businessEmail↔taxInvoiceEmail 충돌) → 후속 WO · frontend 1파일 · web-neture tsc exit 0.*
