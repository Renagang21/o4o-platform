# CHECK-O4O-TABLET-PRODUCT-TEXT-BUTTON-NO-IMAGE-V1

> 태블릿(매장·공급자 제작·미리보기) 상품 UI에서 **상품 대표 이미지를 사용하지 않는다.**
> 상품 선택 UI = 이미지 카드 대신 **상품명 + 규격(specification) + (가격) 텍스트 버튼**. 공통 런타임 한 곳에서 정비.

- WO: `WO-O4O-TABLET-PRODUCT-TEXT-BUTTON-NO-IMAGE-V1`
- 상태: 공통 런타임 구현 완료 · typecheck PASS · (배포/스모크 별도 기록)

---

## 1. 기존 구조 (조사)

- 공통 태블릿 런타임 = `packages/tablet-kiosk-core/src/TabletKioskPage.tsx`. 상품 이미지 렌더 지점 3곳:
  - 목록 카드: `productImgArea` + `ProductImage`(📦 fallback)
  - 상세: 2단(좌 이미지 `detailImageBox`/`ProductImage` · 우 정보)
  - 미리보기 골격(`previewLayoutOnly`): `skeletonThumb`("상품 영역" 회색 블록)
- 상품 데이터: 공급자 상품은 `store-public-utils.ts::queryTabletVisibleProducts`(supplier_product_offers JOIN product_masters `pm`), 매장 자체 상품은 `store-public-tablet.handler.ts`(store_local_products, `pm` 무관).

### 매장용·공급자용 공유 관계 (중지조건 검증)
| 중지조건 | 결과 |
|---|---|
| #1 공급자 화면 별도 런타임? | **아니오** — 공급자 제작(`tablet-screen-set-editor`)·HUB 미리보기·매장 태블릿 모두 동일 `TabletKioskPage` |
| #2 QR 공개화면 다른 렌더러? | **예 (해당)** — `/qr/:slug` → `PublicScreenSetViewer.tsx`(자체 ProductCard). `TabletKioskPage` 미사용 |
| #3 `ProductMaster.specification` 안정 컬럼? | **예** — `product_masters.specification`(text, nullable) 기존 컬럼 |
| #4 migration 필요? | **아니오** (기존 컬럼) |
| #5 쿼리 pm 조인? | **예** — supplier 쿼리에 `pm` 조인, `pm.specification` additive 가능. 매장 자체 상품은 spec 컬럼 없음(§3.5대로 이름만) |
| #6 쇼핑몰 영향? | **아니오** — `TabletKioskPage`는 태블릿 전용(결제/장바구니 없음). 쇼핑몰 상품카드 무관 |

**중지조건 #2 발동** → QR 공개 화면(`PublicScreenSetViewer`)은 별도 렌더러이므로 **본 작업에서 임의 확장하지 않고 보고**한다(§5). 공통 런타임 상품 UI는 완료.

---

## 2. 변경

**변경 파일**
- `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` — 목록/상세/미리보기 이미지 제거 + 텍스트 버튼형, `ProductImage`/이미지 스타일 제거, `specification` 반영
- `packages/tablet-kiosk-core/src/types.ts` — `TabletProduct.specification?: string | null` (additive)
- `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` — 태블릿 상품 쿼리에 `pm.specification AS specification` (additive, migration 불필요; storefront 쿼리는 미변경)
- `services/web-kpa-society/src/api/tablet.ts`, `services/web-k-cosmetics/src/api/tablet.ts` — 로컬 `TabletProduct`에 `specification?` passthrough(명시)

**목록 버튼형 UI**: `상품명 / 규격(있을 때만) / (가격 설정 시 가격) + "자세히 보기 ›"`. 카드 전체가 선택 버튼. 자동 강조/자동 넘김/선택·상세 진입 유지. 📦 fallback 제거, 빈 규격 시 2행 미렌더.

**상세 단일 열 UI**: 좌우 2단 제거 → `상품명 / 규격 / 분류 / 가격 / 언어선택 / 상세설명 / 안내 / 뒤로`. 다국어·선택 콘텐츠 우선·상담 안내·가격 설정 모두 유지.

**미리보기 골격**: 이미지형(`skeletonThumb`) 제거 → 실제 화면과 동일한 텍스트 버튼형(상품명·규격·선택 표시) 골격.

**specification 전달**: `ProductMaster.specification → 태블릿 API → TabletProduct → DisplayProduct(mapSupplierProduct) → 목록/상세`. 매장 자체 상품(local)은 spec 미보유 → 이름만(신규 컬럼/입력 화면 없음).

---

## 3. 적용 범위
- 매장 태블릿 공개 화면 ✓ (KPA / K-Cosmetics `TabletStorePage` → `TabletKioskPage`)
- 공급자 제작 → 매장 HUB 전달 화면 ✓ (동일 런타임 · 편집기/HUB 미리보기)
- 화면 세트 미리보기 ✓
- 템플릿: product_focus / product_grid_qr / 기본 / 상품 그리드 포함 템플릿 ✓ (그리드 스타일 차이만, 카드 UI 공통)
- **QR 공개 화면(`/qr/:slug`) — 별도 렌더러(`PublicScreenSetViewer`) → 본 WO 범위 외(중지조건 #2 보고).**

---

## 4. 보존
- 대기 화면 이미지·동영상(idle hero/media), 코너 소개 이미지, 콘텐츠 카드 썸네일(`styles.productImg` 유지), QR 코드/모달 — 전부 유지.
- 상품 선택·상세 진입·설명서·다국어·선택 콘텐츠·가격 설정·상담 안내·편성 순서·자동 강조/넘김·HUB 가져오기·공급자 원본/매장 사본·DB 스키마/저장 모델 — 무변경.

---

## 5. 검증
- typecheck: `@o4o/tablet-kiosk-core` 0 · web-kpa-society 0 · web-k-cosmetics 0. api-server 변경은 SQL 문자열 additive(타입 영향 없음).
- build/deploy/smoke: (아래 별도 기록)
  - [ ] 목록에 상품 이미지/📦 없음, 상품명 큰 버튼, 규격 2행(있을 때), 가격 설정 유지
  - [ ] 버튼 클릭 → 상세(이미지 영역 없음, 전체 너비 설명, 언어/뒤로 정상)
  - [ ] 미리보기 텍스트 버튼형, 공급자 제작 미리보기에 이미지형 골격 없음
  - [ ] 비회귀: 대기 영상/코너/콘텐츠 썸네일/QR/매장 자체 상품/세트 저장·게시·가져오기/콘솔·API 오류 없음

---

## 6. 타 서비스 영향
- KPA(store tablet) · K-Cosmetics(store tablet): 공통 런타임 소비 → 텍스트 버튼형 동일 적용. 로컬 타입 additive.
- Neture: `tablet-kiosk-core` 소스 import 없음(dep만) → 영향 없음.
- GlycoPharm: `IdlePlaylistEditor`만 사용, 상품 런타임 미사용 → 영향 없음.

---

## 7. 미완/후속 (중지조건 #2)
- QR 공개 상품 화면은 `services/web-kpa-society/src/pages/qr/PublicScreenSetViewer.tsx`(별도 ProductCard)에서 렌더 → 상품 이미지 제거를 원하면 동일 원칙으로 별도 정비 필요(승인 시 진행).
- **→ 후속 완료: 아래 §8 (WO-O4O-TABLET-QR-PRODUCT-TEXT-BUTTON-ALIGN-AND-SPECIFICATION-SMOKE-V1)에서 정비함.**

---

## 8. 후속 — QR 렌더러 정렬 + specification 실측 (WO-O4O-TABLET-QR-PRODUCT-TEXT-BUTTON-ALIGN-AND-SPECIFICATION-SMOKE-V1)

### 8.1 QR 기존 구조
- `/qr/:slug`(screen_set) → `PublicScreenSetViewer.tsx`(자체 `ProductCard`). `product_list` 블록이 `section.data.products`를 렌더(이미지+📦). 상품 상세 진입 **없었음**(content_list 카드만 모달).
- 데이터 원천: resolver `store-public-screen-set-resolve.ts`가 **태블릿과 동일한 `queryTabletVisibleProducts`** 호출 후 `supplierResult.data`를 그대로 `data.products`로 전달 + local mirror 병합.

### 8.2 중지조건 검증
- QR 상품 데이터에 `specification` 전달? **예** — `queryTabletVisibleProducts`(§4에서 `pm.specification` additive 추가) 결과를 resolver가 그대로 통과 → specification 이미 전달됨.
- QR이 태블릿과 완전히 다른 원천? **아니오** — 동일 쿼리.
- migration 필요? **아니오**. 렌더러 변경이 QR 랜딩 전체 영향? **아니오** — `product_list` 렌더만 수정(코너/콘텐츠/idle 무관).
- → **중지조건 미발동, 프론트 최소 수정만 수행.**

### 8.3 변경 파일
- `services/web-kpa-society/src/pages/qr/PublicScreenSetViewer.tsx` (자체 `ProductCard`만 최소 수정 — TabletKioskPage 통합/재설계 없음)

### 8.4 상품 이미지 제거 + 텍스트 버튼형
- `product_list` 카드: 이미지 영역(`productImgArea`)·`<img>`·📦 fallback 제거 → **상품명 + 규격(specification, 있을 때) + 가격 + "자세히 보기 ›"** 텍스트 버튼. 카드 전체 클릭.
- 상품 상세 모달 신설(이미지 없음): 상품명 / 규격 / 가격 / 설명(ContentRenderer, supplier `description`/`short_description`) / 안내. 기존 modal 스타일 재사용.
- 유지: QR 코드, 코너 소개, 콘텐츠 카드 썸네일(`cardThumbImg`), idle 미디어.

### 8.5 specification 실측
- 전달 경로: `ProductMaster.specification → queryTabletVisibleProducts(pm.specification) → resolver/TabletProduct → 태블릿 목록·QR 목록·상세`.
- 태블릿(운영 스모크): 목록/상세 텍스트 버튼·이미지 없음 확인. 매장 자체(local) 상품은 규격 미보유 → 이름만(빈 줄 없음) 확인.
- **O4O 공급자 상품 규격 2행 표출**: (배포 후 운영 스모크 기록 — 아래)

### 8.6 검증
- typecheck: web-kpa-society 0.
- (배포/스모크: 아래 기록)
  - [ ] QR 상품 목록 이미지 없음 + 상품명 버튼형
  - [ ] QR 상품 선택 → 상세(이미지 없음, 설명 전체 너비, 닫기)
  - [ ] 태블릿/QR 양쪽 O4O 상품 규격 2행 · 없으면 빈 줄 없음
  - [ ] 콘텐츠 이미지·QR·대기 미디어 유지, 콘솔/API 오류 없음
