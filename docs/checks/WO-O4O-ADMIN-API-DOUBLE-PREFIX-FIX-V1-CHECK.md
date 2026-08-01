# WO-O4O-ADMIN-API-DOUBLE-PREFIX-FIX-V1 — CHECK

> **선행**: `docs/investigations/IR-O4O-ADMIN-INCOMPLETE-SCREEN-DISPOSITION-V1.md` (RECOVER 3건)
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `6acd48a00`

---

## 1. 확정 원인 — API base URL 과 호출 경로의 이중 프리픽스

선행 IR 은 "`/v1` 제거로 해결" 을 **가설**로 남겼다. 이번에 양쪽을 모두 확인해 확정했다.

### 1-1. 클라이언트 base URL (관리자 앱에 2종 공존)

| 클라이언트 | base | 올바른 호출 형태 |
|---|---|---|
| **`authClient`** (`@o4o/auth-client`) | **`https://api.neture.co.kr/api/v1`** — `client.ts:341-356` 이 `/api/v1` 접미를 보장 | `'/admin/...'` (선행 `/v1` **금지**) |
| `unifiedApi` (`api/unified-client.ts:14-24`) | `https://api.neture.co.kr/api` — `/v1` 을 떼고 `/api` 를 붙임 | `'/v1/users'` (선행 `/v1` **필요**) |

→ **두 클라이언트의 규약이 정반대**다. `authClient` 에 `/v1` 을 붙이면 `/api/v1/v1/...` 이 된다.

### 1-2. 백엔드 실제 mount (register-routes.ts)

```
:306   app.use('/api/v1/admin/store-network',  createStoreNetworkRoutes(dataSource))
:310   app.use('/api/v1/admin/physical-stores', createPhysicalStoreRoutes(dataSource))
:1138  app.use('/api/v1/platform/hub',          platformHubRoutes)
```

하위 경로도 전수 대조했다 — 전부 일치.

| 백엔드 | 실제 endpoint |
|---|---|
| `store-network.routes.ts` | `/summary` · `/top-stores` · `/insights` |
| `physical-store.routes.ts` | `/` · `/sync` · `/:id/summary` · `/:id/insights` |
| `platform-hub.controller.ts` | `/summary` · `/trigger` |

→ **가설 확정.** 백엔드는 정상이며 프런트 호출 경로만 틀렸다. 중지 조건 해당 없음.

---

## 2. 변경 내용 — 4파일 / **11개 호출부**

| 파일 | 호출부 | 변경 전 | 변경 후 |
|---|---:|---|---|
| `api/store-network.ts` | 2 | `/v1/admin/store-network/{summary,top-stores}` | `/admin/store-network/{summary,top-stores}` |
| `pages/platform/StoreNetworkPage.tsx` | 3 | `/v1/admin/store-network/{summary,top-stores,insights}` | `/admin/store-network/…` |
| `pages/platform/PhysicalStoresPage.tsx` | 4 | `/v1/admin/physical-stores`, `/sync`, `/:id/summary`, `/:id/insights` | `/admin/physical-stores…` |
| `pages/platform/PlatformHubPage.tsx` | 2 | `/v1/platform/hub/{summary,trigger}` | `/platform/hub/{summary,trigger}` |

### 실제 요청 URL 변화

```
변경 전: https://api.neture.co.kr/api/v1/v1/admin/store-network/summary   → 404
변경 후: https://api.neture.co.kr/api/v1/admin/store-network/summary      → 백엔드 mount 와 일치
```

> WO 는 "약 8개 호출부 이내" 로 예상했으나 실제는 **11개**였다.
> 대상 파일 4개를 벗어나지 않았고 전부 동일 결함이라 함께 정합화했다(같은 화면에 잘못된 `/v1` 잔존 0).

**하지 않은 것**: fallback·재시도 로직 추가 없음 / 백엔드 중복 route 없음 / API 계약·응답 구조·권한 가드 변경 없음.

---

## 3. 검증

| 항목 | 결과 |
|---|---|
| admin-dashboard `tsc --noEmit` | **0 error** |
| 대상 4파일 선행 `/v1` 잔존 | **0건** (검색 확인) |
| 전체 build | 미실행 (WO 지시) |
| 쓰기 동작 | **0건** — `sync`·`trigger` 는 코드 정합성만 확인, 실행하지 않음 |
| 운영 데이터 변경 | **0건** |
| `/appearance/theme`·`/admin/appstore/installed` | **미수정** (정상 동작 확인된 화면) |

---

## 4. 범위 밖에서 발견된 동일 결함 (미수정)

`authClient` + 선행 `/v1` 조합이 **다른 3개 파일에도 11곳** 남아 있다.

| 파일 | 호출부 | 화면 |
|---|---:|---|
| `pages/services/ServiceOverview.tsx` | 7 | `/admin/services/overview` |
| `pages/dashboard/seller/SellerSettlements.tsx` | 2 | 판매자 정산 |
| `pages/dashboard/supplier/SupplierSettlements.tsx` | 2 | 공급자 정산 |

이번 WO 의 대상 3화면이 아니고, "변경 범위가 예상을 크게 벗어남" 을 피하기 위해 **수정하지 않았다.**
각 백엔드 mount 확인이 선행되어야 하므로 별도 WO 후보로 남긴다.

> ⚠️ `/admin/services/overview` 는 선행 triage 에서 `READY`(콘솔오류 0)로 분류됐다.
> 이번 발견과 배치되므로 해당 화면의 오류 처리 방식을 후속 WO 에서 재확인해야 한다.

`unifiedApi` 를 쓰는 호출부(`userApi.ts`, `DynamicRouteLoader`, `useAdminMenu` 등)의 `/v1` 은 **정상**이므로 건드리지 않았다.

---

## 5. 제외 범위 준수

백엔드 endpoint 신규 구현 / API 응답 계약 / 권한·RBAC / 메뉴·route·대시보드 / 데이터 동기화 실행 /
운영 데이터 / Dropshipping·Monitoring API / `/posts` redirect / `pnpm-lock.yaml` / HFF·OTC·타 세션 파일
— **전부 변경 0건**

---

## 6. 미검증

- **프로덕션 브라우저 재확인 미완료** — 배포 후 세 화면의 2xx 응답·데이터 표시를 확인해야 최종 복구가 증명된다. 본 CHECK 작성 시점에는 **코드 정합성까지만** 확인했다.
- **쓰기 경로 미검증** — `physical-stores/sync`, `platform/hub/trigger` 는 경로만 교정했고 실행하지 않았다.
- 응답 데이터 구조가 화면 기대와 일치하는지는 실제 2xx 응답을 받아봐야 확정된다.
