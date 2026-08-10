# CHECK-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1

> WO: `WO-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1`
> 선행: [CHECK-O4O-ADMIN-VENDOR-APIREQUEST-SAME-ORIGIN-FIX-V1](CHECK-O4O-ADMIN-VENDOR-APIREQUEST-SAME-ORIGIN-FIX-V1.md) (HOLD) · [IR-...-API-PATH-CONVENTION-INVENTORY-V1](../investigations/IR-O4O-ADMIN-DASHBOARD-API-PATH-CONVENTION-INVENTORY-V1.md) (CLOSED)
> **결과: 구현·배포 완료 / 화면 smoke 는 앱 게이트로 미수행 (§10-2)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 main | `76c3435d28d31e03e8b972e01d8a50c984fc6621` |
| 결과 commit | `0442dfa0c5f46c10e98f16b727fb72461d793cde` |
| 배포 리비전 | `o4o-admin-dashboard-01102-79g` |
| API 서버 | 재배포 없음 |
| 검증 일자 | 2026-08-10 |

> **작업 시작 시 작업트리가 clean 이 아니었다** (병렬 세션의 glycopharm 권한 정비 6파일).
> 내 대상 파일과 **중첩 0건**이었고, 그 세션이 작업 중 `d14f24398` 로 커밋해 정리됐다. §11 참조.

---

## 2. 조사 결과

### 2-1. route 는 live 로 등록돼 있었다

`SupplierOpsRouter.tsx` (수정 전)

```text
products             → Products
products/new         → ProductSearchPage
products/create      → ProductCreatePage
products/bulk-import → BulkImportPage
```

### 2-2. `Products.tsx` 는 API 를 호출하지 않는 데모 화면

```text
pages/supplierops/pages/Products.tsx:30-32
  useEffect(() => { setTimeout(() => { setProducts([ … ]) }, …) })   // Demo data
```

하드코딩 3건(프리미엄 에센스 세럼 / 수분 크림 / 클렌징 폼). 실제 공급자 상품이 아니다.

### 2-3. 저장 흐름은 backend 가 없는 vendor API

```text
ProductCreatePage → SupplierProductForm:139  createVendorProduct(data)
  → api/vendor/products.ts:55  apiRequest('/vendor/products', {method:'POST'})
  → api/apiRequest.ts:20       fetch(`/api${endpoint}`)      ← admin 오리진
```

`apps/admin-dashboard/Dockerfile:9-21` 의 nginx 에 `/api` reverse proxy 가 없다 (SPA fallback 뿐).
선행 CHECK 의 실측:

```text
GET https://admin.neture.co.kr/api/vendor/products
  → 200  text/html  2141B   (index.html)
```

`response.ok === true` 통과 → `response.json()` 실패 → `SupplierProductForm:143-145` catch
→ **"제품 저장에 실패했습니다"** 라는 원인이 지워진 토스트.

backend 부재 근거: api-server 소스에 vendor route 0건 · 프로덕션 404 5종
(`/api/v1/vendor/products`, `/api/vendor/products`, `/api/v1/vendors/products`, `/api/v1/supplier/products`, `/api/v1/products`).

### 2-4. canonical 원장 확인 (WO §2 정책 판단의 코드 근거)

```text
apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts
  POST /supplier/products · GET /supplier/products · GET /supplier/products/approval-counts
  POST /supplier/products/submit-approval …
→ app.use('/api/v1/neture', …)  ⇒  /api/v1/neture/supplier/products   (프로덕션 401 = 존재)
```

backend 주석에도 명문화돼 있다.

```text
controllers/pharmacy-hub/PharmacyHubSupplierProductController.ts:13
  "상품 등록·수정은 기존 Neture 공급자 원장(/api/v1/neture/supplier/products)이 담당한다."
```

화면 경로 (`services/web-neture/src/App.tsx:818-824`)

```text
/supplier/products                    목록
/supplier/products/new                등록
/supplier/products/bulk               대량 등록
/supplier/products/import-assistant   가져오기 도우미
```

### 2-5. `ProductSearchPage` 유지 가치 (WO §4-3)

`searchProductMaster`(`/neture/products/library/search`, 401=존재)를 쓰는 **실 API 화면**이지만,
유일한 출구가 깨진 `products/create` 였다. 동일 검색 화면이 **sellerops 에 별도 파일로 존재**하며
(`pages/sellerops/pages/ProductSearchPage.tsx` → `/sellerops/listings/new`) 그쪽은 유지된다.
→ supplierops 사본만 제거하고 `api/product-library.api.ts` 는 유지.

---

## 3. 안내 화면 전환 대상 route

| route | 전 | 후 |
|---|---|---|
| `/supplierops/products` | `Products` (데모 목록) | **`SupplierOpsProductGuidePage`** |
| `/supplierops/products/new` | `ProductSearchPage` | **`SupplierOpsProductGuidePage`** |
| `/supplierops/products/create` | `ProductCreatePage` | **`SupplierOpsProductGuidePage`** |

신규 화면: `apps/admin-dashboard/src/pages/supplierops/pages/SupplierOpsProductGuidePage.tsx`
— **API 호출 0건.** Neture 공급자 상품 화면 4개로 유도 (§2-4 코드 기준 경로 사용).

---

## 4. 삭제한 파일 (참조 0건 확인 후)

| 파일 | 삭제 전 유일 참조 |
|---|---|
| `pages/supplierops/pages/Products.tsx` | `SupplierOpsRouter:13,43` |
| `pages/supplierops/pages/ProductSearchPage.tsx` | `SupplierOpsRouter:14,44` |
| `pages/supplierops/pages/ProductCreatePage.tsx` | `SupplierOpsRouter:15,45` |
| `components/vendor/SupplierProductForm.tsx` | `supplierops/ProductCreatePage:15` |
| `components/vendor/ProductApprovalManager.tsx` | **0건 (이미 unrouted)** |
| `api/vendor/products.ts` | 위 2개 컴포넌트 |

commit diff: **8 files changed, 196 insertions(+), 1398 deletions(-)**
`api/vendor/` 디렉터리는 비어 제거됨.

참조 그래프가 닫혀 있어(외부 진입점 0) import 정리 외 추가 수정은 필요 없었다.

---

## 5. 유지한 파일과 이유

| 파일 / route | 이유 |
|---|---|
| `products/bulk-import` · `BulkImportPage.tsx` | **canonical API 사용** — `/neture/supplier/csv-import/upload` (401=존재) · `/neture/products/bulk-match`. WO §5.2 전환 대상 아님 |
| `pages/sellerops/pages/ProductSearchPage.tsx` | **동명 별개 파일.** `/sellerops/listings/new` 에서 live |
| `api/product-library.api.ts` | sellerops · BulkImportPage 가 사용 |
| `components/vendor/SupplierDashboard.tsx` | vendor API 미사용(`@o4o/types` + utils 만). 이번 범위 밖 |
| **`api/apiRequest.ts`** | WO §5.3 *"이번 WO 에서는 apiRequest.ts 전체 정리는 하지 않는다"*. **단 이제 참조 0건 → orphan.** §12 후속 |

---

## 6. `/api/vendor/products` 호출 0 확인

**코드**

```text
createVendorProduct / updateVendorProduct / approveProducts / getPendingProducts / ProductApi
  → 실행 코드 0건 (잔여 hit 은 안내 화면·Router 의 설명 주석뿐)
vendor/products 문자열
  → 실행 코드 0건 (동일하게 주석뿐)
apiRequest
  → 정의 1건(api/apiRequest.ts:12) · 호출 0건
```

**빌드 산출물**

```text
dist/assets/SupplierOpsProductGuidePage-pE2UJjqB.js   존재
Products-* / ProductCreatePage-* / SupplierProductForm-*   부재
ProductSearchPage-Ca2p5FuG.js  → sellerops 사본 (유지 대상)
```

**네트워크 (실브라우저 8경로 전 세션)**

```text
vendor/products 요청            0건
admin 오리진 /api/* 요청        0건
text/html 로 응답된 /api/* 요청  0건   ← 이번 WO 가 제거한 실패 시그니처
```

---

## 7. demo data 제거 확인

`setTimeout` 기반 데모 상품 목록(`Products.tsx`)은 삭제됐고 실행 경로 0건이다.

> **범위 외 관찰(수정하지 않음).** supplierops 의 나머지 화면도 대부분 데모다.
>
> | 화면 | demo 신호 | API 호출 |
> |---|:---:|:---:|
> | `Dashboard.tsx` | 2 | **0** |
> | `Orders.tsx` | 2 | **0** |
> | `Settlement.tsx` | 2 | **0** |
> | `Profile.tsx` | 2 | **0** |
>
> 실 API 를 쓰는 화면은 `BulkImportPage` · `MarketingMaterials(Create)` · `SignageReport` · `CampaignRequestPage` 뿐이다.
> → 후속 `WO-O4O-SUPPLIER-DASHBOARD-MENU-AND-FLOW-CLEANUP-V1` 의 실질 범위.

---

## 8. typecheck / build 결과

| 명령 | 결과 |
|---|---|
| `pnpm run type-check` (`tsc --noEmit`) | ✅ PASS (출력 0) |
| `pnpm run build:prod` | ✅ PASS (`✓ built in 57.96s`) |

---

## 9. 배포 결과

| 항목 | 값 |
|---|---|
| Workflow | `Deploy Admin Dashboard (Cloud Run)` run `31391213066` |
| 결론 | ✅ `success` |
| 리비전 | `o4o-admin-dashboard-01102-79g` |
| API 서버 | 재배포 없음 (backend 무변경) |

---

## 10. 실브라우저 smoke 결과

**환경**: Playwright(chromium, headless) · `https://admin.neture.co.kr` · 리비전 `01102-79g`
**계정**: `renariver21@gmail.com` (`platform:super_admin`) — 정식 폼 로그인 **200**, `/home` 착지

| 대상 | 최종 URL | 화면 | 콘솔 | 비-2xx | vendor/products |
|---|---|---|:---:|:---:|:---:|
| `/supplierops/products` | `/error/app-disabled?app=supplierops` | 앱 비활성 안내 | 0 | 0 | 0 |
| `/supplierops/products/new` | 〃 | 〃 | 0 | 0 | 0 |
| `/supplierops/products/create` | 〃 | 〃 | 0 | 0 | 0 |
| `/supplierops/dashboard` | 〃 | 〃 | 0 | 0 | 0 |
| `/supplierops/profile` | 〃 | 〃 | 0 | 0 | 0 |
| `/supplierops/marketing-materials` | 〃 | 〃 | 0 | 0 | 0 |
| `/store/qr` | `/store/qr` | **매장 QR 안내 유지** ✅ | 0 | 0 | 0 |
| `/admin/cms/contents` | 동일 | CMS Contents 정상 | 0 | 0 | 0 |

### 10-1. 회귀 없음

`/store/qr` 안내 화면과 `/admin/cms/contents` 모두 콘솔 에러 0 · 비-2xx 0. 직전 WO 결과 유지.

### 10-2. ⚠ 안내 화면 자체는 브라우저로 확인하지 못했다

`/supplierops/*` 전 경로가 **앱 게이트에서 차단**된다.

```text
routes/apps.routes.tsx:148   <AppRouteGuard appId="supplierops">
GET /api/v1/apps/availability →
  {"apps":[membership-yaksa, annualfee-yaksa, reporting-yaksa,
           digital-signage, digital-signage-core, partnerops]}   ← supplierops 없음
⇒ 비활성 판정 → /error/app-disabled?app=supplierops 로 리다이렉트
```

앱 활성화는 상태 변경이므로 **수행하지 않았다** (WO §6 권한/정책 변경 금지).
따라서 `SupplierOpsProductGuidePage` 의 렌더 결과는 **미검증**이며, 대신 아래로 갈음했다.

```text
route 매핑     SupplierOpsRouter.tsx — products / products/new / products/create → 안내 화면
빌드 산출물     dist/assets/SupplierOpsProductGuidePage-*.js 존재, 구 화면 청크 부재
API 호출 0     안내 화면은 import 자체가 lucide-react 아이콘뿐 (§6)
```

### 10-3. 이번 결함의 실제 사용자 영향 범위 (정정)

`supplierops` 가 app registry 에 없어 비활성이므로, **깨진 상품 등록 흐름은 현재 프로덕션에서
사용자에게 도달하지 않았다.** 코드상 route 는 live 였으나 앱 게이트가 앞단에서 막고 있었다.
선행 CHECK 에서 "live 결함"으로 기술한 것은 **코드 경로 기준**이며, 앱 게이트를 고려하면
**사용자 노출은 0** 이었다. 정리의 타당성(죽은 코드·데모 화면 제거)은 그대로다.

> 참고: 같은 게이트에서 `partnerops` 는 **active** 다. IR 이 legacy 로 분류한
> `/api/v1/partnerops/*` 16건은 **실제로 도달 가능**하다 — 후속 우선순위 판단에 반영할 것.

---

## 11. 금지사항 준수 확인

| 금지 항목 | 상태 |
|---|---|
| backend 변경 | ❌ 없음 (api-server 파일 0건) |
| ProductMaster / SupplierProductOffer / ProductApproval 정책 변경 | ❌ 없음 |
| 신규 상품 등록 기능 구현 | ❌ 없음 |
| 데모 데이터를 실제처럼 유지 | ❌ 없음 (삭제) |
| same-origin `/api/vendor/products` 호출 유지 | ❌ 없음 (실행 경로 0) |
| neture 공급자 화면 코드 변경 | ❌ 없음 (`services/web-neture` 무변경 — 링크만 참조) |
| admin API client canonicalization | ❌ 없음 |
| DB write · migration | ❌ 없음 (DB 접속 없음) |
| 무관한 dirty 파일 / lockfile 스테이징 | ❌ 없음 — `git commit -- <8 pathspec>` 로 범위 고정 |

### 병렬 세션 관련 고지

- 착수 시 병렬 세션의 미커밋 변경 6건이 있었으나 **대상 파일 중첩 0건**이었고,
  `@o4o/security-core` 는 `dist` 로 해석되어(`package.json` exports) 그들의 `src` 편집이 내 빌드에 유입되지 않음을 확인한 뒤 진행했다.
- 그 세션이 작업 중 `d14f24398` (glycopharm 권한 정비)로 커밋했고, **내 push 가 그 커밋을 함께 origin 으로 올렸다.**
- 그 결과 `d14f24398` 에 대해 실행 중이던 `CI Pipeline`·`CodeQL` 이 concurrency 정책으로 **cancelled** 됐다.
  동일 트리를 검사하는 `0442dfa0c` 실행(`31391213081`)이 이어받았으므로 검사 공백은 없으나, 사실로 기록한다.

---

## 12. 후속 후보

| 후보 | 근거 |
|---|---|
| `WO-O4O-ADMIN-APIREQUEST-ORPHAN-REMOVAL-V1` | `api/apiRequest.ts` 참조 0건 — 이번 WO 범위상 미삭제 |
| `WO-O4O-SUPPLIER-DASHBOARD-MENU-AND-FLOW-CLEANUP-V1` | §7 — Dashboard·Orders·Settlement·Profile 도 API 0 데모 |
| `IR-O4O-NETURE-SUPPLIER-PRODUCT-CANONICAL-FLOW-AUDIT-V1` | §2-4 canonical 흐름 정합 확인 |
| `WO-O4O-ADMIN-PARTNEROPS-LEGACY-DISPOSITION-V1` | §10-3 — partnerops 는 active 이므로 legacy 16건이 실제 도달 가능 |
| `WO-O4O-ADMIN-APIREQUEST-SCANNER-RECHECK-V1` | 제네릭 호출 미탐 재집계 |
| `IR-O4O-ADMIN-DASHBOARD-NONV1-MOUNT-POLICY-V1` | IR REVIEW-1 |

---

## 13. commit / push

| 항목 | 값 |
|---|---|
| commit (코드) | `0442dfa0c` |
| push | ✅ `d14f24398..0442dfa0c  main -> main` |
| 완료 조건 | 이번 WO 범위 미커밋 변경 0건 · `HEAD == origin/main` |

---

*작성: 2026-08-10 · 기준 commit `0442dfa0c` · 리비전 `o4o-admin-dashboard-01102-79g`*
