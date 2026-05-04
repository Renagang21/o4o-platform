# O4O AI Content Automation V1

> **상위 문서**: [CLAUDE.md](../../CLAUDE.md)
> **버전**: V1
> **작성일**: 2026-05-04
> **상태**: Active — V1/V2/V3 implemented (KPA-Society)
> **WO 시리즈**:
> - `WO-O4O-RICHTEXT-AI-URL-IMPORT-V1` (initial AI 정리 기반)
> - `WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1` (매장 활용 분리)
> - `WO-O4O-LMS-LESSON-AI-ASSIST-V1` (V1 — 단일 레슨 초안)
> - `WO-O4O-LMS-COURSE-STRUCTURE-AI-V2` (V2 — 강의 구조 5~8개 후보)
> - `WO-O4O-LMS-LESSON-BODY-AI-GENERATION-V3` (V3 — 구조 + 본문 HTML)
> - `WO-O4O-AI-CONTENT-AUTOMATION-DOC-AND-VERIFY-V1` (본 문서)

본 문서는 O4O 플랫폼의 AI 기반 콘텐츠/강의 제작 자동화 흐름을 단일 기준으로 정리한다. 콘텐츠 작성 / 단일 레슨 초안 / 강의 구조 후보 / 레슨 본문 생성의 4가지 흐름이 어떻게 구성되어 있는지, 어떤 API·컴포넌트가 사용되며 어디까지가 V1 범위이고 어디부터가 후속 작업인지 선을 긋는다.

**기준 서비스**: KPA-Society (`services/web-kpa-society`).
GlycoPharm / K-Cosmetics 는 본 문서 범위 외 — 동일 흐름을 적용하려면 별도 WO 필요.

---

## 1. 전체 흐름

### 1.1 콘텐츠 흐름

```
/content/documents/new
  ↓ (RichTextEditor preset='full')
[Toolbar 의 ✨ AI 정리 버튼]
  ↓
AiContentModal
  ├── 텍스트 모드: 사용자 입력 텍스트 → POST /api/ai/content
  └── URL 모드:   URL 입력 → POST /api/ai/url-to-blocks → blocksToHtml() → HTML
  ↓
[에디터에 삽입] 클릭 → editor.commands.setContent(html)
  ↓
RichTextEditor 에 반영 → 사용자 추가 편집 → 저장
```

### 1.2 강의 흐름 (3 단계)

```
/instructor/courses/:courseId  (CourseEditPage)

──────────────────────────────────────────────────
V1 — 단일 레슨 AI 초안 (WO-O4O-LMS-LESSON-AI-ASSIST-V1)
──────────────────────────────────────────────────

[새 레슨 추가] → LessonModal
  ↓
[AI로 레슨 초안 만들기]
  ↓
AiContentModal (editor=null, onInsert 콜백 모드)
  ↓ (URL 모드)
POST /api/ai/url-to-blocks → HTML
  ↓
onInsert({ html, title, sourceUrl }) — LessonModal.handleAiInsert
  ├── 제목 자동 채움 (AI title 우선, fallback HTML 첫 heading; 사용자 입력 보호)
  ├── YouTube source URL 감지 → videoUrl 자동 채움 + iframe embed 본문 상단 추가
  └── content state 갱신 → RichTextEditor value-prop sync

──────────────────────────────────────────────────
V2 — 강의 구조 (WO-O4O-LMS-COURSE-STRUCTURE-AI-V2)
──────────────────────────────────────────────────

[🧱 AI로 강의 구조 만들기] (레슨 목록 헤더)
  ↓
CourseStructureAiModal
  ├── [주제로] 탭 — topic 텍스트 입력
  └── [URL로] 탭 — URL 입력
  ↓
[✨ 강의 구조 생성] → POST /api/ai/course-structure
  ↓
5~8개의 { title, summary } 후보 → 체크리스트 (기본 모두 선택)

──────────────────────────────────────────────────
V3 — 본문 HTML 생성 (WO-O4O-LMS-LESSON-BODY-AI-GENERATION-V3)
──────────────────────────────────────────────────

[선택한 레슨 추가 (N)] 클릭
  ↓
모달 내부 — 순차 처리:
  for each picked:
    → POST /api/ai/lesson-body
    → 성공: html 사용
    → 실패: fallback HTML ("<h2>title</h2><p>summary</p>") 로 대체
    → 진행 메시지: "레슨 본문 초안 생성 중 (i / N)…"
  ↓
onConfirm(GeneratedLessonWithBody[]) — CourseEditPage.handleAddCourseStructureLessons
  ↓
for each: lmsInstructorApi.createLesson({
  type: 'article',
  title, description: summary, content: html, order: 순차
})
  ↓
모달 닫힘 + loadData()
```

---

## 2. API 목록

### 2.1 `POST /api/ai/content`

**용도**: 사용자 입력 텍스트를 outputType 별로 정리 (요약 / POP / 제목 추천 등).
**사용처**: AiContentModal 텍스트 모드.
**구현**: [apps/api-server/src/routes/ai-proxy.routes.ts:190](../../apps/api-server/src/routes/ai-proxy.routes.ts#L190)

| 입력 | 출력 |
|------|------|
| `{ input, outputType, options: { tone?, length? } }` | `{ success, html, title, summary }` |

`outputType` 값: `product_detail` / `summary` / `pop` / `title_suggest` (cf. ai-prompts module).

---

### 2.2 `POST /api/ai/url-to-blocks`

**용도**: URL의 본문 HTML을 fetch + sanitize 후 AI가 O4O 블록 JSON 배열로 변환. 프론트가 `blocksToHtml()`로 HTML 변환하여 에디터에 삽입.
**사용처**: AiContentModal URL 모드 (콘텐츠 흐름 + LMS V1 단일 레슨 초안).
**구현**: [apps/api-server/src/routes/ai-proxy.routes.ts:395](../../apps/api-server/src/routes/ai-proxy.routes.ts#L395)

| 입력 | 출력 |
|------|------|
| `{ url, contentType?: 'document'\|'explain', tone?: 'normal'\|'professional'\|'store', customInstruction? }` | `{ success, blocks: O4OBlock[], requestId }` |

블록 타입: `o4o/heading` / `o4o/paragraph` / `o4o/list` / `o4o/quote` / `o4o/image` / `o4o/youtube` / `o4o/group` / `o4o/columns`.

후처리 파이프라인 (`WO-O4O-AI-URL-CONTENT-QUALITY-V4`):
- HTML 노이즈 태그 제거 (nav/header/footer/aside/form 등)
- UI 노이즈 라인 패턴 제거 (로그인/회원가입/메뉴/구독 등)
- 품질 필터 (너무 짧음 / 메뉴형 토큰 연속 등)
- YouTube: embed 유지 + 텍스트 블록 최대 3개
- 일반: 최대 10개 블록

---

### 2.3 `POST /api/ai/course-structure`

**용도**: 주제 또는 URL로부터 강의의 레슨 구조(목차) 5~8개 생성.
**사용처**: CourseStructureAiModal 의 "강의 구조 생성" 버튼.
**구현**: [apps/api-server/src/routes/ai-proxy.routes.ts:741](../../apps/api-server/src/routes/ai-proxy.routes.ts#L741)

| 입력 | 출력 |
|------|------|
| `{ input, type: 'url' \| 'topic' }` | `{ success, lessons: [{ title, summary }], requestId }` |

검증:
- `type='url'` → URL 검증 + `fetchUrlText` (url-to-blocks 와 동일 헬퍼 재사용)
- `type='topic'` → 입력 텍스트를 그대로 사용
- 응답에서 5~8개 항목 강제, 3개 미만 시 500 반환

---

### 2.4 `POST /api/ai/lesson-body`

**용도**: 레슨 1개의 본문 HTML 초안 생성.
**사용처**: CourseStructureAiModal 의 V3 본문 생성 단계 (선택한 레슨 별 호출).
**구현**: [apps/api-server/src/routes/ai-proxy.routes.ts:917](../../apps/api-server/src/routes/ai-proxy.routes.ts#L917)

| 입력 | 출력 |
|------|------|
| `{ courseTitle?, lessonTitle, lessonSummary?, tone?, audience? }` | `{ success, html, requestId }` |

프롬프트 정책 (system):
- 한국어 / 약사·전문가 커뮤니티 톤
- 700~1200자 분량
- `<h2><h3><p><ul><li><ol><strong><em>` 만 사용
- 첫 줄은 `<h2>` 시작
- 필요 시 `<h3>실무 적용 포인트</h3> + <ul>` 1회 추가
- 금지: iframe / img / script / style / class / 인라인 스타일, 과장 표현, 의료·법률 확정 표현, 출처 미상 통계, 메타 설명

후처리 (서버 sanitize):
- codeblock wrapper 제거
- `<script>` / `<style>` / `<iframe>` 블록 제거
- `on*="..."` 이벤트 핸들러 속성 제거
- `class="..."` 속성 제거

`html.length < 80` 인 경우 500 반환 → 호출자가 fallback HTML 사용.

---

## 3. 프론트 구성

### 3.1 `AiContentModal` (`@o4o/content-editor`)

**역할**: 텍스트/URL 양쪽 모드를 가진 범용 AI 콘텐츠 변환 모달.
**파일**: [packages/content-editor/src/components/AiContentModal.tsx](../../packages/content-editor/src/components/AiContentModal.tsx)

Props:
```ts
{
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  // WO-O4O-LMS-LESSON-AI-ASSIST-V1 (V1)
  onInsert?: (data: { html: string; title: string; sourceUrl?: string }) => void;
}
```

동작:
- `editor` 가 있으면 → `editor.commands.setContent(html)` (Toolbar 호출 시)
- `onInsert` 가 있으면 → 콜백으로 `{ html, title, sourceUrl }` 전달 (LessonModal V1 호출 시)
- 두 prop 모두 있으면 둘 다 호출됨 (additive)

기존 사용처 (Toolbar) 는 `onInsert` 미전달 → backward-compatible.

---

### 3.2 `CourseStructureAiModal` (KPA 전용)

**역할**: 강의 구조 후보 생성 + 선택 + 본문 HTML 초안 생성을 한 모달에서 처리.
**파일**: [services/web-kpa-society/src/pages/instructor/courses/CourseStructureAiModal.tsx](../../services/web-kpa-society/src/pages/instructor/courses/CourseStructureAiModal.tsx)

Props:
```ts
{
  open: boolean;
  onClose: () => void;
  courseTitle?: string;        // V3: lesson-body 프롬프트 컨텍스트
  onConfirm: (selected: GeneratedLessonWithBody[]) => Promise<void>;
}
```

`GeneratedLessonWithBody`:
```ts
{
  title: string;
  summary: string;
  html: string;          // AI 생성 또는 fallback
  bodyFallback: boolean; // true 이면 본문 생성 실패 → fallback HTML
}
```

내부 흐름:
1. **입력 단계**: `topic` / `url` 탭 → `POST /api/ai/course-structure` → `{title, summary}[]` → 체크리스트 (기본 모두 체크)
2. **추가 단계** (handleAdd): 선택된 후보를 **순차** 호출
   - 각 항목: `POST /api/ai/lesson-body` 호출
   - 성공 → `html` 사용
   - 실패 → `buildFallbackBodyHtml(title, summary)` 로 대체 (HTML 엔티티 escape 적용)
   - 진행 메시지 동기 갱신 (`레슨 본문 초안 생성 중 (i / N)…`)
3. `onConfirm(withBody)` 호출 → CourseEditPage 가 `lmsInstructorApi.createLesson` 일괄 실행

---

### 3.3 `LessonModal` (CourseEditPage 내부)

**역할**: 단일 레슨 신규/편집 모달 — V1 AI 보조 진입점.
**파일**: [services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx](../../services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx)

V1 보조 영역:
```
[✨ AI 보조]                    [AI로 레슨 초안 만들기]
  유튜브 URL 또는 콘텐츠 URL로 제목 / 본문 / 영상 블록을 한 번에 생성합니다.
```

`handleAiInsert({ html, title, sourceUrl })` 처리:
- 제목: `extractTitleFromHtml(html)` 또는 AI title — 사용자가 이미 입력했으면 보호
- YouTube URL: `isYouTubeUrl()` → `videoUrl` 자동 채움 + `<iframe>` 본문 상단 추가 (HTML에 없을 때만)
- 본문: `setContent(finalContent)` — RichTextEditor 가 useEffect로 sync

---

### 3.4 `CourseEditPage` 연결 흐름

**파일**: [CourseEditPage.tsx](../../services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx)

진입점:
- 레슨 목록 헤더: `🧱 AI로 강의 구조 만들기` → `setStructureModalOpen(true)`
- 새 레슨 추가 모달 안: `AI로 레슨 초안 만들기` → `setAiOpen(true)`

핸들러:
- `handleAddCourseStructureLessons(selected: GeneratedLessonWithBody[])`:
  - `baseOrder = max(lessons.order) + 1`
  - 각 선택 항목 → `lmsInstructorApi.createLesson(courseId, { type: 'article', title, description: summary, content: html, order: baseOrder + i, duration: 0 })`
  - 완료 후 `loadData()` 로 목록 갱신

---

### 3.5 `RichTextEditor` 연동 방식

**파일**: [packages/content-editor/src/components/RichTextEditor.tsx](../../packages/content-editor/src/components/RichTextEditor.tsx)

핵심 동작:
- TipTap 기반, `value` prop 의 외부 변경을 useEffect 로 감지하여 `editor.commands.setContent(value)` 자동 호출 ([RichTextEditor.tsx:122-126](../../packages/content-editor/src/components/RichTextEditor.tsx#L122-L126))
- 따라서 LessonModal 처럼 `onInsert` 콜백으로 form state(`content`) 만 갱신해도 에디터 내용이 자동 반영됨
- Toolbar 의 AI 정리 버튼은 `editor.commands.setContent(html)` 직접 호출 — 두 경로 모두 안전

---

## 4. 데이터 흐름

```
사용자 입력 (URL / Topic / Editor 텍스트)
    │
    ▼
프론트 모달 (AiContentModal / CourseStructureAiModal)
    │ fetch credentials: 'include'
    ▼
POST /api/ai/{content | url-to-blocks | course-structure | lesson-body}
    │ authenticate middleware (cookie 기반)
    ▼
aiProxyService.generateContent | generateRawContent (서버사이드 LLM 키)
    │ Gemini 2.5 Flash
    ▼
응답 파싱 / sanitize / 후처리
    │
    ▼
HTML 또는 lessons[] 또는 blocks[]
    │
    ▼ (LMS V3 only)
CourseStructureAiModal 본문 생성 루프 (순차)
    │
    ▼
onConfirm(withBody) — CourseEditPage
    │
    ▼
lmsInstructorApi.createLesson(courseId, payload) — 항목별 순차
    │
    ▼
백엔드 LMS 모듈 — 기존 자동 체인 (변경 없음):
  enrollment.completedLessonIds[] 누적은 학습 단계에서 발생
  강의 게시 / 수료 / Credit 등은 별도 흐름
```

---

## 5. 제한 사항

### 5.1 기능 범위 (의도된 제외)

| 항목 | 상태 |
|------|------|
| YouTube 영상 자동 연결 (강의 구조 후 레슨별) | ❌ 미지원 |
| 레슨별 URL 자동 매칭 | ❌ 미지원 |
| 퀴즈 자동 생성 | ❌ 미지원 |
| 과제 자동 생성 | ❌ 미지원 |
| 기존 레슨 본문 재생성 | ❌ 미지원 (신규 추가만) |
| 강의 publish 상태 자동 변경 | ❌ 미지원 |
| 매장 활용 (StoreUseModal / `/api/ai/content-to-store-use`) | ⏸ 코드 유지, UI 비활성 (`WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1`) |

### 5.2 기술 제약

- **순차 호출만**: V3 lesson-body 는 병렬 호출하지 않음 (rate-limit + 진행 UX 우려). 5개 선택 시 5회 순차 = 모델 응답 시간 × 5
- **자동 저장 금지**: AI 응답은 사용자가 명시적으로 [선택한 레슨 추가] / [에디터에 삽입] 클릭 시점에만 저장됨. 모달 닫기 / 취소 시 데이터 폐기
- **단일 출처(KPA)**: 본 흐름은 KPA-Society 에만 적용. GlycoPharm/K-Cosmetics 의 `LmsLessonPage` 는 별도 — 본 WO 범위 외
- **인증**: 모든 `/api/ai/*` 엔드포인트는 `authenticate` 미들웨어 적용 (쿠키 기반, frontend 는 `credentials: 'include'`)

---

## 6. Known Issues

### 6.1 lesson-body 생성 속도

- **현상**: V3 에서 5개 선택 시 lesson-body API 가 순차 호출됨 → 모델 응답이 항목당 3~8초로 걸리면 합산 15~40초
- **영향**: 사용자가 진행 메시지를 보며 대기. 큰 모달이 화면을 차지하므로 다른 작업 불가
- **완화책 (현재)**: 진행 메시지 갱신, 취소 버튼은 비활성 (도중 취소 미지원)
- **미해결**: 백그라운드 큐 / 부분 결과 사전 저장 / 병렬 + 토큰 throttle 등은 후속 검토

### 6.2 긴 콘텐츠의 품질 편차

- **현상**: AI 가 700~1200자 가이드라인을 따르지 못해 너무 짧거나 너무 긴 응답을 반환할 수 있음
- **영향**: 짧은 응답은 백엔드 길이 검증(< 80자)에서 500 반환 → fallback. 너무 긴 응답은 그대로 저장됨 (사용자가 수정 가능)
- **완화책**: 프롬프트의 분량 가이드 + 80자 미만 거부 + 강의 작가 지침 (과장 금지 / 의료·법률 확정 표현 금지). `temperature: 0.6` 으로 보수적

### 6.3 일부 사이트 HTML 노이즈

- **현상**: SPA / JavaScript 렌더링 사이트 / 봇 차단 사이트는 `fetchUrlText` 가 의미있는 본문을 추출하지 못함
- **영향**: `urlText.length < 50` 검증으로 422 반환 — 사용자에게 "URL 에서 충분한 텍스트를 추출할 수 없습니다" 메시지
- **완화책**: 후처리 파이프라인의 노이즈 라인 필터, `User-Agent: O4O-AI-Bot/1.0` (일부 차단), 15s timeout. SPA 대응(headless browser 등)은 후속 작업

### 6.4 Backend lesson-body sanitize 의 작은 누락

- **현상**: 정규식 기반 간단 sanitizer 가 작은 가장자리 케이스를 놓칠 수 있음
  - `on\w+="..."` 만 매치 — 작은따옴표 (`onclick='...'`) 미커버
  - `style` 속성 미스트립 (프롬프트에서는 금지지만 AI 위반 시 통과 가능)
- **영향**: 실질적 위험은 낮음 (AI 가 프롬프트 위반할 확률 + 위반해도 RichTextEditor / ContentRenderer 의 추가 sanitize 가 보호)
- **완화책**: 후속 보안 강화 WO 에서 라이브러리 기반 (DOMPurify 등) 으로 교체 검토

### 6.5 fallback HTML escape (V3)

- **현상**: 초기 V3 의 `buildFallbackBodyHtml` 은 `<` 만 escape — `&` `>` 누락
- **수정**: 본 WO (`WO-O4O-AI-CONTENT-AUTOMATION-DOC-AND-VERIFY-V1`) 에서 `&amp;` `&lt;` `&gt;` 모두 escape 하도록 보강

---

## 7. 다음 단계 후보

| # | 항목 | 의존성 |
|---|------|--------|
| 1 | YouTube playlist 지원 (구조 + 본문 + 영상 일괄) | url-to-blocks 의 playlist 분해 / lesson-body 영상 컨텍스트 확장 |
| 2 | 레슨별 영상 URL 자동 매칭 | 별도 검색 API 또는 사용자 영상 라이브러리 연동 |
| 3 | 퀴즈/과제 자동 생성 | 레슨 본문 → 평가 항목 추출 모델 + Quiz/Assignment 엔티티 작성 흐름 |
| 4 | 매장 활용 프로세스 재연결 | StoreUseModal / `/api/ai/content-to-store-use` UI 복구 (이미 코드 유지) |
| 5 | lesson-body 성능 (병렬 + throttle) | 큐 매니저 / 모델 quota / 부분 결과 저장 정책 |
| 6 | GlycoPharm/K-Cosmetics 흐름 적용 | 각 서비스 LessonModal 패턴 정합성 + 도메인별 프롬프트 audience 변형 |

---

## 8. 검증 결과

> 본 절은 `WO-O4O-AI-CONTENT-AUTOMATION-DOC-AND-VERIFY-V1` 의 검증 산출물.
> 검증 방식: 정적 코드 리뷰 + tsc + vite build. 라이브 브라우저 smoke 는 사용자 환경에서 별도 수행 필요 (사유: 인스트럭터 권한 + AI API 키가 production 환경에서만 결합되므로 sandbox 자동화 불가).

### 8.1 정적 검증 (PASS)

| 시나리오 | 항목 | 결과 |
|---|---|---|
| 콘텐츠 생성 | `/content/documents/new` 진입점 → AiContentModal `onClose`/`editor` prop 흐름 / `editor.commands.setContent` 정상 | PASS |
| 콘텐츠 생성 | URL 모드 `POST /api/ai/url-to-blocks` 응답 shape `{success, blocks[]}` 와 `blocksToHtml()` 정합 | PASS |
| 콘텐츠 생성 | 텍스트 모드 `POST /api/ai/content` 응답 `{success, html, title, summary}` 와 modal 사용 정합 | PASS |
| V1 단일 레슨 | LessonModal 의 `onInsert` 콜백 흐름 / `editor=null` 케이스 처리 | PASS |
| V1 단일 레슨 | YouTube URL 감지 (`isYouTubeUrl`) → `videoUrl` 채움 + iframe 상단 prepend | PASS |
| V1 단일 레슨 | 사용자 입력 보호 (`form.title.trim()` 비어있을 때만 자동 채움) | PASS |
| V2 강의 구조 | `POST /api/ai/course-structure` 5~8개 강제 / 3개 미만 500 / 8개 cap | PASS |
| V2 강의 구조 | URL 모드 `fetchUrlText` 재사용, topic 모드 텍스트 직접 사용 | PASS |
| V2 강의 구조 | 자동 저장 금지 — `onConfirm` 미호출 시 createLesson 미실행 | PASS |
| V3 본문 생성 | 모달 내부 순차 처리 + 진행 메시지 갱신 / fallback 동작 | PASS |
| V3 본문 생성 | `lmsInstructorApi.createLesson` 의 `content` 필드에 html 저장 / `description=summary` | PASS |
| V3 본문 생성 | fallback HTML escape (`&` `<` `>` 모두) — 본 WO 에서 보강 | PASS (수정 적용) |
| V3 본문 생성 | `courseTitle` prop 전달 (`form.title || course.title`) | PASS |
| 빌드 | `apps/api-server` `tsc --noEmit` | PASS |
| 빌드 | `services/web-kpa-society` `tsc --noEmit` | PASS |
| 빌드 | `services/web-kpa-society` `vite build` | PASS |

### 8.2 라이브 브라우저 smoke (사용자 책임)

아래 시나리오는 사용자가 직접 수행해야 함:

| # | 시나리오 | URL | 확인 항목 |
|---|---|---|---|
| 1 | 콘텐츠 생성 | `/content/documents/new` → AI 정리 → URL에서 가져오기 → 임의 공개 URL 입력 → 에디터에 삽입 → 저장 | heading/paragraph 정상, 수정 가능, 저장 후 유지 |
| 2 | V1 단일 레슨 | `/instructor/courses/:id` → 새 레슨 추가 → AI로 레슨 초안 만들기 → YouTube URL → 삽입 | 제목 자동 입력, iframe embed, videoUrl 자동 채움, 저장 가능 |
| 3 | V2 강의 구조 | 같은 페이지 → 🧱 AI로 강의 구조 만들기 → 주제 입력 → 생성 | 5~8개 후보, 제목 자연스러움, 순서 논리적 |
| 4 | V3 본문 + 추가 | 위 결과에서 2~3개 선택 → [선택한 레슨 추가] | 진행 메시지 표시, 레슨 생성됨, description=summary, content=HTML, RichTextEditor 정상 표시. 일부 실패 시에도 fallback 으로 모두 생성 |

권장 smoke 데이터:
- KPA 인스트럭터 권한 계정 (lms:instructor)
- 공개 접근 가능한 YouTube/블로그 URL (V1, 콘텐츠 생성)
- 한국어 주제 (V2, V3) — 예: "약사 신규 직원 OJT 1주차"

### 8.3 발견된 문제 / 수정 여부

| 항목 | 심각도 | 처리 |
|------|--------|------|
| fallback HTML 의 `&`/`>` 미 escape | 낮음 | **본 WO 에서 수정 적용** |
| Backend lesson-body sanitizer 의 작은따옴표 / `style` 속성 누락 | 낮음 | 본 문서 §6.4 에 Known Issue 로 기록. 후속 보안 강화 WO 에서 처리 |
| lesson-body 생성 시간 (순차) | 중 | 본 문서 §6.1 에 Known Issue 로 기록. 다음 단계 후보 §7-5 |
| 기타 | — | 정적 리뷰 범위에서 추가 발견 없음 |

---

## 9. 결론

> **AI 기반 콘텐츠/강의 자동화 V1~V3 는 KPA-Society 에서 정상 동작하는 상태이며, 본 문서가 운영/개발의 단일 기준이다. 후속 확장 (다른 서비스 적용 / 퀴즈·과제 자동화 / 영상 자동 매칭 / 매장 활용 재연결 / 성능 최적화) 은 §7 의 후보로 별도 WO 진입한다.**

---

*이 문서는 CLAUDE.md 의 "도메인별 규칙 (참조)" 에 등재 후보이며, 후속 자동화 작업 시 가장 먼저 참조한다.*
