# WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1

> 발행: 2026-09-29 · 상태: **조사 완료 / 설계 확정 / 구현 착수 전**
> 진행 기록: `docs/checks/CHECK-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md` (구현 시 생성)
>
> **하나의 작업이다.** 서버 · 화면 · 문서 정정을 서비스별·단계별 WO 로 나누지 않는다.
> 엔드포인트가 생겼다는 사실로 완료를 판정하지 않는다.

---

## INITIAL_PURPOSE

Google 단일 로그인에 **이메일 주소를 아이디로 쓰는 이메일·비밀번호 가입·로그인**을 더한다.
사용자는 두 수단 중 하나로 **같은 O4O 계정**에 로그인한다.

**로그인 수단 ≠ 서비스 가입 ≠ 운영자 권한.** 세 판정은 이미 분리돼 있고
(`WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1`), 이 WO 는 **첫 번째 판정에만** 수단을 더한다.
로그인 후의 membership · 역할 · handoff · 서비스 단위 로그아웃 계약은 그대로 쓴다.

## CONFIRMED_DECISIONS

```text
아이디            이메일 주소. 정규화·중복 판정은 서버 한 규칙
가입              Google 가입 + 이메일·비밀번호 가입 병행. 이메일 가입은 주소 소유 확인 완료 후 사용 가능
로그인            "Google 로 계속하기" + "이메일·비밀번호 로그인" 병행
비밀번호 규칙      8자 이상 · 영문자 ≥1 · 숫자 ≥1 · 특수기호 ≥1
                  대문자/소문자 각각 요구 안 함 · 대소문자 임의 변환 금지 · 주기적 변경 의무 없음
                  화면과 서버가 같은 규칙(정본 1곳)
기존 Google 계정   이메일이 같다는 이유만으로 새 계정 생성·자동 연결 금지
                  **Google 로 로그인한 상태에서** 본인 계정에 비밀번호 수단을 추가
비밀번호 찾기      가입 이메일로 유효기간 있는 일회용 재설정 링크. 사용 후 재사용 불가
아이디 찾기        전화번호 입력 → 일치 계정의 **가린 이메일 힌트만** (예: r***@g***.com)
                  전화번호 입력을 본인 인증으로 취급하지 않는다 · 전체 주소 표시 금지
                  번호에 연결된 계정이 여러 개면 목록을 노출하지 않고 지원 안내
오류 표기          전화번호 불일치에도 가입 여부를 단정하는 상세 오류 금지
횟수 제한          아이디 찾기 · 가입 · 로그인 · 재설정 요청 전부 적용
저장              비밀번호는 평문·복구 가능 형태로 저장 금지
로그              재설정 토큰 · 비밀번호 · 인증 URL 을 로그에 남기지 않는다
```

## OUT_OF_SCOPE

```text
PASS 등 휴대전화 본인 인증          후속 개발 (전체 이메일 주소 복구의 전제)
전체 이메일 주소 복구                같음
운영자 지정 화면                     WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 후속
서비스 회원 역할 관리                같음
분회 · 커뮤니티 신청 심사            같음
소셜 로그인 추가(Google 외)          이 WO 아님
```

## DONE_CRITERIA

```text
1. 이메일 신규 가입 → 소유 확인 → 로그인이 운영에서 성립
2. Google 기존 계정에 비밀번호 수단 **명시적** 추가가 성립하고, 두 수단이 같은 users.id 로 로그인
3. 같은 이메일로 계정이 둘 생기지 않는다 (DB 제약 + 서버 판정 양쪽)
4. 비밀번호 재설정: 링크 1회용 · 만료 거부 · 재설정 후 세션 처리 규칙대로 동작
5. 아이디 찾기: 가린 힌트만 · 다중 계정은 목록 비노출 · 횟수 제한 동작
6. 잘못된 비밀번호 · 만료 토큰 거부
7. 로그인 수단과 무관하게 서비스 가입·권한 경계 유지 (회귀 0)
8. 서비스 간 이동(handoff) · 서비스 단위 로그아웃 회귀 0
9. CI 통과 · 코드/DB/배포 영향 범위 기록
10. 운영 적용 + 실계정 확인 전에는 DONE 으로 쓰지 않는다
```

---

## 1. 조사 — 현재 인증·계정 구조 (2026-09-29 · read-only)

**옛 비밀번호 구조를 되살리지 않는다.** 아래가 현재 사실이고, 구현은 이 구조에 맞춘다.

### 1-1. 무엇이 제거됐나 (`DropLegacyPasswordAuthSchema1790251584623` · 2026-09-24 적용)

| 제거된 것 | 비고 |
|---|---|
| `service_credentials` 테이블 | 서비스별 password hash 축 (Identity V2) — DROP |
| `password_reset_tokens` 테이블 | DROP |
| `users.password` · `reset_password_token` · `reset_password_expires` | DROP |
| `users."loginAttempts"` · `"lockedUntil"` | DROP (lockout 축) |
| 남긴 것 | `login_attempts` 테이블(FROZEN `auth-core` 소유 · 0행) · `users.email` · bcrypt dep(과거 migration 이 import) · sanitizer 블랙리스트 |

그 migration 의 `down()` 은 **구조만** 되돌린다 — 데이터는 돌아오지 않는다.
**이 WO 는 `down()` 을 쓰지 않는다.** 되살리는 것이 아니라 **새로 만든다**(§2).

### 1-2. 현재 인증 축

```text
identity      Google sub → linked_accounts(provider='google', providerId=sub) → users.id
users.email   프로필 필드 (현행 정본 V3 의 서술) · 물리적으로는 NOT NULL + UNIQUE INDEX IDX_users_email
세션          access/refresh JWT. refresh 는 users.refreshTokenFamily 1슬롯
              claim 에 serviceKey · sessionEpoch (WO-…-OPERATOR-SCOPE-V1 §8)
로그아웃       service_session_revocations 세대 기반 — 서비스 단위 서버측 폐기
서비스 간 이동 handoff_tokens (출발 서비스·세대를 토큰이 증명)
가입 자격      service_memberships(active) — 로그인과 별개
권한          role_assignments (RBAC SSOT)
```

### 1-3. 현재 엔드포인트 (`/api/v1/auth`)

```text
GET  /google/config          POST /google/login      POST /google/signup
POST /refresh                GET  /me                PATCH /me/profile
POST /logout                 POST /logout-all
POST /handoff                POST /handoff/exchange
GET  /services               POST /services/:serviceKey/join
GET  /status
```

비밀번호 계열 엔드포인트는 **하나도 없다.**

### 1-4. 화면 (실제 운영 중인 것)

| 위치 | 내용 |
|---|---|
| `@o4o/auth-react` `GoogleContinue.tsx` | 공통 "Google 로 계속하기" 버튼 — **7개 소비처** (web-neture · kpa-society · kpa-branch · k-cosmetics · pharmacy-hub 의 LoginModal · LoginPage · JoinPage) |
| `@o4o/auth-client` | `client.ts` · `google-identity.ts` — 서버 호출 정본 |
| `@o4o/account-ui` | `AccountSecuritySettings.tsx` 존재 — 비밀번호 추가/변경 UI 의 자리 후보 |
| web-neture | `/login` · `/register` 는 `LoginRedirect` · `RegisterRedirect`(모달 기반) · `RegisterPendingPage` |

**공통 버튼이 7곳에 이미 꽂혀 있다** — 화면 작업은 서비스별 복제가 아니라
`GoogleContinue` 와 **같은 자리에 들어가는 공통 컴포넌트**를 만드는 방식이어야 한다.

### 1-5. 있는 것 / 없는 것 (재사용 판단)

| 필요 | 현재 | 판단 |
|---|---|---|
| 이메일 발송 | `@o4o/mail-core` (`mail.service` · `mail-transport` · 템플릿 14종 · **`email-verification.html` 이미 있음**) · `email_logs` 테이블 | **재사용** |
| 횟수 제한 | `middleware/rateLimiter.ts` — `strictLimiter` · `apiLimiter` · `ipBurstLimiter` · `smartLimiter` | **재사용**(신규 limiter 추가 없이 `strictLimiter` 축) |
| 전화번호 | `users.phone varchar(20)` **존재** | 아이디 찾기의 입력 축 — 신규 컬럼 불필요 |
| 이메일 중복 방지 | `IDX_users_email` UNIQUE **존재** | DB 제약 그대로 사용 |
| 비밀번호 해시 | **없음**(DROP) | §2 신규 |
| 이메일 소유 확인 토큰 | **없음** | §2 신규 |
| 재설정 토큰 | **없음**(DROP) | §2 신규 |

---

## 2. 설계 (확정) — 새로 만드는 저장 구조

**`users` 에 컬럼을 다시 붙이지 않는다.** V3 의 "최소 User" 와 `linked_accounts` 패턴에 맞춰
**인증 수단을 별도 테이블**로 둔다. 이렇게 하면 수단 추가·해지가 users 행을 건드리지 않는다.

```text
user_password_credentials     user_id UNIQUE(FK users) · password_hash · algo · password_changed_at
                              · created_at · updated_at
                              한 사용자에 최대 1행 = "비밀번호 수단을 가졌는가"
email_verification_tokens     user_id(FK) · token_hash UNIQUE · email · expires_at · consumed_at
password_reset_tokens (신설)   user_id(FK) · token_hash UNIQUE · expires_at · consumed_at
                              옛 동명 테이블과 이름만 같고 **평문 토큰을 저장하지 않는다**
```

**토큰은 해시만 저장한다.** 평문은 이메일 링크에만 실리고 DB·로그에 남지 않는다.
`consumed_at` 으로 1회용을 물리 보장하고, 만료분은 발급 시 정리한다
(선례: `handoff-token.service.ts`).

> **migration 은 사용자 승인 후 작성한다** (CLAUDE.md 중지 조건 · DB schema 변경).
> incremental 번호 · `manifest.ts` · `expected-schema-states.ts` 는 같은 커밋으로 넣고,
> 지문은 격리 PostgreSQL 에서 측정한다(운영 DB 복사 금지).

### 2-1. 엔드포인트 (신규 · 기존 12개는 건드리지 않는다)

```text
POST /auth/email/signup            이메일 + 비밀번호 → 미확인 계정 + 확인 메일
POST /auth/email/verify            토큰 → 소유 확인 완료(이 시점부터 로그인 가능)
POST /auth/email/login             이메일 + 비밀번호 → 기존 세션 발급 경로 재사용
POST /auth/password/forgot         이메일 → 재설정 메일 (존재 여부를 응답으로 구분하지 않는다)
POST /auth/password/reset          토큰 + 새 비밀번호
POST /auth/password              **인증 필요** — Google 로그인 상태에서 비밀번호 수단 추가/변경
POST /auth/account/find-id         전화번호 → 가린 이메일 힌트 (또는 지원 안내)
```

- 세션 발급은 **기존 `auth-token-session.service`** 를 통과한다 — claim(`serviceKey` · `sessionEpoch`) ·
  family · 서비스 단위 로그아웃 계약이 수단과 무관하게 같아야 한다.
- 전부 `strictLimiter` 축 + `requireAuth`(해당 경로) 적용. `GET` 으로 상태 변경 없음(CLAUDE.md §8).

### 2-2. 판정 규칙 (한 곳에 둔다)

| 규칙 | 정본 위치(예정) | 내용 |
|---|---|---|
| 이메일 정규화 | `packages/auth-utils` | trim + 소문자화. 중복 판정·조회·저장 전부 이 함수 결과로 |
| 비밀번호 정책 | `packages/auth-utils` | 8자 이상 · 영문자 ≥1 · 숫자 ≥1 · 특수기호 ≥1. 화면과 서버가 **같은 함수** |
| 해시 | api-server | 단방향 해시 + salt(기존 dep 사용 · 새 의존성 추가 금지). 대소문자 변환 금지 |
| 재설정 후 세션 | api-server | **`logout-all` 과 같은 전역 폐기**로 정한다 — 비밀번호가 바뀌면 그 이전 세션을 남기지 않는다 |
| 마스킹 | `packages/auth-utils` | local part 첫 1자 + `***`, 도메인 첫 1자 + `***` + TLD |

### 2-3. 관리자 진입 경계 (의도치 않은 개방 방지)

```text
기존 정책 확인 → Admin · platform:super_admin 진입에 새 수단을 적용할지 **먼저 판정**
기본값        서비스 회원용으로만 적용. 관리자 진입은 현행(Google) 유지
근거          관리자 Google 전환이 별도 WO 로 완료됐다(Google Identity Migration)
              서비스 회원 변경만으로 관리자 진입이 열리면 그 WO 의 결정을 뒤집는다
검증          비밀번호 수단만 가진 계정이 Admin · platform 경로에서 거부되는지 테스트로 고정
```

---

## 3. 기준 문서 정정 — **경계 주의**

이 WO 는 **ACTIVE 기준 문서의 정책과 충돌한다.** 숨기지 않고 여기 적는다.

| 문서 | 현재 서술 | 이 WO 의 변경 |
|---|---|---|
| [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) (ACTIVE) | **Google 단일 로그인** · `users.email` 은 프로필 필드이며 **인증 키가 아니다** · password 축 제거 완료 | 이메일이 **로그인 아이디**가 된다 = 인증 키 추가 |
| [`USER-DOMAIN-SSOT-V1`](../baseline/USER-DOMAIN-SSOT-V1.md) (ACTIVE) | 같은 identity 축 서술 · password 축 물리 제거 반영 | 새 인증 수단 축 추가 |
| `CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1` 등 CHECK · WO | 과거 실행 기록 | **보존한다** — 정책이 바뀐 사실만 상단에 표기 |

```text
원칙   과거 실행 기록은 보존한다. 되돌리거나 고쳐 쓰지 않는다.
       기준 문서에는 "정책 변경(2026-09-29 · 이 WO)" 을 표기하고 현재 상태를 정정한다.
       CLAUDE.md §16-4 는 기준 문서 내용 변경을 인라인 금지하지만, 이 변경은
       **사용자의 명시적 정책 지시**(충돌 우선순위 1)이며 이 WO 가 그 근거 문서다.
```

---

## 4. 검증 항목

| # | 항목 |
|---|---|
| V1 | 이메일 신규 가입 → 확인 메일 → 확인 전 로그인 **거부** → 확인 후 로그인 성공 |
| V2 | Google 기존 계정: 로그인 상태에서 비밀번호 추가 → 두 수단 모두 **같은 `users.id`** 로 로그인 |
| V3 | 같은 이메일로 두 번째 계정 생성 **불가** (서버 판정 + `IDX_users_email` 양쪽) |
| V4 | 이메일이 같아도 **자동 연결 0** — 미로그인 상태의 비밀번호 가입이 기존 Google 계정을 흡수하지 않는다 |
| V5 | 재설정 링크: 1회용(두 번째 사용 거부) · 만료 거부 · 재설정 후 이전 세션 무효 |
| V6 | 아이디 찾기: 가린 힌트만 · 다중 계정은 목록 비노출 + 지원 안내 · 불일치 응답이 가입 여부를 구분하지 않는다 |
| V7 | 횟수 제한: 아이디 찾기 · 로그인 · 가입 · 재설정 요청 전부 |
| V8 | 잘못된 비밀번호 거부 · 응답이 "계정 없음"과 "비밀번호 틀림"을 구분하지 않는다 |
| V9 | 비밀번호 정책: 8자 미만 · 영문자 없음 · 숫자 없음 · 특수기호 없음 각각 거부 · 대소문자 보존 |
| V10 | 저장 검사: 평문 0 · 응답·로그에 토큰·비밀번호·URL 0 |
| V11 | 회귀: 서비스 가입 자격 · 역할 경계 · handoff · 서비스 단위 로그아웃 (수단 무관 동일) |
| V12 | 관리자 경계: 비밀번호 수단만 가진 계정이 Admin · `platform:super_admin` 경로에서 거부 |

---

## 5. 착수 전 사용자 승인이 필요한 것

```text
1. DB schema 변경 (신규 테이블 3개)        CLAUDE.md 중지 조건
2. 기준 문서(V3 · USER-DOMAIN-SSOT) 정책 정정   §16-4 인라인 금지 대상
3. 관리자 진입에 새 수단을 적용할지 여부      §2-3 의 기본값(적용 안 함) 확인
```

위 3건이 확정되면 구현 → CI → 배포 범위 보고 → 운영 적용 → 실계정 확인 순서로 진행한다.
**엔드포인트·화면이 생겼다는 사실만으로 DONE 으로 쓰지 않는다.**

---

*Created: 2026-09-29*
*Status: 조사 완료 · 설계 확정 · 구현 착수 전 (§5 승인 대기)*
