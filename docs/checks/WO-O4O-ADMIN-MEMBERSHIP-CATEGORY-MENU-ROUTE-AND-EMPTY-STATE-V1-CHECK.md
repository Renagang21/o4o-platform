# WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-MENU-ROUTE-AND-EMPTY-STATE-V1 — CHECK

**작업명**: Admin Dashboard 회원 분류 관리 메뉴·라우트 연결 및 0건 빈 상태 정비
**판정**: **PASS (조건부 — platform 관리자 실측 미검증)**
**작업일**: 2026-08-03

---

## 1. 시작 시점 branch / HEAD / git status

| 항목 | 값 |
|------|-----|
| branch | `main` |
| HEAD | `f6d977c1b95f33737a9e172c57cbb57a92b78a8b` |
| origin/main 동기화 | `git rev-list --left-right --count HEAD...origin/main` → `0 0` (pull no-op) |
| `pnpm install --frozen-lockfile` | exit 0 (lockfile 변경 없음) |

시작 시점 작업 트리는 clean 이 아니었다. 다른 세션 작업물이 존재했다.

- 다른 세션 tracked 수정: `apps/api-server/src/routes/platform/store-public/*`, `store-tablet.routes.ts`, `packages/content-editor/*`, `packages/screen-content-core/*`, `packages/tablet-kiosk-core/*`, `packages/tablet-screen-set-editor/*`, `services/web-kpa-society/*`, `services/web-neture/*` (작업 중 해당 세션이 커밋하여 `738b5efc2` 로 반영됨)
- 다른 세션 untracked: `apps/api-server/src/scripts/hff-zh-b01-*` 및 `data/hff-zh-b01-*.json`, `zhdbg.tmp.mjs`, `zhkinds.tmp.mjs`

**경로 중첩 0건** — 본 WO 변경 경로는 `apps/admin-dashboard/src/**` 뿐이며 위 목록과 겹치지 않는다.
중지 조건 ⑦(같은 메뉴·route 파일을 다른 세션이 수정 중) 미해당, ⑧(안전 분리 불가) 미해당.
WO 작업 시작 ③④ 지침에 따라 다른 세션 작업물은 수정·삭제·stash·revert 하지 않고 그대로 두었다.

---

## 2. 사전 조사 — 기존 화면 / route / API

| # | 조사 항목 | 결과 |
|---|-----------|------|
| ① | 기존 화면 파일 | `apps/admin-dashboard/src/pages/membership/categories/CategoryManagement.tsx` (469줄) |
| ① | 기존 route | `apps/admin-dashboard/src/routes/yaksa.routes.tsx` — `/admin/membership/categories`, **이미 존재하고 live** (`App.tsx:198` 에서 `{YaksaRoutes()}` 로 mount) |
| ② | 진입 경로 부재 확인 | `admin-menu.static.tsx` 전수 검색 결과 `/admin/membership/categories` 메뉴 항목 **0건** → route 는 있으나 UI 진입점이 없어 직접 URL 외에는 도달 불가 |
| ② | 중복 라우터 | `pages/membership/MembershipRouter.tsx` 에도 `categories` route 가 있으나, `MembershipRouter` 를 참조하는 파일이 자기 자신 외 **0건** → **dead/unmounted**. 사용하지 않음 |
| ③ | 회원 관리 메뉴 구조 | `Core` 그룹(id `core`) 안에 `core-membership`(/admin/membership/dashboard) · `core-membership-members` · `core-membership-verifications` 3건이 연속 배치. 별도의 "회원 관리" 상위 그룹은 존재하지 않음 |
| ④ | 메뉴 권한 표시 방식 | `MenuItem` 타입에는 role 필드가 없다(선행 WO 에서 dead metadata 로 제거). 노출 게이트는 `config/rolePermissions.ts` 의 `menuPermissions` + `hasMenuPermission(userRoles, userPermissions, menuId)` 단일 경로이며 `useAdminMenu.ts` 의 `filterMenuItems` 에서 메뉴 id 로 평가된다 |
| ④ | 기존 표준 | 실제 게이트 사례는 `core-users` 1건: `roles: ['super_admin','platform:super_admin']` (suffix·prefix 두 형식 병기). 정책은 **ALLOW BY DEFAULT** — 설정이 없으면 허용 |
| ⑤ | platform 역할 인식 | `hasMenuPermission` 은 raw string 정확 일치. `useAdminMenu` 가 `user.roles[].name` 을 그대로 넘기므로 `platform:admin` / `platform:super_admin` 문자열이 그대로 평가된다 → **인식됨** (중지 조건 ④ 미해당) |
| ⑤ | 동적 메뉴 간섭 | `/api/v1/navigation/admin` 은 Phase R1 이후 `data: []` stub → `dynamicMenuItems = null` → 정적 트리 + 로컬 게이트가 유일한 경로임을 확인 |
| ⑥ | 0건 렌더링 | 기존 빈 상태는 `categories.length === 0 && !isCreating` 조건의 **문구 1줄뿐** (`카테고리가 없습니다. 새로운 분류를 추가하세요.`). 오류·무한 로딩은 아니지만 생성 진입 버튼이 없어 헤더 '분류 추가' 를 찾아야 했다 |
| ⑦ | 생성 버튼 연결 | 헤더 '분류 추가' → `handleStartCreate()` → `setIsCreating(true)` → 인라인 생성 폼 렌더. 별도 모달 없음. 저장은 '저장' 클릭 시 `POST` |
| ⑧ | 관리자 API guard | `GET /api/v1/membership/categories` 는 선행 `WO-…-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2` 로 mount 지점에서 `platform:admin` / `platform:super_admin` 전용. 이번 WO 에서 **미변경** |
| ⑨ | 더 적절한 상위 메뉴 | 없음. Membership 관련 3건이 이미 `Core` 그룹에 있으므로 같은 묶음이 정보구조상 자연스러운 위치 |

**사전 조사 결론**: route 는 이미 표준 경로로 존재 → 신규 route 를 만들지 않고 재사용한다. 부족한 것은 **메뉴 진입점**과 **빈 상태의 생성 진입 동선**이다.

---

## 3. 메뉴 위치 선정 근거

`Core` 그룹 → `core-membership-verifications` 바로 뒤, `core-points` 앞.

- 회원 관리 3항목(Membership / Members / Verifications)이 연속 배치되어 있으므로 4번째로 붙여 묶음을 유지한다.
- 신규 상위 그룹을 만들지 않는다(범위 제외 "회원 관리 전체 메뉴 개편" 회피).
- 선행 `WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1` 이 `Core` 를 Admin 거버넌스 그룹으로 명문화한 판단과 일치.

| 항목 | 값 |
|------|-----|
| menu id | `core-membership-categories` |
| label | `Member Categories` |
| icon | `Layers` (기존 import 재사용, 신규 import 0) |
| path | `/admin/membership/categories` |

---

## 4. 적용한 route

**신규 route 0건.** 기존 `yaksa.routes.tsx` 의 `/admin/membership/categories` 를 그대로 사용했다.

```tsx
<Route path="/admin/membership/categories" element={
  <AdminProtectedRoute requiredPermissions={['membership:manage']}>
    <Suspense fallback={<PageLoader />}><CategoryManagement /></Suspense>
  </AdminProtectedRoute>
} />
```

route guard(`requiredPermissions={['membership:manage']}`)는 **변경하지 않았다**. 테스트로 고정했다.

---

## 5. 역할별 메뉴·접근 정책

`rolePermissions.ts` 에 게이트 1건 추가:

```ts
{ menuId: 'core-membership-categories',
  roles: ['admin', 'super_admin', 'platform:admin', 'platform:super_admin'] }
```

| 역할 | 메뉴 노출 | route 렌더 | API(`GET /membership/categories`) |
|------|:--------:|:---------:|:--------------------------------:|
| `platform:super_admin` | ✅ | ✅ | ✅ 200 |
| `platform:admin` | ✅ | ✅ | ✅ 200 |
| `admin` / `super_admin` (prefix 없는 legacy 표기) | ✅ | ✅ | backend 판정에 따름 |
| `kpa:admin` | ❌ 미노출 | ⚠️ 직접 URL 시 렌더됨 | ❌ **403** |
| 일반 사용자 | ❌ 미노출 | ❌ 접근 거부 화면 | ❌ 403 |
| 비로그인 | ❌ | ❌ `/login` 리다이렉트 | ❌ 401 |

**⚠️ 기록해야 할 구조 사실**: 공용 `AdminProtectedRoute` 의 `requiredPermissions` 분기는 실제 permission 을 보지 않고 "admin/operator 계열 역할이면 통과"로 구현되어 있으며(`role.endsWith(':admin')` 포함), 따라서 `kpa:admin` 도 **route 자체는 통과**한다. 데이터는 backend guard 가 403 으로 차단한다.
이번 WO 는 "공용 인증·라우팅 구조를 리팩터링하지 않는다" / "메뉴 표시만으로 보안을 대신하지 않는다" 원칙에 따라 이 공용 가드를 **건드리지 않았고**, 실질 경계는 backend guard 에 그대로 둔다. 프런트 route 수준의 platform 한정은 별도 WO 사안으로 기록한다.

기존 Membership 메뉴 3건에는 게이트를 **추가하지 않았다**(회원 관리 전체 메뉴 개편 = 범위 제외). 테스트로 고정했다.

---

## 6. 0건 빈 상태 구현

`CategoryManagement.tsx` 의 기존 빈 상태 블록만 교체했다(조건식 동일).

- 안내: **"등록된 회원 분류가 없습니다."** + 보조 문구
- 진입: **'분류 만들기'** 버튼 → 기존 `handleStartCreate` 재사용 (헤더 '분류 추가' 와 동일 핸들러)
- 아이콘은 이미 import 된 `Users` 재사용 (신규 import 0)
- 오류·무한 로딩 아님: `loading` 분기는 기존 그대로, 목록 0건은 정상 상태로 표시

---

## 7. '분류 만들기' 진입 결과

`handleStartCreate` 는 `setIsCreating(true)` + `setFormData({...})` 로컬 상태만 변경한다. 본문 내 `authClient.api.post|put|patch|delete` 호출 **0건** — 테스트로 고정했다.
따라서 **생성 화면을 여는 것만으로 운영 데이터가 생성되지 않는다** (중지 조건 ② 미해당). 저장은 이번 작업에서 실행하지 않았다.

---

## 8. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` | 메뉴 항목 1건 추가 |
| `apps/admin-dashboard/src/config/rolePermissions.ts` | 메뉴 게이트 1건 추가 |
| `apps/admin-dashboard/src/pages/membership/categories/CategoryManagement.tsx` | 빈 상태 블록 교체 |
| `apps/admin-dashboard/src/tests/membership-category-menu-route.test.ts` | 신규 테스트 |
| `apps/admin-dashboard/src/tests/admin-menu-batch2.test.ts` | leaf 총계 47 → 48 |
| `apps/admin-dashboard/src/tests/membership-category-api-paths.test.tsx` | 빈 상태 문구 fixture 갱신 |

합계 6 파일, +201 / −5. **백엔드·DB·프런트 API 호출 계약 변경 0건.**

---

## 9. 테스트 / typecheck / build

| 검증 | 명령 | 결과 |
|------|------|------|
| 프런트 테스트 | `npx vitest run src/tests/membership-category-menu-route.test.ts src/tests/admin-menu-batch2.test.ts src/tests/membership-category-api-paths.test.tsx` | **41 passed / 41** (3 files) |
| typecheck | `npx tsc --noEmit -p tsconfig.json` (admin-dashboard) | **exit 0, 오류 0** |
| build | `npm run build` (admin-dashboard) | **✓ built in 1m 40s** |
| api-server build | 실행하지 않음 | 백엔드 미수정 (WO 지시) |
| monorepo 전체 build | 실행하지 않음 | WO 지시 |

신규 테스트가 고정한 계약: 메뉴 1건·중복 0 / Core 그룹 내 위치 / 기존 Membership 메뉴 3건 유지 / route 1건·guard 불변 / 역할별 노출 8케이스 / 기존 게이트 2건 불변 / 빈 상태 문구·버튼·핸들러 / 생성 진입 시 write API 미호출 / API URL 계약 불변.

---

## 10. 기존 API guard 유지

`packages/membership-yaksa` · `apps/api-server` **미수정**. 프로덕션 실측:

| 엔드포인트 | 인증 없음 |
|-----------|:--------:|
| `GET /api/v1/membership/categories` | **401** |
| `GET /api/v1/admin/users` (대조군) | **401** |

선행 GUARD-V2 계약이 그대로 유지된다.

---

## 11. 배포 workflow / revision / commit

| 항목 | 값 |
|------|-----|
| workflow | `Deploy Admin Dashboard (Cloud Run)` |
| run id | `30784254637` |
| conclusion | **success** |
| head SHA | `6ae8ccd29b26f7cdfbcfba9c0c23216a99b8a796` |
| Cloud Run 서비스 | `o4o-admin-dashboard` (asia-northeast3) |
| revision | `o4o-admin-dashboard-01042-9xv` |
| API Server 배포 | **실행 안 함** — 내 SHA 로 트리거된 API 배포 0건 |

배포 산출물이 실제로 소스 commit 을 담고 있는지 직접 확인(revision 이미지가 digest 라 태그 대조 불가 → 배포된 번들 문자열 대조):

| 대상 | 문자열 | 결과 |
|------|--------|------|
| `assets/index-CgEKzWkI.js` | `Member Categories` | 1건 |
| 〃 | `core-membership-categories` | 1건 |
| 〃 | `/admin/membership/categories` | 2건 |
| `assets/CategoryManagement-C7omp1wV.js` | `등록된 회원 분류가 없습니다` | 1건 |
| 〃 | `분류 만들기` | 1건 |
| 〃 | `/membership/categories` | 1건 |

---

## 12. 프로덕션 검증 (write 없이)

| # | 항목 | 결과 |
|---|------|------|
| ① | 메뉴 노출 | ⚠️ **미검증** — platform 관리자 계정 없음. 배포 번들에 메뉴 정의 포함은 확인(§11), 역할별 노출은 단위 테스트로 검증(§9) |
| ② | route 진입 | ✅ `https://admin.neture.co.kr/admin/membership/categories` → HTTP **200** (SPA), 브라우저 진입 시 `CategoryManagement` 가 로드되어 `GET /api/v1/membership/categories` 를 실제 호출함(= route 도달 확인). **신규 404 없음** |
| ③ | 0건 빈 상태 | ⚠️ **미검증** — 인증된 200 응답을 받을 수 없어 화면 실측 불가. 프로덕션 `yaksa_member_categories` 는 0행이므로 렌더 대상은 빈 상태가 맞다 |
| ④ | '분류 만들기' 열기 | ⚠️ **미검증** (③ 과 동일 사유). 코드·테스트로 검증 |
| ⑤ | 저장·수정·토글·삭제 미실행 | ✅ **실행 0건** |
| ⑥ | 비로그인/비허용 차단 | ✅ 만료 세션으로 접근 → `인증이 만료되었습니다` 토스트 + `/login` 리다이렉트. API 401 |
| ⑦ | 신규 404·500·콘솔 오류 | ✅ 신규 없음. 관측된 콘솔 오류는 전부 만료 토큰으로 인한 **401** (`apps/availability`, `membership/categories`, `userRole/…/permissions`, `auth/refresh`) — 이번 변경과 무관한 인증 만료 경로 |
| ⑧ | revision ↔ commit 일치 | ✅ §11 문자열 대조로 확인 |

platform 관리자 계정이 없으므로 실제 관리자 200 렌더링을 **억지로 우회하지 않았다** (중지 조건 ⑨ 준수 — 우회 대신 미검증으로 기록).

---

## 13. 운영 데이터 write

**0건.** POST/PUT/PATCH/DELETE 호출 0, 분류 생성 0, seed 실행 0.

---

## 14. DB / 백엔드 변경

**0건.** migration 0, schema 0, `apps/api-server` 수정 0, `packages/membership-yaksa` 수정 0.
Cloud SQL 접속·SQL 실행도 이번 WO 에서는 수행하지 않았다.

---

## 15. 제외 범위 준수

20개 항목 전부 미실행: 운영 분류 생성 / 수정·비활성화·재활성화·삭제 / seed / 기본 4개 분류 자동 생성 / 분류 체계 재설계 / 회원 관리 전체 메뉴 개편 / 관리자 API 경로 이전 / API guard 변경 / `kpa:admin` 권한 추가 / `membership:manage` 도입 / `/membership/me` 결함 수정 / `/members/me*` 인증 결함 수정 / audit-logs 정비 / soft delete / 백엔드 service·controller / DB schema·migration / API prefix 정비 / 공용 인증·라우팅 리팩터링 / 테스트 계정 비밀번호 변경.

---

## 16. platform 관리자 실측 여부

**실측하지 못했다.** 선행 WO 에서 확인된 대로 사용 가능한 테스트 계정 중 `platform:admin` / `platform:super_admin` 보유 계정이 없다(모두 403).
WO 지침에 따라 역할 기반 메뉴·라우트 테스트로 대체 검증하고, 프로덕션 200 화면 검증은 미검증으로 남긴다.

---

## 17. 미검증 항목

1. platform 관리자 로그인 상태에서 메뉴가 실제로 사이드바에 보이는지 (§12①)
2. 인증된 200 상태의 빈 상태 화면 실측 (§12③)
3. 인증된 상태에서 '분류 만들기' 클릭 → 생성 폼 입력 가능 상태 실측 (§12④)
4. `kpa:admin` 실계정으로 메뉴 미노출 실측 (단위 테스트로는 검증됨)
5. 프런트 route 가드가 `kpa:admin` 을 통과시키는 구조 이슈 — 이번 범위 밖(§5 ⚠️), 별도 WO 사안

---

## 18. commit / push

| 항목 | 값 |
|------|-----|
| 소스 commit | `6ae8ccd29b26f7cdfbcfba9c0c23216a99b8a796` |
| push | `738b5efc2..6ae8ccd29  main -> main` |
| CHECK commit | (본 문서 커밋 — 아래 §19 이후 기록) |

commit 은 자기 파일 6건만 **정확한 pathspec** 으로 지정해 수행했고, `git show --name-only` 로 6건 외 포함이 없음을 확인했다. `git add .` / 디렉터리 pathspec / reset / clean / stash / amend / rebase / force-push **0건**.

---

## 19. 최종 git status

본 CHECK 커밋 시점 기준: 본 WO 관련 tracked 변경 0. 남은 항목은 다른 세션의 untracked `hff-zh-b01-*` 산출물뿐이며 접촉하지 않았다.

---

## 20. lockfile / 다른 세션 작업물

- `pnpm-lock.yaml` **미변경** (`--frozen-lockfile` 통과, git status 에 미등장)
- HFF · OTC · 다국어 작업물 **미접촉** (수정·삭제·stash·revert 0)
- 다른 세션 tracked 파일 stage·commit **0건**

---

## 21. 보안 정보 출력·기록

**0건.** `docs/local/TEST-ACCOUNTS.local.md` 를 이번 WO 에서 **열지 않았고 출력하지 않았다.**
이메일·비밀번호·토큰을 터미널 출력·명령 인자·CHECK·코드·커밋 어디에도 기록하지 않았다.
프로덕션 검증은 전부 **비인증 요청** 과 **브라우저에 이미 남아 있던(그리고 만료된) 세션** 으로만 수행했으며, 자격증명을 새로 입력하지 않았다.

---

## 22. 다른 세션 Cloud SQL Proxy 종료

**0건.** 이번 WO 에서는 Cloud SQL Proxy 를 **기동하지도, 종료하지도 않았다.** 프로세스명 일괄 종료 명령(`taskkill /IM`, `pkill`) 사용 0건.

---

## 결론

**PASS (조건부).** 회원 분류 관리 화면이 Admin Dashboard 메뉴에서 진입 가능해졌고(기존 route 재사용, 신규 route 0), 분류 0건 상태에서 정상 빈 상태와 '분류 만들기' 진입 동선이 갖춰졌다. 운영 데이터 write 0, 백엔드·DB 변경 0.
platform 관리자 계정 부재로 인증된 200 화면 실측만 미검증으로 남는다 — 다음 단계(플랫폼 관리자 계정으로 생성→수정→비활성화→목록 유지→재활성화 검증)에서 함께 해소된다.
