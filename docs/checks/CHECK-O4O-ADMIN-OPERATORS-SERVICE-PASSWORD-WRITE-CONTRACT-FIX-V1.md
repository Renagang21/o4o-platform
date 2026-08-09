# CHECK-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1

> WO: `WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1` (P1)
> 대상: admin-dashboard OperatorsPage 비밀번호 변경의 사일런트 무효 해소
> 브랜치: `fix/admin-operators-service-password-contract` (`origin/main` = `65e6d9e4e` 기준)
> 상태: **구현 완료 · 게이트 GREEN**

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| 사일런트 무효 제거 | ✅ 편집 경로에서 password 제거 + 서버 명시적 거부 |
| 행별 "서비스 비밀번호 변경" 신설 | ✅ 대상 서비스 고정, canonical serviceKey 표시 |
| B6 계약 재사용 | ✅ `PUT /operator/members/:userId { password, serviceKey }` |
| `users.password` write | ✅ **0건** |
| 타 서비스 credential write | ✅ **0건** (1회 조작 = 1 credential) |
| platform 행 | ✅ 액션 미노출 |
| P2 신규 생성 계약 | ✅ **무변경** |
| 게이트 | api tsc / jest 82·1335 / frontend tsc / vitest 12·195 / lint 102 전부 GREEN |
| migration · DB write | **0건** |

---

## 1. 사일런트 무효의 정확한 호출·write 경로 (수정 전)

```
OperatorsPage.tsx:212   if (formData.password) data.password = formData.password
                 :213   PUT /admin/users/${editingUserId}
  → AdminUserController.updateUser
      user.password = await hashPassword(password)        ← users.password(L1) 만
  → 로그인: targetHash = credentialHash ?? user.password  ← credential 있으면 L1 미조회
```

`CLARIFY-V1` 이 `passwordScope.unaffectedServiceKeys` 경고 토스트를 붙여 **알리기는** 했지만,
조작 자체는 여전히 무효였다. 이번 WO 는 **조작을 유효하게** 만든다.

---

## 2. 재사용한 Identity V2 계약

| 재사용 | 내용 |
|---|---|
| **B6 API** | `PUT /api/v1/operator/members/:userId` body `{ password, serviceKey }` — 서버가 후보 교집합 검증 → 계층 권한 검증 → 해당 serviceKey credential **1건만** upsert |
| **권한 경로** | `operator/members` 라우터가 `platform:super_admin` 을 허용 → admin-dashboard 관리자가 그대로 사용 |
| **serviceKey SSOT** | `@o4o/security-core` 의 `resolveCanonicalServiceKey` — role prefix(`kpa`,`cosmetics`) → canonical(`kpa-society`,`k-cosmetics`). **로컬 매핑 상수 신설 없음** |

### 공통 `PasswordModal` 을 재사용하지 않은 이유

`@o4o/operator-core-ui` 의 `PasswordModal` 은 **후보 목록에서 서비스를 고르는** 모달이다
(`user.memberships` 기반, 후보 1개면 자동 확정). 반면 이 화면은 **행이 곧 서비스**라 선택 개념이 없다.
또 admin-dashboard 는 `operator-core-ui` 에 의존하지 않아 재사용하려면 패키지 의존을 새로 추가해야 한다.
→ **API 계약(B6)은 그대로 재사용**하고 모달만 화면에 맞게 최소 구현했다(약 70줄, 선택 UI 없음).

---

## 3. 변경 파일과 UI 동작

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/controllers/admin/AdminUserController.ts` | `updateUser` 가 `password` 를 받으면 **400 `PASSWORD_NOT_ALLOWED_HERE`** 로 거부. `users.password` write 제거. `resolveAdminPasswordResetScope` import 제거(서비스 자체는 platform-accounts 가 계속 사용하므로 보존) |
| `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` | 편집 모달 password 입력·전송 제거(안내 문구 대체) · `validateForm` 을 생성 전용으로 축소 · 행 액션 "서비스 비밀번호 변경" 추가(platform 제외) · 서비스 고정 모달 신설 |
| `apps/admin-dashboard/package.json` | `@o4o/security-core: workspace:*` 추가 |
| `apps/admin-dashboard/tsconfig.json` · `vite.config.ts` | `@o4o/security-core` → `packages/security-core/src` 매핑 |
| 신규 테스트 2개 · 본 CHECK | — |

### UI 동작

| 상황 | 화면 |
|---|---|
| 편집 모달 | 비밀번호 입력 없음. "목록에서 해당 **서비스 행**의 **서비스 비밀번호 변경**을 사용하세요 — 서비스마다 비밀번호가 독립적입니다" |
| 서비스 행 액션 | `서비스 비밀번호 변경 (GlycoPharm)` 처럼 **서비스명 포함** |
| `platform` 행 | 액션 **미노출** |
| 서비스 비밀번호 모달 | 대상 회원 + **대상 서비스명 + canonical serviceKey(코드 표시)** + "이 서비스의 로그인 비밀번호만 변경됩니다. 다른 서비스와 플랫폼 로그인은 영향받지 않습니다" |
| 성공 | `{서비스명} 비밀번호가 변경되었습니다` — **요청 성공 이후에만** 표시 |
| 신규 생성 | 기존과 동일 (P2 무변경) |

### `security-core` 를 `src` 로 매핑한 이유

`build:packages` 체인에 `security-core` 가 **없다**. `ci-build-app.sh` 는 admin 빌드 전
`build:packages` 만 실행하므로 `dist` 를 전제하면 CI 빌드가 깨진다.
빌드 체인(build 인프라)을 바꾸는 대신, 이 저장소에 이미 확립된 **src 매핑 패턴**
(`@o4o/types`·`@o4o/ui` 등 tsconfig paths 9건)을 따랐다.

---

## 4. `users.password`·타 서비스 credential 불변 증명

### 백엔드 — `AdminUserController.passwordContract.test.ts` (4/4)

| 케이스 | 결과 |
|---|---|
| password 전달 → 400 `PASSWORD_NOT_ALLOWED_HERE` | ✅ |
| 거부 시 `userRepo.save` 미호출 · `hashPassword` 미호출 | ✅ |
| **빈 문자열** password 도 거부 (조용한 통과 금지) | ✅ |
| password 없는 일반 수정 → 정상 저장, `password` 필드 원본 유지 | ✅ |

### 프런트 — `operators-service-password.test.ts` (11/11)

| 케이스 | 결과 |
|---|---|
| `data.password = …` 코드 부재 | ✅ |
| 편집 모드 password 입력 미렌더 | ✅ |
| 신규 생성 password 유지(P2) | ✅ |
| B6 경로·payload(`password`+`serviceKey`) 사용 | ✅ |
| `resolveCanonicalServiceKey` 사용 · 로컬 매핑 상수 부재 | ✅ |
| 서비스 선택 UI 없음(행 고정) | ✅ |
| platform 행 액션 제외 | ✅ |
| 모달에 서비스명 + canonical key 표시 | ✅ |
| 성공 토스트가 `await` **이후** | ✅ |
| platform-accounts API 미호출 | ✅ |
| `unaffectedServiceKeys` 의존 제거 | ✅ |

### 서버 측 불변 보장(기존 계약)

"1회 조작 = 1 credential" 은 B6 서버 로직이 강제하며
`MembershipConsoleController.servicePassword.test.ts` (17 케이스)가 이미 고정하고 있다 —
`UPDATE users SET password` 0건 · credential write 정확히 1건 · 계층/스코프 위반 거부.

---

## 5. 테스트·게이트 결과

```
api-server tsc            → exit 0   (deps 선행 빌드 필요: pnpm --filter '@o4o/api-server^...' run build)
api-server jest           → 82 suites / 1335 tests PASS
type-check:frontend       → OK
admin-dashboard vitest    → 12 files / 195 tests PASS
lint-ratchet              → ESLint 102 errors (baseline 102 유지)
DB write / migration      → 0
```

**lockfile 변경**: `@o4o/security-core` workspace link **3줄 추가**뿐 — 외부 패키지 추가 0.

---

## 6. 별도 후속으로 남긴 것

### 6-1. `UserForm` 의 무효 password 입력 (이번 WO 범위 밖)

```
apps/admin-dashboard/src/pages/users/UserForm.tsx   (routes/users.routes.tsx:7 로 라우팅됨)
  payload.password = data.password
  → UserApi.updateUser → PUT /v1/users/:id
  → UserManagementController.updateUser 는 email/firstName/lastName/status/roles 만 처리
```

**password 를 보내지만 백엔드가 조용히 버린다.** OperatorsPage 와 달리 write 자체가 없고 경고도 없다.
`POST /v1/users` 생성 경로는 `createUser` 가 password 를 사용하므로 함께 판단해야 한다.
→ **다음 소규모 정비 단위.**

### 6-2. P2 신규 운영자 생성 계약 — 현 상태

`POST /admin/users` 는 여전히 `users.password` 만 설정한다(`AdminUserController:277`).
따라서 **신규 운영자는 서비스 credential 없이 생성**되고, 해당 서비스에 credential 이 생기기 전까지만
`users.password` fallback 으로 로그인된다. 이번 WO 에서 **변경하지 않았다**(WO 명시).
결정 필요: 생성 시 어느 서비스의 credential 을 만들 것인가 / 최초 비밀번호를 누가 정하는가.

---

## 7. 금지사항 준수

- ❌ 플랫폼 계정 비밀번호 계약 변경 — 하지 않음 (`platform-accounts` 라우트·화면 무변경, OperatorsPage 에서 미호출)
- ❌ 로컬 prefix→canonical 매핑 상수 — 만들지 않음 (SSOT 재사용)
- ❌ P2 생성 계약 변경 — 하지 않음
- ❌ `UserForm` 수정 — 하지 않음 (§6-1 기록)
- ❌ migration · 운영 DB write — 하지 않음
- ❌ `o4o-auth-commonize` 접촉 — 하지 않음
- ❌ build 인프라(`build:packages` 체인) 변경 — 하지 않음 (src 매핑으로 회피)

---

## 8. Git

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-admin-pw` |
| 브랜치 | `fix/admin-operators-service-password-contract` (`origin/main` `65e6d9e4e` 기준) |
| migration | **0건** |
| main 병합 | 별도 지시 후 |
