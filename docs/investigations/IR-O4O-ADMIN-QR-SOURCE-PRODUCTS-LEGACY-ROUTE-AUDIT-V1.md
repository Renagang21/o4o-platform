# IR-O4O-ADMIN-QR-SOURCE-PRODUCTS-LEGACY-ROUTE-AUDIT-V1

- **성격**: read-only 조사 (코드·DB·배포 변경 0)
- **작성일**: 2026-08-10
- **판정**: **REPLACE** — route 는 살아 있다. legacy 가 아니다.
  admin-dashboard 의 호출이 **service segment 를 빠뜨려** 404 이며,
  단순 prefix 복구로 닫으면 안 되는 **주체·소스 축 문제**가 함께 있다.

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 조사 시점 HEAD | `39d30bb2111c13921e1c071573e91cab55dc07c2` |
| 브랜치 | `main` (worktree clean) |
| 발단 | [`CHECK-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1`](../checks/CHECK-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1.md) smoke 중 관측된 404 |

---

## 2. QrCreatePage 도달 가능성

**도달 가능하다.** dead route 가 아니다.

| 항목 | 값 |
|---|---|
| route 등록 | `apps/admin-dashboard/src/routes/lms-marketing.routes.tsx:153` (`/store/qr/create`) · `:160` (`/store/qr`) |
| guard | `AdminProtectedRoute requiredRoles={['admin']}` |
| 진입점 1 | `pages/store/qr/QrListPage.tsx:107,117` — "QR 생성" 버튼 |
| 진입점 2 | `pages/kpa/StoreContentWorkspacePage.tsx:133` — 자료 카드의 QR CTA (`/kpa/content-workspace`, guard `admin·super_admin·operator·supplier`) |
| **좌측 메뉴 노출** | **없음** — `admin/menu/admin-menu.static.tsx` 에 QR 항목 0건 |

즉 **메뉴에는 없고 직접 URL·내부 CTA 로만 들어가는 화면**이다.

> 추가 관측: `StoreContentWorkspacePage` 는 `navigate('/store/qr/create', { state: { prefillTitle, prefillLibraryItemId } })`
> 로 prefill 을 넘기지만 **`QrCreatePage` 는 `location.state` 를 전혀 읽지 않는다.**
> 자료 → QR 연결 동선이 화면 단에서도 끊겨 있다 (이번 IR 에서 수정하지 않음).

---

## 3. 프론트 호출 위치

`apps/admin-dashboard/src/api/qr.api.ts` (헤더 주석 `WO-STORE-QR-PRODUCT-DIRECT-LINK-V1`)

| # | line | 호출 | 사용처 |
|---|---|---|---|
| 1 | `:88` | `GET /pharmacy/qr/source/products` | `QrCreatePage` Step 2 상품 선택 |
| 2 | `:108` | `GET /pharmacy/qr` | `QrListPage` 목록 |
| 3 | `:123` | `POST /pharmacy/qr` | QR 생성 |
| 4 | `:131` | `DELETE /pharmacy/qr/{id}` | 삭제 |
| 5 | `:139` | `GET /pharmacy/qr/{id}/image` | 이미지 다운로드 |
| 6 | `:150` | `GET /pharmacy/qr/{id}/flyer` | 전단 다운로드 |

6개 모두 `authClient.api` 를 쓴다. **이번 404 는 `source/products` 단독 결함이 아니라 6개 전부의 결함이다.**

---

## 4. 최종 요청 URL

`authClient` 의 baseURL 은 `getApiUrl()` 로 항상 `.../api/v1` 로 끝난다.

```
https://api.neture.co.kr/api/v1  +  /pharmacy/qr/source/products
= https://api.neture.co.kr/api/v1/pharmacy/qr/source/products     → 404
```

**접두 조립 자체는 정상이다.** LMS 건(`/api` 이중 접두)과 성격이 다르다.
문제는 **경로에 service segment(`/kpa` · `/glycopharm` · `/cosmetics`)가 없다**는 점이다.

프로덕션 실측 (미인증 GET · 상태코드만 확인, 조회 결과 없음):

| URL | 상태 | 해석 |
|---|:---:|---|
| `/api/v1/pharmacy/qr/source/products` | **404** | route 없음 |
| `/api/v1/kpa/pharmacy/qr/source/products` | **401** | **route 존재** (가드가 인터셉트) |
| `/api/v1/glycopharm/pharmacy/qr/source/products` | **401** | route 존재 |
| `/api/v1/cosmetics/pharmacy/qr/source/products` | **401** | route 존재 |
| `/api/v1/pharmacy/qr` | **404** | route 없음 |
| `/api/v1/kpa/pharmacy/qr` | **401** | route 존재 |

---

## 5. 백엔드 route 존재 여부

**존재한다. 제거된 적이 없다.**

`apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`

```ts
:144  const requirePharmacyOwner = createRequireStoreOwner(dataSource, serviceKey);
:176  router.get('/pharmacy/qr/source/products', requireAuth, requirePharmacyOwner, …)
```

같은 controller 에 11개 route 가 있고 admin 이 호출하는 6개가 전부 포함된다
(`:149 /qr/public/:slug`, `:176 source/products`, `:232 목록`, `:248 analytics`, `:264 image`,
`:308 export`, `:387 print`, `:465 flyer`, `:557 POST`, `:585 PUT`, `:601 DELETE`).

**마운트 위치가 전부 service router 내부다.**

| mount | 파일 |
|---|---|
| `router.use('/', createStoreQrLandingController(…, 'kpa'))` | `routes/kpa/kpa.routes.ts:437` |
| `… 'glycopharm'` | `routes/glycopharm/glycopharm.routes.ts:406` |
| `… 'cosmetics'` | `routes/cosmetics/cosmetics.routes.ts:173` |

`bootstrap/register-routes.ts` 는 이 라우터들을 `/api/v1/kpa` · `/api/v1/glycopharm` · `/api/v1/cosmetics`
에 마운트한다. **`/api/v1/pharmacy` 마운트는 존재하지 않으며, git 이력상 존재한 적도 없다**
(`git log -S"'/api/v1/pharmacy'"` — bootstrap 계열 0건).

`source/products` 핸들러 본문(`:180~229`)도 정상 동작 코드다.

```sql
SELECT spo.id, COALESCE(pm.name, pm.regulatory_name,'Unknown') AS name,
       pm.brand_name AS "brandName", spo.price_general::int AS price,
       pm.specification AS description
  FROM supplier_product_offers spo
  JOIN product_masters pm ON pm.id = spo.master_id
 WHERE spo.is_active = true AND spo.approval_status='APPROVED'
   AND spo.distribution_type='PUBLIC'
```

즉 **공급자 공개·승인 offer 목록**을 반환한다. 삭제·주석처리·deprecated 표기 어디에도 없다.

---

## 6. 현재 QR canonical 구조

같은 controller·같은 service(`services/store/store-qr.service.ts`)를 **서비스별 경로로** 소비하는 것이 현행이다.

| 소비 주체 | 경로 | 파일 |
|---|---|---|
| KPA 매장 | `/api/v1/kpa/pharmacy/qr/*` | `services/web-kpa-society/src/api/storeQr.ts` |
| GlycoPharm 매장 | `/api/v1/glycopharm/pharmacy/qr/*` | `services/web-glycopharm/src/pages/store/StoreQrPage.tsx` |
| K-Cosmetics 매장 | `/api/v1/cosmetics/pharmacy/qr/*` | `services/web-k-cosmetics/src/pages/store/StoreQrPage.tsx` |
| Pharmacy-Hub 매장 | `/api/v1/pharmacy-hub/store-owner/qr/*` | `controllers/pharmacy-hub/PharmacyHubStoreQrController.ts` |
| **admin-dashboard** | `/api/v1/pharmacy/qr/*` | **어디에도 마운트되지 않음 → 404** |

**QR 생성은 매장(store_owner) 주체 기능**이며, 3개 서비스 매장 프론트에 이미 살아 있는 canonical 화면이 있다.
공개 랜딩은 `/qr/{slug}` 이고 QR 이미지는 저장하지 않고 동적 생성한다 (기존 baseline 유지).

### 6-1. 가장 최근 canonical 은 supplier offer 를 소스로 쓰지 않는다

`routes/pharmacy-hub/pharmacy-hub.routes.ts:354` 는 공통 `/pharmacy/qr/*` 를 **의도적으로 마운트하지 않는다**고
명시하고, 그 이유를 두 가지로 적고 있다.

1. `createRequireStoreOwner(=resolveStoreAccess)` 가 `organization_members` 를 **정렬 없는 `LIMIT 1`** 로 골라
   실제 소속 조직과 어긋날 수 있다.
2. > "연결 대상은 **매장 소유 자료만** 통과한다 … `/store-owner/products` 의 B2B 공급 offer 를
   > 실행 자산 SSOT 로 쓰지 않는다."

`PharmacyHubStoreQrController` 헤더도 같은 축이다 — `product` 타입은
`organization_product_listings`(매장 경영활용 제품) 소유 검증 후 연결하며,
"**연결 대상이 없는 QR 타입은 만들지 않는다**"고 못박는다.

즉 admin 화면이 부르는 `source/products`(= `supplier_product_offers`)는
**2026-08 시점 최신 canonical 이 QR 소스로 채택하지 않기로 한 축**이다.
과거 문서([`IR-O4O-KPA-QR-CANONICAL-AND-LEGACY-AUDIT-V1`](../archive/investigations/IR-O4O-KPA-QR-CANONICAL-AND-LEGACY-AUDIT-V1.md):156)
가 이 route 를 `canonical` 로 표기한 것은 **당시 기준으로는 맞고**, 지금도 route 는 살아 있으나
**소스 정책은 그 뒤로 이동했다.**

---

## 7. legacy · dead 여부

| 대상 | 판정 | 근거 |
|---|---|---|
| 백엔드 route `/pharmacy/qr/source/products` | **살아 있음** | controller 존재 · 3개 서비스에서 401 응답 · 삭제 이력 0 |
| admin-dashboard `qr.api.ts` 호출 | **깨진 호출** | service segment 누락 → 6개 전부 404 |
| `QrCreatePage` / `QrListPage` 화면 | **한 번도 동작한 적 없음** | 아래 이력 |

### 이력 — 생성 시점부터 404 였다

| commit | 상태 |
|---|---|
| `2034f01a8` (최초 생성, WO-STORE-QR-PRODUCT-DIRECT-LINK-V1) | `authClient.api.get('/api/v1/pharmacy/qr/source/products')` → 실제 `/api/v1/api/v1/pharmacy/...` **404** |
| `33b267d18` (2026-07-31, 이중 접두 59파일 일괄 정정) | `/pharmacy/qr/source/products` 로 교정 → 이중 접두는 해소됐으나 **service segment 가 없어 여전히 404** |
| `7b48b8987` (직전 WO) | 실패를 "상품 0건"으로 위장하지 않도록 오류 배너 추가 — **404 자체는 그대로** |

이중 접두 일괄 정정은 "`/api/v1` 중복 제거"만 수행했고 **경로가 실재하는지는 검증하지 않았다.**
그래서 이 화면은 admin-dashboard 에 추가된 이래 **단 한 번도 상품 목록을 받은 적이 없다.**

---

## 8. 판정

### **REPLACE** (route 복구 단독은 부적절)

- **REMOVE 아님** — 백엔드 route 는 canonical 로 살아 있고 3개 서비스 매장 프론트가 실사용 중이다.
  route 를 지우면 KPA·GlycoPharm·K-Cosmetics 매장 QR 이 깨진다.
- **단순 PRODUCE 아님** — `/kpa` 를 붙이면 401 은 넘겠지만 다음 3가지가 미해결로 남는다.
  1. **주체 축**: admin-dashboard 는 운영자/관리자 콘솔이고 이 route 의 가드는 `store_owner` 다.
     운영자 계정이 `organization_members` `LIMIT 1` 로 어떤 매장에 붙을지 보장이 없다(§6-1).
  2. **서비스 축**: admin-dashboard 는 cross-service 콘솔이라 `kpa` / `glycopharm` / `cosmetics`
     중 무엇을 붙일지는 코드가 아니라 **정책 결정**이다.
  3. **소스 축**: `supplier_product_offers` 를 QR 소스로 쓰는 것은 최신 canonical 이 채택하지 않은 방향이다(§6-1).
- 따라서 **화면을 유지한다면** 소스와 경로를 현행 canonical 로 교체해야 하고,
  **유지하지 않는다면** 매장 프론트로 보내고 이 화면을 은퇴시키는 편이 맞다.

> 이 화면의 존치 여부(운영자 콘솔에서 매장 QR 을 만들 것인가)는 **정책 판단**이며
> 후속 WO 착수 전에 먼저 확정되어야 한다. 이 IR 은 그 판단을 대신하지 않는다.

---

## 9. 후속 WO 후보

| 우선순위 | 후보 | 성격 |
|:---:|---|---|
| 1 | `IR-O4O-ADMIN-STORE-QR-SCREEN-OWNERSHIP-POLICY-V1` | **선행.** 운영자 콘솔이 매장 QR 을 만들 주체인지 확정 (§8 정책 판단) |
| 2 | `WO-O4O-ADMIN-QR-CREATE-PAGE-CANONICAL-SOURCE-REPLACE-V1` | 존치 시 — 경로·소스를 canonical 로 교체 |
| 3 | `WO-O4O-ADMIN-QR-CREATE-LEGACY-UI-REDIRECT-V1` | 은퇴 시 — 매장 프론트 안내/redirect (직전 legacy redirect WO 와 동형) |
| 4 | `WO-O4O-ADMIN-API-SERVICE-SEGMENT-AUDIT-V1` | `33b267d18` 일괄 정정이 남긴 **경로 실재 미검증** 전수 점검 |
| 5 | `WO-O4O-ADMIN-QR-CREATE-PREFILL-STATE-WIRING-V1` | `StoreContentWorkspacePage` prefill state 미소비 (§2 관측) |

원래 §10 후보 중 `WO-O4O-ADMIN-QR-SOURCE-PRODUCTS-ROUTE-FIX-V1`(백엔드 route 추가)은
**권고하지 않는다.** `/api/v1/pharmacy` 를 새로 마운트하면 service scope 없는 QR 진입점이 생겨
Boundary Policy(CLAUDE.md §7) 와 충돌한다.

---

## 10. read-only 준수 확인

| 금지 항목 | 준수 |
|---|:--:|
| 코드 수정 | ✅ 0 (변경 파일 0 · 본 문서만 신규) |
| route 추가 | ✅ 0 |
| 프론트 호출 경로 수정 | ✅ 0 |
| DB write · migration | ✅ 0 (SQL 미실행) |
| 배포 | ✅ 0 |
| 메뉴 제거 | ✅ 0 |
| 권한 · role · 인증 정책 변경 | ✅ 0 |
| QR 생성 정책 변경 | ✅ 0 |
| ProductMaster · StoreLocalProduct 모델 변경 | ✅ 0 |

프로덕션 접촉은 **미인증 GET 6건의 상태코드 확인**뿐이다 (응답 본문 미사용 · 상태 변경 없음).
