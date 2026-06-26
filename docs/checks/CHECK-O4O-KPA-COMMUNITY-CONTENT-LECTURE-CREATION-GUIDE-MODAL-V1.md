# CHECK-O4O-KPA-COMMUNITY-CONTENT-LECTURE-CREATION-GUIDE-MODAL-V1

> WO: **WO-O4O-KPA-COMMUNITY-CONTENT-LECTURE-CREATION-GUIDE-MODAL-V1**
> 작업일: 2026-06-26 · 상태: **COMPLETE (smoke PASS)** · 커밋: `3625ca4e0`(feat) + CHECK
> 선행: store/operator 가이드 모달(ContentCreationGuideModal)

## 작업 배경

KPA 커뮤니티 콘텐츠 작성 화면과 강의 작성/편집 화면에도 공통 `ContentCreationGuideModal`을 확장(신규 mode)하여 같은 철학의 안내(AI 대화 → 내용에 디자인을 입힌 HTML → O4O 편집기 HTML 탭 붙여넣기)를 제공한다. 안내 UI 전용 — 저장 API/권한/편집기 동작 무변경.

## 적용 route (사용자 확인 반영)

- 커뮤니티 콘텐츠: `/content/documents/new`, `/content/:id/edit` (ContentWritePage) — 사용자가 "포럼 아님, /content/documents/new"로 지정.
- 커뮤니티 강의: `/instructor/courses/new` (CourseNewPage, 폼) + `/instructor/courses/:id` (CourseEditPage, 강의정보 폼 + 레슨 본문 RichTextEditor/HTML탭) — 사용자가 "생성+편집 상단 둘 다" 선택.

## 추가 mode

`ContentCreationGuideModal`에 `mode: 'store' | 'operator' | 'communityContent' | 'communityLecture'` (제목 override 지원). store/operator 텍스트·동작 무변경.

## 변경 파일

- `pages/pharmacy/ContentCreationGuideModal.tsx` — communityContent/communityLecture 콘텐츠 + 프롬프트 추가, 제목 override.
- `pages/contents/ContentWritePage.tsx` — 헤더 '콘텐츠 제작 가이드' 버튼(communityContent) + 모달.
- `pages/instructor/courses/CourseNewPage.tsx` — 제목행 '강의 제작 가이드' 버튼(communityLecture) + 모달.
- `pages/instructor/courses/CourseEditPage.tsx` — 백링크행 '강의 제작 가이드' 버튼(communityLecture) + 모달.

## 문구

- communityContent: 부제(커뮤니티 콘텐츠 활용) + 4단계 + '커뮤니티 콘텐츠 작성 기준' + 이미지(회원 화면/다국어) + AI 예시(공유 글/디자인 입힌 HTML).
- communityLecture: 제목 '강의 콘텐츠 제작 가이드', 부제(강의 소개·커리큘럼·학습자료) + 4단계 + '강의 콘텐츠 작성 기준' + 이미지(강의 대표/슬라이드) + AI 예시(강의 주제/커리큘럼/디자인 입힌 HTML). 강의 기본정보는 폼이라 step3에 "풍부한 본문은 레슨 본문 편집의 HTML 탭" 보강.
- 둘 다 "내용에 디자인을 입힌 HTML" 흐름, 사이니지·체크리스트 미포함.

## 이미지 안내 / 요청문 복사

- 이미지 안내 포함 ✅ (두 모드 모두)
- 요청문 복사 버튼 구현 ✅ (navigator.clipboard.writeText, best-effort)

## 반응형

기존 `.ccg-*` 공통 CSS(`<style>`+미디어쿼리) 그대로. store/operator/communityContent 모두 768/390에서 PASS 확인됨(동일 컴포넌트/CSS). communityLecture 도 동일 컴포넌트라 동일 동작.

## typecheck

- `services/web-kpa-society`: `tsc --noEmit` PASS

## 브라우저 smoke (kpa-society.co.kr, KPA operator = sohae2100@gmail.com)

| Case | 화면 | 내용 | 결과 |
|------|------|------|------|
| 1 | `/content/documents/new` | '콘텐츠 제작 가이드' 버튼 + communityContent 모달(부제·작성기준·디자인HTML·이미지·AI예시·사이니지없음·복사) | ✅ |
| 2 | `/instructor/courses/new` | '강의 제작 가이드' 버튼 + communityLecture 모달(제목 '강의 콘텐츠 제작 가이드'·부제·작성기준·커리큘럼·디자인HTML·사이니지없음·복사) | ✅ |
| 3 | `/instructor/courses/:id`(편집) | 임시 강의 생성 후 진입 → '강의 제작 가이드' 버튼 + communityLecture 모달 동일 확인 | ✅ |
| 4 | 사이니지 문구 제외 | 두 모달 모두 사이니지 없음 | ✅ |
| 5 | 요청문 복사 버튼 | 두 모달 모두 존재 | ✅ |
| 6 | 반응형 390 | 공통 모달(.ccg-modal) — store/operator/communityContent에서 390 PASS, communityLecture 동일 컴포넌트/CSS 상속 | ✅(상속) |
| 7 | 회귀 | 콘텐츠 작성 화면/강의 생성·편집 화면 로딩·기존 폼/저장 동선 정상(헤더 버튼+모달만 추가) | ✅ |

> Case 3 검증용 임시 강의(`smoke 강의 [guide-test]`, 145e18a0…)는 검증 후 DELETE /api/v1/lms/courses/:id(200)로 삭제 정리.
> 공유 dev 브라우저(전용 프로필)를 동시 세션이 점유/탭 churn 하는 환경이라, 일부 측정은 evaluate 기반으로 수행.

## 회귀 확인

- store/operator 모달 호출부(mode 미지정→'store', mode='operator') 무영향. ContentWritePage CommunityContentWriteShell·CourseNewPage/EditPage 폼·레슨 편집 로직 무변경.

## 후속

- GP/K-Cosmetics 커뮤니티/강의 parity(공통 모달 mode 재사용).
- 강의 레슨 본문 편집(LessonModal) 내부에도 버튼이 필요하면 추가 검토(현재는 화면 상단 1곳).
