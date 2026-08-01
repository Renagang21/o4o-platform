# WO-O4O-ADMIN-AUTH-STATUS-ENVELOPE-FIX-V1 — CHECK

> **선행**: `docs/investigations/IR-O4O-ADMIN-DEEP-LINK-REFRESH-AUTH-BOOTSTRAP-V1.md` (commit `5dc8a8a34`)
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `b8ddda3b7`

---

## 1. 작업 기준

| 항목 | 값 |
|---|---|
| 대상 패키지 | **`packages/auth-context`** (공용) |
| 소비 앱 | `admin-dashboard`(cookie) · `forum-web`(localStorage) · `main-site`(localStorage) |
| 변경 파일 | **1** (`src/AuthProvider.tsx`) |
| 백엔드·hosting·route·권한·DB 변경 | **0** |

시작 시 작업 트리 clean. 조사 문서에서 확정한 코드 구조가 현재 main 과 **일치**함을 확인(중지 조건 #1 미해당).

---

## 2. 확정 원인

```
백엔드  auth-account.controller.ts:298  BaseController.ok(res, { authenticated, user })
        base.controller.ts:50-55        → { success: true, data: { authenticated, user } }
                                          (CLAUDE.md §8 표준 봉투)

프런트  AuthProvider.tsx (cookie 분기, 수정 전)
        const statusData = response.data;              // = { success, data:{...} }
        if (statusData.authenticated && statusData.user)   ← 항상 undefined
        else { setUser(null); localStorage.removeItem('admin-auth-storage'); }
                                                            ↓
        AdminProtectedRoute → navigate('/login')
```

`/auth/status` 가 **200** 으로 정상 응답하는데도 봉투를 벗기지 않아 항상 else 로 빠져
**유효한 세션 캐시를 스스로 파기**했다. 새로고침·직접 입력·새 탭 등 **모든 하드 내비게이션**에서 발생.

---

## 3. 변경 내용

`packages/auth-context/src/AuthProvider.tsx` cookie 분기만 수정.

### 3-1. 봉투/비봉투 양립

```ts
const responseBody = response.data as any;
const statusData = (responseBody?.data ?? responseBody) as any;
```

### 3-2. 세 상태 분리

```ts
const isAuthenticatedFlag =
  typeof statusData?.authenticated === 'boolean' ? statusData.authenticated : null;
```

| 상태 | 조건 | 사용자 | **캐시 삭제** |
|---|---|---|:--:|
| **A. 인증 복원 성공** | `authenticated === true` **및** `user` 존재 | 복원 | **아니오** |
| **B. 서버가 미인증 확인** | `authenticated === false` (명시적 boolean) | `null` | **예** (기존 정상 로그아웃 유지) |
| **C. 판정 불가** | 그 외 — 구조 이상 / `authenticated` 가 boolean 아님 / `true` 인데 `user` 없음 | 캐시 있으면 유지, 없으면 `null` | **아니오** |

**핵심**: `authenticated` 가 **명시적 `false`** 일 때만 캐시를 지운다.
판정 불가(C)에서는 지우지 않아, 일시적 응답 이상으로 정상 세션이 파기되지 않는다.

무한 loading·무한 redirect 방지: C 에서 캐시가 없으면 `setUser(null)` 로 확정하고,
`setIsLoading(false)` 는 분기와 무관하게 기존대로 실행된다. guard 는 자체 유예(100/500ms) 후 판단한다.

### 3-3. 무변경 확인 (diff 검증)

- `localStorage` 전략 분기 — **무변경**
- `login` 경로(봉투 처리 이미 존재) — **무변경**
- `401 interceptor` · `AdminProtectedRoute` 유예시간 · 쿠키 설정 — **무변경**

---

## 4. 범위 확인

| 항목 | 변경 수 |
|---|---:|
| 백엔드 | **0** |
| route | **0** |
| 권한·역할 | **0** |
| DB | **0** |
| 쿠키 설정 | **0** |
| hosting | **0** |
| `pnpm-lock.yaml` | **0** |

---

## 5. 응답 형태별 검증

`packages/auth-context` 에 테스트 인프라가 **없어**(test script·테스트 파일 0),
WO 지침대로 새 인프라를 만들지 않고 **판정식을 그대로 옮긴 최소 재현 검증**을 수행했다.

| # | 응답 형태 | 기대 상태 | 실제 | 캐시 삭제 | 결과 | (수정 전) |
|---|---|---|---|:--:|:--:|---|
| 1 | `{success,data:{authenticated:true,user}}` | A | A_RESTORED | false | **PASS** | ❌ SESSION_EXPIRED(캐시삭제) |
| 2 | `{authenticated:true,user}` (비봉투) | A | A_RESTORED | false | **PASS** | RESTORED |
| 3 | `{success,data:{authenticated:false,user:null}}` | B | B_UNAUTHENTICATED | **true** | **PASS** | ❌ (캐시삭제) |
| 4 | `{authenticated:false}` (비봉투) | B | B_UNAUTHENTICATED | **true** | **PASS** | (캐시삭제) |
| 5 | `{success,data:{}}` | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |
| 6 | `{success:true}` | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |
| 7 | `authenticated:true` 인데 `user` 없음 | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |
| 8 | `authenticated` 가 boolean 아님 | C | C_INDETERMINATE | false | **PASS** | ❌ (캐시삭제) |

**8 pass / 0 fail.** 수정 전 로직은 8건 중 6건에서 캐시를 잘못 삭제했다(2·4 제외).

---

## 6. 앱별 회귀 검증

| 앱 | 인증 전략 | typecheck | 코드 경로 영향 | 판정 |
|---|---|:--:|---|:--:|
| `packages/auth-context` | — | **0 error** | 변경 지점 | ✅ |
| `admin-dashboard` | **cookie** | **0 error** | 수정 대상 분기 | ✅ |
| `forum-web` | localStorage | **0 error** | cookie 분기 미진입 — 무영향 | ✅ |
| `main-site` | localStorage | **0 error** | 동일 | ✅ |

`strategy: 'cookie'` 를 쓰는 앱은 `admin-dashboard` 단독임을 재확인했다.
전체 monorepo build 는 실행하지 않았다(좁은 검증으로 충분).

---

## 7. 관리자 route 검증 (배포 후 프로덕션 read-only)

배포: `Deploy Admin Dashboard (Cloud Run)` **success** · commit `5ed18106b`

조사 IR 과 **동일한 재현 스크립트**를 그대로 재실행해 전후를 대조했다.

| route | SPA 이동 | **새로고침** | `admin-auth-storage` 유지 | `/auth/status` | 최종 |
|---|:--:|:--:|:--:|:--:|:--:|
| `/home` | ✅ | ✅ `/home` | ✅ | 200 | **PASS** |
| `/admin/ops/metrics` | ✅ | ✅ 유지 | ✅ | 200 | **PASS** |
| `/admin/platform/hub` | ✅ | ✅ 유지 | ✅ | 200 | **PASS** |
| `/admin/store-network` | ✅ | ✅ 유지 | ✅ | 200 | **PASS** |
| `/admin/physical-stores` | ✅ | ✅ 유지 | ✅ | 200 | **PASS** |

**새 탭 딥링크**: `/admin/store-network` 요청 → `/admin/store-network` 도착 (수정 전: `/login`) ✅

### 전후 대조

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 새로고침 후 URL | `/login` (5/5) | **원 route 유지 (5/5)** |
| `admin-auth-storage` | 새로고침 직후 **삭제됨** | **유지됨** |
| 네트워크 시퀀스 | `200 /auth/status` → `NAV → /login` | `200 /auth/status` (redirect 없음) |
| 새 탭 딥링크 | `/login` | **정상 진입** |

---

## 8. 실제 미인증·오류 경로 (역방향 회귀 검증)

세션이 없는 **완전히 새 브라우저 컨텍스트**로 확인했다.

| 시나리오 | 결과 |
|---|---|
| 미인증 상태로 보호 route 직접 진입 | `/admin/store-network` → **`/login` 정상 차단** ✅ |
| 그때의 `/auth/status` | **200** (`authenticated:false`) → **B 분기 정상 동작** |
| localStorage 인증 키 | **없음** (잘못 생성되지 않음) |
| **`state.from` 복귀** | 로그인 후 **`/admin/store-network` 로 정상 복귀** ✅ |
| 복귀 후 새로고침 | route 유지 ✅ |
| 화면 렌더 | `Store Network … Total Stores 3` 실데이터 |
| 콘솔 오류 | **0** |

> **`state.from` 복귀는 선행 IR 에서 미검증으로 남겼던 항목**인데 이번에 정상 동작을 확인했다.
> 즉 "미인증은 막고, 로그인하면 원래 가려던 곳으로 보낸다" 는 계약이 **회귀 없이 유지**된다.

---

## 9. typecheck · test · build · 배포

| 항목 | 명령 | 결과 |
|---|---|---|
| auth-context | `npx tsc --noEmit` | **0 error** |
| admin-dashboard | `npx tsc --noEmit -p tsconfig.json` | **0 error** |
| forum-web | 〃 | **0 error** |
| main-site | 〃 | **0 error** |
| 응답 형태 검증 | 최소 재현 스크립트 8형태 | **8 pass / 0 fail** |
| 전체 monorepo build | — | **미실행** (좁은 검증으로 충분) |
| 배포 workflow | `Deploy Admin Dashboard (Cloud Run)` | **success** |
| 배포 commit | `5ed18106b` | ✅ 프로덕션 반영 확인 |
| 백엔드 배포 | — | **불필요** (백엔드 변경 0) |
| forum-web·main-site 배포 | — | **불필요** (코드 변경 없음, 공용 패키지 cookie 분기 미진입) |

---

## 10. 운영 안전성

| 항목 | 값 |
|---|---:|
| 쓰기 endpoint 실행 | **0** |
| 운영 데이터 변경 | **0** |
| 민감정보(토큰·쿠키 값) 기록 | **0** — 이름·속성·존재 여부만 확인 |
| 권한·쿠키 설정 변경 | **0** |
| 다른 세션 작업물 접촉 | **0** (작업 중 트리에 있던 OTC json 등 미포함) |
| `pnpm-lock.yaml` | 미변경·미포함 |

---

## 11. 미검증 및 후속

- **실제 세션 만료(쿠키는 있으나 무효)** 는 직접 만들지 못해 literal 하게는 미검증이다.
  다만 그 경우 서버가 `authenticated:false` 를 반환하므로 §8 에서 검증한 **B 분기와 동일 경로**를 탄다.
- **비관리자 계정** 동작 미검증 (super_admin 1계정으로만 확인).
- **`forum-web`·`main-site` 브라우저 smoke 미실시** — 두 앱은 localStorage 전략이라 cookie 분기에
  진입하지 않고 코드 변경도 없어 typecheck + 코드 경로 분석으로 갈음했다.
- `unified-client.ts` 의 401 interceptor 경로는 이번 재현에서 발동하지 않아 미검증(기존과 동일).

---

## 12. 최종 판정

| 항목 | 결과 |
|---|:--:|
| 새로고침 문제 해결 | ✅ **해결** (5/5) |
| 직접 입력·새 탭 해결 | ✅ **해결** |
| 실제 미인증 동작 유지 | ✅ **유지** (정상 차단 + `state.from` 복귀) |
| 다른 소비 앱 회귀 | ✅ **없음** (typecheck 3앱 0 error, 코드 경로 미진입) |
