# CHECK-O4O-ADMIN-USER-LIST-SENSITIVE-FIELD-EXPOSURE-FIX-V1

> WO: `WO-O4O-ADMIN-USER-LIST-SENSITIVE-FIELD-EXPOSURE-FIX-V1`
> 작업일: 2026-08-01 · 브랜치: `main` · 작업 전 HEAD `a65297529`

---

## 1. 노출된 민감 필드와 원인

### 노출 필드

| 필드 | 성격 |
|------|------|
| `refreshTokenFamily` | refresh token 회전 식별자 — 인증 내부 상태 |

`password` 는 기존에도 제거되고 있었다. `resetPasswordToken` / `resetPasswordExpires` 는
같은 엔티티에 존재하며 동일 경로로 노출될 수 있어 함께 제외 대상에 포함했다(§3 근거).

### 원인

`AdminUserController` 의 응답이 **User 엔티티를 spread 하면서 `password` 만 구조분해로 제거**하는 방식이었다.

```ts
const { password, ...userWithoutPassword } = user;   // password 외 전 필드 그대로 통과
res.json({ success: true, user: userWithoutPassword });
```

새 컬럼이 엔티티에 추가되면 자동으로 응답에 실린다 — 이번 노출도 그 결과다.

동일 저장소의 [`platform-users.routes.ts`](../../apps/api-server/src/routes/admin/platform-users.routes.ts) 는
이미 반대 정책을 문서화하고 있었다:

> "User 엔티티 전체 spread 금지 / password 만 제거 방식 금지. 안전 필드만 명시적 pick.
>  제외(절대 미반환): password, refreshTokenFamily, ..."

즉 정책은 존재했고 이 컨트롤러만 따르지 않고 있었다.

## 2. 조사한 User 엔티티 필드 (전수)

`@Column` 등록 속성 33개를 확인하고 인증/보안 관련만 추렸다.

| 필드 | 판정 | 근거 |
|------|------|------|
| `password` | **제외** | bcrypt 해시 |
| `refreshTokenFamily` | **제외** | refresh token 회전 식별자 |
| `resetPasswordToken` | **제외** | 비밀번호 재설정 토큰 — 노출 시 계정 탈취 가능 |
| `resetPasswordExpires` | **제외** | 위 토큰의 유효기간(동반 값) |
| `lastLoginAt` | 유지 | 관리자 UI 실사용 — `ActiveUsers.tsx` 의 "마지막 로그인" 컬럼 |
| `businessInfo` | 유지 | 관리자 UI 실사용 — `BusinessInfoSection.tsx`, `types/user.ts` |
| `loginAttempts` · `lockedUntil` | 유지 | 계정 잠금 상태 관리에 필요 |
| `provider` · `provider_id` | 유지 | 소셜 계정 식별자 — 비밀값 아님 |
| `lastLoginIp` | 유지 | 관리자 감사 용도 · WO §6 미지정 |
| `approvedAt` · `approvedBy` | 유지 | 승인 이력 |

`mfaSecret` · `apiKey` · `sessionSecret` · `emailVerificationToken` 컬럼은 **엔티티에 없다**
(이메일 인증 토큰은 별도 `email_verification_tokens` 테이블).

> WO §6 "근거 없이 일반 프로필 필드를 제거하지 않는다" 에 따라 위 유지 항목은 건드리지 않았다.

## 3. 구현

신규: `apps/api-server/src/controllers/admin/admin-user-sanitizer.ts`

```ts
export const ADMIN_USER_SENSITIVE_FIELDS = [
  'password', 'refreshTokenFamily', 'resetPasswordToken', 'resetPasswordExpires',
] as const;
export function sanitizeAdminUser<T>(user: T): Omit<T, AdminUserSensitiveField>   // shallow copy + delete
export function sanitizeAdminUsers<T>(users: readonly T[]): ...
```

- **값 마스킹이 아니라 `delete` 로 key 자체를 제거**한다 → 값이 `null`/`undefined` 여도 key 부재.
- 입력 객체를 변형하지 않는다(shallow copy 반환).

### 적용 경로 (엔티티를 spread 하던 4곳 전부)

| # | 위치 | 응답 |
|:-:|------|------|
| 1 | `getUsers` | 목록 각 항목 |
| 2 | `getUser` | 단건 |
| 3 | `createUser` — 기존 계정 분기 | 200 `user` |
| 4 | `createUser` — 신규 저장 분기 | 201 `user` |
| 5 | `updateUser` | 200 `user` |

목록과 단건이 **같은 SSOT** 를 쓰므로 계약이 갈라질 수 없다(테스트로도 고정).

### 손대지 않은 경로 (노출 없음 확인)

- `getUserStatistics` — `select: ['id','firstName','lastName','email','createdAt']` 화이트리스트
- `updateUserStatus` · `deleteUser` · `revokeRoleAssignment` — 메시지만 반환

### 기존 sanitizer 를 재사용하지 않은 이유

`apps/api-server/src/modules/lms/utils/sanitize-user.ts` 의 `sanitizeUserFields()` 는
`businessInfo` · `lastLoginAt` · `approvedAt/By` · `loginAttempts` · `lockedUntil` 까지 제거한다.
포럼·LMS 등 **공개 표시 맥락**용 목록이라 관리자 화면에 그대로 적용하면 기능이 깨진다(§2 유지 항목 참조).
그래서 관리자 맥락의 별도 목록을 두고 각 항목의 근거를 코드 주석과 본 문서에 남겼다.
WO §4.4 의 "과도한 범용 직렬화 프레임워크를 만들지 않는다" 에 맞춰 함수 2개로 제한했다.

## 4. 계약 보존

| 항목 | 상태 |
|------|------|
| 목록 응답 shape (`{success, users, pagination}`) | 무변경 |
| 검색 · `status`/`role` 필터 · 페이지네이션 · 정렬 | 무변경 |
| 단건 조회 (`{success, user}`) · 미존재 404 | 무변경 |
| 사용자 생성 200/201 · 수정 200 응답 구조 | 무변경 (`user` 키 유지) |
| 관리자 권한 가드 `['platform:admin','platform:super_admin']` | 무변경 |
| 삭제 · 상태 변경 · 역할 회수 | 무변경 |

프론트 변경 0 — 관리자 UI 는 제거된 4개 필드를 **어디서도 사용하지 않는다**(전수 grep 확인).

> 본 파일은 `@core O4O_PLATFORM_CORE — Approval` (Freeze `WO-O4O-CORE-FREEZE-V1`) 이다.
> CLAUDE.md §14 "버그 수정·성능 개선·문서·테스트는 허용" 에 해당하며 구조·스키마 변경은 없다.

## 5. 데이터 변경

```
migration        0
신규 테이블      0
신규 컬럼        0
사용자 데이터 write 0
token revoke     0
session 변경     0
```

응답 직렬화만 변경했다.

## 6. 테스트

신규: `apps/api-server/src/controllers/admin/__tests__/admin-user-sanitizer.test.ts` — **11건 전부 통과**
(기존 `admin-user-search.test.ts` 10건 포함 **21/21**)

| 그룹 | 검증 |
|------|------|
| 민감 필드 제거 | `password`·`refreshTokenFamily` key 부재 · reset 토큰/만료 key 부재 · **값이 null/undefined 여도 key 제거** |
| 일반 필드 유지 | id·email·name·phone·status·isActive·businessInfo·lastLoginAt·loginAttempts·lockedUntil·approvedAt/By·createdAt/updatedAt 보존 |
| 불변성 | 입력 객체 미변형 · 반환값이 입력과 다른 참조 · 민감 필드 부재 입력도 안전 |
| 목록 적용 | 배열 전 항목 적용 · 빈 배열 · 원본 배열/항목 미변형 |
| 목록 자체 검증 | 민감 필드가 **User 엔티티 실제 컬럼**인지(오탈자 방지) · 목록·단건 키 집합 동일 |

## 7. 빌드

| 검사 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.build.json` | ✅ 0 errors |
| `jest --testPathPattern=admin-user` | ✅ 21/21 |

admin frontend build 생략 — 프론트 소스 변경 0 이고 제거 필드를 UI 가 사용하지 않음을 grep 으로 확인했다(§4).

## 8. 프로덕션 스모크

배포 `6ca8f5073` → Deploy API Server (Cloud Run) **success**.
인증 `renariver21@gmail.com`(`platform:super_admin`). **민감 필드 값은 기록하지 않고 key 존재 여부만** 남긴다.

### 8-1. 권한

| 시나리오 | 결과 |
|---|---|
| 미인증 | ✅ 401 |
| 비관리자 | ✅ 403 |

### 8-2. 응답 감사

감사 기준 — 민감 key(`password`·`refreshTokenFamily`·`resetPasswordToken`·`resetPasswordExpires`) 존재 여부,
일반 필드(`id`·`email`·`name`·`status`·`isActive`·`createdAt`) 누락 여부.

| 대상 | 결과 |
|---|---|
| 목록 (page=1, 20행) | ✅ 200 · total=40 · **민감 key 0** · 일반 필드 누락 0 |
| 목록 (page=2, 20행) | ✅ 200 · **민감 key 0** · 일반 필드 누락 0 |
| 검색 — 이메일 일부 | ✅ 200 · total=1 · **민감 key 0** |
| 검색 — 이름(한글) | ✅ 200 · total=2 · **민감 key 0** |
| 검색 — 전화번호 일부 | ✅ 200 · total=4 · **민감 key 0** |
| 단건 조회 (존재) | ✅ 200 · **민감 key 0** · 일반 필드 누락 0 |
| 단건 조회 (미존재) | ✅ 404 `User not found` (기존 동작 유지) |
| **전 페이지 전수 감사 (40행 전체)** | ✅ **민감 key 0 · 일반 필드 누락 0** |

수정 전 동일 경로에서 `refreshTokenFamily` key 가 존재했다(직전 WO 스모크에서 확인).
이제 목록·검색·단건 어디에서도 나타나지 않는다.

## 9. 추가로 발견한 민감정보 노출 경로

없음. 관리자 사용자 계열 응답은 §3 의 5개 지점이 전부이며 모두 처리했다.

다만 **동일 유형의 구조적 위험**이 남아 있다: 이 컨트롤러 외에도 User 엔티티를 spread 해 반환하는
코드가 저장소 전반에 존재할 수 있다(`ForumControllerBase` · LMS 는 각자 블랙리스트를 두고 있으나
서로 다른 목록을 쓴다). 세 목록(admin / lms / forum)을 하나의 정책 레지스트리로 모으고
"엔티티 spread 반환 금지" 를 린트로 강제하는 것은 별도 WO 로 분리할 것을 권고한다.

## 10. 미실행 항목과 사유

| 항목 | 사유 |
|------|------|
| admin frontend build | 프론트 변경 0 · 제거 필드 미사용 확인 (§7) |
| 사용자 생성/수정 API 프로덕션 스모크 | 프로덕션 사용자 데이터 write 를 유발하므로 미실행. 응답 경로가 목록·단건과 **동일한 sanitizer** 를 쓰고 단위 테스트로 고정되어 있다 |
| 엔티티 spread 반환 전역 점검 | §9 — 별도 WO 권고 |
