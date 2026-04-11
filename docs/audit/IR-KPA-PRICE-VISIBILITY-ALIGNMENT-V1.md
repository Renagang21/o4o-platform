# IR-KPA-PRICE-VISIBILITY-ALIGNMENT-V1

**작업일**: 2026-04-11
**검증 도구**: curl + Python (라이브 API 호출)
**배포 방식**: main push → GitHub Actions CI/CD → Cloud Run

---

## 1. 전체 판정

```
전체 판정: ✅ PASS
가격 필드 추가: ✅ Backend 2개 API + Frontend 2개 화면
표시 우선순위: priceGold(서비스가) → priceGeneral(일반가) → '-'
빌드: ✅ TypeScript 에러 0건
배포: ✅ API + Web 모두 SUCCESS
라이브 검증: ✅ 우루사 priceGeneral=20000, priceGold=18000, consumerRef=25000
```

---

## 2. 가격 구조 확인

### supplier_product_offers 가격 필드

| 필드 | 타입 | 용도 |
|------|------|------|
| `price_general` | INT (NOT NULL, default 0) | B2B 일반 공급가 |
| `price_gold` | INT (nullable) | 서비스 공급가 (KPA 기준가, 참고용) |
| `price_platinum` | INT (nullable) | 스팟가 (참고용) |
| `consumer_reference_price` | INT (nullable) | 소비자 참고가 |

### KPA 가격 표시 우선순위

```
1. priceGold (서비스가) → "서비스가" 라벨
2. priceGeneral (일반가) → "일반가" 라벨
3. 둘 다 없음 → "-"
```

### 우루사 기준 데이터

| 필드 | 값 |
|------|------|
| priceGeneral | 20,000원 |
| priceGold | 18,000원 |
| consumerReferencePrice | 25,000원 |
| **KPA 표시 가격** | **18,000원 (서비스가)** |

---

## 3. 수정 파일 목록

| 파일 | 변경 내용 |
|------|------------|
| `operator-product-applications.controller.ts` | SELECT에 `spo.price_general`, `spo.price_gold`, `spo.consumer_reference_price` 추가 |
| `pharmacy-products.controller.ts` | /catalog SELECT에 동일 3개 가격 필드 추가 |
| `pharmacyProducts.ts` (API client) | `CatalogProduct` interface에 `priceGeneral`, `priceGold`, `consumerReferencePrice` 추가 |
| `ProductApplicationManagementPage.tsx` | 운영자 승인 테이블에 "공급가" 컬럼 추가 |
| `HubB2BCatalogPage.tsx` | 약국 HUB 카탈로그 테이블에 "공급가" 컬럼 추가 |

---

## 4. 화면 변경 상세

### KPA 운영자 상품 승인 관리 페이지

| 수정 전 컬럼 | 수정 후 컬럼 |
|------------|------------|
| 약국, 상품명, 공급사, 카테고리, 신청일, 상태, 액션 | 약국, 상품명, 공급사, **공급가**, 카테고리, 신청일, 상태, 액션 |

- 공급가 컬럼: 우측 정렬
- 서비스가 존재 시: 금액 + "서비스가" 서브라벨
- 일반가만 존재 시: 금액 + "일반가" 서브라벨
- 미설정 시: "-"

### 약국 HUB B2B 카탈로그 페이지

| 수정 전 컬럼 | 수정 후 컬럼 |
|------------|------------|
| 상품명, 공급사, 카테고리, 상태, 등록일, 액션 | 상품명, 공급사, 카테고리, **공급가**, 상태, 등록일, 액션 |

- 동일 표시 로직: priceGold → priceGeneral → "-"
- 서브라벨로 가격 유형 표시

---

## 5. 검증 결과

### API 검증

| 엔드포인트 | 결과 |
|-----------|------|
| `GET /pharmacy/products/catalog` | ✅ priceGeneral=20000, priceGold=18000, consumerRef=25000 |
| `GET /operator/product-applications` | ✅ 코드 배포 확인 (scope 권한 필요) |

### 빌드/배포

| 항목 | 결과 |
|------|------|
| TypeScript build (api-server) | ✅ 에러 0건 |
| TypeScript build (web-kpa-society) | ✅ 에러 0건 |
| CI/CD Pipeline | ✅ SUCCESS |
| API Server Deploy | ✅ SUCCESS |
| Web Services Deploy | ✅ SUCCESS |

---

## 6. Neture 운영자 화면 검토

Neture 운영자 승인 페이지(`ProductApprovalQueuePage.tsx`)는 이미 `priceGeneral`을 "가격" 컬럼으로 표시 중.
Backend(`offer.service.ts`)는 `priceGold`, `pricePlatinum`, `consumerReferencePrice` 모두 반환.
추가 보강(priceGold 우선 표시 등)은 별도 WO로 분리 가능.

---

## 7. 미수정 영역

| # | 영역 | 현재 상태 | 권장 |
|---|------|----------|------|
| 1 | Neture 운영자 priceGold 우선 표시 | priceGeneral만 표시 | 하 — 별도 WO |
| 2 | 약국 주문 가능 상품 페이지 가격 표시 | 미표시 | 중 — 주문 흐름 연계 |
| 3 | 약국 매장 상품 관리 페이지 가격 표시 | 미표시 | 중 — 매장 운영 편의 |

---

*작업자: Claude Code*
*커밋: `31a450a3d` (main)*
*CI/CD: GitHub Actions → Cloud Run SUCCESS*
