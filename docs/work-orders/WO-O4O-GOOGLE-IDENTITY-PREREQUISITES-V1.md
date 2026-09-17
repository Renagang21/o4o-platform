# WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1

> **성격:** Phase 2-A 선행조건 구축 — Google 로그인 자체를 만들지 않고, **`linked_accounts` 를 신뢰할 수 있는 Identity 저장소로 만들고 Google-only 계정이 가능하도록 DB 제약만 준비**한다.
> **목적:** Google Identity 구현 전에 필요한 DB 계약 · 의존성 · Core 예외 · 운영 상태를 준비한다.
> **선행:** [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) · [`IR-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1`](../investigations/IR-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1.md)(APPROVED 2026-09-17 · §8 결정 6건)
> **후속:** WO-2B Automatic Email Merge Removal
> **Core 예외:** auth-core(F10) · baseline schema — [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) §5-A 명시적 예외 절차 대상. 본 WO 가 그 승인 문서다.
> **중요:** Google 로그인/가입/연결 기능 자체는 이번 WO 에서 구현하지 않는다.

---

## 1. 목표와 배경

최종 Target:

```text
Google ID token → server verify → Google sub → linked_accounts → users.id
```

이번 WO 에서는 위 흐름을 실제 서비스에 노출하지 않는다. 후속 WO 가 안전하게 구현될 수 있도록 다음을 준비한다.

1. `linked_accounts` 를 Google `sub` Identity 저장소로 사용할 수 있는 DB 계약 확보
2. Google-only 사용자를 막는 `users.password` · `users.name` 제약 완화
3. 서버측 Google ID token 검증용 공식 라이브러리(`google-auth-library`) 의존성 준비
4. 현행 legacy social 상태를 read-only 로 재확인
5. migration 관련 schema baseline / ledger / assertion 을 같은 작업에서 정합화

### 확정 정책

- O4O Login = Google 단일 로그인 · 외부 Identity Key = Google `sub` · JWT `sub` 및 내부 기준 = 기존 `users.id`
- email 은 Identity Key 가 아님 · 이메일 동일성 자동 병합 금지
- 1 O4O user : 1 Google `sub` · 1 Google `sub` : 1 O4O user
- `linked_accounts` 재사용 · **`linking_sessions` 는 이번 WO 에서 생성하지 않음**(WO-2E)
- 기존 password login 은 이번 WO 에서 그대로 유지

---

## 2. 승인 범위

### 2-1. 시작 전 read-only census (건수만 · 개인정보 실값 기록 금지)

```text
A. linked_accounts 전체 row 수
B. linked_accounts provider 별 row 수
C. (provider, providerId) 중복 건수
D. provider='google' 기준 userId 중복 연결 건수
E. users.provider IS NOT NULL 건수
F. users.provider 값별 건수
G. users.provider_id IS NOT NULL 건수
H. users.password = '' 건수
I. users.password IS NULL 건수
```

예상 기준선 `linked_accounts = 0 rows`. 다음 발견 시 migration 을 진행하지 않고 건수만 보고: 예상 외 운영 row · `(provider, providerId)` 중복 · 동일 user 복수 Google row · 해석 필요한 legacy social row.

### 2-2. `google-auth-library` 의존성 추가

후속 WO-2B/2C/2D 의 `verifyIdToken()` 선행 준비. `package.json` · `package.production.json` · lockfile 정합. 실제 verification service · route 는 구현하지 않는다.

**금지:** `passport-google-oauth20` · Kakao/Naver dependency 제거 · Google client secret 코드/환경파일 추가 · Google Cloud Console 자동 설정.

### 2-3. `linked_accounts` DB 계약 정비

- **A. users FK** — `FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE`. 기존 row 존재 시 orphan 여부 count-only 검증 후.
- **B. Google sub 전역 unique** — `UNIQUE(provider, providerId) WHERE providerId IS NOT NULL`
- **C. 1 user : 1 Google sub** — `UNIQUE(userId) WHERE provider = 'google'`. 교체는 향후 명시적 재연결 transaction.

### 2-4. `LinkedAccount` entity drift 정비 (최소)

`userId` 타입 · provider 타입 선언 · `providerId` · 잘못된 `@Unique` · `email` nullable · `createdAt` · FK relation. provider 컬럼을 enum 으로 축소하지 않는다. **삭제하지 않는 컬럼:** `email · displayName · profileImage · providerData · accessToken · refreshToken · expiresAt · profile · isPrimary · isVerified`(Phase 5).

---

## 3. `users` Google-only 준비

- **3-1 `users.password`** — `DROP NOT NULL`. **기존 password 값을 NULL 로 바꾸지 않는다**(Constraint 변경 O · batch update X).
- **3-2 `users.name`** — `DROP NOT NULL` · `DROP DEFAULT`. placeholder(`'사용자'` · `'Google 사용자'` · `'운영자'`) 생성 금지.
- **3-3 `users.email`** — 변경하지 않음(NOT NULL UNIQUE 유지 · Phase 5).

---

## 4. Migration 범위와 Core 예외 (F10 예외 작업)

**Migration 1건 허용 범위:** `linked_accounts` users FK · partial unique #1 · partial unique #2 / `users.password DROP NOT NULL` · `users.name DROP NOT NULL` · `users.name DROP DEFAULT`.

**명시적 제외:** `linking_sessions CREATE TABLE` · `users.email` 제약 · `users.password` 값 · `users.provider/provider_id` 삭제 · `linked_accounts` 컬럼 삭제 · `service_credentials` · `refresh_tokens`.

**4-1 Schema governance 동반(같은 커밋):** migration manifest · expected schema states · canonical baseline/assertion · migration contract check · jest spec · schema drift check. "migration 만 추가 → baseline assertion red → deploy 중단" 을 만들지 않는다.

**4-2 Rollback/failure:** NOT NULL 완화 + FK/UNIQUE 강화 — 기존 email/password 로그인 계약 유지. migration 실패 시 deploy 미진행(기존 정책).

---

## 5. Google Client 설정 준비 (체크리스트만)

Web client(neture.co.kr · kpa-society.co.kr · k-cosmetics.site 계열) · Admin client · Mobile client(Android/iOS). 서버 검증은 `verified token aud ∈ server-side allowlist`. allowlist config/env 구조는 후속 WO. **하지 않는 것:** Client ID 발급 · Secret 저장 · consent screen · domain 승인 · SHA/bundle 설정.

---

## 6. 검증 기준

- **A. Census** — §2-1 count 기록(실값 금지)
- **B. Schema**(test environment) — ① orphan `userId` insert 실패 ② 동일 `(google, sub)` 두 user insert 실패 ③ 한 user 두 Google sub 실패 ④ 동일 user+sub 중복 실패 ⑤ 다른 user+다른 sub 성공 ⑥ `password=NULL` 가능 ⑦ `name=NULL` 가능 ⑧ name 미입력 시 placeholder default 없음 ⑨ 기존 password user 회귀 없음
- **C. Existing Auth Regression** — email/password login · refresh · logout · membership guard · role guard · password reset · register · handoff · admin login. 기존 사용자 로그인 실패 = WO 실패.
- **D. Dependency** — install · lockfile · production package · typecheck · build · dependency policy check.

---

## 7. 중지 조건과 완료 보고

**즉시 중지:** ① `linked_accounts` 예상 외 의미 있는 row ② `(provider, providerId)` 중복 ③ 동일 user 복수 Google 후보 ④ orphan linked account ⑤ `users.provider/provider_id` 운영상 중요한 legacy social 흔적 ⑥ active auth 계약을 깨야만 적용 가능 ⑦ F10 예외 범위 확장 필요 ⑧ dependency 별도 승인 필요 ⑨ 타 세션 dirty/untracked 접촉.

**완료 보고 필수 21항목:** 시작 Git 상태 · census · `linked_accounts` 운영 상태 · `users.provider/provider_id` legacy · empty-password 건수 · migration 파일 · 실제 schema 변경 · `LinkedAccount` entity · `users` entity/schema · `google-auth-library` 위치/버전 · package/lockfile · governance 동반 파일 · schema test · auth regression · typecheck/build · Google client checklist · `linking_sessions` 미생성 · production 개인정보 update 0 · 남은 REVIEW · `HEAD == origin/main` · working tree.

**최종 판정:** `WO-2A: COMPLETE` / `WO-2A: BLOCKED`

---

## 후속 — WO-2B Automatic Email Merge Removal

dead 자동 email merge 2곳 제거 · `AccountLinkingService.mergeAccounts` 은퇴 · email/provider 기반 implicit identity 연결 금지 · `googleIdentityService` 최소 골격(ID token verification · `sub` 조회 · audience allowlist). 실제 login/link/signup endpoint 는 아직 만들지 않음. **WO-2A 완료 전 WO-2B 착수 금지.**

---

*등록: 2026-09-17 · 실행 승인: 사용자 명시 지시(등록 후 실행) · 산출물: `docs/checks/CHECK-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1.md`*
