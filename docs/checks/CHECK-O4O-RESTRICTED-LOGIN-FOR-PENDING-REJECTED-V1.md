# CHECK-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1

- **WO**: `WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1`
- **IR**: `IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1` — **B안(제한 로그인)** 구현
- **선행 WO**: `WO-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1` (commit `951a52a71`)
- **일자**: 2026-07-31
- **브랜치**: `main` / 작업 시작 HEAD `858f0306c`
- **판정**: **PASS**

---

## 1. 목적 요약

`users.status = pending` 신규 사용자가 로그인해 **자신의 가입 상태·반려 사유만** 확인할 수 있도록
제한 로그인(restricted login)을 도입한다.

> 핵심: pending 사용자에게 일반 JWT를 개방하는 것이 아니라,
> **중앙 default-deny 정책이 적용되는 제한 JWT만 발급**한다.

---

## 2. 확정 정책 — 실제 코드 기준 재확인 (WO §2.1)

`UserStatus` enum 실측: [apps/api-server/src/types/auth.ts:21](../../apps/api-server/src/types/auth.ts#L21)

| users.status | 존재 위치 | 판정 | 비고 |
|---|---|---|---|
| `active` | enum + DB | `normal` | 기존과 동일 |
| `approved` | enum + DB | `normal` | 기존과 동일 |
| `pending` | enum + DB | **`restricted`** | 본 WO 신설 |
| `inactive` | enum | `blocked` | |
| `suspended` | enum | `blocked` | |
| `rejected` | enum | `blocked` | |
| `deleted` | **enum에 없음 / DB에는 실재** | `blocked` (fail closed 기본 분기) | 아래 §7 참조 |

- WO §2.1 은 `deleted` 를 전제했으나 **TS enum 에 `deleted` 값은 없다.**
  프로덕션 `users` 에는 `deleted` 문자열이 19건 실재하며(전부 `isActive=false`),
  `resolveAccountAccess` 의 fail-closed 기본 분기로 `blocked` 처리된다.
  **enum 추가·데이터 보정은 하지 않았다** (WO §8: migration 0).

---

## 3. 변경 파일

### 신규 (1)

| 파일 | 역할 |
|---|---|
| [apps/api-server/src/common/auth/account-access.policy.ts](../../apps/api-server/src/common/auth/account-access.policy.ts) | 상태 매핑 · allowlist · 경로 정규화 · restricted 응답 정규화 (중앙 정책 단일 출처) |

### 수정 (8)

| 파일 | 변경 |
|---|---|
| [apps/api-server/src/types/auth.ts](../../apps/api-server/src/types/auth.ts) | `AccessTokenPayload.accountAccess?: 'normal' \| 'restricted'` (optional additive) |
| [apps/api-server/src/utils/token.utils.ts](../../apps/api-server/src/utils/token.utils.ts) | `generateAccessToken` 이 `user.status` 로부터 claim 파생 |
| [apps/api-server/src/modules/auth/entities/User.ts](../../apps/api-server/src/modules/auth/entities/User.ts) | `toPublicData()` 에 `accountAccess` 포함 |
| [apps/api-server/src/services/auth/auth-login.service.ts](../../apps/api-server/src/services/auth/auth-login.service.ts) | 로그인 상태 게이트 2곳(email/OAuth) → `resolveAccountAccess(...)==='blocked'` 만 차단 |
| [apps/api-server/src/services/auth/auth-token-session.service.ts](../../apps/api-server/src/services/auth/auth-token-session.service.ts) | `refreshTokens` 가 DB 최신 status 재판정 (기존엔 `isActive` 만 확인) |
| [apps/api-server/src/common/middleware/auth/authentication.middleware.ts](../../apps/api-server/src/common/middleware/auth/authentication.middleware.ts) | **중앙 default-deny 가드** (`requireAuth` · `requirePlatformUser` · `optionalAuth`) |
| [apps/api-server/src/modules/auth/controllers/auth-account.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-account.controller.ts) | `/auth/me` · `/auth/status` restricted 최소 응답 |
| [apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts](../../apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts) | `/me/access` entryPoints·roles 정규화 + `accountAccess` 노출 |

### 프론트 (1)

| 파일 | 변경 |
|---|---|
| [services/web-pharmacy-hub/src/pages/LoginPage.tsx](../../services/web-pharmacy-hub/src/pages/LoginPage.tsx) | restricted 로그인 시 `/join/status` 로 이동 (상품·주문 진입 링크 없음) |

### 테스트 (1)

| 파일 | 내용 |
|---|---|
| [apps/api-server/src/\_\_tests\_\_/security/restricted-account-access.spec.ts](../../apps/api-server/src/__tests__/security/restricted-account-access.spec.ts) | 24 케이스 (§11.7 보안 10항목 포함) |

---

## 4. 중앙 가드 적용 지점 — 근거 (WO §10-②)

WO §10 중지 조건 ②는 "중앙 차단 지점이 존재하지 않는 경우"였다. **조사 결과 중지 대상 아님**:

- `register-routes.ts` 는 `/api/v1/<area>` 를 40개 이상 **개별 마운트**한다
  → `app.use('/api/v1', guard)` 형태의 앱 레벨 경로 가드는 불가능하다.
- 그러나 `req.user` 를 대입하는 지점은 실측상 **`authentication.middleware.ts` 뿐**이다
  (`grep "req.user ="` → 이 파일 3곳 + `dev-auth.middleware.ts`(개발 전용) + `home-preview.controller.ts`(공개 프리뷰)).
- `requireAuth` / `requirePlatformUser` 는 **매 요청 users row 를 재조회**한다
  → JWT claim 이 아니라 **DB `users.status`** 로 판정할 수 있다.

→ 가드를 `requireAuth` / `requirePlatformUser` 내부(`isActive` 확인 직후)에 두어
**라우트 278개를 개별 수정하지 않고** default-deny 를 단일 지점에서 강제했다.
별칭 `authenticate` / `authenticateToken` / `authenticateCookie` 는 `requireAuth` 재수출이므로 자동 적용된다.

`optionalAuth` 는 비로그인도 통과하는 공개 경로용이므로 403 대신 **비로그인과 동일 취급**(개인화·본인 스코프 write 차단)한다.

---

## 5. Allowlist (확정)

정확 일치(METHOD + 정규화 경로)만 허용한다. prefix 매칭·`/:id` 자원 경로·query 기반 확장 없음.

| METHOD | PATH | 근거 |
|---|---|---|
| GET | `/api/v1/auth/me` | 본인 최소 정보 (§2.4) |
| GET | `/api/v1/auth/verify` | 세션 유효성 |
| GET | `/api/v1/auth/status` | 인증 상태 |
| POST | `/api/v1/auth/logout` | 로그아웃 |
| POST | `/api/v1/auth/logout-all` | 로그아웃 |
| POST | `/api/v1/auth/resend-verification` | 이메일 인증 최소 경로 (§2.4) |
| GET | `/api/v1/auth/services` | 내 service membership 상태 목록 |
| GET | `/api/v1/pharmacy-hub/join/status` | 가입 상태 + 반려 사유 (§5-E) |
| GET | `/api/v1/pharmacy-hub/me/access` | 내 접근 상태 |
| GET | `/api/v1/kpa/me/membership` | KPA 가입 상태 |
| GET | `/api/v1/glycopharm/members/me` | GlycoPharm 가입 상태 |
| GET | `/api/v1/cosmetics/members/me` | K-Cosmetics 가입 상태 |

### 서비스별 상태 조회 경로 실측 (WO §4-C)

| 서비스 | 상태 조회 경로 | allowlist |
|---|---|---|
| Pharmacy-Hub | `GET /join/status`, `GET /me/access` | ✅ |
| KPA Society | `GET /api/v1/kpa/me/membership` (`@deprecated` 주석이나 라이브) | ✅ |
| GlycoPharm | `GET /api/v1/glycopharm/members/me` | ✅ |
| K-Cosmetics | `GET /api/v1/cosmetics/members/me` | ✅ |
| Neture | **전용 경로 없음** | 공통 `/auth/me` · `/auth/services` 로 대체 |

### 의도적 제외

| 경로 | 제외 사유 |
|---|---|
| `POST /api/v1/auth/handoff` | 타 서비스로 세션 전달 — 제한 계정에 불필요 |
| `POST /api/v1/auth/services/:serviceKey/join` | 재신청 정책은 본 WO 범위 밖 (§2.4) |
| `PATCH /api/v1/auth/me/profile` | 프로필 write |
| `GET /api/v1/cosmetics/members/:userId` | **타 사용자 조회 가능** (§7.2) |

---

## 6. 검증 결과

### 6.1 자동 테스트 (§11.7 보안 10항목 + α)

`npx jest src/__tests__/security/restricted-account-access.spec.ts` → **24 passed / 0 failed**

| # | 케이스 | 결과 |
|---|---|---|
| ① | normal 계정 전 경로 통과 | PASS |
| ② | restricted allowlist GET 통과 | PASS |
| ③ | restricted allowlist POST 통과 | PASS |
| ④ | 비허용 GET 403 `ACCOUNT_ACCESS_RESTRICTED` | PASS |
| ⑤ | 비허용 POST 403 | PASS |
| ⑥ | method 불일치 차단 (`POST /join/status`) | PASS |
| ⑦ | path 유사 문자열 우회 차단 (`/auth/mex`, `..` 세그먼트) | PASS |
| ⑧ | query 조작 우회 차단 (`?path=/api/v1/auth/me`) | PASS |
| ⑨ | claim 누락 + DB pending → fail closed | PASS |
| ⑩ | 알 수 없는 status / suspended → `ACCOUNT_NOT_ACTIVE` | PASS |
| + | claim 위조(`accountAccess:'normal'`)로 승격 불가 | PASS |
| + | 승인 후 status=active 즉시 전체 접근 복구 (§11.4) | PASS |
| + | 다중 인코딩·역슬래시·중복 슬래시 정규화 | PASS |

### 6.2 타입·빌드

| 대상 | 명령 | 결과 |
|---|---|---|
| api-server | `npx tsc -p tsconfig.build.json --noEmit` | 오류 0 |
| web-pharmacy-hub | `npx tsc -p tsconfig.json --noEmit` | 오류 0 |

> `apps/api-server/tsconfig.json` 은 `src/scripts/**` 의 **기존(선행 존재) 오류**를 포함하므로
> 배포 기준인 `tsconfig.build.json` 으로 검증했다.

---

## 7. 프로덕션 데이터 조사 (WO §2.2 / §6) — 조사·기록만, 보정 없음

cloud-sql-proxy 경유 **read-only SELECT** (2026-07-31, `o4o_platform`).

| 항목 | 값 |
|---|---|
| `users.status` 분포 | `deleted` 19 · `active` 16 · `approved` 4 · **`pending` 1** |
| `users.status='pending'` + `service_memberships.status='active'` | **0건** (WO §2.2 비정상 케이스 없음) |
| pending 사용자의 membership | `k-cosmetics` / `pending` 1건 (정상) |
| `users.status='pending'` + `role_assignments.is_active=true` | **0건** |
| `isActive=true` 인 status 분포 | `approved` 4 · `active` 16 · `pending` 1 |
| `deleted` 19건의 `isActive` | 전부 `false` → 기존과 동일하게 401 단계에서 차단 |

**영향 범위**: 본 변경으로 동작이 바뀌는 실제 계정은 **pending 1건**뿐이며,
해당 계정은 이전에 로그인 403(`ACCOUNT_NOT_ACTIVE`) → 이후 제한 로그인 가능(allowlist 12경로).
활성 membership·활성 role 을 동시에 가진 비정상 계정은 없으므로 §6 우선순위 충돌 사례는 발생하지 않는다.
**어떤 행도 변경하지 않았다** (SELECT only).

---

## 7-A. 배포 후 프로덕션 검증 (2026-07-31)

- 커밋 `bf7090884` → GitHub Actions **Deploy API Server (Cloud Run) success**
- Cloud Run 리비전 `o4o-core-api-03047-dsk` (100% traffic)
- 프론트: **Deploy Web Services success**, `pharmacy-hub-web`

### 7-A-1. E2E 테스트 계정 (실 회원가입 API 사용 — DB 직접 변경 없음)

| 항목 | 값 |
|---|---|
| userId | `88a9fd90-62b6-403e-9c9b-957cbc710b27` |
| membershipId | `689625d9-5d80-4a94-9513-8fd4cf875381` |
| 식별 | 이름 `[E2E_TEST] 제한로그인` / 이메일 `e2e-restricted-*@example.com` |
| 생성 경로 | `POST /api/v1/auth/register` (serviceKey=pharmacy-hub, role=store_owner) |
| 반려 경로 | `PATCH /api/v1/pharmacy-hub/operator/memberships/{id}/reject` |
| 현재 상태 | `users.status=pending` / membership `rejected` — **잔존**(정리 필요 시 별도 판단) |

> 비밀번호는 저장소·본 문서·채팅 어디에도 기록하지 않았다.

### 7-A-2. API 스모크 결과

| 시나리오 | 기대 | 실측 |
|---|---|---|
| normal 로그인 (active) | JWT claim `normal` | `accountAccess=normal`, roles 10 ✅ |
| normal 계정 API 6종 | 403 없음 | `/auth/me`·`/auth/services`·`/kpa/me/membership`·`/pharmacy-hub/me/access` 200 (미존재 경로만 404) ✅ |
| **pending 로그인** | **성공 + 제한 JWT** | HTTP 200, `status=pending`, `accountAccess=restricted`, claim roles `[]` ✅ (기존엔 403 `ACCOUNT_NOT_ACTIVE`) |
| restricted allowlist 4종 | 200 | `/auth/me`·`/auth/services`·`/pharmacy-hub/join/status`·`/pharmacy-hub/me/access` 200 ✅ |
| restricted 비허용 | 403 `ACCOUNT_ACCESS_RESTRICTED` | `/dashboard/assets`·`/cpt/types`·`/pharmacy-hub/operator/memberships`·`POST /forum/posts`·`PATCH /auth/me/profile` 전부 403 + 지정 code/message ✅ |
| query 우회 | 차단 | `/products?x=/api/v1/auth/me` → allowlist 미통과 ✅ |
| `optionalAuth` 공개 경로 | 비로그인 취급(200) | `GET /forum/posts` 200 — 공개 목록이므로 정상 ✅ |
| `/auth/me` 최소 응답 | role/scope 비움 | `roles=[]`, `scopes=[]`, `role='user'`, memberships 는 유지(`pharmacy-hub/pending`) ✅ |
| `/me/access` 정규화 | entryPoints 전부 false | `{storeOwner:false, supplier:false, operator:false}`, `roles=[]`, `accountAccess=restricted` ✅ |
| refresh | 제한 claim 유지 | HTTP 200, 재발급 claim `restricted` ✅ |
| **반려 후 재로그인** | 로그인 + 반려 사유 열람 | 로그인 200(restricted) → `/join/status` `status=rejected`, `rejectionReason` 노출 ✅ **(WO 핵심 목표 달성)** |

### 7-A-3. 브라우저 스모크 (Playwright, 실제 배포 화면)

`https://pharmacy-hub-web-*.run.app/login` 에서 pending 계정 로그인 →
**`/join/status` 로 이동**, "승인 대기 중입니다" + 신청 역할/일시 표시.
상품·주문·콘텐츠 진입 링크 없음(`처음으로` 링크만) ✅

---

## 8. WO §10 중지 조건 판정

| # | 조건 | 판정 |
|---|---|---|
| ① | 기존 클라이언트 계약 파손 | 해당 없음 — `accountAccess` 는 optional additive claim/필드. 기존 토큰·응답 소비처 무변경 |
| ② | 중앙 차단 지점 부재 | 해당 없음 — §4 참조 (`requireAuth` 단일 지점) |
| ③ | refresh 가 최신 status 를 볼 수 없음 | 해당 없음 — `refreshTokens` 가 이미 users row 를 로드 |
| ④ | 신규 role/migration 필요 | 해당 없음 — role 0 / migration 0 / 테이블 0 |
| ⑤ | 서비스별 상태 경로 부재 | 부분 해당(Neture) — 존재하는 경로만 allowlist, 공통 경로로 대체 |
| ⑥ | 타 사용자 조회 허용 필요 | 해당 없음 — `:userId` 경로 전부 제외 |
| ⑦ | claim 누락 토큰 잠금 | 해당 없음 — 판정 SSOT 가 DB status 라 claim 없이도 정상 판정 |
| ⑧ | 병행 작업 충돌 | 해당 없음 — 병행 세션 산출물(untracked `otc-en-summary-rebuild-*.ga.json`)은 미접촉·미스테이징 |

---

## 9. 데이터 변경 원칙 준수 (WO §8)

| 항목 | 결과 |
|---|---|
| migration | **0** |
| 신규 테이블 | **0** |
| 신규 role | **0** (`role_assignments` 무변경 — 제한 상태는 계정 접근 축) |
| `users.status` 일괄 변경 | **0** |
| membership 변경 | **0** |

---

## 10. 보안 원칙 확인 (WO §7)

- **§7.1** 프론트 메뉴 숨김 아님 — 모든 차단은 `requireAuth` 중앙 가드에서 403 으로 강제된다.
  프론트 변경(로그인 리다이렉트, entryPoints 정규화)은 **표시 정합**일 뿐 보안 경계가 아니다.
- **§7.2** allowlist 12경로는 전부 **본인 스코프 고정** 쿼리(`user_id = $1`)이며 `:id` 경로가 없다.
- **§7.3** fail closed — 알 수 없는 status, method/경로 판정 불가, malformed 인코딩은 모두 차단.

---

## 11. 잔여 사항 (후속)

1. Neture 전용 가입상태 API 부재 — 공통 `/auth/me` 로 대체 중. 필요 시 별도 WO.
2. 재신청(재가입 신청) 정책은 본 WO 범위 밖 (§2.4) — `POST /auth/services/:serviceKey/join` 은 제한 계정에 닫혀 있다.
3. KPA/GlycoPharm/K-Cosmetics 프론트의 restricted 로그인 후 라우팅은 본 WO 에서 변경하지 않았다
   (해당 서비스는 기존 membership 게이트 화면이 이미 동작). Pharmacy-Hub 만 리다이렉트를 정렬했다.
4. `users.status='deleted'` legacy 값은 enum 외 값으로 남아 있다 — 정리는 별도 WO 대상.
