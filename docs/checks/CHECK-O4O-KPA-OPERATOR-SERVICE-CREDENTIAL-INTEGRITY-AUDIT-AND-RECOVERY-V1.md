# CHECK-O4O-KPA-OPERATOR-SERVICE-CREDENTIAL-INTEGRITY-AUDIT-AND-RECOVERY-V1

- **WO**: `WO-O4O-KPA-OPERATOR-SERVICE-CREDENTIAL-INTEGRITY-AUDIT-AND-RECOVERY-V1`
- **작성일**: 2026-08-21
- **판정**: **A. EXPECTED_DIFFERENT_PASSWORD (+ I. TEST_ACCOUNT_DATA_ONLY)** — 코드 결함 없음 · 데이터 drift 없음 · production write 0
- **소스 변경**: 0 (테스트 2개 + 본 CHECK 만 추가)

> 보안 규칙(§17): 본 문서에는 평문 비밀번호 · credential hash 원문 · token · session cookie 를 기록하지 않는다.
> hash 는 `존재 여부 / algorithm prefix / updated_at` 만 남긴다.

---

## 1. 결론 요약

KPA 운영자 계정의 `serviceKey='kpa-society'` 401 은 **결함이 아니라 정상 동작**이다.

2026-08-21 01:25~01:27 사이에 **kpa-society 전용 비밀번호 재설정이 정상 경로로 1회 수행**되었고,
Identity V2 의 서비스별 credential 격리 설계대로 `service_credentials(kpa-society)` **한 행만** 갱신되었다.
따라서 이후 "다른 서비스에서 쓰던 비밀번호"로 kpa-society 에 로그인하면 401 `INVALID_CREDENTIALS` 가 나는 것이 계약대로의 결과다.

- 누락된 credential 행 없음 / hash 손상 없음 / 잘못된 key write·read 없음 / 타 서비스 오염 없음
- 필요한 조치는 **테스트 계정 문서 정리**뿐이며, 실제로 현재 비밀번호로 kpa-society 200 로그인을 재현했다.

---

## 2. §4 로그인 재현 매트릭스 (production `api.neture.co.kr`, 각 2회)

계정: `sohae2100@gmail.com` (KPA/KCos/GP/Neture/PH 운영자 공용 테스트 계정)

### 2-1. 기존 문서 비밀번호(타 서비스용)로 시도

| serviceKey | 1회차 | 2회차 | membership | credential | 판정 |
|---|---|---|---|---|---|
| (없음) | 401 INVALID_CREDENTIALS | 401 INVALID_CREDENTIALS | – | – (users.password 판정) | users.password 는 이 값이 아님 |
| `kpa-society` | 401 INVALID_CREDENTIALS | 401 INVALID_CREDENTIALS | active | 존재 | **재설정된 별도 비밀번호** |
| `kpa` | 401 SERVICE_NOT_MEMBER | 401 SERVICE_NOT_MEMBER | 없음 | 조회 자체 없음 | 축 정상(§8) |
| `k-cosmetics` | 200 | 200 | active | 존재 | 정상 |
| `cosmetics` | 401 SERVICE_NOT_MEMBER | 401 SERVICE_NOT_MEMBER | 없음 | 조회 자체 없음 | 축 정상(§8) |
| `glycopharm` | 200 | 200 | active | 존재 | 정상 |
| `neture` | 200 | 200 | active | 존재 | 정상 |
| `pharmacy-hub` | 401 INVALID_CREDENTIALS | 401 INVALID_CREDENTIALS | active | 존재 | 별도 비밀번호(문서에 이미 별도 기재) |

- 2회 반복 결과 동일 → 일시적 인증 오류 아님.
- `ACCOUNT_LOCKED` 는 한 번도 관측되지 않음. `users.loginAttempts=0`, `lockedUntil=NULL`.

### 2-2. kpa-society 현재 비밀번호로 재현

| serviceKey | 결과 |
|---|---|
| `pharmacy-hub` | **200** |
| `kpa-society` | **200** |

→ kpa-society credential 은 **정상 동작하며 로그인 가능**하다. 문서만 낡아 있었다.

---

## 3. §5 로그인 경로 census (미조사 0)

`POST /api/v1/auth/login`

| # | 단계 | 위치 | 사실 |
|---|---|---|---|
| 1 | route → controller | `modules/auth/controllers/auth-login.controller.ts` | body 의 `serviceKey` 를 **가공 없이** service 로 전달 |
| 2 | serviceKey canonicalization | 없음 | 로그인 경로에는 `kpa→kpa-society` 정규화가 **없다**. Signage 라우트(`@o4o/security-core`)와 다르다 |
| 3 | user 조회 | `services/auth/auth-login.service.ts` | email 로 `users` 조회 |
| 4 | platform admin bypass | 동 파일 | `['platform:super_admin','super_admin']` 보유 시 membership 검사 skip. 본 계정은 `platform:super_admin` **is_active=false** → bypass 없음 |
| 5 | membership 조회 | `ServiceMembership { userId, serviceKey }` | 없으면 `SERVICE_NOT_MEMBER` (credential 조회 **이전**) |
| 6 | credential 조회 | `ServiceCredential { userId, serviceKey }` | 요청 문자열 그대로 사용 |
| 7 | fallback | `targetHash = credentialHash ?? user.password` | credential 없을 때만 `users.password` (Phase 1 "G-B No Backfill") |
| 8 | 비교 | `comparePassword` | 실패 → `handleFailedLogin` → `INVALID_CREDENTIALS` |
| 9 | lockout | `handleFailedLogin` | 5회 이상 실패 시 `lockedUntil = now+30m`, 코드 `ACCOUNT_LOCKED` (별도 코드) |
| 10 | 이후 검사 | 동 파일 | `AccountInactive` → `EmailNotVerified` 순 |

→ **401 발생 지점 = 8번 comparePassword 실패**. 조회 key·fallback·membership 어느 단계도 결함 아님.

---

## 4. §6 production read-only census (hash 원문 미기록)

### 4-1. `service_credentials` (대상 계정)

| service_key | hash 존재 | algorithm | updated_at |
|---|---|---|---|
| glycopharm | true | `$2a$` | 2026-05-28 11:00:34 |
| k-cosmetics | true | `$2a$` | 2026-05-30 10:24:24 |
| **kpa-society** | true | `$2a$` | **2026-08-21 01:26:53.945** |
| neture | true | `$2a$` | 2026-05-24 06:10:24 |
| pharmacy-hub | true | `$2a$` | 2026-08-10 04:16:43 |

- `kpa` / `cosmetics` key 의 credential 행은 **존재하지 않는다** (축 오염 0).

### 4-2. `service_memberships` (대상 계정)

`glycopharm` / `k-cosmetics` / `kpa-branch` / `kpa-society` / `neture` / `pharmacy-hub` — **전부 `active`**.

### 4-3. `users`

`status=active` · `password` 존재 · `loginAttempts=0` · `lockedUntil=NULL` · `updatedAt=2026-08-21 02:26:36`.

### 4-4. `role_assignments` (축 확인)

`kpa:admin` · `kpa:operator` · `kpa:store_owner` · `kpa-branch:operator` · `cosmetics:admin/operator` · `glycopharm:*` · `neture:*` · `pharmacy-hub:*` = 전부 active,
`platform:super_admin` = **is_active=false**.

→ role scope key(`kpa`, `cosmetics`) ≠ membership/credential key(`kpa-society`, `k-cosmetics`) 라는 §8 축이 데이터로도 확인된다.

### 4-5. 결정적 증거 — `password_reset_tokens`

| service_key | createdAt | usedAt |
|---|---|---|
| **kpa-society** | **2026-08-21 01:25:50.256** | **2026-08-21 01:26:53.959** |
| neture | 2026-05-24 06:09:43 | 2026-05-24 06:10:24 |
| kpa-society | 2026-05-24 05:59:31 | 2026-05-24 06:00:21 |
| glycopharm | 2026-05-22 02:57:53 | (미사용) |
| kpa-society | 2026-05-22 02:57:50 | (미사용) |

`service_credentials(kpa-society).updated_at = 01:26:53.945` 와 토큰 `usedAt = 01:26:53.959` 가 **동일 시점**.
→ 정상 재설정 경로가 그 시각에 kpa-society credential 만 write 했음이 확정된다(추정 아님).

---

## 5. §7 · §8 정책·축 재확인 (코드 SSOT)

- 서비스별 비밀번호는 **정책**이다: `service_credentials(serviceKey)` 우선, 없으면 `users.password` fallback.
  → `KPA 비밀번호 != KCos 비밀번호` 자체는 결함이 아니다.
- KPA 축: **role scope `kpa`** / **membership `kpa-society`** / **credential `kpa-society`**.
  새 mapping 을 만들지 않았고, canonicalization 도 추가하지 않았다.

---

## 6. §9 credential write 경로 전수 census (미조사 0)

| # | 경로 | 파일 | serviceKey 출처 | service_credentials | users.password | 기존 보존 |
|---|---|---|---|---|---|---|
| 1 | 자가 비밀번호 재설정(V2) | `services/passwordResetService.ts` L137-163 | **token.serviceKey** | upsert `(userId, serviceKey)` | **write 안 함** | 해당 key 만 overwrite |
| 2 | 자가 비밀번호 재설정(V1, serviceKey 없음) | 동 파일 else 분기 | – | write 안 함 | write | legacy 유지 |
| 3 | 회원가입 / 서비스 가입 | `modules/auth/controllers/auth-register.controller.ts` L224, L532 | 가입 요청 serviceKey | upsert `['userId','serviceKey']` | 최초 가입 시만 | 타 서비스 불변 |
| 4 | 관리자 사용자 생성/서비스 지정 | `controllers/admin/AdminUserController.ts` L449, L535 | `targetServiceKey` | insert | – | 타 서비스 불변 |
| 5 | 본인 비밀번호 변경 | `modules/user/controllers/user.controller.ts` L190-209 | 요청 serviceKey | 검증(`credential?.passwordHash ?? user.password`) 후 upsert | write 안 함 | 해당 key 만 |
| 6 | 관리자 비밀번호 재설정 scope 안내 | `services/auth/admin-password-reset-scope.service.ts` | read-only | – | (admin reset 은 L1 `users.password`) | 별도 credential 보유 서비스는 영향 없음을 사전 고지 |

→ 모든 write 가 `(userId, serviceKey)` 복합키에 묶여 있다. **전역 덮어쓰기 경로 없음.**

---

## 7. §10 타 서비스와의 비교

KCos / GP / Neture 는 5월에 생성된 credential 이 그대로 유지되어 문서상의 비밀번호와 일치한다.
kpa-society 만 오늘 재설정되어 값이 달라졌다. **구조 차이가 아니라 시점 차이**이며, 실제 결함은 없다.

---

## 8. §11 원인 분류

- ✅ **A. EXPECTED_DIFFERENT_PASSWORD** — 정상 재설정으로 생긴 서비스별 별도 비밀번호
- ✅ **I. TEST_ACCOUNT_DATA_ONLY** — 테스트 계정 문서만 낡음
- ❌ B/C/D/E/F/G/H — credential 누락·잘못된 key write/read·hash 손상·onboarding/reset 누락·drift 모두 **해당 없음**

---

## 9. §12 · §13 복구 판단

§12 A 항에 따라 **코드/데이터 수정 없음**.

- production credential write: **0건**
- `users.password` 덮어쓰기: 없음 / 타 서비스 credential 수정: 없음 / 평문 저장·hash 복사: 없음
- 임의 새 비밀번호 생성: 하지 않음 (§13). 현재 비밀번호는 이미 로컬 테스트 계정 문서에 존재하던 값으로 확인됨.
- 조치: `docs/local/TEST-ACCOUNTS.local.md` 의 KPA-Society 2행을 현재 값으로 갱신 (gitignore 대상 — 커밋 없음, 값은 본 CHECK 에 기록하지 않음).

---

## 10. §14 비밀번호 재설정 API 계약 검증 (KPA 기준)

| 주체 | 경로 | kpa-society credential write | users.password write | 타 서비스 영향 |
|---|---|---|---|---|
| 본인(재설정 링크) | `PasswordResetService.resetPassword` | **O** (token.serviceKey 기준) | X | 없음 |
| 본인(변경) | `user.controller` change-password | **O** | X | 없음 |
| 서비스 운영자 → 하위 사용자 | 서비스 scope reset | 해당 serviceKey 만 | X | 없음 |
| 플랫폼 관리자 | admin reset | X | **O (L1)** | credential 보유 서비스는 불변 → `admin-password-reset-scope.service` 가 사전 고지 |

→ KPA 재설정이 `users.password` 로 잘못 쓰이는 경로는 없다.

---

## 11. §15 자동 테스트

신규 2개 스펙 (기존 `servicePasswordLoginSelection.test.ts` 와 중복 아님 — 이쪽은 **실제 서비스 객체**를 구동).

`apps/api-server/src/services/auth/__tests__/kpaServiceCredentialLoginContract.test.ts` (8 PASS)
1. kpa-society — 해당 서비스 credential 비밀번호로 로그인 성공
2. kpa-society — 다른 비밀번호(users.password 포함)는 401 `INVALID_CREDENTIALS`
3. credential 조회 key 는 요청 serviceKey 문자열 그대로 (canonicalization 없음)
4. `kpa` — membership 축과 달라 `SERVICE_NOT_MEMBER`, credential 조회 자체가 없음
5. KPA 비밀번호가 달라도 k-cosmetics 는 자기 credential 로 정상 로그인
6. credential 없는 서비스는 `users.password` fallback
7. serviceKey 없는 로그인은 `users.password` 판정 (credential 조회 없음)
8. membership 없으면 credential 이 있어도 `SERVICE_NOT_MEMBER` 우선

`apps/api-server/src/services/auth/__tests__/kpaPasswordResetServiceScope.test.ts` (5 PASS)
1. kpa-society 토큰은 `service_credentials(kpa-society)` 만 upsert (평문 저장 아님 확인)
2. kpa-society 재설정은 `users.password` 를 덮어쓰지 않음 (lockout 만 user-global 해제)
3. kpa-society 재설정은 타 서비스 credential 을 write 하지 않음
4. serviceKey 없는 토큰은 `users.password` (V1 fallback)
5. 타 서비스 토큰 재사용 거부 · credential write 0

**실행 결과**: `src/services/auth/__tests__` 전체 — **4 suites / 28 tests PASS**.

---

## 12. §16 production 검증 · typecheck

- 코드 변경 0 → 재배포 없음. production 은 **read-only 조회 + 로그인 재현**만 수행.
- 재현 결과: kpa-society 200 (현재 비밀번호), KCos/GP/Neture 200 (기존 비밀번호) → 타 서비스 영향 0.
- typecheck: `apps/api-server/tsconfig.json` 은 `**/__tests__/**` 를 **exclude** 하므로 본 WO 추가분은 빌드 타입 경계 밖.
  소스 변경 0 이라 타입 영향도 0. (worktree 에서 `tsc --noEmit` 을 돌리면 workspace 패키지 dist 미빌드로 인한 `TS2307` 249건 등 환경 오류가 나며, 오류 목록에 본 WO 신규 2개 파일은 없다.)

---

## 13. 발견된 부채 (본 WO 범위 밖 — 별도 WO 후보)

1. **membership 없는 `service_credentials` 28행** — glycopharm 6 / kpa-society 7 / neture 6 / pharmacy-hub 7 / k-cosmetics 2.
   로그인은 membership 검사가 선행하므로 무해하나, 잔여 credential 정리 정책 필요.
2. **credential 변경에 감사 로그가 남지 않는다** — 01:26:53 write 에 대응하는 `action_logs` / `account_activities` 항목 없음.
   비밀번호 재설정은 보안 이벤트이므로 기록 대상 검토 필요.
3. **로그인 경로에 serviceKey canonicalization 이 없다** — `kpa` / `cosmetics` 로 로그인하면 `SERVICE_NOT_MEMBER`.
   현재 UI 는 항상 canonical key 를 보내므로 실사용 문제는 없으나, 다른 라우트(Signage 등)와 동작이 다르다는 점은 명시적 정책 확인이 필요하다.
4. **선행 WO 잔여 검증** — `CHECK-O4O-SIGNAGE-FORCED-CONTENT-DELETE-NOT-FOUND-NORMALIZATION-V1` 의 kpa-society smoke 는 본 계정 401 때문에 미측정으로 남겼다. 이제 로그인 가능하므로 재측정할 수 있다.

---

## 14. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§13).
`docs/local/TEST-ACCOUNTS.local.md` 는 gitignore 대상 로컬 문서로, KPA-Society 2행만 현재 값으로 갱신했다(커밋 없음).
