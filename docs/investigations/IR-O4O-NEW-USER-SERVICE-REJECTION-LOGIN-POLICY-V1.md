# IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1

> 신규 사용자가 서비스 가입 후 반려되면 플랫폼 로그인 자체가 차단되어 반려 사유를 확인할 수 없는 구조에 대한 **정책 조사**.
>
> **본 IR은 조사 전용이다. 코드 수정 / DB write / migration / 배포를 수행하지 않았다.**

| 항목 | 값 |
|---|---|
| 작성일 | 2026-07-31 |
| 조사 기준 커밋 | `e04974ccdd846e0c7ab3afc32083d80742878658` (main) |
| 선행 WO | `WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1` (commit `183484148`) — D2·D3 마감 |
| 대상 결함 | D1 — 신규 가입자 반려 후 로그인 403 |
| 데이터 조사 | 프로덕션 read-only SELECT 실행 (cloud-sql-proxy) |
| 판정 | **B안 확정 (단기)** — A안은 가드 하드닝 선행 후 별도 WO |

---

## 1. `users.status` 의 실제 의미

### 1.1 enum 허용값

`apps/api-server/src/types/auth.ts:21-28`

```text
UserStatus = active | inactive | pending | approved | suspended | rejected
```

Entity 기본값은 `PENDING` (`modules/auth/entities/User.ts:58-63`).
`isActiveUser()` 는 `active` 또는 `approved` 를 활성으로 본다 (`User.ts:283-288`).

### 1.2 실제 write-path 기준 의미 (문서가 아닌 코드 기준)

`users.status` 를 `pending → active` 로 승격시키는 경로는 **서로 독립인 2개**다.

| # | 경로 | 위치 | 트리거 | 운영자 개입 |
|---|---|---|---|---|
| W1 | 이메일 인증 링크 클릭 | `services/passwordResetService.ts:250-257` | 사용자가 메일 링크 클릭 | **없음** |
| W2 | 서비스 membership 승인 | `services/approval/MembershipApprovalService.ts:322-327` | 운영자가 **아무 서비스나** 승인 | 있음 |

W2 의 UPDATE 는 "첫 번째 승인"이 아니라 **모든 승인**에서 실행된다.

```sql
UPDATE users SET status='active', "isActive"=true, "approvedAt"=NOW(), ...
 WHERE id=$2 AND status IN ('PENDING','pending','ACTIVE','active','inactive','deleted','rejected')
```

그 밖의 write:

| 경로 | 위치 | 결과 |
|---|---|---|
| 회원가입(신규) | `modules/auth/controllers/auth-register.controller.ts:395-521` | entity 기본값 `pending`, `isActive=true` |
| 관리자 사용자 생성 | `controllers/admin/AdminUserController.ts:209-258` | 기본 `approved`, `isActive=true` |
| OAuth 최초 로그인 생성 | `services/auth/auth-login.service.ts:450` | `active` |
| 운영자 콘솔 회원 상태변경 | `controllers/operator/MembershipConsoleController.ts:597-601` | 지정 status + **`isActive=false`** |
| 운영자 콘솔 일괄 반려 | `controllers/operator/MembershipConsoleController.ts:717-721` | `status='rejected'` + **`isActive=false`** |

### 1.3 결론

`users.status='pending'` 은 **단일 의미를 갖지 않는다.**

```text
pending = (이메일 미인증) AND (승인된 서비스 membership 0)
active  = (이메일 인증 완료) OR (임의 서비스 1개 이상 승인)
```

즉 **플랫폼 차원의 승인 상태가 아니다.** 운영자 개입 없이 사용자가 메일 링크만 눌러도 `active` 가 되므로, `users.status` 는 법적·계약상 플랫폼 승인 게이트로 사용되고 있지 않다 (§10 중지 조건 ① **비해당**).

반면 **이메일 인증과 서비스 승인이 동일 컬럼을 공유**한다 (§10 중지 조건 ② **해당**). 이 사실은 §12 권장안에 반영했다.

---

## 2. `service_memberships.status` 의 실제 의미

서비스별 가입·승인의 SSOT 이며 값은 `pending | active | rejected | suspended | withdrawn`.
서비스 접근 권한은 전부 이 값 + prefix role 기준으로 판정된다 (`middleware/*-scope.middleware.ts`, `createMembershipScopeGuard`, default DENY).

`users.status` 와 달리 **서비스별로 독립**이며, 반려는 해당 서비스 membership 과 해당 서비스 role 에만 영향을 준다 (`WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1` 에서 확정·구현됨).

---

## 3. 신규 사용자 생성 경로 전수

| 경로 | 엔드포인트/위치 | users.status | isActive | membership.status | role | 이메일 인증 |
|---|---|---|---|---|---|---|
| 공통 회원가입(신규) | `POST /api/v1/auth/register` | `pending` | `true` | `pending` | 미부여 | 발송(best-effort) |
| 공통 회원가입(기존 사용자, 서비스 추가) | 동 | 불변 | 불변 | `pending` | 미부여 | 미발송 |
| Pharmacy-Hub 가입 | `POST /api/v1/pharmacy-hub/join` → 공통 register 위임 | `pending` | `true` | `pending` | 미부여 | 발송 |
| 관리자 생성 | `POST /api/v1/admin/users` | `approved`(기본) | `true` | 없음 | 즉시 부여 | 없음 |
| OAuth 최초 로그인 | `auth-login.service.ts:450` | `active` | `true` | 서비스별 | 서비스별 | 인증 간주 |

허용 가입 role 은 서비스별로 화이트리스트로 제한된다 (Neture `supplier|partner` — `auth-register.controller.ts:71-81`, Pharmacy-Hub `store_owner|supplier` — L115-119).
`serviceKey` 는 `'kpa' → 'kpa-society'` 로 canonical 정규화된다 (L58-60).

이메일 인증 요청은 **best-effort** 로, 실패해도 가입은 성공한다 (`auth-register.controller.ts:539-544`).
가입 직후 자동 로그인은 없다 (L705 주석: `No auto-login after registration (status = PENDING)`).

---

## 4. `users.status='active'` 전환 write 전수

§1.2 표 참조. 요약:

- **첫 승인만이 아니라 모든 승인**에서 W2 가 실행된다.
- **반려 시 `users.status` 는 변하지 않는다** (`MembershipApprovalService.rejectMembership` 은 users 테이블을 건드리지 않음).
- 예외적으로 **운영자 콘솔의 사용자 단위 상태 변경/일괄 반려**는 `users.status` 와 `isActive=false` 를 함께 쓴다 (`MembershipConsoleController.ts:597-601`, `717-721`). 이 경로로 반려된 사용자는 정책 A 를 적용해도 `requireAuth` 에서 401 로 막힌다.
- 정지·탈퇴(`suspendMembership` / `withdrawMembership`)는 `users.status` 를 변경하지 않는다.

---

## 5. 로그인 차단 구조

`services/auth/auth-login.service.ts` 기준 실행 순서:

```text
1. 이메일로 사용자 조회            → 없으면 401 INVALID_CREDENTIALS
2. 비밀번호 검증 (service_credentials → users.password fallback)
3. serviceKey 가 주어지면 membership "존재" 확인   (L165-181)
     - status 는 보지 않는다 (pending/rejected 도 통과)
     - platform:super_admin / platform:admin / super_admin 은 bypass
     - 실패 → 401 SERVICE_NOT_MEMBER
4. users.status ∈ {active, approved} 검사          (L219-223)
     - 실패 → AccountInactiveError → 403 ACCOUNT_NOT_ACTIVE   ← D1 차단 지점
5. isEmailVerified 검사 (REQUIRE_EMAIL_VERIFICATION==='true' 일 때만)  (L226-236)
6. JWT 발급
```

즉 **JWT 발급 전에 `users.status` 를 본다.** membership status 는 로그인 단계에서 검사되지 않는다.
HTTP 매핑은 `modules/auth/controllers/auth-login.controller.ts:115-129` (`ACCOUNT_NOT_ACTIVE` → 403).

API 단 게이트는 다른 축이다: `requireAuth` 는 `users.status` 가 아니라 **boolean `users.isActive`** 를 본다 (`common/middleware/auth/authentication.middleware.ts:34-105`, 실패 시 401 `USER_INACTIVE`).

### 5.1 상태 조합표

| # | users.status | membership.status | 로그인 | requireAuth | 서비스 기능 | 실제 경로 |
|---|---|---|---|---|---|---|
| 1 | pending | pending | **403** | – | – | 신규 가입 직후 (메일 미인증) |
| 2 | pending | rejected | **403** | – | – | **D1** — 반려 사유 확인 불가 |
| 3 | active | pending | 200 | 통과 | 차단(scope guard) | 메일 인증 후 승인 대기 |
| 4 | active | rejected | 200 | 통과 | 차단(scope guard) | 승인→반려 이력 사용자 |
| 5 | active | active | 200 | 통과 | 허용 | 정상 |
| 6 | rejected/suspended | any | **403** | 401 | – | 운영자 콘솔 사용자 단위 반려 |

---

## 6. 이메일 인증 구조

- 구조는 **존재한다**: `email_verification_tokens` 테이블, `PasswordResetService.requestEmailVerification` (`passwordResetService.ts:179-220`), `verifyEmail(token)` (L225-263), `POST|GET /api/v1/auth/verify-email` (`modules/auth/routes/auth.routes.ts:178-188`).
- 메일 발송은 **실제로 동작한다**: 프로덕션 `o4o-core-api` 에 `EMAIL_SERVICE_ENABLED=true`, `SMTP_HOST=smtp.gmail.com` 설정 확인.
- **`REQUIRE_EMAIL_VERIFICATION` 은 프로덕션에 설정되어 있지 않다** (Cloud Run env 전수 확인, 매치 0건). 따라서 `auth-login.service.ts:226` 의 이메일 인증 게이트는 **비활성**이며, 미인증 사용자도 `users.status` 만 활성이면 로그인된다.
- `verifyEmail` 은 `isEmailVerified=true` 와 함께 `status PENDING → ACTIVE`, `approvedAt=NOW()` 를 설정한다. **운영자 승인 없이 계정이 활성화되는 유일한 사용자 자기주도 경로**다.

**핵심 판단**: 이메일 인증은 "플랫폼 계정 사용 가능"을 의미하는 신호로 이미 사용되고 있고, 서비스 승인과 **같은 컬럼을 공유**한다. 두 의미가 강하게 결합돼 있으므로(§10 ②), `users.status` 를 건드리는 어떤 정책이든 **`verifyEmail` 의 status write 를 함께 정의해야 한다.**

---

## 7. 멀티서비스 영향

- **한 서비스의 승인이 플랫폼 전체 계정을 활성화한다** (W2 가 첫 승인 한정이 아님). 예: KPA 승인 → `users.status='active'` → Pharmacy-Hub 신청 전에도 플랫폼 로그인 가능.
- **한 서비스의 반려는 플랫폼 계정을 막지 않는다** (`rejectMembership` 이 users 를 건드리지 않음). 단 **최초 서비스에서 반려된 신규 사용자**는 `pending` 이 잔존하므로 결과적으로 전체가 막힌다 = D1.
- 서비스 간 격리는 membership + prefix role 로 유지된다. 반려는 해당 서비스 role 만 비활성화한다.
- **비대칭**: 승인은 플랫폼 축(users)을 건드리고, 반려는 건드리지 않는다. 이 비대칭이 D1 의 구조적 원인이다.

---

## 8. 공통 화면·API 노출 위험 (users.status=active + 승인 membership 0)

`requireAuth` 만 걸린 라우트 등록은 **278건**(routes/ 하위, 동일 라인에 role/scope 가드가 없는 경우) 이다. 표본 검증 결과 3가지로 나뉜다.

| 유형 | 예 | 실제 위험 |
|---|---|---|
| **A. 핸들러 내부 role 검사 있음** | `o4o-store/controllers/operator-*.controller.ts` (`requireOperator(req,res)`), `blog.controller.ts` staff (`verifyOwner`) | 낮음 — role/소유권 없으면 403 |
| **B. 라우터 레벨 가드 있음** | `platform/physical-store.routes.ts` (`router.use(requireAdmin)`), `forum/admin-forum.routes.ts` | 낮음 |
| **C. 인증만 있고 권한 검사 없음** | **`/api/v1/cpt/*`** — `routes/cpt.ts:31-43` 은 `authenticate` 만으로 CPT 포스트 **조회·생성·수정·삭제** 허용 (`requireAdmin` 은 type CRUD 에만). `routes/dashboard/dashboard-assets.routes.ts:50-63` — 전 엔드포인트 `authenticate` 만, 목록 쿼리는 클라이언트가 보낸 `dashboardId` 를 그대로 `cms_media."organizationId"` 에 바인딩(`dashboard-assets.query-handlers.ts:76-82`)하며 소유권을 검증하지 않음 | **높음** |

유형 C 는 **현재도 존재하는 결함**이며 Boundary Policy Guard Rule ①(UUID 단독 조회 금지)·③(Domain Primary Boundary 필터 필수) 위반이다.
다만 지금은 "로그인 가능 사용자 = 사실상 승인된 사용자" 여서 노출 모집단이 작다. **정책 A 를 적용하면 자가 가입한 임의의 사용자(미승인·반려 포함)가 이 모집단에 들어온다.** 이것이 본 IR 이 A 를 즉시 확정하지 않는 결정적 근거다.

§10 중지 조건 ③("membership guard 없이 로그인 사용자에게 민감 기능이 광범위 노출")은 **부분 해당** — "광범위"까지는 아니나 실재하는 경로가 2개 확인됐다.

---

## 9. `ACCOUNT_NOT_ACTIVE` 프론트 소비처 전수

| 소비처 | 위치 | 표시 문구 |
|---|---|---|
| Admin Dashboard | `apps/admin-dashboard/src/pages/auth/Login.tsx:84` | `'가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다.'` |
| KPA Society | `services/web-kpa-society/src/components/LoginModal.tsx:134` | 동일 |
| 공통 메시지 사전 | `packages/error-handling/src/error-messages.ts:34`, `packages/auth-utils/src/errorMessages.ts:5` | 동일 |
| **Pharmacy-Hub** | `services/web-pharmacy-hub/src/pages/LoginPage.tsx:31-37` | **분기 없음** → `wrapped.message` 그대로 = **`'Account is not active'` 영문 원문 노출** (`errors/AuthErrors.ts:93-101`) |
| Neture / GlycoPharm / K-Cosmetics 로그인 화면 | – | `ACCOUNT_NOT_ACTIVE` 분기 없음 |

**어느 소비처도 "반려됨"을 구분하지 못한다.** 문구는 전부 "승인 대기"로 고정돼 있어, 반려된 사용자에게 사실과 다른 안내가 표시된다.
Pharmacy-Hub 의 `/join/status` 는 `requireAuth` 를 요구하므로(`routes/pharmacy-hub/pharmacy-hub.routes.ts:104`) 반려 사유 화면 자체가 dead path 다. `MembershipGate.tsx:34-35` 는 `rejected → '반려 사유 확인'` 링크를 제공하지만 D1 상황에서는 도달 불가능하다.

---

## 10. 시나리오 판정

| # | 시나리오 | 판정 |
|---|---|---|
| ① | 신규 → Pharmacy-Hub 첫 가입 → 반려 | **로그인 403.** 반려 사유 확인 불가 = D1. 단, 사용자가 이메일 인증 링크를 눌렀다면 `users.status='active'` 가 되어 로그인 가능 (§6) |
| ② | 기존 KPA active → Pharmacy-Hub 추가 가입 → 반려 | 로그인 정상. KPA 기능 정상. Pharmacy-Hub scope 만 403. `/join/status` 접근 가능 |
| ③ | 신규 → 첫 서비스 pending → 두 번째 서비스 신청 | `POST /auth/register` 는 public 이므로 신청 자체는 가능(기존 사용자 분기, membership `pending` 추가). 단 로그인은 여전히 403 |
| ④ | 한 서비스 active + 다른 서비스 suspended/rejected | 로그인 정상. 각 서비스 scope guard 가 독립 판정. role 은 반려 시 해당 서비스만 비활성화 |
| ⑤ | 승인 membership 0 + users.active | 로그인 가능, `requireAuth` 통과. 서비스 scope 는 전부 403. **단 §8 유형 C 경로는 접근 가능** |
| ⑥ | 이메일 미인증 + membership active | **현실적으로 다수 존재** (프로덕션 `active` 16명 중 11명이 `isEmailVerified=false`). `REQUIRE_EMAIL_VERIFICATION` 미설정이라 로그인·이용 모두 정상 |

---

## 11. 데이터 근거 (프로덕션 read-only SELECT, 2026-07-31)

접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db` → `o4o_platform`. **SELECT 만 실행했다. write·migration 없음. 개인식별 정보는 조회·기재하지 않았다.**

| 질의 | 결과 |
|---|---|
| `users.status` 분포 | `deleted 19` / `active 16` / `approved 4` / `pending 1` |
| `users.status × isEmailVerified` | `active` 16명 중 **미인증 11 / 인증 5**, `approved` 4명 전원 미인증, `pending` 1명 미인증 |
| `users.status × isActive` | `active|approved` 20명 전원 `isActive=true`, `deleted` 19명 전원 `false` |
| membership 분포 | `platform:active 7`, `k-cosmetics:active 5`, `kpa-society:active 5`, `glycopharm:active 4`, `neture:active 4`, `pharmacy-hub:active 4`, `k-cosmetics:pending 1`, `pharmacy-hub:rejected 1` |
| users.pending × membership.rejected | **0** |
| users.pending × membership.active | 0 |
| users.active × membership.pending(승인 0) | 0 |
| users.active × membership.rejected | **1** |
| users.active + 승인 membership 0 | **2** (둘 다 활성 role_assignment 보유 = 플랫폼/관리 계정) |
| membership 행이 아예 없는 active 사용자 | 1 |
| 다중 서비스 사용자 | 1개 서비스 17명 / 3개 1명 / 5개 1명 / 6개 1명 |
| `email_verification_tokens` | 발급 **28건**, 사용 **1건** |

### 해석

1. **D1 의 라이브 인스턴스는 현재 0건**이다. 유일한 `pending` 사용자는 K-Cosmetics **승인 대기**(반려 아님)이며, 유일한 `rejected` membership 은 `users.status='active'` + `approvedAt` 존재 = **승인 후 반려**된 E2E 계정(시나리오 ②)이다. D1 은 구조적으로 실재하지만 현재 모집단이 작다.
2. **이메일 인증 링크는 사실상 사용되지 않는다** (28건 발급 / 1건 사용). 즉 `users.status` 를 활성화하는 실질적 경로는 **W2(운영자 승인) 단독**이다. 문서상 이중 경로지만 운영상으론 승인 단일 경로에 가깝다.
3. `active` 사용자의 다수가 이메일 미인증이라는 사실은, `isEmailVerified` 가 현재 어떤 게이트로도 쓰이지 않음을 재확인한다.

---

## 12. 정책안 비교

| 기준 | **A. 플랫폼/서비스 완전 분리** (등록 시 users.active) | **B. 현행 유지 + pending 제한 로그인** | **C. 반려 시에만 active 전환** | **D. account_state 신설** |
|---|---|---|---|---|
| 상태 의미 명확성 | 최상 — users=계정, membership=서비스 | 중 — pending 의미 유지, 접근만 예외 | 하 — `active` 가 "반려됨"도 의미하게 됨 | 최상 |
| 멀티서비스 정합성 | 최상 | 상 | 중 | 최상 |
| **보안** | **하** — §8 유형 C 경로의 노출 모집단이 자가가입 전체로 확대 | **상** — allowlist default-deny 로 오히려 현행보다 축소 | 중 | 상 |
| 사용자 경험 | 상 | 상 (D1 해결) | 중 (pending 사용자는 여전히 상태 확인 불가) | 상 |
| 구현 복잡도 | 중 (register + verifyEmail + 콘솔 3곳) | 중 (제한 토큰 + allowlist 미들웨어) | 하 | **최상(과대)** |
| 회귀 위험 | **상** — 로그인 가능 모집단 변경이 전 서비스에 영향 | 중 — 신규 경로 추가라 기존 경로 불변 | 중 | 상 |
| 데이터 정비 | 기존 pending 일괄 전환 필요 | 불필요 | 불필요 | 전면 백필 |
| 운영 편의 | 상 | 상 | 중 | 상 |

D 는 IR 지시에 따라 이번 범위에서 구현 대상이 아니다.

---

## 13. 권장 결론 — **B안**

**판정: B안 (현행 `users.status` 정책 유지 + pending/rejected 사용자에게 allowlist 기반 제한 로그인 허용).**

근거:

1. **A 를 지금 확정할 수 없는 결정적 사유는 §8 유형 C 다.** `/api/v1/cpt/*` 의 포스트 CRUD 와 `dashboard-assets` 의 `dashboardId` 무검증 조회는 `authenticate` 만으로 통과한다. A 는 "회원가입만 하면 로그인 가능"으로 모집단을 열기 때문에, 가드 하드닝 없이 A 를 적용하면 **미승인·반려 사용자에게 쓰기 가능한 경로가 열린다.** 이는 D1(사유 확인 불가)보다 큰 리스크다.
2. **B 는 default-deny 로 설계된다.** 제한 토큰 사용자는 allowlist 에 있는 경로(`/auth/me`, `/{service}/join/status`, 로그아웃, 재신청)만 통과하고 나머지는 전부 403 이다. 따라서 §8 유형 C 는 **자동으로 차단**되며, 노출면이 늘지 않는다.
3. **이메일 인증과의 결합(§10 ②)을 지금 건드리지 않아도 된다.** A/C 는 `verifyEmail` 의 status write 재정의를 강제하지만, B 는 `users.status` 의 의미를 바꾸지 않으므로 이 결합을 그대로 둔 채 D1 만 해결한다.
4. **데이터 정비 0.** 기존 pending·rejected 행의 의미를 재해석할 필요가 없다 (§10 ⑤ 회피).
5. C 는 pending 사용자의 상태 확인 문제를 해결하지 못하고 `active` 의 의미만 훼손한다. D 는 현 규모(총 사용자 40명 미만) 대비 과대 설계다.

**A 는 폐기가 아니라 연기다.** `users.status` 가 이미 플랫폼 승인 게이트로 기능하지 않는다는 §1.3 의 사실은 A 가 최종적으로 옳은 방향임을 지지한다. 다만 **선행 조건 2개**를 충족한 뒤 별도 WO 로 이행해야 한다.

```text
선행 조건 1. requireAuth-only 경로 가드 하드닝 (최소 /api/v1/cpt/*, dashboard-assets)
선행 조건 2. verifyEmail 의 users.status write 정책 재정의
             (이메일 인증 = 계정 활성인가, 아니면 isEmailVerified 만인가)
```

---

## 14. 구현 시 예상 변경 범위 (B안 기준 — 본 IR 에서 구현하지 않음)

| 계층 | 파일 | 변경 성격 |
|---|---|---|
| 로그인 | `services/auth/auth-login.service.ts:219-223` | `users.status` 비활성 시 즉시 throw 대신, **제한 토큰**(scope=`restricted`) 발급 분기 추가 |
| 토큰 | JWT payload | `restricted: true` 또는 `tokenScope` 클레임 추가 (기존 클레임 불변) |
| 인증 미들웨어 | `common/middleware/auth/authentication.middleware.ts` | 제한 토큰이면 **allowlist 외 전 경로 403** (default DENY) |
| 컨트롤러 | `modules/auth/controllers/auth-login.controller.ts:115-129` | 제한 로그인 응답에 `membershipStatus`/`rejectionReason` 전달 |
| 프론트 (공통) | `packages/auth-utils/src/errorMessages.ts` 외 | 반려/대기 구분 문구 분리 |
| 프론트 (Pharmacy-Hub) | `LoginPage.tsx`, `MembershipGate.tsx`, `JoinStatusPage.tsx` | 제한 로그인 후 `/join/status` 리디렉션 |
| 프론트 (기타 서비스) | KPA / Neture / GlycoPharm / K-Cosmetics 로그인 화면 | 공통 처리 확인 (Shared Module Change Rule 적용 — 5개 서비스 전수 확인 필수) |

**migration: 불필요.** 신규 컬럼·테이블 없음.
**기존 데이터 정비: 불필요.** pending 1건 / rejected 1건 모두 재해석 대상 아님.

---

## 15. 후속 WO 제안

| # | 제안 WO | 우선순위 | 비고 |
|---|---|---|---|
| 1 | `WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1` | **P1** | B안 구현. 5개 서비스 공유 Core 변경 → Shared Module Change Protocol 적용 |
| 2 | `WO-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1` | **P1** | §8 유형 C 마감 (`/api/v1/cpt/*`, `dashboard-assets`). **A안의 선행 조건이자 현행 결함** |
| 3 | `WO-O4O-REJECTION-REASON-UX-ALIGNMENT-V1` | P2 | `ACCOUNT_NOT_ACTIVE` 문구 분리, Pharmacy-Hub 영문 원문 노출 제거 |
| 4 | `IR-O4O-EMAIL-VERIFICATION-SEMANTICS-V1` | P2 | `verifyEmail` 의 status write 존치 여부. 토큰 28건 중 1건 사용 = 사실상 미작동 플로우 |
| 5 | `WO-O4O-PLATFORM-ACCOUNT-SEPARATION-V1` (A안) | P3 | 위 2·4 완료 후 재평가 |

---

## 16. 중지 조건 판정

| # | 조건 | 판정 |
|---|---|---|
| ① | `users.status` 가 법적·계약상 플랫폼 승인 상태로 사용 | **비해당** — 사용자 자기주도 경로(이메일 인증)로 활성화 가능 |
| ② | 이메일 인증과 서비스 승인이 동일 상태값에 강하게 결합 | **해당** — 동일 컬럼 이중 write. B안은 이 결합을 건드리지 않으므로 회피 가능 |
| ③ | membership guard 없이 민감 기능 광범위 노출 | **부분 해당** — 광범위하진 않으나 쓰기 가능 경로 2개 확인. A안 차단 사유 |
| ④ | 서비스별로 `users.status` 의미가 다름 | **비해당** — 5개 서비스 모두 공통 Core 경유 |
| ⑤ | 기존 pending 데이터 의미를 코드만으로 판별 불가 | **비해당** — pending 1건, 데이터로 직접 확인 완료 |

②·③ 해당으로 **A안 즉시 확정은 하지 않았고**, 두 조건을 모두 회피하는 B안을 권고했다.

---

## 17. 본 IR 에서 수행하지 않은 것

```text
코드 수정 0
DB write 0
migration 0
users.status 일괄 변경 0
로그인 정책 변경 0
ACCOUNT_NOT_ACTIVE 문구 변경 0
재신청 구현 0
membership UI 변경 0
상품·주문 0
배포 0
```

프로덕션 DB 는 **SELECT 만** 수행했으며, 조회 결과에 개인식별 정보를 포함하지 않았다.
