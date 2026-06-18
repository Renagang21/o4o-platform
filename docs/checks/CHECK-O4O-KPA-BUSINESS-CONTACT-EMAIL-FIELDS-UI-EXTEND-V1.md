# CHECK-O4O-KPA-BUSINESS-CONTACT-EMAIL-FIELDS-UI-EXTEND-V1

> **작업명:** WO-O4O-KPA-BUSINESS-CONTACT-EMAIL-FIELDS-UI-EXTEND-V1
> **유형:** KPA 개설약사 가입/약국 정보수정 — 사업자 연락처 **이메일 2종**(businessEmail/contactEmail) 추가. **businessPhone 제외**(pharmacyPhone 재사용). backend 포함.
> **결과: PASS — pharmacy-info 컨트롤러 GET/PUT 에 2종(org.metadata SSOT) + pharmacyInfo.ts 타입 + PharmacyInfoPage(조회/수정) + RegisterModal(개설약사 가입) 추가. DB migration 0. web-kpa-society tsc 통과. api-server tsc 내 변경 신규 에러 0(기존 무관 1건 제외).**
> 선행: IR-O4O-KPA-BUSINESS-CONTACT-FIELDS-MAPPING-AUDIT-V1 · WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1 · WO-O4O-GLYCOPHARM-… · WO-O4O-KCOSMETICS-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1

---

## 1. 결정 (IR 기반)

| 항목 | 결정 |
|------|------|
| `businessPhone` 신규 추가 | **금지** — KPA `pharmacyPhone`(=org.phone, "약국 전화번호")이 이미 사업장 전화 |
| 사업장 전화 | 기존 `pharmacyPhone` 유지 (무변경) |
| `ownerPhone` / `users.phone` / `managerPhone` | 개인/기존 의미 유지 (무변경) |
| `businessEmail`(약국 대표 업무 이메일) | **신규 추가** |
| `contactEmail`(담당자 이메일) | **신규 추가** |
| SSOT | **`organizations.metadata`** (taxInvoiceEmail/ownerPhone 선례와 동일 축) |
| `taxInvoiceEmail` | 세금계산서 의미 유지 — businessEmail 과 혼동/병합 금지 |
| DB migration | 불요 (metadata JSONB) |

## 2. 변경 (4파일 + CHECK)

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../o4o-store/controllers/pharmacy-info.controller.ts` | (a) `PharmacyInfoResponse` 인터페이스 + GET projection 에 businessEmail/contactEmail(`meta.*`) · (b) PUT 이메일 형식 검증 2건 · (c) `org.metadata` merge — **조건부**(`'key' in body`일 때만 → 미포함 시 기존 값 보존) · (d) PUT 응답 객체에 2종 |
| `services/web-kpa-society/src/api/pharmacyInfo.ts` | `PharmacyInfoData` + `UpdatePharmacyInfoPayload` 에 businessEmail/contactEmail |
| `services/web-kpa-society/src/pages/pharmacy/PharmacyInfoPage.tsx` | FormState/초기값/dataToForm + validate(이메일 형식 2) + payload + 수정모드 input 2 + 조회모드 row 2 (세금계산서 이메일 다음) |
| `services/web-kpa-society/src/components/RegisterModal.tsx` | 개설약사(pharmacy_owner) formData(2곳) + payload 조건부(@IsEmail 무손상) + UI 입력 2 (세금계산서 이메일 다음) |

- 기존 무변경 유지: pharmacyPhone("약국 전화") / ownerPhone("개설자 연락처") / managerPhone("담당자 전화") / taxInvoiceEmail("세금계산서") / ceoName / contactName / 주소 / P2·P4.
- 2종 모두 **선택(optional)**. 가입 필수 게이트(약국명/사업자번호10자리/대표자명/사업장주소) **무변경**.

## 3. 저장 경로 (이중 경로 — 기존 패턴 준수, CHECK 명시)

| 입력 화면 | 엔드포인트 | 저장 위치 |
|-----------|-----------|----------|
| **가입** RegisterModal(개설약사) | `POST /auth/register` | `users.businessInfo` (DTO @IsEmail 기수용) |
| **정보수정** PharmacyInfoPage | `GET/PUT /pharmacy/info` | **`organizations.metadata`** (SSOT for edit surface) |

- 이 이중 경로는 **기존 `taxInvoiceEmail`/`ceoName` 과 동일한 구조**다(가입→users.businessInfo, 정보수정→org.metadata). 본 WO 는 새 drift 를 만들지 않고 기존 패턴을 그대로 따른다.
- 정보수정 화면의 SSOT 는 `org.metadata` 로 확정(IR 권고). 가입 시 입력값은 users.businessInfo 에 보존되며 operator 멤버십 콘솔(businessInfo 전체 반환)에서 조회 가능 — 값 손실 없음.
- pharmacy_request 승인 경로(org.metadata 동기화)는 **본 WO 비범위** — 기존 taxInvoiceEmail/ownerPhone 만 동기화. businessEmail/contactEmail 의 가입→org.metadata 자동 동기화가 필요해지면 별도 WO.

## 4. 검증

- `web-kpa-society` `npx tsc --noEmit` → **exit 0** (direct-include 패턴 — 유효).
- `api-server` `npm run type-check` → 내 변경 파일(pharmacy-info.controller.ts) **신규 에러 0**. 전체 1건 에러는 `marketTrial/marketTrialController.ts`(무관 모듈) — `git stash` 비교로 **pre-existing 확정**(stash 전후 모두 1건).
- migration 신규 생성 **0** (org.metadata JSONB merge).
- 가입 payload: businessEmail/contactEmail 조건부(빈 값 미전송 → @IsEmail 무손상).
- pharmacy-info GET/PUT: businessEmail/contactEmail round-trip(org.metadata). pharmacyPhone(org.phone) 무변경.
- taxInvoiceEmail 과 businessEmail 분리 확인(별도 키, 별도 라벨).

## 5. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| 개설약사 가입에서 businessEmail/contactEmail 입력 가능 | ✅ |
| 약국 정보수정에서 2종 조회/수정 가능 | ✅ (org.metadata) |
| businessPhone 미추가 / pharmacyPhone 유지 | ✅ |
| ownerPhone/phone/managerPhone/taxInvoiceEmail 의미 무변경 | ✅ |
| SSOT = org.metadata | ✅ |
| backend 포함 / DB migration 0 | ✅ |
| 기존 가입·약국정보 흐름 무변경 | ✅ |

## 6. 비범위

- businessPhone 신규 / pharmacyPhone 이름 변경 / ownerPhone·phone·managerPhone 의미 변경 / operator UI 표시(KpaEditUserModal businessEmail/contactEmail/managerPhone gap — 별도 WO) / users.businessInfo 로 KPA SSOT 변경 / pharmacy_request 승인 org.metadata 동기화 / DB migration / GP·KCos·Neture 변경 / 주소 정렬 — 전부 비범위.

---

*Date: 2026-06-18 · CHECK · PASS · KPA 이메일 2종(businessEmail/contactEmail) 가입+정보수정 · SSOT org.metadata · businessPhone 미추가(pharmacyPhone 유지) · 가입 payload 조건부(@IsEmail 무손상) · backend 1 + frontend 3 · web-kpa tsc exit 0 / api-server 신규 에러 0(pre-existing marketTrial 1 제외) · migration 0.*
