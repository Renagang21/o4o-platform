# NETURE-SUPPLIER-CODE-AUDIT-V1

> 공급자 상품 등록/수정 코드 정비 기초 자료
> 작성일: 2026-03-26

---

## 대상 파일 (6개)

| # | 파일 | 라인수 | 역할 |
|---|------|--------|------|
| 1 | `offer.service.ts` | ~1,014 | 핵심 비즈니스 로직 |
| 2 | `supplier-product.controller.ts` | ~320 | API 라우트 |
| 3 | `neture.service.ts` | ~304 | Facade (패스스루) |
| 4 | `catalog.service.ts` | - | Master CRUD |
| 5 | `SupplierProductsPage.tsx` | 1,139 | 상품 목록/편집 UI |
| 6 | `SupplierProductCreatePage.tsx` | 812 | 상품 등록 UI |

---

## 1. CRITICAL — 즉시 수정 대상

### 1.1 bulk-price 라우트 버그 (controller:107)

```typescript
// 현재: 실패해도 항상 success: true 반환
const result = await netureService.bulkUpdatePrice(supplierId, offerIds, operation, value);
res.json({ success: true, data: result });
```

**문제**: 모든 offer가 실패해도 `success: true` 반환. 클라이언트가 실패를 감지 불가.

### 1.2 Fire-and-Forget 자동 확장 (offer.service.ts:658-661)

```typescript
autoExpandPublicProduct(AppDataSource, savedOffer.id, savedOffer.masterId)
  .then(count => logger.info(...))
  .catch(err => logger.error(...));  // ← 에러 삼킴
```

**문제**: 리스팅 생성 실패 시 API 응답에 반영 안 됨. 공급자는 성공으로 알지만 실제 확장 실패.

### 1.3 rejectProduct의 미사용 reason 파라미터 (offer.service.ts:201)

```typescript
async rejectProduct(offerId: string, adminUserId: string, reason?: string)
// Line 221: reason = 'Offer rejected by admin' ← 파라미터 무시, 하드코딩
```

---

## 2. HIGH — 구조 개선 대상

### 2.1 거대 함수 (50줄 초과)

| 함수 | 라인수 | 문제 |
|------|--------|------|
| `createSupplierOffer()` | **162줄** | 검증+마스터해석+생성+승인이 한 함수 |
| `getSupplierProductsPaginated()` | **161줄** | 쿼리빌딩+SQL+결과매핑이 한 함수 |
| `getSupplierProducts()` | 88줄 | 3개 쿼리+매핑 |
| `updateSupplierOffer()` | 84줄 | 조건부 필드 업데이트 |
| `approveProduct()` | 67줄 | 트랜잭션 로직 |

### 2.2 에러 응답 형식 불일치

```typescript
// Pattern A (상품 라우트): 에러가 문자열
{ success: false, error: 'PRODUCT_NOT_FOUND', message: '...' }

// Pattern B (CSV 라우트): 에러가 객체
{ success: false, error: { code: 'UNAUTHORIZED' } }

// Pattern C (bulk-price): 항상 success (버그)
{ success: true, data: { updated: 0, failed: [...] } }
```

**13개 에러 코드**가 매직 스트링으로 산재. enum 없음.

### 2.3 Passthrough Facade (neture.service.ts:241-304)

6개 메서드가 **순수 패스스루** — 로직 추가 없이 offerService 호출만 전달:

- `getSupplierProducts` → `offerService.getSupplierProducts`
- `getSupplierProductsPaginated` → 동일
- `batchUpdateSupplierOffers` → 동일
- `bulkUpdatePrice` → 동일
- `createSupplierOffer` → 동일
- `updateSupplierOffer` → 동일

**판단**: 삭제하고 controller → offerService 직접 호출, 또는 Facade에 값 추가 (검증/로깅/메트릭).

### 2.4 입력 검증 부재 (controller)

| 라우트 | 문제 |
|--------|------|
| POST `/supplier/products` | body 검증 없음 (DTO 없음). 서비스 레이어에서 뒤늦게 검증 |
| GET `/supplier/products` | query param 타입 검증 없음. `page=-999` → 1로 자동 보정 |
| PATCH `/supplier/products/:id` | body 필드 타입 체크 없음 |

### 2.5 타입 안전성

| 위치 | 문제 |
|------|------|
| offer.service.ts:442 | `as any` 캐스트 (masterId 검사) |
| offer.service.ts:840 | 쿼리 결과 `r: any` — 20+ 필드 타입 미정의 |
| offer.service.ts:701-710 | options 전체 `string` 타입 — enum/boolean 아님 |
| SupplierProductsPage:436 | `key: 'stockQuantity' as any` |

### 2.6 프론트엔드 컴포넌트 거대화

| 컴포넌트 | 라인수 | 권장 |
|----------|--------|------|
| SupplierProductsPage | **1,139줄** | ~300줄로 분리 |
| SupplierProductCreatePage | **812줄** | ~200줄 × 4파일 |

---

## 3. MEDIUM — 리팩토링 대상

### 3.1 중복 로직

| 패턴 | 위치 | 횟수 |
|------|------|------|
| offer→DTO 매핑 | getPendingProducts, getAllProducts, getSupplierProducts | 3회 |
| purpose 파생 (ternary) | getSupplierProducts:343, getPaginated:842 | 2회 |
| completenessStatus 파생 | getPaginated:848, 프론트 | 2회 |
| approval count 쿼리 | getSupplierProducts:304-321 | 2회 (pending/approved) |
| 이미지 핸들러 | CreatePage:260-298 | 3회 (thumbnail/detail/content) |
| fetch→setState 패턴 | ProductsPage | 3회 |

### 3.2 매직 넘버/스트링

| 값 | 위치 | 용도 |
|----|------|------|
| `50`, `100` | offer.service.ts:712 | 페이지 기본값/최대값 |
| `20` × 5 | COMPLETENESS_EXPR | 완성도 항목당 점수 |
| `60` | offer.service.ts:764,766,848 | READY 임계값 |
| `'pending'`, `'approved'`, `'revoked'` | 다수 | 승인 상태 (enum 대신 문자열) |
| `'Offer rejected by admin'` | :221 | 하드코딩 거부 사유 |

### 3.3 에러 핸들링 try-catch 반복

8곳에서 동일 패턴:
```typescript
try { ... } catch (error) {
  logger.error('[NetureOfferService] Error ...:', error);
  throw error;  // ← 로깅만 하고 재throw
}
```

**제안**: 에러 미들웨어에서 일괄 처리하거나, 로깅 데코레이터 적용.

### 3.4 프론트엔드 인라인 모달 (ProductsPage)

4개 모달이 같은 파일에 정의:

| 모달 | 라인 | 복잡도 |
|------|------|--------|
| BulkPriceModal | 77-136 | LOW |
| ImageUploadModal | 140-231 | MEDIUM |
| DescriptionEditModal | 240-324 | MEDIUM |
| RegulatoryInfoModal | 328-374 | LOW |

**제안**: 각각 별도 파일로 추출.

### 3.5 useState 과다 (ProductsPage: 16개)

```
4개 필터 state → 1개 object로 통합 가능
filterHasImage, filterHasDescription, filterBarcodeSource, filterCompleteness
→ const [filters, setFilters] = useState({ hasImage: '', ... })
```

### 3.6 CreatePage 이미지 state 중복 (6개 → 1개)

```
thumbnailFile, thumbnailPreview, detailFiles, detailPreviews, contentFiles, contentPreviews
→ const [images, setImages] = useState({ thumbnail: {...}, detail: {...}, content: {...} })
```

---

## 4. LOW — 코드 위생

| 항목 | 위치 | 설명 |
|------|------|------|
| 미사용 masterId 반환 | offer.service.ts:81 | getPendingProducts 매핑에서 할당 후 미사용 |
| 하드코딩 한국어 | ProductsPage 50+곳, CreatePage 80+곳 | i18n 상수 미추출 |
| useMemo 의존성 | ProductsPage:666 | `products` 매 fetch마다 변경 → 컬럼 재생성 |
| DOM querySelector | ProductsPage:928 | ref 대신 querySelector 사용 |
| alert() 사용 | ProductsPage:169 | 에러 UI 없이 alert |

---

## 5. 정비 우선순위 제안

### Phase 1: 버그 수정 (소요: 작음)

| # | 작업 | 파일 |
|---|------|------|
| 1 | bulk-price 응답 success 판정 수정 | controller |
| 2 | rejectProduct reason 파라미터 연결 | offer.service |
| 3 | `as any` 캐스트 제거 (stockQuantity) | ProductsPage |

### Phase 2: 에러 표준화 (소요: 중간)

| # | 작업 | 파일 |
|---|------|------|
| 4 | 에러 코드 enum 생성 (`OfferErrorCode`) | 신규 |
| 5 | 에러 응답 형식 통일 (string → `{ code, message }`) | controller, service |
| 6 | options 타입 strict literal union 적용 | offer.service |

### Phase 3: 구조 분리 (소요: 중간)

| # | 작업 | 파일 |
|---|------|------|
| 7 | createSupplierOffer 분해 (validate → resolve → create) | offer.service |
| 8 | getSupplierProductsPaginated 분해 (buildQuery → execute → map) | offer.service |
| 9 | 모달 4개 별도 파일 추출 | ProductsPage |
| 10 | CreatePage 3 Step 컴포넌트 분리 | CreatePage |
| 11 | Facade 패스스루 정리 (삭제 또는 값 추가) | neture.service |

### Phase 4: 중복 제거 (소요: 작음)

| # | 작업 | 파일 |
|---|------|------|
| 12 | offer→DTO 매핑 함수 추출 | offer.service |
| 13 | purpose/completenessStatus 파생 함수 추출 | offer.service |
| 14 | 이미지 핸들러 커스텀 훅 추출 | CreatePage |
| 15 | 필터 state 통합 (4→1) | ProductsPage |

### Phase 5: 입력 검증 (소요: 중간)

| # | 작업 | 파일 |
|---|------|------|
| 16 | CreateSupplierOfferDto 생성 | 신규 |
| 17 | UpdateSupplierOfferDto 생성 | 신규 |
| 18 | SupplierProductsFilterDto 생성 | 신규 |
| 19 | controller에 DTO 검증 적용 | controller |

---

## 6. 금지 사항

- ❌ 승인 로직 변경 금지
- ❌ DB 스키마 변경 금지
- ❌ API URL 구조 변경 금지
- ❌ EditableDataTable (Frozen F1) 수정 금지
- ❌ 기존 에러 코드 값 변경 금지 (형식만 통일)

---

## 7. 수치 요약

| 지표 | 현재 | 목표 |
|------|------|------|
| offer.service.ts 최대 함수 길이 | 162줄 | < 50줄 |
| 에러 코드 매직 스트링 | 13개 | 0 (enum) |
| ProductsPage 라인수 | 1,139줄 | ~300줄 |
| CreatePage 라인수 | 812줄 | ~200줄 |
| Passthrough 메서드 | 6개 | 0 (삭제/정리) |
| `as any` 캐스트 | 4개 | 0 |
| 인라인 모달 | 4개 | 0 (분리) |
| useState 훅 (ProductsPage) | 16개 | ~12개 |

---

*Status: 기초 자료 확정 — 정비 WO 작성 대기*
