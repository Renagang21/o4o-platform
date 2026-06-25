# CHECK-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1

> WO: `WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1`
> 화면: `/store/library/contents` (KPA Society 매장)
> 작업일: 2026-06-26 / 범위: KPA (web-kpa-society)

---

## 1. 변경 요약

매장 콘텐츠 자료실(`/store/library/contents`)에서 **콘텐츠 1개 선택 → 선택 작업 영역 [인쇄용 PDF 만들기]**
→ 포함 항목 옵션 모달 → A4 세로 인쇄용 새 창(브라우저 인쇄 = "PDF로 저장") 흐름을 추가했다.

- **개별 행 우측 액션에 버튼을 추가하지 않음** — 기존 체크 선택 작업 영역(`ActionBar`)에 액션만 추가(WO §4.1).
- **단일 콘텐츠만 지원(1차)** — 1개 선택 시에만 활성, 2개+ 비활성 + 안내(WO §4.2).
- **본문 필수 / 약국명·전화·주소·상담문구·출력일 선택 체크** — 약국 정보는 매장 기본정보에서 자동 취득.
- **QR 코드는 1차 비활성 + 안내**(자동 QR 생성 금지, WO §8).
- **DB 저장 없음 / 원본 무변경 / 결과물 목록 비노출** — 새 창에 조판 HTML 작성 후 `window.print()`.

생성 방식은 사용자 결정: **브라우저 인쇄(window.print)** + **QR 1차 비활성+안내**.

---

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/ContentPdfExportModal.tsx` | (신규) PDF 옵션 모달 + origin별 본문 HTML 취득 + A4 조판 + 새 창 인쇄 |
| `services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx` | `enablePdfExport` opt-in prop. DocumentsSection 선택 작업 영역에 `인쇄용 PDF 만들기` 액션(1개 선택 시만 활성) + 복수 선택 안내 + 모달 mount |
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx` | `StoreContentsSelector` 에 `enablePdfExport` 전달 |

신규 API / migration / DB 변경 **없음**. 기존 조회 함수만 재사용.

---

## 3. 본문 HTML 취득 (origin 별)

`/store/library/contents` 문서형 row 의 origin 3종에 따라 기존 함수로 본문을 가져온다.

| origin | 함수 | 본문 필드 |
|---|---|---|
| `execution-asset` | `getStoreExecutionAsset(id)` | `data.htmlContent` (HTML) |
| `direct` | `directContentApi.get(id)` | `data.contentJson` → blocks/body 해석 |
| `snapshot` | `publishedAssetsApi.get(orgId, id)` | `data.contentJson` → blocks/body 해석 |

- `orgId` 는 `getPharmacyInfo().organizationId` 에서 취득(snapshot 조회용).
- contentJson 해석은 PrintContentPage 의 parseBlocks 와 동일(blocks[] → text/image/link, 없으면 body/content HTML).

---

## 4. 옵션 모달 정책 (WO §6)

| 항목 | 기본값 | 해제 | 비고 |
|---|---|---|---|
| 본문 | 체크 | 불가 | 필수 |
| 제목 | 체크 | 가능 | 콘텐츠 제목 |
| 약국명 | 미체크 | 가능 | `pharmacyInfo.name` 없으면 비활성("등록된 매장명 없음") |
| 약국 전화번호 | 미체크 | 가능 | `pharmacyInfo.phone` 없으면 비활성("등록된 전화번호 없음") |
| 약국 주소 | 미체크 | 가능 | `pharmacyInfo.address`/addressDetail 없으면 비활성("등록된 주소 없음") |
| QR 코드 | 미체크 | — | **비활성**("QR 코드 생성 후 PDF에 포함할 수 있습니다.") |
| 상담 안내 문구 | 미체크 | 가능 | 1차 고정 문구 "궁금한 점은 약사에게 문의하세요." |
| 출력일 | 미체크 | 가능 | `new Date().toLocaleDateString('ko-KR')` |

약국 정보는 사용자가 입력하지 않고 매장 기본정보(`GET /pharmacy/info`)에서 가져온다(WO §7).

---

## 5. A4 인쇄 레이아웃 (WO §10)

```
상단: 제목(선택) — h1 + 하단 구분선
본문: 콘텐츠 HTML 렌더(인쇄용 최소 스타일)
하단(footer): 약국명 / 전화·주소 / 상담문구 / 출력일 (각 선택)
```

`@page { size: A4 portrait; margin: 18mm 16mm }`. 새 창 로드 후 `window.print()` 자동 호출 + 상단 "인쇄 / PDF로 저장" 버튼(인쇄 시 숨김).

---

## 6. 영향 범위 / 회귀 안전성

- `StoreContentsSelector` 는 **2개 화면 공유**: `StoreLibraryContentsPage`(mode='page') / `SelectContentsForProductionModal`(mode='modal').
- PDF 기능은 **`enablePdfExport` opt-in + `mode === 'page'` 이중 게이트** → production-materials 선택 모달(mode='modal', opt-in 미전달)에 영향 0.
- 강의(LessonsSection) 탭에는 추가 안 함(콘텐츠 전용).
- KPA 전용 web 서비스 내부 컴포넌트 → GlycoPharm / K-Cosmetics 무관.
- 기존 액션(`제작 시작` / `선택 삭제`) 동작 불변.

---

## 7. 검증 결과

| 항목 | 결과 |
|---|---|
| web-kpa-society `tsc --noEmit` | ✅ PASS (error 0) |
| 콘텐츠 0개 선택 — PDF 버튼 비활성 | ⏳ 배포 후 smoke |
| 콘텐츠 1개 선택 — PDF 버튼 활성 + 모달 | ⏳ |
| 콘텐츠 2개+ 선택 — 비활성 + 안내 | ⏳ |
| 옵션별 PDF 반영(제목/약국명/전화/주소/상담/출력일) | ⏳ |
| 본문 필수·해제 불가 | ⏳ |
| QR 비활성 + 안내 | ⏳ |
| A4 세로 / 브라우저 인쇄 | ⏳ |
| 원본 무변경 / 목록 비노출 / DB 미저장 | ⏳ (구조상 보장 — 조회 전용) |
| production-materials 선택 모달 무영향 | ⏳ |

---

## 8. 1차 제외 / 후속 (WO §14·15)

- 제외: 복수 콘텐츠 묶음 PDF / 생성 이력 저장 / 결과물 관리 화면 / POP 템플릿 / 복수 용지 / QR 자동 생성 / 로고 / 상담문구 직접 편집 / 다국어 PDF.
- 후속: 기존 QR 매칭하여 PDF 포함 / 약국 정보 선택값 기억 / 상담문구 편집 / 복수 콘텐츠 PDF.

### 관찰

- 본문은 콘텐츠 HTML 을 새 창에 그대로 주입(RichText 서식 보존 목적). 콘텐츠는 매장/운영자 저작 신뢰 자산이라 1차 수용. 강한 격리가 필요하면 후속에서 sanitize 또는 ContentRenderer 기반 인쇄 페이지로 전환 검토.
