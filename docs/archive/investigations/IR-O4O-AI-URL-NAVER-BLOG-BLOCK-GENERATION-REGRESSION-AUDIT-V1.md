# IR-O4O-AI-URL-NAVER-BLOG-BLOCK-GENERATION-REGRESSION-AUDIT-V1

**작성일:** 2026-05-21
**대상:** `apps/api-server/src/routes/ai-proxy.routes.ts` — `extractNaverBlogText`, `/url-to-blocks` 엔드포인트
**성격:** 코드 정적 분석 전용 Audit — 수정 없음

---

## 1. 판정

> **Cause A (primary) + Cause B (secondary) 복합.**
>
> `postViewArea` / `viewTypeSelector` 가 페이지 전체 wrapper로 가장 긴 후보로 선택되고,
> 해당 텍스트에서 AI가 생성한 블록이 전부 `isValidContent` 필터에 탈락하여 0 blocks 반환.
>
> NAVER_INTRO_RE `^` anchor 버그가 content-only selector (se-main-container) 제거를 가속.

---

## 2. 오류 경로 전체 추적

```
fetchNaverBlogContent()
  → extractNaverBlogText(postViewHtml)
    → rawCandidates[4]: extractContainerById(workHtml, 'postViewArea')   → 대형 noisy text
    → rawCandidates[5]: extractContainerById(workHtml, 'viewTypeSelector') → 대형 noisy text
    → candidates (≥100자): [postViewArea-text, viewTypeSelector-text]   ← Cause A
    → reduce(longest): postViewArea or viewTypeSelector 선택             ← 최장 = 최악 선택
  → text = 탐색/UI 레이블 혼재 텍스트 (stripHtml 후 짧은 단어 수백 개)
  → AI 생성 → 블록 파싱 성공 (normalizedBlocks.length > 0)
  → isValidContent 필터: 모든 블록 isTooShort(<20자) 또는 isMenuLike    ← 탈락 지점
  → finalBlocks.length === 0
  → limitedBlocks = []
  → res.json({ success: true, blocks: [] })

프론트엔드:
  → data.blocks.length === 0
  → throw Error('생성된 블록이 없습니다. URL 접근 가능 여부를 확인해 주세요.')  ← 최종 오류
```

---

## 3. Cause A (primary) — postViewArea / viewTypeSelector 페이지 전체 wrapper 선택

### 문제

현재 6개 selector 목록:

```typescript
const rawCandidates: Array<string | null> = [
  extractContainerByClass(workHtml, 'se-main-container'), // 스마트에디터 2.0+
  extractContainerByClass(workHtml, 'se-component-wrap'), // 스마트에디터 1.0
  extractContainerByClass(workHtml, 'post-view'),          // 구형 에디터
  extractContainerByClass(workHtml, 'post_body'),          // 매우 구형
  extractContainerById(workHtml, 'postViewArea'),          // ← 페이지 전체 wrapper
  extractContainerById(workHtml, 'viewTypeSelector'),      // ← 페이지 전체 wrapper
];
```

Naver PostView HTML에서 `#postViewArea` 와 `#viewTypeSelector` 는
**본문 전용 요소가 아닌 페이지 전체 영역 wrapper**이다.

### 실제 포함 내용

| 요소 | 포함 영역 |
|------|----------|
| `#postViewArea` | 본문 + 사이드바 + 댓글 + 공감 버튼 + SNS 공유 + 운영자 메뉴 |
| `#viewTypeSelector` | 위 + 네비게이션 탭 + 카테고리 목록 + 이웃 블로그 목록 |

### 결과

- `stripHtml` 후 텍스트 길이: 일반 포스트 기준 3,000~10,000자
- 이 중 실제 본문: 200~1,000자
- 나머지 2,000~9,000자: "홈", "카테고리", "이웃 블로그", "안부", "통계", "구독", "공감" 등 짧은 UI 레이블

### 최장 후보 선택 시 결과

```typescript
candidates.reduce((a, b) => (a.length >= b.length ? a : b));
// → #viewTypeSelector 텍스트 선택 (가장 많은 노이즈 포함 = 가장 길다)
```

AI 입력: 대량의 짧은 UI 레이블 나열.

AI 생성 블록:
```json
[
  { "type": "o4o/paragraph", "content": "홈" },
  { "type": "o4o/paragraph", "content": "카테고리" },
  { "type": "o4o/paragraph", "content": "이웃 블로그" },
  ...
]
```

`isValidContent` 필터:
```typescript
const isTooShort = (text: string): boolean => text.trim().length < 20;
// "홈" → 1자 → 탈락
// "카테고리" → 4자 → 탈락
// "이웃 블로그" → 6자 → 탈락 (isTooShort)
```

**결과: 모든 블록 탈락 → blocks = [] → "생성된 블록이 없습니다"**

---

## 4. Cause B (secondary) — NAVER_INTRO_RE `^` anchor 가 전체 후보 제거

### 문제 코드

```typescript
const NAVER_INTRO_RE = /^이\s*블로그(는|의)?\s+\S+\s*(가|이)?\s*운영합니다/;

const candidates = rawCandidates
  .filter((c): c is string => c !== null)
  .map((c) => stripHtml(c).trim()
  .filter((t) => t.length >= 100)
  .filter((t) => !NAVER_INTRO_RE.test(t));    // ← 문제
```

### JavaScript `^` 의 실제 동작

JavaScript에서 `/^pattern/` 는 `m` 플래그 없이 사용하면
**문자열 전체의 시작**에서만 매칭한다.

### 실제 발생 시나리오

`se-main-container` content (stripHtml 후):

```
이 블로그는 식약지킴이가 운영합니다
글을 쓰고 나누는 공간입니다

비타민 D의 중요성

비타민 D는 칼슘 흡수를 도와 뼈 건강에 필수적인 영양소입니다.
하루 권장량은 성인 기준 600-800 IU입니다.
...
```

- 문자열이 "이 블로그는..." 으로 시작 → `NAVER_INTRO_RE.test(t)` = **true**
- **전체 후보 제거** (본문 포함)

결과:
- `se-main-container` 탈락 (NAVER_INTRO_RE)
- `se-component-wrap` 탈락 (소개문 wrapper가 첫 번째 component)
- 100자 미만 후보 탈락
- **최종 candidates[] 에 content-only selector 없음**
- fallback: `lenientCandidates` (50자 이상, NAVER_INTRO_RE 미적용)
  - `se-main-container` 다시 등장 (50자 이상) BUT NAVER_INTRO_RE 없음
  - `postViewArea`, `viewTypeSelector` 도 등장 (매우 길다)
  - reduce → **postViewArea 또는 viewTypeSelector 선택** (Cause A 진입)

**Cause B가 Cause A를 가속한다: 정상 후보(se-main-container)를 제거하여 Cause A 경로 확정.**

---

## 5. 판정 매트릭스

| 원인 | 발생 조건 | 위험도 |
|------|----------|:------:|
| **A. postViewArea/viewTypeSelector 최장 선택** | PostView HTML에 항상 존재 → 항상 발생 | HIGH |
| **B. NAVER_INTRO_RE `^` anchor 전체 후보 제거** | 소개문이 있는 블로그 (식약지킴이 등) | HIGH |
| A+B 복합 | 소개문 있는 블로그 = 정상 후보 탈락 + 노이즈 후보 선택 | CRITICAL |
| C. 100자 미만 단편 포스트 | 매우 짧은 글 | MED |

---

## 6. 7개 조사 항목 결론

| # | 조사 항목 | 결론 |
|---|----------|------|
| 1 | fetch HTML 길이 | 문제 없음. PostView HTML 정상 수신 (수만 자) |
| 2 | selector 후보별 추출 | `postViewArea` / `viewTypeSelector` 추출 성공 but 노이즈 대량 포함 |
| 3 | NAVER_INTRO_RE 영향 | `^` anchor가 본문 포함 후보 전체 제거 (소개문 포함 블로그) |
| 4 | 100자 미만 제거 영향 | 단편 포스트에서 유효 후보 탈락 가능. 이 케이스에서는 NAVER_INTRO_RE가 더 먼저 작용 |
| 5 | 최장 후보 선택 영향 | 페이지-level wrapper 선택 = 핵심 문제. content-only 필터 없음 |
| 6 | block 생성 직전 텍스트 | 정상 길이(수천 자)이나 단어가 모두 짧음 (<8자) |
| 7 | 0 block 발생 단계 | **isValidContent 필터 (Step 6-B)** — AI 생성 후 모든 블록 탈락 |

---

## 7. 수정 방향 (후속 WO 참조용)

### 수정 1 — postViewArea / viewTypeSelector 제거 (HIGH 필수)

```typescript
const rawCandidates: Array<string | null> = [
  extractContainerByClass(workHtml, 'se-main-container'), // 스마트에디터 2.0+
  extractContainerByClass(workHtml, 'se-component-wrap'), // 스마트에디터 1.0
  extractContainerByClass(workHtml, 'post-view'),          // 구형 에디터
  extractContainerByClass(workHtml, 'post_body'),          // 매우 구형
  // postViewArea, viewTypeSelector 제거 — 페이지 전체 wrapper, content-only 아님
];
```

### 수정 2 — NAVER_INTRO_RE 방식 변경 (HIGH 필수)

현재: 전체 후보 제거 (intro가 있으면 본문도 함께 버림)

변경 방향 A: 소개문을 trim으로 제거 후 나머지 사용
```typescript
// 소개문 첫 줄을 제거하고 나머지를 사용
const trimmedIntro = t.replace(/^이\s*블로그(는|의)?\s+\S+[^\n]*\n+/, '').trim();
if (trimmedIntro.length >= 100) return trimmedIntro;
```

변경 방향 B: 소개문만 있는 경우 (100자 미만 remainder) 만 제거
```typescript
const withoutIntro = t.replace(/^이\s*블로그(는|의)?\s+[^\n]+\n/, '').trim();
// 제거 후 충분한 본문이 있으면 유지
return withoutIntro.length >= 100 ? withoutIntro : null;
```

### 수정 3 — isValidContent 기준 완화 검토 (LOW, 선택)

현재 20자 미만 전부 탈락. 한국어 짧은 문장은 20자가 넉넉한 기준이나,
Naver 블로그 특성상 소제목 블록(예: "비타민 D 섭취량" = 10자) 탈락 가능.
네이버 블로그 전용 isValidContent 기준을 15자로 완화하는 방안 검토.

---

## 8. 후속 WO 제안

```
WO-O4O-AI-URL-NAVER-BLOG-SELECTOR-REGRESSION-FIX-V1

수정:
1. rawCandidates에서 postViewArea, viewTypeSelector 제거
2. NAVER_INTRO_RE: 전체 후보 제거 → 소개문 prefix trim 후 나머지 사용
3. (선택) isValidContent 최소 길이 15자로 완화

수정 파일: 1개 (ai-proxy.routes.ts)
수정 함수: extractNaverBlogText (약 20줄)
예상 소요: 30분 이내
회귀 방지: Generic URL extractor 변경 없음 (isNaverBlogUrl 분기 내부만)
```

---

## 9. 종합 결론

| 구분 | 결과 |
|------|------|
| 오류 발생 단계 | Step 6-B: `isValidContent` 필터 (AI 생성 완료 후 모든 블록 탈락) |
| 1차 원인 | `postViewArea`/`viewTypeSelector` 페이지 전체 wrapper 최장 선택 |
| 2차 원인 | `NAVER_INTRO_RE` `^` anchor가 se-main-container 전체 후보 제거 |
| 복합 효과 | Cause B가 Cause A 진입을 확정 |
| 즉시 HIGH | postViewArea/viewTypeSelector 제거 + NAVER_INTRO_RE 방식 수정 |
| Generic 영향 | 없음 (isNaverBlogUrl 분기 내부) |
