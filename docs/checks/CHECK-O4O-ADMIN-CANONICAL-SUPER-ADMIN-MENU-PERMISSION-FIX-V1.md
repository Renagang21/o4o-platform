# CHECK-O4O-ADMIN-CANONICAL-SUPER-ADMIN-MENU-PERMISSION-FIX-V1

WO: `WO-O4O-ADMIN-CANONICAL-SUPER-ADMIN-MENU-PERMISSION-FIX-V1`
일시: 2026-07-26 (KST) · 대상: `apps/admin-dashboard/src/config/rolePermissions.ts`

## 0. 결론 — 수정 완료. 단, **WO 전제는 성립하지 않았다**

5개 메뉴 권한에 `platform:super_admin` 을 additive 로 추가했다(요청대로 수행).
다만 조사 결과 **해당 5개 항목은 현재 어떤 메뉴에도 매칭되지 않는 dead config** 였고,
따라서 이 변경은 **현재 화면 동작을 바꾸지 않는다**(회귀도, 신규 노출도 없음).

**중요:** 이로써 선행 CHECK 가 legacy 제거의 blocker 로 지목했던 근거가 사라진다. 상세는 §2.

## 1. 수행한 변경

`menuPermissions` 5개 항목의 `roles` 에 canonical 역할을 추가(기존 값 유지).

```diff
- roles: ['super_admin', 'admin', 'manager']
+ roles: ['super_admin', 'platform:super_admin', 'admin', 'manager']
```

| menuId | 변경 |
|--------|:---:|
| `system-settings` | ✅ |
| `integrations` | ✅ |
| `tools` | ✅ |
| `import-export` | ✅ |
| `database` | ✅ |

- **additive 전용** — `super_admin` / `admin` / `manager` 제거 0 (legacy 정리는 후속 WO).
- 선례 정합: `core-users` 가 이미 `['super_admin', 'platform:super_admin']` 로 두 형식을 병기한다.
- backend · DB · role_assignment 변경 **0**. Admin 외 서비스 영향 **0**(파일이 admin-dashboard 전용).

## 2. 조사 결과 — 5개 항목은 dead config (WO 전제 정정)

WO 는 "legacy `super_admin` 에만 열려 있어 canonical 계정이 5개 메뉴를 보지 못한다"를 전제했다.
이는 선행 CHECK(`…DEDICATED-SUPER-ADMIN-CUTOVER…-V1 §2-B`)의 판단을 이어받은 것인데, **사실과 다르다.**

| 확인 항목 | 결과 |
|-----------|------|
| 동적 메뉴 `/api/v1/navigation/admin` | **stub — `data: []` 고정 반환** (`navigation.routes.ts`, Phase R1 에서 registry 제거) |
| 정적 메뉴 `admin-menu.static.tsx` 내 5개 id | `system-settings` 0 · `integrations` 0 · `tools` 0 · `import-export` 0 · `database` 0 |
| `getAccessibleMenus()` (menuPermissions 자체를 순회) | **사용처 없음** |
| 게이트가 실제 적용되는 항목 | `core-users` 1건뿐 — 이미 canonical 병기됨 |

`hasMenuPermission(userRoles, userPermissions, item.id)` 는 **메뉴 항목의 id** 로 조회하므로,
그 id 를 가진 메뉴가 존재하지 않으면 해당 config 는 **평가되지 않는다**.

### 정정되는 두 가지 결론

1. **기능 은폐 없음** — canonical `platform:super_admin` 에게 숨겨진 메뉴는 없었다.
   해당 메뉴들은 역할과 무관하게 **누구에게도 렌더되지 않는다**(메뉴 자체가 부재).
2. **legacy 제거 blocker 아님** — legacy `super_admin` 이 admin 메뉴 가시성에 "실사용 중"이라는
   판단은 이 5개 항목에 관한 한 성립하지 않는다. 선행 CHECK 의 중지 조건 3 근거에서 **제외해야 한다**.
   (선행 CHECK 에 정정 블록을 추가했다.)

`super-admin@o4o.com` 에서 legacy `super_admin` 을 제거해도 이 경로로 잃는 메뉴는 없다.
`core-users` 는 canonical 을 병기하므로 영향받지 않는다.

### 그래도 변경을 유지한 이유

- **무해**: additive 이고 현재 평가되지 않는 config 이므로 회귀 0.
- **미래 대비**: 해당 메뉴가 재도입되면 canonical 역할이 누락된 상태로 부활하는 함정을 미리 제거한다.
- 파일 전체가 canonical/legacy 병기로 일관되어 이후 legacy 일괄 제거 시 판단이 단순해진다.

## 3. 메뉴 표시 ↔ route/API 권한 일치 확인

WO 원칙 "메뉴 표시와 실제 route/API 접근 권한이 일치하는지 확인한다"에 대한 결과.

- 5개 menuId 에 대응하는 **메뉴 항목도 route 도 admin-dashboard 에 존재하지 않는다**
  (repo 전역 검색에서 `rolePermissions.ts` 외 사용처 0).
- 따라서 검증 항목 "각 route 정상 진입 / 403·404·데드링크 없음"은 **대상 자체가 없어 해당 없음**이다.
  없는 메뉴를 노출시키지 않았으므로 **데드링크는 발생하지 않는다**(설정만 존재, UI 진입점 없음).
- 실제 게이트 대상인 `core-users`(`/users`)는 본 WO 에서 **변경하지 않았다**.

## 4. 검증

| 항목 | 결과 |
|------|:---:|
| typecheck (`@o4o/admin-dashboard`) | 변경 전 4건 = 변경 후 4건 — **신규 0** |
| 변경 파일 오류 | **0** |
| 기준선 4건 출처 | `routes/apps.routes.tsx` 의 `@o4o/cgm-pharmacist-app` 미해결(사전 존재, 무관) |
| build | **PASS** (31.32s) |
| legacy 역할 제거 | **0** (additive only) |
| backend / DB / role_assignment | **0** |
| Admin 외 서비스 영향 | **0** |

<!-- DEPLOY_SMOKE -->

## 6. 관찰 (본 WO 미변경)

- `yaksa-tools` 도 `['admin','super_admin','pharmacist']` 로 legacy 만 갖는다. 다만 정적 메뉴에
  `yaksa-tools` id 는 **0건**이라 동일하게 dead config 다(WO 지정 5개 밖이라 미변경).
- `menuPermissions` 전반이 현재 메뉴 트리와 상당히 어긋나 있다(게이트 실효 항목 1건 / 설정 다수).
  navigation registry 제거(Phase R1) 이후 정리되지 않은 잔재로 보인다. **별도 WO 로 정리 권고** —
  `WO-O4O-ADMIN-MENU-PERMISSION-CONFIG-RECONCILE-V1`.
