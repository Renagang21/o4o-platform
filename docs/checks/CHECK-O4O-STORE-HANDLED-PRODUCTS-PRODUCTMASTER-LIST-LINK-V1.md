# CHECK-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1

Status: DONE — 코드 완료 + typecheck/build 통과 + 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1`

Scope: KPA `/store/handled-products`(매장 경영활용 제품)에서 매장 경영자가 **O4O 표준 상품 DB(ProductMaster)를 검색·조회·선택**하고, 선택 상품을 매장 경영활용 제품(O4O 기반 제품 listing)으로 등록할 수 있게 한다. 1단계 — 리스트 조회·선택·등록. **프론트만 변경, 백엔드 무변경, DB 스키마 무변경.**

용어: **매장 경영활용 제품**(사용자 확정).

---

## 1. 현재 구조 조사 결과

### 프론트 (`services/web-kpa-society`)
- `/store/handled-products` = `StoreHandledProductsPage.tsx` — `organization_product_listings`(O4O 기반 제품) + `store_local_products`(매장 경영활용 제품) **UNION 읽기 전용** 통합 뷰. API=`GET /api/v1/store/handled-products`.
- `/store/commerce/products` = `PharmacyB2BPage` — **주문 가능 상품**(orderable, `GET /pharmacy/products/orderable`) = active OPL + 유효 공급 오퍼. ProductMaster 전체 카탈로그 아님.
- `/store/commerce/local-products` = `StoreLocalProductsPage` — 매장 자체 제품 CRUD.

### 백엔드 — **ProductMaster 검색/등록 API 이미 완비** (createStoreProductLibraryController, mount `/api/v1/store/products`)
| 엔드포인트 | 역할 |
| --- | --- |
| `GET /store/products/search?q=&page=&limit=` | ProductMaster 검색(store owner scope). 응답 = id/barcode/name/regulatoryName/manufacturerName/specification/category/brand/primaryImageUrl(deleted_at 제외) + meta pagination |
| `POST /store/products/list {masterId, price?}` | **master 기반 등록** → organization_product_listing(offer_id=NULL, is_active=true) 생성. **idempotent**(ON CONFLICT DO NOTHING → ALREADY_LISTED). active membership 기반 service_key 도출 |

### 확정된 gap
**`/store/products/search`(O4O 표준 상품 전체 카탈로그 검색)를 소비하는 프론트 UI가 전무.** 백엔드는 검색+등록 모두 준비됐으나 매장 UI에 노출되지 않아, 매장 경영자가 O4O 표준 상품을 직접 검색·선택할 수 없었다. → **프론트 UI만 추가하면 전체 흐름 완성.**

---

## 2. 구현 (프론트 전용)

### 신규 파일 2개
- `api/o4oStandardProducts.ts` — `searchO4oStandardProducts({q,page,limit})`(GET /store/products/search) + `registerStandardProductToStore(masterId)`(POST /store/products/list). 인증=기존 `getAccessToken`+`tryRefreshToken` 패턴(handledProducts.ts와 동일).
- `pages/pharmacy/AddO4oStandardProductModal.tsx` — 검색·선택·등록 모달.

### 변경 파일 1개
- `pages/pharmacy/StoreHandledProductsPage.tsx` — 헤더에 **`O4O 표준 상품에서 추가`** 버튼(primary) 추가 → 모달 오픈. 기존 "매장 경영활용 제품 등록"은 "매장 직접 등록"(secondary)으로 라벨 정리(경로 `/store/commerce/local-products` 유지). 등록 성공 시 `reload()`로 통합 목록 갱신.

### 흐름 (WO §5 UX)
```
[O4O 표준 상품에서 추가] → 검색(제품명/제조사/바코드, 디바운스 300ms)
→ 결과(대표 이미지·상품명·공식명·제조사·바코드·분류) + 페이지네이션
→ 행별 [등록] → POST /store/products/list {masterId}
→ toast(신규=성공 / 기존=ALREADY_LISTED 안내) + 목록 갱신 → "등록됨" 표시
```
- 등록된 상품은 통합 뷰에 **O4O 기반 제품**(listing)으로 표시됨(매장 경영활용 제품 우산 안).
- WO §6.2 "이미 등록 API가 있으면 연결한다" 충족 — 검색→선택→등록 루프 완성(대량 등록은 미포함, 행별 단건 등록).

---

## 3. 제외 (WO 준수)

상품 DB 신규 생성 / ProductMaster·Candidate 수정 / 설명·이미지 관리 / **대량 등록** / merge·split / 재매칭 / 주문 가능 listing(offer 기반) 생성 / 공급자 상품 연결 — **무접촉.** 백엔드/스키마 변경 없음.

---

## 4. 검증

| 항목 | 결과 |
| --- | --- |
| web-kpa-society typecheck | **에러 0** (`tsc --noEmit`) |
| web-kpa-society build | **EXIT 0** (`tsc && vite build`, StoreHandledProductsPage 청크 정상) |
| 변경 | 프론트 3파일(신규 2 + 편집 1) — 백엔드/API/스키마 무변경 |
| 기존 매장 취급/통합 뷰 회귀 | 기존 UNION 목록·탭·검색·관리 액션 유지(추가만) |
| 프로덕션 브라우저 smoke | **PASS** (kpa-society.co.kr, 2026-07-08, 체험용 약국 경영자 계정) |

**smoke 상세 (PASS, deploy-kpa-society 성공):**
- `/store/handled-products` 진입 → 헤더 **`O4O 표준 상품에서 추가`** 버튼(+`매장 직접 등록`) 노출.
- 모달 오픈 → O4O 표준 상품 검색 로드: **총 198,389건, 1/9920 페이지**, 이미지·상품명·제조사·바코드·분류·등록 버튼.
- 검색 **"타이레놀" → 43건, 1/3 페이지** 재계산.
- **등록**(타이레놀콜드-에스정) → toast "매장 경영활용 제품으로 등록되었습니다" → 배경 통합 목록 **0건 → 1건**("O4O 기반 제품 / 승인 대기" 행 추가) + 모달 해당 행 **"등록됨"**(idempotent 반영).
- 검색→선택→등록→목록 갱신 end-to-end 루프 정상. Console Error 없음(인증 관련 초기 401은 앱 공통, 기능 무관).

---

## 5. 완료 기준 대비

| 기준 | 상태 |
| --- | --- |
| /store/handled-products에서 O4O 표준 상품 리스트 조회 | ✅ 모달 검색 |
| 검색 가능 | ✅ (제품명/제조사/바코드, 디바운스) |
| 페이지네이션 | ✅ (서버 meta) |
| 상품 기본정보(이미지/상품명/제조사/바코드/분류) | ✅ |
| 선택 흐름 / 후속 등록 분리 | ✅ 등록 API 연결(단건 등록) |
| 기존 매장 취급 제품 회귀 없음 | ✅ 추가만, 기존 유지 |
| CHECK / commit·push·deploy | ✅ (283606aca, deploy-kpa-society 성공, smoke PASS) |

---

## 6. 후속 (분리)

- 대량(다건) 선택 등록, 등록 시 가격 입력, 오퍼 기반 등록 병행, 설명 보유 여부 배지(검색 응답 확장 필요) — 별도 WO.
- 등록 후 상세 설정(가격·진열·콘텐츠)은 기존 관리 화면 흐름 유지.
