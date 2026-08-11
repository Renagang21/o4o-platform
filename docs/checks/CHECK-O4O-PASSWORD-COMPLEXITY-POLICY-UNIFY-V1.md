# CHECK-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1

- **WO**: 비밀번호 정책 통일 (8자 + 영문 + 숫자, 특수문자 선택)
- **판정**: PASS
- **일자**: 2026-08-11
- **선행 CHECK**: [CHECK-O4O-OPERATOR-MEMBER-PASSWORD-MIN-LENGTH-UNIFY-V1](CHECK-O4O-OPERATOR-MEMBER-PASSWORD-MIN-LENGTH-UNIFY-V1.md) — 그 문서 §6 잔여 1(복잡성 규칙 불일치)을 본 CHECK 로 닫는다.

---

## 1. 확정 정책

> 비밀번호는 **8자 이상**이며 **영문(A–Z / a–z) 1자 이상**과 **숫자 1자 이상**을 포함한다.
> **특수문자는 허용하되 필수가 아니다.** 새로 설정되는 모든 비밀번호에 동일하게 적용한다.

- "영문" 은 알파벳만을 뜻한다. 한글 등 다른 문자는 포함될 수 있으나 영문 1자 조건을 **대신 충족시키지 않는다**.
- 기존 비밀번호를 위한 **예외 · 유예 상태 · 강제변경 플래그 · 자동 판별 · migration 을 만들지 않았다.**
- **로그인 해시 검증 구조는 변경하지 않았다** (`credentialHash ?? user.password` 그대로).

## 2. 이전 상태 (문제)

| 경로 | 이전 | 성격 |
|---|---|---|
| 4서비스 회원가입 · 재설정 (프런트) | 대/소문자 · 숫자 · **특수문자 필수** | 확정 정책보다 과도 |
| 회원가입 DTO (`RegisterRequestDto`) | 8자 + 영문 + 숫자 + **특수문자 필수** | 동일 |
| 재설정 DTO (`PasswordResetDto`) | **최소 길이만** | 복잡성 검증 없음 |
| 본인 변경 (`PUT /users/password`) | **최소 길이만** | 복잡성 검증 없음 |
| 운영자 회원 변경 | **최소 길이만**(직전 WO 로 추가) | 복잡성 검증 없음 |
| 관리자 사용자 생성 (`users.routes` createUser) | **6자** | 정책 미달 |

즉 복잡성 규칙은 **프런트에만 존재**했고 백엔드에는 없었다. 최소 길이 때와 같은 우회 가능 구조다.

## 3. 변경

### 3-1. 백엔드 정본 — `apps/api-server/src/utils/password-policy.ts` (신규)

`PASSWORD_MIN_LENGTH` · `PASSWORD_POLICY_REGEX` · `PASSWORD_POLICY_MESSAGE(_EN)` ·
`isPasswordPolicyCompliant()` · `passwordPolicyBodyValidator(field)` (express-validator 공용 체인).

소비처 — 규칙을 복제하지 않고 전부 이 모듈을 참조한다.

| 파일 | 적용 |
|---|---|
| `modules/auth/dto/register.dto.ts` | `password` · `servicePassword` — 특수문자 필수 제거, 영문+숫자 유지 |
| `modules/auth/dto/password.dto.ts` | `PasswordResetDto.password` — 영문+숫자 검증 **추가** |
| `routes/users.routes.ts` | 본인 변경 `newPassword` · 사용자 생성 `password`(6자→정책) — 공용 체인 사용 |
| `controllers/operator/MembershipConsoleController.ts` | 최소 길이 가드 → 정책 전체. hash · credential write 이전 400 `WEAK_PASSWORD` |
| `controllers/admin/AdminUserController.ts` | `SERVICE_PASSWORD_MIN_LENGTH` 를 정본에서 파생, 초기 서비스 비밀번호도 정책 검사 |
| `routes/neture/controllers/neture.controller.ts` | 신규 계정 생성 비밀번호 8자 → 정책 |

### 3-2. 프런트 공용 — `packages/auth-utils/src/passwordPolicy.ts` (신규)

`checkPasswordPolicy()` · `PASSWORD_POLICY_RULES` · `PASSWORD_POLICY_HINT/MESSAGE` 를 `@o4o/auth-utils` 에서 export.
4개 서비스가 **이미 이 패키지에 의존**하므로 새 의존 관계는 생기지 않았다.

| 화면 | 변경 |
|---|---|
| 4서비스 `ResetPasswordPage` | 로컬 `PASSWORD_RULES`(대문자·소문자·숫자·특수문자) 삭제 → 공용 `checkPasswordPolicy` · `PASSWORD_POLICY_RULES` 사용 |
| GlycoPharm `RegisterFlowModal` · K-Cosmetics `RegisterPage` · KPA `RegisterModal` · Neture `RegisterModal` | `passwordChecks` 를 공용 검증에서 파생. 체크리스트·placeholder·오류 문구에서 '특수문자 필수' 제거. KPA 는 '영문 소문자' → '영문' |

### 3-3. 운영자 모달 2곳 — 로컬 규칙(의도적)

`packages/ui`(회원 상세) · `packages/operator-core-ui`(회원 목록) 는 `@o4o/auth-utils` 에 의존하지 않는다.
**새 의존 구조를 만들지 않는다**는 조건에 따라 동일 규칙을 각 파일에 로컬로 두고, 최종 강제는 백엔드가 하며 계약은 양쪽 테스트로 고정했다.

## 4. 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `src/utils/__tests__/password-policy.test.ts` (신규) | **46 PASS** |
| `MembershipConsoleController.servicePassword.test.ts` | **22 PASS** (신규 2 추가) |
| `apps/api-server` operator · admin 테스트 전체 | **121 PASS / 7 suites** |
| `apps/api-server` `src/modules/auth` · `src/routes` 테스트 | 45 PASS / 5 suites |
| `packages/auth-utils` `passwordPolicy.test.ts` (신규) | **13 PASS** |
| `packages/ui` `UserDetailPasswordModal.test.tsx` | **9 PASS** (신규 2 추가) |
| `packages/auth-react` 회귀 | 36 PASS / 2 suites |
| `apps/api-server` `tsc --noEmit` | PASS |
| `packages/ui` · `packages/operator-core-ui` · `packages/auth-utils` typecheck/build | PASS |
| 4개 서비스 typecheck | PASS |
| 4개 서비스 build | PASS |

### 4-1. 공유 케이스 테이블 (계약 고정)

프런트·백엔드가 하나의 파일을 참조하지 않는 대신, **동일한 케이스 목록**을 양쪽 테스트에 둔다.
한쪽만 수정하면 다른 쪽 테스트가 남아 드러난다.

| 입력 | 판정 |
|---|---|
| 영문만 `abcdefghij` | 거절 |
| 숫자만 `1234567890` | 거절 |
| 영문+숫자 `abcd1234` | 허용 |
| 영문+숫자+특수문자 `abcd1234!` | 허용 |
| 8자 미만 `abc1234` | 거절 |
| 정확히 8자 `abcdefg1` | 허용 (경계값) |
| 특수문자만 `!!!!!!!!` | 거절 |
| 한글+숫자 (영문 없음) | 거절 |
| 한글+영문+숫자 | 허용 |
| 빈 문자열 | 거절 |

이 테이블을 회원가입 DTO · 재설정 DTO · 본인 변경 validator · 정본 함수 · 프런트 공용 검증 **5곳에 각각 적용**했다.
운영자 경로는 컨트롤러 단에서 영문만/숫자만 거절 + 특수문자 없는 영문+숫자 통과를 별도 고정했다.

## 5. Frozen Baseline 관련

`modules/auth/routes/auth.routes.ts` 는 Core Freeze(F10, `WO-O4O-CORE-FREEZE-V1`) 대상이며 **수정하지 않았다**.
변경한 것은 그 라우트가 사용하는 DTO 의 **검증 강도**이며, route · 컨트롤러 · 응답 계약 · 필드 구조는 그대로다.
본 WO 가 "관련 백엔드 DTO·컨트롤러" 를 명시 범위로 승인했으므로 §14 의 "명시적 WO" 조건을 충족한다.

## 6. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

## 7. 잔여

1. `packages/auth-utils` · `packages/ui` vitest 는 루트 설정으로 수동 실행(CI 미배선) — CI 인프라 변경이라 범위 밖
2. `packages/operator-core-ui` 는 테스트 인프라가 없어 목록 모달은 코드 변경만 적용(정책 강제는 백엔드 + 공유 케이스 테이블이 담당)
