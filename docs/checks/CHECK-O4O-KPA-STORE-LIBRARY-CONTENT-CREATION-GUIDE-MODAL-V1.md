# CHECK-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1

> WO: **WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1** (+반응형 보완 / 문구 변경)
> 작업일: 2026-06-26 · 상태: **COMPLETE (smoke PASS)** · 커밋: `00e661e39`(feat) + `611702085`(문구 변경)

## 작업 배경

`/store/library/contents` 상단 안내문이 길고, 사이니지가 콘텐츠 활용처로 섞여 있었다. 안내문을 짧게 정리하고, AI 도구로 콘텐츠를 만드는 방법을 안내하는 **콘텐츠 제작 가이드 모달**(반응형)을 추가한다. 안내 UI 전용 — 콘텐츠 저장/QR/PDF/편집기 로직 무변경.

## 변경 문구

- 상단 안내문(useBanner): 기존 긴 문장 → **"콘텐츠를 편집하고 QR · PDF · POP · 블로그 제작에 활용하세요."** (사이니지 제거)
- 퀵액션 칩: POP/QR/블로그 유지, **'사이니지에 추가' 제거**(사이니지는 전용 메뉴 보유 → 자료함 활용처에서 제외, 기능 은폐 아님)
- 모달 step 2 / AI 요청 예시: 사용자 요청으로 **"안전한 HTML" → "내용에 디자인을 입힌 HTML"** 로 변경(색상·배경·여백·카드를 인라인 style 로 적용 요청; script/iframe/외부 리소스는 계속 금지). HTML탭 raw 보존 + PDF print-color-adjust 로 인라인 디자인이 유지되므로 디자인 적용 권장.

## 모달 구성 (`ContentCreationGuideModal.tsx` 신규)

- 제목 "콘텐츠 제작 가이드" + 부제(AI 도구 활용)
- 3블록: ① 기본 제작 흐름(3단계) ② 이미지를 사용할 때 ③ AI에게 요청할 문장 예시(요청문 복사 버튼)
- 하단 안내 + 확인 버튼. 체크리스트·사이니지 없음.
- ESC / 배경 클릭 닫기.

## 이미지 안내 포함 여부

✅ 포함 — 로컬 파일 경로 주의 / 안정적 이미지 URL 사용 / 다국어 위해 글자는 편집기 입력 권장.

## 요청문 복사 버튼 구현 여부

✅ 구현 — `navigator.clipboard.writeText` (best-effort, 실패 시 catch). 클릭 시 "복사됨" 상태(2초). 클립보드 권한은 환경 의존.

## 반응형 (자체 `<style>` + 미디어쿼리)

- `.ccg-modal { width: min(720px, calc(100vw - 32px)); max-height: calc(100vh - 48px); }`, 본문 `.ccg-body overflow-y:auto`
- `@media (max-width:640px)`: width `calc(100vw - 24px)`, max-height `calc(100vh - 24px)`, actions 세로/full-width
- AI 예시 박스 `.ccg-prompt`: `white-space:pre-wrap; word-break:keep-all; overflow-wrap:anywhere`

## 변경 파일

- `services/web-kpa-society/src/pages/pharmacy/ContentCreationGuideModal.tsx` (신규)
- `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx` (안내문/퀵액션/버튼/모달 연결)

## typecheck

- `services/web-kpa-society`: `tsc --noEmit` PASS

## 브라우저 smoke (kpa-society.co.kr, 테스트 약국 매장)

| Case | 내용 | 결과 |
|------|------|------|
| 1 | 새 안내문 표시 + 기존 긴 문구 제거 + 사이니지 문구 없음 | ✅ |
| 2 | '콘텐츠 제작 가이드' 버튼 노출, 퀵칩=POP/QR/블로그(사이니지 칩 제거) | ✅ |
| 3 | 가이드 모달 열림(데스크탑 width 720, 뷰포트 미초과) | ✅ |
| 4 | 모달 섹션(제작 흐름/이미지 안내/AI 예시) + 사이니지·체크리스트 없음 | ✅ |
| 5 | 요청문 복사 버튼 존재 + 변경 문구("디자인을 입힌 HTML"/인라인 CSS, 기존 "안전한 HTML" 제거) | ✅ |
| 6 | 회귀: 콘텐츠 목록 로딩/편집 버튼/PDF·QR·블로그 동선 유지 | ✅ |
| 7 | 반응형 — 768: 모달 720px·뷰포트 내·가로스크롤 없음 / 390: 343px·뷰포트 내·본문 내부 스크롤·예시 박스 가로넘침 없음·닫기/확인 노출·배경 가로스크롤 없음 | ✅ |

## 회귀 확인 결과

- 콘텐츠 목록·편집(direct/execution/snapshot)·인쇄용 PDF·QR-code 만들기·블로그 글쓰기 동선 무영향(안내 UI만 추가/문구 변경).

## 주의 / 후속

- 사이니지는 콘텐츠 자료함 활용처로 표시하지 않음(전용 '디지털 사이니지' 메뉴 유지).
- 복사 버튼 클립보드 write 는 브라우저 권한 환경 의존(best-effort).
- 밀도/가이드 기본값 등 사용자 기억은 별도(선택).
