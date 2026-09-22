# IR-O4O-SUPPLIER-POST-REGISTRATION-WORKSPACE-REFACTORING-CENSUS-V1

> **종류:** 조사 전용 IR (구현 0)
> **기준 커밋:** `origin/main` `1e69ef257` (2026-09-22)
> **선행 완료(재검토 대상 아님):** `WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1` = COMPLETE (`bdbe0a3b9` · CHECK `9db4866aa`). 제품 등록 4경로(직접 입력 · Import Assistant · from-master · bulk) · 외부 LLM First · Candidate JSON 계약 · 내부 AI 호출 0 · AI→Master/Offer write 0 은 **확정 계약**이며 본 IR 은 이를 건드리지 않는다.
> **목적:** 등록 **이후** Supplier 업무공간(상품관리 · 콘텐츠 · 주문 · backend)에 남은 리팩토링 대상을 최신 `origin/main` 에서 전수 재검증하고, **다음에 실행할 가장 큰 구현 묶음 1개**를 결정한다.
> **판정:** 다음 묶음 = **§8 「등록 후 상품관리 Offer-First 재편 + Supplier→ProductMaster write 0 + 내부 AI 잔재 0」** 1개.

---

## 1. 조사 범위 · 방법

| 축 | 대상 | 방법 |
|---|---|---|
| 프론트 | `services/web-neture/src/pages/supplier/*` 30 파일 17,866 줄 · `components/supplier/*` · `lib/api/{supplier,product}.ts` · `SupplierSpaceLayout` · `App.tsx` supplier route | 파일별 API 호출 census(`grep -o "[a-zA-Z]*Api\.[a-zA-Z]*"`) · 진입 링크 역추적 |
| backend | `apps/api-server/src/modules/neture/{neture.routes,controllers/supplier-*,services/*}` · `modules/store-ai/*` · `routes/kpa/**/supplier-*` | route 목록 · 클라이언트 참조 수 · Master write 경로 grep |
| 데이터 | 프로덕션 read-only (`cloud-sql-proxy` · SELECT 만) | offers · images · ai_tags · candidates · orders 건수 |
| 문서 | 직전 CHECK 4종(cutover · CSV 은퇴 · Store 내부 AI 은퇴 · Supplier Workspace 재정렬) | "후속 · 백엔드 미변경" 조항만 인용, 잔여 목록은 **재검증** |

과거 IR 의 잔여 목록은 그대로 쓰지 않았다. 아래 표의 모든 항목은 `1e69ef257` 에서 파일·라인·건수를 다시 확인한 것이다.

## 2. 프로덕션 read-only 현황 (2026-09-22)

| 항목 | 값 | 의미 |
|---|---|---|
| `neture_suppliers` | ACTIVE 2 · PENDING 1 | 공급자 업무공간 실사용자 2 |
| `supplier_product_offers` (deleted_at IS NULL) | **21** = APPROVED/SERVICE 19 · PENDING/SERVICE 1 · PENDING/PRIVATE 1 | 등록 후 관리 대상이 매우 작다 → 재편 리스크 낮음 |
| 2 공급자 이상이 공유하는 master | **0** | 공유 master 이미지 충돌은 현재 데이터에서 발생하지 않음 |
| `product_images` on offer masters | 6 (전체 2,792 · `source` NULL 100% · 공급자 user 가 `created_by` 인 행 0) | 공급자 이미지 write 는 실사용 흔적 없음 |
| `product_ai_tags` | **0 행** · `product_ai_contents` 0 행 | 내부 AI 태그 기능 프로덕션 사용 0 |
| `spot_price_policies` | 0 | Drawer 스팟 정책 섹션 실사용 0 |
| B2B 설명(`business_*_description`) 설정 offer | 0 (B2C 설명 1) | `SupplierB2BContentPage` 실사용 0 |
| `supplier_csv_import_batches` | 0 | CSV 은퇴 CHECK 와 동일 |
| `product_candidates` `source_type='supplier_web'` | 0 (csv_import/external_api 가 전량) | 공급자 Candidate 경로는 배포됐으나 아직 실제 제출 0 |
| `neture_orders` | 0 · `checkout_orders."supplierId" IS NOT NULL` 23 | 주문은 B2B 계약(T1: 정본 `checkout_orders`) 대로 |
| `offer_service_approvals` | 20 | 서비스 공급 승인 축은 살아 있음 |

## 3. 영역별 판정 — 상품관리 화면

### 3-1 `SupplierProductsPage.tsx` (1,745줄)

- 호출: `getProductsPaginated` · `getApprovalCounts` · `batchUpdateProducts` · `submitForApproval` · `bulkDelete` · **`productApi.uploadProductImage` · `registerImageFromUrl`** (`ImageUploadModal`, 79~) · **`productApi.regenerateAiTags`** (`handleGenerateAiTags`, 1111~1118 — `setTimeout 2000` 후 목록 재조회).
- 인라인 편집 4열 = `priceGeneral · consumerReferencePrice · stockQuantity · isActive` (Offer 필드만 · Master 필드 없음) → **Offer 편집 계약 준수**.
- 잔재: ① AI 태그 생성 버튼(`Sparkles`) → 내부 LLM(`@o4o/ai-core execute`) 호출 · 실사용 0 ② 상품 이미지 모달이 **list page 와 Drawer 두 곳**에 중복 구현(같은 `productApi` 2 함수) ③ 헤더 WO 6종 누적 · 완성도/필터/탭/벌크/모달이 한 파일.
- 판정: **REALIGN** (Offer-First 목록으로 축소 · 이미지/AI 진입은 Drawer 한 곳으로 · AI 태그 버튼 제거).

### 3-2 `ProductDetailDrawer.tsx` (2,079줄)

- 소비처: `SupplierProductsPage` + **`OperatorProductApprovalPage`**(`approvalActions` prop) — 공급자/운영자 공용.
- 호출 19종을 책임별로 나누면:

| 책임 | API | 판정 |
|---|---|---|
| Offer 편집(가격·재고·공개·featured·B2C 설명) | `updateProduct`(payload 에 Master 필드 미포함 — 335~372 주석대로 서버도 무시) | KEEP (정본) |
| B2B 설명 | `updateBusinessContent`(2회 — b2b 전용 모드 + 일반 저장 분기) | KEEP · 단 `SupplierB2BContentPage` 와 **중복** (§3-3) |
| 공급 방식·서비스 승인 | `updateDistribution` · `getServicePrices`/`setServicePrices` | KEEP |
| 스팟 가격 정책 | `listSpotPolicies`/`createSpotPolicy`/`changeSpotPolicyStatus` (프로덕션 0행) | KEEP(계약) · 축소 후보 |
| **이미지(Master 자원)** | `getProductImages`×4 · `uploadProductImage`×2 · `registerImageFromUrl` · `deleteProductImage` | §5 |
| **AI 태그(Master 자원 · 내부 LLM)** | `getAiTags`×4 · `suggestAiTags` · `addManualTag`×2 · `addManualTagsBatch` · `deleteAiTag` — "태그 관리" Section(1639~1800) · `Sparkles` CTA 2개 | **RETIRE** (§4) |
| 조회 전용 | `getCategories`/`getBrands` · KPA 2차 심사 · 서비스 · 상태 | KEEP |

- `ProductForm mode="edit"` 는 `masterNameReadOnly` + `hideDistribution` 으로 호출(1057~1058) → 상품명 read-only. Master 편집 UI 잔재 **없음**.
- 판정: **REALIGN — 분해**. 한 Drawer 가 Offer · Master 이미지 · Master 태그 · 스팟 · 서비스가 · 승인 6 책임을 안고 있고 운영자 승인 화면과 공유된다. 분해 단위 = `OfferEditSection`(가격/재고/공개/설명 B2C·B2B) · `OfferDistributionSection`(공급 방식/서비스가/승인 상태) · `MasterReadOnlySection`(상품명/규제/브랜드/이미지 보기) · (운영자 전용) `approvalActions`.

### 3-3 `SupplierB2BContentPage.tsx` (236) + `B2BContentDrawer.tsx` (178)

- 호출: `getProductsPaginated` + `updateBusinessContent` — **Drawer 의 B2B 편집 모드와 API·필드가 100% 동일**. 사이드바 「거래 상품 정보」(`/supplier/b2b-content`) 로 별도 진입. 프로덕션 B2B 설명 설정 0건.
- 판정: **RETIRE → Drawer 로 단일화** (route 는 `/supplier/products` redirect · 사이드바 항목 제거). `neture_supplier_library_items`(공급자 콘텐츠 정본)와는 무관 — 이 화면은 offer 컬럼 편집이지 콘텐츠 ledger 가 아니다. drift 아님, 중복임.

### 3-4 `SupplierSupplyOffersPage.tsx` (105)

- API 0 · 링크 4개(제품 목록 ×2 · Pharmacy-Hub 제공 설정 · 판매자 모집)만 있는 **안내 허브**. 「서비스별 공급 상태」 문구가 "이 세 서비스" 라고 쓰나 실제 열거는 2개(KPA Society·K-Cosmetics) — 문구 drift(경미).
- 판정: **FOLD** — 상품 목록 상단 안내 또는 공급자 홈 카드로 흡수하고 route 는 redirect. 단독 WO 가치 없음 · §8 묶음의 IA 정리 항목.

## 4. 내부 AI / Copilot / AI Tag 잔재 (Supplier 표면)

| 잔재 | 위치 | 실체 | 프로덕션 | 판정 |
|---|---|---|---|---|
| AI 태그 재생성 | `SupplierProductsPage` 1111 → `POST /api/v1/products/:masterId/ai-tags/regenerate` | `store-ai/product-ai-tagging.service` `execute()`(내부 LLM) → `product_ai_tags` 갱신 + **`product_masters.tags` 동기화(`syncMasterTags`)** + fire-and-forget `generateAllContents`(`product_ai_contents`) | tags 0 · contents 0 | **RETIRE(공급자 표면)** — 공급자 액션이 내부 LLM 으로 **ProductMaster 컬럼을 write** 하는 마지막 경로 |
| AI 태그 추천/수동 태그/삭제 | `ProductDetailDrawer` 태그 관리 Section · `productApi` 6 함수 | 동일 controller(`suggest`/`manual`/`manual/batch`/`:tagId`) · 수동 태그도 `syncMasterTags` | 0 | **RETIRE(공급자 표면)** |
| backend 접근 규칙 | `store-ai/utils/product-access.utils.ts` `actorType='supplier'`(자기 offer 보유 ACTIVE 공급자 write 허용) | 공급자 write 허용 분기 | — | 공급자 UI 제거 후 **supplier actor 허용 제거 판단**(store-ai 라우터 자체는 admin `pop.api.ts` 가 `ai-contents`·`pop` 을 쓰므로 Store/Admin 소유 — 삭제는 범위 밖) |
| Copilot KPI 4종 | `SupplierDashboardPage` §7 블록 · `supplier-copilot.controller`(`/supplier/copilot/*`) | **SQL 집계만** (LLM 0) | 사용 | KEEP · 이름만 "Copilot"(라벨 정리 후보) |
| AI 인사이트 | `SupplierDashboardPage` 269 `getAiInsight` → `GET /supplier/dashboard/ai-insight` (`supplier-management.controller` 66~) | **`@o4o/ai-core runAIInsight` 내부 LLM 호출** | 사용(대시보드 진입마다 호출) | **RETIRE** — Store 내부 AI 은퇴(`CHECK-O4O-STORE-INTERNAL-AI-RETIREMENT-V1`) 와 동일 원칙(외부 LLM First) · 공급자 표면의 유일한 남은 내부 LLM 호출 |
| 가이드 | `/guide/features/copilot-dashboard` | 문서 | — | 라벨 정리와 함께 |

⑦ 계약 테스트(`SupplierProductLlmAssistPanel.test.tsx`)는 등록 3 파일만 검사한다. 위 잔재는 그 범위 밖이라 계약 위반이 아니지만, **"공급자 표면 내부 AI 0"** 을 전 업무공간으로 확장하려면 이 5개가 남은 전부다.

## 5. ProductImage ownership

- 경로: `productApi` → `POST/PATCH/DELETE /neture/products/:masterId/images*` → `admin.controller.ts createProductImageController`(961~) : `requireAuth + requireActiveSupplier + ownsMaster(자기 offer 보유)`.
- 실체: `product_images.master_id` = **ProductMaster 자원**(공유 정본). 공급자는 자기 offer 가 걸린 master 의 대표 이미지 교체·삭제가 가능 → 같은 master 를 공급하는 다른 공급자·운영자 승격 이미지에 영향. `source` 컬럼은 admin 만 기록(`admin_upload`), 공급자 업로드는 NULL · `created_by` 로만 식별.
- 현황: 공유 master 0 · 공급자 업로드 흔적 0 → **지금은 충돌 없음**. 그러나 Supplier→ProductMaster write 0 원칙과 정면 충돌하는 **유일한 남은 non-AI write 경로**다(offer 편집은 서버가 Master 필드를 무시 · csv-import 는 §7).
- 선택지: (a) 유지 + `source='supplier_upload'` 기록 + 대표 교체는 **자기 업로드분에 한정**(코드만 · DDL 0) (b) Offer 소유 이미지 테이블 신설(DDL → 중지 조건) (c) 공급자 이미지 write 전면 금지 → Candidate/운영자 경로로만.
- 판정: **§8 묶음에서 (a) 로 경계 명시** · (b) 는 별도 WO(DDL). (c) 는 등록 후 이미지 보완 업무를 막아 시간 절감 원칙에 반함.

## 6. Orders · Content 최신 잔여 drift

| 표면 | 정본 | 판정 |
|---|---|---|
| `/supplier/orders` (`SupplierOrdersPage` 운영 허브 · `getOrdersSummary`/`getUnifiedOrders`) + `/supplier/orders/manage` (`account/SupplierOrdersListPage` · `getOrders`/`updateOrderStatus`) + `/supplier/orders/:id` | `supplier-order.controller` 8 route · `SupplierUnifiedOrderService`(read-only 병합 · `checkout_orders` 정본 T1) | **drift 없음** — 허브/처리 2 화면은 B2B 계약의 "Neture 는 fulfillment 원장" 구조와 일치. 파일 위치만 `pages/account/` 잔존(경로 정리 후보 · 경미) |
| 콘텐츠 5 화면 | library=`/neture/library`(정본 ledger `neture_supplier_library_items` · handoff) · store-descriptions=`supplierStoreDescriptionApi` · tablet=`/kpa/supplier/screen-sets` · signage=`/kpa/supplier/signage` · status=`listMine` | **drift 없음** — 재정렬 CHECK(9/16) 이후 정본 API 만 사용. 남은 후속은 그 CHECK §7-1(cms serviceKey `'kpa'` legacy · Store Hub UI 편입)로 **Store Workspace 소유** |
| `/kpa/supplier/content-submissions` (`routes/kpa/.../supplier-content.*`) | cms + `kpa_approval_requests` write | 프론트 소비 **0** · 직전 CHECK 판정 `CANONICAL_BUT_HIDDEN` 유지 — 본 묶음 범위 밖(KPA 소유) |
| `SupplierDashboardPage` 1,025 | 8 블록 | KEEP · §4 AI 인사이트만 |

## 7. Supplier backend 책임 중복 · legacy

| 항목 | 위치 | 근거 | 판정 |
|---|---|---|---|
| **CSV Import backend 잔존** | `supplier-product.controller.ts` 358~531 `/csv-import/*` **10 route**(`requireActiveSupplier`) · `csv-import.service.ts` 1,391줄 · `SupplierCsvImportBatch/Row` entity | 프론트 은퇴 완료(`WO-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1` — "백엔드 미변경 · 데이터 은퇴는 별도 WO") · 90일 히트 0 · 배치 0 · **`applyBatch` 619~643 이 `masterRepo.create/save` 로 ProductMaster 를 직접 생성** | **RETIRE(코드)** — cutover CHECK 가 은퇴한 것은 `POST /products` 뿐이고, 공급자 HTTP 로 Master 를 만드는 경로가 **여기 하나 남아 있다**. route+service+entity 등록 제거는 코드 변경 · 테이블 drop 은 migration(중지 조건 → 별도) |
| `GET /supplier/products/template` | 345 | 클라이언트 참조 0 (CSV 템플릿) | RETIRE(위와 동일 묶음) |
| `product-import-common.service` | csv-import 외 `catalog-import` 2 소비 | 공유 | KEEP |
| `SupplierService.hasApprovedPrivateSupply` | `supplier.service.ts` 823 | 소비 0 | dead · 삭제 |
| `supplier.ts` 클라이언트 dead 6 | `getCompleteness · getInventoryItem · submitForReview · updateRegistrationNumber · updateSpotPolicy · uploadEvidence` | 페이지 소비 0 | 삭제 |
| Supplier 이미지 controller 위치 | `admin.controller.ts` 안의 `createProductImageController`(961~) 를 `/` 에 마운트 | 파일명(admin) 과 책임(supplier) 불일치 · 자체 `requireActiveSupplier` 인라인 복제(`supplier-product.controller` 의 것과 별도) | §5 경계 작업 시 `supplier-product-image.controller.ts` 로 이동 |
| `supplier-management` · `supplier-product` · `supplier-order` · `shipment` · `inventory` · `settlement` · `import` · `store-description` · `product-candidate` 9 controller 를 `/supplier` 에 순차 마운트 | `neture.routes.ts` 84~98 | 경로 충돌 없음(`/supplier/services` 선행 마운트 주석) | KEEP |
| `NetureService` 578 facade → `OfferService` 2,392 | — | 단일 위임 | KEEP(분할은 별도 · 이번 묶음 아님) |

## 8. 결정 — 다음으로 실행할 가장 큰 구현 묶음 1개

### 8-1 이름(안)

**`WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1`**
— 등록 후 상품관리 Offer-First 재편 · Supplier→ProductMaster write 0 · 공급자 표면 내부 AI 0

### 8-2 왜 이 묶음인가

1. 사용자 지정 집중 대상 8개 중 **6개**(`SupplierProductsPage` · `ProductDetailDrawer` · `SupplierB2BContentPage` · `SupplierSupplyOffersPage` · ProductImage ownership · 내부 AI/Copilot/AI Tag 잔재)가 **같은 불변식 하나**로 묶인다: *공급자는 Offer 를 편집하고, Master 는 읽기만 한다. 내부 AI 는 부르지 않는다.* 나머지 2개(Orders · Content)는 §6 대로 drift 없음.
2. ⑦ 이 등록 경로에서 세운 계약(AI→Master write 0 · 내부 AI 0)이 **등록 후 화면에서는 아직 깨져 있다**(AI 태그 → `product_masters.tags` write · ai-insight 내부 LLM · csv-import Master 생성 · 이미지 Master write). 이 묶음이 끝나야 "Supplier 업무공간 전체 = Offer-First · 외부 LLM First" 가 성립한다.
3. 프로덕션 영향 표면이 작다(offer 21 · 공급자 2 · ai_tags 0 · images 6 · spot 0 · B2B 0) → 큰 구조 변경을 **지금** 하는 것이 가장 싸다.
4. 작은 WO 로 나누면 Drawer 를 3번 열어야 한다(AI 제거 · B2B 통합 · 이미지 경계). 한 번에 분해하는 편이 회귀 검증도 한 번이다.

### 8-3 범위 (구현 시 WO 로 정식화)

| # | 작업 | 종류 |
|---|---|---|
| A | `ProductDetailDrawer` 분해: `OfferEditSection` · `OfferDistributionSection` · `MasterReadOnlySection`(이미지 보기 포함) · 운영자 `approvalActions` 유지. 태그 관리 Section · `Sparkles` CTA 제거 | 프론트 |
| B | `SupplierProductsPage` 축소: 이미지 모달 → Drawer 단일 · AI 태그 버튼 제거 · Offer 4열 인라인/벌크/승인요청/탭 유지 | 프론트 |
| C | `SupplierB2BContentPage` + `B2BContentDrawer` 은퇴 → `/supplier/b2b-content` redirect · 사이드바 「거래 상품 정보」 제거 | 프론트 · IA |
| D | `SupplierSupplyOffersPage` fold → 상품 목록 안내/홈 카드 · `/supplier/supply-offers` redirect · 문구 drift 정정 | 프론트 · IA |
| E | `productApi` ai-tags 6 함수 · `supplierCopilotApi.getAiInsight` · 대시보드 AI 인사이트 블록 제거 · `GET /supplier/dashboard/ai-insight` route 제거 · Copilot 라벨 → "성과 요약" | 프론트 + backend(route 삭제) |
| F | `product-access.utils` `actorType='supplier'` write 허용 제거(공급자 UI 0 이 된 뒤) — store-ai 라우터 자체는 유지 | backend(권한 축소 · **route/API 계약 변경 = 중지 조건 확인 후**) |
| G | 이미지 경계 (a): 공급자 업로드 `source='supplier_upload'` · 대표 교체/삭제는 자기 업로드분 한정 · controller 를 `supplier-product-image.controller.ts` 로 이동 | backend(코드 · DDL 0 — `source` 컬럼 기존) |
| H | CSV Import backend 코드 은퇴: 10 route · `/products/template` · `csv-import.service` · entity 등록 해제(`entities.ts`/`index.ts`) · operator-supplier-quality 의 동일 테이블 조회 정리 · **테이블 drop 은 별도 migration WO** | backend |
| I | dead 정리: `hasApprovedPrivateSupply` · 클라이언트 dead 6 | 코드 |
| J | 계약 테스트: "공급자 표면(pages/supplier · components/supplier · lib/api/supplier,product) 에 `/ai-tags` · `ai-insight` · `/ai/` 0" 소스 계약 + Drawer 분해 렌더 테스트 + 이미지 소유 단위 테스트 | 테스트 |

### 8-4 중지 조건 · 리스크

| 항목 | 판정 |
|---|---|
| DB schema / migration | **없음** — H 의 테이블 drop 은 제외(별도 WO) · G 는 기존 `source` 컬럼 사용 |
| `package.json` / lockfile | 없음 |
| route / API 계약 변경 | **있음(3)** — E `ai-insight` route 삭제 · F supplier actor 권한 축소 · H csv-import 10 route 삭제. 전부 프론트 소비 0 또는 본 묶음에서 함께 제거되는 소비자뿐. WO 승인 시 명시 필요 |
| Core/Frozen | 해당 없음(`store-ai` 는 Frozen 아님 · F12 Product Resource Baseline 은 Master 정본 보호 방향과 일치) |
| 운영자 화면 회귀 | `OperatorProductApprovalPage` 가 Drawer 를 공유 → A 에서 반드시 회귀 |
| 브라우저 smoke | 공급자 Google-only 계정 필요(⑦ 과 동일 PENDING 조건) |

### 8-5 이 묶음에 넣지 않는 것(별도)

- `supplier_csv_import_*` 테이블 drop(migration) · Offer 소유 이미지 테이블(DDL) · `OfferService` 2,392 분할 · `/kpa/supplier/content-submissions` 처분(KPA 소유) · cms serviceKey `'kpa'` drift(Store Workspace) · `pages/account/SupplierOrders*` 경로 이동(경미) · WebMCP(미진행 확정).

## 9. 문서 정합

`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건` — 기준 문서(baseline/architecture/rules) 와 충돌하는 서술 없음. 본 IR 은 `docs/investigations/` 기록물.

## 10. Git

- 변경 파일: 본 IR 1개. 코드 변경 0.
