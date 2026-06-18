# CHECK-O4O-GLYCOPHARM-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1

> **작업명:** WO-O4O-GLYCOPHARM-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1
> **유형:** GlycoPharm frontend UI — 약국 경영자 가입/정보수정 화면에 사업자 연락처 3종(businessPhone/businessEmail/contactEmail) 정렬.
> **결과: PASS — 가입(RegisterFlowModal) 에 3종 입력 추가 + 정보수정(PharmacyInfoPage) 에 businessEmail/contactEmail 추가(businessPhone 기존 유지). 모두 `users.businessInfo` 경로(백엔드 mypage controller·register 기수용). frontend 3파일. backend/migration 0. web-glycopharm `tsc -b --noEmit` 통과.**
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-AUDIT-V1 · WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1

---

## 1. 저장 경로 확정 (선행 조사 — 코드 실측)

| 화면 | 엔드포인트 | 3종 수용 | migration |
|------|-----------|:---:|:---:|
| **가입** RegisterFlowModal (pharmacy_owner) | `POST /auth/register` (role=pharmacy) | register 컨트롤러가 businessPhone/businessEmail/contactEmail → `users.businessInfo` 저장(auth-register.controller.ts:392-401) | **불요** |
| **정보수정** PharmacyInfoPage | `GET/PATCH /glycopharm/mypage/business-info` | mypage 컨트롤러 GET projection(line 188-191) + PATCH white-list·email 검증(line 243-275) 에 3종 기존재 | **불요** |

- 3종 모두 `users.businessInfo` JSONB(schema-less) 경로 — **선행 backend WO 가 이미 수용·검증**. 본 WO 는 frontend UI/타입만 연결.
- DTO `register.dto.ts` 의 businessEmail/contactEmail 은 `@IsEmail` → **빈 문자열 거절** → 가입 payload 는 **비어있지 않을 때만 조건부 전송**(기존 businessItem 패턴).

## 2. 변경 (3파일, frontend-only)

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/api/mypage.ts` | `PharmacyBusinessInfo` + `UpdatePharmacyBusinessInfoPayload` 에 `businessEmail`/`contactEmail` 추가 |
| `services/web-glycopharm/src/pages/store/PharmacyInfoPage.tsx` | FormState/EMPTY_FORM/dataToForm 에 2종 추가 · validate() 이메일 형식 검증 2건 · payload 2종 · 수정모드 Field 2개(약국 대표 이메일/담당자 이메일, 사업장 전화번호 다음) · 조회모드 ViewRow 2개. **businessPhone 기존 유지(무변경)** |
| `services/web-glycopharm/src/pages/auth/RegisterFlowModal.tsx` | formData(init+reset) 에 businessPhone/businessEmail/contactEmail 추가 · numericFields 에 businessPhone 추가 · pharmacy_owner payload 조건부 spread 3종 · pharmacy_owner 분기 UI 입력 3개(약국 전화/약국 대표 이메일/담당자 이메일, 세금계산서 이메일 다음) |

- 기존 흐름 무변경 유지: pharmacist 분기 / 약국명(businessName) / 대표자명 / 사업자등록번호 / 면허번호 / 세금계산서 이메일(taxEmail) / BusinessRegistrationFields / AddressSearch / 약관 동의.
- 3종 모두 **선택(optional)** — 가입 step3 필수 게이트(약국명/대표자명/사업자번호10자리/세금계산서이메일/약관) **무변경**.
- backend / DTO / mypage controller / operator UI / 타 서비스 **무변경**.

## 3. 필드 매핑

| 화면·라벨 | 키 | 저장 |
|-----------|----|------|
| 가입: 약국 전화 / 정보수정: 사업장 전화번호 | `businessPhone` (숫자만) | users.businessInfo.businessPhone |
| 약국 대표 이메일 | `businessEmail` | users.businessInfo.businessEmail |
| 담당자 이메일 | `contactEmail` | users.businessInfo.contactEmail |

- 의미 분리 유지: `phone`(개인 휴대폰, step1) / `taxEmail→taxInvoiceEmail`(세금계산서) 와 무관. GlycoPharm 에는 Neture supplier 의 `neture_suppliers.contactEmail`(외부공개) 같은 **별도 entity 충돌 없음** — businessInfo 단일 경로라 의미 충돌 자체가 없다.

## 4. 검증

- `web-glycopharm` `npx tsc -b --noEmit` → **exit 0**.
  - ⚠️ web-glycopharm 은 project-references(`files:[]`) 패턴 → `tsc --noEmit` 단독은 검사 대상 0. **반드시 `tsc -b`** 사용(메모리 LESSON 준수).
- backend 미수정 → api-server type-check 불요(선행 WO 에서 수용·검증).
- migration 신규 생성 **0**.
- 가입 payload: pharmacy_owner 분기에 businessPhone/businessEmail/contactEmail 조건부 포함(빈 값 미전송 → @IsEmail 무손상).
- 정보수정 GET/PATCH: businessPhone(기존)+businessEmail+contactEmail round-trip — mypage 컨트롤러가 동일 키 read/write.
- 변경 = frontend 3파일 + 본 CHECK. backend/DTO/schema/operator/타서비스 0.

## 5. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| 가입 화면(약국 경영자)에서 회사전화/회사이메일/담당자이메일 입력 가능 | ✅ |
| 정보수정 화면에서 businessPhone 유지 + businessEmail/contactEmail 추가 | ✅ |
| 빈 이메일이 @IsEmail 검증을 깨지 않도록 조건부 전송 | ✅ (가입 payload 조건부) |
| 정보수정 GET/PATCH 3종 유지(무손실) | ✅ |
| backend 변경 없음 / DB migration 없음 | ✅ |
| 기존 taxInvoiceEmail/managerPhone 의미 변경 없음 | ✅ |

## 6. 비범위

- backend 변경 / DB migration / operator UI 표시 / 주소 AddressSearch 적용(정보수정) / K-Cosmetics·KPA·Neture 변경 / 기존 taxInvoiceEmail·managerPhone 의미 변경 — 전부 비범위.
- 후속: `WO-O4O-KCOSMETICS-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1`(GP와 유사) → KPA(pharmacyPhone/ownerPhone 의미 충돌 신중) → Neture supplier profile surfacing(별도 entity 충돌, 후순위).

---

*Date: 2026-06-18 · CHECK · PASS · GlycoPharm 약국 경영자 가입+정보수정 연락처 3종 정렬(users.businessInfo, 백엔드 기수용) · businessPhone 기존 유지 · businessEmail/contactEmail 추가 · 가입 payload 조건부(@IsEmail 무손상) · frontend 3파일 · tsc -b 사용 exit 0 · backend/migration 0.*
