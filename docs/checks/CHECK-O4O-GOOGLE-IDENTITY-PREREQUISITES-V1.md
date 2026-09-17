# CHECK-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1

> **검증 보고서** — [`WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1`](../work-orders/WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1.md) (Identity V3 Phase 2-A · F10 auth-core 명시적 예외) 실행 기록.
> **코드 commit:** `ae2e7fe32` · **정본:** [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) · [`IR …EXECUTION-PLAN-V1`](../investigations/IR-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1.md)(APPROVED)
> **원칙 준수:** Google 로그인/가입/연결 runtime 0 · `linking_sessions` 미생성 · `users.email` 불변 · **production 개인정보/credential 값 변경 0** · 개인정보 실값 조회 0(count-only).

---

## 0. 최종 판정

```text
WO-2A: COMPLETE  (§6-C 운영 200 로그인 실측만 PENDING — 사용자 1회 로그인 확인 요청 · 아래 §9)
```

| 축 | 결과 |
|---|---|
| read-only census | 중지 조건 0건 — `linked_accounts` 0행 · 중복/orphan 0 · `users.provider/provider_id` 0 · `password=''`/NULL 0 |
| migration (격리 PG 15.19) | fresh bootstrap + incremental 1..5 → `MIGRATION_JOB = SUCCESS` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · 재실행(established) `INCREMENTAL_PENDING 0 · PASS` |
| schema 계약 테스트 §6-B | ①~⑨ 전부 기대대로 (+ legacy email row · CASCADE) |
| governance | `check-migration-contract` 21/21 · classifier spec 29/29(격리 PG) · bootstrap spec PASS |
| 기존 auth jest | 10 suites 152 pass (auth/password/admin/operator/membership guard) |
| typecheck / build / lint | `tsc` exit 0 · `pnpm build` exit 0 · ratchet 46/46 |
| CI · migration Job · API deploy | CI Pipeline **success** · CodeQL success · Deploy API success — Job `o4o-api-migrations-pk4jz`: `LEGACY_ESTABLISHED` · PRE 8b5be7bd 일치 · `INCREMENTAL_EXECUTED = 1` · POST `24c59417… (5725)` = expected · **ASSERTION PASS · JOB SUCCESS** · revision `o4o-core-api-03691-45w` 100% |
| production auth regression §6-C | **PARTIAL** — 운영 schema/값 read-only 검증 PASS · public route(forgot-password · check-email) 200 · login 경로는 `INVALID_CREDENTIALS`(bcrypt 비교 단계까지 도달) 까지 실측. **200 로그인은 smoke 계정 L1 password 가 본 WO 이전부터 불일치+lock**(`7887ea686` 기록)이라 실측 불가 → 사용자 확인 PENDING |

---

## 1. 시작 Git 상태

`main == origin/main` · clean(내 범위). 타 세션이 동시에 수정 중인 파일(약관 동의 WO: `auth-register.controller.ts` · `auth-login.controller.ts` · `authentication.middleware.ts` · `register.dto.ts` · `service-legal/*` · `packages/auth-react/*` · 미추적 `policy-acceptance/` 등)은 **불가침** — staged/commit 에서 제외했고 hunk 확인 완료(내 9파일에 타 세션 hunk 0).

> 로컬 `tsc` · `jest` · `build` 는 타 세션의 미커밋 변경이 섞인 작업트리에서 실행됐다. 내 변경(entity · type · migration · 의존성)은 그 파일들을 import 하지 않으므로 독립이며, 내 commit 단독 검증은 CI(§8) 가 담당한다.

## 2. read-only census (production · Cloud SQL Auth Proxy · `BEGIN READ ONLY … ROLLBACK` · count-only)

| 항목 | 값 |
|---|---:|
| A `linked_accounts` 전체 | **0** |
| B provider 별 | (행 없음) |
| C `(provider, providerId)` 중복 그룹 | 0 |
| D provider='google' userId 중복 그룹 | 0 |
| D2 orphan(`userId` ∉ users) | 0 |
| E `users.provider IS NOT NULL` | 0 |
| F provider 값별 | (행 없음) |
| G `users.provider_id IS NOT NULL` | 0 |
| H `users.password = ''` | 0 |
| I `users.password IS NULL` | 0 |
| (참고) users 전체 / `name IS NULL` / `name = '운영자'` | 58 / 0 / 0 |
| (참고) `linking_sessions` 테이블 | 부재 |
| (참고) `typeorm_migrations` 최신 | `CreateWorkRunCoordination1789540958496` (incremental prefix 4/4) |

운영 `linked_accounts` 구조(적용 전): PK 만 · `IDX_linked_accounts_provider`(non-unique) · `IDX_linked_accounts_user` · **FK 없음**. `users.email NO / name NO default '운영자' / password NO`.

→ **legacy social 사용 흔적 0 · empty-password 계정 0.** WO §7 중지 조건 ①~⑤ 해당 없음.

## 3. Migration

`apps/api-server/src/database/migrations/1789648511051-PrepareGoogleIdentityLinkedAccountsAndUsersConstraints.ts` (manifest 5번째 · append-only)

| 대상 | 변경 |
|---|---|
| `linked_accounts` | `FK_linked_accounts_user` FOREIGN KEY("userId") → users(id) ON DELETE CASCADE |
| `linked_accounts` | `UQ_linked_accounts_provider_providerId` UNIQUE (provider, "providerId") WHERE "providerId" IS NOT NULL |
| `linked_accounts` | `UQ_linked_accounts_google_user` UNIQUE ("userId") WHERE provider = 'google' |
| `users.password` | DROP NOT NULL (값 변경 0) |
| `users.name` | DROP NOT NULL · DROP DEFAULT |
| 가드 | 적용 전 orphan · sub 중복 · user 당 google 중복을 count 로 확인, >0 이면 throw(적용 거부) |
| down | 역순(NULL 값 존재 시 되돌리기 불가 — 의도) |

기존 `IDX_linked_accounts_provider` · `IDX_linked_accounts_user` · 컬럼 18개 · provider varchar 그대로. `linking_sessions` · `users.email` · `service_credentials` · `refresh_tokens` · `users.provider/provider_id` 접촉 0.

### 3-1. 격리 PostgreSQL 15.19 (docker `postgres:15`) 실측

- fresh DB: `FRESH_EMPTY → bootstrap(2026-09-15-id678) → INCREMENTAL_EXECUTED = 5 → LIVE_FINGERPRINT = 24c5941710706267d92cdbf52981aae3fdf5bb81a1c299faa5c03c1d10d25da6 (5725 lines)`
- expected state 6 등록 후 재현: `EXPECTED = LIVE` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · `MIGRATION_JOB = SUCCESS`
- 같은 DB 재실행: `CLASSIFICATION = BOOTSTRAPPED · INCREMENTAL_PENDING = 0 · PASS · SUCCESS`
- classifier spec 의 legacy-established 시나리오(typeorm_migrations 682행 · prefix 5/5): `LEGACY_ESTABLISHED · live fingerprint == expected` — 운영 경로(BOOTSTRAPPED 아님)와 같은 분류 검증 PASS

### 3-2. schema 계약 테스트 (§6-B · 트랜잭션 내 · ROLLBACK)

| # | 시나리오 | 결과 |
|---|---|---|
| ① | orphan `userId` insert | **거부** `FK_linked_accounts_user` |
| ② | 동일 `(google, sub)` 를 두 user 에 | **거부** `UQ_linked_accounts_provider_providerId` |
| ③ | 한 user 에 두 Google sub | **거부** `UQ_linked_accounts_google_user` |
| ④ | 동일 user + 동일 sub 중복 | **거부** `UQ_linked_accounts_provider_providerId` |
| ⑤ | 다른 user + 다른 sub | 성공 (2행) |
| + | legacy `provider='email'` · providerId NULL 2행 | 성공 (partial unique 비적용) |
| + | user DELETE → linked row CASCADE | 3 → 2 |
| ⑥ | `password = NULL` insert/update | 성공 |
| ⑦ | `name = NULL` update | 성공 |
| ⑧ | name 미입력 insert | `name = <NULL>` (placeholder default 없음) |
| ⑨ | legacy password user insert | 성공 |

## 4. Entity / Type 변경

| 파일 | 변경 |
|---|---|
| `entities/LinkedAccount.ts` | `userId` varchar → **uuid** · `provider` enum → **varchar(50)** · `email` NOT NULL → **nullable** · `@Unique(userId,provider,providerId)` · `@Index(email)` **제거** · 운영 index 이름 명시(`IDX_linked_accounts_user/provider`) · `createdAt` 추가 · `linkedAt` DB default · isVerified/isPrimary nullable. 컬럼 삭제 0 |
| `modules/auth/entities/User.ts` | `password` **nullable** (`string \| null`) · `name` **nullable · default 제거** (`string \| null`) |
| `types/account-linking.ts` `LinkedAccount` | `email/isVerified/isPrimary/linkedAt` optional (운영 schema 정합) |

동작 영향: 기존 login 은 `!user.password` 로 "없음" 판정(`''` 와 NULL 동일 처리) — 변경 없음. `UserManagementController.createUser` 처럼 name 을 넣지 않는 insert 는 이제 `'운영자'` 대신 **NULL**(의도 — placeholder 금지). displayName 파생(`name || lastName+firstName || email prefix`)은 그대로.

## 5. 의존성

`google-auth-library` **^11.1.0** (engines node ≥22 · runtime node 22.18 · Dockerfile `node:22-slim`) — `apps/api-server/package.json` · `package.production.json` · `pnpm-lock.yaml`(+google-auth-library · gaxios 7.3.1 · gcp-metadata 9.0.4 · google-logging-utils 2.0.1 · node-fetch 3.3.2 등 transitive; glob deprecated 메시지 2줄 갱신). `require('google-auth-library').OAuth2Client` resolve 확인. passport-google/kakao/naver **유지**. secret · Console 설정 0.

> pnpm store 손상(`msw` 파일 ENOENT)으로 `pnpm add` 가 2회 실패 → `package.json` 직접 편집 + `pnpm install --lockfile-only` + `--frozen-lockfile` 로 정합. `pnpm store status` 는 다수 modified 를 보고(기존 환경 상태 · 이번 WO 범위 밖).

## 6. Governance 동반 파일 (같은 commit)

`incremental/manifest.ts`(import + append) · `incremental/expected-schema-states.ts`(6번째 항목 `24c59417… / 5725`) · canonical baseline(`canonical-schema-baseline.ts`) 은 **불변**(baseline 은 id678 snapshot · incremental 이 위에 쌓임) · `check-migration-contract` C22 = 6 entries PASS.

## 7. 로컬 검증 명령

- `node scripts/db/check-migration-contract.mjs` → **21 pass / 0 fail**
- `O4O_ISOLATED_PG_URL=… npx jest database-state-classifier…spec` → **29/29** · `canonical-database-bootstrap…spec` PASS
- `npx jest` auth/password suites(`servicePasswordLoginSelection` · `orphanCredentialLoginContract` · `representativeEntryLoginContract` · `refreshTokenFamilyContract` · `AdminUserController.passwordContract` · `UserManagementController.passwordContract` · `MembershipConsoleController.servicePassword` · `password-policy`) → **152 pass** · `modules/auth` + `membership-read-guard` 36 pass · `rbac-account-baseline…closure` · `auth-core-dead-lifecycle…closure` · `admin-service-operator-registration` 36 pass
- `npx tsc --noEmit -p tsconfig.json` → EXIT 0 · `pnpm build` → EXIT 0 (`dist/main.js` · `dist/migrate.js`)
- `node scripts/lint-ratchet.mjs` → `46 errors (baseline 46)`

## 8. CI · Migration Job · Deploy

| 항목 | 결과 |
|---|---|
| CI Pipeline (`ae2e7fe32`) | success (run 35224269502) |
| CodeQL | success |
| Deploy API Server (Cloud Run) | success (run 35224269933) — Build API packages · tsup · Docker · **Run database migrations** · Deploy · Verify deployment 전부 success |
| Migration Job 로그 (`o4o-api-migrations-pk4jz`) | `CLASSIFICATION = LEGACY_ESTABLISHED` → `EXPECTED/LIVE = 8b5be7bd… (5722)` 일치 → pending 1 → `PrepareGoogleIdentityLinkedAccountsAndUsersConstraints1789648511051 has been executed successfully` → `INCREMENTAL_EXECUTED = 1` → `LIVE = EXPECTED = 24c5941710706267d92cdbf52981aae3fdf5bb81a1c299faa5c03c1d10d25da6 (5725)` → **`POST_MIGRATION_SCHEMA_ASSERTION = PASS` · `MIGRATION_JOB = SUCCESS`** |
| Serving revision | `o4o-core-api-03691-45w` (100%) |

### 8-1. 운영 DB read-only 교차 확인 (적용 후 · Cloud SQL Auth Proxy · `BEGIN READ ONLY … ROLLBACK`)

| 항목 | 결과 |
|---|---|
| `linked_accounts` constraints | `FK_linked_accounts_user` FOREIGN KEY("userId") REFERENCES users(id) ON DELETE CASCADE · PK |
| `linked_accounts` indexes | `UQ_linked_accounts_provider_providerId` · `UQ_linked_accounts_google_user` 추가 · 기존 `IDX_…provider` · `IDX_…user` 유지 |
| `users` | `password` is_nullable **YES** · `name` is_nullable **YES** · default **없음** · `email` NO(불변) |
| `typeorm_migrations` 최신 | `PrepareGoogleIdentityLinkedAccountsAndUsersConstraints1789648511051` |
| 값 불변 | users 58 · `password IS NULL` 0 · `password=''` 0 · `name IS NULL` 0 · `linked_accounts` 0 · `linking_sessions` 부재 |

## 9. Production auth regression (§6-C · read-only · 계정 생성 0)

smoke 계정 = `docs/local/TEST-ACCOUNTS.local.md`(git 미추적) · 비밀번호 미기록. 요청은 status code 만 기록.

| # | 시나리오 | 결과 | 판정 |
|---|---|---|---|
| 1 | `POST /auth/login` L1(serviceKey 없음) `sohae2100` | 401 `INVALID_CREDENTIALS` → 이후 403 `ACCOUNT_LOCKED`(13:44:30Z 까지) | **BLOCKED_CREDENTIALS** — 동일 계정이 본 WO 배포(13:06Z) **이전인 10:14Z 에 이미 401+lock** ([CHECK 7887ea686 §4-1-a](CHECK-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1.md)). 로컬 기록 L1 값이 운영과 불일치(추측·대입 금지 규칙에 따라 중단) |
| 7 | `POST /auth/login` serviceKey=neture `renariver21`(platform:super_admin) | 401 `INVALID_CREDENTIALS` | 동일 — 기록값 stale. 코드 경로는 user 조회(`linkedAccounts` relation JOIN · 변경 entity) → platform admin membership bypass → `service_credentials` dual-read → bcrypt 비교까지 정상 도달(500 아님) |
| 9 | serviceKey=pharmacy-hub | 500 1회 → 재시도 401 | 500 = smoke 가 보낸 Origin `pharmacy-hub.neture.co.kr` 의 **CORS 거부**(로그 `Not allowed by CORS`) — 회귀 아님 |
| 10 | 잘못된 password | 401 → 403 LOCKED | lockout 동작 정상 |
| 11 | `POST /auth/forgot-password`(미존재 email · 메일 부작용 0) | **200** | PASS (password reset route 생존) |
| 12 | `POST /auth/check-email` | **200** | PASS (register 선행 route 생존) |
| 2·3·4·5·6·8·13 | `/me` · refresh · handoff · role guard · logout · admin API | 401/411 | 세션 없음(1·7 실패의 결과) → **미실측** |
| register | 실제 계정 생성 | — | production 데이터 생성이므로 **실행하지 않음** |

운영 로그(Cloud Logging, 13:06Z~): 500 은 위 CORS 1건뿐 · Login error 는 전부 `Invalid credentials` / `Account is temporarily locked`(smoke 시도) · entity/schema 기인 오류 0.
`account_activities`(count-only): 24h `login_email` success 113 · 마지막 성공 **06:27Z**(배포 전) · 배포 후 성공 0 · 실패 83(대부분 smoke). → 자연 트래픽 근거 아직 없음(야간).

**판정:** 기존 password login 계약을 깨는 근거 0(schema · 값 · 코드 경로 · 오류 로그) / 200 로그인 **실측 미완**. WO §6-C 의 "기존 사용자 로그인 실패 = WO 실패" 판정은 **사용자(계정 소유자) 1회 실로그인** 또는 갱신된 smoke 계정으로 닫는다. smoke 계정 L1 값 갱신은 계정 소유자 몫(로컬 파일 §1 규칙).

## 10. Google Client Configuration Checklist (WO-2D 입력 · 이번 WO 실행 0)

| 구분 | 항목 | 비고 |
|---|---|---|
| Web client ID | `neture.co.kr` 계열(neture · admin · pharmacy-hub · glucoseview 등 subdomain 별 authorized JS origin) | GIS 는 origin 단위 등록 |
| Web client ID | `kpa-society.co.kr` 계열(society · branch) | |
| Web client ID | `k-cosmetics.site` | |
| Admin client | `admin.neture.co.kr` (별도 client 또는 Web client 의 origin 추가 — WO-2D 결정) | |
| Mobile client | Android(package + SHA-1/256) · iOS(bundle id) | Expo native sign-in |
| 서버 allowlist | `GOOGLE_ALLOWED_CLIENT_IDS`(가칭) — verified `aud ∈ allowlist` · 클라이언트 전달 aud 불신 | config/env 구조는 WO-2B 골격에서 확정 |
| 발급 주체 | Google Cloud Console(`netureyoutube` 프로젝트 여부 확인) — 사용자 승인 · 외부 설정 | Client Secret 불필요(ID token 검증은 public key) |
| consent screen · production domain 승인 | 사용자 | |

## 11. 미생성 · 불변 확인

- `linking_sessions`: 생성 0 (격리 DB · 운영 모두 부재 확인)
- production 개인정보 · credential 값 update: **0** (migration = DDL 만 · 가드 SELECT count 만)
- `users.email` 제약 · `service_credentials` · `refresh_tokens` · `users.provider/provider_id` · `linked_accounts` 컬럼: 불변

## 12. 남은 REVIEW / 후속

| # | 내용 | 배치 |
|---|---|---|
| R1 | pnpm store modified 다수(`pnpm store status`) — 환경 정비 필요 시 `pnpm install --force`(범위 밖) | 환경 |
| R2 | `IDX_linked_accounts_provider`(non-unique) 는 `UQ_…provider_providerId` 와 중복 — Phase 5 정리 후보 | P5 |
| R3 | `users.name` NULL 이 가능해졌으므로 name 을 표시에 직접 쓰는 화면은 displayName 파생 사용 여부 점검(WO-2D 신규 가입 시점) | WO-2D |
| R4 | Google client ID 발급 · allowlist env 구조 | WO-2B/2D |
| R5 | 타 세션 약관 동의 WO 와 `auth-register.controller` 동시 변경 — WO-2D 착수 시 최신 main 기준 재조사 | WO-2D |

**다음:** WO-2B Automatic Email Merge Removal (dead 병합 2곳 제거 · `mergeAccounts` 은퇴 · `googleIdentityService` 골격 · aud allowlist). 본 WO `COMPLETE` 판정 후 착수.

**문서 정합:** 해당 없음 (기준 문서 수정 0 · drift 신규 발견 0 — F10/F11 정정은 WO-2H 예정대로).

---

*작성: 2026-09-17 · commit `ae2e7fe32`(코드) · CHECK 커밋 별도*
