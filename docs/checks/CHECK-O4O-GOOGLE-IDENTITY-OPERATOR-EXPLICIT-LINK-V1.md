# CHECK — WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1

> **판정:** `GOOGLE IDENTITY OPERATOR EXPLICIT LINK: IN PROGRESS — 구현·배포 완료 · 운영 smoke(§10) 사용자 대기`
> **일자:** 2026-09-18 · **WO:** [`WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1`](../work-orders/WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1.md)
> **용어:** 운영자 계정 = `sohae2100` · 테스트 계정 = `renagang21`(Google-only)
> **전제 정정(2026-09-21 · 사용자 확정):** "운영자 계정 = `sohae2100`" 은 **현재 `platform:super_admin` 을 보유한 기존 `users.id`** 를 뜻한다. 이 user 의 관리자용 내부 email 은 **`renariver21@gmail.com`** 으로 정정됐다(§3-A). 본문의 `sohae2100`·`cfd2a5e7` 은 모두 이 **동일 users.id** 다. Google Identity 는 email 과 별개(연결은 검증된 `sub` 기준 · email 일치 불요). 전환기 정책 전문은 [WO 상단 "전제 정정"](../work-orders/WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1.md).

---

## 1. 구현 (커밋 `35548dd65`)

| 계층 | 내용 |
|---|---|
| 서버 | [google-auth.service.ts](../../apps/api-server/src/services/auth/google-auth.service.ts) `link()` — 단일 트랜잭션: 세션 user(`req.user.id`) 조회 → `users.password` bcrypt 재인증(`comparePassword`, service_credentials 미사용) → `verifyGoogleIdToken` → 같은 user 의 google row 조회 → 같은 sub 면 멱등(`alreadyLinked:true`) / 다른 sub 면 `409 GOOGLE_ACCOUNT_ALREADY_LINKED` → sub 가 다른 user 에 있으면 `409 GOOGLE_IDENTITY_IN_USE` → INSERT(`userId·provider·providerId·isVerified·isPrimary·linkedAt·lastUsedAt` 만) · unique race 도 `GOOGLE_IDENTITY_IN_USE`. password NULL → `400 PASSWORD_NOT_SET` · 불일치 → `401 INVALID_PASSWORD`(loginAttempts 불변). `account_activities` `action='link_google'`, email NULL. `getLinkStatus()` → `{ linked, passwordSet }` |
| route/DTO | `POST /api/v1/auth/google/link` (`requireAuth` + `validateDto(GoogleLinkRequestDto{idToken,currentPassword})`) · `GET /api/v1/auth/google/link/status` (`requireAuth`). userId/email/sub/providerId/serviceKey 는 400 |
| 패키지 | `@o4o/auth-client` `linkGoogle(idToken,currentPassword)` · `getGoogleLinkStatus()`(실패 null) · 타입 `GoogleLinkStatus/GoogleLinkResult`. `@o4o/auth-react` [`<GoogleAccountLink />`](../../packages/auth-react/src/GoogleAccountLink.tsx) — status → (미연결·passwordSet) [Google 계정 연결] → 현재 비밀번호 → GIS 버튼 → `linkGoogle` → "Google 계정 연결됨 ✓". Google-only(passwordSet=false)는 연결됨만(비밀번호 UI 0). 실패 시 비밀번호 state 비움 · INVALID_PASSWORD 는 재입력, 그 외는 처음 상태 |
| 화면 | Neture [`/mypage/settings`](../../services/web-neture/src/pages/mypage/MySettingsPage.tsx) "로그인 방법" `SettingsSection` 카드. Google email 표시 0 |

## 2. 검증

| 항목 | 결과 |
|---|---|
| jest `googleAuthService.test.ts` link 10건(Case A/B/C/D/D-race · INVALID_PASSWORD · PASSWORD_NOT_SET · token invalid · INVALID_USER · getLinkStatus) + `googleAuthDto.test.ts` link 1건 | PASS — auth 모듈·서비스 11 suites **105/105** |
| AST guard `googleIdentityNoEmailMergeGuard.test.ts` G1~G7(새 `link()` 는 `google` 파일 문맥 → where.email 0) | PASS |
| vitest `GoogleAccountLink.test.tsx` 11건(hidden/linked/google-only/idle · 흐름 · 빈 비밀번호 · disabled · 401 · 409 · 멱등 · 취소) | PASS — auth-react **76/76** |
| `apps/api-server` tsc(ai-core dist 재빌드 후) · `web-neture` tsc + vite build · eslint 변경 파일(오류 0 · 기존 warning 2) | PASS |
| CI (`35548dd65`) | CI Pipeline · Deploy API · Deploy Web · Deploy Admin · CodeQL **success**. `E2E — Auth Runtime Regression` **failure** — 09-17 05:15Z(`44101be12`) 이후 8회 연속 failure(legacy password E2E 계정이 WO-2C reset 으로 부재, "로그인 후 accessToken 미저장") = 이번 변경과 무관한 기존 red · 범위 밖(보고만) |
| 배포 | API `o4o-core-api-03713-hf6` — `GET /auth/google/link/status` 미인증 **401** · `POST /auth/google/link` 미인증 **401** · `config enabled=true` 유지. Web `neture-web-01629-fnw`(14:24Z) 번들에 `google/link/status` 포함 확인 |

## 3-A. 관리자 내부 email 정정 (2026-09-21 · 사용자 명시 승인 · production write A)

전환기 정책 확정에 따라 Google 연결(B) 전에 **기존 super_admin user 1행의 `users.email` 만** `renariver21@gmail.com` 으로 정정했다. 실행은 psql 단일 트랜잭션(대상 = handle `sohae2100` AND `platform:super_admin` 보유 · 대상 행 수 1 이 아니면 UPDATE 0 · `ON_ERROR_STOP`).

| 단계 | 결과 |
|---|---|
| 사전(read-only) | users 2 · 대상 1행 · 새 email 중복 users 0 / linked_accounts 0 · roles 11 / creds 5 / memb 5 · password set · loginAttempts 1 · 잠금 없음 · Google 연결 0 · `users.email` unique index 2개 존재 |
| UPDATE | `UPDATE users SET email='renariver21@gmail.com', "updatedAt"=now() WHERE id IN (대상)` → **`UPDATE 1`** · COMMIT |
| 사후 | 새 email 행 1 · 옛 handle 행 0 · **users.id 동일**(1) · users 2 · roles **11** · `platform:super_admin` 1 · creds **5** · memb **5** · password set 유지 · 테스트 계정(`renagang21` · password NULL) 무접촉 · linked_accounts 1(불변) |

코드 근거: 로그인 조회는 `users.email` → `user.id` → `service_credentials(user_id, service_key)` 순([auth-login.service.ts:131-199](../../apps/api-server/src/services/auth/auth-login.service.ts)) 이라 email 변경 후에도 기존 credential/password 층이 그대로 이어진다. `service_credentials` 에는 email 컬럼이 없다(`user_id`·`service_key`·`password_hash`).

**이후 로그인 식별자 = `renariver21@gmail.com`.** 비밀번호 층은 변경 없음 — `neture.co.kr`(serviceKey=neture · credential 존재) = `service_credentials(neture)` 해시, `/auth/google/link` currentPassword = `users.password`. (`admin.neture.co.kr` 도 `users.password` 라고 적었으나 **오기** — 당시 Admin Login.tsx 는 `serviceKey:'neture'` 를 보내 credential 층을 검증했다. §3-B 에서 제거해 이제 `users.password` 가 맞다.) 09-21 04:59Z admin forgot-password 로 `users.password` 만 재설정됐고(토큰 1건 사용 완료 · service_key NULL) `service_credentials` 는 정렬하지 않는다(사용자 결정: 추가 reset·정렬 중단). §3 의 "주의(WO §3)" 단락의 `PUT /users/password` 정렬 제안은 **폐기**.

## 3-B. B smoke 결함 — Admin 인증 계약 불일치 정정 (2026-09-21 · WO §8-A · 사용자 지시)

**현상:** `admin.neture.co.kr` 에서 `renariver21@gmail.com` + 09-21 재설정 `users.password` 로 로그인 → "비밀번호가 올바르지 않습니다". 같은 화면 Google 버튼은 연결 전이라 당연히 불가(관리자 users.id 에 Google sub 없음 → 어느 user 인지 찾을 수 없음).

**원인(코드 확인):** [`Login.tsx`](../../apps/admin-dashboard/src/pages/auth/Login.tsx) 이메일 로그인이 `login({ email, password, serviceKey: 'neture' })` 로 호출 → 서버 dual-read([`auth-login.service.ts`](../../apps/api-server/src/services/auth/auth-login.service.ts))는 serviceKey + credential 존재 시 **`service_credentials(neture)` 해시**를 검증하고 `users.password` 는 보지 않는다. 사용자 입력 오류가 아니라 Admin(platform surface)이 Neture 서비스 credential 을 인증 근거로 쓰던 계약 불일치. 추가 로그인 시도 · password 재설정 · credential 정렬은 하지 않았다(재시도 금지 원칙).

**정정(프론트만 · 서버 변경 0 · DB 변경 0):**

| 변경 | 내용 |
|---|---|
| `apps/admin-dashboard/src/pages/auth/Login.tsx` | 이메일 로그인 `serviceKey:'neture'` 제거 → 서버 V1 fallback = `users.password`. Google 로그인 경로는 불변 |
| `apps/admin-dashboard/src/pages/settings/MyAccountSettings.tsx` (신규) | 내 계정 › 로그인 방법 — 기존 `<GoogleAccountLink />`(`@o4o/auth-react`) 재사용 · `authClient.getGoogleAuthConfig/getGoogleLinkStatus/linkGoogle` 그대로. Admin 전용 연결 로직 0 |
| `Settings.tsx` · `AdminHeader.tsx` | 탭 `/settings/my-account` 추가 · 헤더 드롭다운 "계정 설정" → 해당 탭 이동(기존 빈 핸들러) |
| `apps/admin-dashboard/package.json` · `pnpm-lock.yaml` | `@o4o/auth-react: workspace:*` 1줄(importer link 만 · 사용자 승인). auth-react 는 auth-client(기존 의존)+React 만 필요 · source 해석 패키지라 빌드 단계 추가 0 · Dockerfile 변경 0 |

검증: admin-dashboard `tsc --noEmit` 0 에러 · `vite build` 성공. 서버 API · `service_credentials` · role/membership · users · 테스트 계정 무접촉.

## 3. 운영 Smoke (§10 · WO §8-A 정정판 · 사용자 브라우저 + read-only count) — PENDING (배포 후)

baseline(2026-09-21 3-A 이후): users 2 · linked_accounts 1(테스트 계정) · 관리자 email renariver21 · password set · service_credentials 5 · service_memberships 5 · role_assignments 11.

| # | Smoke | 기대 | 결과 |
|---|---|---|---|
| 1 | `admin.neture.co.kr` 이메일 로그인 `renariver21@gmail.com` + **`users.password`(09-21 재설정 값)** | 200 · Admin 진입(serviceKey 없음 → users.password 검증) | PENDING |
| 2 | 헤더 "계정 설정" → `/settings/my-account` → [Google 계정 연결] → 현재 비밀번호 = 같은 `users.password` → Google `sohae2100` 선택 | "Google 계정 연결됨 ✓" · users **2 유지** · linked_accounts 1→**2** · 관리자 users.id/password/creds 5/memb 5/roles 11 불변 · `link_google` activity 1건 | PENDING |
| 3 | 로그아웃 → [Google로 계속하기] → 같은 Google 계정 | signup 화면 없음 → **기존 admin users.id** · `platform:super_admin` 유지 · Admin 정상 진입 · `login_google` +1 | PENDING |
| 4 | 로그아웃 → 이메일 로그인 1회 더(1과 동일) | 200 · password 로그인 병행 유지 | PENDING |
| N | (선택) 잘못된 비밀번호 1회 | `INVALID_PASSWORD` · row 0 | PENDING |

실패 시 재시도하지 않는다(잘못된 비밀번호 시도는 전체 1회 이하 · `loginAttempts` 누적 방지). `service_credentials` 재설정 · password 재설정은 하지 않는다.

**⚠️ 발견(2026-09-18 21:55Z read-only · 범위 밖 · 보고만):** 운영자 계정(`cfd2a5e7`)이 **E2E Auth Runtime 워크플로에 의해 push 마다 잠긴다.** `account_activities` `login_email` 실패가 09-17 05:00Z 이후 매 시간대 33~39건씩 묶여 있고(총 10회), 각 묶음이 `e2e-auth-runtime.yml` 실행 시각(09-17 05:15·06:57·13:42Z, 09-18 02:07·04:52·05:51·14:22Z)과 일치한다. 워크플로는 `packages/auth-client/src/**`·`auth-react/src/**` 변경 push 에 자동 실행되며 `E2E_{KPA|KCOS|NETURE}_ADMIN_*` secret(WO-2C reset 이후 stale)으로 3 서비스 × 반복 로그인 → 같은 users row 에 `loginAttempts` 누적 → 5회 이상에서 **30분 잠금**(`handleFailedLogin`). 이번 커밋 `35548dd65` 도 auth 패키지를 건드려 14:22~14:28Z 잠금을 유발했다. 14:04:54Z 의 `invalid_password` 1건 + 14:05Z `account_locked` 4건은 사용자 시도로 보인다. 현재: `lockedUntil` 14:34:54Z 만료(잠금 해제) · **`loginAttempts=8` 잔존 → 다음 password 실패 1회에 즉시 30분 재잠금**, 성공 로그인 시 0 리셋. **제안(별도 승인):** ① `e2e-auth-runtime.yml` push 트리거 제거 또는 워크플로 비활성(WO-2F 에서 Google 경로 기준 재정의 전까지) — CI 변경 = 중지 조건 · ② `loginAttempts` 1행 리셋은 UPDATE 이므로 사용자 명시 승인 시에만.

**조치(2026-09-19 · 사용자 승인 2건):** ① `f51d5a362` — `e2e-auth-runtime.yml` `on.push` 블록만 제거, `workflow_dispatch` 유지 · secret 미삭제 · 이 push 에서 E2E 미실행 확인(CI Pipeline · CodeQL 만). 직전 21:55:58Z 에 다른 PC 의 PR #223 merge(`3e56425b7`)가 마지막으로 한 번 더 실행돼 34회 실패 추가(잠금 23:15Z 까지 · loginAttempts 10). ② 22:58Z 운영자 1행 `UPDATE users SET "loginAttempts"=0, "lockedUntil"=NULL WHERE id=(SELECT … password IS NOT NULL AND id LIKE 'cfd2a5e7%')` — `UPDATE 1` · after: loginAttempts 0 · lockedUntil NULL · password/status 불변 · counts users 2 / linked 1 / creds 5 / memb 5 / roles 11 불변 · 테스트 계정 무접촉. 이후 auth 패키지 push 로 인한 재잠금 경로는 닫혔다.

**주의(정정 2026-09-21):** 위 문단의 `PUT /users/password` 정렬 제안은 폐기. Admin 은 serviceKey 없이 `users.password` 로 로그인하도록 계약을 정정했다(§3-B).

## 4. Git

| 커밋 | 범위 |
|---|---|
| `5a07042cf` | WO 접수 · 선행 CHECK COMPLETE |
| `35548dd65` | 서버 · 패키지 · neture 화면 · 테스트 |
| `706f82108` | CHECK 초안 |
| `d5be1eb31` | 잠금 원인 기록 |
| `f51d5a362` | e2e-auth-runtime push 트리거 제거 |
| `237ffd3df` | 잠금 reset 기록 · 3-A email 정정 · 전제 정정 |
| (본 커밋) | §3-B Admin 인증 계약 정정 + Admin Google 연결 UI(WO §8-A) |

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(E2E Auth Runtime 워크플로 Google-only 재정의 = WO-2F · push 트리거는 제거 완료)
