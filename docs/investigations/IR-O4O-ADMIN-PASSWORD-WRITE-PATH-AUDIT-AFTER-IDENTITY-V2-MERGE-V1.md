# IR-O4O-ADMIN-PASSWORD-WRITE-PATH-AUDIT-AFTER-IDENTITY-V2-MERGE-V1

> **성격:** read-only 감사 IR. **코드 0 · migration 0 · DB write 0 · 배포 0 · 비밀번호 변경 0 · role 변경 0**
> **작성일:** 2026-08-09
> **기준 commit:** `12973622f` (통합 병합 `6c9ee8388` 반영 후 최신 main)
> **비밀번호·해시·토큰 미출력 · `docs/local` 내용 미출력**

---

## 1. 조사 요약

비밀번호를 **쓰는** 경로 **15개**를 확인했다. HTTP 경로 8 + 운영 스크립트 5 + 내부 자동 2.

| 분류 | 건수 | 비고 |
|------|:---:|------|
| **L1 only** (`users.password`) | **7** | 그중 관리자 재설정 2 · 스크립트 5 |
| **L2 only** (`service_credentials`) | **4** | 전부 serviceKey 스코프 확인됨 |
| **L1 + L2** | **0** | 두 계층을 동시에 쓰는 경로 없음 ✅ |
| **create only** | **3** | 신규 계정·소셜·게스트 |
| **unclear** | **0** | |
| **risky** | **2** | 스크립트 2건 (§5) |

**핵심 판정: L1/L2 경계는 지켜지고 있다.** 한 경로가 두 계층을 동시에 쓰거나, L2 경로가 다른 서비스로 새는 사례는 **없다.**
남은 문제는 **경계 위반이 아니라 "안내 부재"와 "스크립트의 전역성"** 이다.

---

## 2. 전체 write 경로 목록

### 2-1. L1 only — `users.password`

| # | 경로 | 위치 | 권한 | serviceKey | 안내 | 위험도 |
|:-:|------|------|------|:---------:|:----:|:-----:|
| 1 | `PATCH /admin/platform-accounts/:id/password` | `routes/admin/platform-accounts.routes.ts:116` | `platform:super_admin` + super_admin 대상 보호 | 불요 | ✅ `unaffectedServiceKeys` + notice | 낮음 |
| 2 | `PUT /admin/users/:id` (password 동반) | `controllers/admin/AdminUserController.ts:381` | `platform:super_admin` | 불요 | ✅ `passwordScope` + notice | 낮음 |
| 3 | `PUT /users/password` (V1 fallback) | `modules/user/controllers/user.controller.ts:227` | 본인 | **없을 때만** | — (본인 변경이라 불요) | 낮음 |
| 4 | `POST /auth/reset-password` (V1 fallback) | `services/passwordResetService.ts:159` | 토큰 | **없을 때만** | — | 낮음 |
| 5~9 | 운영 스크립트 5종 | `scripts/*` | CLI(서버 접근) | **미지원** | ❌ 없음 | **§5 참조** |

> 1·2 의 안내는 `WO-...-SCOPE-CLARIFY-V1` 에서 추가됐고 API·UI smoke 로 실증됐다.

### 2-2. L2 only — `service_credentials.password_hash`

| # | 경로 | 위치 | 권한 | 스코프 판정 |
|:-:|------|------|------|------------|
| 10 | **운영자 회원 비밀번호 변경**(신규) | `controllers/operator/MembershipConsoleController.ts:189` | 서비스 운영 계층 | **§3 상세** |
| 11 | `PUT /users/password` (serviceKey 있음) | `user.controller.ts:207` | 본인 + 해당 서비스 membership | `serviceKey` 필수, 멤버십 검증 후 upsert |
| 12 | `POST /auth/reset-password` (token.serviceKey 있음) | `passwordResetService.ts:147` | 재설정 토큰 | 토큰의 serviceKey 와 요청 serviceKey 불일치 시 거부(`:133`) |
| 13 | 기존 계정의 **타 서비스 가입** | `auth-register.controller.ts:206` | 본인 | 가입 대상 serviceKey 전용 upsert. `users.password` 무변경(`:185` 주석 명시) |

### 2-3. create only

| # | 경로 | 위치 | 내용 |
|:-:|------|------|------|
| 14 | 신규 가입 | `auth-register.controller.ts:401` + `:513` | `users.password` 와 **같은 해시**로 첫 credential 생성 (시작점만 동일) |
| 15 | 소셜 로그인 계정 생성 | `auth-login.service.ts:459` | 랜덤 비밀번호(로그인 불가용) |
| — | 사용자 생성 | `modules/auth/services/user.service.ts:61` · `AdminUserController.ts:277` | 신규 계정이라 credential 부재 |
| — | 계정 연결 | `account-linking.service.ts:185` | `!user.password` 일 때만 **최초 설정**. 재설정 아님 |

### 2-4. read only (참고)

`auth-login.service.ts:194-216` — credential 조회 후 `targetHash = credentialHash ?? user.password`.
`admin-password-reset-scope.service.ts:62` — SELECT 전용(안내 생성).

---

## 3. 중점 감사 — 운영자 서비스별 비밀번호 변경 (신규, 통합 병합분)

`MembershipConsoleController.changeMemberPassword` 계열. **가장 위험도가 높은 신규 경로**라 상세 확인했다.

| 단계 | 구현 | 판정 |
|------|------|:----:|
| 후보 산출 | `candidates = 대상 membership ∩ 호출자 관리범위` (platform admin 은 대상 membership 전체) `:124-126` | ✅ 교집합 |
| 후보 0 | 404 `NO_MANAGEABLE_SERVICE` | ✅ |
| 대상 확정 | 명시 `serviceKey` 우선. 미지정 시 **후보 1개일 때만** 자동 확정, **platform admin 은 항상 명시 요구** `:150-153` | ✅ 전역·일괄 변경 차단 |
| 범위 밖 | `SERVICE_SCOPE_FORBIDDEN`(403) / `SERVICE_NOT_MEMBER`(404) 구분 `:144-147` | ✅ 원인 구분 |
| 미지정 | 400 `SERVICE_KEY_REQUIRED` | ✅ |
| 권한 판정 | **선택된 serviceKey 안에서만** tier 계산 `:168-177`. 타 서비스 role·전체 최고 role 미사용 | ✅ |
| 상하 관계 | `caller <= target` → 403 `INSUFFICIENT_OPERATOR_TIER` | ✅ |
| **플랫폼 계정** | target 이 `platform:super_admin`/`super_admin` 이면 tier=`platform`(최상위) → **caller 가 무엇이든 `<=` 성립 → 항상 403** | ✅ **플랫폼 계정 비밀번호 계약 무변경** |
| write | `service_credentials` upsert **단독** `:189-195` | ✅ `users.password`·타 서비스 credential 무변경 |
| 감사 로그 | `logger.info` + targetUserId/serviceKey/tier | ✅ |

**불변조건 4종 전부 충족**: 선택 serviceKey 내 판정 · 후보 교집합 · `users.password` write 0 · 타 서비스 credential write 0.

---

## 4. self-service / forgot-password / 계정 생성

| 질문 | 답 |
|------|----|
| 본인 변경은 L1인가 L2인가 | **serviceKey 유무로 분기.** 있으면 L2(멤버십 검증 후), 없으면 L1 fallback |
| 현재 비밀번호 검증 대상 | `credential?.passwordHash ?? user.password` — **로그인과 동일 규칙** ✅ 일관 |
| forgot-password 는 어느 credential 을 바꾸는가 | 토큰에 실린 `serviceKey` 의 credential. 토큰 serviceKey ↔ 요청 serviceKey 불일치 시 거부 ✅ |
| lockout 처리 | 두 경로 모두 `loginAttempts`/`lockedUntil` 을 함께 reset — user-global 속성이라 의도적 ✅ |
| 신규 가입 | `users.password` 와 **같은 해시**로 credential 생성 → 시작점만 동일, 이후 독립 ✅ |
| 기존 계정의 타 서비스 가입 | `servicePassword ?? password` 로 **그 서비스 credential 만** upsert, `users.password` 무변경 ✅ |

프런트 배선(5개 서비스 `/forgot-password`, `PUT /users/password`)이 `serviceKey` 를 전달하는 것은
선행 조사(`CHECK-...-IDENTITY-V2-...-DRIFT-AUDIT-V1 §2-3`)에서 확인됐고, 본 IR 에서 반증할 근거를 찾지 못했다.

---

## 5. ⚠️ 위험 경로 — 운영 스크립트 5종

파일명이 아니라 **실제 동작 기준**으로 판정했다.

| 스크립트 | 동작 | serviceKey | 판정 |
|----------|------|:----------:|------|
| `reset-admin-password.ts` | 특정 email(기본 `admin@neture.co.kr`) `users.password` UPDATE | ❌ 미지원 | **유지** — 플랫폼 계정 복구용. L1 이 정확한 대상 |
| `create-admin-user.ts` | 신규 super admin 생성 | ❌ | **유지** — create only, credential 부재 |
| `create-manager-user.ts` | 신규 manager 생성 | ❌ | **유지** — 동일 |
| `diagnose-admin-login.ts` | 진단 + `--fix` 시 `users.password` 복구 | ❌ | **유지(조건부)** — 플랫폼 계정 진단용. `--fix` 가 L1 만 바꾼다는 점 미고지 |
| **`list-and-reset-all-users.ts`** | **전체 사용자** `users.password` 일괄 UPDATE | ❌ | **🔴 risky** — §5-1 |

### 5-1. `list-and-reset-all-users.ts` 가 위험한 이유

```text
대상 : 전체 사용자 (필터 없음)
동작 : users.password 를 하나의 값으로 일괄 UPDATE
결과 : credential 보유 사용자(실측 40건 중 18건이 L1 과 상이)는
       서비스 로그인이 **바뀌지 않는다** → "전부 초기화했다"는 오인 발생
       동시에 L1 은 전 계정이 같은 값이 되어 보안 위험
```

**즉시 수정 대상은 아니다**(CLI 이며 자동 실행 경로 없음). 다만 **존재 자체가 사고 가능성**이고,
Identity V2 이후로는 "전체 초기화"라는 개념이 성립하지 않는다. → 후속 WO 후보 §7-4.

### 5-2. `diagnose-admin-login.ts --fix`

플랫폼 계정 진단이 목적이라 L1 수정이 맞다. 다만 credential 을 가진 계정에 쓰면
**서비스 로그인은 안 고쳐지는데 "복구됐다"고 보고**한다. 안내 문구 보완 후보.

---

## 6. 중복 구현 여부

| 항목 | 결과 |
|------|------|
| 관리자 L1 재설정 | **2경로**(`platform-accounts` / `admin/users`) — 둘 다 `platform:super_admin` 전용이고 **둘 다 안내 보유**. 화면이 달라(관리자 계정 설정 / 운영자 관리) 중복이 아니라 **표면 분리**로 판단 |
| L2 변경 | 본인(`user.controller`) · 운영자(`MembershipConsole`) · 재설정(`passwordResetService`) · 가입(`auth-register`) — **주체가 전부 다름**. 중복 아님 |
| 안내 누락 경로 | **HTTP 경로에는 없음.** 스크립트에만 없음(§5) |

**동일 기능이 안내 없이 남아 있는 HTTP 경로는 발견되지 않았다.**

---

## 7. 후속 WO 후보

| # | 후보 | 근거 | 등급 |
|:-:|------|------|:---:|
| 1 | ~~`...-SCOPE-NOTICE-COMPLETE-V1`~~ | **불요** — HTTP 경로 안내 누락 0 (§6) | — |
| 2 | ~~`...-PERMISSION-GUARD-V1`~~ | **불요** — L2 권한 가드가 이미 교집합·tier·platform 차단 완비 (§3) | — |
| 3 | ~~`...-FORGOT-PASSWORD-L1-L2-SCOPE-ALIGN-V1`~~ | **불요** — 토큰 serviceKey 기준 분기·불일치 거부 정상 (§4) | — |
| **4** | **`WO-O4O-PASSWORD-RESET-SCRIPT-IDENTITY-V2-ALIGNMENT-V1`** | `list-and-reset-all-users` 전역 초기화 위험 + `diagnose --fix` 오인 보고 (§5) | **P2** |
| 5 | `WO-O4O-PASSWORD-WRITE-PATH-DEDUP-V1` | **보류** — 실중복이 아니라 표면 분리로 판단(§6). 필요 시 IA 관점 재검토 | P3 |

> 후보 1~3 은 WO 예시로 제시됐으나 **조사 결과 대상이 없어 발주하지 않는 것을 권한다.**
> 실제 남은 것은 4번 하나다.

---

## 8. 즉시 수정 필요 여부

**없음.** HTTP 경로의 L1/L2 경계·권한·안내가 모두 정합하다.
§5 의 스크립트는 CLI 수동 실행이며 자동 호출 경로가 없어 즉시 위험이 아니다.

발견한 단순 개선점(스크립트 안내 문구 등)도 **본 IR 에서 수정하지 않고** §7-4 로 분리했다.

---

## 9. 변경 없음 선언

```
코드 변경 0 · migration 0 · DB write 0 · 배포 0
비밀번호 변경 0 · role 변경 0 · 테스트 로그인 0
비밀번호·해시·토큰 출력 0 · docs/local 내용 출력 0
git 변경 = 본 IR 문서 1건
```

조사 방법: 최신 main 정적 정독(Read/Grep). 프로덕션 API·DB 호출 없음.
`docs/local/TEST-ACCOUNTS.local.md` 는 **존재만 확인**했고 내용을 열지 않았다.

---

*판정: L1/L2 경계 준수 · L1+L2 동시 write 0 · HTTP 경로 안내 누락 0 · 위험은 운영 스크립트 2건(후속 1건으로 분리)*
