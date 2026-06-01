# O4O GuideBlock 1차 적용 보고서

> **WO-O4O-GUIDE-BLOCK-1ST-WAVE-REPORT-V1**
> 작성: 2026-05-06
> 상태: Active — 이후 서비스 확장 시 갱신

---

## 1. 개요

### Guide 시스템 공통화 완료 상태

O4O Platform은 운영자가 각 화면의 사용 안내를 직접 관리하고,
사용자는 화면마다 짧고 실질적인 안내를 받는 구조를 목표로 한다.

1차 적용(WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1)에서 KPA-Society 10개 화면에 GuideBlock이 적용되었다.

### GuideBlock 구조

```typescript
import { GuideBlock } from '@o4o/shared-space-ui';

<GuideBlock
  variant="info"          // 'info' | 'warning' | 'success' | 'neutral'
  title="..."             // 짧은 제목
  description="..."       // 1~2문장 설명
  steps={['...', '...']}  // 3~5단계 행동 안내
  compact                 // 선택 — 서브컴포넌트 삽입 시 사용
/>
```

### GuideEditableSection과의 역할 분리

| 컴포넌트 | 목적 | 운영자 인라인 편집 | 위치 |
|---|---|---|---|
| `GuideBlock` | 구조화된 사용법 안내 (읽기 전용) | 별도 관리 화면에서 | PageHeader 아래 / form 위 |
| `GuideEditableSection` | 텍스트 인라인 운영자 편집 | 화면 내 직접 편집 | 기존 위치 유지 |

두 컴포넌트는 병행 사용 가능하며, 서로의 역할을 대체하지 않는다.

### 운영자 관리 구조

```
/operator/guide-contents
  → pageKey 선택
  → sectionKey='page-help' 에 JSON 저장
  → 실화면 즉시 반영 (fetchGuidePageContent 캐시 기반)
```

저장 JSON 스키마:

```json
{
  "title": "짧은 제목",
  "description": "1~2문장 설명",
  "steps": ["1단계", "2단계", "3단계"]
}
```

### pageKey 기반 동작 방식

GuideBlock이 DB override를 지원하는 페이지는 마운트 시 다음 흐름을 실행한다.

```
컴포넌트 마운트
→ fetchGuidePageContent(serviceKey, pageKey)
→ GET /api/v1/guide/contents?serviceKey={key}&pageKey={key}
→ sections['page-help'] 존재 시 JSON parse
→ GuideBlock에 override 값 주입
→ 없으면 static fallback 표시
```

데이터 분리 키: `serviceKey + pageKey + sectionKey` 3-tuple

---

## 2. 1차 적용 현황

### 적용 대상 (KPA-Society)

| pageKey | 화면 | 파일 | 방식 | DB Override | fallback | 상태 |
|---|---|---|---|---|---|---|
| `lms.lesson.editor` | 레슨 편집 모달 | `CourseEditPage.tsx` | DB Override | ✅ | ✅ (lessonType별) | ✅ 기존 적용 |
| `lms.course.editor` | 강의 정보 편집 | `CourseEditPage.tsx` | DB Override | ✅ | ✅ | ✅ 1차 적용 |
| `lms.quiz.editor` | 퀴즈 빌더 | `QuizBuilder.tsx` | Static | ❌ | ✅ | ✅ 1차 적용 |
| `lms.assignment.editor` | 과제 에디터 | `AssignmentEditor.tsx` | Static | ❌ | ✅ | ✅ 1차 적용 |
| `lms.live.editor` | 라이브 에디터 | `LiveEditor.tsx` | Static | ❌ | ✅ | ✅ 1차 적용 |
| `content.document.editor` | 콘텐츠 작성/수정 | `ContentWritePage.tsx` | DB Override | ✅ | ✅ | ✅ 1차 적용 |
| `content.resource.editor` | 자료 등록/수정 | `ResourceWritePage.tsx` | DB Override | ✅ | ✅ | ✅ 1차 적용 |
| `forum.request.management` | 포럼 삭제 요청 관리 | `ForumDeleteRequestsPage.tsx` | DB Override | ✅ | ✅ | ✅ 1차 적용 |
| `store.channel.editor` | 채널 관리 | `StoreChannelsPage.tsx` | DB Override + Legacy | ✅ | ✅ | ✅ 1차 적용 |
| `signage.playlist.manager` | 플레이리스트 편집 | `PlaylistEditorPage.tsx` | DB Override | ✅ | ✅ | ✅ 1차 적용 |

serviceKey: `kpa-society`
sectionKey (DB override 페이지): `page-help`

---

## 3. 적용 패턴 분류

### A. DB Override 지원형

운영자가 `/operator/guide-contents`에서 수정하면 해당 화면에 즉시 반영된다.

**구현 패턴:**

```typescript
// 1. guide 상태 선언
const [guideTitle, setGuideTitle] = useState('기본 제목');
const [guideDesc, setGuideDesc] = useState('기본 설명');
const [guideSteps, setGuideSteps] = useState(['단계1', '단계2', '단계3']);

// 2. 마운트 시 DB 조회
useEffect(() => {
  let cancelled = false;
  fetchGuidePageContent('kpa-society', 'content.document.editor').then((sections) => {
    if (cancelled) return;
    const raw = sections['page-help'];
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (obj?.title) setGuideTitle(obj.title);
      if (obj?.description) setGuideDesc(obj.description);
      if (Array.isArray(obj?.steps)) setGuideSteps(obj.steps);
    } catch { /* keep fallback */ }
  }).catch(() => {});
  return () => { cancelled = true; };
}, []);

// 3. 렌더
<GuideBlock variant="info" title={guideTitle} description={guideDesc} steps={guideSteps} />
```

**적용 화면:**
- `lms.course.editor` (CourseEditPage — `parseLessonGuideContent` 활용)
- `content.document.editor` (ContentWritePage)
- `content.resource.editor` (ResourceWritePage)
- `forum.request.management` (ForumDeleteRequestsPage)
- `store.channel.editor` (StoreChannelsPage)
- `signage.playlist.manager` (PlaylistEditorPage)

---

### B. Static Fallback Only

운영자 override 없이 코드 내 fallback만 사용한다.
레슨 모달 내 서브컴포넌트처럼 독립 데이터 fetch가 어려운 경우에 사용한다.

**구현 패턴:**

```typescript
import { GuideBlock } from '@o4o/shared-space-ui';

<GuideBlock
  variant="info"
  title="퀴즈를 구성합니다."
  description="통과 점수, 제한 시간을 설정한 뒤 문항을 추가하세요."
  steps={[
    '통과 점수와 제한 시간을 입력합니다',
    '문항 추가 버튼으로 문제를 작성합니다',
    '저장하면 수강자에게 퀴즈가 활성화됩니다',
  ]}
  compact
/>
```

**적용 화면:**
- `lms.quiz.editor` (QuizBuilder)
- `lms.assignment.editor` (AssignmentEditor)
- `lms.live.editor` (LiveEditor)

> **향후 전환 기준:** 운영자가 반복적으로 이 화면의 안내를 수정 요청하는 경우, DB Override 지원형으로 전환한다.

---

### C. Legacy + New 병행형

기존 `GuideEditableSection`을 유지하면서 `GuideBlock`을 추가한 형태.
GuideBlock은 구조화된 사용법 안내 역할만 담당하며, GuideEditableSection의 인라인 편집 기능은 그대로 유지된다.

**구현 패턴:**

```tsx
{/* 기존 GuideEditableSection 유지 */}
<p className="text-sm text-slate-500 mt-1">
  <GuideEditableSection
    pageKey="store/channels"
    sectionKey="hero-description"
    defaultContent="각 채널의 제품 진열과 콘텐츠 노출을 관리합니다"
  />
</p>

{/* 신규 GuideBlock 추가 */}
<GuideBlock
  variant="info"
  title={guideTitle}
  description={guideDesc}
  steps={guideSteps}
/>
```

**적용 화면:**
- `store.channel.editor` (StoreChannelsPage)

---

## 4. fallback 작성 기준

| 항목 | 기준 |
|---|---|
| `title` | 화면 목적 한 줄 — "~합니다" 형태 |
| `description` | 1~2문장, 사용자가 해야 할 것 요약 |
| `steps` | 3~5단계, 실제 행동 중심, 짧게 |
| `variant` | `info` 우선. 주의 사항 있으면 `warning` |
| 금지 | 장문 정책 설명, 업무 규정 설명, 법적 문구 |
| 금지 | GuideBlock이 운영 정책 설명까지 대체하는 것 |

**올바른 예:**
```
title: "강의 기본 정보를 입력합니다."
description: "제목, 설명, 공개 범위, 태그를 설정한 뒤 저장하세요."
steps:
  1. 강의 제목을 입력합니다
  2. 공개 범위를 선택합니다 (회원제/공개)
  3. 태그를 1개 이상 입력한 후 저장합니다
```

**잘못된 예:**
```
title: "KPA 약사회 강의 관리 시스템 사용 규정 및 운영 정책 안내"
description: "본 시스템은 대한약사회 규정 제12조에 의거하여..."
steps:
  1. 모든 강의는 약사회 내규에 따라 검토 후 공개됩니다...
```

---

## 5. 운영자 관리 흐름

```
운영자 로그인
→ /operator/guide-contents
→ serviceKey = 'kpa-society' 선택
→ pageKey = 'content.document.editor' 선택
→ sectionKey = 'page-help'
→ JSON 입력 후 저장
```

저장 후 사용자가 해당 화면에 진입하면:

```
fetchGuidePageContent('kpa-society', 'content.document.editor')
→ GET /api/v1/guide/contents?serviceKey=kpa-society&pageKey=content.document.editor
→ { sections: { 'page-help': '{"title":"...","description":"...","steps":["..."]}' } }
→ JSON parse → GuideBlock props 주입
```

### 데이터 분리 키

```
serviceKey  : 서비스 구분 ('kpa-society', 'glycopharm', 'k-cosmetics', 'neture')
pageKey     : 화면 구분 ('lms.course.editor', 'content.document.editor', ...)
sectionKey  : 섹션 구분 ('page-help', 또는 lms.lesson.editor에서는 lessonType)
```

3-tuple로 완전히 격리된다. 서비스 간 pageKey 중복 사용 시에도 데이터가 섞이지 않는다.

---

## 6. 2차 적용 기준

### GlycoPharm (`glycopharm`)

| pageKey 후보 | 화면 | 우선순위 |
|---|---|---|
| `content.document.editor` | 약국 공지/가이드라인 작성 | 높음 |
| `content.resource.editor` | 자료 등록 | 높음 |
| `store.product.management` | 제품 관리 | 중간 |
| `store.channel.editor` | 채널 관리 | 중간 |
| `forum.request.management` | 포럼 요청 관리 | 중간 |

serviceKey: `glycopharm`

---

### K-Cosmetics (`k-cosmetics`)

| pageKey 후보 | 화면 | 우선순위 |
|---|---|---|
| `content.document.editor` | 콘텐츠 작성 | 높음 |
| `event.offer.management` | 이벤트/오퍼 관리 | 높음 |
| `store.product.management` | 제품 관리 | 중간 |
| `forum.request.management` | 포럼 요청 관리 | 낮음 |

serviceKey: `k-cosmetics`

---

### Neture (`neture`)

| pageKey 후보 | 화면 | 우선순위 |
|---|---|---|
| `supplier.product.editor` | 공급사 제품 등록/수정 | 높음 |
| `supplier.event-offer.editor` | 이벤트 오퍼 등록/수정 | 높음 |
| `operator.brand.management` | 브랜드 관리 | 중간 |

serviceKey: `neture`

---

### 2차 적용 시 체크리스트

```text
□ 해당 서비스의 fetchGuidePageContent 설정 확인 (api/guideContent.ts)
□ pageKey를 WO-O4O-GUIDE-PAGE-KEY-CATALOG-V1 기준으로 등록
□ serviceKey가 guide_contents 테이블 service_key와 일치하는지 확인
□ DB Override 지원 여부 결정 (pageKey별)
□ fallback 작성 기준 준수
□ GuideBlock 위치: PageHeader 아래 / form 위
□ 기존 하드코딩 안내 박스 제거 여부 검토 (업무 정책 설명은 제거 금지)
```

---

## 7. 리스크 및 주의 사항

### 1. plain text / JSON 혼용 금지

`page-help` sectionKey에는 반드시 JSON 형식으로 저장해야 한다.
plain text를 저장하면 parse 실패로 fallback이 표시된다.

```json
// 올바름
{"title":"...","description":"...","steps":["...","..."]}

// 잘못됨 (plain text)
"강의 기본 정보를 입력합니다."
```

### 2. pageKey 재사용 주의

동일 pageKey를 다른 화면에 재사용하면 의도하지 않은 guide가 표시된다.
pageKey는 화면별로 고유하게 관리해야 하며, WO-O4O-GUIDE-PAGE-KEY-CATALOG-V1을 기준으로 등록한다.

### 3. fallback 과다 설명 금지

fallback steps는 3~5단계로 제한한다.
안내가 길어질수록 사용자가 읽지 않는다.

### 4. GuideBlock이 업무 정책 설명까지 대체하면 안 됨

GuideBlock은 "사용법"만 담당한다.
업무 규정, 법적 근거, 심사 기준 등은 별도 영역(공지, 약관, 운영 정책 페이지)에 위치해야 한다.

### 5. 운영자 저장 JSON schema validation 필요성 (후속 후보)

현재 운영자가 잘못된 JSON을 저장하면 parse 실패 후 fallback이 표시된다.
명시적 오류 메시지 없이 silent fallback이 동작하므로, 운영자가 저장 실패 여부를 인지하지 못할 수 있다.
후속 WO에서 저장 시 schema 유효성 검증 및 오류 피드백 추가를 검토한다.

---

## 8. Smoke Verify 결과 (KPA-Society 1차 적용)

### 검증 방법

정적 코드 분석 + TS 타입 체크 기준으로 검증

### 결과

| 검증 항목 | 결과 |
|---|---|
| 10개 pageKey GuideBlock 삽입 확인 | ✅ 모두 확인 |
| fallback title/description/steps 존재 | ✅ 전체 확인 |
| DB Override 지원 6개 페이지 useEffect + parse 로직 확인 | ✅ 전체 확인 |
| Static fallback 3개 페이지 (quiz/assignment/live) | ✅ 전체 확인 |
| GuideEditableSection 공존 (StoreChannelsPage) | ✅ 유지 확인 |
| GuideBlock import 경로 `@o4o/shared-space-ui` | ✅ 전체 확인 |
| `fetchGuidePageContent` import 경로 `../../api/guideContent` | ✅ DB Override 페이지 전체 확인 |
| TS 빌드 내 변경 파일 에러 | ✅ 0건 (pre-existing 에러와 무관) |
| GuideBlock 삽입 위치: PageHeader 아래 / form 위 | ✅ 전체 확인 |
| variant=info 사용 | ✅ 전체 확인 |

### 운영자 override 연동 흐름 (정적 검증)

DB Override 지원 페이지의 useEffect가 다음 조건을 모두 만족함을 확인:

```text
1. fetchGuidePageContent(serviceKey, pageKey) 호출
2. sections['page-help'] 조회
3. JSON.parse 시도
4. obj.title / obj.description / obj.steps 주입
5. catch 블록에서 fallback 유지
6. cancelled 플래그로 cleanup
```

---

## 9. 관련 작업 이력

| WO | 내용 | 상태 |
|---|---|---|
| WO-O4O-GUIDE-UI-COMPONENT-V1 | GuideBlock 컴포넌트 구현 | 완료 |
| WO-O4O-GUIDE-CONTENT-MANAGEMENT-V1-SCOPED | guide_contents API + 운영자 관리 | 완료 |
| WO-O4O-GUIDE-CLIENT-EXTRACTION-V1 | createGuideClient 공통화 | 완료 |
| WO-O4O-GUIDE-INLINE-EDIT-V1 | GuideEditableSection 구현 | 완료 |
| WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1 | 안내 문구 관리 공통화 | 완료 |
| **WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1** | **KPA-Society 1차 적용** | **완료** |
| WO-O4O-GUIDE-BLOCK-1ST-WAVE-DOC-AND-VERIFY-V1 | 본 문서 | 완료 |

---

*Updated: 2026-05-06*
*Version: 1.0*
*Status: Active*
