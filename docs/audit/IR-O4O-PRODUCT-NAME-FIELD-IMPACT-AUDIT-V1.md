# IR-O4O-PRODUCT-NAME-FIELD-IMPACT-AUDIT-V1
## 상품명 필드 전환 영향 감사 보고서

**작성일:** 2026-04-23
**판정:** FAIL — 30개 파일에 구 필드명 잔존, P0 15건 포함

---

## 1. 배경 및 원인 요약

`ProductMaster.marketing_name` 컬럼이 DB 마이그레이션(`20260422100000-RenameMarketingNameToName.ts`)을 통해 `name`으로 변경되었다.
마이그레이션은 정상 실행되었으나, 애플리케이션 코드(SQL 쿼리·QueryBuilder·DTO·프론트 타입) 30여 개 위치에서 구 필드명을 여전히 참조하고 있다.

**직접 오류 발생 지점:**
`apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts` Line 63
```sql
pm.marketing_name AS product_name
```
→ DB에서 해당 컬럼이 더 이상 존재하지 않아 런타임 에러 발생.

**핵심 구조:**
- DB/Entity: ✅ `name` (정상)
- 마이그레이션: ✅ 완료
- 애플리케이션 코드: ❌ 30+ 위치에 `marketing_name` 잔존

---

## 2. ProductMaster 엔티티 현재 상태

**파일:** `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`

```typescript
@Column({ name: 'name', type: 'varchar', length: 255 })
name: string;  // ✅ 정상 — DB 컬럼명 'name'
```

`packages/dropshipping-core/src/entities/ProductMaster.entity.ts` 도 동일하게 `name` 사용 ✅

---

## 3. 영향 범위 요약 표

| 영역 | 파일 | 참조 위치 | 위험도 | 비고 |
|------|------|-----------|--------|------|
| KPA Operator API | `routes/kpa/controllers/operator-product-applications.controller.ts` | L63 | **P0** | **현재 런타임 오류 발생** — `/operator/product-applications` |
| Store Tablet | `routes/platform/store-tablet.routes.ts` | L436, L442 | **P0** | 태블릿 상품 풀 조회 |
| Store Public | `routes/platform/store-public/store-public-utils.ts` | L130, L147, L180 | **P0** | 공개 스토어 상품 목록/검색 |
| O4O Store Tablet | `routes/o4o-store/controllers/tablet.controller.ts` | L60, L69, L102 | **P0** | O4O 스토어 태블릿 상품 쿼리 |
| Tablet Operator | `routes/o4o-store/controllers/tablet-operator.controller.ts` | L151, L193, L210 | **P0** | 태블릿 운영자 검색/목록 |
| QR Landing | `routes/o4o-store/controllers/store-qr-landing.controller.ts` | 7곳 | **P0** | QR 랜딩 페이지 상품 쿼리 |
| Store Channel | `routes/o4o-store/controllers/store-channel-products.controller.ts` | L95, L133, L147 | **P0** | 채널 상품 목록 |
| Pharmacy Products | `routes/o4o-store/controllers/pharmacy-products.controller.ts` | L104, L282, L318 | **P0** | 약국 상품 승인/목록 쿼리 |
| Market Trial Operator | `routes/market-trial-operator.routes.ts` | L50, L77 | **P0** | Market Trial 상품 검색 |
| KPA Checkout | `routes/kpa/controllers/kpa-checkout.controller.ts` | L293 | **P0** | 결제 상품 상세 쿼리 |
| AI Product Search | `modules/store-ai/services/product-ai-search.service.ts` | L36 | **P0** | AI 상품 검색 SELECT |
| AI Snapshot | `modules/store-ai/services/store-ai-product-snapshot.service.ts` | L114, L119 | **P0** | AI 스냅샷 생성 |
| Market Trial API | `routes/market-trial-operator.routes.ts` | L50, L77 | **P0** | 운영자 시장 시험 |
| KPA Groupbuy | `routes/kpa/services/groupbuy.service.ts` | L98, L216, L243, L251 | P1 | 공동구매 서비스 (4곳) |
| Supplier Offers | `routes/kpa/controllers/supplier-offers.controller.ts` | L89, L196, L237, L257 | P1 | 공급사 오퍼 관리 (4곳) |
| Groupbuy Operator | `routes/kpa/controllers/groupbuy-operator.controller.ts` | 다수 | P1 | 공동구매 운영자 쿼리 |
| Product Library | `modules/neture/controllers/product-library.controller.ts` | 다수 | P1 | 상품 라이브러리 |
| CSV Import Service | `modules/neture/services/csv-import.service.ts` | 다수 | P1 | CSV 임포트 필드 매핑 |
| AI Tag Controller | `modules/store-ai/controllers/product-ai-tag.controller.ts` | 다수 | P1 | AI 태깅 쿼리 |
| AI Recommendation | `modules/store-ai/services/product-ai-recommendation.service.ts` | 다수 | P1 | AI 추천 쿼리 |
| AI Content | `modules/store-ai/controllers/product-ai-content.controller.ts` | 다수 | P1 | AI 콘텐츠 생성 |
| POP PDF | `modules/store-ai/controllers/product-pop-pdf.controller.ts` | 다수 | P1 | POP PDF 생성 |
| Admin Dashboard API | `apps/admin-dashboard/src/api/pop.api.ts` | 다수 | P1 | Admin DTO 타입 정의 |
| Neture Frontend Type | `services/web-neture/src/lib/api/store.ts` | L122 | P1 | 프론트 타입 인터페이스 |
| Neture Operator Cleanup | `services/web-neture/src/lib/api/operatorProductCleanup.ts` | L125 | P1 | 운영자 정리 API 타입 |
| Neture CSV Import | `services/web-neture/src/lib/api/csvImport.ts` | L63 | P1 | CSV 임포트 행 편집 필드 |
| Neture Cleanup Page | `services/web-neture/src/pages/operator/ProductDataCleanupPage.tsx` | L436, L446, L457 | P1 | 렌더링만 (쿼리 없음) |
| Neture Inventory | `services/web-neture/src/pages/account/SupplierInventoryPage.tsx` | L70, L202 | P1 | 공급사 재고 화면 |
| Neture Supplier Dashboard | `services/web-neture/src/pages/account/SupplierAccountDashboardPage.tsx` | L255 | P1 | 공급사 대시보드 |
| Import Row Drawer | `services/web-neture/src/components/import/EditImportRowDrawer.tsx` | L26 | P1 | CSV 편집 폼 필드 |
| CSV Page Comment | `services/web-neture/src/pages/supplier/SupplierCsvImportPage.tsx` | L441 | N/A | 주석/설명 텍스트만 |
| 마이그레이션 파일 | `database/migrations/20260422100000-RenameMarketingNameToName.ts` | L5, L10 | N/A | 완료된 마이그레이션 |
| 문서 파일 | `docs/audit/*.md` (17개) | 다수 | N/A | 문서/주석만 |

---

## 4. 위험도 집계

| 위험도 | 건수 | 설명 |
|--------|------|------|
| **P0** | **15개 파일** | 현재 또는 즉시 런타임 오류 가능 |
| **P1** | **15개 파일** | 특정 흐름 실행 시 오류 가능 |
| **N/A** | **25+개** | 문서/주석/완료 마이그레이션 |

---

## 5. 핵심 질문 답변

### Q1. 변경이 DB/엔티티까지만 반영되고 쿼리에 잔존했는가?
**YES.** DB 마이그레이션 및 TypeORM 엔티티는 `name`으로 정상 전환되었으나, raw SQL 쿼리·QueryBuilder 내 `pm.marketing_name` 참조 30여 건이 코드에 잔존한다.

### Q2. KPA 오류가 다른 서비스에도 전파될 가능성이 있는가?
**YES.** `store-public-utils.ts`, `store-qr-landing.controller.ts` 등 공통 유틸은 `serviceKey` 기반으로 neture/glycopharm/k-cosmetics 등 모든 서비스에 적용된다. 해당 경로 접근 시 동일 오류 발생.

### Q3. 프론트가 구 필드를 기대하는가, 백엔드가 남아있는가?
**주로 백엔드.** 프론트 타입 인터페이스 일부(`web-neture`)에도 `marketing_name`이 남아 있으나, 렌더링 전 데이터 전달 오류이므로 백엔드 쿼리 수정이 먼저다.

### Q4. 단일 수정으로 끝나는가?
**NO.** 최소 30개 파일, 50+ 위치 수정 필요. 단계적 WO 분리 권장.

---

## 6. 직접 수정 필요 후보 목록 (P0)

```
apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts
apps/api-server/src/routes/platform/store-tablet.routes.ts
apps/api-server/src/routes/platform/store-public/store-public-utils.ts
apps/api-server/src/routes/o4o-store/controllers/tablet.controller.ts
apps/api-server/src/routes/o4o-store/controllers/tablet-operator.controller.ts
apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts
apps/api-server/src/routes/o4o-store/controllers/store-channel-products.controller.ts
apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts
apps/api-server/src/routes/market-trial-operator.routes.ts
apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts
apps/api-server/src/modules/store-ai/services/product-ai-search.service.ts
apps/api-server/src/modules/store-ai/services/store-ai-product-snapshot.service.ts
```

---

## 7. 후속 WO 권장 순서

### WO-1 (즉시, P0 핵심 경로)
**`WO-O4O-PRODUCT-NAME-FIELD-FIX-BACKEND-CORE-V1`**
- KPA operator-product-applications
- store-public-utils (공통, 전 서비스 영향)
- store-qr-landing (QR 전 서비스 공통)
- pharmacy-products
- kpa-checkout

### WO-2 (P0 스토어/태블릿 경로)
**`WO-O4O-PRODUCT-NAME-FIELD-FIX-STORE-TABLET-V1`**
- store-tablet.routes
- tablet.controller
- tablet-operator.controller
- store-channel-products.controller
- market-trial-operator.routes

### WO-3 (P0 AI 서비스)
**`WO-O4O-PRODUCT-NAME-FIELD-FIX-AI-SERVICES-V1`**
- product-ai-search.service
- store-ai-product-snapshot.service
- product-ai-tag.controller
- product-ai-recommendation.service
- product-ai-content.controller
- product-pop-pdf.controller

### WO-4 (P1 KPA 서비스)
**`WO-O4O-PRODUCT-NAME-FIELD-FIX-KPA-SERVICES-V1`**
- groupbuy.service
- supplier-offers.controller
- groupbuy-operator.controller
- product-library.controller
- csv-import.service

### WO-5 (P1 프론트엔드 타입)
**`WO-O4O-PRODUCT-NAME-FIELD-FIX-FRONTEND-TYPES-V1`**
- web-neture api 타입들 (store.ts, operatorProductCleanup.ts, csvImport.ts)
- admin-dashboard pop.api.ts
- EditImportRowDrawer.tsx
- ProductDataCleanupPage.tsx 등 렌더링 파일

---

## 8. 수정 패턴 (참고용)

모든 수정은 기계적 치환이나, SQL 컨텍스트를 확인하여 alias까지 정확히 맞춰야 한다.

```sql
-- BEFORE
pm.marketing_name AS product_name
pm.marketing_name
product.marketing_name

-- AFTER
pm.name AS product_name
pm.name
product.name
```

TypeScript/프론트:
```typescript
// BEFORE
marketing_name: string;
item.marketing_name

// AFTER
name: string;
item.name
```

---

*Generated: 2026-04-23 | IR-O4O-PRODUCT-NAME-FIELD-IMPACT-AUDIT-V1*
