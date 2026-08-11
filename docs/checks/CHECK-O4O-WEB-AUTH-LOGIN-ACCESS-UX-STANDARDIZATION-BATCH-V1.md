# CHECK-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1

> WO: `WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1`
> 대상: `services/web-neture` · `web-kpa-society` · `web-glycopharm` · `web-k-cosmetics` · `web-pharmacy-hub`
> 작성: 2026-08-11

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 HEAD | `447f486ca` (clean · `HEAD == origin/main`) |
| 직전 batch | `WO-O4O-WEB-API-WRAPPER-FAILURE-CONTRACT-BATCH-V1` (CLOSED / PASS) |

## 2. 서비스별 auth/guard 조사표

### 2-1. guard 구조 (공통 Core)

4개 서비스의 일반 RoleGuard 는 `@o4o/auth-react` 의 `createRouteGuard` 를 공유한다.
판정 순서는 Core 고정: `isLoading → !isAuthenticated → redirectMap → allowedRoles/isAllowed → MembershipGate`.
**이번 배치는 Core 를 수정하지 않았다.** Core 가 이미 제공하는 주입점(`renderDenied`)만 서비스에서 채웠다.

### 2-2. 축별 판정

| 서비스 | guard | 착수 전 role 거부 동작 | 라벨 |
|---|---|---|---|
| web-neture | `RoleGuard`/`RouteGuard` (createRouteGuard) | `renderDenied` 미주입 → 무안내 `Navigate('/')` | `FIX_SILENT_HOME_REDIRECT` |
| web-neture | `AdminVaultLayout` | 미인증·권한없음을 **한 덩어리로** 무안내 `Navigate('/')` | `FIX_SILENT_HOME_REDIRECT` |
| web-kpa-society | `RoleGuard` | `accessDeniedMessage` 있으면 카드, 없으면 `null` → 무안내 `Navigate('/')` | `FIX_SILENT_HOME_REDIRECT` |
| web-glycopharm | `RoleGuard` | `renderDenied` 미주입 → 무안내 `Navigate('/')` | `FIX_SILENT_HOME_REDIRECT` |
| web-glycopharm | `GlycoHubGuard` | 매장역할·operator 아님 → 무안내 `Navigate('/')` | `FIX_SILENT_HOME_REDIRECT` |
| web-glycopharm | `SoftGuard` (App.tsx) | role 불일치 → 무안내 `Navigate('/')` | `FIX_SILENT_HOME_REDIRECT` |
| web-k-cosmetics | `RoleGuard` | `renderDenied` 미주입 → 무안내 `Navigate('/')` | `FIX_SILENT_HOME_REDIRECT` |
| web-pharmacy-hub | `LoginPage` | guard 가 넘긴 `state.from` 을 버리고 항상 `/` | `FIX_MESSAGE_STANDARDIZE`(로그인 복귀 축) |
| web-kpa-society | `ContentHubPage` 삭제 | 직전 batch `HOLD_POLICY` — DELETE 실패 삼킴 | `FIX_MESSAGE_STANDARDIZE` |

### 2-3. 이미 정합해 손대지 않은 것 (VALID)

| 대상 | 라벨 | 근거 |
|---|---|---|
| 4개 서비스 `MembershipGate` (none/pending/rejected/suspended/withdrawn) | `VALID_MEMBERSHIP_GUIDE` | 상태별 제목·문구·CTA 가 이미 4서비스 동일 문안으로 정렬돼 있다 |
| pharmacy-hub `MembershipGate` | `VALID_MEMBERSHIP_GUIDE` | 로그인 필요 / 이용 권한 없음 / 상태별 다음 행동 링크 모두 존재 |
| kpa `PharmacistOnlyGuard` · `PharmacyOwnerOnlyGuard` | `VALID_ACCESS_DENIED` | 이미 "접근 권한이 없습니다" 카드 + 로그인하기 |
| 미인증 → `Navigate(fallback, state.from)` (Core · `StoreOwnerGuard` · `HubGuard` · `GlycoHubGuard`) | `VALID_LOGIN_REDIRECT` | 복귀 경로 보존이 이미 공통 계약 |
| neture/kpa 모달 로그인(`LoginRedirect`/`LoginRoute`) · glyco/kcos `LoginPage` | `VALID_LOGIN_REDIRECT` | `state.from`/`returnUrl` 복원 확인 |
| kpa `HubGuard` operator → `/operator`, `GlycoHubGuard` operator → `/operator`, neture `redirectMap` | `VALID_LOGIN_REDIRECT` | 거부가 아니라 **역할별 정상 분기**다. 안내 화면으로 바꾸면 오히려 회귀 |
| App.tsx 의 은퇴 경로 `<Route ... element={<Navigate to="/" />}>` (kpa 4 · neture 5 · glyco 1) | 대상 아님 | auth 거부가 아니라 route 은퇴 redirect |

## 3. 수정한 guard/fallback/문구

| # | 파일 | 내용 |
|---|---|---|
| 1 | `web-neture/src/components/auth/AccessDenied.tsx` (신규) | 서비스 내부 최소 구현. 공통 패키지 승격하지 않음 |
| 2 | `web-glycopharm/src/components/auth/AccessDenied.tsx` (신규) | 동일 |
| 3 | `web-k-cosmetics/src/components/auth/AccessDenied.tsx` (신규) | 동일 |
| 4 | `web-neture/.../auth/RoleGuard.tsx` | `renderDenied` 주입 |
| 5 | `web-glycopharm/.../auth/RoleGuard.tsx` | `renderDenied` 주입 |
| 6 | `web-k-cosmetics/.../auth/RoleGuard.tsx` | `renderDenied` 주입 |
| 7 | `web-kpa-society/.../auth/RoleGuard.tsx` | `message` 없을 때 `null` 반환 대신 표준 기본 문구로 카드 렌더 |
| 8 | `web-neture/.../layouts/AdminVaultLayout.tsx` | 미인증 → `/login`(+`state.from`) / 권한없음 → 안내 화면으로 **분리** |
| 9 | `web-glycopharm/.../auth/GlycoHubGuard.tsx` | 최종 거부를 안내 화면으로 |
| 10 | `web-glycopharm/src/App.tsx` `SoftGuard` | role 불일치를 안내 화면으로 |
| 11 | `web-pharmacy-hub/src/pages/LoginPage.tsx` | `state.from` 복원 — 로그인 후 원래 경로 복귀 |
| 12 | `web-kpa-society/.../signage/ContentHubPage.tsx` | DELETE 실패 삼킴 제거 → 모달 유지 + 실패 사유 표시 (직전 batch `HOLD_POLICY` 해소) |

표준 문구:

```text
접근 권한이 없습니다
현재 계정으로는 이 기능을 사용할 수 없습니다.
```

`accessDeniedMessage` 를 지정한 route(KPA 운영자 등)는 기존 개별 문구를 그대로 유지한다 — 더 구체적인 안내가 표준 문구보다 낫다.

**판정 로직 무변경 확인**: allowedRoles / isAllowed / membership 판정 / redirectMap / 미인증 fallback 경로는 한 줄도 바꾸지 않았다. 바뀐 것은 "거부를 어떻게 보여주는가" 뿐이다.

## 4. HOLD 항목과 이유

| # | 대상 | 라벨 | 이유 | 다음 방법 |
|---|---|---|---|---|
| H1 | `@o4o/store-ui-core` `StoreOwnerGuard` — `denialFallback = '/'` | `HOLD_AUTH_CONTRACT` | KPA·GlycoPharm·K-Cosmetics·Pharmacy-Hub 4서비스 공유 guard 이고 `renderDenied` 같은 주입점이 없다. 안내 화면을 넣으려면 공통 패키지 계약 변경이 필요 — WO §5 "다른 서비스 전체 guard 동작을 바꾸는 고위험 변경" | optional `renderDenied` prop 추가 + 소비처 4서비스 전수 확인(CLAUDE.md Shared Module Change Rule) 별도 WO |
| H2 | `web-kpa-society` `AuthGate` → `/pending-approval` redirect | `HOLD_POLICY` | 거부가 아니라 **승인 대기 상태 라우팅 정책**이다. 안내 화면으로 바꾸면 승인 대기 동선 자체가 바뀐다 | 회원 상태 축(users.status ↔ membership.status) 정리 배치에서 함께 판단 |
| H3 | `web-glycopharm` `SoftGuard` 미인증 시 `FeatureIntroPage` | `HOLD_POLICY` | 미인증에게 기능 소개를 보여주는 것이 의도된 마케팅 동선. 로그인 안내로 대체하면 정책 변경 | 서비스 소유자 판단 필요 |

## 5. 로그인 필요 smoke

| # | 대상 | 기대 | 결과 |
|---|---|---|---|
| L1 | neture 비로그인 `/supplier/dashboard` | 로그인 모달(returnUrl 보존) | (§10 실측 참조) |
| L2 | kpa 비로그인 `/mypage` | `/login` + `state.from` | (§10) |
| L3 | pharmacy-hub 비로그인 `/store-owner` | `/login` 이동, 로그인 후 원래 경로 복귀 | (§10) |
| L4 | k-cosmetics 비로그인 보호 route | `/login` 이동 | (§10) |

## 6. 권한 없음 smoke

| # | 대상 | 기대 | 결과 |
|---|---|---|---|
| D1 | neture 공급자 세션 → `/operator/product-service-approvals` | **무안내 홈 redirect 대신 "접근 권한이 없습니다" 안내** | (§10) |
| D2 | glycopharm 권한 없는 세션 → `/operator` | 안내 화면 | (§10) |
| D3 | k-cosmetics 권한 없는 세션 → `/operator` | 안내 화면 | (§10) |

## 7. 정상 route 회귀

| # | 대상 | 기대 | 결과 |
|---|---|---|---|
| R1 | neture 공급자 `/supplier/dashboard` | 정상 렌더 | (§10) |
| R2 | 5개 서비스 홈 | 정상 렌더 | (§10) |
| R3 | 없는 route | 404 안내 | (§10) |

## 8. typecheck / build / deploy 결과

| 서비스 | typecheck | build | deploy |
|---|---|---|---|
| web-neture | PASS | PASS | (§10) |
| web-kpa-society | PASS | PASS | (§10) |
| web-glycopharm | PASS | PASS | (§10) |
| web-k-cosmetics | PASS | PASS | (§10) |
| web-pharmacy-hub | PASS | PASS | (§10) |

API 서버 배포 없음.

## 9. commit SHA

(§10 에서 기재)

## 10. push 결과

(§10 에서 기재)

## 11. 변경하지 않은 것

```text
인증 로직 · 권한/role 판정 · membership 판정 · serviceKey 계약
backend · API endpoint · DB write · migration
route 정의 (추가/삭제/경로 변경 0)
공통 패키지 (@o4o/auth-react · @o4o/store-ui-core · @o4o/auth-utils) 무변경
```
