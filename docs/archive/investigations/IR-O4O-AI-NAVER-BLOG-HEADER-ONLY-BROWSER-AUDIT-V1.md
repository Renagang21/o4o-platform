# IR-O4O-AI-NAVER-BLOG-HEADER-ONLY-BROWSER-AUDIT-V1

**작성일:** 2026-05-21  
**대상:** `apps/api-server/src/routes/ai-proxy.routes.ts` — `fetchNaverBlogContent`  
**성격:** 코드 정적 분석 + 로그 분석 + 로컬 재현 Audit — 수정 없음

---

## 1. 증상

브라우저에서 `https://blog.naver.com/kfdazzang/221731714956` (제목: "특별한 물 '해양 심층수'…")을
URL 블록 변환 요청했을 때, AI가 실제 본문("해양 심층수", "미네랄" 등) 대신
**"식품의약품안전처 블로그"** 등 블로그 헤더 텍스트만 포함된 블록 1개를 생성.

---

## 2. 판정

> **fetchNaverBlogContent — PostView iframe 페이지 fetch가 Cloud Run 환경에서 silent fallback.**
>
> Naver의 PostView URL (`/PostView.naver?...`)에 대해 Cloud Run (GCP Seoul) IP에서 요청했을 때
> `res2.ok === false` 또는 비정상 응답이 반환되고, `if (res2.ok)` 조건이 false가 되어
> `postViewHtml`이 `firstHtml` (2,934 bytes) 로 유지된 채 처리됨.
>
> 에러 로그 없음 — 코드 설계상 `!res2.ok` 분기에 로깅이 없음.

---

## 3. 오류 경로 전체 추적

```
fetchNaverBlogContent(url)
  → fetch(url)                        → 200 OK, firstHtml = 2,934 bytes
  → iframeMatch found                 → PostView URL 추출
  → fetch(postViewUrl, { ctrl2 })     → Cloud Run에서 !res2.ok (또는 비정상 응답)
    → if (res2.ok) { ... }            ← 이 블록 건너뜀 (silent fallback)
    → postViewHtml = firstHtml (2,934 bytes)  ← 업데이트 안 됨

extractNaverBlogText(firstHtml)
  → cclIdx: blog_ccl NOT found → workHtml = firstHtml
  → extractContainerByClass(workHtml, 'se-main-container') → null (first page에 없음)
  → extractContainerByClass(workHtml, 'se-component-wrap') → null
  → extractContainerByClass(workHtml, 'post-view')         → null
  → extractContainerByClass(workHtml, 'post_body')         → null
  → contentCandidates = []
  → lenientContent = []
  → extractContainerById(workHtml, 'postViewArea')         → null
  → extractContainerById(workHtml, 'viewTypeSelector')     → null
  → wrapperCandidates = []
  → return stripHtml(firstHtml)       ← 전체 첫 페이지 HTML strip

stripHtml 결과 ≈ 331 chars:
  "식품의약품안전처 블로그 : 네이버 블로그 var photoContent=... var blogId = 'kfdazzang'..."

AI 입력 (urlText): "식품의약품안전처 블로그" 헤더 텍스트 331자
AI 생성: rawBlocks=1 → afterFilter=1 → final=1
AI 출력: { "type": "o4o/paragraph", "content": "식품의약품안전처 블로그" 관련 텍스트 }

프론트엔드: 블록 1개 표시 ← "본문 대신 헤더만 보임" 증상
```

---

## 4. 증거

### 4-A. promptSize 기반 urlText 길이 역산

Cloud Run 로그 (requestId: `531068e6-9611-4f5a-85c8-052a01cd3880`):

```json
{
  "message": "AI raw content request started",
  "promptSize": 2090,
  "model": "gemini-2.5-flash",
  "timestamp": "2026-05-21 06:54:05"
}
```

- systemPrompt = `buildUrlBlockSystemPrompt('long', tone)` ≈ **1,679 chars**
- userPrompt header (urlText 제외):
  ```
  다음 URL(blog.naver.com)의 텍스트를 O4O 블록 JSON 배열로 변환하세요.\n분량 가이드: long\n=== 추출된 텍스트 ===\n
  ```
  = **~80 chars**
- **urlText.length ≈ 2090 - 1679 - 80 = 331 chars**

정상 PostView HTML (`/PostView.naver?...`)에서 se-main-container 추출 시: **1,097 chars** (로컬 확인)

→ 서버가 처리한 urlText(331자) ≠ 정상 PostView 추출값(1,097자) — **약 3배 차이**

### 4-B. firstHtml strip 재현

로컬에서 `firstHtml` (2,934 bytes) 를 단순 strip:
```
식품의약품안전처 블로그 : 네이버 블로그 var photoContent=""; var postContent=""; ...
```

→ 서버가 생성한 블록 내용("식품의약품안전처 블로그")과 **정확히 일치**

### 4-C. 로컬 PostView fetch 정상 확인

```
PostView URL: https://blog.naver.com/PostView.naver?blogId=kfdazzang&logNo=...
로컬 결과: 200 OK, 79ms, 205,106 bytes, se-main-container 존재
```

동일 User-Agent(`Mozilla/5.0 (compatible; O4O-AI-Bot/1.0)`)와 Accept 헤더로 로컬에서는 정상 작동.

### 4-D. 서버 로그 에러 없음

```
[url-to-blocks] 시작  → 06:54:04
AI raw content request started → 06:54:05 (1초 이내)
[url-to-blocks] 완료  → rawBlocks:1, afterFilter:1, final:1
```

에러/경고 로그 없음. `!res2.ok` 분기에 로깅 없으므로 실패 여부 서버 측에서 관측 불가.

---

## 5. 근본 원인 — 코드 레벨

### 5-A. Silent fallback 코드 (lines 564-574)

```typescript
const ctrl2 = new AbortController();
const t2 = setTimeout(() => ctrl2.abort(), 12000);
try {
  const res2 = await fetch(postViewUrl, { ...fetchOpts, signal: ctrl2.signal });
  if (res2.ok) {          // ← res2.ok === false 시 아무것도 안 함
    postViewHtml = await res2.text();
    resolvedTitle = extractHtmlTitle(postViewHtml) || resolvedTitle;
  }
  // ← !res2.ok 분기: 에러 로그 없음, postViewHtml = firstHtml 유지
} finally {
  clearTimeout(t2);
}
```

**문제:** `if (res2.ok)` 조건이 false가 되면:
1. 에러 로그가 남지 않는다
2. `postViewHtml`이 `firstHtml`로 유지된다 (silent degradation)
3. 사용자/운영자가 원인을 추적할 수 없다

### 5-B. Cloud Run 환경에서 Naver PostView fetch 실패 원인 (추정)

로컬(한국 일반 IP) vs Cloud Run(GCP Seoul 데이터센터 IP) 차이:

| 시나리오 | 설명 |
|---------|------|
| **A. GCP IP 범위 차단** | Naver가 GCP 데이터센터 IP 대역을 크롤러/봇으로 판단, PostView 응답 차단 (403/302) |
| **B. Bot UA 차단** | `O4O-AI-Bot/1.0` UA를 GCP IP에서 감지 시 차단 — 로컬은 같은 UA라도 허용 |
| **C. 세션 쿠키 없음** | PostView는 Naver 로그인 세션 없이 GCP IP에서 접근 시 다른 응답 반환 |
| **D. iframe 컨텍스트 없음** | `Referer` 없이 PostView 직접 접근 시 빈 응답 또는 리디렉션 |

현재 `fetchOpts`에 `Referer` 헤더 없음:
```typescript
const fetchOpts = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; O4O-AI-Bot/1.0)',
    'Accept': 'text/html,application/xhtml+xml,text/plain',
    // Referer 없음 ← iframe embedded context 시뮬레이션 부족
  },
};
```

---

## 6. 판정 매트릭스

| 원인 | 위치 | 위험도 |
|------|------|:------:|
| **PostView fetch silent fallback** | `fetchNaverBlogContent` L568-571 | CRITICAL |
| **!res2.ok 에러 로그 없음** | `fetchNaverBlogContent` L568-571 | HIGH |
| Cloud Run GCP IP → Naver 차단/리디렉션 | 외부 (Naver 서버 정책) | HIGH |
| Referer 헤더 없음 (iframe 컨텍스트 미모방) | `fetchOpts` | MED |

---

## 7. 수정 방향 (후속 WO 참조용)

### 수정 1 — !res2.ok 에러 로깅 추가 (필수)

```typescript
const res2 = await fetch(postViewUrl, { ...fetchOpts, signal: ctrl2.signal });
if (res2.ok) {
  postViewHtml = await res2.text();
  resolvedTitle = extractHtmlTitle(postViewHtml) || resolvedTitle;
} else {
  // ← 추가: 에러 로그
  logger.warn('[fetchNaverBlogContent] PostView fetch 비정상 응답', {
    status: res2.status,
    postViewUrl: postViewUrl.slice(0, 100),
  });
}
```

→ 이 로그로 Cloud Run 환경에서의 실제 HTTP status 확인 가능.

### 수정 2 — Referer 헤더 추가 (MED)

PostView는 블로그 첫 페이지 iframe에서 로드되는 구조. Referer를 모방하면
Naver가 정상 요청으로 판단할 가능성 있음:

```typescript
const iframeReferer = `https://blog.naver.com/${blogId}`;  // 첫 페이지 URL

const res2 = await fetch(postViewUrl, {
  headers: {
    ...fetchOpts.headers,
    'Referer': iframeReferer,
  },
  signal: ctrl2.signal,
});
```

### 수정 3 — PostView 실패 시 명시적 에러 처리 (HIGH)

현재: silent fallback → 사용자에게 잘못된 콘텐츠 제공
대안: PostView 실패를 오류로 처리하여 사용자에게 명확한 메시지 제공:

```typescript
if (!res2.ok) {
  throw new Error(`네이버 블로그 PostView fetch 실패: ${res2.status}`);
}
```

→ `catch (fetchError)` 블록이 처리하여 `422 { error: 'URL 콘텐츠를 가져올 수 없습니다' }` 반환.
→ 잘못된 콘텐츠 대신 명확한 실패 메시지 제공.

---

## 8. 후속 WO 제안

```
WO-O4O-AI-NAVER-BLOG-POSTVIEW-SILENT-FALLBACK-FIX-V1

수정:
1. !res2.ok 분기에 logger.warn 추가 (Cloud Run에서 Naver PostView 차단 여부 관측)
2. Referer 헤더 추가 (iframe embedded context 모방)
3. 로그 확인 후 실패 시 throw로 전환 (silent fallback 제거)

수정 파일: 1개 (ai-proxy.routes.ts)
수정 함수: fetchNaverBlogContent (약 5줄)
예상 소요: 20분 이내
```

---

## 9. 종합 결론

| 구분 | 결과 |
|------|------|
| 오류 발생 단계 | `fetchNaverBlogContent` — PostView fetch silent fallback |
| 원인 | Cloud Run GCP Seoul IP에서 Naver PostView 요청 → `!res2.ok` → silent degradation |
| 확인 근거 | `promptSize:2090` → urlText≈331자, firstHtml strip = "식품의약품안전처 블로그" (증상 일치) |
| 미관측 원인 | `!res2.ok` 분기에 에러 로그 없음 → 실제 HTTP status 불명 |
| 즉시 HIGH | `!res2.ok` 에러 로그 추가 (관측 가능화) |
| 즉시 MED | Referer 헤더 추가 (Naver iframe context 모방) |
| 미확정 | Cloud Run IP 차단 여부 — 에러 로그 추가 후 배포·테스트로 확인 필요 |
