# CHECK-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1

> WO: **WO-O4O-KPA-CONTENT-PDF-PRINT-DENSITY-STYLES-V1**
> 작업일: 2026-06-26 · 상태: **COMPLETE (smoke PASS)** · 커밋: `f5f86b1ff`
> 선행: `WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1`

## 문제

`/store/library/contents` 인쇄용 PDF 가 화면(QR/태블릿)용 스타일을 그대로 써서 본문 글자·줄간격·여백이 과대 → A4 페이지 수 과도. 특히 본문 내 `h1/h2/h3` 에 대한 인쇄용 규칙이 없어 브라우저 기본(2em/1.5em…) 대형 제목이 페이지를 많이 차지.

## 정책

- 콘텐츠 원본 HTML **무변경**. PDF/인쇄 전용 스타일만 조정.
- 본문 **inline 디자인(배경/색/박스) 보존** — `print-color-adjust: exact` 유지. inline `font-size` 지정 요소는 그 값 우선.
- 화면(QR/태블릿/웹)용 스타일과 분리(PDF 생성 HTML 의 `<style>` 에만 적용).

## 변경 (`ContentPdfExportModal.tsx`, frontend 전용)

- **출력 형식(밀도) 선택 UI**: 표준형(기본) / 절약형 / 큰 글씨형 — 모달 상단 세그먼트.
- **밀도 프리셋**으로 `buildPrintHtml` CSS 파라미터화:

| 항목 | 표준형(기본) | 절약형 | 큰 글씨형 | (기존) |
|------|:---:|:---:|:---:|:---:|
| @page margin | 14mm | 11~12mm | 15mm | 18/16mm |
| 본문 | 11pt | 10pt | 13pt | 14px |
| line-height | 1.45 | 1.3 | 1.6 | 1.7 |
| h1/제목 | 19pt | 16pt | 22pt | 22px |
| h2 | 15pt | 13pt | 17pt | (없음) |
| h3 | 13pt | 12pt | 14pt | (없음) |
| 문단 여백 | 7px | 5px | 9px | 10px |
| 이미지 max-height | — | 95mm | — | — |

- 본문 `h1/h2/h3/p/ul/ol/li` 인쇄용 규칙 추가(기존엔 없어 브라우저 기본 대형 적용 → 페이지 수 주범 제거).
- 신규 API/migration 없음. 콘텐츠 원본·QR·태블릿·웹 스타일 무영향.

## 브라우저 smoke (kpa-society.co.kr, 테스트 약국 매장)

콘텐츠 1개 선택 → ActionBar [인쇄용 PDF 만들기] → 모달.

| Case | 내용 | 결과 |
|------|------|------|
| 1 | 모달에 **출력 형식**(표준형/절약형/큰 글씨형) 표시, 절약형 클릭 시 aria-pressed 전환 | ✅ |
| 2 | 밀도별 생성 HTML CSS 분기 | ✅ 표준형 14mm/11pt/h1 19pt/h2 15pt/lh1.45 · 절약형 11~12mm/10pt/16pt/13pt/lh1.3/이미지95mm · 큰글씨 15mm/13pt/22pt/17pt/lh1.6 |
| 3 | 동일 콘텐츠 720px 고정폭 렌더 높이(페이지 수 대리지표) | ✅ 표준 1273px → **절약 1089px(0.855×)** → 큰글씨 1588px(1.247×) — 단조 감소/증가 |
| 4 | 콘텐츠 원본 HTML 무변경(모달은 print HTML 생성만, 저장 API 호출 없음) | ✅ |

> window.print 자동 인쇄가 Playwright 를 막으므로 `window.open` 을 가로채 생성 HTML 을 캡처하고, 자동 print 스크립트 제거 후 iframe 에서 높이 측정. 짧은 콘텐츠라 비율이 작지만, 제목/여백이 많은 긴 콘텐츠일수록 절감 폭이 커진다. 새 표준형 자체가 기존 기본값(lh1.7·여백18mm·제목 미제어)보다 촘촘.

## 정적 검증

- `services/web-kpa-society`: `tsc --noEmit` PASS

## 완료 기준 대비

- PDF 기본(표준형) 밀도가 기존보다 축소(페이지 수 감소 방향) ✅
- 밀도 옵션(절약형/큰 글씨형) 추가 ✅
- 콘텐츠 원본 HTML 무변경 ✅
- 화면/QR/태블릿 스타일 회귀 없음(PDF 생성 HTML 한정) ✅
- 브라우저 smoke PASS ✅

## 후속(선택)

- 상담문구 직접 편집 / QR 포함(선행 WO §8-9, 2차).
- 밀도 기본값 사용자 기억(localStorage) — 현재 매 진입 표준형.
- 본문 inline 디자인 fidelity 는 공통 편집기 한계 승계([[ir-common-editor-inline-style-loss]]).
