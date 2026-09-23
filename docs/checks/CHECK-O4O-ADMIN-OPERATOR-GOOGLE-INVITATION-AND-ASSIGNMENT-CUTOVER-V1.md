# CHECK-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1

> WO: [`WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1`](../work-orders/WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1.md)
> 작성일: 2026-09-23 · 상태: **IMPLEMENTATION_COMPLETE · DEPLOY/SMOKE PENDING**

---

## 1. BEFORE 구조 (전환 전)

| 항목 | 전환 전 |
|---|---|
| `/operators` 등록 입력 | email + 이름 + **password** + service + role |
| 서버 경로 | `POST /api/v1/admin/users` — `users` · `role_assignments` · `service_memberships` · **`service_credentials`** 동시 생성 |
| 운영자 인증 | 서비스별 비밀번호(`service_credentials`) · 관리자가 생성·전달·재설정 |
| 비밀번호 변경 | `/operators` 행 액션의 PasswordModal |
| 미가입자 | 관리자가 대신 계정을 만들고 임시 비밀번호를 알려주는 방식 |

전환 후: **관리자는 타인의 비밀번호를 만들지도 재설정하지도 않는다.** 경로는 (A) 기존 Google 사용자 직접 지정,
(B) 이메일 초대 → Google 인증 수락 둘뿐이다.

---

## 2. API 계약

### 2-1. 직접 지정 (§5)

| | |
|---|---|
| `POST /api/v1/admin/operator-assignments` | `{ userId, serviceKey, role }` → 부여 |
| `GET /api/v1/admin/operator-assignments/candidates?q=` | 기존 사용자 검색 (`userId` · `email` · `name` · `hasGoogleLink`) |

- 지정 키는 **`userId`** 다. email 은 Identity Key 가 아니므로 지정 인자로 쓰지 않는다.
- 가드: 요청자 `platform:super_admin` → 대상 존재 → Google linked identity 확인 → role assignable
  → role prefix ↔ `resolveCanonicalServiceKey()` 일치 → transaction.
- credential / password write **0**. 재실행 멱등(`idempotent: true`).
- 응답에 `rolePolicy` · `membershipPolicy` · `membershipStatus` 를 실어 **무엇을 하지 않았는지**를 숨기지 않는다.
- 후보 목록은 Google 연결이 없는 사용자도 **숨기지 않고** `hasGoogleLink:false` 로 내려보내고, 화면이 사유를 적는다.

### 2-2. 초대 (§7~§9)

| | |
|---|---|
| `POST /api/v1/admin/operator-invitations` | `{ email, serviceKey, role }` → 초대 생성 + 메일 |
| `GET /api/v1/admin/operator-invitations` | 목록 |
| `POST /api/v1/admin/operator-invitations/:id/resend` | 재전송(토큰 재발급 · 단일 방식) |
| `POST /api/v1/admin/operator-invitations/:id/cancel` | 취소 (users · role · membership 제거하지 않음) |

초대 생성 시 `users` · `linked_accounts` · `service_memberships` · `role_assignments` · `service_credentials`
write **0**. 동일 `(email, serviceKey, role, pending)` 중복 생성 금지.

### 2-3. 수락 (§10~§14 · 공개)

| | |
|---|---|
| `GET /api/v1/operator-invitations/preview?token=` | `{ invitedEmail, serviceKey, serviceName, role, expiresAt }` |
| `POST /api/v1/operator-invitations/accept` | `{ token, idToken, consents? }` |

- 수락 화면 `https://neture.co.kr/operator-invitations/accept?token=...` (web-neture · 신규 앱 없음 · 외부 redirect 없음).
- Google 검증은 기존 `verifyGoogleIdToken` / `GoogleIdentityService` / `linked_accounts(provider='google')` 재사용.
  **새 GIS 로더 · 새 검증 구현 없음** — `@o4o/auth-client.renderGoogleButton` 그대로 사용.
- 이메일 비교는 `email_verified === true` + `trim + lowercase` 만. dot 제거 · `+alias` 제거 등 canonicalization 없음 →
  불일치 `INVITATION_EMAIL_MISMATCH`.
- email 충돌 시 **자동 병합 금지** — `INVITATION_IDENTITY_CONFLICT` / `EMAIL_IN_USE`.
- `SELECT … FOR UPDATE` 트랜잭션 — 동시 수락 · 토큰 재사용 방지 · 멱등.
- 신규 사용자는 `CONSENT_REQUIRED` → 약관 · 개인정보 동의 후 같은 ID token 재제출.

### 2-4. 토큰 취급 (§8)

- DB 에는 **SHA-256 hash 만** 저장한다(raw token 컬럼 없음).
- raw token 은 메일 본문에만 존재하며 **로그 · 감사 로그 · 응답에 기록하지 않는다.**
- Google ID token · Google `sub` 도 일반 action log 에 복제하지 않는다.

---

## 3. invitation schema

`operator_invitations` (migration `1790125106065-CreateOperatorInvitations`)

| 컬럼 | 비고 |
|---|---|
| `id` uuid PK | |
| `invited_email` | 저장 시 normalize(trim+lowercase) |
| `service_key` · `role` | role prefix ↔ canonical serviceKey 일치 강제 |
| `token_hash` | **UNIQUE** · SHA-256 (raw token 미저장) |
| `status` | `pending` / `accepted` / `cancelled` |
| `expires_at` · `created_at` · `updated_at` · `invited_by` · `accepted_user_id` · `accepted_at` | |

인덱스: `token_hash` UNIQUE · `(invited_email, service_key, role) WHERE status='pending'` partial UNIQUE
(중복 pending 방지) · `service_key` · `status`.

migration lockstep: `manifest.ts` 등재 + `EXPECTED_SCHEMA_STATES` 추가 + `down()` 명시.
fingerprint `3145442eb5…9a6` (5798 lines) 는 **격리 PostgreSQL 15 컨테이너**(baseline `2026-09-18-id685` fresh
bootstrap + incremental 1..3)에서 산출했고, 서로 다른 fresh DB 2회로 재현 확인했다.
**운영 DB 에서 채취하지 않았고, 운영에 직접 SQL 로 schema 를 만들지 않았다.**

---

## 4. 변경 파일

### 신규 (backend)
- `apps/api-server/src/config/operator-role-catalog.ts` — `ASSIGNABLE_OPERATOR_ROLES`(11) · `resolveOperatorRole` · `OperatorRoleContractError`
- `apps/api-server/src/entities/OperatorInvitation.ts`
- `apps/api-server/src/database/migrations/1790125106065-CreateOperatorInvitations.ts`
- `apps/api-server/src/services/admin/operator-assignment.service.ts`
- `apps/api-server/src/services/admin/operator-invitation.service.ts` (`preview` · `accept` · `hashInvitationToken` 포함)
- `apps/api-server/src/services/admin/service-membership-ensure.ts`
- `apps/api-server/src/controllers/admin/OperatorAssignmentController.ts`
- `apps/api-server/src/controllers/auth/OperatorInvitationAcceptController.ts`
- `apps/api-server/src/routes/admin/operator-assignments.routes.ts`
- `apps/api-server/src/routes/admin/operator-invitations.routes.ts`
- `apps/api-server/src/routes/operator-invitations.routes.ts`

### 신규 (frontend)
- `apps/admin-dashboard/src/lib/operator-role-catalog.ts`
- `apps/admin-dashboard/src/tests/operator-role-catalog.test.ts`
- `services/web-neture/src/pages/auth/OperatorInvitationAcceptPage.tsx`

### 수정
- `apps/api-server/src/bootstrap/register-routes.ts` — 3개 라우터 mount
- `apps/api-server/src/config/rate-limiters.config.ts` — 초대 생성/재전송/수락 rate limit
- `apps/api-server/src/database/incremental/expected-schema-states.ts` — 상태 1건 추가
- `apps/api-server/src/controllers/admin/__tests__/admin-service-operator-registration.test.ts` — password 경로 은퇴 반영
- `packages/mail-core/src/mail.service.ts` — 운영자 초대 메일(비밀번호 · 임시 비밀번호 **미포함**)
- `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` — 탭(운영 권한 / 초대 대기) · 지정/초대 2경로 · **password 표면 0**
- `services/web-neture/src/App.tsx` — `/operator-invitations/accept` 공개 라우트

### 이번 WO 가 하지 않은 것
- `service_credentials` 기존 5행 **삭제하지 않음** (신규 경로 실행 후 증가 0 이어야 한다 — §24 census 로 확인)
- 서비스별 회원관리 화면의 `PUT /operator/members/:userId` · PasswordModal 전면 제거 → **§28 후속 WO**
- `platform:super_admin` 신규 부여 기능 → 만들지 않음 (`ASSIGNABLE_OPERATOR_ROLES` 에 `platform:*` 없음)

---

## 5. 테스트 · 빌드

| 항목 | 결과 |
|---|---|
| jest — `operator-invitation.service` · `operator-assignment.service` · `admin-service-operator-registration` | **3 suites / 47 tests PASS** |
| vitest — `admin-dashboard/src/tests/operator-role-catalog.test.ts` | **8 tests PASS** (화면 카탈로그 == 서버 allowlist · `/operators` password 표면 0 · `POST /admin/users` 경로 0) |
| `tsc --noEmit` api-server | 0 error |
| `tsc --noEmit` admin-dashboard | 0 error |
| `tsc --noEmit` web-neture | 0 error |
| vite build web-neture | PASS — `OperatorInvitationAcceptPage-*.js` chunk 생성 확인 |
| vite build admin-dashboard | PASS |
| `pnpm --filter @o4o/mail-core build` | PASS |
| `node scripts/db/check-migration-contract.mjs` | **21 pass / 0 fail** (C10 · C22 포함) |

lint-ratchet baseline 상향 없음.

---

## 6. 저장소 상태 — 교차 세션 유출 및 main 복구

작업 중 다른 세션이 이 WO 의 파일을 자기 커밋에 쓸어담아 `origin/main` 이 **깨진 상태**가 되어 있었다.

| 커밋 | 쓸려 들어간 이 WO 파일 |
|---|---|
| `8d8a3a874` (supplier 세션, main) | `apps/api-server/src/controllers/admin/AdminUserController.ts` · `apps/api-server/src/database/incremental/manifest.ts` |
| `6bab8c49c` (hospital-pharmacy 세션) | `apps/api-server/src/bootstrap/register-routes.ts` · `cookie.utils.ts` |

결과적으로 `origin/main` 의 `manifest.ts` 는 **저장소에 없는 migration 파일**(`1790125106065-CreateOperatorInvitations`)을
import 하고 있었다 — 즉 main 은 이 WO 의 나머지 파일이 올라오기 전까지 기동 불가 상태였다.

복구 방식(사용자 선택): 공유 체크아웃은 다른 세션 브랜치로 점유되어 있었으므로 **건드리지 않고**,
`origin/main` 기준 임시 worktree(`/c/tmp/o4o-opgoogle`)를 만들어 이 WO 소유 파일만 옮기고
`register-routes.ts` mount · `web-neture/App.tsx` 라우트를 다시 적용해 위 검증을 전부 통과시킨 뒤
path-specific 커밋으로 main 에 올렸다. 다른 세션의 수정 · 미추적 · staged 파일은 열지도 커밋하지도 않았다.

> 참고: 공유 체크아웃에서 돌렸을 때 나온 `check-migration-contract` C10 실패는 hospital-pharmacy 세션의
> **미추적** migration(`1790125390245-CreateHospitalDeviceTables.ts`) 때문이며 이 WO 범위가 아니다.
> 깨끗한 worktree 에서는 21/0 PASS.

---

## 7. 배포 · census · smoke

| 단계 | 상태 |
|---|---|
| migration Job (deploy 이전) | **PENDING** |
| API `o4o-core-api` 배포 | **PENDING** |
| admin-dashboard · web-neture 배포 | **PENDING** |
| 배포 전/후 read-only census (users · linked_accounts · service_credentials · service_memberships · role_assignments count / 관리자 users.id · `platform:super_admin` 불변) | **PENDING** |
| Smoke A — 기존 Google 사용자 직접 지정 | **PENDING** (실제 role write 는 사용자 승인 후. `renagang21` 을 임의로 operator 로 만들지 않는다) |
| Smoke B — 초대 E2E (메일 → Google 수락 → 권한 부여, 비밀번호 입력 없음) | **PENDING_USER_ACTION** — Google 계정 선택 · 동의는 사용자가 직접 수행 |

배포·smoke 완료 전까지 이 WO 는 COMPLETE 가 아니다.

---

## 8. 미해결 · 후속 인계

- §28 Legacy Password/Auth 제거는 **별도 WO**: `service_credentials` 5행 처분 · 서비스 password login reader/writer 제거 ·
  각 서비스 email/password 로그인 UI · password signup · ForgotPassword/ResetPassword 잔재 ·
  operator PasswordModal 전수 제거 · `PUT /operator/members/:id` password 경로 · password policy ·
  `loginAttempts`/`lockedUntil` · E2E Auth Runtime 재정의 · 문서/개인정보 정책 정합.
- 교차 세션 유출(§6)은 이번에 복구했으나 구조적 재발 가능성이 남아 있다 — 커밋 직전
  `node scripts/git/check-staged-scope.mjs <경로...>` 를 반드시 통과시킨다.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§28 Legacy Password 제거)
