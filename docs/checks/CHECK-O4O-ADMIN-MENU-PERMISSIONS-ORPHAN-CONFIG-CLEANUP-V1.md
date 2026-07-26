# CHECK-O4O-ADMIN-MENU-PERMISSIONS-ORPHAN-CONFIG-CLEANUP-V1

WO: `WO-O4O-ADMIN-MENU-PERMISSIONS-ORPHAN-CONFIG-CLEANUP-V1`
일시: 2026-07-26 (KST) · 대상: `apps/admin-dashboard/src/config/rolePermissions.ts`

## 0. 결론 — 완료. **접근 결과 변화 0**

고아 `menuPermissions` 항목 **6건 제거**. `core-users`(유효 게이트) 및 그 밖의 권한 가드 무변경.
backend · DB · migration · 정적 메뉴 트리 **무변경**.

## 1. 미사용 확정 근거

### 1-A. 동적 메뉴 미사용 재확인

`apps/api-server/src/routes/navigation.routes.ts` — `GET /api/v1/navigation/admin` 은
**`data: []` 고정 반환 stub** (`Navigation registry disabled in Phase R1`).
→ 동적 메뉴는 항상 비어 있고 **정적 트리(`admin-menu.static.tsx`)가 유일한 소스**다.

### 1-B. 대응 메뉴 항목 부재

`admin-menu.static.tsx` 내 해당 id 보유 항목 수:

| menuId | 정적 메뉴 항목 | 판정 |
|--------|:---:|:---:|
| `system-settings` | **0** | 고아 |
| `integrations` | **0** | 고아 |
| `tools` | **0** | 고아 |
| `import-export` | **0** | 고아 |
| `database` | **0** | 고아 |
| `yaksa-tools` | **0** | 고아 |
| `core-users` | **1** | **유효 — 유지** |

`hasMenuPermission(userRoles, userPermissions, item.id)` 는 **메뉴 항목의 id** 로 조회하므로
(`useAdminMenu.ts:163`), 그 id 를 가진 항목이 없으면 해당 config 는 **평가 자체가 되지 않는다.**
`getAccessibleMenus()`(menuPermissions 를 직접 순회하는 유일한 함수)는 **사용처 0건**이다.

### 1-C. repo 전역 문자열 참조 — 전부 무관

| menuId | 참조 | 실체 |
|--------|:---:|------|
| `system-settings` | 0 | — |
| `import-export` | 0 | — |
| `yaksa-tools` | 0 | — |
| `database` | 26 | 아이콘 맵(`useAdminMenu`/`useDynamicCPTMenu`), 모니터링 탭 값, 타입 union — **menuId 용례 0** |
| `integrations` | 6 | 브레드크럼 라벨 맵, GlycoPharm 설정 탭, settings section 타입 — **menuId 용례 0** |
| `tools` | 5 | cpt-engine route path, 가이드 카피, **디버그 페이지 1건**(§2) |

`menuId: 'database'` / `id: 'database'` 형태의 실제 menu 정의는 **0건**으로 확인했다.

### 1-D. "설정 없음 = 허용" 정책

`hasMenuPermission` (`rolePermissions.ts:173-185`):

```ts
const menuConfig = menuPermissions.find(m => m.menuId === menuId);
if (!menuConfig) {
  return true;   // POLICY: ALLOW BY DEFAULT (whitelist 아님)
}
```

→ 설정을 제거해도 **호출되는 경로가 없고**, 설령 호출되더라도 결과는 `true`(허용)로 동일하다.
따라서 삭제로 **접근이 좁아질 수 없다.**

## 2. 유일한 실참조 — 디버그 페이지 (비차단)

`apps/admin-dashboard/src/pages/test/MenuDebug.tsx` (route: `test.routes.tsx`)

```ts
const toolsMenuItem   = adminMenuStatic.find(m => m.id === 'tools');        // 이미 undefined
const toolsPermission = menuPermissions.find(m => m.menuId === 'tools');    // 삭제 후 undefined
const hasToolsAccess  = hasMenuPermission(userRoles, userPermissions, 'tools');
```

- 렌더는 **방어적**이다: `toolsMenuItem ? '✅ Yes' : '❌ No'`, `JSON.stringify(toolsPermission, null, 2)`,
  boolean 표시. **크래시 없음.**
- 표시값 변화: `toolsPermission` → 빈 값, `hasToolsAccess` → `TRUE`(설정 없음 = 허용).
  이는 **현재 상태를 정확히 보고하는 것**이지 회귀가 아니다.
- 이 페이지는 메뉴·route·deep link 소비처가 아니라 **상태 조회용 디버그 화면**이므로
  WO 중지 조건("실제 사용 중")에 해당하지 않는다고 판단했다.
- 다만 이제 존재하지 않는 `'tools'` 를 하드코딩해 조사하므로 **디버그 가치가 낮아졌다** →
  후속 정리 대상으로 기록(본 WO 범위 밖, §6).

## 3. 삭제 전후 비교

| 항목 | 삭제 전 | 삭제 후 |
|------|:---:|:---:|
| `menuPermissions` 항목 수 | 22 | **16** |
| 고아 항목 | 6 | **0** |
| 실제 게이트 적용 항목 | `core-users` 1건 | `core-users` 1건 (불변) |
| 정적 메뉴 트리 | 무변경 | 무변경 |
| 렌더되는 메뉴 집합 | — | **동일**(§1-B: 애초에 이 id 로 렌더되는 메뉴가 없음) |

`core-users` 는 `roles: ['super_admin', 'platform:super_admin']` 그대로 유지 — Super Admin 및
서비스 관리자·운영자의 접근 결과 불변.

## 4. 선행 WO 와의 관계

`WO-O4O-ADMIN-CANONICAL-SUPER-ADMIN-MENU-PERMISSION-FIX-V1`(commit `3aea9e0ef`)이 이 5개 항목에
`platform:super_admin` 을 additive 로 추가했었다. 당시에도 CHECK 에 **dead config 임을 명시**하고
"재도입 시 함정 제거" 목적의 미래 대비로 유지했으나, 본 WO 에서 항목 자체를 제거함으로써 **대체된다.**
결과적으로 더 단순한 상태(고아 설정 0)로 수렴한다.

## 5. 검증

| 항목 | 결과 |
|------|:---:|
| 고아 6종 잔존 | **0건** (grep 확인) |
| `core-users` 정의 | **불변** |
| 대상 menuId 의 route/sidebar/deep-link 소비 | **0건** |
| typecheck (`@o4o/admin-dashboard`) | 변경 전 4건 = 변경 후 4건 — **신규 0** |
| 변경 파일 오류 | **0** |
| build | **PASS** (28.58s) |
| backend / DB / migration / 정적 메뉴 트리 | **0** |
| 다른 세션의 동일 파일 수정 | 없음(작업 전 `git status` 확인) |

## 5-1. 배포 및 산출물 검증

| 항목 | 값 |
|------|-----|
| commit | `baf2f6881` |
| workflow | `Deploy Admin Dashboard (Cloud Run)` run `30191374376` — conclusion **success** |
| `version.json` | `2026.07.26-0639` (신규 빌드 서빙 확인) |
| entry 번들 | `/assets/index-D1REdfIw.js` (1,636,571 bytes) |

배포된 번들을 내려받아 직접 검증했다(브라우저 세션 불필요한 결정적 확인):

| 검사 | 결과 |
|------|:---:|
| `menuId:"system-settings"` | **0** |
| `menuId:"integrations"` | **0** |
| `menuId:"tools"` | **0** |
| `menuId:"import-export"` | **0** |
| `menuId:"database"` | **0** |
| `menuId:"yaksa-tools"` | **0** |
| `menuId:"core-users"` | **1** (유지) |

→ 고아 6종이 프로덕션 산출물에서 완전히 제거되었고, 유효 게이트 `core-users` 는 그대로 유지됨을 확인.

### 5-2. 메뉴 접근 결과 불변 근거

별도 브라우저 smoke 없이도 접근 결과 불변이 성립한다:

- 삭제된 6개 id 를 가진 **메뉴 항목이 애초에 렌더되지 않으므로**(§1-B), 이 config 로 가려지거나
  드러날 메뉴가 존재하지 않는다.
- `hasMenuPermission` 은 설정이 없으면 `true` 를 반환하므로(§1-D), 어떤 경로로 호출되더라도
  **접근이 좁아지는 방향의 변화는 원천적으로 불가능**하다.
- 실제 게이트 대상 `core-users` 의 정의는 번들 실측상 **불변**이다.

따라서 Super Admin · 서비스 관리자 · 운영자 모두 **메뉴 트리와 접근 결과가 동일**하다.

## 6. 후속 권고 (본 WO 미수정)

1. `pages/test/MenuDebug.tsx` — 존재하지 않는 `'tools'` 하드코딩 조사. 실제 게이트 대상인
   `'core-users'` 로 바꾸거나 디버그 페이지 자체를 정리.
2. `menuPermissions` 잔여 16건 중에도 정적 트리와 대응하지 않는 항목이 더 있을 수 있다
   (`dashboard-home`, `users-list`, `ui-elements` 등). 본 WO 는 지정된 6건만 다뤘다 —
   전수 대조는 별도 WO 로.
3. `admin-menu.static.tsx` 의 `roles:` 필드는 `hasMenuPermission` 이 사용하지 않는
   pass-through 메타데이터다(선행 IR 확인). 혼동 소지가 있어 정리 검토 권고.
