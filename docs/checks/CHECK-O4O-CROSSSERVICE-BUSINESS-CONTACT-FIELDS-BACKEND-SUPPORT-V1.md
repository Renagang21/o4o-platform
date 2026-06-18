# CHECK-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1

> **작업명:** WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-BACKEND-SUPPORT-V1
> **유형:** backend-only — 사업자 연락처 3종(businessPhone/businessEmail/contactEmail) 공통 수용 기반. UI 비범위.
> **결과: PASS — DTO + register 저장(신규/기존 flow) + auth-account PATCH white-list + GlycoPharm/K-Cosmetics mypage GET/PATCH 확장. users.businessInfo JSONB → migration 0. api-server tsc 통과.**
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-AUDIT-V1

## 1. 명칭 가드 (준수)

- 회사전화 = **`businessPhone` 재사용**(GP/KCos 기존). 신규 `companyPhone` 키 **미생성**.
- 회사이메일 = **`businessEmail`**, 담당자이메일 = **`contactEmail`**.
- **의미 구분(중요):** 본 공통 `contactEmail`(users.businessInfo, 담당자 이메일) ≠ Neture supplier 의 `neture_suppliers.contactEmail`(외부 공개 연락처). 도메인·테이블·목적이 다름 — 혼용 금지. Neture supplier 경로는 본 WO 비범위(후속 `WO-O4O-NETURE-SUPPLIER-CONTACT-FIELDS-EXTEND-V1`).
- 기존 `phone`(개인)/`managerPhone`(담당자 전화)/`taxInvoiceEmail`(세금계산서) 의미 **무변경**.

## 2. 변경 (6파일, backend-only)

| 파일 | 변경 |
|------|------|
| `auth/dto/register.dto.ts` | `businessPhone`(@IsString) / `businessEmail`(@IsEmail) / `contactEmail`(@IsEmail) optional 추가 |
| `auth/controllers/auth-register.controller.ts` | 신규/기존 user 양 flow 의 businessInfo 빌드에 3종 저장 (`if (data.X) biz.X = data.X`) |
| `auth/controllers/auth-account.controller.ts` | PATCH `/auth/me/profile` businessInfo white-list(allowedFields)에 3종 추가 |
| `routes/glycopharm/controllers/mypage.controller.ts` | GET projection(2곳: GET 응답 + PATCH 응답)에 businessEmail/contactEmail 추가, PATCH white-list에 2종 이메일 검증 추가. businessPhone 기존 유지 |
| `routes/cosmetics/controllers/cosmetics-mypage.controller.ts` | `CosmeticsBusinessInfoResponse` 인터페이스 + `projectBusinessInfo` + PATCH white-list에 businessEmail/contactEmail 추가. businessPhone 기존 유지 |
| `types/user.ts` | `BusinessInfo` 인터페이스에 3종 canonical 명시(문서/타입), phone/email 은 legacy fallback 주석 |

## 3. 경로별 수용 결과

| 키 | DTO | register 저장 | account PATCH | GP mypage | KCos mypage | operator 응답 |
|----|:---:|:---:|:---:|:---:|:---:|:---:|
| businessPhone | ✅ 추가 | ✅ | ✅ | ✅(기존) | ✅(기존) | ✅(전체 businessInfo) |
| businessEmail | ✅ 추가 | ✅ | ✅ | ✅ 추가 | ✅ 추가 | ✅ |
| contactEmail | ✅ 추가 | ✅ | ✅ | ✅ 추가 | ✅ 추가 | ✅ |

- **operator 응답:** `MembershipConsoleController` GET 상세가 `businessInfo` **전체**를 반환(`u.businessInfo || null`) → 3종 자동 포함. 별도 변경 불요.
- **KPA:** pharmacy-info 컨트롤러는 pharmacy 도메인 전용 projection(phone/ownerPhone/managerPhone). 공통 `/auth/register`·`/auth/me/profile` 경로가 3종을 수용하므로 KPA 사용자도 공통 경로로 저장 가능 → KPA 전용 컨트롤러는 **미확장**(WO "필요한 범위에서" — pharmacy 도메인과 의미 중복 회피).
- **Neture supplier:** `neture_suppliers` entity 경로 — 본 WO 비범위(후속 WO). 단 공통 auth profile 경로 수용은 적용됨.

## 4. 검증

- `npm run type-check` (api-server) → **exit 0**.
- migration 신규 생성 **0** (JSONB schema-less, white-list 확장만).
- 변경 = backend 6파일 + 본 CHECK. frontend/UI 변경 0.
- 신규 `companyPhone` 키 grep = 0 (businessPhone 재사용 확인).
- GP/KCos 기존 businessPhone read/write 로직 무변경(추가만).

## 5. PASS 기준 대비

| 기준 | 결과 |
|------|------|
| 3종 DTO/저장/수정 경로 수용 | ✅ |
| DB migration 없음 | ✅ |
| GP/KCos 기존 businessPhone 유지 | ✅ |
| 신규 companyPhone 키 없음 | ✅ |
| Neture 외부공개 contactEmail vs 공통 담당자 contactEmail 의미 차이 명시 | ✅ (§1) |
| UI 변경 없이 backend support만 | ✅ |

## 6. 비범위 / 후속

- frontend UI 입력 / operator 표시 UI / DB migration / 기존 데이터 backfill / Neture supplier profile UI·schema / phone·managerPhone·taxInvoiceEmail 의미 변경 / 주소 정렬 — 전부 비범위.
- 후속: `WO-O4O-NETURE-SUPPLIER-CONTACT-FIELDS-EXTEND-V1`(neture_suppliers 경로) → `WO-O4O-CROSSSERVICE-BUSINESS-CONTACT-FIELDS-UI-ALIGNMENT-V1`.

## 7. 배포 후 권장 (선택)

- API: `PATCH /auth/me/profile {businessInfo:{businessPhone,businessEmail,contactEmail}}` → 저장·반환 확인. `GET/PATCH /glycopharm|cosmetics/mypage/business-info` 3종 반영 확인.

---

*Date: 2026-06-18 · CHECK · PASS · 연락처 3종 backend 공통 수용(DTO+register+account+GP/KCos mypage) · migration 0 · companyPhone 신규 금지(businessPhone 재사용) · contactEmail 의미구분 명시 · Neture supplier/UI 비범위 · api-server tsc 통과.*
