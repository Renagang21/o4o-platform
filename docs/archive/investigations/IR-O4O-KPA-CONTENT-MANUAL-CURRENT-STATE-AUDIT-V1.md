# IR-O4O-KPA-CONTENT-MANUAL-CURRENT-STATE-AUDIT-V1

> **목적:** KPA-Society 콘텐츠(Content) 기능 매뉴얼 (`/guide/features/content`) 재작성 전,
> 현재 구현 상태를 종합 조사한다. 본 문서는 조사 결과만 정리하며 코드 수정은 포함하지 않는다.
>
> **선행 작업:** `WO-O4O-KPA-GUIDE-FORUM-MANUAL-REFRESH-V1` (포럼 가이드 정비 완료)
> **후속 작업:** `WO-O4O-KPA-GUIDE-CONTENT-MANUAL-REFRESH-V1` (예정)

---

## 0. 요약

| 항목 | 결과 |
|------|------|
| 콘텐츠 허브 구조 | `/content` = **3-섹션 허브** (문서형 · 코스형 자료 · 설문조사) + 자료실 진입 링크 |
| Content vs Resource | **동일 컴포넌트 + `subType` prop 분기** (`/content/documents` ↔ `/content/resources`) |
| 작성/수정 에디터 | **TipTap 기반 RichTextEditor** (HTML 출력) |
| AI 기능 | **AiContentModal** — URL/텍스트 → HTML 변환, 다중 outputType, Phase 1 완료 |
| 검색/필터 UI | **문서형 목록 미구현**, 설문/코스 목록만 검색 input 존재 |
| 댓글 | **미구현** (포럼과 달리 댓글 없음) |
| 좋아요/추천 | 구현 완료 (`contentApi.recommend`) |
| 감사 포인트 | 구현 완료 (Phase 1, 글 상세에 집계+최근 메시지 표시) |
| 가져오기 (`copyToStore`) | **구현 완료** (자료실 핵심 기능 — 매장 자료함으로 복사) |
| 현재 Guide와 불일치 | 큼 — 현재 Guide는 단순 5-섹션 글쓰기 매뉴얼, 실제는 4개 콘텐츠 타입 + 가져오기 흐름 |

---

## 1. 라우트 구조 (실제 등록)

[services/web-kpa-society/src/App.tsx:693-754](../../services/web-kpa-society/src/App.tsx#L693-L754) 기준.

### 1-1. 메인 라우트

| Path | Component | 역할 |
|------|-----------|------|
| `/content` | `ContentListPage` | 3-섹션 허브 (문서/코스/설문 미리보기) |
| `/content/documents` | `ContentDocumentsPage` (default) | 문서형 콘텐츠 전체 목록 |
| `/content/resources` | `ContentDocumentsPage` (`subType='resource'`) | **자료실** (동일 컴포넌트) |
| `/content/surveys` | `ContentSurveysPage` | 설문조사 목록 |
| `/content/courses` | `ContentCoursesPage` | 코스형 자료 목록 (LMS published 코스) |
| `/content/:id` | `ContentDetailPage` | 콘텐츠 상세 (sub_type='content' 또는 'resource') |
| `/content/:id/edit` | `ContentWritePage` | 콘텐츠 수정 (작성자만) |

### 1-2. 작성 라우트

| Path | Component | 비고 |
|------|-----------|------|
| `/content/documents/new` | `ContentWritePage` | 문서 작성 — RichTextEditor + AI 모달 |
| `/content/surveys/new` | `ParticipationCreatePage` | 설문 생성 — Participation API 사용 |
| `/content/courses/new` | `CourseNewPage` | 코스형 자료 — `lms:instructor` 또는 `kpa:admin` 필요 |

### 1-3. Legacy Redirect

[App.tsx:744-753](../../services/web-kpa-society/src/App.tsx#L744-L753):

- `/content/new` → `/content/documents/new`
- `/content/write` → `/content/documents/new`
- `/content/new/survey` → `/content/surveys/new`
- `/content/new/course` → `/content/courses/new`
- `/content/new/lecture` → `/content/courses/new`
- `/contents` → `/content`
- `/content/notice` → `/content`

### 1-4. Public/Print 보조 페이지

| File | 역할 |
|------|------|
| `services/web-kpa-society/src/pages/content/PublicContentViewPage.tsx` | 공개 자료 렌더링 (비인증, displayMode 분기: default/banner/landing) |
| `services/web-kpa-society/src/pages/content/PrintContentPage.tsx` | 자동 인쇄 다이얼로그 |

> `/view/:snapshotId?org=...` 라우트 (QR/링크 공유용) — Guide 매뉴얼 범위 외(별도 흐름)로 분리 권장.

---

## 2. ContentListPage — 콘텐츠 허브 (`/content`)

[services/web-kpa-society/src/pages/contents/ContentListPage.tsx:17-23](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L17-L23)

### 2-1. 구조

3개 섹션의 대시보드:

1. **문서형 콘텐츠** — `contentApi.list({ content_type: 'information', sub_type: 'content' })` 최근 6개, BaseTable + Drawer
2. **코스형 자료** — `lmsApi` published 코스 10개, 카드 형태
3. **설문조사** — `participationApi.getParticipationSets` 6개, 카드 형태

### 2-2. 헤더 액션

[ContentListPage.tsx:54-85](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L54-L85):

- 섹션별 우상단에 **"문서 등록" / "코스형 자료 등록" / "설문 등록"** 버튼 (로그인 시)
- 섹션별 **"더 보기 →"** 링크
- 페이지 상단 우측 **"자료실 →"** 링크 → `/content/resources`

### 2-3. 권한

- 코스형 자료 등록: `roles.includes('lms:instructor') || roles.includes('kpa:admin')`

---

## 3. ContentDocumentsPage — 문서형 콘텐츠 / 자료실 (`subType` 분기)

[services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx:11-22](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L11-L22)

### 3-1. subType 분기 (단일 컴포넌트, 라우트 둘)

| 값 | 라우트 | pageTitle | 등록 버튼 |
|---|--------|-----------|-----------|
| `'content'` (default) | `/content/documents` | "문서형 콘텐츠" | "문서 등록" 노출 |
| `'resource'` | `/content/resources` | "자료실" | **미노출** (운영자만 등록) |

[ContentDocumentsPage.tsx:62-71](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L62-L71)

### 3-2. 기능

| 기능 | 상태 | 위치 |
|------|------|------|
| BaseTable 목록 + 모바일 카드 | 구현 | 라인 426-464 |
| 페이지네이션 | 구현 | 라인 469-487 |
| Drawer 상세 패널 | 구현 | 라인 418-525 |
| 체크박스 + bulk 액션 (가져가기/삭제) | 구현 | 라인 230-346 |
| **검색 input** | **미구현(UI)** | `contentApi.list`는 `search` param 지원하나 UI 없음 |
| **태그 필터** | **미구현(UI)** | API 지원 / UI 없음 |
| 정렬 | `'latest'` 고정 | 라인 93 |

### 3-3. "내 자료함 가져가기" 흐름 (자료실 핵심)

[ContentDocumentsPage.tsx:7](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L7) (WO-O4O-CONTENT-HUB-TABLE-CANONICAL-ALIGN-V1):

- `contentApi.copyToStore(contentId)` 호출 → 매장 자료함에 복사 생성
- bulk 가져가기 = ActionBar에서 다수 선택 후 일괄 복사
- `reusable_policy='restricted'` 콘텐츠는 가져가기 차단 (`WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1`)

### 3-4. 권한

| 작업 | 권한 |
|------|------|
| 열람 | 누구나 (비로그인 가능) |
| 등록 | 문서형 = 로그인 / 자료실 = 운영자 (UI 미노출) |
| 수정/삭제 | `created_by === currentUserId` 만 표시 |
| 가져가기 | 로그인 + `reusable_policy !== 'restricted'` |

---

## 4. ContentWritePage — 작성/수정

[services/web-kpa-society/src/pages/contents/ContentWritePage.tsx](../../services/web-kpa-society/src/pages/contents/ContentWritePage.tsx)

### 4-1. 필드

| 필드 | 필수 | UI |
|------|------|----|
| 제목 | ✅ | text input |
| 본문 | 선택 | **RichTextEditor (TipTap)** — HTML 출력 |
| 요약 | 선택 | textarea |
| 태그 | ✅ (최소 1개) | chip 입력 (Enter / 쉼표로 확정), `WO-O4O-CONTENT-DOCUMENT-TAG-INPUT-CHIP-FIX-V1` |
| 매장 가져가기 정책 | 선택 | radio: `'platform'` (허용 default) / `'restricted'` (제한) |

> **파일 업로드/첨부 UI 없음**. RichTextEditor 내부에서 이미지 삽입은 가능하나 별도의 첨부 영역 없음.

### 4-2. 상태 전환

- **초안(draft) 저장** — 라인 354-359
- **공개(published) 저장** — 라인 360-367
- 저장 후 `/content/:id` 로 리다이렉트

### 4-3. AI 통합

[ContentWritePage.tsx:48-49, 119-125](../../services/web-kpa-society/src/pages/contents/ContentWritePage.tsx#L48-L125):

- 상단 **"AI로 만들기" 배너** + 모달 트리거
- `AiContentModal` (`@o4o/content-editor`) 호출
- `onInsert` 결과 → HTML은 본문에 덮어쓰기, title은 빈 경우만 자동 주입
- 빈 title 시 HTML 첫 `<h1~h3>` 추출 fallback (`extractTitleFromHtml`)

### 4-4. GuideBlock 통합 (작성 화면 자체의 인라인 가이드)

[ContentWritePage.tsx:51-74](../../services/web-kpa-society/src/pages/contents/ContentWritePage.tsx#L51-L74) — `WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1`:

- `fetchGuidePageContent('kpa-society', 'content.document.editor')` 호출
- `sections['guideblock-page-help']` JSON → title/description/steps 주입
- 운영자가 `/operator/guide-contents`에서 편집 가능

### 4-5. 권한

- 작성: 로그인 필수 (라인 110-114)
- 수정: `c.created_by !== user?.id` 시 차단 (라인 85-89)

---

## 5. ContentDetailPage — 상세 보기

[services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx)

### 5-1. 표시 영역

[ContentDetailPage.tsx:138-242](../../services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx#L138-L242):

- 콘텐츠 타입 / 서브타입 / 상태 배지
- 제목, 작성자, 작성일, 조회수
- 요약 박스
- 태그 (`#tag` 형태, 클릭 시 이동 없음 — **단순 표시**)
- 본문 (`dangerouslySetInnerHTML` HTML 렌더링)
- 액션 바: 추천(♥), 링크 복사(🔗), 수정(작성자만), 감사 집계
- 최근 감사 메시지 (Phase 1)

### 5-2. 좋아요/추천

- `contentApi.recommend(id)` 토글
- `isRecommendedByMe` + `recommendCount` 동기화

### 5-3. 조회수

- 진입 시 `contentApi.trackView(id)` 자동 호출

### 5-4. 공유

- **링크 복사만 구현** (clipboard API)
- SNS/QR 공유, 임베드, 인쇄(상세) — 미구현 (PrintContentPage는 별도 `/view/:snapshotId` 흐름)

### 5-5. 댓글

> **미구현.** 포럼과 달리 콘텐츠는 댓글 영역이 없다.

---

## 6. AiContentModal — AI 콘텐츠 생성

[packages/content-editor/src/components/AiContentModal.tsx:1-29](../../packages/content-editor/src/components/AiContentModal.tsx#L1-L29)

### 6-1. 입력/출력

| 입력 | 출력 |
|------|------|
| URL (웹/유튜브) 또는 텍스트 붙여넣기 | `{ html, title, summary, youtubeUrls?, usageWarning? }` |

- 백엔드 7개 `outputType` 중 6개 노출 (기본 4개 + `blog`, `store_qr`)
- YouTube URL은 별도 `youtubeUrls` 배열로 반환 → `editor.commands.setYoutubeVideo()` 분기 삽입
- 이용조건 감지(`UsageWarning`) — 원문 라이선스/저작권 표시 감지

### 6-2. ContentWritePage에서의 사용

- `initialMode` prop 미설정 (= flexible 자유 입력)
- `showCommunitySave` / `showStoreSave` / `showProductionMaterialSave` prop **미사용** (= 콘텐츠 작성 화면에서는 저장 destination 분기 없음)
- 결과 → `onInsert` 콜백 → 작성 화면의 title/body state로 주입

### 6-3. 매장 제작 자료 흐름 (별도, 본 매뉴얼 범위 외)

[AiContentModal.tsx:11-20](../../packages/content-editor/src/components/AiContentModal.tsx#L11-L20):

- `showProductionMaterialSave=true` 시 `POST /api/v1/kpa/store/assets` 직접 저장
- `assetType=content`, `category=outputType`, `usageType` enum 매핑
- KPA 매장 제작 자료 흐름(`WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-AI-FLOW-V1`)에서 사용
- **콘텐츠 가이드 매뉴얼에는 포함하지 말 것** — 매장 운영 가이드 소속

### 6-4. 인증

- `aiRequestHeaders` prop으로 Bearer 토큰 명시 주입 (`getAccessToken()`)
- 미제공 시 `credentials: 'include'` 쿠키 fallback

---

## 7. Content vs Resource 데이터 모델

### 7-1. 동일 entity, sub_type 컬럼으로 구분

[ContentDocumentsPage.tsx:11-14](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L11-L14):

```
WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1:
  subType prop 추가 — 동일 페이지 코드로 '문서형 콘텐츠' (sub_type='content') 와
  '자료실' (sub_type='resource') 두 라우트를 처리. asset_type='content' 재사용
  (resolver 가 sub_type 을 content_json 에 자동 보존하므로 backend 변경 불필요).
```

- 같은 `contents` 엔티티
- `content_type='information'` 고정 (정보 콘텐츠)
- `sub_type='content'` (문서형) vs `sub_type='resource'` (자료실) 로 분기
- 작성 흐름은 동일 (`ContentWritePage`) — 자료실은 운영자만 등록

### 7-2. 흐름 차이

| 항목 | 문서형 (`content`) | 자료실 (`resource`) |
|------|---------------------|---------------------|
| 누가 등록 | 일반 회원 | 운영자 (UI 미노출) |
| 등록 버튼 | 표시 | 미노출 |
| 가져가기 | 가능 | **핵심 기능** |
| 검색/필터 | 미구현 | 미구현 |

---

## 8. 현재 Guide vs 실제 구현 — 차이 분석

### 8-1. 현재 Guide 구조

[packages/shared-space-ui/src/guide/copy/kpa.ts:660-729](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L660-L729) — `kpaGuideFeatureContentProps`:

| Step | 제목 | 내용 요지 |
|------|------|----------|
| 01 | 콘텐츠 이동 | `/content` 진입, 카테고리·검색 |
| 02 | 콘텐츠 찾기 | 키워드 검색, 태그, 상세 보기 |
| 03 | 콘텐츠 활용 | 고객 설명, 매장 안내, 링크 공유, 운영 참고 |
| 04 | 콘텐츠 작성 | 제목, 본문, 태그, 게시 |
| 05 | AI 활용 기준 | 요약, 설명 문구 생성, 매장용 변환 |

### 8-2. 실제 구현과 어긋나는 부분 (삭제/수정 대상)

| 항목 | 현재 Guide 설명 | 실제 |
|------|-----------------|------|
| 카테고리 필터 | "카테고리별, 최신순으로 콘텐츠를 확인" | 카테고리 UI 없음 — 4개 섹션(문서/자료/설문/코스)으로 분리 |
| 키워드 검색 | "제목·본문·태그 키워드로 검색" | **문서 목록에 검색 UI 없음** (설문/코스만 있음) |
| 태그 필터 | "관련 태그로 묶어 봅니다" | 태그 클릭 → 필터링 동작 없음 |
| AI 요약 | "긴 콘텐츠를 핵심 요약으로 변환" | AI는 **URL/텍스트 → HTML 생성**만 지원, 요약 단독 기능 아님 |
| AI 매장용 변환 | "전문 표현을 매장 응대 문장으로 다듬음" | 실제 outputType은 `blog`, `store_qr` 등 — 콘텐츠 작성 화면에서는 일반(flexible) 진입만 |
| 자료실 언급 | 없음 | **별도 라우트 + 가져가기 핵심 기능** — Guide에 누락 |
| 4-섹션 허브 | 없음 | `/content` = 문서/코스/설문 3섹션 허브 + 자료실 진입 |

### 8-3. Guide에 누락된 실제 기능 (추가 대상)

- **콘텐츠 허브 3-섹션 구조** (`/content` = 문서/코스/설문 미리보기)
- **자료실** (`/content/resources`) — 매장 자료함 가져가기 흐름
- **콘텐츠 가져가기 (`copyToStore`)** — bulk 선택 포함
- **매장 가져가기 정책 (`reusable_policy`)** — 작성 시 허용/제한 선택
- **AI URL→HTML 생성** — 실제 동작 정확히 설명 필요
- **추천(♥)·링크 복사·감사 포인트** — 상세 화면 액션
- **공개 / 초안 상태**, 작성자 수정 권한
- **설문조사 / 코스형 자료**는 별도 가이드(`/guide/features/lms` 등)에 위임 — 단, 허브 진입점은 본 가이드에서 안내

---

## 9. 권한 구조 (정리)

| 작업 | 권한 | 코드 |
|------|------|------|
| 콘텐츠 열람 (목록/상세) | 비로그인 가능 | ContentListPage / ContentDetailPage |
| 콘텐츠 작성 (`/content/documents/new`) | 로그인 필수 | [ContentWritePage.tsx:110](../../services/web-kpa-society/src/pages/contents/ContentWritePage.tsx#L110) |
| 콘텐츠 수정/삭제 | 작성자만 (`created_by === user.id`) | [ContentWritePage.tsx:85-89](../../services/web-kpa-society/src/pages/contents/ContentWritePage.tsx#L85-L89) |
| 추천(♥) | 로그인 필수 | [ContentDetailPage.tsx:75](../../services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx#L75) |
| 가져가기 | 로그인 + `reusable_policy !== 'restricted'` | [ContentDocumentsPage.tsx:164-170](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L164-L170) |
| 자료실 직접 등록 | 미노출 (운영자 운영) | [ContentDocumentsPage.tsx:69-71](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L69-L71) |
| 코스형 자료 등록 | `lms:instructor` 또는 `kpa:admin` | [ContentListPage.tsx:906-908](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L906-L908) |
| 감사 포인트 보내기 | 로그인 + 본인 글 제외 | (`WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1`) |

---

## 10. 미구현 / Phase 단계 / 매뉴얼 제외 권장 기능

| 기능 | 상태 | 매뉴얼 포함 여부 |
|------|------|------------------|
| 키워드 검색 UI (문서) | **미구현** | 제외 (API는 있으나 노출되지 않음) |
| 태그 필터 UI | **미구현** | 제외 |
| 카테고리 필터 | **미구현** | 제외 |
| 댓글 | **미구현** | 제외 (포럼과 구분 명시) |
| 파일 첨부 영역 | **미구현** | 제외 (이미지는 RichTextEditor 내부) |
| AI 요약 단독 기능 | **미구현** | 제외 (AI는 URL→HTML 생성으로 한정 안내) |
| AI 매장용 변환 (콘텐츠 작성 시) | **미사용** prop | 제외 (매장 가이드 소속) |
| AiContentModal community/store/PM 저장 | **prop 비활성** in ContentWritePage | 제외 |

---

## 11. 권장 매뉴얼 목차 (제안)

> 최종 WO에서 확정.

```text
/guide/features/content

01 콘텐츠 허브
   - /content — 문서/코스/설문 3섹션
   - 자료실 진입 (/content/resources)
   - 각 섹션 더 보기 / 등록 진입

02 문서형 콘텐츠
   - /content/documents 전체 목록
   - 콘텐츠 상세 보기 (/content/:id)
   - 본문 · 요약 · 태그 · 작성자 · 추천(♥) · 링크 복사 · 감사 포인트

03 콘텐츠 작성
   - /content/documents/new
   - 제목 · 본문 (리치 텍스트) · 요약 · 태그(필수)
   - 매장 가져가기 정책 선택 (허용 / 제한)
   - 초안 / 공개 저장
   - 수정: /content/:id/edit (작성자만)

04 AI로 만들기
   - URL (웹/유튜브) → HTML 생성
   - 본문 자동 주입, 제목 자동 추출 fallback
   - 결과 후 RichTextEditor에서 추가 편집
   - 이용조건 감지 안내

05 자료실 (/content/resources)
   - 운영자가 등록한 자료 목록
   - 내 자료함으로 가져가기 (단건 / bulk)
   - reusable_policy='restricted' 자료는 가져가기 차단

06 다른 콘텐츠 타입 진입
   - 코스형 자료 (/content/courses) → 강의 가이드 참조
   - 설문조사 (/content/surveys) → 설문 가이드(별도) 참조
```

---

## 12. 후속 WO 정의 (예고)

### WO-O4O-KPA-GUIDE-CONTENT-MANUAL-REFRESH-V1

**목적:** 본 IR을 근거로 `kpaGuideFeatureContentProps`를 7-step 구조(상기 §11 안)로 전면 재작성한다.

**범위:**
- 단일 파일 수정: [`packages/shared-space-ui/src/guide/copy/kpa.ts`](../../packages/shared-space-ui/src/guide/copy/kpa.ts) (`kpaGuideFeatureContentProps`)
- flowLabels, sections 재구성
- 자료실/AI/가져가기 흐름 신규 반영
- 미구현 기능(검색 UI, 태그 필터, 댓글, 파일 첨부 등) 설명 제거

**범위 외:**
- 실제 코드(검색 UI 추가 등) 신규 구현 — 별도 WO
- 매장 제작 자료 AI 흐름 — 매장 가이드 정비 WO 소속
- /view/:snapshotId 공개 자료 흐름 — 별도 가이드 필요 시 분리

**검증:**
- `tsc --noEmit` (shared-space-ui, web-kpa-society)
- 배포 후 브라우저 검증 (`/guide/features/content`)
- 모바일 레이아웃 확인

---

## 13. 참고 파일

| 위치 | 역할 |
|------|------|
| [App.tsx:693-754](../../services/web-kpa-society/src/App.tsx#L693-L754) | 콘텐츠 라우트 정의 |
| [ContentListPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx) | 콘텐츠 허브 (3-섹션) |
| [ContentDocumentsPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx) | 문서형/자료실 목록 (subType 분기) |
| [ContentSurveysPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentSurveysPage.tsx) | 설문 목록 (Participation API) |
| [ContentCoursesPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentCoursesPage.tsx) | 코스형 자료 (LMS API) |
| [ContentWritePage.tsx](../../services/web-kpa-society/src/pages/contents/ContentWritePage.tsx) | 작성/수정 + AI 모달 |
| [ContentDetailPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx) | 상세 + 추천 + 감사 |
| [AiContentModal.tsx](../../packages/content-editor/src/components/AiContentModal.tsx) | AI 콘텐츠 변환 모달 |
| [shared-space-ui/.../kpa.ts:660-729](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L660-L729) | 현재 Guide copy |

---

*작성일: 2026-05-23*
*Status: Investigation Complete — 후속 WO 대기*
