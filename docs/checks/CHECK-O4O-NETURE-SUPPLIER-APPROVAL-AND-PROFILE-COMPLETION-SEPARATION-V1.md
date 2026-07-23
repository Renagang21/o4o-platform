# CHECK-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1

> WO: `WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1`
> 원칙: **공급자 가입 승인은 서비스 이용 자격을 결정하고, 공급자 추가정보는 승인 후 보완하는 프로필 정보로 관리한다.**
> Date: 2026-07-23 · commit `ac99a767b` (코드) · Deploy API+Web(neture) success · 프로덕션 smoke PASS

---

## 0. 결론 — ✅ PASS

승인 상태(status)와 프로필 완성 상태(profileComplete)가 실제로 결합돼 있던 구조를 분리 완료.
프로필 미완료(대표자명/담당자명/담당자 연락처)는 더 이상 승인을 차단하지 않으며, 승인 후 보완
안내(세션 1회 모달 + 대시보드 배너 + 운영자 '정보 미완료' 배지)로만 관리된다. DB migration 0.

## 1. 결합의 원인 (조사)

단일 결합점 = `supplier.service.ts` `getMissingActivationFields()`(3필드) 소비 3곳:

1. **`approveSupplier()`** — 누락 시 `ONBOARDING_INCOMPLETE` 로 PENDING→ACTIVE **하드 차단** (제거 대상 핵심).
2. `getAllSuppliers()` / `getSupplierProfile()` — `activationReady/missingActivationFields` 로 노출, 프론트(게이트·운영자/관리자 승인 화면)가 승인 가능 여부처럼 소비.
3. **부수 발견(교착)**: `PATCH /supplier/profile` 이 `requireActiveSupplier` 게이트 → PENDING 공급자가
   "활성화에 필요하다"고 안내받은 정보를 **스스로 저장할 수 없었음** (403 SUPPLIER_NOT_ACTIVE).

이중 승인: 1단계 회원 가입 승인(`approveRegistration`) 후에도 공급자는 PENDING 유지 → 2단계
공급자 승인(`approveSupplier`)이 별도 필요 (WO-NETURE-SUPPLIER-APPROVAL-TWO-STEP-ACTIVATION-V1 유산).

## 2. 중지 조건 점검 — 전부 미해당

| 조건 | 판정 |
|------|------|
| 회원 승인 vs 공급자 승인이 법적·계약적으로 구분된 실사용 | ❌ 기술적 분리(2단계=1단계 상위집합), 법적 근거 없음 |
| ACTIVE 판정이 Neture 외 공유 | ❌ 전 소비처 Neture 공급자 한정(product-policy-v2 포함). 본 WO 는 ACTIVE 의미·소비처 불변, 도달 조건만 변경 |
| nullable 불가 → migration 필요 | ❌ 3필드 전부 nullable(엔티티+라이브 DB 확인) |
| 자동 ACTIVE 가 기존 승인·정지·거절 상태 위험 | ❌ PENDING 에서만 전이. REJECTED/INACTIVE/기존 ACTIVE 불변 |
| 동시 작업자 동일 파일 수정 | ❌ 대상 파일 git 무변경·3일 커밋 0 |

## 3. 상태 전이 (변경 후)

- 가입(auth-register) → `neture_suppliers` **PENDING** (승인대기) — 불변.
- **회원 가입 승인(`approveRegistration`) = 공급자 승인(하나의 인지된 승인)**: supplier 행 신규면
  ACTIVE 생성, 기존 PENDING 이면 ACTIVE 전이(+org 활성화). REJECTED/INACTIVE 는 건드리지 않음.
- `approveSupplier()`(공급자 승인 관리 화면): PENDING→ACTIVE, **프로필 게이트 없음**. 잔여 PENDING 처리용 유지.
- 거절(REJECTED)/이용정지(INACTIVE): `rejectSupplier`/`deactivateSupplier` **무변경** (상태·부수효과 보존).

## 4. 분리 방법

- **백엔드**: `approveSupplier` 의 `ONBOARDING_INCOMPLETE` 블록 제거. `getMissingActivationFields`
  → `getMissingProfileFields`(정보성) 재정의. API 응답에 `profileComplete`/`missingProfileFields` 신설
  (`getSupplierProfile`·`getAllSuppliers`(+paged)), 기존 `activationReady`/`missingActivationFields` 는
  deprecated 별칭으로 동일값 유지(호환).
- **교착 해소**: `PATCH /supplier/profile` `requireActiveSupplier`→`requireLinkedSupplier`
  (GET /profile·PATCH /onboarding 과 동일 레벨 정합화 — 승인 전 자기 정보 입력 가능).
- **프론트 게이트(`SupplierActivationGate`)**: 차단은 실제 미승인(PENDING/REJECTED/INACTIVE)만,
  상태별 문구 분리(대기/거절/정지). ACTIVE+미완료 = children 정상 렌더. 프로필 API 실패는 fail-open
  (서버 requireActiveSupplier 가 실제 권위 → 차단·모달 미발생).

## 5. 모달·배너

- **세션 1회 모달**(대시보드 진입, ACTIVE+미완료만): 제목 '공급자 정보를 등록해 주세요',
  버튼 '공급자 정보 등록'(→`/mypage/business-profile`) + '나중에 하기'.
  `sessionStorage['o4o_supplier_profile_modal_shown']` 로 세션당 1회 — 페이지 이동마다 반복 없음(실측).
- **대시보드 배너**: 동일 문구+미입력 항목+등록 버튼, 모달 닫은 뒤에도 유지.
- 프로필 화면은 기존 `SupplierProfilePage`(=`/mypage/business-profile` 의 실체) 단일 권위 유지 —
  중복 화면 신설 없음. 저장 API `PATCH /neture/supplier/profile` 실동작 실측(200).

## 6. 단계별 게이트 보존 (범위 4)

- **규제품목 증빙**: `offer.service.ts` `submitForApproval` 의 `evaluateGate`(SUPPLIER_CATEGORY_NOT_APPROVED) **미접촉**.
- **사업자등록증/정산정보**: 기존 구조 그대로(운영자 '판매 전/정산 전 필요' 표시 유지, 하드블록 없음 — 기존 정책 불변).
- `requireActiveSupplier` 를 쓰는 공급 업무 엔드포인트(상품/주문/재고/정산/설명서 등) 전부 **무변경**.

## 7. 운영자/관리자 화면

- Operator `/operator/suppliers`: '승인 준비' 컬럼 → **'프로필 정보'**(완료 / **'정보 미완료' 배지**+미입력 항목).
  드로어 패널 '정보 미완료 — 승인은 가능하며, 승인 후 공급자가 보완합니다'. 단일/일괄/드로어 승인 버튼
  **비활성화 전면 제거**('승인 불가' 라벨 소멸). '정보 보완' 인라인 편집 유지.
- Admin `/admin/admin-suppliers`: 동일 원칙(승인 disabled 제거, 정보 미완료 표기).
- UsersManagementPage: 2단계 안내 → **"회원 가입 승인 한 번으로 활성화"** 안내로 교체(잔여 PENDING 동선 유지).

## 8. 빌드·배포

- api-server tsc: 변경 파일(modules/neture) 오류 0 (잔여 오류는 무관한 `src/scripts/*` 기존 병렬 세션 산물).
- web-neture tsc 0 · vite build success. Deploy API Server + Deploy Web Services(neture) **success**.

## 9. 프로덕션 smoke — ✅ PASS

**계정 상태 매트릭스** (라이브):

| 상태 | 계정 | 결과 |
|------|------|------|
| 승인 대기(PENDING)+미완료 | sohae21 | profile 200: `PENDING, profileComplete=false, missing=[managerName,managerPhone]` · **PENDING 상태 PATCH /profile 200**(교착 해소 실증) |
| 승인 대기(PENDING)+완료 | yyoon1103 | 운영자 목록 `profileComplete=true` 표시, 미접촉(승인 버튼 활성 확인만) |
| **핵심: 미완료 상태 승인** | sohae21 | `POST /operator/suppliers/:id/approve` → **200 success, ACTIVE** (종전 ONBOARDING_INCOMPLETE 차단이던 케이스) |
| 승인 완료(ACTIVE)+미완료 | sohae21(승인 후)·renagang21 | dashboard 200 이용 가능 · profile `ACTIVE, profileComplete=false` · 운영자 목록 '정보 미완료' 배지 2건 |
| 거절/정지(REJECTED/INACTIVE) | 라이브 계정 없음 | 전이 로직(reject/deactivate) 무변경 + 게이트 상태별 문구는 코드 경로 검증(픽스처 조작 미수행) |

**브라우저 (콘솔·pageerror 0)**:
- sohae21 로그인 → `/supplier/dashboard`: **모달 1회 노출**(제목·두 버튼) → '나중에 하기' → 배너 유지 →
  다른 페이지 이동 후 복귀 → **모달 반복 없음**(세션 1회) · CTA href=`/mypage/business-profile`.
- ACTIVE+미완료 상태에서 상품 등록 진입 **차단 없음**.
- 운영자 `/operator/suppliers`: '프로필 정보' 컬럼 + '정보 미완료' 배지 2건 + '승인 불가' 버튼 0.
- (주의) `/supplier` 는 마케팅 랜딩 — 대시보드는 `/supplier/dashboard`.

**기존 상태 회귀 0**: renagang21(기존 ACTIVE) 무변경 · yyoon1103(PENDING) 소급 전이 없음 · REJECTED/INACTIVE 무접촉.

## 10. DB 변경

- **스키마 0 · migration 0 · 백필 0.** 데이터 변경은 승인된 smoke 범위 내 2건뿐:
  sohae21 managerName 저장(PATCH, 교착 해소 실증) + sohae21 PENDING→ACTIVE(핵심 시나리오 승인, WO 지시 범위).

## 11. 변경 파일 (11)

```
apps/api-server/src/modules/neture/services/supplier.service.ts
apps/api-server/src/modules/neture/services/operator-registration.service.ts
apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts
services/web-neture/src/components/supplier/SupplierActivationGate.tsx
services/web-neture/src/lib/api/supplier.ts
services/web-neture/src/lib/api/admin.ts
services/web-neture/src/lib/api/index.ts
services/web-neture/src/pages/supplier/SupplierStoreDescriptionsPage.tsx
services/web-neture/src/pages/operator/OperatorSupplierApprovalPage.tsx
services/web-neture/src/pages/admin/AdminSupplierApprovalPage.tsx
services/web-neture/src/pages/operator/UsersManagementPage.tsx
```
