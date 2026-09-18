# CHECK — WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1

> **판정:** `GOOGLE IDENTITY OPERATOR EXPLICIT LINK: IN PROGRESS — 구현·배포 완료 · 운영 smoke(§10) 사용자 대기`
> **일자:** 2026-09-18 · **WO:** [`WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1`](../work-orders/WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1.md)
> **용어:** 운영자 계정 = `sohae2100` · 테스트 계정 = `renagang21`(Google-only)

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

## 3. 운영 Smoke (§10 · 사용자 브라우저 + read-only count) — PENDING

baseline(2026-09-18 14:02Z): users 2 · linked_accounts 1(테스트 계정) · 운영자 password set · service_credentials 5 · service_memberships 5 · role_assignments 11.

| # | Smoke | 기대 | 결과 |
|---|---|---|---|
| 1 | 운영자 password 로그인 → `/mypage/settings` → [Google 계정 연결] → 현재 비밀번호 → sohae Google 계정 | 연결됨 ✓ · users **2 유지** · linked_accounts 1→**2** · 운영자 password/creds 5/memb 5/roles 11 불변 · `link_google` activity 1건 | PENDING |
| 2 | 로그아웃 → [Google로 계속하기] → sohae Google 계정 | signup 화면 없음 → 기존 운영자 users.id · `login_google` +1 | PENDING |
| 3 | `admin.neture.co.kr` | Admin 정상 진입 · 테스트 계정은 계속 불가 | PENDING |
| N | 잘못된 비밀번호 1회 | `INVALID_PASSWORD` 오류 표시 · row 0 | PENDING |

**⚠️ 발견(2026-09-18 21:55Z read-only · 범위 밖 · 보고만):** 운영자 계정(`cfd2a5e7`)이 **E2E Auth Runtime 워크플로에 의해 push 마다 잠긴다.** `account_activities` `login_email` 실패가 09-17 05:00Z 이후 매 시간대 33~39건씩 묶여 있고(총 10회), 각 묶음이 `e2e-auth-runtime.yml` 실행 시각(09-17 05:15·06:57·13:42Z, 09-18 02:07·04:52·05:51·14:22Z)과 일치한다. 워크플로는 `packages/auth-client/src/**`·`auth-react/src/**` 변경 push 에 자동 실행되며 `E2E_{KPA|KCOS|NETURE}_ADMIN_*` secret(WO-2C reset 이후 stale)으로 3 서비스 × 반복 로그인 → 같은 users row 에 `loginAttempts` 누적 → 5회 이상에서 **30분 잠금**(`handleFailedLogin`). 이번 커밋 `35548dd65` 도 auth 패키지를 건드려 14:22~14:28Z 잠금을 유발했다. 14:04:54Z 의 `invalid_password` 1건 + 14:05Z `account_locked` 4건은 사용자 시도로 보인다. 현재: `lockedUntil` 14:34:54Z 만료(잠금 해제) · **`loginAttempts=8` 잔존 → 다음 password 실패 1회에 즉시 30분 재잠금**, 성공 로그인 시 0 리셋. **제안(별도 승인):** ① `e2e-auth-runtime.yml` push 트리거 제거 또는 워크플로 비활성(WO-2F 에서 Google 경로 기준 재정의 전까지) — CI 변경 = 중지 조건 · ② `loginAttempts` 1행 리셋은 UPDATE 이므로 사용자 명시 승인 시에만.

**주의(WO §3):** 이메일 로그인은 service_credentials 해시를 우선 쓰므로 평소 비밀번호가 `users.password` 와 다를 수 있다. Smoke 1 에서 `INVALID_PASSWORD` 가 나오면 `PUT /users/password`(serviceKey 없이) 로 `users.password` 를 먼저 정렬한 뒤 재시도한다 — 값은 추측·조회하지 않는다.

## 4. Git

| 커밋 | 범위 |
|---|---|
| `5a07042cf` | WO 접수 · 선행 CHECK COMPLETE |
| `35548dd65` | 서버 · 패키지 · neture 화면 · 테스트 |
| (본 커밋) | CHECK 초안 |

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(E2E Auth Runtime 워크플로 = 운영자 계정 잠금 유발 · push 트리거 제거/비활성)
