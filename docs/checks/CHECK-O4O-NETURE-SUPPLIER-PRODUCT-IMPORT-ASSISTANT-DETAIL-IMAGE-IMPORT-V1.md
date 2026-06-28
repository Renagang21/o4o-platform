# CHECK — 상품 가져오기 도우미 상세설명 이미지 가져오기 V1

- **WO**: `WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1`
- **대상 화면**: `https://neture.co.kr/supplier/products/import-assistant`
- **작업일**: 2026-06-28
- **범위**: 프론트엔드 전용 (web-neture). 백엔드/API/마이그레이션 무변경.

---

## 1. 핵심 발견 — WO 전제와 실제 구조의 차이

WO 본문(§13 API 응답 확장, §14 SSRF, §17 api-server typecheck/API smoke)은 **외부 상품 페이지를 서버가 fetch 하는 백엔드 분석기**를 전제로 작성되었으나, **실제 등록 도우미는 100% 클라이언트 사이드**다.

흐름:
```
사용자가 외부 페이지 HTML 을 textarea 에 붙여넣기
→ parseProductHtml() (브라우저 DOMParser, services/web-neture/src/lib/product-import/parser.ts)
→ ParsedProductData 렌더
```

브라우저는 외부 페이지를 **fetch 하지 않는다**. 따라서:

| WO 항목 | 실제 |
|---|---|
| §13 분석 API 응답에 `detailImageCandidates` 추가 | 분석 API 부재 → **프론트엔드 타입(`ParsedProductData`) additive 확장**으로 구현 |
| §14 SSRF / 사설 IP / redirect / timeout (분석 시) | **N/A** — 분석 시 서버 fetch 없음. (이미지의 GCS 복사 SSRF 는 상품 저장 시 기존 백엔드 코드 `processImportImages` 영역 — 본 WO 범위 외, 무변경) |
| §17 api-server typecheck / API smoke | **N/A** — 백엔드 변경 없음. 파서 오프라인 smoke 로 대체 |

→ 사용자 승인(2026-06-28): **프론트엔드 전용 최소 구현**으로 진행.

---

## 2. 기존 가져오기 구조 / 썸네일 처리 재사용 여부

- 페이지: [services/web-neture/src/pages/supplier/SupplierProductImportPage.tsx](../../services/web-neture/src/pages/supplier/SupplierProductImportPage.tsx)
- 파서: [services/web-neture/src/lib/product-import/parser.ts](../../services/web-neture/src/lib/product-import/parser.ts) — `extractImages()` 가 이미 DOM 순서 추출 + `Set` dedup + `resolveUrl` 상대→절대 + `isIgnorableImage` 필터(logo/icon/pixel/gif/svg) 수행.
- 타입/드래프트: [services/web-neture/src/lib/product-import/types.ts](../../services/web-neture/src/lib/product-import/types.ts) — `ParsedProductData`, `ImportDraft`. 드래프트는 sessionStorage 단일 사용(`storage.ts`).
- **재사용**: 상대→절대(`resolveUrl`), 추적/아이콘 필터(`isIgnorableImage`) 를 그대로 재사용. 새 이미지 저장 시스템 미신설.
- **분리 유지**: 기존 "이미지" 그리드(썸네일 선택 + `ImportDraft.detailImageUrls`)는 **상품 저장 시 GCS 로 복사되는 product_images** 경로다. 본 작업의 "상세설명 이미지"는 **설명 HTML 본문(`consumerDetailDesc`)에 `<img>` 삽입**으로 별개 관심사 → 기존 그리드/`detailImageUrls` 무변경.

---

## 3. 상세 이미지 추출 기준 (parser.ts `extractDetailImageCandidates`)

확인 속성(우선순위): `data-src` → `data-original` → `data-lazy-src` → `data-lazy` → `src` → `srcset`/`data-srcset`(최댓 후보).

처리:
- 상대경로 → 절대 URL (`resolveUrl`, `//` 프로토콜 상대 포함)
- 동일 URL 중복 제거 + **대표 썸네일(parse 시 `thumbnailUrl`)과 동일 이미지 제거**
- `data:` 추적 이미지 제외, gif/svg/logo/icon/pixel/spacer 제외(`isIgnorableImage`)
- `width`/`height` 속성으로 확인 가능한 1×1(≤2px) 추적/스페이서 제외 — 그 외 불확실 이미지는 자동 제외하지 않고 사용자 판단에 위임
- 원본 페이지 DOM 순서 유지(`order` 1-based)
- 후보 상한 `DETAIL_IMAGE_CANDIDATE_LIMIT = 60` (분석 입력 HTML 자체는 2MB 제한)
- 크기 미확인 시 `width`/`height` = `null`

**비범위(V1)**: CSS background 이미지, JS 실행 후 생성되는 canvas 이미지.

---

## 4. 사용자 선택·확인 UX (SupplierProductImportPage.tsx)

- 신규 섹션 "상세설명 이미지 가져오기" — 썸네일 선택 영역 다음, 상세설명 편집기 바로 위.
- 카드: 선택 체크박스 / 미리보기 / 순서 배지(`order`) / 원본 크기(확인 가능 시) / 미리보기 실패 상태(개별 `onError` → 해당 카드만 실패 표시, 전체 비실패).
- 작업: 전체 선택 / 전체 해제 / 선택 이미지 편집기에 넣기.
- 이미지 없음: "상품 페이지에서 가져올 수 있는 상세설명 이미지를 찾지 못했습니다."
- **확인란**: 선택 ≥1 일 때 "선택한 이미지가 해당 상품의 상세설명 이미지임을 확인합니다." 노출.
- **삽입 버튼 활성 조건**: 선택 ≥1 AND 확인란 체크. (분석은 동기 클라이언트 처리 → "분석 진행 중" 상태 없음 → 항상 충족)
- 확인 전 자동 삽입 없음.

---

## 5. 편집기 삽입 방식 / 표준 폭 적용

- 편집기: `@o4o/content-editor` `RichTextEditor` (TipTap). **공용 패키지 무변경** — 기존 `value`/`onChange` 계약만 사용(Shared Module 변경 회피).
- 커서 삽입 API 미노출 → **기존 본문 하단 append**(WO §10.4 fallback): `setDetailDesc(prev => prev + html)`. 기존 본문 보존, 삽입 후 순서 변경·삭제·편집 가능.
- 삽입 후 선택/확인 상태 초기화 → 중복 삽입 방지.
- 삽입 HTML: `<p><img src="…" alt="상품명 상세설명 이미지 N" /></p>` (속성 `escapeHtmlAttr` 이스케이프).
- **표준 폭**: TipTap Image extension 이 inline `style` 은 제거하되 `.editor-image` 클래스(`max-width:100%; height:auto; display:block; margin:1em auto`)를 부여 → **클래스 기반 표준 반응형 폭**으로 일관 적용(WO §11 의 "임의 새 값 금지 / 허용 클래스·렌더러 CSS 이용" 경로). 데스크톱 표준 폭 이하·모바일 컨테이너 맞춤·비율 유지·가로 스크롤 없음.

---

## 6. 이미지 저장 / 외부 참조 정책

- 본 V1 의 상세설명 이미지는 **원본 페이지의 공개 URL 을 설명 HTML 에 참조**한다(별도 저장 helper 신규 미사용). 기존 썸네일/이미지 흐름과 정책 정합.
- signed/blob/세션 전용 URL 미저장. 새 GCS 버킷·수명 정책·정리 배치 미추가.
- ⚠ **외부 참조 지속성 의존**: 설명 본문 이미지는 원본 사이트가 hotlink 차단/삭제하면 깨질 수 있다. 영구 보존이 필요하면 후속 WO 에서 상품 저장 시 GCS 복사 경로(`detailImageUrls`/product_images)와 통합 고려.

---

## 7. SSRF / 보안 불변식

- 분석 단계는 **서버 fetch 없음**(클라이언트 HTML 붙여넣기) → 분석 SSRF 표면 부재.
- 삽입 HTML 은 `escapeHtmlAttr` + 편집기/백엔드 DOMPurify(`sanitize-description-html.util.ts`) 2중 sanitize 경유. script/SVG 실행 콘텐츠 삽입 없음(plain `<img>`).
- 미리보기/삽입 모두 plain `<img src>` 만 사용 — 외부 스크립트 실행 없음.
- 단일 이미지 미리보기 실패가 전체 분석을 실패시키지 않음(개별 `onError`).

---

## 8. 검증 결과

### 정적
- `web-neture` `tsc --noEmit`: **PASS (EXIT 0)**.
- 변경 패키지: 공용 content-editor 무변경 → 추가 패키지 typecheck 불필요.

### 파서 오프라인 smoke (jsdom, WO §17 API smoke 대체)
fixture(로고/상세/lazy/srcset/중복/썸네일동일/1×1픽셀/아이콘/svg 혼합) → 결과 **COUNT 4**:
- ✅ 일반 `img src` 추출
- ✅ 상대 URL 절대화 (`/detail/01.jpg` → `https://shop.example.com/detail/01.jpg`)
- ✅ `//` 프로토콜 상대 처리
- ✅ lazy-load 추출 (`data-src`, `data-lazy-src`)
- ✅ `srcset` 최댓 후보 (`04-960.jpg`)
- ✅ 중복 URL 제거
- ✅ 대표 썸네일 중복 제거
- ✅ 작은 아이콘·추적(1×1)·logo·svg 제외
- ✅ 원본 순서(`order`) 유지

### 브라우저 smoke (배포 후 라이브 — `neture.co.kr`, 공급자 계정) — **PASS**
- 배포: `deploy-web-services.yml` run `28306748960` → `deploy-neture` 성공(2m12s), 타 서비스 정상 skip. 커밋 `71491e37e` 라이브 반영.
- 검증 방식: Playwright(headless chromium), 자격증명은 gitignored SSOT(`docs/local/TEST-ACCOUNTS.local.md`)에서 런타임 주입(하드코딩/로그 노출 없음). fixture HTML(상세 본문 텍스트 + 갤러리 이미지: 정상 2 + lazy `data-src` 1 + `width/height` 1 + 썸네일중복 1 + URL중복 1 + logo 1 + 1×1 픽셀 1).

| # | 항목 | 결과 |
|---|------|------|
| 1 | 가져오기 도우미 진입 (로그인→공급자) | ✅ `/supplier/products/import-assistant` |
| 2 | HTML 붙여넣기 → 분석 | ✅ |
| 3 | 기존 썸네일/이미지 후보 영역 정상 표시 | ✅ "등록할 이미지를 직접 선택하세요" 유지 |
| 4 | 상세설명 이미지 섹션 표시 | ✅ |
| 5 | 후보 추출/순서/제외 | ✅ 후보 order 배지 `[1,2,3]` (정상 2 + lazy + width 만; 썸네일중복·URL중복·logo·1×1 제외) |
| 6 | 개별 선택 / 전체 선택 / 전체 해제 | ✅ (선택 1개 시 확인란 노출, 전체 해제 시 확인란 숨김) |
| 7 | 확인란 미체크 시 삽입 버튼 비활성 | ✅ 초기 disabled / 선택만 disabled / 확인 후 enabled |
| 8 | 확인 후 선택 이미지 삽입 | ✅ 삽입 후 3장 |
| 9 | 원본 페이지 순서 유지 | ✅ 삽입 순서 `[d1,d2,d3]` (본문 하단 append) |
| 10 | 기존 편집기 본문 보존 | ✅ 삽입 전 본문 텍스트 존재 → 삽입 후에도 보존(이미지는 하단 추가) |
| 11 | 표준 폭 / 모바일 반응형 | ✅ `class=editor-image`, computed `max-width:100%; display:block`; 데스크톱 렌더 780px / 375px 뷰포트 227px, 가로 스크롤 없음(`docScrollW<=winW`) |
| 12 | 콘솔 주요 오류 없음 | ✅ console error 0 / pageerror 0 / neture 4xx-5xx 0 |
| 13 | smoke 상품·임시 데이터 정리 | ✅ **불필요 — 핵심 흐름 검증에 실제 상품 미생성(저장/등록 미실행). 생성된 임시 row 없음** |

> 참고(보정 1회): 최초 fixture 의 본문 텍스트가 파서의 detail-selector 200자 임계 직하라서 본문이 갤러리 div(이미지) 로 폴백 → 본문 보존 항목이 모호했음. 본문 텍스트를 충분히 늘린 2차 run 에서 IMGS_BEFORE=0 / BODY_TEXT_BEFORE=true / IMGS_AFTER=3 / INSERTED_ORDER=[d1,d2,d3] / BODY_TEXT_PRESERVED=true 로 명확 PASS. 제품 동작 자체는 두 run 모두 동일(삽입분은 항상 원본 순서로 본문 하단 추가).

---

## 9. 변경 파일

- `services/web-neture/src/lib/product-import/types.ts` — `DetailImageCandidate` + `ParsedProductData.detailImageCandidates` (additive)
- `services/web-neture/src/lib/product-import/parser.ts` — `extractDetailImageCandidates` + lazy/srcset helper
- `services/web-neture/src/pages/supplier/SupplierProductImportPage.tsx` — 신규 섹션/상태/삽입 핸들러 + `escapeHtmlAttr`

---

## 10. 비범위 / 후속 후보

- 비범위: CSS background·canvas 이미지, 카메라/업로드, OCR/AI 분류/번역/재디자인, 모바일 앱, 인증 우회, 신규 저장 인프라, DB migration.
- 후속 후보:
  - 외부 참조 → 상품 저장 시 GCS 영구 복사 통합(지속성 보강).
  - 편집기 커서 위치 삽입(현재 하단 append) — content-editor 에 imperative insert API 노출 시.
  - 대표 썸네일을 사용자가 ★ 로 변경한 경우의 동적 dedup(현재 parse 시점 thumbnail 기준).
