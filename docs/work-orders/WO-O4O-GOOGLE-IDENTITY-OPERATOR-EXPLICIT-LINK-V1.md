# WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1

> **성격:** Phase 2 — 기존 운영자 계정에 Google Identity **명시 연결**(구현 WO · Core Auth 예외는 본 WO 로 승인)
> **선행:** [`CHECK-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1`](../checks/CHECK-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1.md) `COMPLETE`(Google 신규가입·재로그인·자동 병합 방지 운영 검증)
> **대체:** 구 **WO-2E First Google Admin Bootstrap**(테스트 계정에 admin 부여) 은 **폐기**. 관리자 Identity 는 운영자 계정에 직접 붙인다.
> **접수:** 2026-09-18 · 사용자 지시 원문 기반
> **용어 고정:** **운영자 계정 = `sohae2100`** · **테스트 계정 = `renagang21`**(Google-only). `cleanup user` 표현은 더 쓰지 않는다.

> **전제 정정(2026-09-21 · 사용자 확정 · 전환기 정책):** 위 "운영자 계정 = `sohae2100`" 은 **"현재 `platform:super_admin` 을 보유한 기존 `users.id`"** 로 읽는다. 이 user 의 **관리자용 내부 email 은 `renariver21@gmail.com`** 으로 정정됐다(2026-09-21 · `users.email` 1행 UPDATE · users.id·role·membership·credential·password 전부 불변 · 사용자 명시 승인). 이후 본문의 `sohae2100` 은 이 **동일 users.id** 를 가리키는 옛 handle 표기다.
> - canonical platform admin user = 기존 super_admin `users.id`(email `renariver21@gmail.com`) · `platform:super_admin` 유지
> - 기존 이메일/비밀번호 로그인 **당분간 유지**(`renariver21@gmail.com` + 기존 비밀번호) · Google 로그인과 **병행**
> - Google Identity 는 `users.email` 과 **별개**. 실제 사용할 Google 계정의 검증된 `sub` 를 같은 admin users.id 에 연결한다. **email 일치를 연결 근거로 쓰지 않는다**(Google 계정 email ≠ users.email 허용)
> - users 신규 생성·삭제·users.id 변경 금지 · role/membership 변경 금지 · password/`service_credentials` 제거 금지 · **추가 password reset·credential 정렬 작업 중단**
> - `renagang21` = Google-only 테스트 계정, 변경 없음
> - password 로그인 제거는 **별도 승인**(WO-2F)

---

## 1. 목표와 배경

운영자 계정 `sohae2100` 의 현재 `users.id` · 역할 · 멤버십을 그대로 유지하면서, 사용자가 직접 인증한 Google 계정을 `linked_accounts` 에 명시적으로 연결한다.

```text
기존 운영자 users.id
  ├─ platform:super_admin
  ├─ service memberships
  └─ legacy password
        + 사용자가 직접 Google 인증 → verified Google sub → linked_accounts → 기존 users.id 에 연결
성공 후: Google 로그인 → 기존 sohae users.id → 기존 platform:super_admin · 역할/멤버십 그대로
```

### 불변 원칙

- email 일치를 연결 근거로 사용하지 않는다. Google `sub` 만 외부 Identity Key.
- users row 를 새로 만들지 않는다 · 기존 `users.email` 을 변경하지 않는다.
- 역할 · 멤버십 · 사업 데이터는 변경하지 않는다.
- `service_credentials` 는 본인 재인증 수단으로 사용하지 않는다(IR §8 결정 (c) 와 동일).

## 2. Backend — 명시적 Google 연결

### Endpoint

```text
POST /api/v1/auth/google/link          requireAuth
GET  /api/v1/auth/google/link/status   requireAuth   (조사 추가 — 화면 상태 표시용)
```

- 대상 user 는 반드시 `req.user.id`. 입력은 `{ idToken, currentPassword }` 뿐. `userId · email · sub · role · providerId` 는 `validateDto(whitelist + forbidNonWhitelisted)` 가 400 으로 거절.
- `status` 응답 `{ linked: boolean, passwordSet: boolean }` — Google email/sub 등 PII 없음. `passwordSet=false`(Google-only) 면 화면은 비밀번호 입력을 보이지 않는다(§9).

## 3. 이중 본인확인

```text
A. 현재 O4O session (requireAuth)
B. users.password 재확인 — bcrypt compare, 오직 users.password (service_credentials.password_hash 금지)
C. Google ID token 검증 — googleIdentityService.verifyGoogleIdToken (signature · issuer · exp · audience allowlist · sub)
```

- `users.password IS NULL` → `400 PASSWORD_NOT_SET`(Google-only 계정은 이 기능 대상이 아님).
- password 불일치 → `401 INVALID_PASSWORD`(계정 잠금 카운터는 건드리지 않는다 — 로그인 경로가 아니다).
- **조사에서 확인한 위험:** 이메일 로그인은 `serviceKey` 가 있으면 `service_credentials.passwordHash` 를 우선 검증하고 `users.password` 는 fallback 이다([auth-login.service.ts](../../apps/api-server/src/services/auth/auth-login.service.ts) dual-read). 운영자 계정은 credential 5개를 가지므로 **평소 로그인 비밀번호 ≠ `users.password`** 일 수 있다. 연결 시 `INVALID_PASSWORD` 가 나오면 `PUT /users/password`(serviceKey 없이 = V1 `users.password` 흐름) 로 먼저 정렬하거나 password reset 절차를 쓴다 — 본 WO 는 그 값을 추측·조회하지 않는다.

## 4. Google Identity 검증

email 은 받아지더라도 Identity 판정에 쓰지 않는다. `Google email == users.email` 여부는 연결 조건이 아니다(달라도 연결 가능). AST guard(`googleIdentityNoEmailMergeGuard.test.ts` G2) 가 새 코드에도 적용된다.

## 5. 중복 및 충돌 처리

| Case | 상태 | 응답 |
|---|---|---|
| A | 현재 user 에 Google Identity 없음 | `linked_accounts` INSERT → `200 { linked: true, alreadyLinked: false }` |
| B | 같은 sub 가 이미 같은 user 에 연결 | 멱등 `200 { linked: true, alreadyLinked: true }` · row 생성 0 |
| C | 현재 user 에 **다른** sub 가 이미 연결 | `409 GOOGLE_ACCOUNT_ALREADY_LINKED` — Google 계정 교체 기능은 만들지 않는다 |
| D | 해당 sub 가 **다른** users.id 에 연결 | `409 GOOGLE_IDENTITY_IN_USE` — 이동 · merge 절대 없음 |

## 6. linked_accounts 저장

`userId · provider='google' · providerId=verified sub · isVerified=true · isPrimary=true · linkedAt · lastUsedAt` 만. Google email 스냅샷 · displayName · profile image · providerData · access/refresh token 저장 0(signup 과 동일).

## 7. Transaction

`현재 user 조회 → users.password 확인 → ID token 검증 → 기존 linked_accounts 재확인 → 충돌 검사 → INSERT → commit` 을 하나의 transaction 으로. 실패 시 부분 row 0. `(provider, providerId)` partial unique 충돌(동시 요청)은 `GOOGLE_IDENTITY_IN_USE` 로 매핑. `account_activities` 에 `action='link_google'`(email NULL) 기록.

## 8. UI 위치

Neture `https://neture.co.kr/mypage/settings` — 기존 `AccountSecuritySettings` 아래 "로그인 방법" 카드.

```text
로그인 방법
Google   연결되지 않음   [ Google 계정 연결 ]
  → 현재 비밀번호 입력 → Google 계정 선택 → 연결 확인 → "Google 계정 연결됨 ✓"
```

공통 컴포넌트 `<GoogleAccountLink />`(`@o4o/auth-react`, 콜백 props 방식 = `<GoogleContinue />` 와 동일 패턴) + `@o4o/auth-client` `linkGoogle(idToken, currentPassword)` · `getGoogleLinkStatus()`. Google email 은 화면에 표시하지 않는다.

### 8-A. 범위 확장(2026-09-21 · B smoke 결함 처리 · 사용자 지시)

B smoke 에서 `admin.neture.co.kr` 이메일 로그인이 `serviceKey:'neture'` 로 호출되어 **Neture `service_credentials` 해시를 먼저 검증**하는 Admin 인증 계약 불일치가 드러났다(재설정한 `users.password` 는 보지 않음 → "비밀번호가 올바르지 않습니다"는 입력 오류가 아님). 별도 WO 로 쪼개지 않고 **본 WO 의 결함**으로 같이 닫는다.

1. **Admin 이메일 로그인 계약 정정** — `apps/admin-dashboard/src/pages/auth/Login.tsx` 에서 `serviceKey:'neture'` 제거. Admin 은 platform surface 이므로 `users.password` + platform role 로 검증한다(서버 dual-read: serviceKey 없음 → `users.password`, 서버 변경 0). Neture credential 은 플랫폼 관리자 인증 근거가 아니다.
2. **Admin Google 연결 UI** — `/settings/my-account`(내 계정 탭 · 헤더 "계정 설정" 진입) 에 기존 `<GoogleAccountLink />` 재사용. 기존 `GET /auth/google/link/status` · `POST /auth/google/link` · `verifyGoogleIdToken` 그대로. 신규 연결 로직 0. admin-dashboard 에 `@o4o/auth-react` workspace 의존성 1줄 추가(사용자 승인).
3. 연결 = 기존 `platform:super_admin` users.id 에 Google sub 1행 추가(linked_accounts 1→2). production DB 직접 UPDATE 로 연결하지 않는다.
4. Google 로그인과 password 로그인 **병행 유지**. `service_credentials` 재설정/정렬 · password 제거 · role/membership 변경 · user 생성 · 테스트 계정 변경 · 운영자 초대 구조 변경은 하지 않는다.
5. 배포 → 사용자 브라우저 smoke(§10 정정판은 CHECK §3) → read-only 검증 → CHECK COMPLETE 까지 본 WO 안에서 완료한다.

## 9. 테스트 계정(Google-only)에는 영향 없음

`passwordSet=false` 면 "Google 연결됨 ✓" 만 표시하고 비밀번호 입력 UI 를 보이지 않는다.

## 10. 연결 성공 후 운영 Smoke

| # | Smoke | 기대 |
|---|---|---|
| 1 | 관리자 user(email `renariver21@gmail.com`) password 로그인 → `/mypage/settings` → Google 계정 연결 → currentPassword(= `users.password`) → **연결 확정한 Google 계정** 선택 | 성공. **users 2(불변)** · linked_accounts 1→2 · 관리자 password/credentials 5/memberships 5/roles 11 유지 |
| 2 | 로그아웃 → `[Google로 계속하기]` → 같은 Google 계정 | signup 화면 없음 → **기존 admin users.id** 로그인 |
| 3 | `https://admin.neture.co.kr` | Admin 정상 진입. 테스트 계정은 계속 접근 불가 |

## 11. Negative Test

- 테스트 계정의 Google sub → 운영자 user 에 연결 시도 → `409 GOOGLE_IDENTITY_IN_USE`
- 잘못된 currentPassword → 401 · 변조 Google token → 401 · 미로그인 → 401 · Google-only 계정 → 400 PASSWORD_NOT_SET
- 단위 테스트로 A~D · negative 를 고정. 운영 negative 는 사용자 브라우저 1건(잘못된 비밀번호) 이상.

## 12. 이번 WO 에서 하지 않는 것

Google 계정 변경 · 연결 해제 · 계정 병합 · email 자동 연결 · `users.email` 변경(※ 2026-09-21 관리자 내부 email 정정 1행은 사용자 명시 승인으로 예외 수행 — 위 전제 정정 참조) · password 삭제 · `service_credentials` 삭제 · role/membership 변경 · 테스트 데이터 재배정 · 테스트 계정 권한 변경 · Mobile.

## 13. 완료 조건

```text
admin user(email renariver21) users.id=기존 · Google linked=YES · platform:super_admin 유지 · password 유지
renagang21 users.id=기존(Google 신규) · Google linked=YES · admin role 없음
DB: users=2 · linked_accounts=2   /   Google 로그인: sohae → Admin 가능 · renagang → Admin 불가
```

판정: `GOOGLE IDENTITY OPERATOR EXPLICIT LINK: COMPLETE | BLOCKED` + `문서 정합:` 한 줄.

## 14. 이후 순서

Google Identity 안정화 → sohae Google admin 확인 → renagang Google test 확인 → **Legacy Password/Auth 제거(WO-2F)** → `service_credentials` 제거 → password 회원가입 UI 제거. 테스트 데이터 재배정(운영자 → 테스트 계정)은 인증 트랙과 별도로 진행한다.
