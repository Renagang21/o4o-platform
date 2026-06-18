# CHECK-O4O-KCOSMETICS-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1

> **작업명:** WO-O4O-KCOSMETICS-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1
> **유형:** K-Cosmetics frontend UI — 판매자 가입/매장 정보수정 화면에 사업자 연락처 3종(businessPhone/businessEmail/contactEmail) 정렬.
> **결과: PASS — 가입(RegisterPage) 판매자 분기에 3종 입력 추가 + 매장 정보수정(StoreInfoPage) 에 businessEmail/contactEmail 추가(businessPhone 기존 유지). 모두 `users.businessInfo` 경로(register + cosmetics-mypage controller 기수용). frontend 3파일. backend/migration 0. web-k-cosmetics `tsc --noEmit` 통과.**
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-AUDIT-V1 · WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1 · WO-O4O-GLYCOPHARM-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1

---

## 1. 저장 경로 확정 (선행 조사 — 코드 실측)

| 화면 | 엔드포인트 | 3종 수용 | migration |
|------|-----------|:---:|:---:|
| **가입** RegisterPage (seller) | `POST /auth/register` (role=seller→cosmetics:store_owner 정규화) | register 컨트롤러가 businessPhone/businessEmail/contactEmail → `users.businessInfo` 저장(auth-register.controller.ts:392-401) | **불요** |
| **정보수정** StoreInfoPage | `GET/PATCH /cosmetics/mypage/business-info` | cosmetics-mypage 컨트롤러 `projectBusinessInfo`(line 67-69) + PATCH white-list·email 검증(line 179-189) 에 3종 기존재 | **불요** |

- 3종 모두 `users.businessInfo` JSONB(schema-less) 경로 — **선행 backend WO 가 이미 수용·검증**. 본 WO 는 frontend UI/타입만 연결.
- DTO `register.dto.ts` 의 businessEmail/contactEmail 은 `@IsEmail` → **빈 문자열 거절** → 가입 payload 는 **비어있지 않을 때만 조건부 전송**(기존 businessItem 패턴, GlycoPharm WO 와 동일).

## 2. 변경 (3파일, frontend-only)

| 파일 | 변경 |
|------|------|
| `services/web-k-cosmetics/src/api/mypage.ts` | `CosmeticsBusinessInfo` + `UpdateCosmeticsBusinessInfoPayload` 에 `businessEmail`/`contactEmail` 추가 (백엔드 응답에 이미 존재하던 키를 FE 타입에 정렬) |
| `services/web-k-cosmetics/src/pages/store/StoreInfoPage.tsx` | FormState/EMPTY_FORM/dataToForm 에 2종 추가 · validate() 이메일 형식 검증 2건 · payload 2종 · 수정모드 Field 2개(회사 대표 이메일/담당자 이메일, 사업장 전화번호 다음) · 조회모드 ViewRow 2개. **businessPhone 기존 유지(무변경)** |
| `services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx` | formData 에 businessPhone/businessEmail/contactEmail 추가 · handleInputChange digit-strip 에 businessPhone 추가 · payload 조건부 spread 3종 · seller 사업자 정보 섹션 UI 입력 3개(회사/매장 전화·회사 대표 이메일·담당자 이메일, 사업자등록번호 다음) |

- 기존 흐름 무변경 유지: consumer 분기 / 상호명(businessName) / 사업자등록번호 / BusinessRegistrationFields / 약관 동의.
- 3종 모두 **선택(optional)** — 가입 필수 검증(`isFormValid`: 이메일/이름/닉네임/휴대폰/약관) **무변경**(사업자 필드는 기존에도 비필수).
- backend / DTO / cosmetics-mypage controller / operator UI / seller·store_owner 권한 정책 / 타 서비스 **무변경**.

## 3. 필드 매핑

| 화면·라벨 | 키 | 저장 |
|-----------|----|------|
| 가입: 회사/매장 전화 / 정보수정: 사업장 전화번호 | `businessPhone` (숫자만) | users.businessInfo.businessPhone |
| 회사 대표 이메일 | `businessEmail` | users.businessInfo.businessEmail |
| 담당자 이메일 | `contactEmail` | users.businessInfo.contactEmail |

- 의미 분리 유지: `phone`(개인 휴대폰, step1) / `taxInvoiceEmail`(세금계산서) 와 무관. K-Cosmetics 는 businessInfo 단일 경로라 별도 entity 의미 충돌 없음(Neture supplier 와 차이).

## 4. 검증

- `web-k-cosmetics` `npx tsc --noEmit` → **exit 0**.
  - web-k-cosmetics 는 direct-include 패턴(메모리 LESSON: KPA/KCos/siteguide/neture 는 `tsc --noEmit` 안전).
- backend 미수정 → api-server type-check 불요(선행 WO 에서 수용·검증).
- migration 신규 생성 **0**.
- 가입 payload: businessPhone/businessEmail/contactEmail 조건부 포함(빈 값 미전송 → @IsEmail 무손상). consumer 는 미입력 → 미전송.
- 정보수정 GET/PATCH: businessPhone(기존)+businessEmail+contactEmail round-trip — `projectBusinessInfo` 동일 키 read/write.
- 변경 = frontend 3파일 + 본 CHECK. backend/DTO/schema/operator/권한정책/타서비스 0.

## 5. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| 가입 화면(판매자)에서 회사전화/회사이메일/담당자이메일 입력 가능 | ✅ |
| 매장 정보수정 화면에서 3종 조회/수정 가능 | ✅ (조회모드 ViewRow + 수정모드 Field) |
| 기존 businessPhone 동작 유지 | ✅ |
| backend/migration 없이 frontend/type 연결만으로 완료 | ✅ |
| 기존 판매자 가입 및 매장 정보 흐름 무변경 | ✅ |

## 6. 비범위

- backend 변경 / DB migration / operator UI 표시 / 주소 AddressSearch 정렬 / GlycoPharm·KPA·Neture 변경 / 기존 phone·taxInvoiceEmail·contactPhone 의미 변경 / seller·store_owner 권한 정책 변경 — 전부 비범위.
- 후속: KPA(pharmacyPhone/ownerPhone 의미 충돌 — businessPhone 신규 부착 vs 기존 약국 전화 정렬 선판단 필요, 신중) → Neture supplier profile surfacing(별도 entity 충돌, 후순위).

---

*Date: 2026-06-18 · CHECK · PASS · K-Cosmetics 판매자 가입+매장 정보수정 연락처 3종 정렬(users.businessInfo, 백엔드 기수용) · businessPhone 기존 유지 · businessEmail/contactEmail 추가 · 가입 payload 조건부(@IsEmail 무손상) · frontend 3파일 · tsc --noEmit exit 0 · backend/migration 0.*
