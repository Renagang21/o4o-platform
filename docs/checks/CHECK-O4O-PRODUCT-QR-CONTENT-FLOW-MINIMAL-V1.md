# CHECK-O4O-PRODUCT-QR-CONTENT-FLOW-MINIMAL-V1

> WO: `WO-O4O-PRODUCT-QR-CONTENT-FLOW-MINIMAL-V1` (B-1: 상품당 QR 1개 + 언어 탭)
> 상태: **구현·배포·프로덕션 smoke PASS (DONE)**
> 일자: 2026-07-09

## 목표
매장 취급상품 화면에서 상품별 **한국어/중국어 HTML QR 콘텐츠를 직접 저작**하고, 다국어 그룹의 **publicKey QR(언어 탭 랜딩)**로 안내한다. 신규 저장소/엔진 없음, **migration 0**.

## 변경 (commit)
- `5a535f306` feat: product-based multilingual QR content authoring flow
  - **backend**: `GET /pharmacy/multilingual-product-contents/:groupId` (초안 content hydrate, 기존 `loadGroupWithPages` 재사용, org-scoped). 신규 테이블 0.
  - **web api**: store 저작 클라이언트 fns — `getStoreMlcGroup` / `createStoreMlcGroup`(source_type='store_created') / `upsertStoreMlcPage` / `setStoreMlcPageStatus`.
  - **web**: `StoreProductMultilingualContentPage` (operator 편집기 store 스코프 이식, target=sourceType/sourceId 바인딩, `MultilingualPublicActions` publicKey QR).
  - **web**: 라우트 `/store/products/multilingual/:targetKind/:targetId`.
  - **web**: `StoreHandledProductsPage` 행 "다국어 QR" CTA + 연결 상태 배지.
- `cef16ec83` fix: mlc target assert — listing 에서 과도한 `service_key` 조건 제거
  - 취급상품 목록은 listing 을 `organization_id + is_active` 로만 조회하는데 assert 는 `service_key='kpa'` 를 추가 요구 → `listing.service_key='kpa-society'`(kpa≠kpa-society 함정)로 자기 매장 상품인데 "Target not found". 소유 경계=organization_id 이므로 service_key 조건 제거(목록 진실 소스와 정합).

## 배포
- Deploy API Server (Cloud Run) — success (`5a535f306`, `cef16ec83`)
- Deploy Web Services (Cloud Run) — success (kpa-society-web, `5a535f306`)

## 프로덕션 smoke (kpa-society.co.kr, 약국 경영자 계정)
| # | 단계 | 결과 |
|---|------|------|
| 1 | 로그인(약국 경영자) | ✅ |
| 2 | `/store/handled-products` 행 "다국어 QR" CTA 노출 | ✅ (뇌선·타이레놀 2행) |
| 3 | 편집기 진입 `/store/products/multilingual/listing/{id}?name=뇌선` (제목 프리필) | ✅ |
| 4 | 그룹 생성(source_type=store_created) | ✅ (assert 수정 후) |
| 5 | 한국어 page 제목·본문 작성 → "저장 후 이 언어 발행" | ✅ |
| 6 | 中文 page 제목·본문 작성 → 발행 | ✅ |
| 7 | "QR 보기" → publicKey QR SVG + URL `/multilingual-products/{publicKey}` | ✅ |
| 8 | 공개 랜딩: 한국어/中文 언어 탭·본문·`?locale=zh` 렌더 | ✅ |
| 9 | 목록 행 배지 "2개 언어" 반영 | ✅ |

- 발급 publicKey 예: `f04fe66f3e32839f49bda421` → `https://kpa-society.co.kr/multilingual-products/f04fe66f3e32839f49bda421`

## 불변식 준수
- **QR 비저장·동적생성** (F12 ④): store_qr_codes row 미생성. 다국어 그룹의 동적 publicKey QR(SVG 온디맨드) 사용 → 저장형 QR 아님, F12 충돌 없음.
- **공개 경로**: `/multilingual-products/:publicKey` (기존 다국어 랜딩 재사용). `/qr/{slug}` 아님, `/r/{resourceId}` 미사용.
- **shared_product_descriptions 무변경** (QR 판매 콘텐츠는 store_multilingual_product_content_* 에 저장).
- **migration 0** / 신규 테이블 0.
- **가져오기=사본**: store_created 직접 저작이라 원본 참조 없음(사본 가드 대상 아님).

## 후속
- `WO-O4O-STORE-OWN-PRODUCT-QR-CONTENT-AQUACELLE-OMEGA3-APPLY-V1` — 아쿠아셀 알티지 오메가-3 The Pure 한/중 실콘텐츠 등록 (본 인프라로 진행 가능).
- (선택) admin ProductMasterDetail 진입 CTA, local 상품 대상 smoke.
