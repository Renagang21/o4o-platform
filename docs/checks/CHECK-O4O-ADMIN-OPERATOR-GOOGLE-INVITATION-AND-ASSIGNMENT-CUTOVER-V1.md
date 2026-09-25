# CHECK-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1

> WO: [`WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1`](../work-orders/WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1.md)
> 작성일: 2026-09-23 · 상태: **`COMPLETE`** (2026-09-25) — Smoke B(초대) · Smoke A(직접 지정) 모두 실사용 PASS (§7-4 · §7-6)

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

### 5-1. 배포 후 CI 적색 — 은퇴한 계약을 고정하던 legacy 테스트 정리

배포는 성공했으나 CI Pipeline(run `35812464797` · commit `1e30e24ee`)이 **실패**로 끝났다.
원인은 코드 결함이 아니라 **이 WO 가 은퇴시킨 비밀번호 경로를 "있어야 한다" 로 고정하던 테스트들**이다.
은퇴한 계약을 지키려고 구현을 되돌리지 않고, 테스트를 **새 계약 쪽으로** 옮겼다.

| 대상 | 처리 | 근거 |
|---|---|---|
| `admin-dashboard/src/tests/operators-service-password.test.ts` | **삭제** | 파일 전체가 `/operators` 비밀번호 write 계약(`payload.password = formData.password` · `PUT /operator/members/:id` · `KEEP_EXISTING_CREDENTIAL`)만 고정한다. 후속 정본 = `operator-role-catalog.test.ts` §17 "비밀번호 표면 0" |
| `operators-password-policy.test.ts` → `password-policy.test.ts` | **rename + 축소** | 정책 모듈(`@/lib/password-policy`)은 남은 소비처 `pages/users/UserForm.tsx` 가 있으므로 판정·문구 케이스는 그대로 유지. OperatorsPage 3경로 배선 검증만 제거하고 소스 계약 대상을 UserForm 으로 옮겼다 |
| `AdminUserController.statusPreservation.test.ts` | **새 계약으로 갱신** | status 보존 계약(users write 0 · body status 무시)은 불변. §C 를 "미가입 email → 400 `OPERATOR_INVITATION_REQUIRED`" · "body password → 400 `PASSWORD_NOT_ALLOWED_HERE` (assignRole·hashPassword 호출 0 = silent fallback 아님)" 으로 교체. `credentialPolicy` 기대값 `KEEP_EXISTING_CREDENTIAL` → `NOT_APPLICABLE` |
| `AdminUserController.membershipStatusPreservation.test.ts` | **새 계약으로 갱신** | membership 보존 계약(비-active 승격 0 · save 0회 · `membershipPolicy` 명시)은 불변. 신규 사용자 케이스를 400 거절로, credential 생성 케이스를 "credential 을 만들지 않는다" 로 교체 |
| `unified-store-workspace-handoff.spec.ts` | **정규식 완화 1줄** | manifest 의 **끝**(`…AlterHandoffTokensTargetWorkspace1789974015939,\s*\]`)을 고정하고 있어 마이그레이션이 append 될 때마다 무관한 WO 가 이 테스트를 깬다. "직후에 온다" 만 고정하도록 tail anchor 제거. lockstep 검증은 `check-migration-contract.mjs` C22 가 유지 |

**이번 WO 소관이 아닌 실패 1건 — 보고만 한다:**
`src/__tests__/signage-player-web-deployment-contract.spec.ts` 가
`decide "signage-player" "services/signage-player-web/"` 를 찾지 못해 실패한다.
원인은 다른 세션의 `deploy-web-services.yml` 재작성(`682c1eea7` — affected-scope 배포 게이트)이며
이 WO 의 변경과 무관하다. 해당 세션 소관으로 남긴다.

재검증: admin-dashboard vitest **16 files / 359 tests PASS** · `check-migration-contract.mjs` **21 pass / 0 fail**.

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

commit `1e30e24ee` → `origin/main`.

| 단계 | 결과 |
|---|---|
| migration Job (deploy **이전** 실행) | **SUCCESS** — `o4o-api-migrations` execution `o4o-api-migrations-cdxql` |
| API `o4o-core-api` 배포 | **SUCCESS** — revision `o4o-core-api-03744-79m` (100% traffic) |
| Deploy Admin Dashboard (Cloud Run) | **SUCCESS** |
| Deploy Web Services (Cloud Run) | **SUCCESS** |
| CodeQL Security Analysis | **SUCCESS** |

### 7-1. read-only census (count · boolean 만 · 개인정보 실값 조회 없음)

| 항목 | 배포 전 | 배포 후 | 판정 |
|---|---|---|---|
| `users` | 2 | 2 | 불변 |
| `linked_accounts (provider='google')` | 2 | 2 | 불변 |
| **`service_credentials`** | **5** | **5** | **증가 0 · 삭제 0** |
| `service_memberships` | 5 | 5 | 불변 |
| `role_assignments` | 11 | 11 | 불변 |
| `role_assignments (platform:super_admin)` | 1 | 1 | 불변 |
| `users.password IS NOT NULL` | 0 | 0 | 불변 |
| `operator_invitations` 테이블 | 없음 | 있음 | migration 적용 |
| `operator_invitations` rows | – | 0 | 초대 미생성 |
| `operator_invitations` 인덱스 | – | 5 | PK + token_hash UNIQUE + pending partial UNIQUE + service_key + status |

컬럼 실측: `id · invited_email · service_key · role · token_hash · status · expires_at ·
invited_by_user_id · accepted_user_id · created_at · updated_at · accepted_at · cancelled_at`
→ **raw token 컬럼 없음**(§8 계약 충족).

### 7-2. 프로덕션 smoke

| 항목 | 결과 |
|---|---|
| `GET /api/v1/operator-invitations/preview?token=<invalid>` | **PASS** — 404 `{"success":false,"code":"INVITATION_NOT_FOUND"}` (공개 경로 · 정보 누출 없음) |
| `POST /api/v1/admin/operator-assignments` (비인증) | **PASS** — 401 |
| `GET /api/v1/admin/operator-invitations` (비인증) | **PASS** — 401 |
| `https://neture.co.kr/operator-invitations/accept?token=<invalid>` 실브라우저 | **PASS** — 수락 화면 렌더 · "유효하지 않은 초대 링크입니다." 안내 · **비밀번호 입력 없음** · 외부 이동 없음 |
| **Smoke A — 기존 Google 사용자 직접 지정 (실 role write)** | **PASS (2026-09-25 · §7-6)** |
| **Smoke B — 초대 E2E (메일 → Google 수락 → 권한 부여)** | **PASS (2026-09-25 · §7-4)** |

→ 본 WO 는 **구현 · 배포 · 인증 가드 · schema · census 까지 확인 완료**이며,
role write 가 실제로 일어나는 Smoke A · B 가 남아 **COMPLETE 가 아니다**.
smoke 계획은 이후 **B→A 로 개정**되었고 그 실행과 중단 사유는 **§7-3** 에 있다.

### 7-3. 테스트 계정 정리 · 개정된 smoke 계획(B→A)과 그 종결 (2026-09-23)

사용자 지시로 smoke 순서를 **Smoke A → B 에서 B → A 로 개정**했다.
근거: Smoke B 는 *아직 O4O 에 존재하지 않는 Google 사용자*의 최초 진입을 검증하므로,
이미 로그인 이력이 있는 계정으로는 그 경로를 재현할 수 없다.
계획은 ① 기존 테스트 계정 `renagang21` 폐기 → ② 미사용 Google 계정으로 Smoke B(초대 최초 진입)
→ ③ role/membership 원복 → ④ 같은 계정으로 Smoke A(기존 사용자 직접 지정) → ⑤ 원복 → ⑥ postVerify 였다.

**① 폐기 — production write 전 read-only census (전수, 개인정보 실값 조회 없음)**

| 검사 | 범위 | 결과 |
|---|---|---|
| 대상 계정 보유 권한 | `role_assignments` · `service_memberships` · `service_credentials` | **전부 0** |
| `users` 참조 FK 컬럼 | **34개 전수** | hit 2개 — `linked_accounts` 1(CASCADE) · `password_reset_tokens` 2(CASCADE) |
| FK 없는 user 식별자 컬럼 | **215개 전수** (쿼리 실패 0) | `account_activities` 7 · `action_logs` 3 — 전부 **로그인 시도 감사 로그** |
| email 컬럼 | **26개 전수** (쿼리 실패 0) | 업무 테이블 2곳이 이 email 을 **연락처로만** 보유 |

업무 테이블 2곳은 계정 소유 데이터가 아니므로 **건드리지 않았다**:

- `neture_suppliers` 1행 — `contact_email` 만 일치, **`user_id IS NULL`**, status `ACTIVE`, 2026-05-30 생성.
- `forum_category_requests` 2행 — `requester_email` (completed / rejected).

→ **보존 대상 소유 데이터 0건**을 확인한 뒤 삭제 조건 충족으로 판정했다.

**삭제 실행** — postcondition 가드를 건 단일 트랜잭션(`DELETE FROM users WHERE id = <대상>` 1행).
조건 불일치 시 자동 ROLLBACK 되도록 `DO $$ … RAISE EXCEPTION $$` 를 COMMIT 앞에 두었다.
`DELETE 1` → `POSTCONDITION OK` → `COMMIT`.

**read-only postVerify (독립 세션)**

| 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|
| `users` 총계 | 1 | **1** | PASS |
| `linked_accounts` 총계 | 1 | **1** | PASS |
| 대상 `users` / `linked_accounts` / `password_reset_tokens` | 0 / 0 / 0 | **0 / 0 / 0** | PASS (CASCADE 정상) |
| 관리자 행 존재 | 1 | **1** | **불변** |
| 관리자 `role_assignments` / `service_memberships` / `service_credentials` | 11 / 5 / 5 | **11 / 5 / 5** | **불변** |
| 관리자 google `linked_accounts` | 1 | **1** | **불변** |
| 관리자 `users.password IS NULL` | true | **true** | **불변** |
| `neture_suppliers` 해당 행 | 1 | **1** | 보존 |
| `account_activities` / `action_logs` 감사 로그 | 7 / 3 | **7 / 3** | 보존 (FK 없음 · 감사 기록 성격상 유지) |

→ 관리자 user · Google identity · role · membership · credential 은 **어떤 방식으로도 변경하지 않았다.**

**②~⑥ — 중단 사유**

사용자가 *"아직 O4O 에 로그인한 적 없는 Google 계정"* 을 보유하고 있지 않음을 확인했다.
지시 7항(*별도 미사용 Google 계정이 없으면 신규 테스트 계정을 억지로 만들지 않는다*)에 따라
**전용 Google 계정을 새로 만들지 않았고, 테스트 계정을 두지 않는 상태로 마감**한다.

| 항목 | 결과 |
|---|---|
| 기존 테스트 계정 폐기 + census + postVerify | **PASS** |
| **Smoke B — 초대 E2E (실 Google 최초 진입)** | **PENDING_USER_ACTION** — 미사용 Google 계정 미보유. 계정 확보 시 이 절의 ②~⑥ 순서로 수행한다 |
| **Smoke A — 기존 Google 사용자 직접 지정 (실 role write)** | **PENDING_USER_ACTION** — Smoke B 선행 필요(같은 계정을 "기존 사용자"로 만든 뒤 수행) |

### 7-4. **Smoke B — 초대 E2E = PASS** (2026-09-25)

사용자가 테스트 Google 계정으로 초대 메일을 수락하고 로그인했다. 판정은 **DB read-only** 로 했다
(이 세션의 production write **0**).

**전 구간**

```text
초대 생성 → 메일 수신 → Google 계정으로 수락 → 신규 O4O user 생성
→ linked_accounts.google 생성 → cosmetics:operator 부여 → k-cosmetics membership 생성
→ password credential 0 → 실제 /operator 진입 성공
```

| # | 검증 | 실측 |
|---|---|---|
| 1 | `operator_invitations` | `64174aac` · `tes***@gmail.com` · **`k-cosmetics`** · **`cosmetics:operator`** · status **`accepted`** · `accepted_user_id` = **`322667c8`** · `accepted_at` **2026-09-25 00:14:55.979+00** · `cancelled_at` NULL · 만료 전(2026-10-02) · `invited_by` `cfd2a5e7`. accepted 아닌 초대 **0** |
| 2 | Identity | `users` **2**(admin + test) · distinct email **2** → **자동 병합 없음**. test user `322667c8` status `active`. `linked_accounts` **google 만 2행/2user**(legacy provider 0). test sub **`112789***`**(관리자 `117391***` 와 **다른 identity**) · `isVerified` true · **연결 행 email 은 NULL**(email 이 조회 키에 들어갈 수 없다) |
| 3 | 권한 부여 | `role_assignments` `cosmetics:operator` · global · **active 1** / `service_memberships` `k-cosmetics` · **active** · role `operator`. 초대 대조 **`matching_active_role=1` · `matching_active_membership=1`**. **과다 부여 없음** — test user 총 role **1** · 총 membership **1** |
| 4 | password 계열 | `users.password` 컬럼 **0** · `service_credentials` 테이블 **0** · 스키마 전역 password 컬럼 **0** → credential 생성은 **구조적으로 불가** |
| 5 | 기존 관리자 불변 | `cfd2a5e7` status `active` · roles active **11** · `platform:super_admin` **1** · memberships active **5** · sub `117391***` — 변화 없음 |
| 6 | 실사용 | 테스트 계정으로 **`k-cosmetics.site/operator` 진입 성공** — 운영자 대시보드·메뉴 렌더, "운영자는 관리자가 아닙니다" 안내가 역할 계약과 일치(해당 계정은 `cosmetics:operator` 하나만 보유) |

타임스탬프 순서도 일관된다: user 생성 `00:14:55.910` → Google 연결 `.928` → role 부여 `.944` →
invitation `accepted` `.979`.

#### 7-4a. ⚠️ Smoke A 준비 중 발견 — **마지막 membership 제거가 전역 Identity 를 죽인다**

지시는 "Smoke B 가 만든 role + membership 을 회수하되 users row 와 Google 연결은 유지" 였다.
canonical 회수 경로를 읽어보니 **그대로 실행하면 계정이 죽는다**:

```text
MembershipApprovalService.deleteMember (hard)
  STEP H1  DELETE FROM service_memberships …            ← membership 제거
  STEP H4  남은 membership 이 0 이면
           UPDATE users SET status='deleted', "isActive"=false   ← 계정 비활성화
```

테스트 계정은 membership 이 **k-cosmetics 하나뿐**이라 회수 즉시 잔여 0 → `isActive=false`.
`requireAuth` 가 매 요청 `isActive` 를 검사하므로 **Google 로그인까지 차단**되어 Smoke A 가 불가능해진다.
soft delete 도 같다 — 요청자가 `platform:super_admin` 이면 platform-admin 분기를 타
`UPDATE users SET status='deleted'` 를 실행한다. "자기 서비스 membership 만 종료하고 users 는
건드리지 않는" 서비스 운영자 분기는 **super_admin 으로는 도달할 수 없다**(`isPlatformAdmin` 이 요청자 scope 에서 나온다).

**그래서 회수 범위를 좁혔다**(사용자 확정):

| 대상 | 처리 | 근거 |
|---|---|---|
| `cosmetics:operator` role | **회수** — `DELETE /admin/users/:userId/role-assignments/:role` | 이 경로는 **membership · users · credential 을 건드리지 않는다**(회귀 테스트 `AdminUserController.roleRevokeSafety` 가 고정) |
| `k-cosmetics` membership | **유지** | 제거하면 계정이 죽어 Smoke A 불가 |

두 경로의 분리는 그대로 성립한다 — k-cosmetics 산출물은 *초대 경로*의 것이고 Smoke A 는
**다른 서비스(`neture:operator`)** 로 직접 지정하므로 섞이지 않는다.

**이것은 테스트상의 불편이 아니라 실제 lifecycle 결함이다.** `users` 는 전역 Identity 이고
`service_memberships` 는 서비스 관계인데, **마지막 서비스 탈퇴가 전역 O4O Identity 를 죽인다.**
Google 단일 Identity 원칙과 충돌한다. 이 WO 에 섞어 고치지 않고 **Smoke A 종결 직후 후속 WO**
`WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1` 로 잡는다
(soft/hard · platform admin/service operator 분기 · 마지막 membership 제거 · 재활성화 전수 점검).

#### 7-4b. FOLLOW_UP (Smoke B 실패 사유 아님 · 지금 고치지 않는다)

- `role_assignments.assigned_by` 가 **NULL** — 수락 경로가 부여자를 role 행에 남기지 않는다.
  감사 추적은 `operator_invitations.invited_by_user_id`(= `cfd2a5e7`)에 남아 있어 현재 요구는 깨지지 않는다.
- `service_memberships.role` **표기 혼재** — 이번 건은 `operator`(무접두), `neture`·`pharmacy-hub` 는
  `neture:operator` · `pharmacy-hub:operator`(접두). 인가는 `role_assignments`(접두)로 하므로 영향은 없다.
  기존 구조적 debt 로 남긴다.

### 7-5. Smoke A — 기존 Google 사용자 직접 지정 (진행 중)

**시작 직전 기준선**(회수 후 확인할 값): active roles **0** · `k-cosmetics` membership **1**(초대 잔존) ·
`neture` membership **0** · Google link **1** · `users.status` **active** · `isActive` **true**.

**경로**: `POST /api/v1/admin/operator-assignments` `{ userId, serviceKey, role }` —
지정 키는 **`userId`** 이며 email 은 Identity Key 가 아니라 지정 인자가 아니다(§2-1).

**기대 결과**: 기존 `users.id` 그대로 · 기존 Google sub 그대로 · 신규 user 생성 **0** ·
`linked_accounts` 추가/변경 **0** · `neture:operator` active **1** · `k-cosmetics` membership **1 유지** ·
`neture` membership active **1** · password write **구조적으로 0** ·
`assigned_by` = 직접 지정한 관리자 `users.id`.
마지막으로 테스트 계정으로 `https://neture.co.kr/operator` 진입 성공 시 **Smoke A = PASS**.

#### 7-5a. ⛔ Smoke A 착수 즉시 발견 — **후보 검색이 항상 결과 0** (응답 계약 불일치)

사용자가 `cosmetics:operator` 회수(①)를 마치고 직접 지정 화면에서 테스트 계정 email 로 검색했는데
**결과가 없었다.** read-only 로 확인한 사실:

| 확인 | 결과 |
|---|---|
| 대상 user 존재 | `322667c8` · `status active` · `isActive true` · email ILIKE 매치 **1** |
| 회수 상태(①) | **active roles 0** · `k-cosmetics` membership **1 유지** · Google link **1** — 의도한 기준선 그대로 |
| backend 쿼리 | `u.email ILIKE :q OR u.name ILIKE :q` — **status/isActive 필터 없음**(제외될 이유 없음) |

원인은 데이터도 권한도 아니라 **응답 계약 불일치**였다:

```text
backend   res.json({ success: true, data: { candidates } })
frontend  const raw = res.data?.data ?? [];              // → { candidates: [...] } (객체)
          setCandidates(Array.isArray(raw) ? raw : [])   // → 배열이 아니므로 통째로 버림
```

후보가 몇 명이든 화면은 **늘 "결과 없음"** 이었다. 즉 **직접 지정 경로 자체가 막혀 있었고**,
초대 경로(Smoke B)는 이 화면을 거치지 않아 드러나지 않았다. §7-2 의 비인증 401 검사로도
잡히지 않는 층이다(인증·권한이 아니라 소비 지점의 형태 문제).

**수정**: `OperatorsPage.tsx` 가 계약대로 `data.candidates` 를 읽는다(과거 형태가 남은 배포를 대비해
배열 형태도 함께 허용). **정적 guard 신설** `apps/api-server/src/__tests__/operator-assignment-candidates-contract.spec.ts`
(6 tests) — C1 backend 가 `data.candidates` 로 내려보낸다 · C2 frontend 가 그 키를 읽고 `data` 를
배열로 단정하지 않는다(사고 형태 재유입 차단) · C3 지정은 `userId` 로 한다(email 은 지정 인자가 아니다).

**이 수정은 admin-dashboard 재배포가 필요하다.** 배포 전까지 Smoke A 는 진행할 수 없다.

### 7-6. **Smoke A — 기존 Google 사용자 직접 지정 = PASS** (2026-09-25 02:36Z)

§7-5a 수정 배포(`01313-h7l` · traffic 100% · `DEPLOY_ENABLED` 02:31:08Z 복귀) 후, 사용자가 Admin
화면에서 **후보 검색 → 테스트 계정 선택 → `neture` / `neture:operator` 지정**을 수행했다.
판정은 **DB read-only**(이 세션 production write 0).

| # | 검증 | 실측 |
|---|---|---|
| 1 | 신규 user 생성 **0** | `users` **2** 그대로 · `linked_accounts` **2** 그대로(google 2) |
| 2 | 기존 identity 재사용 | `322667c8` 그대로 · Google sub **`112789***`** 그대로 · `linkedAt` 00:14:55(초대 시점) **불변** |
| 3 | 신규 role | **`neture:operator` active** · `assigned_at` 02:36:28 · **`assigned_by = cfd2a5e7`** — 직접 지정 경로는 부여자를 기록한다(초대 경로는 NULL · §7-4b) |
| 4 | 신규 membership | `neture` **active** (02:36:28) |
| 5 | 초대 산출물 보존 | `k-cosmetics` membership **그대로** · `operator_invitations` 행 **무변경**(`accepted` · `accepted_at` 동일) |
| 6 | 회수 반영 | `cosmetics:operator` **`is_active=false`** — 행은 이력으로 남고 비활성(§7-4a 의 좁힌 회수) |
| 7 | password 계열 | 스키마 password 컬럼 **0** · `service_credentials`/`password_reset_tokens` 테이블 **0** → 생성 **구조적으로 불가** |
| 8 | 기존 관리자 불변 | `cfd2a5e7` roles **11** · `platform:super_admin` **1** · memberships **5** |
| 9 | 실사용 | 테스트 계정으로 **`neture.co.kr/operator` 진입 성공** — 운영자 대시보드 렌더 |

**두 경로가 분리되어 실증됐다.**

```text
초대 (B)      신규 Google 사용자 → user 생성 + linked_accounts + cosmetics:operator + k-cosmetics
직접 지정 (A) 기존 Google 사용자 → userId 로 지정 → neture:operator + neture
              (user·연결 생성 0 · assigned_by 기록)
```

### 7-7. 테스트 계정 — **다음 WO 의 acceptance fixture 로 보존** (사용자 확정)

membership 은 제거하지 않는다(§7-4a 의 lifecycle 결함 때문에 제거하면 계정이 죽는다).
Smoke A 가 만든 `neture:operator` 만 안전 경로(`DELETE /admin/users/:userId/role-assignments/:role`)로 회수한다.

목표 최종 상태:

```text
users row 유지 · linked_accounts.google 유지 · Google sub 유지 · status active · isActive true
active roles 총 0          (cosmetics:operator 0 · neture:operator 0)
memberships  k-cosmetics active 유지 · neture active 유지
```

이 계정으로 후속 WO 수정 후 **"서비스 0개인 사용자도 O4O Identity 로 존재할 수 있다"** 를
production 에서 직접 증명한다(neture 종료 → 로그인 가능 → 마지막 k-cosmetics 종료 → memberships 0 →
여전히 로그인 가능).

**fixture 준비 완료 — 실측 (2026-09-25 · read-only)**

| 항목 | 목표 | 실측 |
|---|---|---|
| test user row | 1 | **1** (`322667c8`) |
| `users.status` / `isActive` | active / true | **active / t** |
| `linked_accounts.google` | 1 | **1** · sub `112789***` (초대 시점과 동일) |
| **active roles** | **0** | **0** — `cosmetics:operator` · `neture:operator` 모두 `is_active=false`(이력 보존) |
| memberships | k-cosmetics · neture 유지 | **둘 다 active** (active_memberships **2**) |
| 기존 admin | 불변 | `cfd2a5e7` active · roles **11** · super_admin **1** · memberships **5** |
| 전역 `users` | 참고 | **2** (관리자 + 테스트) — TEST FIXTURE FINAL 의 수치는 **테스트 사용자 기준**이다 |

`neture:operator` 회수는 canonical 경로(`DELETE /admin/users/:userId/role-assignments/:role`)로 했고,
**membership · users · Google 연결을 전혀 건드리지 않았다**는 것이 이 실측으로 확인됐다.

## 8. 미해결 · 후속 인계

- ~~§28 Legacy Password/Auth 제거는 별도 WO~~ → **완료 (2026-09-25)**:
  `WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1` 이 런타임(Phase A) · 스키마 의존(B-1) · **물리 제거**(B-2)까지 닫았다.
  `service_credentials` · `password_reset_tokens` · `users.password`/`reset_password_*`/lockout 컬럼 **전부 DROP**.
- ~~실 Google Smoke B→A 는 미사용 Google 계정 확보 시 수행~~ → **완료 (2026-09-25)**:
  Smoke B **PASS**(§7-4) · Smoke A **PASS**(§7-6). 테스트 계정은 §7-7 대로 **후속 WO fixture 로 보존**한다.
- **FOLLOW_UP (이 WO 에서 고치지 않음)**
  - `role_assignments.assigned_by` — 초대 수락 경로는 **NULL**, 직접 지정 경로는 지정 관리자 id 를 기록한다(§7-4b · §7-6).
    감사 추적은 `operator_invitations.invited_by_user_id` 로 가능하므로 현재 요구는 깨지지 않는다.
  - `service_memberships.role` **표기 혼재** — `operator`(무접두)와 `neture:operator`(접두)가 공존한다.
    인가는 `role_assignments`(접두)로 하므로 영향 없음. 기존 구조적 debt.
- **후속 WO 로 분리**: `WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1` —
  마지막 `service_membership` 제거가 `users.status='deleted'` · `isActive=false` 를 유발해
  **전역 O4O Identity 를 죽인다**(§7-4a). Google 단일 Identity 원칙과 충돌하므로 별도로 정리한다.
- `signage-player-web-deployment-contract.spec.ts` 실패는 **다른 세션 소관**(§5-1). 이 WO 에서 고치지 않았다.
- 교차 세션 유출(§6)은 이번에 복구했으나 구조적 재발 가능성이 남아 있다 — 커밋 직전
  `node scripts/git/check-staged-scope.mjs <경로...>` 를 반드시 통과시킨다.

---

## 판정

`WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 = COMPLETE` (2026-09-25)

| 축 | 결과 |
|---|---|
| Smoke B — 신규 Google 사용자 초대/수락/실접근 | **PASS** (§7-4) |
| Smoke A — 기존 Google-linked 사용자 `userId` 직접 지정/실접근 | **PASS** (§7-6) |
| 후보 검색 **dead-path 결함** | Smoke A 착수 시 발견 → 수정 → **실제 Smoke A 로 실증**(§7-5a). 재유입 차단 guard 6 tests |
| password / `service_credentials` 생성 | **구조적으로 불가**(스키마에 없음) |
| 기존 관리자 계정 | **불변**(roles 11 · super_admin 1 · memberships 5) |
| FOLLOW_UP | `assigned_by` 경로별 차이 · `service_memberships.role` 표기 혼재 |
| 후속 WO 분리 | 마지막 membership 제거가 전역 Identity 를 죽이는 문제 |

문서 정합: 발견 2건(§28 Legacy Password 항목 · Smoke 미완 항목 — 둘 다 완료로 정정) /
SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(Membership Termination Decoupling)
