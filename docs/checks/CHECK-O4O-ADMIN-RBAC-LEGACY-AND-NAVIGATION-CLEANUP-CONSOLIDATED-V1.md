# CHECK-O4O-ADMIN-RBAC-LEGACY-AND-NAVIGATION-CLEANUP-CONSOLIDATED-V1

WO: `WO-O4O-ADMIN-RBAC-LEGACY-AND-NAVIGATION-CLEANUP-CONSOLIDATED-V1`
선행: `IR-O4O-ADMIN-LEGACY-SUPER-ADMIN-GUARD-CONSUMER-AUDIT-V1`
일시: 2026-07-26 (KST) · commit `7cb9c1a15`

## 0. 결론

저위험 5건 구현 + 정책 결정 필요 항목 분리. **DB write 0 · migration 0 · 순삭감 -127/+58.**

가장 중요한 결과는 **frontend legacy 54건이 제거 대상이 아님을 확정**한 것이다(§2).

---

## 1. 잔존 항목 전체 분류표

| # | 대상 | 건수 | 분류 | 조치 |
|---|------|:---:|------|------|
| 1 | `menuPermissions` 고아 설정 | 19 | dead config | **제거** |
| 2 | `MenuDebug` 의 `'tools'` 하드코딩 | 1 | 무효 참조 | **교체** (`core-users`) |
| 3 | `admin-menu.static.tsx` `roles` 메타데이터 | 15 + 타입 | dead metadata | **제거** |
| 4 | guide `isOperatorOrAbove` canonical 누락 | 1 | **결함** | **수정** |
| 5 | `operator-notification` dead-deny | 2 | **결함(부분)** | **부분 수정** |
| 6 | frontend `super_admin` (admin-dashboard 30 · 기타 24) | 54 | **A: 제거 금지** | **유지** |
| 7 | backend dead controller 3종 | 8 | dead code | 별도 WO(파일 삭제) |
| 8 | 가입·검증·swagger·dto 계약 | 4 | 외부 계약 | 별도 WO |
| 9 | migration / 이력 | 11+ | 보존 필수 | 영구 보존 |

## 2. 핵심 발견 — frontend legacy 는 **확장 트리거**다 (제거 금지 확정)

`packages/auth-context/src/AdminProtectedRoute.tsx:138-147`:

```ts
const expandedRequiredRoles = [...requiredRoles];
if (requiredRoles.includes('admin') || requiredRoles.includes('platform:admin')) {
  const extras = ['super_admin', 'operator', 'platform:admin', 'platform:super_admin'];
  extras.forEach(r => { if (!expandedRequiredRoles.includes(r)) expandedRequiredRoles.push(r); });
}
if (requiredRoles.includes('super_admin') && !expandedRequiredRoles.includes('platform:super_admin')) {
  expandedRequiredRoles.push('platform:super_admin');     // ← 확장 트리거
}
```

즉 라우트의 `requiredRoles={['admin','super_admin']}` 에서 무접두 문자열은 **무효항이 아니라
canonical 역할을 끌어오는 트리거**다. 제거했다면 `platform:super_admin` 이 해당 라우트
(`requiredRoles` 사용 20곳)에서 **튕겨나갔을 것**이다.

→ frontend 54건 전부 **A 분류(제거 금지)** 로 확정. 본 WO 에서 **한 건도 건드리지 않았다.**

> 이번 WO 에서 나온 **두 번째** 동일 패턴이다(1차: backend `scope-assignment.utils` 의 suffix 매칭).
> "무접두 문자열 = 죽은 값"이라는 가정이 이 코드베이스에서 반복적으로 틀린다는 점을 기록해 둔다.

## 3. 구현 상세

### 3-1. `menuPermissions` 고아 19건 제거

정적 트리(`admin-menu.static.tsx`)와 전수 대조 결과, 대응 메뉴 항목이 있는 것은 **2건뿐**이었다.

| 남긴 항목 | 정적 메뉴 | 게이트 |
|-----------|:---:|------|
| `dashboard` | 1 | 없음(무제한) |
| `core-users` | 1 | `['super_admin','platform:super_admin']` |

제거: `home` `dashboard-home` `dashboard-overview` `dashboard-stats` `user-management` `users`
`users-list` `users-create` `users-edit` `reports` `analytics` `sales-reports` `settings`
`general-settings` `logs` `profile` `users-profile` `ui-elements` `ui-components` (19건).

안전 근거: `hasMenuPermission` 은 **메뉴 항목의 id** 로만 조회되고(`useAdminMenu.ts:163`),
동적 메뉴는 Phase R1 이후 빈 배열 stub 이라 정적 트리가 유일한 소스다. 위 id 를 가진 메뉴가
0건이므로 평가 경로가 없었고, "설정 없음 = 허용" 정책이라 **접근이 좁아질 수 없다.**

### 3-2. `MenuDebug` 하드코딩 교체

제거된 `'tools'` → 실제 게이트 대상 `'core-users'`. 변수명도 `gated*` 로 일반화해
향후 게이트 대상이 바뀌어도 상수 1곳만 고치면 되도록 했다.

### 3-3. `admin-menu.static.tsx` `roles` 메타데이터 제거

- `roles: [...]` 15건 + `MenuItem.roles?` 필드 정의 + `useAdminMenu` 의 pass-through 제거.
- 소비처 0건 확인(레이아웃·사이드바 어디에서도 읽지 않음). 무효 형식 `'platform_admin'`(언더스코어)
  까지 섞여 있어 오히려 혼동 요인이었다.
- 메뉴 가시성 게이트는 `menuPermissions` + `hasMenuPermission(menuId)` 가 단독 담당함이 명확해졌다.

### 3-4. guide `isOperatorOrAbove` — canonical 누락 해소 (결함 수정)

기존은 `':admin'` / `':operator'` **suffix** 로만 판정했는데 `platform:super_admin` 의 suffix 는
`':super_admin'` 이라 **최고 관리자가 통과하지 못했다.** `platform:super_admin` / `platform:admin` 을
명시 허용했다. 서비스 역할의 허용 범위는 변경하지 않았다.

### 3-5. `operator-notification` dead-deny — 부분 해소

기존 가드는 무접두 4종만 허용했고 시스템에 보유자가 0명이라 **전 사용자 403** 이었다(IR §6 실측).
`platform:super_admin` / `platform:admin` 을 명시 허용하고 무효항 `super_admin` 을 제거했다.

**서비스 운영자(kpa:operator 등) 개방은 정책 결정이라 제외** — 현재 이 엔드포인트는 플랫폼 관리자
전용이다. 후속: `WO-…-OPERATOR-NOTIFICATION-SERVICE-SCOPE-POLICY-V1`.

## 4. 검증

### 4-1. 정적

| 항목 | 결과 |
|------|:---:|
| typecheck `@o4o/admin-dashboard` | 4 = 4 — **신규 0** |
| typecheck `@o4o/api-server` | 13 = 13 — **신규 0** |
| build (admin / api) | **양쪽 PASS** |
| DB / migration | **0** |
| frontend legacy 변경 | **0** (§2) |
| migration 파일 변경 | **0** |

### 4-2. 배포

| 대상 | 결과 |
|------|:---:|
| Deploy Admin Dashboard (Cloud Run) | **success** |
| Deploy API Server (Cloud Run) | **success** |
| api 이미지 태그 = `7cb9c1a15f2b82ea28073a4ffd091d3b1d8353f9` | **일치** |

admin 번들 실측: `menuId:"core-users"` 1 · `menuId:"dashboard"` 1 ·
`users-list`/`reports`/`logs`/`ui-elements`/`profile` **각 0**.

### 4-3. 운영 교차 검증 (`renariver21` = platform admin / `sohae2100` = 서비스 admin·operator 9종)

| 경로 | renariver21 | sohae2100 | 판정 |
|------|:---:|:---:|------|
| `GET /api/operator/settings/notifications` | **200** | **403** | dead-deny 해소(전 사용자 403 → 플랫폼 관리자 200). 서비스 운영자는 정책대로 미개방 |
| `POST /api/v1/guide/contents` (빈 body) | **400** | **400** | 400 = **가드 통과 후 body 검증에서 중단**. 수정 전 renariver21 은 403 이었다 → canonical 누락 해소 확인. **write 0건** |
| `GET /api/v1/admin/platform-accounts` | **200** | **403** | 플랫폼/서비스 권한 경계 유지 |
| `GET /api/v1/operator/members?serviceKey=kpa-society` | **200** | **200** | 서비스 scope 정상, 무회귀 |

guide 검증은 게이트가 write 엔드포인트에만 걸려 있어, **역할 검사가 body 검증보다 먼저 실행되는
순서를 이용해** 빈 body 로 403/400 만 구분했다(실제 데이터 변경 없음).

## 5. 후속 (정책 결정 필요)

| # | 항목 | 쟁점 |
|---|------|------|
| 1 | `operator-notification` 서비스 운영자 개방 | 어느 서비스 operator 에게 알림 설정을 열지 |
| 2 | backend dead controller 3종 삭제 | `SupplierEntityController` · `modules/sites` · `operator-registration` — 파일 삭제라 별도 패스 |
| 3 | 가입·검증·swagger·dto 의 무접두 역할 | 외부 계약 변경 |
| 4 | 비밀번호 로테이션 | 작업 대화에 `sohae2100`/`renagang21` 비밀번호 노출 |

## 6. 금지 사항 준수 확인

- 기계적 일괄 치환 **없음** — 항목마다 매칭 방식(정확일치 / suffix / 부분문자열 / 확장 트리거)을
  개별 확인 후 판단.
- suffix 의미 `super_admin` **전부 유지** (`types/roles.ts` · `role.utils.ts` ·
  `signage-role.middleware.ts` · `scope-assignment.utils.ts`).
- migration · history **무변경**.
- 직접 DB 수정 **없음**.
