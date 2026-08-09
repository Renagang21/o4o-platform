# CHECK-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1

> **결과: 구현 완료** — 관리자 비밀번호 재설정의 **적용 범위**를 응답·UI 에 명시.
> **작성일:** 2026-08-09
> **근거:** `CHECK-O4O-AUTH-SERVICEKEY-LOGIN-INVALID-CREDENTIALS-P0-V1` §5-1 · §8 **결정 A**
> (선행 정본: `CHECK-O4O-IDENTITY-V2-SERVICE-CREDENTIAL-PASSWORD-HASH-DRIFT-AUDIT-V1` §4-1)
> **commit:** `788c564c7`
> **credential 변경 0 · migration 0 · 로그인 로직 무변경**

---

## 1. 문제

관리자 재설정 경로는 `users.password`(Identity V2 **L1**) 만 갱신한다.
그런데 로그인은 `serviceKey` 가 있고 `service_credentials`(**L2**) row 가 존재하면
**`users.password` 를 보지 않는다**.

```ts
// auth-login.service.ts:215
const targetHash = credentialHash ?? user.password;
```

→ 관리자는 **성공 응답**을 받지만, credential 을 가진 서비스의 로그인 비밀번호는 **바뀌지 않는다.**
관리자도 사용자도 그 사실을 알 수 없는 **사일런트 무효**다.

실측(선행 조사 §5-1): 전체 credential 40건 중 **18건이 `users.password` 와 상이**하다.

---

## 2. 채택한 해법 (결정 A)

서비스별 자격 분리(L1/L2)는 **의도된 보안 경계이므로 유지**한다.
따라서 credential 을 건드리지 않고 — **어떤 서비스가 영향을 받지 않는지 알려주기만** 한다.

```text
하지 않은 것 (금지사항 준수)
  credential 이 있는데 users.password 로 fallback   ← 보안 경계 파괴
  관리자 재설정이 credential 까지 덮어쓰기          ← 정책 결정 필요, 결정 A 범위 밖
  serviceKey 무시 / 공통 비밀번호 전 서비스 허용
```

---

## 3. 변경 내용

### 3.1 신규 — 적용 범위 판정 (read-only)

`apps/api-server/src/services/auth/admin-password-reset-scope.service.ts`

```ts
resolveAdminPasswordResetScope(userId) → {
  updatedLayer: 'platform_identity',
  unaffectedServiceKeys: string[],   // service_credentials 보유 serviceKey
  notice: string | null,
}
```

계약:

- **SELECT 전용.** credential 생성·수정·삭제 경로를 만들지 않는다.
- **비밀번호·해시를 반환하지 않는다.** serviceKey 목록만 반환.
- 조회 실패는 **throw 하지 않고** 안내 생략으로 격하한다 — 재설정은 이미 성공했으므로
  안내를 못 만들었다고 200 을 500 으로 바꾸지 않는다.

### 3.2 API 응답 (둘 다 additive)

| 경로 | 변경 |
|------|------|
| `PATCH /api/v1/admin/platform-accounts/:id/password` | `data: { updatedLayer, unaffectedServiceKeys, notice }` + `notice` (있을 때) |
| `PUT /api/v1/admin/users/:id` | **password 동반 시에만** `passwordScope` + `notice` 추가 |

기존 필드(`success` / `message` / `user`)는 그대로다 → **기존 소비처 무영향.**

> **Freeze 확인** — `AdminUserController` 는 O4O-CORE-FREEZE §2.3 Approval Engine 공식 API 다.
> 본 변경은 **응답 필드 additive + 안내**뿐이고 요청 계약·권한·상태 전이·스키마를 바꾸지 않는다.
> Freeze 공통 규칙("버그 수정·문서는 허용, 구조 변경은 명시적 WO")의 허용 범위 안이다.

### 3.3 UI

| 화면 | 변경 |
|------|------|
| `AdminAccountsSettings.tsx` (관리자 계정 설정) | ① 재설정 모달에 **사전 경고**(설정 전에 범위를 알림) ② 재설정 후 **미적용 서비스 결과 패널** — toast 는 사라지므로 닫을 때까지 남는 모달로 표시 |
| `OperatorsPage.tsx` (운영자 관리) | 비밀번호 동반 수정 시 **미적용 서비스 경고 toast**(12초) |

---

## 4. 조사 — 관리자 재설정 경로 전수

| # | 경로 | `users.password` | credential | 본 WO 처리 |
|:-:|------|:----------------:|:----------:|-----------|
| 1 | `AdminUserController.updateUser` (`PUT /admin/users/:id`) | ✅ | ❌ | **안내 추가** |
| 2 | `platform-accounts.routes.ts` (`PATCH /:id/password`) | ✅ | ❌ | **안내 추가** |
| 3 | `AdminUserController.createUser` (`POST /admin/users`) | ✅ | ❌ | **대상 아님** — 신규 계정이라 credential 이 존재할 수 없음 |
| 4 | `user.service.ts:61` (사용자 생성) | ✅ | ❌ | 동일 이유로 대상 아님 |
| 5 | `account-linking.service.ts:185` | ✅ (`!user.password` 일 때만) | ❌ | **대상 아님** — 최초 설정(social-only 계정)이며 재설정이 아님 |
| 6 | `scripts/{reset-admin-password, list-and-reset-all-users, …}` | ✅ | ❌ | **대상 아님** — UI·응답이 없는 운영 스크립트. 별도 후속 후보(§8) |

---

## 5. 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` (api-server) | **PASS** (rc=0) |
| `tsc --noEmit` (admin-dashboard) | **PASS** (rc=0) |
| CI Pipeline | **success** (`31298334652`) — Code Quality / Build(admin-dashboard) / Build(main-site) 전부 success |
| Deploy API Server | **success** (`31298334643`, headSha `788c564c7`) → revision `o4o-core-api-03256-h9v` |
| Deploy Admin Dashboard | **success** (`31298334640`, headSha `788c564c7`) |
| **API smoke (프로덕션)** | ✅ **통과** — 두 분기 실측 (§7-3) |
| 관리자 UI smoke | ⚠️ **미수행** — 프론트 권한 게이트 차단 (§7-4) |

---

## 6. 무변경 확인

```
service_credentials write 0 (SELECT 전용)
users.password 갱신 로직 무변경 (기존 hashPassword 경로 그대로)
로그인 로직(auth-login.service.ts) 무변경
migration 0 · DB 스키마 0
요청 계약·권한·상태 전이 무변경
공급자/매장/QR/태블릿/Signage/STORE 설명서 무변경
```

---

## 7. 실행 기록

### 7-1. 확인된 것

| 항목 | 결과 |
|------|------|
| commit | `788c564c7` |
| CI Pipeline `31298334652` | **success** (전 job) |
| Deploy API Server `31298334643` | **success** — headSha `788c564c7`, revision `o4o-core-api-03256-h9v` |
| Deploy Admin Dashboard `31298334640` | **success** — headSha `788c564c7` |
| 라우팅 | `PATCH /admin/platform-accounts/:id/password` 미인증 호출 → **401**(=라우트 존재, 인증 게이트 정상). 404 아님 |

### 7-2. ⚠️ 수행하지 못한 검증과 사유 (→ **§7-3 에서 API 부분 해소됨**, 이력)

> **상태 갱신:** 아래는 검증 계정 확보 **이전** 기록이다. API smoke 는 §7-3 에서 통과했고,
> UI smoke 만 §7-4 의 별건 사유로 남아 있다.

**(당시) 관리자 비밀번호 재설정 실행 smoke(API·UI)를 수행하지 못했다.**

> **정정 (2026-08-09, 원인 재확정).** 최초 기록은 *"`sohae2100` 의 문서 비밀번호가 프로덕션과
> 불일치(401)"* 였다. **이는 오류다** — 조사자가 `sohae21@naver.com` 의 비밀번호를
> `sohae2100@gmail.com` 에 잘못 대입한 결과였다. 문서 기재값으로 다시 시도하니 **200** 이다.
> 문서 drift 가 원인이 아니었다.

**실제 원인: `platform:super_admin` 을 가진 테스트 계정이 존재하지 않는다.**

| 시도 | 결과 |
|------|------|
| `sohae2100@gmail.com` 로그인 (문서 기재값) | **200** ✅ |
| `sohae2100` → `GET /admin/platform-accounts` | **403 `ROLE_REQUIRED`** — 보유 role 은 `kpa:admin` · `neture:admin` 등 **서비스 레벨 admin** 뿐 |
| `renagang21@gmail.com` 로그인 → 동일 엔드포인트 | 로그인 200 / **403 `ROLE_REQUIRED`** |

두 관리자 경로 모두 `platform:super_admin` **전용**이다.

```text
platform-accounts.routes.ts : ADMIN_ACCESS_ROLES → platform:super_admin
users.routes.ts:32          : const ADMIN_ROLES = ['platform:super_admin']
```

DB 실측(read-only): `platform:super_admin` 보유 계정 **2개**, 그중 `TEST-ACCOUNTS.local.md` 의
테스트 계정은 **0개**.

- 비밀번호 **추측·대입은 하지 않았다** — 계정 잠금(5회/30분) 유발이자 부적절한 행위다.
- 실계정의 비밀번호를 실제로 **재설정해 보는 검증도 하지 않았다** — 다른 세션이 쓰는 운영 계정의
  자격을 바꾸게 되고, 되돌릴 수 없다.

**따라서 다음 두 가지는 코드·타입·빌드·배포로만 확인됐고, 프로덕션 실행 관측은 없다.**

```text
1) 재설정 응답에 unaffectedServiceKeys / notice 가 실제로 실려 나오는지
2) 관리자 UI 의 사전 경고·결과 패널이 실제로 렌더되는지
```

> **해소 조건이 바뀌었다.** 문서 비밀번호 갱신으로는 풀리지 않는다 — **검증용
> `platform:super_admin` 계정 지정**이 필요하며, 이는 권한 부여라 **사용자 결정 사항**이다
> (에이전트가 임의로 role 을 부여하지 않는다).
> 계정이 지정되면 아래 3단계로 즉시 확정할 수 있다(소요 5분 내외).
>
> ```text
> 1. credential 이 없는 계정에 재설정 → data.unaffectedServiceKeys = []      (안내 없음 경로)
> 2. credential 이 있는 계정에 재설정 → data.unaffectedServiceKeys = [서비스…] (안내 경로)
> 3. 관리자 계정 설정 화면에서 모달 사전 경고 + 결과 패널 렌더 확인
> ```
>
> 2번은 대상 계정의 플랫폼 비밀번호를 실제로 바꾸므로, **폐기 가능한 계정**에서 수행해야 한다.

**변경 자체의 위험도** — 응답은 additive 이고 기존 필드를 건드리지 않으며, 실패 시에도
`resolveAdminPasswordResetScope` 가 throw 하지 않고 안내만 생략한다. 즉 최악의 경우에도
**기존 재설정 동작은 그대로**이고 안내가 안 붙을 뿐이다.

---

### 7-3. ✅ API smoke 통과 (2026-08-09, 검증 계정 확보 후)

사용자가 검증용 `platform:super_admin` 계정을 지정해 §7-2 의 차단이 해소됐다.
DB 실측으로 role 보유(`platform:super_admin` = true, `status=approved`)를 먼저 확인했다.

**안전 조치 — 비밀번호를 현재 값 그대로 재설정**해 실질 변경 없이 응답만 검증했다.

| # | 대상 | `data.unaffectedServiceKeys` | `notice` |
|:-:|------|------------------------------|:--------:|
| 1 | credential **없는** 계정 | `[]` | `null` ✅ |
| 2 | credential **4개 보유** 계정 | `["glycopharm","k-cosmetics","kpa-society","neture"]` | 문구 포함 ✅ |

2번 목록은 **DB 실측 결과와 정확히 일치**한다(같은 4개 serviceKey).

**무해성 확인** — 재설정 후 두 계정 모두 재로그인 **200**. 동일값이라 사용자 영향 0.

```text
GET /api/v1/admin/platform-accounts                     → 200 (super_admin 접근 확인)
PATCH /admin/platform-accounts/:id/password (빈 케이스)   → 200, unaffectedServiceKeys=[]
PATCH /admin/platform-accounts/:id/password (비어있지 않음) → 200, 4개 serviceKey + notice
```

→ **본 WO 의 핵심 동작(적용 범위 산출·응답 노출)이 프로덕션에서 실증됐다.**

### 7-4. ⚠️ 관리자 UI smoke — 별건 차단 (본 WO 무관, 미수정)

`https://admin.neture.co.kr/settings/admin-accounts` 진입 시 **"접근 권한이 없습니다"**.

- **백엔드는 통과한다** — 같은 계정으로 `/admin/platform-accounts` API 는 **200**.
- 프론트 라우트가 `AdminProtectedRoute requiredPermissions={['settings:read']}` 를 요구하는데
  (`routes/appearance.routes.tsx:141-147`), `platform:super_admin` 이 그 권한으로 매핑되지 않는다.
- 즉 **프론트 권한 매핑 갭**이며 본 WO 변경(페이지 내부 문구 추가)과 무관한 **기존 문제**다.
- **수정하지 않았다** — 권한·role 변경은 중지 조건(CLAUDE.md)이다.

따라서 UI 렌더(모달 사전 경고·결과 패널)는 여전히 미관측이다. 다만 **UI 는 §7-3 에서 실증된
응답 payload 를 그대로 표시**하는 얇은 층이고, 표시 분기(`unaffected.length > 0`)는 그 payload 로만 결정된다.

> 후속 후보 5번으로 등록.

---

## 8. 후속 후보

| # | 내용 | 등급 |
|:-:|------|:---:|
| 1 | `WO-O4O-AUTH-ACCOUNT-ACTIVITIES-SUCCESS-FLAG-FIX-V1` — 인증 실패가 `success=true` 로 기록되는 오집계 (결정 C) | P2 |
| 2 | `WO-O4O-TEST-ACCOUNTS-SERVICE-CREDENTIAL-DOCUMENTATION-V1` — 테스트 계정 문서를 서비스별 비밀번호 구조로 (결정 D) | P3 |
| 3 | 운영 스크립트(§4-6)에도 동일 안내 출력 | P3 |
| 4 | 관리자가 **serviceKey 를 지정해** 특정 서비스 credential 을 재설정하는 경로(결정 A-(다)) | 정책 재검토 시 |
| **5** | **`platform:super_admin` 이 프론트 `settings:read` 권한으로 매핑되지 않아 admin-dashboard 설정 화면 접근 불가** (§7-4). 백엔드는 200, 프론트만 차단 — 기존 문제 | **P2** |

---

*범위: 안내(응답·UI)만 · credential 변경 0 · 로그인 로직 무변경 · 결정 A 준수*
