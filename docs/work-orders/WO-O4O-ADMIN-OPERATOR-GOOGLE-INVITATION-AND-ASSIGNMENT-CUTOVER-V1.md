# WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1

> 운영자 지정·초대 구조를 **password 방식에서 Google Identity 방식으로 전환**한다.
> 조사 → 설계 확정 → 구현 → 테스트 → 배포 → 실제 smoke → CHECK 까지 **하나의 WO**다.
>
> 지시일: 2026-09-23 · 상태: IN_PROGRESS
> 선행: `WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1` (COMPLETE — 다시 열지 않는다)
> CHECK: [`CHECK-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1`](../checks/CHECK-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1.md)

## 1. 배경 · 목적

현재 `/operators` 의 운영자 등록은 `email + 이름 + password + service + role → POST /admin/users` 로
`users` · `role_assignments` · `service_memberships` · **`service_credentials`** 를 한 번에 만든다.
관리자가 타인의 비밀번호를 만들어 전달하는 구조이며, 이미 Google-only 로 전환된 Identity 정책과 어긋난다.

전환 후 경로는 둘뿐이다.

- **A. 기존 O4O Google 사용자** → 검색 · 선택 → 서비스 + 역할 → `role_assignment` + `service_membership` 부여
- **B. 미가입자** → 이메일 + 서비스 + 역할로 **초대** → 메일 → Google 인증(필요 시 가입·동의) → 수락 → 부여

관리자는 더 이상 운영자의 비밀번호를 **생성·입력·재설정하지 않는다.**

## 2. 절대 불변식

1. 외부 Identity Key = Google `sub` / 내부 = `users.id` / **email 은 Identity Key 가 아니다.** email 일치로 자동 병합 금지.
2. Google 인증은 기존 정본(`verifyGoogleIdToken` · `GoogleIdentityService` · `GoogleAuthService` ·
   `linked_accounts(provider='google')`) 만 쓴다. 별도 Google 검증·GIS loader 신규 구현 금지.
3. 기존 `platform:super_admin` user 생성·삭제·교체 금지. `platform:super_admin` 신규 부여 기능 만들지 않는다.
4. 신규 운영자에게 `users.password` · `service_credentials` 생성 금지. 기존 `service_credentials` 5행 삭제 금지.
5. 권한 SSOT = `role_assignments`, 서비스 가입 SSOT = `service_memberships`. credential 존재를 권한 조건으로 추가 금지.
6. **ensure membership ≠ approve ≠ reactivate** — 없으면 `active` 생성, 있으면 status·role 무변경.
7. raw invite token 은 DB·로그에 남기지 않는다(SHA-256 hash 만). Google ID token·`sub` 도 로그/Admin UI 노출 금지.

## 3. 착수 전수 확인 (BEFORE)

| 항목 | 결과 |
|---|---|
| `/operators` 등록 모달 | `신규 사용자 / 기존 사용자` 2모드 + email·성·이름·**password**·service·role → `POST /admin/users` |
| 행 액션 | 편집 / **서비스 비밀번호 변경**(`PUT /operator/members/:userId`) / 권한 해제 |
| `POST /admin/users` | 기존 user = role+membership+**credential(없으면 생성)** / 신규 user = users(+password)+role+membership+credential |
| `POST /admin/users` runtime consumer | `OperatorsPage.tsx:423` **1곳** (그 외는 GET 소비 또는 문서·테스트 참조) |
| `ensureServiceMemberships` | 없을 때만 `active` 생성, 있으면 status·role 보존 (`MembershipPolicy`) |
| 재사용 가능한 invitation domain | **없음** — `apps/**`·`packages/**`·`*.sql` 전수 검색에서 invitation/invite 엔티티·테이블 0건 |
| Google 정본 | `google-identity.service.ts`(verify + sub 조회) · `google-auth.service.ts`(login/signup/link/bootstrap) · `packages/auth-client`(`renderGoogleButton`) |
| role↔service 매핑 SSOT | `@o4o/security-core`(FROZEN) `resolveCanonicalServiceKey` |
| 운영자 role 카탈로그 | 프런트 `OperatorsPage.ASSIGNABLE_ROLES` 에만 존재 (백엔드 allowlist 없음) |

## 4. 확정 설계

### 4-1. 신규 계약 (API)

| Method · Path | 계약 |
|---|---|
| `GET /api/v1/admin/operator-assignments/candidates?search=` | 기존 사용자 검색 — `userId` · 표시명 · email · `googleLinked` · 현재 role/membership. **Google `sub` 는 응답에 없다.** |
| `POST /api/v1/admin/operator-assignments` | `{ userId, serviceKey, role }` — **email 이 아니라 userId 로 지정.** role assign + membership ensure. credential/password write 0. 멱등. |
| `GET /api/v1/admin/operator-invitations` | 초대 목록(이메일·서비스·역할·초대/만료 시각·상태). `pending && expires_at < now` → `expired` 로 표시. |
| `POST /api/v1/admin/operator-invitations` | `{ email, serviceKey, role }` → invitation 1행 + 메일. users/linked_accounts/membership/role/credential write **0**. |
| `POST /api/v1/admin/operator-invitations/:id/resend` | 기존 pending 재사용 + **token·만료 rotate** + 재발송 (방식 1가지로 통일). |
| `POST /api/v1/admin/operator-invitations/:id/cancel` | pending → cancelled. users/role/membership 제거하지 않는다. |
| `POST /api/v1/auth/operator-invitations/preview` | `{ token }` → 서비스·역할·초대 이메일·상태 (인증 불필요, 공개 수락 화면용). |
| `POST /api/v1/auth/operator-invitations/accept` | `{ token, idToken, consents? }` → Google 검증 → users 확정 → role+membership → accepted. |

권한: `/admin/*` 는 `requireRole(['platform:super_admin'])`. 수락 2종은 token + Google ID token 이 인증이다.

### 4-2. Invitation 저장 구조 (`operator_invitations`, migration 1건)

`id` · `invited_email` · `service_key` · `role` · `token_hash`(sha256 hex, UNIQUE) · `status`(pending/accepted/cancelled) ·
`expires_at` · `invited_by_user_id` · `accepted_user_id` · `created_at` · `updated_at` · `accepted_at` · `cancelled_at`.
`(lower(invited_email), service_key, role) WHERE status='pending'` 부분 UNIQUE 로 중복 pending 금지.
raw token 은 **저장하지 않는다** — `crypto.randomBytes(32).base64url` 를 메일로만 보내고 DB 에는 hash 만.

### 4-3. 수락 흐름 (§11 · §12 · §13 · §14)

1. `neture.co.kr/operator-invitations/accept?token=...` (web-neture 공개 route, 신규 앱 없음)
2. 기존 canonical GIS 진입(`@o4o/auth-client` `renderGoogleButton`) → Google credential(ID token)
3. 서버: `verifyGoogleIdToken` → `email_verified === true` **AND** `normalize(email) === normalize(invited_email)`
   (trim + lowercase 만. dot/`+alias` canonicalization 금지) → 불일치 `INVITATION_EMAIL_MISMATCH`
4. `findGoogleIdentityBySub(sub)` → 있으면 그 `users.id` (email 로 users 를 찾지 않는다)
   없으면 동의(terms·privacy) 필수 + `GoogleAuthService.createGoogleUser` 재사용 → `users.password = NULL`, credential 0
5. email unique 충돌 → 자동 병합 금지, `EMAIL_IN_USE` 로 중단
6. 트랜잭션: invitation `SELECT … FOR UPDATE` → 상태·만료 확인 → role assign → membership ensure →
   `accepted` · `accepted_user_id` · `accepted_at` → commit. 완료 후 서비스 진입 링크는 **service catalog origin** 으로만 만든다(open redirect 금지).

### 4-4. `/operators` UX 전환 (§4 · §15 · §17)

- 탭 `운영 권한` / `초대 대기`
- 등록 모달 = `[기존 O4O 사용자]` / `[새 사용자 초대]`. password input·이름 입력·서비스 비밀번호 변경 modal **제거**
- 기존 사용자 경로는 검색 결과에서 실제 `users.id` 를 선택해야만 제출 가능(email 직접 입력으로 user 생성 불가)
- Google 미연결 사용자는 "Google 연결 필요" 로 표시하고 지정 대상에서 제외
- **범위 경계**: 서비스별 회원관리 화면의 `PUT /operator/members/:userId` · `service_credentials` · `PasswordModal`
  전면 제거는 후속 WO(§28). 이번 WO 는 `/operators` 의 credential 생성·변경 경로만 없앤다.

### 4-5. `POST /admin/users` 정리 (§18)

runtime consumer 가 `OperatorsPage` 1곳뿐이므로 **password 경로만 은퇴**한다.
`password` 가 오면 400 `PASSWORD_NOT_ALLOWED_HERE`, 미가입 email 이면 400 `OPERATOR_INVITATION_REQUIRED`.
기존 사용자 role/membership 부여는 계약을 유지하되 credential write 는 사라진다. **silent fallback 금지** — 모두 명시 코드로 거절한다.

## 5. 검증

- API/service 단위 테스트 20종(§22) — 지정 멱등, membership 보존, 이메일 불일치, 만료·취소·재사용, race, credential/password write 0 등
- Frontend 테스트 — password field 0, modal 0, 검색 선택 필수, 초대 생성/목록/재전송/취소
- build: api-server · admin-dashboard · web-neture · auth packages · mail-core (tsc/build/test). lint-ratchet baseline 상향 금지
- migration: entity ↔ schema ↔ migration 일치 · `incremental/manifest.ts` + `expected-schema-states.ts` lockstep · 격리 PostgreSQL 15 fingerprint
- 배포 전/후 read-only census(§24 · §26), production smoke A/B(§25). Google 계정 조작은 사용자가 직접 수행하며
  E2E 불가 시 `PENDING_USER_ACTION` 으로 남긴다(COMPLETE 로 쓰지 않는다).

## 6. 제외 (후속 Legacy Password/Auth 제거 WO)

기존 `service_credentials` 5행 처분 · 서비스 password 로그인 reader/writer 제거 · 각 서비스 email/password 로그인 UI ·
password signup/register · ForgotPassword/ResetPassword 잔재 · operator `PasswordModal` 전수 제거 ·
`PUT /operator/members/:id` password 경로 · password policy 잔재 · loginAttempts/lockedUntil 구조 ·
E2E Auth Runtime 재정의 · 문서/개인정보 정책 정합. **이번 WO 에서 당겨 수행하지 않는다.**
