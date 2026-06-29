# IR-O4O-NETURE-SUPPLIER-APPROVAL-AND-ACTIVATION-FLOW-AUDIT-V1

> **유형**: 조사(IR) · read-only. 본 조사 과정에서 코드·DB 데이터를 변경하지 않았다.
> **대상 계정**: sohae21@naver.com (Neture 공급자)
> **작성일**: 2026-06-29

---

## 1. 결론 요약 (TL;DR)

1. **"모순처럼 보이는 상태"는 정상이다.** Neture 공급자는 **2단계 상태 모델**이다.
   - 회원/멤버십 = `users.status` + `service_memberships.status` (가입 승인) → **활성** (회원 관리 "대기 0")
   - 공급자 = `neture_suppliers.status` (2단계 공급 활성화) → **PENDING** (공급자 활성화 화면 "승인대기 1")
   - 대시보드는 회원/role 기준으로 열리고, 상품 등록 mutation 은 `neture_suppliers.status === 'ACTIVE'` 를 요구한다.

2. **활성화 버튼이 동작하지 않는 진짜 원인 = 프론트/백엔드 활성화 게이트 불일치 + 실패의 조용한 삼킴(silent swallow).**
   - 백엔드 활성화 필수 = `representativeName` **+ `managerName` + `managerPhone`** (3개).
   - 프론트 버튼 활성화 조건 및 "승인 가능 (기본 정보 완료)" 라벨 = **`representativeName` 1개만** 검사.
   - 따라서 `managerName`/`managerPhone` 이 비어 있는 공급자는 **버튼이 눌리고 화면은 "승인 가능"이라 표시**하지만, 클릭 시 백엔드가 **HTTP 400 `ONBOARDING_INCOMPLETE`** 로 거절한다.
   - 프론트 `approveSupplier()` 는 응답 body·에러를 **버리고**, `handleApprove()` 는 실패 시 **toast/에러를 표시하지 않고** reload 도 하지 않는다 → 사용자에겐 "아무 일도 안 일어남"으로 보인다.

3. **백엔드 activation 핸들러 자체는 정상이다.** 트랜잭션·UPDATE·HTTP 상태코드(200/400/404) 모두 올바르다. 결함은 (a) 프론트 게이트가 backend 와 다른 필드 집합을 본다는 점과 (b) 프론트가 실패 사유를 숨긴다는 점이다.

4. **데이터 측 추정 원인**: 자동 생성된 `neture_suppliers` row 가 `manager_name`/`manager_phone` 을 비운 채 생성됐을 가능성. (정확한 누락 필드는 DB/Network 확인 필요 — 아래 §7.)

> 권고: 계정을 수동으로 ACTIVE 로 바꾸지 말 것. 먼저 (a) 프론트가 실패 사유를 노출하게 하고, (b) 프론트 게이트를 백엔드와 일치시키며, (c) 누락 필드를 운영자가 보고 채울 수 있게 하는 최소 수정이 정공법이다.

---

## 2. 상태 모델 (조사 1)

| 상태 | 테이블 | 컬럼 | enum / 값 | 초기값 | 변경 API | 기능 차단 위치 |
|------|--------|------|-----------|--------|----------|----------------|
| 사용자 | `users` | `status` | active / inactive / pending / approved / suspended / rejected | pending | 가입승인(operator-registration) | 로그인 게이트 |
| 서비스 멤버십 | `service_memberships` | `status` | pending / active / suspended / rejected / withdrawn | pending | 가입승인 / 공급활성화 | `MembershipGate`(프론트) |
| 역할 | `role_assignments` | `isActive`(+`role`) | boolean / 'supplier' 등 | true | 가입승인 / 공급활성화 | RBAC 미들웨어 |
| **공급자** | **`neture_suppliers`** | **`status`** | **PENDING / ACTIVE / INACTIVE / REJECTED** | **PENDING** | **공급 활성화(approve/reject)** | **상품등록 mutation(`requireActiveSupplier`)** |
| 조직 | `organizations` | `isActive` | boolean | true | 공급활성화 시 동기화 | - |

근거:
- `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts:11-16, 178-183` (SupplierStatus enum, default PENDING)
- `apps/api-server/src/modules/auth/entities/ServiceMembership.ts:33`
- `apps/api-server/src/modules/auth/entities/RoleAssignment.ts`
- `apps/api-server/src/types/auth.ts:21-28`

---

## 3. 가입 → 활성화 전체 흐름 (조사 2)

| 단계 | 처리 주체 | 코드 | 결과 상태 |
|------|-----------|------|-----------|
| 1. 회원 가입(공급자 선택) | 사용자 | `auth-register.controller.ts:register()` (필수: companyName/representativeName/contactName/managerPhone/businessAddress, L83-109) | users=pending, service_membership=pending |
| 2. 가입 승인 (1단계) | 운영자 | `operator-registration.service.ts:approveRegistration()` | users=active, membership=active, role=supplier 부여, **`neture_suppliers` 자동 생성 status=PENDING** |
| 3. 공급 활성화 (2단계) | 운영자 | `supplier.service.ts:approveSupplier()` (L111-166) | **`neture_suppliers` PENDING→ACTIVE**, membership active 보장, org active |
| 4. 상품 등록 | 공급자 | `requireActiveSupplier` 통과 시 | ACTIVE 필요 |

- 2단계에서 supplier row 를 만드는 INSERT: `operator-registration.service.ts:189-195`
  - `manager_name = bizInfo?.contactName || null`
  - `manager_phone = bizInfo?.managerPhone || users.phone || null`
  - **`ON CONFLICT (user_id) DO NOTHING`** → 이미 row 가 있으면(시드/마이그레이션 복원분 등) 덮어쓰지 않음 → 과거 row 의 빈 필드가 그대로 잔존.

---

## 4. 대시보드 접근 (조사 3)

- 프론트 `SupplierRoute` (`services/web-neture/src/components/auth/RoleGuard.tsx:188-197`): **role + neture membership 만 검사. `neture_suppliers.status` 미검사.**
- 백엔드 `requireLinkedSupplier` (`apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts:75-94`): supplier row **존재만 확인, status 미검사.**
- 상품 등록 mutation `requireActiveSupplier` (같은 파일 L57-63): `status !== 'ACTIVE'` → **403 `SUPPLIER_NOT_ACTIVE`** ("Supplier account is PENDING...").

**판정**: 현재 정책은 사실상 **A안(= PENDING 공급자도 대시보드 읽기·프로필 작성 가능, 쓰기만 차단)** 과 일치한다. 단, 이는 가드가 status 를 "검사하지 않아서" 생긴 결과(명시 설계 아님)이며 — **결함이라기보다 "명문화되지 않은 허용"**. 권장 정책 A 와 부합하므로 유지하되, 화면에 공급자 상태(PENDING)와 "지금 가능한 작업"을 명시하는 배너를 권장한다.

---

## 5. 활성화 버튼 미동작 근본 원인 (조사 4 — 핵심)

경로: `/operator/suppliers` → `OperatorSupplierApprovalPage` → `operatorSupplierApi.approveSupplier(id)` → `POST /api/v1/neture/operator/suppliers/:id/approve` → `netureService.approveSupplier()`.

### 백엔드 (정상)
- `supplier.service.ts:approveSupplier()` (L111-166):
  - L118: `status !== PENDING` → `{success:false, error:'INVALID_STATUS'}`
  - L122-128: `getMissingActivationFields()` 가 비어있지 않으면 `{success:false, error:'ONBOARDING_INCOMPLETE:...'}`
  - `getMissingActivationFields()` (L1188-1193): **`representativeName` + `managerName` + `managerPhone`** 모두 요구.
  - L130-153: 정상 시 status=ACTIVE 저장 + membership active + role 부여 + org active.
- 컨트롤러 (`operator-supplier.controller.ts:200-224`):
  - 실패 시 **404(SUPPLIER_NOT_FOUND) 또는 400(그 외)** 반환. (HTTP 200 + success:false 아님 — 정상)

### 프론트 (결함)
- 활성화 버튼 enable 조건 `activationReady = !!s.representativeName` (`OperatorSupplierApprovalPage.tsx:214, 297`).
- "승인 가능 (기본 정보 완료)" 라벨도 `representativeName` 만 본다 (L231-232).
- `approveSupplier()` (`admin.ts:237-241`): `await api.post(...)` 후 무조건 `return true`, 4xx 는 `catch { return false }` — **응답의 `success`/`error.code` 를 전혀 읽지 않는다.**
- `handleApprove()` (`OperatorSupplierApprovalPage.tsx:89-97`): `if (ok) await loadSuppliers()` — **ok=false 시 toast·alert 없음, reload 없음.**

### 종합 (증상과 정확히 일치)
`managerName`/`managerPhone` 이 비어 있는 PENDING 공급자 →
버튼 enable + "승인 가능" 표시 → 클릭 → 백엔드 **400 ONBOARDING_INCOMPLETE** → axios throw → `approveSupplier` 가 false 반환 → **화면 무변화, 에러 없음**.
(이미 PENDING 이므로 INVALID_STATUS 는 배제 → 남는 건 ONBOARDING_INCOMPLETE.)

---

## 6. 필수정보 단계 정책 (조사 5)

| 정보 | 활성화(ACTIVE)? | 판매(상품 승인요청)? | 정산? | 근거 |
|------|:---:|:---:|:---:|------|
| representativeName / managerName / managerPhone | **필수** | - | - | `getMissingActivationFields` L1188-1193 |
| 사업자등록증(PDF) | 불필요 | **필수** | - | `getMissingSaleFields` L1196~ |
| 세금계산서 이메일·은행명·계좌·예금주·통장사본 | 불필요 | 불필요 | 필요 | `getDeferredItems`(프론트 L47-56) |
| 통신판매업 신고 | 불필요(비차단) | - | - | 화면 주석 L37 |

**판정**: 정산 정보 부족이 기본 활성화를 막지 **않는다**(이미 WO-...-DOCUMENT-GATE-RELAXATION-V1 로 분리 완료). 즉 화면에 보이는 "정산 전 필요" 항목들은 활성화 차단 사유가 아니다. 활성화를 막는 건 오직 `representativeName`/`managerName`/`managerPhone` 누락이다.

---

## 7. 운영자 화면 정합성 (조사 6)

| 화면 | 경로 | 컴포넌트 | 다루는 상태 | 백엔드 |
|------|------|----------|-------------|--------|
| 회원 관리 | `/operator/members` (=`/operator/users` legacy) | `UsersManagementPage` | users/membership | `/neture/operator/...` |
| 공급자 활성화 | `/operator/suppliers` | `OperatorSupplierApprovalPage` | `neture_suppliers.status` | `/neture/operator/suppliers/*` |
| (admin) 공급자 승인 | `/admin/admin-suppliers` | `AdminSupplierApprovalPage` | `neture_suppliers.status` | `/neture/admin/suppliers/*` |

- "회원 대기 0" = 멤버십 pending 수. "공급 승인 대기 1" = `neture_suppliers` PENDING 수. **서로 다른 숫자가 정상.**
- 공급자 활성화 권위 화면 = `/operator/suppliers` (admin 화면은 비활성화 액션 추가 보유). 둘 다 동일 `service.approveSupplier()` 호출 → 백엔드 단일 권위. 충돌 없음.

---

## 8. 미확인 / 확인 필요 항목

DB 직접 조회는 **운영 DB 비밀번호 노출 정책**(메모리 "비번 기록금지")에 의해 차단되어 본 IR 에서는 수행하지 않았다. 다음은 운영자 Network 탭 또는 승인된 read-only SQL 로 1회 확인 권장:

1. sohae21@naver.com 의 `neture_suppliers` row 에서 `manager_name`/`manager_phone` 실제 NULL 여부 → 어느 필드가 400 을 유발하는지 확정.
2. 활성화 클릭 시 `POST /neture/operator/suppliers/:id/approve` 의 실제 응답(예상: 400 `ONBOARDING_INCOMPLETE:managerName`).
3. `manager_name` 누락 공급자가 전반적으로 몇 건인지(시드/복원 row 영향 범위).

---

## 9. 권장 정책안 (사용자 제시안과 일치)

- 회원 ACTIVE = 로그인 가능
- 공급자 PENDING = 대시보드 접근·프로필 작성 가능 (현행 유지, 화면에 상태/가능작업 명시)
- 공급자 ACTIVE = 상품 등록·승인요청·판매 기능 가능 (현행 유지)
- 판매·정산 필수정보는 활성화와 단계 분리 (이미 적용됨)
- 공급자 활성화 단일 권위 = `/operator/suppliers`
- 회원 관리 화면은 공급자 상태 "표시 + 활성화 화면 이동"만 제공

---

## 10. 최소 수정 WO 권고안

**WO-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1 (frontend 우선)**

1. **(필수) 실패 사유 노출**: `operatorSupplierApi.approveSupplier()` 가 `{success, errorCode?}` 를 반환하도록 하고, `handleApprove()` 가 실패 시 사람이 읽을 메시지를 toast/배너로 표시 (예: `ONBOARDING_INCOMPLETE:managerName` → "담당자명이 비어 있어 활성화할 수 없습니다"). → 조용한 no-op 제거.
2. **(필수) 게이트 일치**: `activationReady` 와 "승인 가능 (기본 정보 완료)" 라벨을 백엔드와 동일하게 `representativeName + managerName + managerPhone` 3개 기준으로 변경. 누락 시 버튼 비활성 + tooltip 에 누락 필드 표기.
3. **(권장) 누락 필드 보완 경로**: 운영자가 활성화 화면에서 `managerName`/`managerPhone` 을 직접 보고 채울 수 있는 인라인 편집 또는 공급자 프로필로의 이동 링크.

**데이터(별도 판단 필요)**: 시드/복원으로 생성돼 `manager_*` 가 빈 row 가 다수면, registration→supplier 필드 매핑(`operator-registration.service.ts:175-176`) 보완 또는 1회 backfill 검토. 단 "UI 정책 문제를 backfill 로 숨기지 않는다"(CLAUDE.md §1) 원칙에 따라, 위 1·2 의 UI 정합 수정이 선행되어야 한다.

> 본 IR 은 조사만 수행했다. 위 WO 는 별도 승인 후 진행한다.
