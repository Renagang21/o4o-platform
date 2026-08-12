# CHECK — WO-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1 (최종 종료 검증)

- **WO**: [`WO-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1`](../work-orders/WO-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1.md)
- **선행 CHECK (2026-08-10, 구현 기록)**: [`CHECK-...-V1.md`](CHECK-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1.md)
- **실행일**: 2026-08-12
- **작업 방식**: 별도 worktree `C:/tmp/o4o-frontend-auth-deployability` + 전용 branch `work/frontend-auth-commonization-deployability-v1` (기준 `origin/main`). 기본 checkout `main` 무수정.
- **판정**: **PASS — 코드 변경 0건.** 선행 CHECK 의 미완 항목 2건이 모두 해소됐음을 확인하고 트랙을 종료한다.

---

## 1. WO 전제 재확인 — 선행 branch 는 이미 main 에 반영되어 있다

| 확인 | 결과 |
|---|---|
| `git branch -a` 에 `work/frontend-auth-commonization` | **0건** |
| `git ls-remote --heads origin` 에 동일 branch | **0건** |
| `f05cb81c0` (auth-react 도입) | `origin/main` **ancestor** |
| `329174ba4` (5개 서비스 소비처 전환) | `origin/main` **ancestor** |

→ WO 실행 항목 11(branch 정리)은 **정리 대상 없음**. 병합·삭제가 이미 끝난 상태다.

## 2. `packages/auth-react` 구조 (재확인)

`src/` — `index.ts` · `types.ts` · `useServiceAuth.ts` · `createRouteGuard.tsx` · `useRoleSelection.ts` + `__tests__/` 3파일.
계층: `@o4o/auth-client`(transport) → `@o4o/auth-utils`(순수 판정) → **`@o4o/auth-react`(React 런타임)**. `@o4o/auth-context` 는 admin-dashboard 전용으로 본 WO 무접촉.
소스 내 **서비스명 분기 0건** (JSDoc 예시 문자열만 존재) — 차이는 전부 `ServiceAuthConfig` 주입으로 표현.

## 3. Dockerfile 배포 가능성 — 누락 0건

선행 WO 가 넣은 2줄 × 5가 main 에 그대로 존재한다.

| 서비스 | deps stage | build stage |
|---|---:|---:|
| web-kpa-society | L25 | L66 |
| web-neture | L26 | L60 |
| web-k-cosmetics | L23 | L56 |
| web-glycopharm | L25 | L60 |
| web-pharmacy-hub | L32 | L61 |

추가로 `auth-react` 만이 아니라 **각 서비스의 transitive `workspace:*` 의존 전량**과 Dockerfile COPY 목록을 스크립트로 대조했다.

| 서비스 | 필요 | COPY | 누락 |
|---|---:|---:|---|
| kpa-society | 29 | 30 | **0** (`hub-core` 1건 여분) |
| neture | 22 | 22 | **0** |
| k-cosmetics | 22 | 22 | **0** |
| glycopharm | 24 | 24 | **0** |
| pharmacy-hub | 13 | 13 | **0** |

## 4. AuthContext / RoleGuard 채택 현황

| 서비스 | AuthContext | serviceKey | RoleGuard |
|---|---|---|---|
| web-kpa-society | `useServiceAuth` (443L) | `kpa-society` | `createRouteGuard` (43L) |
| web-neture | `useServiceAuth` + `useRoleSelection` (111L) | `neture` | `createRouteGuard` (180L) |
| web-k-cosmetics | `useServiceAuth` (143L) | `k-cosmetics` | `createRouteGuard` (92L) |
| web-glycopharm | `useServiceAuth` (228L) | `glycopharm` | `createRouteGuard` (57L) |
| web-pharmacy-hub | `useServiceAuth` (90L) | `SERVICE_KEY` | 컴포넌트 없음(역할 판정 인라인) |

- `services/web-account` 는 `@o4o/auth-react` 미소비(참조 0건). WO 5개 서비스 범위 밖이고 Dockerfile 이 `COPY packages/` 일괄 방식이라 배포 리스크 없음 → **관측만, 수정 없음**.

## 5. typecheck / build / test

| 대상 | typecheck | build |
|---|---|---|
| `packages/auth-react` | PASS | — |
| `services/web-kpa-society` | PASS | PASS |
| `services/web-neture` | PASS | PASS |
| `services/web-k-cosmetics` | PASS | PASS |
| `services/web-glycopharm` | PASS | PASS |
| `services/web-pharmacy-hub` | PASS | PASS |
| `apps/admin-dashboard` | PASS | PASS |

- `packages/auth-react` vitest — **Test Files 3 passed / Tests 44 passed** (선행 CHECK 시점 2 files / 36 tests 대비 증가).
- 신규 worktree 첫 회차 typecheck 는 `TS2307 Cannot find module '@o4o/*'` 로 실패했다. 원인은 공통 패키지 `dist` 미빌드이며 `pnpm run build:packages` 후 전량 PASS. **결함 아님 — 신규 worktree 선행 절차**다.

## 6. Docker / CI 빌드 경로

- 로컬 실 Docker 빌드: `docker build --platform linux/amd64 -f services/web-pharmacy-hub/Dockerfile .` → **exit 0**, 이미지 `o4o-local-verify/pharmacy-hub-web:wo-auth-deployability` 생성.
- `deploy-web-services.yml` `detect-changes` 는 `packages/**` 변경 시 5개 웹 서비스를 전량 재빌드한다 (`grep -q "^packages/"`).
- **선행 CHECK §5 후속 권고 해소 확인** — `.github/workflows/e2e-auth-runtime.yml` L25 에 `packages/auth-react/src/**` 가 **이미 등록**돼 있다. 추가 조치 불필요.

## 7. 프로덕션 인증 · 권한 smoke (실 브라우저)

계정은 [`docs/local/TEST-ACCOUNTS.local.md`](../local/TEST-ACCOUNTS.local.md) 참조 — 본 문서에 값 미기록.

| 서비스 | 로그인 | 로그아웃 | 미인증 401 처리 | 권한 차단 | serviceKey 근거 |
|---|---|---|---|---|---|
| KPA-Society | PASS → `/admin/kpa-dashboard` | PASS | PASS (`auth/me` 401 → `refresh` 401 → 토큰 정리) | PASS ×2 — 미로그인 "로그인이 필요합니다" / store_owner 계정 "지부 관리자 권한이 없습니다." | 사용자 메뉴 `KPA 서비스 · 서비스 관리자 (kpa:admin)` |
| Neture | PASS → `/supplier/dashboard` (returnTo 복원) | PASS (localStorage 토큰 0) | PASS | PASS — 미로그인 `/supplier/dashboard` → `/` + 로그인 모달 | 공급자 컨텍스트 `(주)네뚜레 공급자 테스트` 정상 로드 |
| K-Cosmetics | PASS → `/operator` (returnTo 복원) | PASS (localStorage 0) | PASS | PASS — 미로그인 `/operator` → `/login` | `auth/me` roles `cosmetics:admin` · `cosmetics:operator` |
| GlycoPharm | PASS → `/admin` | PASS (localStorage 0) | PASS | PASS — 미로그인 `/operator` → `/` + 로그인 모달 | `glycopharm:admin` 대시보드 진입 |
| Pharmacy-Hub | **PASS ×2** (operator · store_owner) | PASS (localStorage 0) | PASS | PASS — 미로그인 `/operator` "로그인이 필요합니다" / 역할 미보유 `/supplier` "이 역할이 부여되지 않았습니다" | 화면 표기 `pharmacy-hub:operator` |

→ **선행 CHECK §4-3 의 "Pharmacy-Hub 로그인 이후 동선 미검증" 제한 사항이 해소됐다.**
`TEST-ACCOUNTS.local.md` 에 Pharmacy-Hub 서비스 credential(L2)이 등재된 뒤 operator · store_owner 두 역할 모두 로그인 → 역할 화면 → 로그아웃까지 실측했다.

### 7-1. 발견 (본 WO 범위 외 — 수정하지 않음)

1. **Pharmacy-Hub `/store-owner/*` — 역할 미보유 시 ErrorBoundary 노출.**
   `pharmacy-hub:store_owner` 없는 계정으로 `/store-owner/account` 진입 시
   `GET /api/v1/pharmacy-hub/store-owner/account/profile` 403 → `Minified React error #31` → "문제가 발생했습니다" 일반 오류 화면.
   같은 서비스 `/supplier` 는 "이 역할이 부여되지 않았습니다" 안내를 정상 표시하므로 **StoreOwnerShell 계열만 권한 안내 UX 미정렬**이다.
   인증 공통화(auth-react)와 무관한 별개 결함 → **별도 WO 제안**.
2. KPA `/admin/kpa-dashboard` 콘솔 404 4건 — `policies/terms` · `policies/privacy` 등 **미게시 정책 문서** 조회. 기존 관측이며 인증과 무관.

## 8. backend / auth DB 계약 변경 0 확인

```
git diff --name-only origin/main -- apps/api-server packages/auth-client packages/auth-utils packages/auth-context
→ 0건
```
migration · entity · API 계약 변경 **0건**.

## 9. 결론

- 본 회차 코드 변경 **0건**. WO 가 요구한 보완 대상은 실행 시점에 이미 main 에 반영돼 있었다.
- 5개 서비스 + admin-dashboard typecheck · build 전량 PASS, 프로덕션 인증/권한 smoke 전량 PASS.
- 선행 CHECK 의 미완 2건(Pharmacy-Hub 로그인 미검증 · e2e path filter 누락) 모두 해소 확인.
- 선행 branch `work/frontend-auth-commonization` 는 로컬·원격 모두 부재 → 정리 대상 없음. worktree 는 검증 후 제거.

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§7-1 Pharmacy-Hub `/store-owner/*` 권한 안내 UX)
