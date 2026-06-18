# IR-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-STATE-AUDIT-V1

> **유형:** Read-only Investigation Report
> **작성일:** 2026-06-18
> **선행:** `WO-NETURE-SUPPLIER-APPROVAL-TWO-STEP-ACTIVATION-V1`, `WO-O4O-NETURE-OPERATOR-MEMBER-SUPPLIER-STATUS-VISIBILITY-V1`, `WO-O4O-NETURE-RBAC-APPROVAL-PRODUCT-FLOW-INTEGRATION-V1`
> **결론(요약):** **버그 아님 (Case A: 정상 동작 + UX 혼동).** `/operator/members` 화면은 **두 개의 독립된 상태 축**(① 회원 가입 상태 = `service_memberships.status` / ② 공급자 프로필 상태 = `neture_suppliers.status`)을 다루는데, 상단 stats·탭·승인 액션은 모두 ① 축만 본다. ② 축(공급 승인 = 2단계)은 `/operator/suppliers`에서 처리된다. 세 증상 모두 이 **2단계 승인 모델**과 **축 분리 미표시**로 설명되며, 집계·승인 API·로그인 정책에 데이터 결함은 없다. → 권고 = **UX 명확화(P1)**, 코드/정책 수정 불필요.

---

## 0. 검증 방식

- 정적 코드 분석(read-only) + **프로덕션 API read-only 호출**(CLAUDE.md §8 허용 채널).
- 운영 데이터 변경·상태 전이 실행 없음. 검증은 운영자 계정(`sohae2100@gmail.com`, `neture:operator`/`neture:admin`/`platform:super_admin` 보유)으로 GET 호출만 수행.
- 민감 데이터(비밀번호/토큰)는 본 문서에 기록하지 않음.

---

## 1. 조사 범위

| 영역 | 대상 |
|------|------|
| Backend stats | `MembershipConsoleController.getStats` (`/operator/members/stats`) |
| Backend list | `MembershipConsoleController.getMembers` (`/operator/members`) |
| 가입 승인(step1) | `OperatorRegistrationService.approveRegistration` (`POST /neture/operator/registrations/:userId/approve`) |
| 공급 승인(step2) | `neture_suppliers` 활성화 (`/operator/suppliers`, `GET /neture/operator/suppliers`) |
| 등록 | `auth-register.controller.ts` (user.status·membership.status·supplier row) |
| 로그인 | `auth-login.service.ts` (account status gate, serviceKey membership gate) |
| Operator FE | `services/web-neture` `UsersManagementPage.tsx`, `@o4o/operator-core-ui OperatorMembersConsolePage.tsx` |

---

## 2. 핵심 구조 — 두 개의 독립된 상태 축

`/operator/members` 한 화면에 **성격이 다른 두 상태**가 동시에 표시된다.

| 축 | 의미 | SSOT 컬럼 | 단계 | 처리 화면 |
|---|------|----------|:---:|----------|
| **① 회원 가입 상태** | 이 사람을 Neture 회원으로 받을지 | `service_memberships.status` (`pending`/`active`/`rejected`/`suspended`/`withdrawn`) | **Step 1 가입 승인** | `/operator/members` (또는 `/operator/applications`) |
| **② 공급자 프로필 상태** | 회원이 된 공급자를 실제 공급사로 활성화할지 | `neture_suppliers.status` (`PENDING`/`ACTIVE`/`REJECTED`/`INACTIVE`) | **Step 2 공급 승인** | `/operator/suppliers` |

이 2단계 모델은 명문화되어 있다 — `approveRegistration`(`operator-registration.service.ts:184-195`)이 **가입 승인 시 `neture_suppliers`를 `PENDING`으로 생성**하고, 운영자가 별도로 공급 승인해야 `ACTIVE`가 된다(`WO-NETURE-SUPPLIER-APPROVAL-TWO-STEP-ACTIVATION-V1`).

> 즉 **"회원=active + 공급자 프로필=PENDING"** 조합은 비정상이 아니라 **2단계 모델의 정상 중간 상태**다(`UsersManagementPage.tsx:84-93` 주석에도 동일하게 기술).

---

## 3. 증상별 조사 결과

### 3.1 증상 1 — 상단 "대기 0"인데 공급자 프로필 "승인대기"가 보임

**stats 집계 기준 (확정):** `getStats`(`MembershipConsoleController.ts:1264-1318`)는

```sql
SELECT sm.status, COUNT(DISTINCT sm.user_id) FROM service_memberships sm
WHERE sm.service_key = ANY($1) GROUP BY sm.status
```

→ **`service_memberships.status` 기준** 집계. 콘솔 카드(`OperatorMembersConsolePage.tsx:334-336, 718`)의 "대기"는 `getCount('pending')`이다.

**프로덕션 실데이터 (운영자 API GET):**

```text
GET /operator/members/stats?serviceKey=neture
  → total 5, byStatus = [{ active: 5 }]        # pending 0, rejected 0

GET /neture/operator/suppliers
  → 5건 중 PENDING 3, ACTIVE 2
     PENDING: test@test.com, aop80@naver.com, sohae21@naver.com
```

**판정: Case A (정상).** 모든 Neture 회원의 가입 상태가 `active`이므로 "대기 0"은 **가입 대기 기준으로 정확**하다. 화면의 "공급자 프로필: 승인대기"는 `neture_suppliers.status='PENDING'`(② 축)이며, **members stats 카드는 ② 축을 집계하지 않는다.** 두 숫자가 다른 것은 서로 다른 축을 세기 때문이다.

> UX 문제: 운영자 입장에서 "대기 0"과 "승인대기 배지 2~3개"가 같은 화면에 공존해 **할 일이 없는 것처럼 보임**(실제로는 공급 승인 step2 대기 작업이 있음). 집계 결함이 아니라 **표시 분리 미흡**.

### 3.2 증상 2 — 승인하려니 "이미 승인된 것처럼" 되어 승인 불가

**members 콘솔 승인 액션의 실제 경로 (확정):**
- `UsersManagementPage.tsx`의 client `updateStatus`(`:126-143`): `approved` + (현재 pending/rejected) → `POST /neture/operator/registrations/:id/approve` = **가입 승인(step1)**.
- `approveRegistration`(`operator-registration.service.ts:97-105`)은 `service_memberships.status IN ('pending','rejected')`가 없으면 **`REGISTRATION_NOT_FOUND`**("Registration not found or already processed")을 던진다.

**프로덕션 실데이터:** `test@test.com`, `aop80@naver.com` 모두 `user.status=active`, neture membership `active`(role `supplier`), `neture_suppliers=PENDING`.

→ 이들은 **이미 가입 승인(step1)이 끝난 상태**다. 따라서 members 화면에서 가입 승인을 다시 시도하면 "already processed"가 정상 응답이다.

**액션 노출 (확정):** `OperatorMembersConsolePage.tsx:669`은 승인/거절 행 액션을 **`status==='pending' || 'rejected'`일 때만** 노출한다. `active` 회원에겐 승인 버튼이 표시되지 않으며, bulk 승인(`:411`)도 pending만 타겟한다.

**판정: Case A/E (UX·액션 혼동, 데이터 결함 없음).** 운영자가 실제로 해야 하는 작업은 **공급 승인(step2) = `/operator/suppliers`**다. members 화면은 공급 승인 기능을 의도적으로 제공하지 않고, PENDING 배지에 `/operator/suppliers`로 가는 링크만 약하게 건다(`UsersManagementPage.tsx:332-341`).

> 미해소 항목(사용자 확인 필요): 운영자가 정확히 어떤 UI 요소(드로어 / bulk / 배지)를 눌렀을 때 "이미 승인됨"을 봤는지. active 회원엔 승인 버튼이 없으므로, **공급 승인을 members 화면에서 찾으려다 발생한 혼동**일 가능성이 높다.

### 3.3 증상 3 — 가입신청 승인 전 로그인이 가능한지

**로그인 게이트 (확정, `auth-login.service.ts`):**
- **`user.status`가 `ACTIVE`/`APPROVED`가 아니면 로그인 차단**(`:220-223`, `AccountInactiveError` → 403 `ACCOUNT_NOT_ACTIVE`).
- serviceKey membership 검증(`:165-181`)은 **멤버십 행 존재 여부만** 본다(status 무관). 행이 없으면 `SERVICE_NOT_MEMBER`.

**등록 시 상태 (확정):** `auth-register.controller.ts`는 신규 사용자를 **PENDING**으로 만들고 자동 로그인하지 않는다(`:600` "No auto-login after registration (status = PENDING)"). `approveRegistration`이 승인 시 `user.status='active'`로 전환(`:128-131`).

**따라서 정책은 단계별로 명확하다:**

| 시점 | user.status | 로그인 | 판정 |
|------|:----------:|:-----:|------|
| 가입 신청 직후 (step1 전) | `pending` | **불가** (403) | 정책 = 승인 전 로그인 차단 |
| 가입 승인 후 (step1 완료, step2 전) | `active` | **가능** | 2단계 모델상 의도된 동작 |
| 공급 승인 후 (step2 완료) | `active` | 가능 | — |

**판정: Case A (정책상 정상).** "가입 승인 전 로그인 불가"는 `user.status` 게이트로 강제된다. "공급 승인 전 로그인 가능"은 버그가 아니라 **2단계 설계의 의도된 결과**(가입 승인된 공급자는 로그인하여 공급자 온보딩/심사 상태를 확인·보완할 수 있어야 함).

> 별도 확인 권장: **공급 승인(step2) 전 supplier가 어디까지 접근 가능한지**(상품 등록/공급 기능 gating)는 본 IR 범위를 넘는 별도 audit 대상. `user.status` 게이트는 통과하므로, 공급 기능 제한은 `neture_suppliers.status` 기반 별도 guard가 담당해야 한다(존재 여부 미검증).

---

## 4. 프로덕션 실데이터 (3계정, 운영자 API GET)

| 계정 | user.status | neture membership | role | neture_suppliers | 해석 |
|------|:-----------:|:-----------------:|------|:---------------:|------|
| `test@test.com` | active | active | supplier | **PENDING** | step1 완료 · step2 대기 (화면 상태와 일치) |
| `aop80@naver.com` | active | active | supplier | **PENDING** | step1 완료 · step2 대기 |
| `renagang21@gmail.com` | active | active (+ kpa/glycopharm/cosmetics) | supplier 외 | ACTIVE | 4서비스 회원 · 공급자 ACTIVE (공유 계정) |

`renagang21`은 다중 서비스 공유 계정(KPA 약국 / Glycopharm 약국 / K-cosmetics store_owner / Neture supplier)이며 **운영 권한(operator/admin) 없음**.

---

## 5. 결론 분류

| Case | 정의 | 본 건 해당? |
|------|------|:----------:|
| **A** | 정상 동작 + UX 혼동 | ✅ **주 원인** (증상 1·2·3 전부) |
| B | stats 집계 버그 | ❌ (membership pending 정확 집계) |
| C | 공급자 승인 액션 버그 | ❌ (members 승인 = 가입 승인이며 정상 동작 / 공급 승인은 별 화면) |
| D | 승인 전 로그인/접근 정책 버그 | ❌ (가입 승인 전 로그인 차단됨 = 정책 준수) |
| E | 복합 문제 | △ (증상 2는 A에 액션-라우팅 혼동 결합 — UX 범주) |

**종합:** "상태 모델 혼재 버그"가 아니라, **회원 가입 상태(①)와 공급자 프로필 상태(②)라는 두 정상 축이 운영자 화면에서 시각적으로 분리되지 않아 생기는 UX 혼동**이다. 집계·승인 API·로그인 정책은 설계대로 동작한다.

---

## 6. 후속 WO 후보

| 우선순위 | 후보 | 내용 | 비고 |
|:---:|------|------|------|
| **P1** | `WO-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-UX-CLARIFY-V1` | (a) members stats 영역에 "공급 승인 대기"(neture_suppliers PENDING) 별도 지표/안내 노출, (b) 공급자 프로필 PENDING 행에 "공급 승인 →" 명시 액션(현재 배지 tooltip+link만), (c) "가입 승인(step1)"과 "공급 승인(step2)" 2단계임을 화면에 명시 | B안 성격. 코드 로직 변경 없이 표시/안내 보강 |
| 확인 | `IR-O4O-NETURE-SUPPLIER-PREAPPROVAL-ACCESS-GATE-AUDIT-V1` | 공급 승인(step2) 전 supplier가 접근 가능한 기능 범위 + `neture_suppliers.status` 기반 guard 존재 여부 | 별도 read-only audit |
| 보류 | (집계/승인/로그인 코드 수정) | — | **불필요** (정상 동작 확정) |

권고 순서: **P1(UX 명확화)**. 집계 기준 변경·승인 API·로그인 정책은 **수정하지 않는다.**

---

## 7. 하지 않은 것 (범위 준수)

- 코드/DB/enum/API/UI/알림 변경 없음. 운영 데이터 변경(UPDATE/DELETE) 없음. 상태 전이 실행 없음.
- 운영자 계정으로 read-only GET 호출만 수행(stats / suppliers / members lookup).
- 본 IR 문서 1개만 산출.

---

*Generated as read-only investigation. Implementation requires separate WO approval per CLAUDE.md.*
