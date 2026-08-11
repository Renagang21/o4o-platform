# CHECK-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1

- **WO**: WO-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1
- **선행**: WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1 (정책 확정) · IR-O4O-NETURE-OPERATOR-ASSIGNMENT-DUPLICATION-AUDIT-V1 (GUIDE-REPLACE 순서 2번)
- **작업일**: 2026-08-11
- **판정**: PASS

---

## 1. 문제

정책은 `최소 8자 + 영문 1자 + 숫자 1자` 로 확정되었고 **백엔드 3경로는 이미 정본을 쓰고 있었다.**
남은 것은 **프런트 UX 와 라우트 선언**이었다.

| 경로 | 백엔드 | 이번 작업 전 프런트 |
|---|---|---|
| 신규 계정 최초 서비스 비밀번호 | `AdminUserController.createUser` — `isPasswordPolicyCompliant` (`SERVICE_PASSWORD_TOO_SHORT`) | `password.length < 8` 만 검사 |
| 기존 계정 초기 서비스 비밀번호 | 동일 | `password.length < 8` 만 검사 |
| 서비스 비밀번호 변경 모달 | `MembershipConsoleController` — `isPasswordPolicyCompliant` (`WEAK_PASSWORD`) | `pwValue.length < 8` 만 검사 |

결과적으로 `abcdefgh`(영문만 8자)는 프런트를 통과하고 서버에서 거절돼, 관리자가 이유를 모른 채
실패를 겪는 상태였다. placeholder 도 세 곳 모두 `"8자 이상"` 이었다.

---

## 2. 변경 파일

| 파일 | 내용 |
|---|---|
| `apps/admin-dashboard/src/lib/password-policy.ts` (신규) | 로컬 정책 검증 + 안내·오류 문구 정본 |
| `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` | 3경로 검증·placeholder·오류 문구·제출 가능 조건 통일 |
| `apps/admin-dashboard/src/tests/operators-password-policy.test.ts` (신규) | 22 케이스 |
| `apps/api-server/src/routes/admin/users.routes.ts` | `min: 6` 정리 |

---

## 3. 프런트 정본 재사용 판단

WO 지침: *"가능하면 기존 정본을 재사용하되, 이를 위해 불필요한 패키지 의존성이나 lockfile 변경이 필요하면
단순한 로컬 검증을 사용"*.

`admin-dashboard/package.json` 의 `@o4o/*` 의존 13종에 **`@o4o/auth-utils` 는 없다**
(현재 소비처는 `services/web-*` 5개 서비스뿐). 이미 의존 중인 `@o4o/utils` · `@o4o/auth-client` ·
`@o4o/auth-context` · `@o4o/security-core` 어느 것도 비밀번호 정책을 re-export 하지 않는다.
따라서 정본 재사용에는 workspace 의존 + lockfile 변경이 필요하므로 **로컬 검증**을 택했다.

drift 방지는 **동일 케이스 테이블**로 건다. 백엔드
`apps/api-server/src/utils/__tests__/password-policy.test.ts` · 프런트 공용
`packages/auth-utils/src/__tests__/passwordPolicy.test.ts` 와 **같은 10 케이스**를
`operators-password-policy.test.ts` 에 두어 세 구현의 판정이 갈리면 테스트가 깨진다.

---

## 4. 프런트 3경로 정렬

- 검증: 세 경로 모두 `isPasswordPolicyCompliant(...)` 로 교체 (길이 단독 검사 제거)
- 오류 문구: 세 경로 모두 `PASSWORD_POLICY_MESSAGE` — 백엔드 문장과 동일
- placeholder: `"8자 이상"` → `PASSWORD_POLICY_HINT`(`영문, 숫자 포함 8자 이상`), 두 입력 필드 아래에도 같은 안내 노출
- 제출 가능 조건: 변경 모달 버튼 `pwValue.length < 8` → `!isPasswordPolicyCompliant(pwValue)`
- 변경 모달 input 의 `minLength={8}` 제거 — 네이티브 길이 검사만 통과시키는 브라우저 기본 문구가
  정책 안내와 어긋나므로, 판정을 한 곳(제출 조건 + 제출 시 검증)으로 모았다.
- 기존 등록/편집 계약(신규 필수 · 기존 선택 · 편집에서 비밀번호 미노출)은 **그대로 유지**한다.

---

## 5. `admin/users.routes.ts` 의 `min: 6` 정리

| 라우트 | 이전 | 이후 | 근거 |
|---|---|---|---|
| `POST /admin/users` | `body('password').optional().isLength({ min: 6 })` | 정책 정본(`PASSWORD_MIN_LENGTH` + `PASSWORD_POLICY_REGEX`) | **실효 경로**. 6~7자를 통과시킨 뒤 controller 가 다시 거절해 이중 문구를 만들었다 |
| `PUT /admin/users/:id` | 동일 선언 | **선언 제거** | controller 가 password 를 받으면 항상 400 `PASSWORD_NOT_ALLOWED_HERE` 로 거절한다(도달 불가). "여기서 비밀번호를 바꿀 수 있다" 는 오해만 만들어 WO 지침대로 정리했다. 대체 경로를 주석에 명시 |

정책 값·정규식은 `apps/api-server/src/utils/password-policy.ts` 에서 import 한다(라우트에 규칙 복제 없음).

---

## 6. 변경하지 않은 것

- 비밀번호 정책 자체 (8자 + 영문 + 숫자, 특수문자 선택)
- 로그인 · 해시 · `service_credentials` 구조
- 역할 · membership · DB schema · migration
- Neture 운영자 화면과 API
- 등록/편집의 기존 write 계약 (`PASSWORD_NOT_ALLOWED_HERE` · `KEEP_EXISTING_CREDENTIAL` 포함)
- workspace 의존성 · lockfile

---

## 7. 검증

| 항목 | 결과 |
|---|---|
| `npx vitest run src/tests/operators-password-policy.test.ts src/tests/operators-service-password.test.ts` | **2 files / 46 tests PASS** |
| `npx tsc --noEmit -p apps/admin-dashboard/tsconfig.json` | exit 0 |
| `npx jest src/controllers/admin/__tests__ src/utils/__tests__/password-policy.test.ts src/routes` | **11 suites / 146 tests PASS** |
| `npx tsc --noEmit -p apps/api-server/tsconfig.json` | exit 0 |

기존 `operators-service-password.test.ts` 24 케이스(등록·편집 write 계약)는 회귀 없이 통과한다.

---

## 8. 후속 순서

1. ~~중앙 역할 해제 안전 가드 이식~~ (CHECK-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1)
2. ~~중앙 `/operators` 비밀번호 UX·라우트 검증 잔여 정리~~ ← 본 CHECK
3. `MembershipConsoleController.removeMemberRole` 의 안전 가드 우회 조사·보완
   — **Neture 안내 화면 교체 전에 반드시 선행**
4. Neture `/admin/operators` 안내 화면 교체
5. 소비처 0 재확인 후 Neture 전용 API 은퇴 (별도 작업)
