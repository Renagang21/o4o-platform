# WO-O4O-ADMIN-API-DOUBLE-PREFIX-RESIDUAL-FIX-V1 — CHECK

> **선행**: `WO-O4O-ADMIN-API-DOUBLE-PREFIX-FIX-V1` (commit `3b2b50c3c`, `4795d99b8`)
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `4795d99b8`

---

## 1. 조사 기준

| 항목 | 값 |
|---|---|
| 대상 | 3파일 / **11개 호출부** (선행 CHECK §4 에서 발견) |
| 전수 재검색 | `authClient` 사용 + 선행 `/v1` 조합 = **정확히 이 3파일 11곳뿐**. 추가 발견 **0** |
| 클라이언트 규약 | `authClient` base `= /api/v1` → 선행 `/v1` 금지 (선행 WO 확정) |
| `unifiedApi` | 이번 작업 **미수정** (base `/api` 라 선행 `/v1` 이 정상) |

**전역 문자열 치환은 하지 않았다.** 호출부마다 클라이언트·백엔드 mount 를 개별 확인했다.

---

## 2. 호출부 판정표

| 화면 | 파일 | 호출 목적 | Client | 변경 전 최종 URL | 백엔드 실제 Route | 판정 | 변경 후 |
|---|---|---|---|---|---|---|---|
| 서비스 현황 | `ServiceOverview.tsx` | summary | authClient | `/api/v1/**v1/**service/monitor/summary` | `/api/v1/service/monitor/summary` ✅ | **FIX** | `/service/monitor/summary` |
| 〃 | 〃 | tenants | authClient | `…/v1/service/monitor/tenants` | `/tenants` ✅ | **FIX** | `/service/monitor/tenants` |
| 〃 | 〃 | apps | authClient | 〃 | `/apps` ✅ | **FIX** | `/service/monitor/apps` |
| 〃 | 〃 | themes | authClient | 〃 | `/themes` ✅ | **FIX** | `/service/monitor/themes` |
| 〃 | 〃 | warnings | authClient | 〃 | `/warnings` ✅ | **FIX** | `/service/monitor/warnings` |
| 〃 | 〃 | validate (POST) | authClient | 〃 | `/validate` ✅ | **FIX**(경로만) | `/service/monitor/validate` |
| 〃 | 〃 | report | authClient | 〃 | `/report` ✅ | **FIX** | `/service/monitor/report?format=…` |
| 판매자 정산 | `SellerSettlements.tsx` | 목록 | authClient | `/api/v1/v1/seller/settlements` | **백엔드 없음** — `/api/v1/seller` mount 0건, `seller.controller.ts` 에 settlements endpoint 0건 | **HOLD** | 미변경 |
| 〃 | 〃 | preview | authClient | `/api/v1/v1/seller/settlements/preview` | **백엔드 없음** | **HOLD** | 미변경 |
| 공급자 정산 | `SupplierSettlements.tsx` | 목록 | authClient | `/api/v1/v1/supplier/settlements` | **`/api/v1/neture/supplier/settlements`** — `/v1` 제거만으론 여전히 불일치 | **HOLD** | 미변경 |
| 〃 | 〃 | preview | authClient | `/api/v1/v1/supplier/settlements/preview` | **`/preview` endpoint 자체 없음** (`/settlements`·`/kpi`·`/:id` 만 존재) | **HOLD** | 미변경 |

백엔드 mount 근거: `register-routes.ts:176` `app.use('/api/v1/service/monitor', serviceMonitorRoutes)` ·
`neture.routes.ts:87` `router.use('/supplier', createSupplierSettlementController(...))` 가
`register-routes.ts:768` `app.use('/api/v1/neture', netureRoutes)` 아래에 mount.

---

## 3. 중지 조건 적용 — 정산 2화면은 수정하지 않음

WO 의 중지 조건 두 가지가 실제로 발생해 **HOLD** 로 남겼다.

1. **"백엔드 endpoint 가 존재하지 않음"** → 판매자 정산 (`/seller/settlements` 계열 전무)
2. **"선행 `/v1` 제거 외의 변경이 필요함"** → 공급자 정산
   - 올바른 경로는 `/neture/supplier/settlements` 라 **prefix 를 새로 붙여야** 한다
   - `preview` 는 백엔드에 아예 없다

두 화면은 route 도 `/dashboard/seller/settlements`·`/dashboard/supplier/settlements` 이며,
선행 triage 에서 platform super_admin 계정으로 **권한 거부(역할 전용)** 로 확인된 화면이다.
따라서 경로만 고쳐도 검증이 불가능하다.

---

## 4. 수정 결과

| 항목 | 값 |
|---|---:|
| 수정 파일 | **1** (`ServiceOverview.tsx`) |
| 수정 호출부 | **7** |
| HOLD 호출부 | **4** |
| 대상 파일 내 잘못된 `authClient + /v1` 잔존 | ServiceOverview **0** / 정산 2파일 4곳(의도적 보존) |
| 범위 밖 추가 발견 | **0** |

**하지 않은 것**: fallback·재시도·오류 숨김 추가 없음 / 백엔드 route 추가 없음 /
응답 구조·권한 가드·데이터 처리 불변 / `unifiedApi` 미수정 / 쓰기 API 실행 0건.

---

## 5. `/admin/services/overview` 기존 READY 판정 재평가

선행 `IR-O4O-ADMIN-ORPHAN-ROUTE-TRIAGE-V1` 은 이 화면을 **`ACTIVE_ENTRY` + `READY`**
(len=379, 콘솔오류 0)로 분류했다. **이번 조사로 그 판정이 틀렸음이 확인된다.**

- 7개 조회가 전부 `/api/v1/v1/...` 로 404 였다.
- 그런데 **콘솔 오류가 0** 이었던 이유: 호출이 전부 react-query `queryFn` 안에 있고
  `try/catch` 나 오류 UI 가 없어, 실패가 `isError` 로만 남고 화면은 **빈 카드로 부분 렌더**됐다.
- 즉 "정상 렌더" 가 아니라 **"데이터 없이 뼈대만 렌더"** 였다.

→ 선행 triage 의 판정 근거(콘솔오류 0 + 렌더 길이)가 이 화면에서는 **오탐**이었다.
최종 판정은 §6 프로덕션 검증 결과로 확정한다.

---

## 6. 프로덕션 검증 (배포 후, read-only)

배포: `Deploy Admin Dashboard (Cloud Run)` **success** (commit `951567cb3`)

### 6-1. 서비스 현황 `/admin/services/overview` · `/admin/services`

| 조회 API | 변경 전 | 변경 후 |
|---|---|---|
| `/service/monitor/tenants` | 404 (이중) | **200** |
| `/service/monitor/apps` | 404 (이중) | **200** |
| `/service/monitor/themes` | 404 (이중) | **200** |
| `/service/monitor/warnings` | 404 (이중) | **200** |
| `/service/monitor/summary` | 404 (이중) | **500** ← 별개 결함 |

- **404 = 0건 · 이중 프리픽스 = 0건** → 본 WO 의 교정 목표는 달성됐다.
- 화면은 `Service Monitoring Dashboard` 헤더와 탭(Services Overview / Apps Matrix / Themes / Warnings)이
  렌더되고 본문은 `No Services Found` 빈 상태다.

### 6-2. `/summary` 500 의 원인 — **범위 밖 별개 결함**

Cloud Run 로그:

```
[ServiceMonitor] Failed to get system summary: relation "sites" does not exist
[ServiceMonitor] Error getting themes status:  relation "sites" does not exist
[ServiceMonitor] Error building apps matrix:   relation "sites" does not exist
[ServiceMonitor] Validation failed:            relation "sites" does not exist
```

**운영 DB 에 `sites` 테이블이 없다.** `themes`·`apps`·`warnings` 가 200 인 것은 핸들러가
예외를 삼키고 빈 결과를 돌려주기 때문이고, `summary` 만 500 으로 표면화된다.

즉 화면의 `No Services Found` 는 **"서비스가 없다" 가 아니라 "조회가 실패했다"** 는 뜻이다.
이는 선행 감사에서 다룬 **schema drift 계열** 문제이며, 본 WO 의 제외 범위(백엔드·DB)라 손대지 않았다.

### 6-3. 정산 2화면 (HOLD 확인)

| 화면 | 결과 |
|---|---|
| `/dashboard/seller/settlements` | **접근 권한이 없습니다** — API 호출 0건 |
| `/dashboard/supplier/settlements` | **접근 권한이 없습니다** — API 호출 0건 |

역할 전용 화면이라 platform super_admin 으로도 진입 불가. HOLD 판정이 재확인됐다.

### 6-4. 화면별 최종 상태

| 화면 | 조회 API | 렌더 | 콘솔 | 쓰기 미실행 | **최종 판정** |
|---|---|---|---|:--:|---|
| 서비스 현황 | 4×200 / 1×500 (`sites` 부재) | 헤더·탭 정상, 본문 빈 상태 | 2 | ✅ | **READY_AFTER_FIX** |
| 판매자 정산 | 호출 0 (권한 거부) | 권한 안내 | 0 | ✅ | **HOLD** |
| 공급자 정산 | 호출 0 (권한 거부) | 권한 안내 | 0 | ✅ | **HOLD** |

**서비스 현황은 메뉴 연결 대상으로 승격하지 않는다** — 프리픽스는 고쳐졌으나
`sites` 테이블 부재로 실제 데이터를 표시하지 못하므로 `READY` 가 아니다.

---

## 7. 미검증 / 후속

- **쓰기 API 미실행** — `POST /service/monitor/validate` 는 경로만 교정하고 버튼을 누르지 않았다.
- **정산 2화면 미검증** — 권한 거부로 화면 진입 자체가 불가하고, 백엔드도 부재/불일치라 수정 대상이 아니다.
- **`sites` 테이블 부재의 영향 범위 미조사** — ServiceMonitor 외에 어떤 기능이 이 테이블을 참조하는지 확인하지 않았다.
- **후속 WO 후보**
  - `ADMIN-SERVICE-MONITOR-SITES-TABLE-DISPOSITION` — 운영 DB 에 `sites` 테이블이 없다.
    선행 감사에서 다룬 schema drift 계열이므로, 테이블 생성 필요성·참조 범위·
    ServiceMonitor 의 예외 삼킴(200 으로 위장) 처리까지 함께 판정해야 한다. **P1 후보**
  - `ADMIN-SETTLEMENT-SCREEN-DISPOSITION` — 판매자/공급자 정산 화면의 처분(구현·경로교정·제거) 판정.
    공급자는 `/neture/supplier/settlements` 로 경로 교정 + `preview` 구현 여부 결정이 필요하고,
    판매자는 백엔드 자체가 없어 업무 필요성 판단이 선행되어야 한다.
