# CHECK-O4O-MULTILINGUAL-PRODUCT-CONTENT-API-V1

> **WO:** `WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-API-V1`  
> **일자:** 2026-06-21  
> **결과:** PARTIAL PASS — API controller 추가. Route mount는 후속 소형 패치로 분리 필요.  
> **범위:** store-owner 권한 기반 다국어 상품 콘텐츠 group/page 저장·조회·fallback resolve API controller. UI/QR 랜딩/타블렛/허브 가져오기 없음.

---

## 1. 변경 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts` | store-scoped 다국어 상품 콘텐츠 API controller 추가 |
| `docs/investigations/CHECK-O4O-MULTILINGUAL-PRODUCT-CONTENT-API-V1.md` | 본 CHECK |

---

## 2. API controller 내용

추가된 factory:

```ts
createMultilingualProductContentController(
  dataSource,
  requireAuth,
  serviceKey,
)
```

권한:

```text
requireAuth
createRequireStoreOwner(dataSource, serviceKey)
```

즉 KPA/GlycoPharm/KCosmetics 각각 service-aware store_owner guard를 주입해서 사용할 수 있다.

---

## 3. 제공 endpoint 설계

컨트롤러 내부 endpoint:

```text
GET   /pharmacy/multilingual-product-contents
POST  /pharmacy/multilingual-product-contents
PATCH /pharmacy/multilingual-product-contents/:groupId
PUT   /pharmacy/multilingual-product-contents/:groupId/pages/:locale
GET   /pharmacy/multilingual-product-contents/:groupId/resolve?locale=en
PATCH /pharmacy/multilingual-product-contents/:groupId/pages/:locale/status
```

### 3.1 그룹 목록 조회

```text
GET /pharmacy/multilingual-product-contents?targetKind=listing&targetId={id}&contentKey=default
```

반환:

```text
group + pages summary
```

### 3.2 그룹 생성/갱신

```text
POST /pharmacy/multilingual-product-contents
```

body:

```json
{
  "targetKind": "listing",
  "targetId": "...",
  "contentKey": "default",
  "title": "제품 A 다국어 콘텐츠",
  "defaultLocale": "ko",
  "status": "draft"
}
```

동작:

```text
organization_id + target_kind + target_id + content_key 기준 upsert
```

### 3.3 언어별 페이지 저장

```text
PUT /pharmacy/multilingual-product-contents/:groupId/pages/:locale
```

지원 locale:

```text
ko, en, zh, ja, vi, th, id
```

body:

```json
{
  "title": "Product A",
  "summary": "short text",
  "contentFormat": "image_sequence",
  "content": {},
  "assets": [{ "type": "image", "url": "...", "order": 1 }],
  "buttons": [{ "label": "Buy", "url": "..." }],
  "status": "published"
}
```

### 3.4 언어 fallback 조회

```text
GET /pharmacy/multilingual-product-contents/:groupId/resolve?locale=zh
```

fallback 순서:

```text
요청 언어
→ English
→ group.defaultLocale
→ ko
```

---

## 4. target 검증

그룹 생성 시 target 소유권을 검증한다.

```text
targetKind=local
→ store_local_products.id + organization_id + is_active=true

targetKind=listing
→ organization_product_listings.id + organization_id + is_active=true + service_key
```

Cosmetics는 기존 관례에 맞춰 serviceKey `cosmetics`를 listing table의 `k-cosmetics`와 비교하도록 보정한다.

---

## 5. connection.ts 처리

이번 controller는 **raw SQL 기반**으로 작성했다.

이유:

```text
connection.ts가 과대해진 상태에서 신규 entity registration을 위해 대형 파일을 직접 패치하면
동시 세션 혼입과 누락 위험이 큼.
```

따라서 이번 API controller는 `dataSource.query()`를 사용하여 신규 entity registration 없이 동작하도록 설계했다.  
다만 장기적으로는 `WO-O4O-API-SERVER-CONNECTION-ENTITY-REGISTRY-SPLIT-V1`에서 entity registry를 분리하고 신규 entity를 정식 등록하는 것이 맞다.

---

## 6. 미완료 / 후속 필요

### 6.1 Route mount 필요

컨트롤러는 추가됐지만 아직 3서비스 route 파일에 mount되지 않았다.

후속 소형 패치 필요:

```ts
import { createMultilingualProductContentController } from '../o4o-store/controllers/multilingual-product-content.controller.js';

router.use('/', createMultilingualProductContentController(dataSource, coreRequireAuth as any, 'kpa'));
router.use('/', createMultilingualProductContentController(dataSource, coreRequireAuth as any, 'glycopharm'));
router.use('/', createMultilingualProductContentController(dataSource, coreRequireAuth as any, 'cosmetics'));
```

대상 파일:

```text
apps/api-server/src/routes/kpa/kpa.routes.ts
apps/api-server/src/routes/glycopharm/glycopharm.routes.ts
apps/api-server/src/routes/cosmetics/cosmetics.routes.ts
```

현재 세션은 GitHub contents API 기반이라 대형 route 파일 전체 rewrite 위험이 있어 mount를 분리했다.

### 6.2 Public QR resolve 없음

이번 API는 authenticated store-owner API다.  
QR 고객 랜딩용 public resolve API는 `WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1`에서 추가한다.

---

## 7. 검증

- 로컬 checkout 없음 → `pnpm typecheck` 미실행.
- DB 접속 없음 → migration/API runtime smoke 미수행.
- 정적 검토:
  - locale/status/format validation 존재.
  - store-owner guard 사용.
  - target 소유권 검증 존재.
  - group upsert 존재.
  - page locale upsert 존재.
  - fallback resolve 존재.

---

## 8. 판정

```text
PARTIAL PASS
```

API controller 자체는 추가되었다. 실제 URL 활성화를 위해 route mount 소형 패치가 다음 단계로 필요하다.
