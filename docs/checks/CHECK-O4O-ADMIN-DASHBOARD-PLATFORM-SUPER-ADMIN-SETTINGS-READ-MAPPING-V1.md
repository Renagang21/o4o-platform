# CHECK-O4O-ADMIN-DASHBOARD-PLATFORM-SUPER-ADMIN-SETTINGS-READ-MAPPING-V1

> **결과: `HOLD` (수정 불필요) + 본래 목적 달성** — 권한 매핑 결함은 **없었다.**
> WO §0 중지 조건 충족: `/settings/admin-accounts 접근 차단 원인이 settings:read 권한 매핑이 아님`
> **작성일:** 2026-08-09
> **코드 변경 0 · 배포 0** — 그러나 이 WO 의 목적이던 **관리자 재설정 안내 UI smoke 는 완료**했다.

---

## 1. 결론

`platform:super_admin` 계정은 **실제 로그인 폼으로 접속하면 `/settings/admin-accounts` 에 정상 접근한다.**

앞선 CHECK(`...-SCOPE-CLARIFY-V1 §7-4`)에 기록한 *"프론트 권한 매핑 갭"* 은 **오진**이었다.
차단의 원인은 제품 결함이 아니라 **검증 방식(토큰 주입 우회)의 부작용**이다.

---

## 2. 조사 — 왜 오진이었나

### 2-1. 판정 로직 (`packages/auth-context/src/adminRouteAccess.ts`)

```ts
export const hasRequiredPermissions = (user, requiredPermissions) => {
  const granted = user?.permissions;
  if (Array.isArray(granted) && granted.length > 0) {          // ① permissions 가 채워졌을 때만 실검사
    return requiredPermissions.every((p) => granted.includes(p));
  }
  return collectUserRoles(user).some(                           // ② 아니면 관리자 역할 게이트
    (role) => ADMIN_LEVEL_ROLES.includes(role) || isServicePrefixedAdminRole(role),
  );
};
```

`ADMIN_LEVEL_ROLES` 에는 **`platform:super_admin` 이 이미 포함**되어 있다(`:11-17`).

### 2-2. 실제 로그인 응답 (프로덕션 실측)

```json
{ "role": "platform:super_admin", "roles": ["platform:super_admin"], "permissions": [] }
```

`permissions` 가 **빈 배열**이므로 ② 경로로 가고, `platform:super_admin` 이 `ADMIN_LEVEL_ROLES` 에
있으므로 **통과**한다. → 코드상 차단될 이유가 없다.

### 2-3. 오진의 원인 — 토큰 주입 우회

선행 smoke 는 `localStorage.o4o_accessToken` 만 주입했다. `AuthProvider` 가 사용자 프로필을 갖추지
못한 상태에서 `collectUserRoles(user)` 가 **빈 배열**을 반환했고, 그 결과 ② 의 `.some()` 이 false 가 되어
`AccessDeniedComponent` 가 렌더된 것이다.

> **교훈:** 토큰 주입 우회는 **권한 게이트가 걸린 화면의 판정 검증에 쓸 수 없다.**
> 로그인 자체뿐 아니라 **role 기반 렌더 판정도 위음성**을 만든다.

### 2-4. 실제 로그인 폼 재확인

```text
POST /api/v1/auth/login  {email, password, serviceKey:"neture"}   → 200
→ /home 랜딩 → /settings/admin-accounts 진입
DENIED? false · 페이지 렌더 정상 · 실패 API 0
```

> 참고: 이 계정은 `service_credentials` 가 없어 `serviceKey` 가 실려도 L1(`users.password`) 로 판정된다.
> 그래서 문서 기재값으로 폼 로그인이 성립한다.

---

## 3. WO 검증 항목 대비

| WO 항목 | 결과 |
|---------|------|
| 8.1 `platform:super_admin` 접근 | ✅ **가능** (수정 없이) |
| 8.2 권한 없는 계정 회귀 | **변경 없음** — 코드를 고치지 않았으므로 기존 정책 그대로 |
| 8.3 API 권한 변화 없음 | ✅ 백엔드 파일 **무변경** |
| 8.4 관리자 재설정 안내 UI smoke | ✅ **완료** (§4) |
| 8.5 회귀 | 해당 없음 — 변경 0 |

---

## 4. ✅ 관리자 재설정 안내 UI smoke (본래 목적 — 완료)

대상: `admin.neture.co.kr/settings/admin-accounts` · 실제 로그인 폼 사용.
**비밀번호는 현재 값과 동일하게 재설정**해 실질 변경 없이 UI 만 검증했다.

| 검증 | 결과 |
|------|:----:|
| 페이지 접근 | ✅ |
| 재설정 모달 열림 | ✅ |
| **사전 경고** — "플랫폼 로그인 비밀번호"에 적용됨 | ✅ |
| **사전 경고** — "해당 서비스의 비밀번호가 변경되지 않으며" | ✅ |
| **사전 경고** — "비밀번호 찾기" 안내 | ✅ |
| **결과 패널** — "일부 서비스에는 적용되지 않았습니다" | ✅ |
| **결과 패널** — 미적용 서비스 목록 | ✅ `glycopharm` `k-cosmetics` `kpa-society` `neture` |
| 결과 패널 — 재설정 방법 안내 | ✅ |
| 콘솔 에러 | **0** |
| 실패 API(4xx/5xx) | **0** |

- 목록 4종은 **API smoke 및 DB 실측과 정확히 일치**한다.
- 재설정 후 대상 계정 **재로그인 200** — 동일값이라 사용자 영향 0.
- 대상 계정은 CHECK 에 이메일만 기록하고 **비밀번호는 기록하지 않는다**.

→ `WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1` 의 **검증 공백이 완전히 닫혔다**
(API 2분기 + UI 2요소).

---

## 5. 선행 CHECK 정정

`CHECK-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1 §7-4` 를 정정했다.

| 원문 | 정정 |
|------|------|
| "프론트가 `settings:read` 를 요구하는데 `platform:super_admin` 이 매핑되지 않는다 — 기존 문제" | **오진.** `permissions` 가 비어 있어 역할 게이트로 가고 `platform:super_admin` 은 `ADMIN_LEVEL_ROLES` 에 포함되어 **통과**한다 |
| "UI 렌더 미관측" | **관측 완료** (§4 전 항목 PASS) |
| 후속 후보 5번 (P2) | **철회** — 결함 아님 |

---

## 6. 변경 없음 선언

```
코드 변경 0 · 프론트 권한 매핑 변경 0 · 백엔드 권한 정책 변경 0
role DB 변경 0 · 사용자 role 부여 0 · 비밀번호 정책 변경 0
migration 0 · 배포 0 · typecheck/build 불요(변경 없음)
운영 계정 비밀번호 실질 변경 0 (동일값 재설정 후 재로그인 200 확인)
git 변경 = 본 CHECK 1건 + 선행 CHECK 정정 1건 (비밀번호 미기록)
```

---

## 7. 후속

| # | 내용 | 등급 |
|:-:|------|:---:|
| 1 | `hasRequiredPermissions` 의 fallback(`permissions` 비면 역할 게이트)은 **임시 정책**이라 코드 주석에 명시돼 있다. 백엔드가 `permissions` 를 채우기 시작하면 `settings:read` 미포함 시 **이번에 오진했던 차단이 실제로 발생**한다 → permission 공급 체계 도입 시 route 선언과 함께 점검 | P2 |
| 2 | `WO-O4O-AUTH-ACCOUNT-ACTIVITIES-EMAIL-MAPPING-V1` (`account_activities.email` 엔티티 미매핑) | P3 |
| 3 | `WO-O4O-AUTH-FAILURE-RATE-DASHBOARD-SUCCESS-COLUMN-AUDIT-V1` | P3 |
| — | 과거 `success=true` 오집계 1,710건 backfill | 당장 안 함 |

---

*결과: `HOLD`(수정 불필요) · 오진 정정 · UI smoke 완료로 선행 WO 검증 공백 종료 · 코드/배포 변경 0*
