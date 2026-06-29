# CHECK-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1

> 선행 IR: `IR-O4O-NETURE-SUPPLIER-APPROVAL-AND-ACTIVATION-FLOW-AUDIT-V1`
> 커밋: 077100f20 (코드) · 작성일 2026-06-29

## 1. 정책 확정 (구현 반영)

| 상태 | 가능 작업 |
|------|-----------|
| 회원 ACTIVE | 로그인 · 공급자 대시보드 접근 |
| 공급자 PENDING | 대시보드 열람 · 프로필 작성 (상태 배너 안내) |
| 공급자 PENDING | 상품 등록 등 mutation **불가** (진입 사전 차단) |
| 공급자 ACTIVE | 상품 등록 가능 |

- 계정을 DB에서 직접 ACTIVE 로 바꾸거나 자동 활성화하지 않음. (미수행)

## 2. 변경 요약

### Backend (활성화 가능 여부 = 단일 권위)
- `supplier.service.ts:getAllSuppliers` 응답에 `activationReady`, `missingActivationFields[]`, `managerName`, `managerPhone` 추가. 산출은 `getMissingActivationFields()`(representativeName/managerName/managerPhone) 단일 권위.
- `supplier.service.ts:approveSupplier` 오류 구조화: `error='ONBOARDING_INCOMPLETE'` + `missingFields[]` (기존 `ONBOARDING_INCOMPLETE:field` 문자열 파싱 제거). HTTP 400/404 정책 유지.
- `operator-supplier.controller.ts` / `admin.controller.ts` approve 핸들러가 `error.missingFields` 전달.
- `supplier.service.ts:getProfile`(공급자 본인) 응답에 `activationReady`/`missingActivationFields` 포함 → 대시보드 배너·상품등록 게이트가 단일 권위 사용.

### Frontend
- `admin.ts`: `operatorSupplierApi`/`adminSupplierApi.approveSupplier` → `SupplierApproveResult{success,code?,missingFields?}`. `ACTIVATION_FIELD_LABELS`(코드→한글) 추가.
- `OperatorSupplierApprovalPage` / `AdminSupplierApprovalPage`:
  - 버튼 enable·"승인 가능/활성화 불가" 라벨·tooltip 을 `s.activationReady`/`s.missingActivationFields` 기준으로 정합 (구버전 payload 대비 `representativeName` fallback).
  - `handleApprove` 성공/실패 메시지 배너 + 성공 시 refetch. ONBOARDING_INCOMPLETE → 한글 누락 필드 메시지. **silent no-op 제거.**
- `SupplierActivationGate` (신규): `mode='banner'`(대시보드 PENDING 안내+프로필 링크) / `mode='gate'`(ACTIVE 전 상품등록 차단).
- 공급자 대시보드(`SupplierDashboardPage`) 상단 PENDING 배너.
- 상품 등록 진입 3개 화면 사전 게이트: `SupplierProductImportPage`(import-assistant) / `SupplierProductRegisterEntryPage` / `SupplierProductCreatePage`. → 분석·이미지 복사 전 차단.

## 3. 신규 가입 매핑 (조사 6 결론)
- `auth-register.controller.ts`: `businessInfo.contactName`(L391)/`managerPhone`(L394) 저장 + 직접 공급자 INSERT(L930-940) `managerName=contactName`, `managerPhone=managerPhone||contactPhone`.
- `operator-registration.service.ts:189-195`: 동일 매핑, 단 `ON CONFLICT (user_id) DO NOTHING`.
- **결론**: 신규 가입 승인은 manager 필드를 정상 반영 → 코드 수정 불필요. 누락은 legacy/seeded/restored row 한정.

## 4. 검증

| 항목 | 결과 |
|------|------|
| web-neture `tsc --noEmit` | ✅ EXIT 0 |
| api-server `tsc --noEmit` | ✅ EXIT 0 |
| 배포 (API/Web Cloud Run) | (CI 진행 — 아래 §6 기록) |
| 라이브 브라우저 smoke | (아래 §6 기록 — Chrome 프로필 잠김 시 사람 관측 필요) |

## 5. 데이터 (후속, 미수행)
WO 요구대로 **UI/API 배포 후** 별도 수행:
1. read-only 집계: `neture_suppliers` 중 status=PENDING & (manager_name IS NULL OR manager_phone IS NULL) 건수/목록.
2. 원본 가입 데이터(`users.businessInfo.contactName`/`managerPhone`)로 **확실히 복구 가능한 null 필드만** 백필 후보 보고 (dry-run).
3. 추정값 채우기 금지 · 자동 ACTIVE 전환 금지 · dry-run 확인 후 수행.
   - DB 직접 조회는 운영 DB 비밀번호 노출 정책으로 본 세션 미수행. 운영자 Network 탭 또는 승인된 read-only SQL 필요.

## 6. 상태 전이 기록 (배포·smoke 후 업데이트)
- sohae21@naver.com 활성화 클릭 응답: _(기록 예정)_
- 누락 필드 입력 → activationReady=true → 활성화 → status=ACTIVE: _(기록 예정)_
- 멤버십/role/org 정합: _(기록 예정)_
- 공급자 재로그인 후 상품 등록 성공: _(기록 예정)_
