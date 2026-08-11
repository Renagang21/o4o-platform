# CHECK-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1

- **WO**: `WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1`
- **일자**: 2026-08-11
- **판정**: **PASS** — 상·하위 가드 충돌 해소. 기존 `super_admin` 전용 경계 불변, schema/migration/DB write 0

## 1. 결함의 실제 원인

`apps/api-server/src/routes/admin/dashboard.routes.ts` 가 **path 없는** `router.use(authenticate); router.use(requireAdmin);` 를 선언한 채
`register-routes.ts:418` 에서 `app.use('/api/v1/admin', adminDashboardRoutes)` 로 mount 돼 있었다.

Express 에서 path 없는 `router.use(mw)` 는 **그 router 가 정의하지 않은 경로에도** 실행된다.
따라서 418 줄 이후에 mount 되는 모든 `/api/v1/admin/**` 라우터가, 자기 가드에 도달하기 전에
`requireAdmin`(= `platform:super_admin` 단독) 에서 먼저 403 됐다.

## 2. 충돌 지점

| 계층 | 위치 | 실제 계약 |
|---|---|---|
| 상위 blanket | `dashboard.routes.ts` (mount `register-routes.ts:418`) | `requireAdmin` = `platform:super_admin` 만 |
| 하위 제품설명서 API | o4o-product-db 컨트롤러 13개 | `requireRole(ADMIN_ROLES)` = `platform:super_admin` + 서비스 admin/operator 8개 |

하위 계약은 선행 WO 들이 이미 선언해 둔 것이며, 이번 WO 가 새로 넓힌 것이 아니다.

## 3. 영향 범위 전수조사 (read-only 정적 분석)

산출물: `tmp/admin-product-description-auth-boundary/route-inventory.mjs` · `route-inventory.json`

| 항목 | 값 |
|---|---|
| blanket mount 줄 | `register-routes.ts:418` |
| `/api/v1/admin*` mount 총수 | 31 |
| blanket 뒤에 mount 되어 가려진 수 | **17** |
| 분류 | A(super_admin 전용) 12 · B(service admin/operator 허용) 13 · C(불명확) 6 |
| **blanket 제거 시 무방비가 되는 mount** | **0** |

가려진 17개 내역

| 줄 | 경로 | 클래스 | 자체 가드 |
|---|---|:---:|---|
| 466~586 (13개) | `/api/v1/admin/o4o-product-db/*` | B | `authenticate` + `requireRole(ADMIN_ROLES 9개)` |
| 1008 / 1017 / 1026 / 1035 | `channel-playback-logs`, `channels/heartbeat`, `channels/ops`, `ops` | A | `authenticate` + `requireAdmin` |

C 6개는 전부 **blanket 앞**에 mount 돼 이번 변경의 영향을 받지 않으며, 수동 확인 결과 `serviceLegalScope` 또는 `requireRole(ADMIN_ACCESS_ROLES)` 로 실제 보호되고 있다(정적 분석의 보수적 미판정).

## 4. 수정 내용 (최소)

`dashboard.routes.ts` 한 파일. 가드를 **이 router 가 실제로 소유한 prefix 로만** 한정했다.

```ts
const OWNED_PREFIXES = ['/dashboard', '/system', '/partners', '/cosmetics'];
router.use(OWNED_PREFIXES, authenticate);
router.use(OWNED_PREFIXES, requireAdmin);
```

- blanket guard 를 **제거하지 않았다** — 소유 경로에는 그대로 걸린다.
- `register-routes.ts` 는 수정하지 않았다 (mount 순서 의존성 제거).
- 전역 권한을 낮추는 방식(`/api/v1/admin/*` 전체 admin/operator 허용)은 쓰지 않았다.
- 미정의 `/api/v1/admin/*` 경로는 이제 403 대신 404 가 된다 — 노출되는 것은 없다(§3 무방비 0).

## 5. 역할별 결과 (변경 전 → 후)

route-level integration test (`admin-route-auth-boundary.test.ts`, 실제 router + supertest)

| 역할 | `/api/v1/admin/o4o-product-db/masters/:id/store-descriptions` | `/api/v1/admin/dashboard/*` 등 A그룹 |
|---|---|---|
| `platform:super_admin` | 403 → **통과** | 통과 → **통과 (불변)** |
| `cosmetics:operator` | 403 → **통과** | 403 → **403 (불변)** |
| `kpa-society:admin` | 403 → **통과** | 403 → **403 (불변)** |
| `neture:operator` | 403 → **통과** | 403 → **403 (불변)** |
| 권한 없는 일반 사용자 | 403 → **403** | 403 → **403** |
| 비인증 | 401 → **401** | 401 → **401** |

## 6. 테스트

- 신규 `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts` — **29 tests PASS**
  - 제품설명서 API 역할별 허용/차단
  - A그룹(super_admin 전용) 경계 회귀 — 서비스 admin/operator 403 유지
  - 가드 배선 회귀(source scan): dashboard router 의 path 없는 `router.use` 재발 금지 · `OWNED_PREFIXES` 가 선언된 최상위 prefix 전체와 일치 · o4o-product-db 컨트롤러 13개가 각자 `requireRole(ADMIN_ROLES)` 보유 + 역할 9개 구성 검증
- `npx tsc --noEmit` (apps/api-server) — **0 error**
- 인접 회귀: `src/controllers/admin`, `admin-api-guard-inventory.spec.ts`, `security/restricted-account-access.spec.ts`, `service-admin-guard.spec.ts` — **8 suites / 126 tests PASS**

## 7. 프로덕션 smoke (§9)

배포 **전** 상태에서 실계정으로 실측했다. GET 만 호출 — **DB write 0**.
자격증명은 `docs/local/TEST-ACCOUNTS.local.md`(gitignore) 에서 런타임에 읽는다 — 스크립트/문서에 하드코딩하지 않았다.
스크립트: `tmp/admin-product-description-auth-boundary/smoke.mjs`

계정: `sohae2100@gmail.com` — 보유 역할 `cosmetics:admin/operator`, `neture:admin/operator`, `glycopharm:admin/operator`, `kpa:admin/operator`, `pharmacy-hub:admin/operator`, `kpa:store_owner`. **`platform:super_admin` 미보유.**

| API | 배포 전 실측 |
|---|---|
| `/api/v1/admin/o4o-product-db/masters/description-qr-summary` | **403 `FORBIDDEN` "Admin privileges required"** |
| `/api/v1/admin/o4o-product-db/product-contents` | **403 동일** |
| `/api/v1/admin/o4o-product-db/image-quality` | **403 동일** |
| `/api/v1/admin/o4o-product-db/supplier-store-descriptions` | **403 동일** |
| `/api/v1/admin/dashboard/sales-summary` (A) | 403 (정상 — super_admin 아님) |
| `/api/v1/admin/ops/metrics` (A) | 403 (정상) |

403 본문 `"Admin privileges required"` 는 `requireAdmin` 의 메시지다 — 하위 `requireRole` 이 아니라 **상위 blanket 이 먼저 잘랐다**는 직접 증거다.

### 한계

- `platform:super_admin` 계정의 비밀번호가 SSOT 문서에 없어 super_admin 통과는 실브라우저가 아니라 route-level integration test 로 대체했다. 계정 생성·비밀번호 변경은 하지 않았다(WO §9).
- 배포 **후** 200 확인은 이 커밋의 CI/CD 배포 완료 후 동일 스크립트 재실행으로 검증한다.

## 8. 프론트엔드 정합 (§8)

`apps/admin-dashboard/src/routes/o4o-product-db.routes.tsx` 는 `<AdminProtectedRoute requiredRoles={['admin','super_admin']}>` 이고,
`packages/auth-context/src/adminRouteAccess.ts` 의 서비스 prefix 수용 규칙에 따라 `cosmetics:operator` 등도 화면에 진입한다.
즉 **화면은 보이는데 API 만 403** 인 상태였다. 이번 수정으로 정합화됐고, **UI 변경은 하지 않았다.**

## 9. cross-service 위험 — 보고 (§5 · §10)

o4o-product-db admin 컨트롤러 13개 **어디에도 서비스 경계 필터가 없다.**
`serviceKey` 를 언급하는 것은 `product-content-browse.controller.ts` 한 곳뿐이고, 그것도 조회 필터일 뿐 권한 경계가 아니다.

따라서 이제 예컨대 `kpa-society:operator` 가 `regulatory_type='COSMETIC'` master 의 status·canonical STORE 설명서에 접근할 수 있다.

- 이는 선행 WO 들이 각 컨트롤러에 선언해 둔 `ADMIN_ROLES` 계약을 **실효화**한 결과이며, 이번 WO 가 넓힌 범위가 아니다.
- WO §5 "새로운 역할 체계나 scope 시스템을 만들지 않는다 / 경계가 없거나 불명확하면 임의로 넓히지 말고 보고한다" 에 따라 **수정하지 않고 보고**한다.
- **후속 WO 제안**: o4o-product-db admin API 의 서비스 경계 정책 정의(제품 DB 를 서비스 공통 자산으로 볼지, `regulatory_type`/`serviceKey` 로 분할할지) 후 guard 적용.

중지 조건에는 해당하지 않는다 — blanket 제거가 아니라 소유 prefix 한정이고, 무방비 mount 0 이며, 기존 super_admin 전용 API 는 전부 불변이다.

## 10. 변경 파일

| 파일 | 구분 |
|---|---|
| `apps/api-server/src/routes/admin/dashboard.routes.ts` | 수정 (가드 prefix 한정) |
| `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts` | 신규 (29 tests) |
| `tmp/admin-product-description-auth-boundary/route-inventory.mjs` · `.json` | 신규 (read-only 감사 산출물) |
| `tmp/admin-product-description-auth-boundary/smoke.mjs` | 신규 (read-only smoke) |
| `docs/checks/CHECK-...-V1.md` | 신규 (본 문서) |

- 공급자 route 수정 0 · 프론트엔드 수정 0 · `register-routes.ts` 수정 0
- **schema 변경 0 · migration 0 · DB write 0**

## 11. Git

| 항목 | 값 |
|---|---|
| base | `7be0cc39b` |
| commit | (아래 §11 갱신) |
