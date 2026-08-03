# CHECK — WO-O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1

> 감사 본문: [O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1.md](../audits/O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1.md)
> 판정: **CRITICAL_ACCESS_RISK**
> 일자: 2026-08-03

---

## ① 시작 시점 branch / HEAD / git status

| 항목 | 값 |
|---|---|
| branch | `main` |
| HEAD (감사 시작) | `0cd84b7d0b6ef392ea44cad7bb5feb96ae17c5d9` |
| git status (시작) | clean |
| HEAD (문서 작성 시점) | `3a9dde01653d1a0da2fc0c4ced77b1f0224d6110` — **다른 세션이 커밋함** |
| git status (문서 작성 시점) | `?? apps/api-server/src/scripts/easy-drug-ko-rebuild-pilot/` — **다른 세션 작업물, 미접촉** |
| `HEAD...origin/main` | `0 0` |
| remote | `https://github.com/Renagang21/o4o-platform.git` |

> 감사 착수 시점에는 clean 이었고, 이번 작업은 **read-only + 문서 2건**이므로 경로가 완전히 분리된다.
> 다른 세션의 untracked 디렉터리는 조회조차 하지 않았다.

## ② 조사한 앱·경로

| 계층 | 경로 |
|---|---|
| 메뉴 | `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx`, `src/config/rolePermissions.ts`, `src/hooks/useAdminMenu.ts` |
| 프런트 route | `apps/admin-dashboard/src/App.tsx`, `src/routes/*.tsx` (14개), `packages/auth-context/src/AdminProtectedRoute.tsx` |
| 백엔드 | `apps/api-server/src/bootstrap/register-routes.ts`, `bootstrap/membership-admin-guard.ts`, `common/middleware/auth/authorization.middleware.ts`, `services/auth/auth-context.helper.ts`, `modules/auth/services/role-assignment.service.ts`, `routes/**`, `modules/**` |
| 패키지 | `packages/membership-yaksa/src/backend/routes/*` |
| 문서 | `docs/rbac/RBAC-ROLE-CATALOG-V1.md` |

## ③ 실제 역할 목록 (추정 아님)

- 백엔드 `enum UserRole` (`types/auth.ts`): `platform:super_admin`, `platform:admin`, `operator`, `manager`, `vendor`, `seller`, `supplier`, `partner`, `affiliate`, `business`, `user`, `customer`
- `packages/types/src/auth.ts` 의 `UserRole` = **`string`** (타입 제약 없음)
- RBAC 단일 소스 = `role_assignments` (F9)
- 서비스 접두: `kpa:`, `neture:`, `glycopharm:`, `glucoseview:`, `cosmetics:` × `:admin` / `:operator`
- `requireAdmin` 허용 = **`platform:admin`, `platform:super_admin` 2종뿐**
- 프런트 선언 실측 분포: `admin` 69 / `super_admin` 20 / `operator` 8 / `seller` 6 / `supplier` 6 / `partner` 2 / `affiliate` 1 / `platform:super_admin` 1 / `platform:admin` 1 / **`platform_admin`(존재하지 않는 값) 1**

## ④ 인증정보 전달 구조

`injectRolesIntoPublicData(publicData, roles, memberships)`
→ `publicData.roles = roles`(원문 문자열 배열), `publicData.role = roles[0] || 'user'`, `publicData.memberships`.
`roles` 는 `roleAssignmentService.getRoleNames` → `getActiveRoles`(**ORDER BY 없음**).
JWT `JWTPayload` 는 **단수 `role`** 필드를 가진다(복수 역할은 publicData 경유).

## ⑤ 메뉴 권한 구조

`hasMenuPermission` 은 **ALLOW BY DEFAULT** — `menuPermissions` 에 항목이 없으면 `true`.
menu leaf **48건 중 게이트 설정은 3건**(`dashboard`(무제한), `core-users`, `core-membership-categories`).
동적 메뉴 `GET /api/v1/navigation/admin` 은 `data: []` 스텁이므로 정적 트리 + 로컬 게이트가 유일 경로.

## ⑥ route 권한 구조

`AdminProtectedRoute`:
- `requiredRoles: ['admin']` → `super_admin`/`operator`/`platform:admin`/`platform:super_admin` 자동 확장
- `matchesRole` 이 `role.endsWith(':admin') || role.endsWith(':operator')` 를 **무조건 허용**
- `requiredPermissions` 는 **permission 을 검사하지 않음** — `isDashboardRole` 로 축약
- `App.tsx` 가 관리자 shell **전체**를 `requiredRoles={['admin']}` 로 감쌈

route 선언 총 **223건** (`requiredRoles` 76 / `requiredPermissions` 90 / 나머지 무선언).
메뉴 48 leaf 중 최상위 route 선언이 없는 10건은 전부 **부모 wildcard/중첩 route** 로 도달 확인 → **dead menu link 0건**.

## ⑦ 백엔드 guard 구조

`/api/v1` 전역 인증 미들웨어 **없음**. 라우터 내부 guard 가 유일 방어선.
`admin` / `operator` / `service-admin` mount **39건 전수 추적**(정적 import + 동적 `await import` + factory 바인딩 모두 해소, 미해소 0건).
guard: `requireAdmin` 6 · `requireRole` 27 · `require*Scope` 3 · **없음 1**.

## ⑧ 매핑 수

| 항목 | 수 |
|---|---:|
| menu leaf | 48 |
| menu 게이트 설정 | 3 |
| 프런트 route 선언 | 223 |
| admin/operator/service-admin mount | 39 |
| 프로덕션 비로그인 GET 실측 | 11 |

## ⑨ 불일치 수

| 불일치 유형 | 건수 |
|---|---:|
| 메뉴 게이트 없음(전원 노출) | 46 / 48 |
| `requiredPermissions` 선언했으나 미검사 | 90 |
| `requiredRoles` 선언이 `*:admin` 광역 허용으로 무력화 | 76 (전건) |
| 백엔드 guard 부재 mount | 1 (`/api/v1/service-admin`) |
| 패키지 mount 중 guard 밖 subtree | 4 (membership) |
| 존재하지 않는 역할·permission 표기 | 6 (`platform_admin` 1 + `requiredPermissions=['admin']` 5) |
| 프런트 호출 경로 결함 | 4 (dead call 1 + 이중 접두 3) |

## ⑩ P0~P4 분류

| 등급 | 건수 | 항목 |
|:---:|:---:|---|
| **P0** | 4 | `/api/v1/service-admin/*` 무인증(200) / `/membership/organizations/:id/members` 무인증(200) / `/membership/audit-logs` 무인증(500) / `/membership/license-verification/*` 무인증(500) |
| P1 | 1 | `/membership/organizations/:id/members` 의 organizationId 요청자 지정 (P0-2 재분류) |
| P2 | 3 | `matchesRole` 광역 허용 / `requiredPermissions` 미검사 / 메뉴 ALLOW-BY-DEFAULT |
| P3 | 3 | `getActiveRoles` 정렬 부재 / `audit-logs/member/:id` dead call / 이중 `/api` 접두 3건 |
| P4 | 4 | `platform_admin` 오타 / `requiredPermissions=['admin']` 5건 / RBAC 카탈로그 stale / 도달 불가 seller·supplier route 15건 |

## ⑪ 서비스·조직 경계 결과

- **메뉴·route 계층에는 서비스 경계가 사실상 없다** — 임의 `*:admin` / `*:operator` 가 Admin Dashboard 전 영역 진입 가능(코드 근거 확정).
- **데이터 계층에만 경계가 있다** — 라우터별 `requireRole`, 일부 `injectServiceScope`.
- 읽기/쓰기 분리 정책은 없다(동일 guard 공유).
- 따라서 "화면 진입만 가능 vs 실제 데이터 접근"은 **명확히 분리되며**, §5 P0 경로를 제외하면 데이터는 보호된다.

## ⑫ 알려진 5경로 결과

| 경로 | 분류 |
|---|---|
| `/admin/membership/categories` | **정상** (선행 3 WO 로 해소) |
| `/membership/me` | **API prefix·route 결함** (실경로는 `/membership/members/me`) |
| `/members/me` | **정상** — 비로그인 401 |
| `/members/me/summary` | **정상** — 비로그인 401 |
| `audit-logs/member/:id` | **route 결함 + 상위 subtree guard 부재(P0-3)** |

→ **공용 단일 원인 없음.** 사전 가정하지 않고 개별 판정했다.

## ⑬ 공용 결함 vs 개별 화면 결함

- **공용**: membership mount guard 설계(P0-2·3·4), `AdminProtectedRoute`(P2-1·2), 메뉴 게이트 정책(P2-3), 역할 정렬(P3-1)
- **개별**: `service-admin` 라우터(P0-1), MemberDetail audit-log 호출(P3-2), 이중 접두 3건(P3-3), route 선언 오타(P4-1·2)
- **문서·운영**: RBAC 카탈로그 stale(P4-3), 도달 불가 route(P4-4), 테스트 계정 부재

## ⑭ 테스트 계정 실측 범위

- `docs/local/TEST-ACCOUNTS.local.md` **존재 확인** — 파일 존재 여부와 줄 수(50)만 확인, **내용 미출력**
- `platform:admin` / `platform:super_admin` 문자열 **미검색** → 플랫폼 관리자 테스트 계정 미등록
- 로그인 실측 **0회** — 이번 감사는 전부 **비로그인 + 정적 분석**으로 수행
- 역할 부여·변경 **0건**

## ⑮ 미검증

1. `platform:admin` / `platform:super_admin` 로그인 상태 실동작
2. `kpa:admin` 로그인 후 Admin Dashboard 진입 브라우저 실측 (코드 근거로만 확정)
3. `PUT /service-admin/theme` · `POST /service-admin/theme/reset` 무인증 쓰기 성립 여부 (**쓰기 금지 — 의도적 미검증**)
4. 유효 organizationId 로 회원 명부가 실제 반환되는지 (**보호 데이터 열람 금지 — 의도적 미검증**)
5. `role_assignments` 실 데이터의 무접두 역할 잔존 여부 (**직접 SQL 금지**)
6. Cloud Run 직접 URL 전 경로 404 의 원인 (도메인 라우팅 구성) — 이번 범위 밖

## ⑯ 운영 DB write

**0건.** 직접 SQL 실행 0회, Cloud SQL Proxy 기동 0회, HTTP 쓰기 요청(POST/PUT/PATCH/DELETE) 0건.
프로덕션 요청은 **비로그인 GET 11건**, 상태 코드만 취득(응답 본문 열람 0).

## ⑰ 소스 변경 / 배포

소스 코드 변경 **0건**, 빌드 실행 **0건**(WO 지시), 배포 **0건**.
생성 파일은 감사 문서 2건뿐. 스크래치 스크립트는 `c:/tmp/` 에만 작성(저장소 밖).

## ⑱ 후속 WO 우선순위

1. `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1` (P0-1)
2. `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1` (P0-2·3·4, P1)
3. `WO-O4O-ADMIN-API-GUARD-COVERAGE-REGRESSION-TEST-V1` (재발 방지)
4. `WO-O4O-ADMIN-PROTECTED-ROUTE-ROLE-SEMANTICS-V1` (P2-1·2, 공유 모듈 프로토콜 적용)
5. `WO-O4O-ADMIN-MENU-PERMISSION-DECLARE-V1` (P2-3)
6. `WO-O4O-MEMBER-DETAIL-AUDIT-LOG-ROUTE-FIX-V1` (P3-2)
7. `WO-O4O-ADMIN-API-PREFIX-RESIDUAL-SWEEP-V1` (P3-3, 기존 추적)
8. `WO-O4O-ROLE-ORDER-DETERMINISM-V1` (P3-1)
9. `WO-O4O-ADMIN-TEST-ACCOUNT-MATRIX-V1` → 이후 회원 분류 생애주기 프로덕션 검증

## ⑲ 문서·CHECK commit / push

- `docs/audits/O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1.md`
- `docs/checks/WO-O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1-CHECK.md`

두 파일만 **정확한 pathspec** 으로 commit → `main` push. (결과 해시는 최종 보고 참조)

## ⑳ 최종 git status

commit 후 잔여는 다른 세션의 `?? apps/api-server/src/scripts/easy-drug-ko-rebuild-pilot/` 뿐이어야 한다(미접촉 유지).

## ㉑ lockfile · 타 세션 작업물 미접촉

`pnpm-lock.yaml` 미접촉. HFF·OTC·다국어·태블릿 관련 파일 **읽기·쓰기 모두 0건**.
다른 세션의 untracked 디렉터리 stage·수정·삭제·stash·revert **0건**.

## ㉒ 비밀번호·토큰·개인정보 출력·기록

**0건.** 테스트 계정 파일은 존재 여부·줄 수·역할 문자열 유무만 확인했고 내용을 출력하지 않았다.
프로덕션 응답 본문은 한 건도 읽지 않았다. 실측에 사용한 UUID 는 전부 `00000000-…`(존재하지 않는 값)이다.

## ㉓ 다른 세션 Cloud SQL Proxy 종료

**0건.** 이 세션은 Proxy 를 기동하지도 종료하지도 않았다. 프로세스명 일괄 종료 명령 미사용.

---

## 최종 판정

**CRITICAL_ACCESS_RISK**

프런트 계층의 불일치는 대부분 P2(화면 골격만 노출, 데이터는 403)이나,
**백엔드에 인증 guard 가 전혀 없는 관리자 mount 4개 subtree** 가 실재하고
그중 2개는 프로덕션에서 **비로그인 GET 200** 으로 확인됐다.
WO 판정 기준 "보호 데이터가 노출되면 P0 또는 P1 로 상향한다" 에 해당하므로 최상위 판정을 적용한다.
