# IR-O4O-ADMIN-INCOMPLETE-SCREEN-DISPOSITION-V1

> **성격**: 조사 전용 — 코드·route·API·메뉴·권한·운영데이터·배포 **변경 0건**
> **선행**: `docs/investigations/IR-O4O-ADMIN-ORPHAN-ROUTE-TRIAGE-V1.md` (INCOMPLETE 11건)
> **일자**: 2026-08-01

---

## 1. 조사 기준

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `0c4b20acdc8b3b66462a90341f05400beef46749` |
| `HEAD...origin/main` | `0 0` |
| 조사 대상 | INCOMPLETE 11건 (선행 IR §4) |
| 브라우저 확인 | ✅ **11/11 전수** — platform super_admin, read-only. `main` DOM 영역만 추출 + 실패 API 수집 |
| 코드 변경 | **0** / 운영 데이터 변경 **0** / 배포 **없음** |

병렬 세션 산출물 28건은 본 IR 경로와 분리되어 미접촉.

---

## 2. 핵심 결론 — **"화면이 없다"가 아니라 "API가 404"였다**

11건을 `main` 영역까지 들여다본 결과, **프런트엔드 화면은 대부분 정상 렌더**되고 있었다.
선행 IR 이 not-found 로 읽은 것은 **화면 안에 표시된 `Request failed with status code 404` 문구**였다.

원인은 셋으로 갈린다.

| 원인 | 건수 | 성격 |
|---|---:|---|
| **프런트 URL `/api/v1/v1/` 이중 프리픽스** | 3 | 백엔드는 존재. 호출 경로만 틀림 → **작은 수정으로 복구** |
| **백엔드 endpoint 미구현** | 4 | 화면만 있고 API 가 없음 |
| **legacy endpoint** | 1 | 정상 대체 화면 존재 |
| **명시적 placeholder** | 1 | "Coming Soon" |
| **선행 IR 오분류(실제 정상)** | 2 | 아래 §5 자체 정정 |

---

## 3. 전체 판정표

| # | Route | Component | 업무 목적 | 미완성 원인 | 현재 진입선 | API 상태 | 대체 Route | 판정 | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `/admin/store-network` | `StoreNetworkPage` | 매장 네트워크 현황 | **호출 URL 이중 프리픽스** | menu-less | `GET /api/v1/**v1/**admin/store-network/{summary,top-stores,insights}` → **404**. 백엔드 `routes/platform/store-network-insights.service.ts` **존재** | — | **RECOVER** | **P1** |
| 2 | `/admin/physical-stores` | `PhysicalStoresPage` | 물리 매장 목록·동기화 | **동일 이중 프리픽스** | menu-less | `/api/v1/**v1/**admin/physical-stores` → **404**. 백엔드 `routes/platform/physical-store.routes.ts` **존재** | — | **RECOVER** | **P1** |
| 3 | `/admin/platform/hub` | `PlatformHubPage` | 플랫폼 통합 운영 허브 | **동일 이중 프리픽스** | menu-less | `/api/v1/**v1/**platform/hub/summary` → **404**. 백엔드 `modules/platform/platform-hub.controller.ts` **존재** | — | **RECOVER** | **P1** |
| 4 | `/admin/dropshipping/settlements` | `DropshippingSettlementListPage` | 드롭쉬핑 정산 배치 | **백엔드 endpoint 부재** | menu-less | `/api/v1/dropshipping/admin/settlements/batches` → 404. 실제 mount 된 것은 `catalog-items`·`offers`·`logs` **뿐** | — | **IMPLEMENT** | P2 |
| 5 | `/admin/dropshipping/order-relays` | `DropshippingOrderRelayListPage` | 주문 전달(Relay) 관리 | **백엔드 endpoint 부재** | menu-less | `/api/v1/dropshipping/admin/order-relays` → 404 (동일) | — | **IMPLEMENT** | P2 |
| 6 | `/admin/dashboard/operations` | `OperationsDashboard` | 운영 모니터링 대시보드 | **백엔드 endpoint 부재** | menu-less | `/api/v1/admin/dashboard/{operations,system}` → 404. 백엔드 route 파일 미발견 | — | **IMPLEMENT** | P2 |
| 7 | `/monitoring` | `IntegratedMonitoring` | 통합 모니터링 | **백엔드 endpoint 부재** (본문 렌더 0) | menu-less | `/api/v1/monitoring/summary` → 404. 백엔드 미발견 | `/monitoring/performance`·`/security` (별도) | **IMPLEMENT** | P2 |
| 8 | `/posts` | `Posts` | 글 목록 (WP 계열) | **legacy endpoint** | menu-less | `/api/v1/posts?per_page=1000` → 404 | **`/admin/cms/contents`** (메뉴 존재·정상) | **REDIRECT** | P2 |
| 9 | `/reusable-blocks` | (Suspense) | 재사용 블록 | **명시적 placeholder** | menu-less | 호출 없음. 본문 = `Reusable Blocks - Coming Soon` | — | **HIDE**(연결 금지) | P3 |
| 10 | `/appearance/theme` | `SiteThemeSettings` | 사이트 테마 설정 | **없음 — 정상 동작** | menu-less | 실패 API 0건. 색상·타이포·레이아웃 UI 완전 렌더 | — | **NOT_INCOMPLETE** | — |
| 11 | `/admin/appstore/installed` | `AppStorePage(defaultTab=installed)` | 설치 모듈 현황 | **없음 — 정상 동작** | menu-less | 실패 API 0건. "등록된 모듈(6)/미등록(2)" 정상 표시 | — | **NOT_INCOMPLETE** | — |

---

## 4. 판정 집계

| 판정 | 건수 |
|---|---:|
| RECOVER | **3** |
| IMPLEMENT | **4** |
| REDIRECT | 1 |
| HIDE | 1 |
| HOLD | 0 |
| REVIEW_REMOVE | 0 |
| **NOT_INCOMPLETE** (요청서 외 추가) | **2** |
| **합계** | **11** ✅ |

> **요청서 범주에서 벗어난 항목 1가지를 명시한다.**
> 요청서의 6개 판정은 전부 "미완성"을 전제하는데, 재검증 결과 2건은 **이미 정상 동작**했다.
> 이를 억지로 HOLD 나 RECOVER 로 넣으면 사실과 달라지므로 `NOT_INCOMPLETE` 를 별도로 두었다.
> 보조 조치로 4·5·6·7 에는 **HIDE(구현 전 메뉴 연결 금지)** 를 함께 부여한다.

---

## 5. 선행 IR 자체 정정

선행 `IR-O4O-ADMIN-ORPHAN-ROUTE-TRIAGE-V1` 은 `/appearance/theme` 와 `/admin/appstore/installed` 를
**INCOMPLETE 로 잘못 분류**했다.

- **원인**: 당시 판정이 `document.body.innerText` 에서 사이드바 텍스트를 문자열 치환으로 걷어낸 뒤
  길이 `≤200` 이면 "주 콘텐츠 없음" 으로 본 **휴리스틱**이었다. 치환이 완전하지 않아 실제 콘텐츠가 있는
  화면도 짧게 측정됐다.
- **이번 방식**: `document.querySelector('main')` 로 주 영역을 직접 잡고, 실패한 `/api/*` 응답을 함께 수집했다.
- **결과**: 두 화면 모두 실패 API 0건, 완전한 UI 렌더 확인.

같은 휴리스틱을 썼던 `/monitoring`(len=162) 은 이번 정밀 측정에서도 **main 길이 0 + API 404** 로
미완성이 재확인됐다. 즉 정정 대상은 위 2건뿐이다.

---

## 6. 가장 중요한 발견 — 이중 프리픽스 3건

```
apps/admin-dashboard/src/api/store-network.ts:40          '/v1/admin/store-network/summary'
apps/admin-dashboard/src/pages/platform/StoreNetworkPage.tsx:129   '/v1/admin/store-network/summary'
apps/admin-dashboard/src/pages/platform/PhysicalStoresPage.tsx:151,173,196,199  '/v1/admin/physical-stores…'
apps/admin-dashboard/src/pages/platform/PlatformHubPage.tsx:105,131            '/v1/platform/hub/…'
```

API 클라이언트가 이미 `/api/v1` 을 붙이는데 호출부가 `/v1/...` 을 다시 붙여 **`/api/v1/v1/...`** 가 된다.
백엔드 라우트는 세 건 모두 **실재**하므로, 선행 `/v1` 제거만으로 복구될 가능성이 높다.

**단, 이번 WO 범위는 판정까지다. 수정하지 않았고, 실제 복구 여부는 후속 WO 에서 확인해야 한다.**
(백엔드 경로가 정확히 `/api/v1/admin/store-network/summary` 인지까지는 미검증 — §9)

---

## 7. 운영 진입선에서 숨겨야 할 화면

현재 **11건 전부 menu-less** 이므로 즉시 노출되는 위험은 없다.
다만 후속 메뉴 연결 WO 에서 **다음 4건은 연결 대상에서 제외**해야 한다.

- `/admin/dropshipping/settlements`
- `/admin/dropshipping/order-relays`
- `/admin/dashboard/operations`
- `/monitoring`

`/reusable-blocks` 도 "Coming Soon" 이므로 연결 금지.

---

## 8. 후속 WO 후보

```text
후보 WO: ADMIN-API-DOUBLE-PREFIX-FIX
대상: store-network.ts, StoreNetworkPage.tsx, PhysicalStoresPage.tsx, PlatformHubPage.tsx
예상 변경 범위: 프런트 4파일, 호출 URL의 선행 '/v1' 제거 (약 8곳)
선행 조건: 각 백엔드 실제 경로 확인 (§9)
독립 실행 가능: 예   ← 가장 먼저 처리할 대상
```

```text
후보 WO: ADMIN-POSTS-LEGACY-REDIRECT
대상: /posts (+ /posts/categories, /posts/tags 동반 검토)
예상 변경 범위: content.routes.tsx redirect 1~3건
선행 조건: /admin/cms/contents 가 동등 기능인지 확인, 외부 bookmark 영향 검토
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-DROPSHIPPING-ADMIN-API-IMPLEMENT
대상: settlements/batches, order-relays 백엔드
예상 변경 범위: api-server 신규 endpoint (+ 프런트 계약 정합)
선행 조건: 업무 필요성·정산 정책 확정
독립 실행 가능: 아니오 (제품 결정 선행)
```

```text
후보 WO: ADMIN-OPERATIONS-MONITORING-API-IMPLEMENT
대상: /admin/dashboard/operations, /monitoring
선행 조건: 지표 출처·범위 확정
독립 실행 가능: 아니오
```

```text
후보 WO: ADMIN-PLACEHOLDER-SCREEN-POLICY
대상: /reusable-blocks
목표: 미구현 화면의 노출 정책(숨김/제거) 확정
독립 실행 가능: 예 (소규모)
```

---

## 9. 미검증·HOLD

- **백엔드 정확한 경로 미검증** — RECOVER 3건은 "백엔드 라우트 파일이 존재한다" 까지만 확인했다.
  `/api/v1/admin/store-network/summary` 형태가 정확한지, mount prefix 가 무엇인지는 확인하지 않았다.
  따라서 "`/v1` 제거만으로 해결" 은 **가설**이며 후속 WO 에서 검증해야 한다.
- **쓰기 동작 전면 미검증** — 생성·수정·삭제·동기화 버튼(예: physical-stores `sync`)을 누르지 않았다.
- **HOLD 0건** — RBAC F9·역할 정책이 필요한 항목은 이번 11건에 없었다.
- **REVIEW_REMOVE 0건** — 외부 bookmark 사용을 코드로 배제할 수 없어 어떤 route 도 제거 대상으로 확정하지 않았다. `/posts` 도 제거가 아니라 REDIRECT 로 두었다.
- `/monitoring/performance`·`/monitoring/security` 는 이번 11건 밖이라 별도 확인하지 않았다.

---

## 10. 검증 체크

| # | 항목 | 결과 |
|---|---|:--:|
| 1 | 11개 route 각각 정확히 한 번 포함 | ✅ |
| 2 | 판정 합계 = 11 | ✅ |
| 3 | 브라우저 전수 확인 | ✅ 11/11 |
| 4 | not-found 만으로 제거 확정 안 함 | ✅ REVIEW_REMOVE 0 |
| 5 | API·업무 존재 시 RECOVER 판정 | ✅ 3건 |
| 6 | 대체 화면 존재 시 REDIRECT 검토 | ✅ `/posts` |
| 7 | 코드·운영 데이터 변경 0 | ✅ |

---

*조사 전용 · 코드 0 변경 · 운영 데이터 0 변경 · 배포 없음*
