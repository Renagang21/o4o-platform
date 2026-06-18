# IR-O4O-KPA-BUSINESS-CONTACT-FIELDS-MAPPING-AUDIT-V1

> **유형:** Read-only Investigation Report — 코드/DB/API/UI 변경 0.
> **작성일:** 2026-06-18
> **선행:** IR-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-AUDIT-V1 · WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1 · WO-O4O-GLYCOPHARM-… · WO-O4O-KCOSMETICS-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1
> **결론(요약):** **KPA 는 GP/KCos 와 구조가 다르다.** (1) `pharmacyPhone`(약국 전화)이 **이미 사업장 전화 = businessPhone 의미** → **businessPhone 신규 UI 추가 금지(드리프트)**. (2) `ownerPhone`·`users.phone` 은 개인 연락처 → businessPhone 과 분리 유지. (3) `businessEmail`/`contactEmail` 은 대응 필드 부재 → 신규 가능하나 KPA pharmacy-info 저장 경로가 **`organizations` 테이블 + `org.metadata`** (GP/KCos 의 `users.businessInfo` 와 다름) → **frontend-only 불가, backend pharmacy-info 컨트롤러 확장 필요**. → 권고 = **축소 WO**(businessPhone 제외, businessEmail/contactEmail 만, backend 포함).

---

## 1. 조사 범위 (실측 파일)

| 영역 | 파일 |
|------|------|
| 가입 | `services/web-kpa-society/src/components/RegisterModal.tsx` |
| 약국 정보수정 (store owner self) | `services/web-kpa-society/src/pages/pharmacy/PharmacyInfoPage.tsx` + `src/api/pharmacyInfo.ts` |
| pharmacy-info backend | `apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts` (`GET/PUT /pharmacy/info`) |
| pharmacy 신청/승인 backend | `apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts` |
| operator 편집 | `packages/operator-core-ui/src/modules/members/KpaEditUserModal.tsx` |
| 공통 register | `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` (createKpaRecords / 신규 user businessInfo) |

조사 방식: 정적 코드 분석(read-only). 운영 데이터·상태 전이 없음.

---

## 2. KPA 연락처 필드 지형 (실측)

### 2.1 전화 필드 — 4종이 이미 공존

| 필드 | 의미 | 저장 위치 | 등장 화면 |
|------|------|----------|----------|
| `users.phone` | **개인 휴대폰** (가입 step1, 전 회원) | `users.phone` | RegisterModal 공통 / 모든 서비스 동일 |
| `pharmacyPhone` / `pharmacy_phone` → `phone` | **약국/사업장 전화** | `kpa_pharmacy_requests.pharmacy_phone` → 승인 시 `organizations.phone` | RegisterModal(개설약사 "약국 전화") · PharmacyInfoPage("약국 전화번호") · KpaEditUserModal("약국 전화번호") |
| `ownerPhone` / `owner_phone` | **개설자 본인 연락처** | `kpa_pharmacy_requests.owner_phone` → `organizations.metadata.ownerPhone` | PharmacyInfoPage("개설자 연락처") · KpaEditUserModal("개설자 연락처") |
| `managerPhone` | **담당자 전화** | `users.businessInfo.managerPhone` (가입) / `org.metadata.managerPhone` (pharmacy-info PUT) | RegisterModal(개설약사 "담당자 전화") · pharmacy-info **UI 제거됨**(API 유지) · KpaEditUserModal **미표시** |

→ **`pharmacyPhone`(=`org.phone`, "약국 전화번호") 이 곧 사업장 전화** 다. 공통 `businessPhone`(회사/사업장 전화) 과 **동일 의미**.

### 2.2 이메일 필드

| 필드 | 의미 | 저장 위치 | 비고 |
|------|------|----------|------|
| `taxInvoiceEmail` | **세금계산서 이메일** | `org.metadata.taxInvoiceEmail` (pharmacy-info) / `users.businessInfo.taxInvoiceEmail` (가입) | 전 서비스 공통 — businessEmail 과 **의미 구분 필수** |
| `businessEmail` (회사/대표 업무 이메일) | — | **부재** | KPA 어디에도 없음 |
| `contactEmail` (담당자 이메일) | — | **부재** | `contactName`(담당자명) 은 있으나 이메일 짝 없음 |

### 2.3 이름 필드 (참고)

`ceoName`(대표자명) · `contactName`(담당자명) 존재. contactName 은 RegisterModal·PharmacyInfoPage·KpaEditUserModal 모두 표시.

---

## 3. 저장 경로 — GP/KCos 와의 결정적 차이

| 서비스 | 정보수정 컨트롤러 | 연락처 저장 위치 |
|--------|------------------|-----------------|
| GlycoPharm | `/glycopharm/mypage/business-info` | **`users.businessInfo`** (white-list 에 businessEmail/contactEmail 기수용) |
| K-Cosmetics | `/cosmetics/mypage/business-info` | **`users.businessInfo`** (동일) |
| **KPA** | **`/pharmacy/info`** | **`organizations` 테이블 + `org.metadata`** (taxInvoiceEmail/ownerPhone/ceoName/contactName/managerPhone 전부 `org.metadata`). **P2/P4 만 `users.businessInfo`** |

- KPA pharmacy-info `GET` 은 `organizations`(org.phone, business_number, address) + `org.metadata`(taxInvoiceEmail/ownerPhone/ceoName/contactName/managerPhone) 에서 읽고, `users.businessInfo` 는 **P2/P4 + 일부 fallback** 만 읽는다. **businessEmail/contactEmail 은 GET projection·fallback 어디에도 없음.**
- KPA pharmacy-info `PUT` 은 연락처를 `org.metadata` 로 merge. **businessEmail/contactEmail white-list 부재** → 보내도 silently drop.
- 공통 `/auth/register` DTO 는 businessEmail/contactEmail 을 수용(users.businessInfo 저장)하나, **KPA RegisterModal 은 이 2종을 payload 에 보내지 않으며**, 보내더라도 pharmacy-info GET 이 organizations 기준이라 **store owner 화면에 surfacing 안 됨**.

→ **결론: KPA 에 businessEmail/contactEmail 을 붙이려면 GP/KCos 처럼 frontend-only 로 끝나지 않는다.** pharmacy-info 컨트롤러(GET projection + PUT white-list + org.metadata merge) + API 클라이언트 타입 + UI 2파일 변경이 필요하다. (DB migration 은 불요 — org.metadata JSONB.)

---

## 4. 필드별 판정 (WO 판정 기준 적용)

| # | 공통 필드 | KPA 대응 | 판정 |
|---|----------|---------|------|
| 1 | `businessPhone` (회사/사업장 전화) | `pharmacyPhone`(=org.phone, "약국 전화번호") | **= 동일 의미. businessPhone 신규 UI 추가 금지.** 이미 사업장 전화로 존재 — 4번째 전화 필드는 드리프트. 필요 시 "약국 전화 = businessPhone" 매핑/표기만. |
| 2 | (분리) | `ownerPhone` (개설자 연락처) | 개설자 **개인 연락처** → businessPhone 과 **분리 유지**. 건드리지 않음. |
| 3 | (분리) | `users.phone` (개인 휴대폰) | 개인 → businessPhone 과 **분리 유지**. (주의: KPA 의 `org.phone`=사업장, `users.phone`=개인 — 둘 다 "phone" 이나 의미 다름.) |
| 4 | `businessEmail` (회사/대표 업무 이메일) | 부재 (`taxInvoiceEmail` 과 구분) | **신규 optional 추가 후보. 충돌 없음.** 단 저장 경로 org.metadata → backend 필요. |
| 5 | `contactEmail` (담당자 이메일) | 부재 (`contactName` 과 짝) | **신규 optional 추가 후보. 충돌 없음.** contactName 옆 배치 자연스러움. backend 필요. |
| 6 | `taxInvoiceEmail` (세금계산서) | `taxInvoiceEmail` 존재 | **유지. businessEmail 과 혼동/병합 금지.** |

---

## 5. operator 표시 gap

- `KpaEditUserModal`(operator) 은 `member.business_info`(= `GET /kpa/members` projection) 에서 pharmacy_phone / ownerPhone / ceoName / contactName / taxInvoiceEmail / businessNumber / address 를 읽고 `PATCH /members/:id/info` 로 저장한다.
- **businessEmail/contactEmail 미표시**(필드 부재). **managerPhone 도 미표시**(가입엔 있으나 operator 엔 없음 — 기존 gap).
- operator 편집 경로(`/members/:id/info`)와 store owner 자기수정 경로(`/pharmacy/info`)는 **저장 소스가 다를 수 있음**(operator=users.businessInfo projection 계열 / store owner=organizations) — 기존 dual-path. 본 IR 범위 밖이나, businessEmail/contactEmail 신규 시 **두 경로 중 어디를 SSOT 로 둘지 선결정 필요**.

---

## 6. 후속 WO 후보 / 권고

| 우선순위 | 후보 | 내용 |
|:---:|------|------|
| **권고** | `WO-O4O-KPA-BUSINESS-CONTACT-EMAIL-FIELDS-UI-EXTEND-V1` (축소) | **businessPhone 제외**, `businessEmail`/`contactEmail` 2종만 추가. **backend 포함**: pharmacy-info 컨트롤러 GET projection + PUT white-list(org.metadata merge) + `pharmacyInfo.ts` 타입 + RegisterModal(개설약사) + PharmacyInfoPage UI. SSOT = `org.metadata`(taxInvoiceEmail 와 동일 위치). migration 0. |
| 선결정 | (businessEmail/contactEmail SSOT) | store owner 경로(organizations) vs operator 경로(users.businessInfo) 중 SSOT 확정. taxInvoiceEmail 선례상 **org.metadata** 권장. operator 표시는 별도 판단. |
| 보류 | businessPhone 신규 추가 | **미진행.** pharmacyPhone 재사용/표기로 충분. |
| 별도 | operator businessEmail/contactEmail/managerPhone 표시 | KpaEditUserModal 표시 gap — 별도 WO. |

**판정 요약:**
- `pharmacyPhone = 사업장 전화 = businessPhone` 확정 → **businessPhone UI 신규 추가하지 않는다.**
- `ownerPhone` / `users.phone` 은 개인 연락처 → **분리 유지.**
- `businessEmail` / `contactEmail` 은 대응 필드 부재 → **신규 추가 후보**(축소 WO), 단 **backend(org.metadata) 변경 필요** — GP/KCos 의 frontend-only 패턴과 다름.

---

## 7. 하지 않은 것 (범위 준수)

- 코드/DB/enum/API/UI 변경 0. 운영 데이터 변경 0. 상태 전이 실행 0. 본 IR 문서 1개만 산출(path-specific).

---

*read-only · KPA pharmacyPhone=사업장 전화=businessPhone(신규 금지) · ownerPhone/users.phone=개인(분리) · businessEmail/contactEmail=부재→신규 후보 · 저장경로 organizations+org.metadata(≠users.businessInfo) → backend 필요 · 축소 WO 권고(businessPhone 제외, email 2종만).*
