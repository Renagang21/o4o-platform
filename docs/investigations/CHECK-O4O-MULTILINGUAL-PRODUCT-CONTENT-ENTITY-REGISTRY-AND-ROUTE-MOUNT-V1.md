# CHECK — WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-ENTITY-REGISTRY-AND-ROUTE-MOUNT-V1

> 다국어 상품 콘텐츠 저장소/API를 실제 backend 에 연결하는 정합 작업.
> 신규 entity 2개를 TypeORM registry 에 등록하고, KPA / GlycoPharm / K-Cosmetics
> 3서비스에서 store-owner API route 를 활성화한다.

---

## 1. 선행 상태 (조사 결과)

| 항목 | 상태 (작업 전) |
|------|---------------|
| `store_multilingual_product_content_groups` entity | 존재 (`routes/platform/entities/store-multilingual-product-content-group.entity.ts`) |
| `store_multilingual_product_content_pages` entity | 존재 (`routes/platform/entities/store-multilingual-product-content-page.entity.ts`) |
| platform entities `index.ts` export | 이미 export 됨 (storage WO) |
| migration `20260621010000-CreateStoreMultilingualProductContent.ts` | 존재 (glob 자동 등록) |
| `multilingual-product-content.controller.ts` | 존재 (raw SQL store-owner API) |
| **`entities.ts` registry 등록** | ❌ 누락 → 본 WO 에서 해결 |
| **3서비스 route mount** | ❌ 누락 → 본 WO 에서 해결 |

`connection.ts` 는 DB 연결 설정만 담당하며 entity registry 는 `entities.ts` 가 SSOT 이므로
신규 entity 등록은 `entities.ts` 에서 수행했다 (`connection.ts` 미수정).

---

## 2. 수정 내역

### 2.1 entity registry 등록 — `apps/api-server/src/database/entities.ts`

- PLATFORM PHYSICAL STORE ENTITIES import 블록에 `StoreMultilingualProductContentGroup`,
  `StoreMultilingualProductContentPage` 추가 (`ProductMarketingAsset` 인근).
- entities 배열에 동일 2개 entity 추가 (`ProductMarketingAsset` 다음, 주석 스타일 유지).

### 2.2 route mount (3서비스)

각 서비스 route 파일에 controller import + `router.use('/', ...)` mount 추가.
`createProductMarketingController` mount 직후에 배치.

| 서비스 | 파일 | serviceKey |
|--------|------|-----------|
| KPA | `routes/kpa/kpa.routes.ts` | `'kpa'` |
| GlycoPharm | `routes/glycopharm/glycopharm.routes.ts` | `'glycopharm'` |
| K-Cosmetics | `routes/cosmetics/cosmetics.routes.ts` | `'cosmetics'` |

---

## 3. 활성화된 API (3서비스 공통)

```
GET   /api/v1/{service}/pharmacy/multilingual-product-contents
POST  /api/v1/{service}/pharmacy/multilingual-product-contents
PATCH /api/v1/{service}/pharmacy/multilingual-product-contents/:groupId
PUT   /api/v1/{service}/pharmacy/multilingual-product-contents/:groupId/pages/:locale
GET   /api/v1/{service}/pharmacy/multilingual-product-contents/:groupId/resolve?locale=en
PATCH /api/v1/{service}/pharmacy/multilingual-product-contents/:groupId/pages/:locale/status
```

권한: store-owner guard (`{service}:store_owner`) — operator/admin route 아님.

---

## 4. 검증

### 4.1 정적 (typecheck)

```
npx tsc -p tsconfig.build.json --noEmit   (apps/api-server)
```

- 결과: 본 변경으로 인한 신규 오류 **0건**.
- 유일한 오류 `marketTrialController.ts(105,9) TS2353` 은 clean main 에서도 동일 재현 →
  **pre-existing, 본 WO 무관** (git stash 비교로 확인).

### 4.2 route smoke (배포 전)

| 호출 | 작업 전 (미배포) | 배포 후 기대 |
|------|----------------|-------------|
| `GET /api/v1/kpa/pharmacy/multilingual-product-contents` | 404 (Cannot GET — route 미존재) | 401 AUTH_REQUIRED |
| `GET /health` | 200 (base URL 정상 확인) | — |

배포 전 404 는 route 미mount 상태를 정확히 반영 (정합 gap 확인).
인증/store-owner 200 smoke 는 CI/CD main 배포 후 수행 (후속).

---

## 5. 성공 기준 대조

| 기준 | 상태 |
|------|------|
| entity 2개 entities.ts 등록 | ✅ |
| connection.ts 미수정 | ✅ |
| 3서비스 route mount | ✅ |
| api-server typecheck 통과 (신규 오류 0) | ✅ |
| route smoke (배포 후 401/store-owner) | ⏳ post-deploy |
| 기존 QR/POP/상품/허브 route 영향 없음 | ✅ (additive mount only) |

---

## 6. 후속

```
WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-V1
WO-O4O-STORE-PRODUCT-MULTILINGUAL-BADGES-V1
WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1
WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1
```
