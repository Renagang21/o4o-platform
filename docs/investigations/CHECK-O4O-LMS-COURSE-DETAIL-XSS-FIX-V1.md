# CHECK-O4O-LMS-COURSE-DETAIL-XSS-FIX-V1

> **작업명:** WO-O4O-LMS-COURSE-DETAIL-XSS-FIX-V1
> **유형:** 보안 긴급 수정 — raw HTML 주입 sanitize. 최소 범위(파일 1개). 신규 dependency **0**.
> **결과: PASS — GP LMS `CourseDetailPage` lesson content `dangerouslySetInnerHTML` 에 `sanitizeHtml`(DOMPurify) 적용. 미-sanitize raw HTML 잔여 0(education). web-glycopharm typecheck 0.**
> 발견: `IR-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1 §7`(범위 밖 CRITICAL) — 2026-06-16

---

## 1. 문제 위치

`services/web-glycopharm/src/pages/education/CourseDetailPage.tsx`
- `69` `const raw = lesson.content` → `84` `typeof raw === 'string'` 분기 → `88` `dangerouslySetInnerHTML={{ __html: raw }}` **(sanitize 없음)**.
- raw=lesson content(강사/admin 입력) → 수강생 브라우저 **XSS 실행 가능**.
- (doc-object 분기는 text 변환이라 안전 — string 분기만 위험.)

## 2. 수정 파일 (2)

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/pages/education/CourseDetailPage.tsx` | import `sanitizeHtml` (`@o4o/content-editor`) + `__html: raw` → `__html: sanitizeHtml(raw \|\| '')` |
| `docs/investigations/CHECK-O4O-LMS-COURSE-DETAIL-XSS-FIX-V1.md` | 본 CHECK |

```tsx
// before
dangerouslySetInnerHTML={{ __html: raw }}
// after
dangerouslySetInnerHTML={{ __html: sanitizeHtml(raw || '') }}
```

## 3. sanitize 적용 방식

- **기존 공통 sanitizer 재사용:** `import { sanitizeHtml } from '@o4o/content-editor'` (DOMPurify 기반, `packages/content-editor/src/sanitize.ts`). web-glycopharm 이 이미 `@o4o/content-editor` 소비(ContentRenderer/RichTextEditor) → **신규 dependency 0**, import 정상.
- DOMPurify 기본 정책 → script/event handler(on*)/javascript: URL/위험 태그 제거, 서식(p/strong/ul/li 등)은 유지.
- 동일 안전 패턴: 같은 디렉토리 `LmsLessonPage` 는 이미 `ContentRenderer`(sanitize 내장) 사용 — 본 수정으로 CourseDetailPage 도 안전 정렬.

## 4. dangerouslySetInnerHTML 잔여 확인

- `education/` 범위 grep 결과: `dangerouslySetInnerHTML` = **CourseDetailPage:90 한 곳뿐**, 이제 `sanitizeHtml` 적용됨 → **미-sanitize 잔여 0**.
- 동일 파일 내 다른 raw HTML 주입 **없음**.

## 5. 불변 / 범위 확인

- 신규 dependency **0**. LMS editor/backend/DB/migration/route **변경 0**. Course/Lesson 데이터 구조 **무변경**.
- 화면 구조/기능 **유지**(prose 클래스·렌더 위치 동일, 출력만 sanitize).
- 상품설명 축과 **미혼합** — 본 WO 는 LMS 보안 수정 단독.
- 전체 repo dangerouslySetInnerHTML 전수조사는 **미수행**(범위 밖 → §7 후속).

## 6. 검증

- **web-glycopharm typecheck PASS** (`tsc --noEmit -p tsconfig.json` → error 0).
- 정적: string 분기 raw → `sanitizeHtml` 경유 렌더, import 경로 정상, education 미-sanitize 잔여 0.
- **브라우저 확인(배포 후 권장):** GP 강의 상세 정상 렌더(서식 유지) + `<script>/onerror` 등 위험 HTML 미실행 + console error 0.

## 7. 완료 판정

**PASS.** CourseDetailPage raw HTML 주입 sanitize 적용, 동일 파일 내 잔여 0, 신규 dependency 없음, backend/DB 무변경, web-glycopharm typecheck 통과.

## 8. 후속 (선택)

1. `IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1` — 전체 frontend `dangerouslySetInnerHTML` 사용처 전수조사 + sanitize 분류(약한 regex sanitizer `store-local-product.routes.ts:36` 포함).
2. `WO-O4O-LMS-SAFE-HTML-RENDERING-COMMONIZATION-V1` — LMS lesson/course content 렌더를 ContentRenderer 단일화.

---

*Date: 2026-06-16 · GP LMS CourseDetailPage XSS 긴급 수정 · PASS · lesson content raw HTML → sanitizeHtml(@o4o/content-editor, DOMPurify) · education 미-sanitize 잔여 0 · 신규 dep 0, backend/DB 무변경, 상품설명 축 미혼합 · web-glycopharm typecheck 0 · 후속 전수조사 선택.*
