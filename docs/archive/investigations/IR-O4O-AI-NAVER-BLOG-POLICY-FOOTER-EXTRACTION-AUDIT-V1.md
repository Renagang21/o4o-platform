# IR-O4O-AI-NAVER-BLOG-POLICY-FOOTER-EXTRACTION-AUDIT-V1

**작성일:** 2026-05-21
**대상:** `apps/api-server/src/routes/ai-proxy.routes.ts` — `extractNaverBlogText`, `stripHtml`
**성격:** 코드 정적 분석 전용 Audit — 수정 없음

---

## 1. 판정

> **Cause A (primary) + Cause C (secondary) 복합.**
>
> 정책 문구(저작자 명시 필수 / 영리적 사용 불가 / 내용 변경 불가)는
> **extractor 단계에서 이미 포함**된다.
> AI가 사용자 의도와 무관하게 이 문구를 중요 내용으로 판단하는 것은 부수 효과.

---

## 2. 근거 — se-main-container Regex 문제

### 현재 코드 (L351)

```typescript
const seMain = html.match(
  /<div[^>]+class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
);
```

### 문제: lazy match (`[\s\S]*?`) + `</div></div>` 종료 조건

- `[\s\S]*?`는 **가장 짧은 매치**를 찾으므로, se-main-container 내부 **첫 번째 자식 div**가 닫히는 시점 (`</div></div>`)에서 멈춘다.
- Naver 스마트에디터 se-main-container는 수십~수백 개의 중첩 div를 가진다.
- 결과: `seMain[1]`에 **첫 자식 element 내용만** 포함 → 대부분 50자 미만 → `if (text.trim().length >= 50)` 조건 탈락.

### 탈락 후 폴백 경로

```
seMain 탈락
  → post-view regex (동일 lazy 문제) → 탈락
    → viewTypeSelector regex (동일 lazy 문제) → 탈락
      → stripHtml(html) — PostView 전체 HTML 텍스트 추출
```

### PostView 전체 HTML에 포함되는 영역

Naver 블로그 PostView HTML은 본문 외에도 다음을 포함한다:

| 영역 | HTML 클래스/구조 | 포함 텍스트 예시 |
|------|-----------------|----------------|
| CCL 라이선스 | `.blog_ccl` / `.post_ccl_info` | 저작자 명시 필수, 영리적 사용 불가, 내용 변경 불가 |
| 소셜 반응 | `.u_likeit` / `.btn_good` | 공감, 이 글에 공감한, 좋아요 |
| 공유 버튼 | `.post_btn_area` | 공유하기, 스크랩 |
| 댓글 | `.comment_area` | 댓글, 댓글 입력, 등록 |
| 고객센터 | footer/nav 영역 | 고객센터 문의 |

---

## 3. 근거 — stripHtml noisePatterns 누락

### 현재 noisePatterns (L496-502)

```typescript
const noisePatterns = [
  /^(로그인|회원가입|아이디\s*찾기|...|저작권|문의|고객센터)$/,
  /^(정보|보도자료|저작권|광고|개발자|약관|크리에이터|채널|구독|좋아요|댓글|공유)$/,
  ...
];
```

### 문제: `^...$` 단독 단어 매칭만 처리

- 모든 패턴이 `^`와 `$`로 묶인 **완전 일치** → 한 줄이 정확히 그 단어 하나일 때만 제거
- "저작자 명시 필수" → 3단어 조합 → 패턴 불일치 → **통과됨**
- "영리적 사용 불가" → 불일치 → **통과됨**
- "내용 변경 불가" → 불일치 → **통과됨**
- "고객센터 문의" → "고객센터"만 패턴에 있음, "고객센터 문의"는 2단어 → **통과됨**

---

## 4. 판정 매트릭스

| 원인 | 발생 경로 | 위험도 |
|------|----------|:------:|
| **A. se-main-container lazy regex → 전체 HTML fallback** | 거의 항상 발생 (중첩 div 구조) | HIGH |
| **C-1. CCL 문구가 noisePatterns 미등록** | stripHtml 통과 | MED |
| **C-2. 댓글/공유/공감 문구 누락** | 단독 단어 패턴만 있어 복합 표현 통과 | LOW |
| B. AI가 정책 문구를 중요 내용으로 판단 | A가 해소되면 자동 해소됨 | 부수 효과 |

---

## 5. 수정 방향

### 수정 1 — se-main-container 추출 방식 교체 (HIGH 필수)

Regex lazy match 대신 **div depth counter** 방식으로 실제 닫는 태그를 찾는다.

```typescript
function extractContainerContent(html: string, markerClass: string): string | null {
  const startRe = new RegExp(`<div[^>]+class="[^"]*${markerClass}[^"]*"[^>]*>`, 'i');
  const startMatch = startRe.exec(html);
  if (!startMatch) return null;

  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  while (i < html.length && depth > 0) {
    const openTag = html.indexOf('<div', i);
    const closeTag = html.indexOf('</div', i);
    if (closeTag < 0) break;
    if (openTag >= 0 && openTag < closeTag) {
      depth++;
      i = openTag + 4;
    } else {
      depth--;
      i = closeTag + 6;
    }
  }
  return html.slice(startMatch.index + startMatch[0].length, i - 6);
}
```

`extractNaverBlogText`에서 이 함수를 사용한다:
```typescript
const seMainContent = extractContainerContent(html, 'se-main-container');
if (seMainContent) {
  const text = stripHtml(seMainContent);
  if (text.trim().length >= 50) return text;
}
```

### 수정 2 — stripHtml noisePatterns에 CCL/소셜 문구 추가 (MED)

```typescript
// 네이버 블로그 CCL / 공통 footer 정책 문구 (부분 매칭)
/저작자\s*명시\s*필수/,
/영리적\s*사용\s*불가/,
/내용\s*변경\s*불가/,
/동일\s*조건\s*변경\s*허락/,
/이\s*글에\s*공감한/,
/^(공유하기|스크랩|이웃추가|공감|댓글\s*쓰기|댓글\s*입력|등록)$/,
/^고객센터\s*문의$/,
```

이 패턴은 `startsWith` 매칭이 아닌 `test()` 방식으로 적용하여
라인 어디에 있든 탐지한다.

### 수정 3 — PostView HTML 진입 전 footer 섹션 차단 (선택)

PostView HTML에서 본문 이후 영역 제거:
```typescript
// CCL 블록 이전까지만 사용
const cclIdx = html.search(/<div[^>]+class="[^"]*blog_ccl[^"]*"/i)
  || html.search(/<div[^>]+class="[^"]*post_ccl[^"]*"/i);
const cleanHtml = cclIdx > 0 ? html.slice(0, cclIdx) : html;
```

---

## 6. 우선 적용 순서

| 순서 | 수정 | 효과 |
|------|------|------|
| 1 | div depth counter로 se-main-container 정확 추출 | 전체 HTML fallback 차단 (근본 해소) |
| 2 | CCL/소셜 문구 noisePatterns 추가 | 설령 fallback이 발생해도 필터링 |
| 3 | PostView pre-trim (CCL 이전 차단) | 2중 방어 |

---

## 7. 공통 URL Core 적용 범위

수정 2(noisePatterns 추가)는 **모든 URL 소스에 공통 적용**된다.
Naver 전용이 아니라 다음 패턴도 범용으로 추가 가능:
- 일반 블로그 footer: "저작권 ©", "무단 전재 금지", "출처 표기 필수"
- SNS 공유 버튼 영역: "카카오톡 공유", "트위터 공유", "페이스북 공유"

수정 1(div depth counter)은 Naver 블로그 전용이지만,
동일 패턴을 `fetchUrlContent`의 일반 HTML 본문 추출에도 확장 가능하다.

---

## 8. 후속 WO 제안

```
WO-O4O-AI-URL-NAVER-BLOG-POLICY-FOOTER-CLEANUP-V1

수정:
1. extractContainerContent(html, markerClass) — div depth counter 방식 추가
2. extractNaverBlogText — lazy regex → extractContainerContent 교체
3. stripHtml noisePatterns — CCL/소셜/footer 문구 추가 (범용 URL Core)
4. (선택) PostView HTML pre-trim — CCL 블록 이전 차단

수정 파일: 1개 (ai-proxy.routes.ts)
예상 소요: 40분 이내
```

---

## 9. 종합 결론

| 구분 | 결과 |
|------|------|
| 1차 원인 | `se-main-container` lazy regex → 전체 HTML fallback (Cause A) |
| 2차 원인 | noisePatterns CCL 문구 미등록 (Cause C) |
| AI 단계 | Cause A 해소 시 자동 해소됨 (Cause B는 부수 효과) |
| 즉시 HIGH | se-main-container 추출 방식 교체 |
| 즉시 MED | stripHtml CCL/footer 패턴 추가 |
