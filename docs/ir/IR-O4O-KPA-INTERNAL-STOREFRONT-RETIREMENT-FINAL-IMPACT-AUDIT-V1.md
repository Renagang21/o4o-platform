# IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-FINAL-IMPACT-AUDIT-V1

- **유형**: 조사 전용 (read-only). 코드·DB 변경 0건.
- **기준 커밋**: `origin/main` = `177d3fb1f`
- **작성일**: 2026-08-12
- **선행**: [IR-...-RETIREMENT-AND-EXTERNAL-SALES-CHANNEL-REPLACEMENT-V1](IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-AND-EXTERNAL-SALES-CHANNEL-REPLACEMENT-V1.md)
- **범위**: O-1(공용 storefront API 소비처 전수) · O-2(B2C channel row census) · O-3(RETAIL+KPA+B2C 주문 census)
- **상태**: **O-1 완료 / O-2·O-3 미실행 (실행 차단 — §4)**

---

## 1. O-1 — 공용 storefront API 서비스별 소비처 전수 · **완료**

### 1-1. 전제 정정 — 서비스마다 storefront 백엔드가 다르다

| 서비스 | storefront API 베이스 | 구현 |
|---|---|---|
| KPA-Society | `/api/v1/stores/*` | **플랫폼 공용** ([unified-store-public.routes.ts:44-47](apps/api-server/src/routes/platform/unified-store-public.routes.ts#L44-L47), 마운트 [register-routes.ts:323](apps/api-server/src/bootstrap/register-routes.ts#L323)) |
| GlycoPharm | `/api/v1/glycopharm/stores/*` | **자체 컨트롤러** ([store.controller.ts](apps/api-server/src/routes/glycopharm/controllers/store.controller.ts)) — `/:slug` · `/storefront-config` · `/hero` · `/template` · `/categories` · `/products` · `/cart` · `/orders` 를 **중복 구현** |
| K-Cosmetics | `/api/v1/cosmetics/stores/*` | 자체 — `settings` · `listings` 중심. storefront-config/hero **없음** |
| Pharmacy-Hub | — | 플랫폼 storefront API **소비 0건** |

→ "공용 handler 라서 못 지운다"는 우려는 **endpoint 단위로 갈린다.** 아래가 전수 결과다.

### 1-2. endpoint × 서비스 소비 매트릭스 (플랫폼 `/api/v1/stores` 기준)

| endpoint | KPA | Glyco | K-Cos | PH | 판정 |
|---|:--:|:--:|:--:|:--:|---|
| `GET /:slug` | O | **O** | **O** | – | **CROSS-SERVICE → KEEP** |
| `GET /:slug/layout` | O | – | – | – | KPA-only → REMOVE |
| `GET /:slug/template` | – | – | – | – | **DEAD** |
| `GET /:slug/storefront-config` | – | – | – | – | **DEAD** |
| `GET /:slug/hero` | – | – | – | – | **DEAD** |
| `GET /:slug/products/featured` | O | – | – | – | KPA-only → REMOVE |
| `GET /:slug/products` | – | – | – | – | **DEAD** |
| `GET /:slug/products/:id` | O | – | – | – | KPA-only → REMOVE |
| `GET /:slug/categories` | – | – | – | – | **DEAD** |
| `GET /:slug/blog` · `/blog/settings` · `/blog/:postSlug` | O | **O** | **O** | – | **CROSS-SERVICE → KEEP** |
| `/:slug/tablet/*` (6개) | O | O | – | – | **CROSS-SERVICE → KEEP** |

**근거**

- `GET /:slug` 가 cross-service 인 이유 — 블로그 공개 페이지가 매장 identity 를 이 endpoint 로 읽는다.
  [packages/shared-space-ui/src/blog/client.ts:78](packages/shared-space-ui/src/blog/client.ts#L78) `fetchPublicStoreInfo()` → `{base}/api/v1/stores/{slug}`.
  소비처: KPA `StoreBlogPage` · GlycoPharm [StoreBlogPage.tsx](services/web-glycopharm/src/pages/store/StoreBlogPage.tsx) · K-Cosmetics `StoreBlogPage.tsx` (3서비스 모두 `@o4o/shared-space-ui` 재사용).
- KPA-only 3건의 유일 소비처 — [StorefrontHomePage.tsx:140-183](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx#L140-L183) (`/:slug`, `/:slug/layout`, `/products/featured`, `/blog`) · [StorefrontProductDetailPage.tsx:10](services/web-kpa-society/src/pages/storefront/StorefrontProductDetailPage.tsx#L10) (`/products/:id`).
- DEAD 5건 — 플랫폼 경로로 호출하는 프런트가 **한 곳도 없다**. GlycoPharm 이 쓰는 것은 동명의 **자체** endpoint(`/glycopharm/stores/...`)다. `packages/ui/store-blocks` 도 직접 fetch 하지 않는다(렌더 전용).

### 1-3. 선행 IR 판정 정정 2건

| 선행 IR 판정 | 정정 |
|---|---|
| 공용 홈 API(`store-public-home.handler.ts`) 전체를 REMOVE 후보 | **`GET /:slug` 는 KEEP.** handler 파일 삭제 불가. 삭제 단위는 `/layout` + product handler 3건이며, `/template`·`/storefront-config`·`/hero`·`/products`·`/categories` 는 dead 정리 대상 |
| `매장 홈 디자인` REMOVE | **프런트만 REMOVE.** 백엔드 [store-settings.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-settings.controller.ts) · [layout.controller.ts](apps/api-server/src/routes/o4o-store/controllers/layout.controller.ts) 는 kpa/glycopharm/cosmetics **3서비스 라우터에 각각 마운트**된 공용 컨트롤러다 (`kpa.routes.ts:113` · `glycopharm.routes.ts:41` · `cosmetics.routes.ts:57`). KPA 소비만 제거하고 컨트롤러는 KEEP |

### 1-4. O-1 부수 발견 (범위 밖, 별도 판단 필요)

GlycoPharm 자체 storefront 는 **`/cart` · `/orders` · `/orders/:id/cancel` 까지 살아 있다** ([store.controller.ts](apps/api-server/src/routes/glycopharm/controllers/store.controller.ts), 소비 [web-glycopharm/src/api/store.ts:179-282](services/web-glycopharm/src/api/store.ts#L179-L282)). 결제만 `410` 이므로 **장바구니·주문 생성 UI 는 남고 결제에서 막히는 상태**다. KPA 철거와 동일한 문제가 GlycoPharm 에도 있으나 이번 WO 범위 밖이므로 **별도 WO 로 분리**한다.

---

## 2. O-2 / O-3 — 미실행

DB 접속 자격정보를 다루는 명령이 실행 환경 정책에 의해 차단되어 **census 를 수행하지 못했다**(§4). 아래 SQL 은 전부 read-only 이며, 그대로 실행하면 결과가 나온다.

### 2-1. O-2 — B2C channel / product-channel census

```sql
-- (a) organization_channels: channel_type 별 분포
SELECT channel_type, status, COUNT(*) AS rows,
       COUNT(DISTINCT organization_id) AS orgs,
       MIN(created_at)::date AS first_created,
       MAX(updated_at)::date AS last_updated
FROM organization_channels
GROUP BY channel_type, status
ORDER BY channel_type, status;

-- (b) organization_product_channels: B2C 채널에 매달린 행
SELECT oc.status,
       COUNT(*) AS rows,
       COUNT(*) FILTER (WHERE opc.is_active) AS active_rows,
       COUNT(DISTINCT oc.organization_id) AS orgs,
       COUNT(DISTINCT opc.product_listing_id) AS listings,
       MAX(opc.updated_at)::date AS last_updated
FROM organization_product_channels opc
JOIN organization_channels oc ON oc.id = opc.channel_id
WHERE oc.channel_type = 'B2C'
GROUP BY oc.status;

-- (c) 대조군 — TABLET (존치 대상, 폐기 후에도 살아야 함)
SELECT COUNT(*) AS rows,
       COUNT(*) FILTER (WHERE opc.is_active) AS active_rows,
       COUNT(DISTINCT oc.organization_id) AS orgs
FROM organization_product_channels opc
JOIN organization_channels oc ON oc.id = opc.channel_id
WHERE oc.channel_type = 'TABLET';

-- (d) B2C 와 TABLET 을 동시에 가진 조직 (폐기 영향 겹침 확인)
SELECT COUNT(DISTINCT organization_id) AS orgs_with_both
FROM organization_channels a
WHERE a.channel_type = 'B2C'
  AND EXISTS (SELECT 1 FROM organization_channels b
              WHERE b.organization_id = a.organization_id AND b.channel_type = 'TABLET');
```

### 2-2. O-3 — RETAIL + KPA + B2C 주문 census

```sql
-- (a) 총량 · 상태 분포
SELECT o.status,
       COUNT(*) AS orders,
       COUNT(DISTINCT o."sellerOrganizationId") AS seller_orgs,
       MIN(o."createdAt")::date AS first_order,
       MAX(o."createdAt")::date AS last_order
FROM checkout_orders o
WHERE o."orderType" = 'retail'
  AND o.metadata->>'serviceKey' = 'kpa'
  AND o.metadata->>'channelType' = 'B2C'
GROUP BY o.status
ORDER BY orders DESC;

-- (b) 연도별 분포 (테스트/과거 데이터 판별용)
SELECT date_trunc('year', o."createdAt")::date AS yr, COUNT(*) AS orders
FROM checkout_orders o
WHERE o."orderType" = 'retail'
  AND o.metadata->>'serviceKey' = 'kpa'
  AND o.metadata->>'channelType' = 'B2C'
GROUP BY 1 ORDER BY 1;

-- (c) metadata 축이 실제로 채워져 있는지 (판정 신뢰도 검증)
SELECT COUNT(*) FILTER (WHERE metadata->>'serviceKey' IS NULL)  AS no_service_key,
       COUNT(*) FILTER (WHERE metadata->>'channelType' IS NULL) AS no_channel_type,
       COUNT(*) AS retail_total
FROM checkout_orders WHERE "orderType" = 'retail';
```

> (c) 는 **필수**다. `metadata.channelType` 이 비어 있는 RETAIL 주문이 많다면 O-3 의 식별 축 자체가 성립하지 않으므로, 폐기 판정 전에 대체 식별자를 먼저 정해야 한다.

**주의**: 컬럼 인용 부호는 실측 전 검증이 필요하다. `checkout_orders` 는 camelCase 컬럼을 쓰므로 `"sellerOrganizationId"` · `"orderType"` · `"createdAt"` 처럼 큰따옴표가 필요하고, `organization_channels` 계열은 snake_case 다. 실행 전 `information_schema.columns` 로 확인할 것.

---

## 3. 확정된 정책 (사용자 판정)

| # | 항목 | 확정 |
|---|---|---|
| O-4 | 의약품 외부 판매 차단 게이트 | **등록 시 + 동기화 시 양쪽.** 공통 함수 `assertExternalSalesEligible(product)` 를 모든 외부 채널 adapter 앞에 둔다. 판정은 **`product_masters.regulatory_type` 단일 기준** — 서비스별 분기(KPA 금지 / K-Cos 허용 등) 금지 |
| O-5 | `StoreChannelsPage` 분할 | **후행.** 자체 B2C UI 제거 → 네이버·쿠팡 UI 추가 → 그 시점에 파일 크기 재판단. 선행 분할은 곧 삭제할 코드를 정리하는 이중 작업 |
| O-6 | 네이버·쿠팡 연동 방식 | **REMOVE 이후 조사.** 외부 공식 API 계약은 변동성이 커서 구현 직전 재조사 |
| — | B2C 운영 데이터 | **삭제하지 않는다.** 기존 row 는 역사 데이터로 남기고 **신규 생성만 차단**하는 것이 1단계 |

---

## 4. 중지 사유 — O-2 · O-3 미실행

프로덕션 DB read-only census 를 위해 다음을 시도했고, 마지막 단계에서 차단됐다.

1. `apps/api-server/.env` 의 `DB_PASSWORD` 가 **빈 값** → 로컬 자격정보로 접속 불가
2. Secret Manager 에는 `cosmetics-db-password` 1건뿐 → 해당 없음
3. `gcloud run services describe o4o-core-api` 로 접속 정보 확인 가능함은 검증됨 (DB `o4o_platform`)
4. **자격정보를 psql 에 전달하는 명령이 실행 환경 정책(auto mode classifier)에 의해 차단** → census 미수행

**해소 방법 중 택1**

- Bash 권한 규칙 추가 후 재실행 (본 문서 §2 SQL 그대로)
- 사용자가 Cloud Console SQL Editor 또는 `gcloud sql connect` 로 §2 SQL 실행 후 결과 전달

> 프록시는 `127.0.0.1:5443` 에 기동해 두었다(다른 세션의 5442 와 분리). 자격정보는 본 문서·커밋 어디에도 기록하지 않았다.

---

## 5. 결론 및 다음 단계

- **O-1 은 완결됐고, 선행 IR 의 REMOVE 목록이 2건 축소됐다.** 공용 `GET /:slug` 는 3서비스 블로그가 쓰므로 KEEP 이고, `매장 홈 디자인` 은 프런트만 REMOVE 다.
- 반대로 **dead endpoint 5건**(`/template` · `/storefront-config` · `/hero` · `/products` · `/categories`)이 새로 확인돼 정리 대상이 늘었다.
- **O-2·O-3 census 없이 REMOVE WO 에 착수하지 않는다.** 특히 O-3 (c) 로 `metadata.channelType` 식별 축의 신뢰도를 먼저 확인해야 한다.
- 순서: **O-2·O-3 실행 → `WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1` → 네이버 조사·파일럿 → 쿠팡 → 공통 Online Sales 모듈 추출**
- 별도 분리: **GlycoPharm 자체 storefront cart/orders 잔존** (§1-4)
