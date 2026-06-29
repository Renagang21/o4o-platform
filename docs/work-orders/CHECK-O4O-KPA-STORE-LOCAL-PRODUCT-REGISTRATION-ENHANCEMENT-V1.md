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

### 마이그레이션 번호 체계 확인 (요청 조사 — 파일명 변경/재실행 안 함)
- 이 리포의 마이그레이션 타임스탬프는 **실제 달력과 분리된 단조증가 시퀀스**다. 현재 실제 날짜는 2026-06-29 이지만 직전 최대 번호는 `20261130000000`(2026-11-30) 으로 이미 ~5개월 앞서 있다. 즉 번호는 "마지막에 실행"을 보장하는 순번 키이지 실제 날짜가 아니다.
- 신규 `20261201000000` = 직전 최대(`20261130000000`)의 **다음 순번**, 유니크, date-style 중 최후미 정렬(legacy 13자리 `4000000000003` 는 숫자상 더 작아 그 앞). TypeORM 은 timestamp 숫자 오름차순 실행 → 가장 큰 값이라 **마지막에 실행**됨.
- 라이브 적용·ledger 등록 완료(로그 확인). **기존 체계와 정합 — 조치 불필요.** (이미 적용되었으므로 파일명 변경/재실행하지 않음.)

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

### 브라우저 UI 스모크 (PASS — 프로덕션 배포본, 격리 임시 프로필)
MCP 공용 Playwright 프로필이 다른 세션 Chrome 에 잠겨 있어, **별도 임시 user-data-dir(headless chromium-1200)** 로 격리 실행(사용자 Chrome 미종료). 계정 = 약국 경영자(renagang21).

| 항목 | 결과 |
|------|------|
| 모달 명칭 | "매장 경영활용 제품 등록" ✓ |
| 필드 순서 | 제품 이미지 → 상품명* → 바코드(선택) → 카테고리 → 설명 → 요약 → 가격 … ✓ (DOM 순서 확인) |
| 반응형 | PC@1280 상품명/바코드 = 2열(`304px 304px`) · 모바일@390 = 1열(`310px`) ✓ |
| 이미지 업로드·미리보기 | 파일 업로드 → media-library 201 → 폼에 대표 이미지 미리보기 ✓ |
| 목록 대표 이미지 | 저장 후 목록에 상품 + media 썸네일 표시 ✓ |
| 수정-바코드 앞자리0 | 재오픈 시 입력값 `0123456789` 그대로 ✓ |
| 수정-이미지 교체/삭제 | 교체·삭제 버튼 존재, 삭제 시 "이미지 불러오기" placeholder 복귀 ✓ |
| 설명 직접 입력 | contenteditable 타이핑 반영 ✓ |
| 콘텐츠 가져오기(빈 편집기 삽입) | 내 매장 콘텐츠 9건(org 스코프) → 빈 편집기 즉시 삽입 ✓ |
| 충돌 시 교체/추가/취소 | 다이얼로그 노출, 취소=무변경 / 추가=본문 증가(116→234) / 교체=치환(116) ✓ |
| 가져온 사본 독립성 | 저장 후 재오픈 시 본문 유지(116) — 원본과 분리된 사본 ✓ |
| 콘솔/네트워크 오류 | console.error 0 · 4xx/5xx 0 (전 시나리오) ✓ |
| 스모크 데이터 정리 | 제품 2건 비활성화(active 0) · 업로드 미디어 2건 operator 삭제(200, 전 폴더 leftover 0) ✓ |

> 함정 기록: 이미지 업로드 첫 시도 500 은 **테스트 픽스처(4×4·77B PNG)** 가 sharp 처리에서 실패한 것이며, 정상 크기 PNG 업로드는 201 성공. 코드/엔드포인트 정상. KPA 프론트 API base = `https://api.neture.co.kr`(쿠키 도메인 `.neture.co.kr`).

---

## 8. 제외 범위 준수
O4O 내부 상품설명 AI 생성 · 사진 기반 자동 추출 · 바코드 스캐너/OCR · 외부 상품 DB 조회 · 상품 자동 등록 · 콘텐츠 실시간 동기화 · 공용 편집기 AI 정책 변경 · 공급자/주문 상품 구조 변경 — **모두 미포함**.
