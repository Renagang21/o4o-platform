# CHECK-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1

> WO: `WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1`
> 일자: 2026-07-29
> 대상: KPA-Society / GlycoPharm / K-Cosmetics (3 서비스 동시 정렬)

---

## 1. 최종 판정 — **B** (B-3 채택)

WO §6 게이트 판정 결과 **B** (canonical POP 화면이 prefill 을 지원하지 않지만 최소 확장이 가능).
WO §1 의 방향 **B-3** (ProductPopBuilderPage 은퇴 → 기존 canonical POP 화면으로 진입 통합) 을 채택했다.

### B-3 채택 근거

| 근거 | 확인 사실 |
|------|-----------|
| canonical POP 화면이 3 서비스 모두 존재 | `/store/marketing/pop` (KPA `StorePopPage.tsx` / GP `StorePopPage.tsx` / KCos `StorePopPage.tsx`) |
| **저장·렌더 백엔드가 3 서비스 공통** | `createStorePopController` 단일 구현을 `serviceKey='kpa' / 'glycopharm' / 'cosmetics'` 로 3회 mount → `POST /api/v1/{service}/pharmacy/pop/generate` |
| **organization ownership 보장됨** | `requireAuth` → `createRequireStoreOwner(serviceKey)` 가 `req.organizationId` 를 주입하고, 모든 source 조회가 `organizationId` 조건으로 격리된다 |
| **매장 소유 저장 계약이 이미 존재** | `save:true` → GCS 업로드 후 `store_execution_assets` (`organizationId` / `assetType='file'` / `usageType='pop'` / `sourceType='generated'`) 저장 |
| **자료함 노출 경로가 이미 존재** | KPA `/store/marketing/pop` "생성된 POP" 목록 + 3 서비스 공통 `/store/library/production-materials` (`getStoreExecutionAssets`) |
| 신규 저장 구조 불필요 | 위 계약을 그대로 재사용 — 신규 테이블 0 / 신규 컬럼 0 / 신규 renderer 0 |

→ ProductPopBuilderPage 에 신규 저장 계약을 만들 필요가 전혀 없으며, 은퇴 + canonical 수렴이 성립한다.

### C(중지)를 선택하지 않은 이유

사전 조사 시점에 GP/KCos canonical POP 화면은 **공급자 공개 자료(`supplierItemIds`) 전용 + blob 다운로드(저장 없음)** 이어서
WO §21 의 "매장 POP 결과가 자료함에 저장되지 않음 / 3 서비스 구조 상이" 에 해당하는 것처럼 보였다.
그러나 이는 **프런트엔드가 기존 백엔드 기능을 호출하지 않고 있었을 뿐**이며,
`save:true` + org-scoped 저장 + 자료함 노출은 GP/KCos 에도 이미 백엔드·자료함 화면 양쪽에 존재했다.
따라서 프런트 호출 정렬만으로 3 서비스 동일 정책 적용이 가능 → **C 아님, B**.

---

## 2. 기존 동선 → 변경 후 동선

### 변경 전 (잘못된 흐름)

```
매장 자체 상품 목록 / 마케팅 자산
  → /store/commerce/products/{store_local_products.id}/pop
  → ProductPopBuilderPage
      GET  /api/v1/products/{localId}/ai-contents          ← 전역 ProductMaster 리소스
      PUT  /api/v1/products/{localId}/ai-contents/pop_short ← 매장 사용자 전역 write (금지)
      PUT  /api/v1/products/{localId}/ai-contents/pop_long
      GET  /api/v1/products/{localId}/pop/{layout}          ← ProductMaster POP PDF
  → 결과가 매장 소유 자산으로 저장되지 않음
```

`{localId}` 는 `store_local_products.id` 이며 ProductMaster 식별자가 아니다 → 전역 리소스를 local UUID 로 조회·기록하던 구조.

### 변경 후 (canonical)

```
매장 자체 상품 목록 / 마케팅 자산 [POP 만들기]
  → /store/marketing/pop  (canonical POP 제작 화면, 직접 진입 · legacy route 미경유)
     router state: production.source.items[0] = { id: <store_local_products.id>, origin: 'local' }
  → canonical 화면이 GET /api/v1/store/local-products/{id} (organization 격리) 로 재조회 → prefill
  → POST /api/v1/{service}/pharmacy/pop/generate
       { localProductItemIds: [id], layout, templateId, save: true, title }
  → 백엔드가 organizationId 로 격리 조회 → 기존 generatePopPdf → store_execution_assets 저장
  → 매장 소유 POP 자산 (자료함 / POP 목록 노출, 재출력 가능)

/store/commerce/products/{id}/pop  (legacy 북마크)
  → <Navigate replace> 1홉 → /store/marketing/pop (동일 local identity 전달)
```

---

## 3. legacy route 처리

| 항목 | 처리 |
|------|------|
| route `commerce/products/:productId/pop` | **유지** (App.tsx 3곳) — 북마크·과거 내부 링크 보호 |
| 역할 | legacy compatibility route only |
| 수렴 | `<Navigate to="/store/marketing/pop" replace state={buildLocalProductPopState({id})} />` — **1홉** |
| redirect loop | 없음 (출발 `/store/commerce/...` ≠ 도착 `/store/marketing/pop`) |
| 뒤로가기 | `replace` 사용 → history 에 legacy 항목이 남지 않음 |

### ProductPopBuilderPage 처리 (§7)

3 서비스 파일 모두 **얇은 legacy redirect wrapper 로 치환**(물리 삭제 아님 — App.tsx lazy import 계약 보존):

- `services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx`
- `services/web-glycopharm/src/pages/store-management/ProductPopBuilderPage.tsx`
- `services/web-k-cosmetics/src/pages/store/ProductPopBuilderPage.tsx`

제거된 기능: `product_ai_contents` 조회 / `pop_short`·`pop_long` 저장 / ProductMaster POP PDF 호출 / local UUID 를 ProductMaster ID 로 전달 — **전부 0**.

부수: 3 서비스 `api/productAiContent.ts` 는 유일한 소비처(ProductPopBuilderPage) 은퇴로 **미참조 상태**가 되었다.
삭제 대신 `@deprecated` 헤더를 달아 재연결(Drift)을 차단했다. (§20 "기존 ProductMaster POP API 삭제 금지" 준수 — 백엔드 무변경.)

---

## 4. 진입 액션 정렬 (§8)

| 진입점 | 변경 |
|--------|------|
| KPA `StoreLocalProductsPage.tsx` (BaseTable, KPA 전용) | `[POP 만들기]` → `CANONICAL_STORE_POP_ROUTE` 직접 진입 |
| GP·KCos 공통 `StoreLocalProductsManager.tsx` (`@o4o/store-ui-core`) | `[POP 만들기]` → `CANONICAL_STORE_POP_ROUTE` 직접 진입 |
| KPA / GP / KCos `ProductMarketingPage.tsx` | `handleCreatePop` → `CANONICAL_STORE_POP_ROUTE`. 연결 자료실 항목이 있으면 기존 `origin='library'` prefill 보존, 없으면 `origin='local'` |

legacy route 를 경유하는 앱 내부 진입은 **0** (App.tsx 의 route 등록만 남음).

---

## 5. canonical POP 화면

| 서비스 | canonical route | 화면 | 최소 확장 내용 |
|--------|-----------------|------|----------------|
| KPA | `/store/marketing/pop` | `pages/pharmacy/StorePopPage.tsx` | `PopItemOrigin` 에 `'local'` 추가 · 진입 자료 로딩/실패/차단 상태 분리 + 재시도 · `localProductItemIds` 전송 |
| GlycoPharm | `/store/marketing/pop` | `pages/store-management/StorePopPage.tsx` | `origin='local'` 수신 섹션 신규 · `localProductItemIds` + `save:true` 전송(local 진입 시) |
| K-Cosmetics | `/store/marketing/pop` | `pages/store/StorePopPage.tsx` | GP 와 동일 |

기존 ProductMaster·listing·공급자 자료 흐름은 **변경 없음** (`supplierItemIds` / `libraryItemIds` / `directContentItemIds` / `snapshotItemIds` 경로 그대로).
하나의 `productId` 로 local/master 를 추측하는 코드는 없다 — origin 분기 명시.

---

## 6. local product prefill 계약 (§9)

### source identity

```ts
{ origin: 'local', id: store_local_products.id }   // masterId 없음
```

`origin` 은 본 코드베이스의 canonical source-type 어휘(`@o4o/types/production` · `@o4o/store-ui-core`)다.
WO §9 의 `sourceType='local' / sourceId / masterId:null` 을 신규 병렬 어휘로 만들지 않고 기존 `origin` union 에
`'local'` 을 추가해 표현했다 — 의미는 동일하며(**ProductMaster 식별자가 이 경로로 전달되지 않음**), 어휘 이원화 Drift 를 피했다.

### 전달 방식 (§9.1)

- router state 에 **source identity 만** 싣는다. 본문·문구는 URL/state 에 싣지 않는다.
- canonical 화면이 `GET /api/v1/store/local-products/{id}` (organization 격리) 로 **재조회**하여 prefill 한다.
  → 새로고침 시에도 prefill 이 유지되며, state 유실이 빈 폼으로 위장되지 않는다.
- state 의 `title`/`description` 은 조회 전 표시용 hint 이며 신뢰 대상이 아니다.

### 초기값 우선순위

| 필드 | 우선순위 |
|------|----------|
| 상품명 | `name` |
| 문구 | `summary` → `detail_html`(태그 제거 plain text) → `description` |
| 대표 이미지 | `thumbnail_url` → `images[0]` |

HTML 을 일반 문구 필드에 그대로 넣지 않는다. 신규 요약 알고리즘 없음 — 기존 백엔드 `extractContentText()` /
프런트 태그 제거 헬퍼 패턴을 그대로 사용.

---

## 7. source identity 보존 (§11)

| 항목 | 결과 |
|------|------|
| POP 자산 본체(`store_execution_assets`) | 기존 스키마 그대로 — **임의 JSON 필드 추가 0 / 컬럼 추가 0** |
| local identity 보존 | **보존됨** — 기존 provenance 테이블 `store_asset_derivations` 의 `(source_kind, source_id)` 계약 재사용 |
| 추가 어휘 | `STORE_ASSET_SOURCE_KINDS` 에 `'store_local_product'` 1개 (application-level 화이트리스트, DB enum 아님 / FK 없음 / 스키마 변경 없음) |
| 표시 라벨 | `StoreAssetDerivationViewer` 기본 맵에 `store_local_product: '매장 자체 상품'` |

즉 `sourceType='local'` + `sourceId=store_local_products.id` 가 **기존 계약 내에서** 보존된다.

---

## 8. POP 저장 위치

```
POST /api/v1/{service}/pharmacy/pop/generate  { save: true, ... }
  → MediaLibraryService.upload(pdf)            (기존)
  → store_execution_assets                     (기존)
       organization_id = req.organizationId    ← 매장 소유
       asset_type = 'file' / usage_type = 'pop' / source_type = 'generated'
       title / file_url / mime_type = application/pdf / created_at
  → store_asset_derivations                    (기존, best-effort)
       source_kind='store_local_product', source_id=<localId>, derived_kind='pop_pdf'
```

전역 `product_ai_contents` / `product_ai_tags` 에 대한 write **0**.

---

## 9. POP 렌더 경로 (§12)

- local product는 `GET /api/v1/products/:productId/pop/:layout` (전역 ProductMaster POP)을 **호출하지 않는다**.
- 기존 `generatePopPdf(popItems)` + 기존 POP template(`templateId`) 을 그대로 사용.
- **신규 PDF renderer 0**.

---

## 10. 자료함·재편집 (§13)

| 서비스 | 결과 노출 |
|--------|-----------|
| KPA | `/store/marketing/pop` "생성된 POP" 목록(즉시 갱신, PDF 열기·삭제) + `/store/library/production-materials` |
| GlycoPharm | `/store/library/production-materials` (`getStoreExecutionAssets` 병합 목록) |
| K-Cosmetics | `/store/library/production-materials` (동일) |

기존 POP PDF 자산은 재편집이 아닌 **재출력** 모델이다. 본 WO 에서 신규 버전관리 구조를 만들지 않았다.

---

## 11~13. 서비스별 결과

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| legacy builder route | 유지(redirect wrapper) | 유지(redirect wrapper) | 유지(redirect wrapper) |
| 진입 버튼 | canonical 직접 | canonical 직접(공통 컴포넌트) | canonical 직접(공통 컴포넌트) |
| canonical POP route | `/store/marketing/pop` | `/store/marketing/pop` | `/store/marketing/pop` |
| local prefill | ✅ (`getLocalProduct`) | ✅ (`getLocalProduct`) | ✅ (`getLocalProduct`) |
| 저장 | `save:true` → `store_execution_assets` | 동일(local 진입 시) | 동일(local 진입 시) |
| 렌더 | 기존 `generatePopPdf` | 기존 | 기존 |
| 자료함 이동 | POP 목록 + 제작 자료 | 제작 자료 | 제작 자료 |
| 오류 UX | 로딩/실패/차단 분리 + 재시도 | 동일 | 동일 |
| build | ✅ PASS | ✅ PASS | ✅ PASS |

---

## 14. 전역 API 회귀

| 항목 | 결과 |
|------|------|
| ProductMaster POP PDF (`GET /api/v1/products/:id/pop/:layout`) | **백엔드 무변경** — 운영자·공급자 render_read 경로 그대로 |
| `product_ai_contents` 접근 가드 | **무변경** (매장 write/manage_read 403 정책 그대로) |
| 기존 POP 소스(`supplierItemIds` / `libraryItemIds` / `directContentItemIds` / `snapshotItemIds`) | 분기·응답(blob vs JSON) 모두 기존 동작 유지 — local 미포함 요청은 종전과 동일 |
| 태블릿 배선 | 무변경 |

### 정적 검증 (§16)

```
rg "ai-contents|pop_short|pop_long|/products/.*/pop/" services/web-*/src
→ 잔여 매치는 (a) 주석, (b) @deprecated 표시된 미참조 productAiContent.ts 뿐.
  ProductPopBuilderPage 의 ai-contents 호출: 0
  local ID 의 ProductMaster POP endpoint 전달: 0
```

---

## 15. DB / 스키마 변화

| 항목 | 결과 |
|------|------|
| DB schema 변경 | **0** (migration 0 / 컬럼 0 / 테이블 0) |
| 신규 POP 테이블 | 0 |
| `store_local_products` 컬럼 추가 (`pop_short`/`pop_long`/`master_id`) | 0 |
| `product_ai_contents` 매장 write | 0 (호출 경로 자체 제거) |
| `product_ai_tags` 변화 | 0 (호출 경로 없음) |
| 신규 행 발생 | POP 생성 시에만 `store_execution_assets` 1행 + `store_asset_derivations` 1행 (기존 계약) |

---

## 16. typecheck / build

| 명령 | 결과 |
|------|------|
| `pnpm --filter @o4o/types build` | ✅ PASS |
| `pnpm --filter @o4o/api-server type-check` | ⚠️ **기존 baseline 실패 유지** — 오류 전부 `src/scripts/*` (HFF/OTC 트랙 스크립트, 본 WO 무관·미수정). 본 WO 가 수정한 `src/routes/**` 파일에서 오류 0 (tsc 는 프로젝트 전체 오류를 보고하므로 미보고 = 오류 없음) |
| `pnpm --filter @o4o/api-server jest store-local-product-description.spec.ts` | ✅ 8 passed (기존 route 회귀 0) |
| `pnpm --filter @o4o/web-kpa-society build` (`tsc && vite build`) | ✅ PASS |
| `pnpm --filter glycopharm-web build` (`tsc -b && vite build`) | ✅ PASS |
| `pnpm --filter @o4o/web-k-cosmetics build` (`tsc && vite build`) | ✅ PASS |

`@o4o/store-ui-core` 는 source-consumed 패키지(`main: ./src/index.ts`)로 별도 build 스텝이 없으며,
3 서비스 build 통과가 곧 타입 검증이다.

---

## 17. 프로덕션 smoke

**상태: 미실시 (배포 대기)**

본 변경은 아직 프로덕션에 배포되지 않았다. `main` push → CI/CD 배포 완료 후 아래를 수행해야 한다.
현 시점에서 smoke PASS 로 보고하지 않는다.

### 배포 후 수행할 절차

**KPA**
1. `renagang21`(약국 계정)으로 로그인 → `/store/commerce/local-products`
2. 테스트용 자체 상품 [POP 만들기] → `/store/marketing/pop` 로 이동 확인 (legacy route 미경유)
3. 상품명·이미지·문구 prefill 확인 → 새로고침 후에도 prefill 유지 확인
4. POP PDF 생성 → toast + "생성된 POP" 목록 노출 + PDF 열기 확인
5. DevTools Network: `ai-contents` GET/PUT **0** / `/api/v1/products/*/pop/*` **0**
6. legacy 직접 진입 `/store/commerce/products/{localId}/pop` → 1홉 replace 수렴 + 뒤로가기 loop 없음 확인
7. 종료 후 테스트 POP 자산 삭제

**GlycoPharm / K-Cosmetics**
- legacy route 수렴 / canonical 화면 로드 / local 정보 조회 / 전역 API 호출 0 확인
- 안전한 저장 대상이 있으면 저장까지, 없으면 저장 직전까지 검증 후 기록

**DB 확인 (read-only)**
```sql
SELECT count(*) FROM product_ai_contents;   -- smoke 전후 동일해야 함
SELECT count(*) FROM product_ai_tags;       -- smoke 전후 동일해야 함
SELECT id, title, usage_type, organization_id
  FROM store_execution_assets
 WHERE usage_type='pop' ORDER BY created_at DESC LIMIT 5;   -- 신규 POP 1행
SELECT source_kind, source_id, derived_kind
  FROM store_asset_derivations
 WHERE derived_kind='pop_pdf' ORDER BY created_at DESC LIMIT 5;  -- store_local_product 보존
```

---

## 18. 중지 / 잔여 항목

중지 없음. 잔여:

1. **프로덕션 smoke 미실시** (§17) — 배포 후 수행 필요. 가장 중요한 잔여 항목.
2. **`api/productAiContent.ts` 미참조 상태** (3 서비스) — `@deprecated` 표기만 함. 물리 삭제는 별도 판단.
3. **공통화 미수행** (WO §14 명시 범위 외) — GP/KCos `StorePopPage` 의 local 수신 로직이 두 파일에 동일 형태로 존재.
   본 WO 는 "먼저 3 서비스 기능 계약 정렬" 단계이며, 공통 package 추출은 별도 WO 대상.
4. **KPA vs GP/KCos canonical POP 화면 구조 차이 잔존** — KPA 는 production state 기반 다중 origin,
   GP/KCos 는 공급자 자료 선택 중심. 본 WO 는 local 흐름만 동일 정책으로 정렬했고 화면 구조 통합은 범위 외.

---

## 19. 변경 파일

**Backend (3)**
- `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts` — `localProductItemIds` source 추가(org 격리)
- `apps/api-server/src/routes/o4o-store/services/store-asset-derivation.service.ts` — `store_local_product` source kind
- `apps/api-server/src/routes/platform/store-local-product.routes.ts` — `GET /local-products/:id` (read-only, org 격리, uuid 가드)

**Packages (4)**
- `packages/types/src/production.ts` — `origin` union `+ 'local'`
- `packages/store-ui-core/src/utils/productionUtils.ts` — union 동기 + `CANONICAL_STORE_POP_ROUTE` / `buildLocalProductPopState`
- `packages/store-ui-core/src/index.ts` — export
- `packages/store-ui-core/src/components/StoreAssetDerivationViewer.tsx` — source kind 라벨
- `packages/store-ui-core/src/components/local-products/StoreLocalProductsManager.tsx` — POP 진입 canonical

**KPA (5)** · **GlycoPharm (4)** · **K-Cosmetics (4)**
- `ProductPopBuilderPage.tsx` (legacy wrapper) / `StorePopPage.tsx` / `ProductMarketingPage.tsx` /
  local product API client(`getLocalProduct`) / (KPA) `StoreLocalProductsPage.tsx` / `productAiContent.ts` deprecation
