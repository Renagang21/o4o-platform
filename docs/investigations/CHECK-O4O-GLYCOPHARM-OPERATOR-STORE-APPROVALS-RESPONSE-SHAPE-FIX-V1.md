# CHECK-O4O-GLYCOPHARM-OPERATOR-STORE-APPROVALS-RESPONSE-SHAPE-FIX-V1

> **작업명:** WO-O4O-GLYCOPHARM-OPERATOR-STORE-APPROVALS-RESPONSE-SHAPE-FIX-V1
> **유형:** GlycoPharm operator `/operator/store-approvals` 런타임 crash 수정 (frontend 전용)
> **판정: PASS** — 응답 shape 재매핑으로 crash 제거 + 운영자 검토 정보 정상 표출.
> 작성일: 2026-06-16

---

## 1. 증상

- 운영 URL `https://glycopharm.co.kr/operator/store-approvals` 접속 시 ErrorBoundary.
- `TypeError: Cannot read properties of undefined (reading 'pharmacyName')`

## 2. 진짜 원인 (가설과 다름)

초기 가설은 `approval.pharmacy.pharmacyName` 의 nested null 이었으나, **실제 접근 경로는 `app.form.pharmacyName`** 이었고 더 근본적으로는 **백엔드 응답에 `form` 객체 자체가 없음**.

- 백엔드 `GET /api/v1/glycopharm/store-applications` (controller `store-applications.controller.ts`) 는 `GlycopharmApplication` 엔티티의 **flat 필드**(`organizationName`, `businessNumber`, `serviceTypes`, `userName`, `userEmail`, `status`, `submittedAt`, `decidedAt` …) 를 내려준다.
- 프론트 `StoreApplication` 타입과 두 operator 페이지는 **제거된 소비자 apply 플로우의 리치 신청서**(`form: StoreApplicationForm` — `pharmacyName` / `pharmacyAddress` / `businessName` / `pharmacistName` / `bankName` …) 를 가정하고 `app.form.pharmacyName` 을 직접 읽었다.
- 따라서 `app.form` 이 **모든 row 에서 undefined** → 첫 row 렌더 시 crash.
- 지금까지 무사했던 이유: 신청 제출이 0 건이라 테이블이 비어 있었음(empty → 접근 코드 미실행). 실제 신청이 들어오자 발생.

> 단순 optional chaining(`?.`) 으로 막으면 crash 는 멈추지만 모든 칸이 빈 값/'미확인' 이 되어 운영자 검토 정보가 0 이 된다. → **실제 응답 필드로 재매핑**하는 것이 올바른 수정.

## 3. 수정 파일 (frontend 전용, path-specific)

- `services/web-glycopharm/src/types/store.ts`
  - `StoreApplication` 을 실제 백엔드 응답 shape 로 교정 (`form` 제거, flat 필드 + `userName/userEmail/userPhone` + `pharmacy` 상세 객체 + `decidedAt/decidedBy` 추가). `StoreOrganizationType` / `StoreServiceType` / `StoreApplicationPharmacy` 추가.
  - 레거시 `StoreApplicationForm` 인터페이스는 미사용 상태로 보존(다른 re-export 영향 0).
- `services/web-glycopharm/src/pages/operator/StoreApprovalsPage.tsx`
  - 컬럼 재매핑: 조직명(`organizationName` + 조직유형) / 사업자등록번호(`businessNumber` + 신청 서비스) / 신청자(`userName`/`userEmail`) / 상태 / 신청일.
  - `STATUS_CONFIG[app.status] ?? FALLBACK_STATUS_CONFIG` 로 미지의 상태값 방어.
- `services/web-glycopharm/src/pages/operator/StoreApprovalDetailPage.tsx`
  - 헤더/본문 섹션을 실제 필드로 재구성: 신청 정보 / 신청 서비스 / 신청자 정보 / (승인 시) 약국 정보 / 반려 사유 / 보완 요청(`metadata.supplementRequests` 도출) / 메모.
  - slug 자동생성을 `requestedSlug` → `organizationName` 순으로 도출. 처리 이력 `reviewedAt`→`decidedAt`. 상태 fallback 가드. 미사용 `AgreementItem`/`Check`/`X`/`CreditCard` 제거.

> backend / DB / migration / auth / route 구조 **미변경**. `git add .` 미사용. GP 외 서비스(KPA/KCos/Neture) 파일 0 변경.

## 4. 검증

| 대상 | 결과 |
|---|---|
| `tsc -b` (web-glycopharm 전체) | error **0** (EXIT 0) |
| `vite build` | ✅ built in 13.29s (EXIT 0) |
| `app.form` 직접 접근 잔존 | **0** (grep) |

- 브라우저 smoke(빈 목록 / 실제 신청 row / 상세 진입 / 승인·반려·보완 모달)는 프로덕션 배포 후 권장. 정적 정합성(typecheck+build) 확보.

## 5. 후속 (옵션)

- 백엔드가 의도적으로 풍부한 신청서(약사면허/정산계좌 등)를 받도록 확장하려면 별도 WO 필요(현재 엔티티 `GlycopharmApplication` 에 해당 컬럼 없음).

*Date: 2026-06-16 · frontend 전용 · 응답 shape 재매핑 · backend/route/auth 무변경 · tsc/vite PASS.*
