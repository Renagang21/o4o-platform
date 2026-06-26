# CHECK-O4O-KPA-OPERATOR-DOCS-CONTENT-CREATION-GUIDE-MODAL-V1

> WO: **WO-O4O-KPA-OPERATOR-DOCS-CONTENT-CREATION-GUIDE-MODAL-V1**
> 작업일: 2026-06-26 · 상태: **COMPLETE (operator 라이브 smoke PASS)** · 커밋: `b708eceb4`
> 선행: WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1 (store 모달)

## 작업 배경

`/operator/docs`(운영자 콘텐츠 허브, OperatorContentHubPage)에도 매장 자료함과 같은 **콘텐츠 제작 가이드 버튼 + 반응형 모달**을 추가한다. 운영자 콘텐츠는 여러 매장이 가져가 편집·활용하는 **공유 원본**이라는 관점으로 안내한다. 안내 UI 전용 — 저장 구조/상태 전환/QR·PDF·POP·블로그 로직 무변경.

## 변경 파일

- `services/web-kpa-society/src/pages/pharmacy/ContentCreationGuideModal.tsx` — `mode: 'store' | 'operator'` prop으로 **공통화**(콘텐츠 맵 기반). store 텍스트는 기존 유지, operator 텍스트 추가.
- `services/web-kpa-society/src/pages/operator/OperatorContentHubPage.tsx` — 헤더에 보조(outline) '콘텐츠 제작 가이드' 버튼 + 모달(mode="operator") 연결.

## 공통화 결과 (§7)

ContentCreationGuideModal 단일 컴포넌트로 공통화. `CONTENT: Record<GuideMode, GuideContent>` 맵에서 mode별 subtitle/flow/extraSections/imageParas/prompt/footer 선택. CSS·반응형·복사 버튼·ESC/배경닫기 로직은 공유.

| mode | 안내 초점 |
|------|----------|
| store (기본) | 내 매장에서 편집해 QR·PDF·POP·블로그 제작 활용 |
| operator | 여러 매장이 가져가 활용할 운영자 원본 제작 |

## 버튼 위치

OperatorContentHubPage 헤더 우측 액션 영역(새로고침 ↔ 콘텐츠 등록 사이), outline 스타일(border-blue, text-blue) — 주요 CTA('콘텐츠 등록')보다 약하게.

## 모달 구성 (operator 모드)

- 부제: "AI 도구로 만든 글을 O4O 운영자 콘텐츠로 정리하고, 매장에서 다시 활용할 수 있게 만들 수 있습니다."
- 제작 흐름 4단계(정리 → 재활용 구조 → 디자인 입힌 HTML 요청 → 붙여넣기/미리보기)
- **운영자 콘텐츠 작성 기준**(매장 공유 원본 — 매장 고유정보 지양, 상담/행사 문구 여지)
- 이미지 사용 안내(매장 재활용·다국어 관점, 글자 없는 이미지 권장)
- AI 요청 예시(공유 원본 + 내용에 디자인 입힌 HTML + inline style, script/iframe/외부리소스 금지) + 요청문 복사
- 하단: "완성된 운영자 콘텐츠는 매장 자료함에서 가져가 편집한 뒤 QR, PDF, POP, 블로그 제작에 활용"
- 체크리스트·사이니지 미포함.

## 운영자용 문구 / 이미지 안내 / 요청문 복사

- "내용에 디자인을 입힌 HTML" 문구 반영 ✅
- 이미지 안내 포함 ✅ (4개 문단, 매장 재활용/다국어 관점)
- 요청문 복사 버튼 구현 ✅ (navigator.clipboard.writeText, best-effort)

## 반응형

store 모달과 동일 CSS(`.ccg-*`, `<style>` 1회 주입). `width: min(720px, calc(100vw-32px))`, `@media (max-width:640px)` → `calc(100vw-24px)` + actions 세로/full-width, 예시 박스 `pre-wrap/overflow-wrap`. (store 모드에서 768/390 반응형 smoke 이미 PASS — 동일 컴포넌트/CSS.)

## typecheck

- `services/web-kpa-society`: `tsc --noEmit` PASS

## 빌드/배포

- Web 배포(Cloud Run) success (커밋 b708eceb4 포함 HEAD).

## 브라우저 smoke (kpa-society.co.kr, KPA operator = sohae2100@gmail.com)

> 회원이 점유 중이던 브라우저를 닫아 프로필이 해제된 뒤 operator 라이브 smoke 완료.

| Case | 내용 | 결과 |
|------|------|------|
| 1 | operator 로그인 → `/operator/docs` 접근(콘텐츠 허브), 헤더 '콘텐츠 제작 가이드' 버튼 + '콘텐츠 등록' 노출 | ✅ |
| 2 | 가이드 버튼 클릭 → 모달 열림 | ✅ |
| 3 | 모달 내용 = **operator 모드**: 부제(운영자 콘텐츠로 정리), 4단계 흐름(매장 재활용 구조 + 미리보기), **운영자 콘텐츠 작성 기준**, 이미지 안내, AI 요청 예시(여러 매장이 가져가서 + 디자인 입힌 HTML) | ✅ |
| 4 | 사이니지 문구 없음 / 체크리스트 없음 | ✅ |
| 5 | 요청문 복사 버튼 존재 | ✅ |
| 6 | 반응형 390: 모달 343px·뷰포트 내·본문 내부 스크롤·예시 박스 가로넘침 없음·배경 가로스크롤 없음 (768/store는 선행 WO에서 PASS, 동일 컴포넌트/CSS) | ✅ |
| 7 | 회귀: /operator/docs 콘텐츠 허브 목록/등록 버튼 정상 | ✅ |

## 회귀

- OperatorContentHubPage 목록/검색/필터/등록·수정 모달 로직 무변경(헤더 버튼 + 모달 추가만). store 가이드 모달 호출부(mode 미지정→'store' 기본) 무영향.

## 후속

- GP/K-Cosmetics operator docs parity는 별도(공통 모달이라 mode 재사용 가능).
