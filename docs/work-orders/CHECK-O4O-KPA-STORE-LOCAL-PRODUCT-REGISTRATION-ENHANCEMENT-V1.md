# CHECK — WO-O4O-KPA-STORE-LOCAL-PRODUCT-REGISTRATION-ENHANCEMENT-V1

> 매장 경영활용 제품 등록 화면 보완 (이미지 파일 업로드 · 바코드 · 콘텐츠에서 가져오기)
> 커밋: `a93e2d6c8` · 배포: API/Web Cloud Run green · 백엔드 라이브 API 스모크 PASS
> 작성일: 2026-06-29

---

## 1. 선행 조사 결과

| 항목 | 결과 |
|------|------|
| `StoreLocalProduct` 엔티티 | `store_local_products`. 이미 `name/description/images[]/thumbnail_url/gallery_images[]/detail_html/category/price_display/summary/badge_type/highlight_flag` 보유. **`barcode` 부재** → 신규 추가 |
| 등록/수정 모달 이미지 | `thumbnail_url` **텍스트 URL 입력만** 존재(업로드 UI 없음). 목록에 대표 이미지 컬럼은 이미 존재 |
| 공용 미디어 업로드 | `MediaLibraryService` + `MediaAsset(media_assets)` + GCS `o4o-media-library`. KPA `MediaPickerModal`(업로드+라이브러리, URL 반환) 재사용 가능 |
| 승인된 이미지 보완 AI | **존재하지 않음** — 서버측 이미지 품질 보완/denoise/배경제거/업스케일 엔드포인트 전무. (Vision 분석/OCR·클라이언트 Canvas 편집만 존재) |
| 콘텐츠 선택기 재사용 | `StoreAssetSelectorModal`(본문 HTML 미반환 경로 많음) / `storeLibraryApi.listContents({source:'mine'})` 통합 feed(본문 contentJson 보유, org 스코프) → 후자 채택 |
| 표준 편집기 | `RichTextEditor`(@o4o/content-editor). HTML sanitize 는 백엔드 `sanitizeHtml`(script/on* 제거) |

---

## 2. 변경 파일

### Backend
- `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` — `barcode varchar(64) nullable` 컬럼
- `apps/api-server/src/database/migrations/20261201000000-AddBarcodeToStoreLocalProduct.ts` — 신규 마이그레이션(ADD COLUMN IF NOT EXISTS)
- `apps/api-server/src/routes/platform/store-local-product.routes.ts` — `normalizeBarcode()`(빈 값→null), GET select·POST·PUT 에 barcode 반영

### Frontend (web-kpa-society)
- `src/api/localProducts.ts` — `LocalProduct.barcode` / `LocalProductInput.barcode`
- `src/pages/pharmacy/StoreLocalProductsPage.tsx` — 모달 명칭/필드 순서/이미지 업로드/바코드/콘텐츠 가져오기
- `src/components/store/StoreContentImportModal.tsx` — **신규** 내 매장 콘텐츠 본문 복사 모달

---

## 3. DB 변경

```sql
ALTER TABLE store_local_products ADD COLUMN IF NOT EXISTS barcode varchar(64);
```
- nullable → 기존 행 무영향. Display Domain 전용(Commerce 아님, 경계 정책 부합).
- 마이그레이션 라이브 실행 로그 확인: `[AddBarcodeToStoreLocalProduct] barcode varchar(64) nullable column added.`

---

## 4. API 계약

`/api/v1/store/local-products` (org 스코프, `resolveStoreAccess`) — 기존 계약에 `barcode` 추가(가산적).
- POST/PUT body: `barcode?: string` — 빈/공백 문자열은 서버에서 `null` 정규화. **숫자형 컬럼 미사용 → 앞자리 `0` 보존.**
- 중복 제한·외부 조회·스캔/OCR **없음**.

---

## 5. AI 사진 보완 — 구현 여부

**미구현(후속 분리).** 승인된 이미지 품질 보완 AI 경로가 리포지토리에 존재하지 않아, WO §5 단서("기존 승인된 이미지 AI 경로가 없다면 이미지 업로드까지만 구현하고 AI 보완은 별도 후속 작업으로 분리")에 따라 **이미지 업로드까지만 구현**하고 `AI로 사진 보완` 버튼은 추가하지 않았다(비작동 버튼 미노출). 별도 WO 권장.

---

## 6. 등록 화면 구성 (구현)

순서: ① 제품 이미지 → ② 상품명(필수) · ③ 바코드(선택, PC 2열/모바일 1열) → ④ 카테고리 → ⑤ 설명 표준 편집기(+콘텐츠에서 가져오기) → ⑥ 요약·가격·갤러리·배지·정렬·강조.

- **제품 이미지**: 파일 불러오기 기본(`MediaPickerModal` → 공용 미디어 라이브러리 업로드, GCS https URL 저장). 미리보기/교체/삭제 제공. **base64 미저장**(URL 만 저장). 등록/수정 공통.
- **콘텐츠에서 가져오기**: 내 매장 콘텐츠(`source='mine'` = direct + 매장 제작 자료, org 스코프)만 조회 → 본문 HTML **복사**. 기존 설명 비어있으면 즉시 삽입, 있으면 `기존 내용 교체 / 아래에 추가 / 취소`. 제목은 가져오지 않음(상품명 자동 변경 없음). 연결 아닌 사본 → 원본 수정/삭제와 독립.

---

## 7. 검증

### 백엔드 라이브 API 스모크 (PASS — 프로덕션 배포본 대상, store-owner renagang21)
| 항목 | 결과 |
|------|------|
| 바코드 생성(앞자리 0) | `0880012345678` / `0070` 그대로 보존 ✓ (varchar 증명) |
| 빈/공백 바코드 → null | 생성·수정 모두 `null` ✓ |
| 바코드 수정 후 클리어(`""`→null) | ✓ |
| GET 목록 barcode 필드 반환 | ✓ |
| 상품명 필수 검증 | 빈 이름 → 400 `VALIDATION_ERROR` ✓ |
| 대표 이미지 URL 저장 | `thumbnailUrl` 저장 확인 ✓ |
| 이미지 없이 등록 | 정상 생성 ✓ (기존 정책 유지) |
| 스모크 데이터 정리 | 3건 soft-delete, active total = 0 ✓ |

### 타입체크
- `web-kpa-society` `tsc --noEmit` PASS / `api-server` 관련 파일 오류 0.

### 브라우저 UI 스모크 — **보류(환경 차단)**
로컬 Playwright 영속 프로필(`C:\Users\home\.playwright-o4o-profile`)이 **이미 열려있는 Chrome 인스턴스에 의해 잠겨** 신규 세션 기동이 반복 실패(동시 세션의 브라우저 점유 추정). 사용자 Chrome 강제 종료는 하지 않음.
→ 이미지 업로드 모달/콘텐츠 가져오기 모달/필드 배치/반응형은 **브라우저 DOM 스모크 미수행**. 코드 typecheck·CI green·백엔드 계약 라이브 검증 완료. 브라우저가 비는 즉시 재수행 필요.

---

## 8. 제외 범위 준수
O4O 내부 상품설명 AI 생성 · 사진 기반 자동 추출 · 바코드 스캐너/OCR · 외부 상품 DB 조회 · 상품 자동 등록 · 콘텐츠 실시간 동기화 · 공용 편집기 AI 정책 변경 · 공급자/주문 상품 구조 변경 — **모두 미포함**.
