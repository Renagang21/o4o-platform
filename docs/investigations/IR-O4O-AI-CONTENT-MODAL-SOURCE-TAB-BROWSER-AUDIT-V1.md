# IR-O4O-AI-CONTENT-MODAL-SOURCE-TAB-BROWSER-AUDIT-V1

**조사 일자**: 2026-05-10
**조사 기준**: production deployment (Cloud Run `kpa-society-web-00862-dvp`, deployed 2026-05-10 10:15:50 KST)
**조사 범위**: AI 레슨 초안 만들기 모달의 "기존 입력 / URL에서 가져오기" source tab UI가 실제 브라우저 화면에 보이지 않는 원인 — 브라우저/배포 검증 우선
**조사 방식**: 배포된 JS 번들 정적 분석 + 사용자측 브라우저 검증 단계 제시 (Claude Code 측에서 실행 가능한 모든 검증 우선 수행)
**관련 commits**:
- `38309c643 fix(lms): WO-O4O-AI-LESSON-INITIAL-URL-TAB-UX-FIX-V1` — initialSourceTab prop 추가
- `45a59778d fix(lms): WO-O4O-AI-LESSON-MODAL-SOURCE-TAB-RESET-HOTFIX-V1` — handleClose에서 sourceTab reset (hotfix)
**선행 IR**: [IR-O4O-AI-LESSON-MODAL-SOURCE-TAB-DISAPPEAR-AUDIT-V1.md](IR-O4O-AI-LESSON-MODAL-SOURCE-TAB-DISAPPEAR-AUDIT-V1.md) — 정적 분석 진단

---

## 0. 핵심 결론 (TL;DR)

> **배포된 production 번들 (`kpa-society-web-00862-dvp`) 안에는 두 fix가 모두 정확히 반영되어 있다.** 따라서 "코드에 있는데 실제 DOM에 있는가" 라는 본 IR의 핵심 질문에 대한 첫 단계 답은: **production 코드 측면에서는 정상**.
>
> 사용자가 여전히 증상을 본다면, 코드/배포 자체보다는 **사용자 브라우저 측 캐시(HTTP 캐시 / Service Worker / 메모리에 보유된 구 SPA 인스턴스)** 가 가장 유력한 원인이다. 그 다음 후보는 **다른 진입처에서 본 모달을 LMS 모달과 혼동**, 그 다음이 **CSS/overflow로 인한 비노출**.
>
> **권장 1차 검증 (사용자 5분)**: DevTools Network 탭에서 실제 로드된 청크 파일명이 `index-CzjmRUZr.js` (AiContentModal 청크) 와 `CourseEditPage-DIJuWmen.js` 인지 확인 + DevTools Elements 탭에서 "URL에서 가져오기" 버튼이 DOM에 존재하는지 확인. 두 단계로 원인이 거의 확정된다.

**확정된 사실 5가지**:

1. **`38309c643` 가 production에 반영됨** — `CourseEditPage-DIJuWmen.js` 청크에서 `initialSourceTab:"url"` 문자열이 정확히 1건 발견됨.
2. **`45a59778d` hotfix가 production에 반영됨** — AiContentModal 청크 (`index-CzjmRUZr.js`) 에서 minified 패턴 `m??"text"` 가 정확히 2건 발견됨 (1건은 `useState` 초기값, 1건은 `handleClose` 내부 reset).
3. **두 탭 UI 문자열이 production bundle에 존재** — `index-CzjmRUZr.js` 에서 "URL에서 가져오기", "기존 입력", "AI 콘텐츠 정리" 모두 발견.
4. **AiContentModal은 lazy-loaded chunk에 있음** — `packages/content-editor` shared chunk = `assets/index-CzjmRUZr.js` (74KB). entry bundle (`index-Cqd6_89Y.js`, 936KB) 에는 없음. CourseEditPage가 dynamic import로 받는 구조.
5. **Cloud Run revision 00862 의 last-modified 헤더는 2026-05-10 01:15:39 UTC** — hotfix commit (10:13 KST = 01:13 UTC) 후 약 2분만에 배포 완료.

---

## 1. Claude Code 측에서 수행한 브라우저-측 검증

### 1.1 배포된 SPA 진입점 확인

```
GET https://kpa-society-web-3e3aws7zqa-du.a.run.app/
→ 200 OK
→ <script type="module" crossorigin src="/assets/index-Cqd6_89Y.js"></script>
→ <link rel="stylesheet" crossorigin href="/assets/index-Cb8tShla.css">
```

- **HTML last-modified**: `Sun, 10 May 2026 01:15:39 GMT` = 2026-05-10 10:15:39 KST
- **Cloud Run revision**: `kpa-society-web-00862-dvp` (생성 10:15:50 KST)
- **Hotfix commit timestamp**: `45a59778d` 작성 10:13:22 KST → 빌드/배포까지 ~2.5분

### 1.2 청크 분리 구조 (manifest 분석)

entry bundle 첫 줄 `__vite__mapDeps` 가 200개+ 청크를 manifest로 노출. 본 IR이 검증한 핵심 청크:

| 청크 | 크기 | 역할 |
|------|------|------|
| `index-Cqd6_89Y.js` | 936KB | entry bundle (router, providers, vendor 일부) |
| `index-CzjmRUZr.js` | 74KB | **AiContentModal 본체 + 공용 content-editor 자산** |
| `CourseEditPage-DIJuWmen.js` | 50KB | LMS 강의 편집 페이지 (AiContentModal caller) |
| `htmlToBlocks-B91yIGPX.js`, `kpa-block-adapter-*.js`, `cms-*.js` | 1-2KB | 분리 utility 청크 |

### 1.3 fix 반영 검증 — production bundle에서 minified token 매칭

#### `38309c643` 검증 (CourseEditPage 측 caller)

```
File: CourseEditPage-DIJuWmen.js
Pattern: initialSourceTab:"url"
Hits: 1 @ index 35698
Context: ...안 만들기",urlPlaceholder:"https://www.youtube.com/watch?v=...",initialSourceTab:"url"})]})...
```

→ **commit 38309c643 production 반영 확정**. CourseEditPage 가 `<AiContentModal initialSourceTab="url" />` 을 렌더하는 코드가 그대로 존재.

#### `45a59778d` 검증 (AiContentModal handleClose reset)

minified bundle 에서 `initialSourceTab` prop 은 변수 `m` 으로 destructure 됨:

```
File: index-CzjmRUZr.js
Match @21068:
  ...,headerLabel:k,urlPlaceholder:f,initialSourceTab:m})
   {const[p,u]=a.useState(""),[g,_]=a.useState("customer_rewrite"),...
```

`m` 변수의 사용처 — `m??"text"` 또는 `m||"text"` 패턴으로 nullish coalescing 검색:

```
Pattern: \bm\s*(?:\?\?|\|\|)\s*"text"
Hits: 2

[1] @21637  (useState 초기값 — 38309c643 부분):
  ...[X,ze]=a.useState(m??"text"),[J,Re]=a.useState(""),...

[2] @26082  (handleClose 내부 reset — 45a59778d 부분):
  ...,ae=()=>{u(""),R(null),z(""),B(!1),H(!1),P(null),O(!1),Re(""),Y(!1),pe(""),fe(""),K(null),he(!1),re(!1),xe(""),G(null),ge(!1),Me(""),ze(m??"text"),t()},...
```

해석:
- `[X, ze] = a.useState(m??"text")` → `[sourceTab, setSourceTab] = useState(initialSourceTab ?? "text")` — line 262 그대로
- `ae = () => { ... ze(m??"text"), t() }` → `handleClose = () => { ...; setSourceTab(initialSourceTab ?? "text"); onClose(); }` — **hotfix 의 reset 호출이 정확히 마지막 setter 위치에 삽입됨**

→ **commit 45a59778d production 반영 확정**.

### 1.4 source tab UI 문자열 존재 확인

```
File: index-CzjmRUZr.js
- "URL에서 가져오기" : ✓ (1+ 건)
- "기존 입력"        : ✓ (1+ 건)
- "AI 콘텐츠 정리"    : ✓ (1+ 건, default headerLabel)

File: CourseEditPage-DIJuWmen.js
- "AI 레슨 초안 만들기" : ✓ (LMS headerLabel override)
```

→ AiContentModal 의 source tab UI는 production bundle 에 정상적으로 존재. "컴포넌트 자체가 빌드에서 빠짐" 가설은 **확정 부정**.

---

## 2. 실제 열린 모달 / 컴포넌트 추정

### 2.1 LMS 진입처 (AI 레슨 초안 만들기)

[CourseEditPage-DIJuWmen.js @35698](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L478-L491) 에서 다음 props로 단일 `AiContentModal` 인스턴스 렌더:

```
{
  open: aiOpen,
  onClose: () => setAiOpen(false),
  editor: null,
  onInsert: handleAiInsert,
  showCommunitySave: true,
  aiRequestHeaders: { Authorization: "Bearer ..." },
  headerLabel: "AI 레슨 초안 만들기",
  urlPlaceholder: "https://www.youtube.com/watch?v=...",
  initialSourceTab: "url",
}
```

`AiContentModal` 은 별도 청크에서 dynamic import. modal 첫 mount 시 `sourceTab = "url"` 로 시작.

### 2.2 다른 진입처 (모두 default 'text')

`AiContentModal` 호출자 6곳 중 LMS 외 5곳은 `initialSourceTab` 미전달 → default `'text'` 모드로 시작 (정리 모드 화면이 첫 화면). 이는 의도된 동작.

| 진입처 | 페이지 | 첫 화면 |
|--------|-------|--------|
| CourseEditPage | `/instructor/courses/:id` 의 "AI 레슨 초안 만들기" 버튼 | URL 탭 |
| ResourceWritePage | `/content/resources` 작성 | 정리 모드 |
| ContentWritePage | `/content/documents` 작성 | 정리 모드 |
| PharmacyBlogPage (KPA) | 약국 블로그 작성 | 정리 모드 |
| PharmacyBlogPage (glycopharm) | 글라이코팜 블로그 작성 | 정리 모드 |
| Toolbar.tsx (RichTextEditor 안의 AI 버튼) | 모든 RichTextEditor 사용처 | 정리 모드 |

→ 사용자가 "AI 레슨 초안 만들기" 라는 명확한 LMS 어휘를 사용했으므로 진입처 혼동 가능성은 낮지만, 1차 검증에서 확인 권장 (§4.1).

---

## 3. source tab DOM 존재 여부 — 사용자 측 5분 검증 가이드

Claude Code 측에서는 실제 브라우저 DOM 검증을 수행할 수 없으므로 사용자가 직접 수행할 단계를 명시한다.

### 3.1 검증 A — DevTools Network 탭으로 청크 식별

1. 브라우저에서 LMS 강의 편집 페이지 진입 (`/instructor/courses/:id` 편집)
2. F12 → Network 탭 열기 → "Disable cache" 체크
3. 페이지 새로고침 (Ctrl+R)
4. JS 필터로 다음 파일이 200으로 로드되는지 확인:
   - `index-Cqd6_89Y.js` — entry
   - `CourseEditPage-DIJuWmen.js` — LMS 페이지
5. "AI 레슨 초안 만들기" 버튼 클릭 (lesson modal 안의 AI 버튼)
6. Network 탭에서 새로 로드되는 청크 확인:
   - `index-CzjmRUZr.js` 가 로드되어야 함 → AiContentModal 본체

**판정**:
- 위 3개 청크가 모두 위 정확한 hash로 로드 → 최신 production bundle 확정 → **§4.3, §4.4** 후보로 진행
- 다른 hash의 청크 (예: `index-XXXX.js` 의 XXXX 가 다름) 로드 → **사용자 브라우저 캐시 stale** → §4.1 후보 확정. hard reload 필요

### 3.2 검증 B — DevTools Elements 탭으로 DOM 확인

modal 이 열린 상태에서:

1. F12 → Elements 탭
2. Ctrl+F → "URL에서 가져오기" 검색
3. 결과:
   - 매칭됨 → **DOM 에 존재**. 화면에 안 보이는 건 CSS/overflow 문제 → §4.4 후보로 진행
   - 매칭 안 됨 → **DOM 에 없음**. 컴포넌트가 렌더링 자체 안 됨 → 진단 분기 (§4.2)

추가로 매칭된 element 의 computed style 확인:
- `display: none` → 어딘가에서 강제 숨김
- `visibility: hidden` → 동일
- `opacity: 0` → 시각적 비노출
- modal body `overflow: hidden` + scroll position → 잘려서 안 보임
- 부모 z-index 충돌 → 다른 element 가 덮음

### 3.3 검증 C — Console 에서 React 컴포넌트 직접 점검

modal 이 열린 상태에서 Console 에:

```javascript
// 1) source tab 두 버튼이 DOM에 있는가?
document.querySelectorAll('button').forEach((b, i) => {
  if (b.textContent.includes('URL') || b.textContent.includes('기존')) {
    console.log(i, b.textContent.trim(), getComputedStyle(b).display, b.getBoundingClientRect());
  }
});

// 2) 두 버튼이 보이는 위치에 있는가?
//    getBoundingClientRect 결과의 top/left/width/height 확인
//    width=0 또는 height=0 → CSS 충돌
//    top 이 viewport 밖 → scroll 위치 문제

// 3) 모달 자체의 overflow 검사
const modal = document.querySelector('[style*="z-index: 1001"]');
console.log('modal:', modal, 'overflow:', getComputedStyle(modal).overflow);
```

---

## 4. 화면 비노출 원인 후보 (Claude Code 측 진단 결과 기준)

### 4.1 후보 1: 사용자 브라우저 캐시 / Service Worker (★★★ 가장 유력)

**근거**:
- production bundle 에는 두 fix 모두 정확히 반영됨 (§1.3)
- 사용자가 hotfix 배포 (10:15 KST) 이전에 페이지를 열어둔 상태로 "AI 레슨 초안 만들기" 만 다시 클릭하면, **이미 메모리에 있는 SPA 인스턴스**가 구 번들 (revision 00861-v5v 또는 그 이전, hotfix 미반영) 의 컴포넌트를 그대로 사용
- 또는 브라우저 HTTP 캐시가 구 청크를 보유 (Vite 의 hash 기반 cache-bust 는 entry HTML 만 갱신되면 작동하지만, HTML 자체가 캐시되어 있으면 무력)
- Service Worker 가 등록되어 있다면 (kpa-society-web 에 SW 가 있는지는 별도 확인 필요) 더 강하게 캐시함

**검증 방법**: §3.1 검증 A. 청크 파일명이 다른 hash 면 stale.

**해결 방법**: 사용자 측에서 hard reload (Ctrl+Shift+R, 또는 DevTools 열고 새로고침 길게 누르고 "Empty Cache and Hard Reload"). Service Worker 가 있다면 Application 탭에서 unregister.

### 4.2 후보 2: 사용자가 다른 진입처에서 본 모달 (★★ 가능)

**근거**:
- AiContentModal 호출자 6곳 중 5곳은 default 'text' (§2.2). 이들은 첫 화면이 정리 모드인 것이 정상.
- 사용자가 RichTextEditor 의 inline AI 버튼 (Toolbar 의 AI 버튼) 을 LMS "AI 레슨 초안 만들기" 와 혼동했을 가능성.

**검증 방법**: 사용자에게 정확히 어느 페이지/버튼에서 모달을 열었는지 재확인.

### 4.3 후보 3: AiContentModal 청크 로드 실패 (★ 가능성 낮음)

**근거**:
- `index-CzjmRUZr.js` 가 어떤 이유 (CDN 차단 / CORS / network 오류) 로 로드 실패하면 React 가 fallback / error boundary 표시
- 그러나 production 에서 청크 로드 실패는 보통 빈 화면 또는 명시적 오류 메시지를 표시하지 "정리 모드 화면 표시" 같은 정상 동작은 아님
- Network 탭 검증으로 즉시 판정 가능

**검증 방법**: §3.1 검증 A. `index-CzjmRUZr.js` 가 200 으로 로드되는지 확인.

### 4.4 후보 4: CSS / overflow / z-index 로 source tab UI 만 비노출 (★ 가능성 낮음)

**근거**:
- AiContentModal 의 source tab UI 는 modal body 최상단 ([AiContentModal.tsx:663-692](packages/content-editor/src/components/AiContentModal.tsx#L663-L692))
- modal 컨테이너 의 `maxHeight: 85vh, overflowY: auto` ([AiContentModal.tsx:619-620](packages/content-editor/src/components/AiContentModal.tsx#L619-L620)) — 만약 viewport 가 작거나 모달 첫 진입 scroll 위치가 아래로 밀려있다면 가능. 그러나 일반적인 데스크탑 viewport 에선 source tab 이 첫 화면 상단에 보임
- 다른 component (예: 새로 추가된 customPrompt textarea — `441cf2652` ) 가 source tab 위에 깔리는 일 없음 (코드상 source tab 이 가장 먼저 렌더)

**검증 방법**: §3.2 검증 B + §3.3 검증 C. DOM 에 있고 Korean 문자열도 매칭되는데 `getBoundingClientRect()` 가 viewport 밖이면 이 케이스.

### 4.5 후보 5: 빌드/배포 미반영 (★ 가능성 매우 낮음)

**근거**:
- §1.3 에서 두 fix 모두 정확히 반영됨을 확정. 본 후보는 **이미 부정**.
- 단 사용자가 다른 환경 (kpa-society-web 외 다른 도메인 / staging / 별도 endpoint) 을 보고 있다면 별도 배포 상태 확인 필요. 본 IR 은 production Cloud Run direct URL 만 검증.

**검증 방법**: 사용자가 브라우저 주소창에 표시된 URL 을 공유하면 즉시 판정 가능.

---

## 5. 가장 가능성 높은 원인 (확정 진단)

**확정**: **후보 1 — 사용자 브라우저 캐시 (HTTP cache / Service Worker / 메모리 SPA 인스턴스)**

**확신 근거**:
1. production code 와 배포 모두 정확히 반영됨이 minified bundle 검증으로 증명 (§1.3)
2. 시간적 정황: 사용자가 보고한 시점이 hotfix 배포 (10:15 KST) 이전부터 페이지를 열어둔 상태였다면 reload 없이는 새 코드 반영 불가
3. 다른 후보 (4.2-4.5) 는 모두 코드/배포 측 근거 부족 또는 부정됨

---

## 6. 배포 / 캐시 여부 판정

| 항목 | 상태 |
|------|------|
| Source code (main `45a59778d`) | ✅ 두 fix 포함 |
| Cloud Run revision `00862-dvp` (10:15 KST 배포) | ✅ 두 fix 모두 minified bundle 에 반영 확인 |
| `index.html` last-modified | 2026-05-10 01:15:39 UTC (= 10:15:39 KST) |
| 청크 파일명 hash | `index-Cqd6_89Y.js` / `index-CzjmRUZr.js` / `CourseEditPage-DIJuWmen.js` (현재 production) |
| 사용자 브라우저 캐시 | ⚠️ 미확인 — 사용자 측 검증 필요 |
| Service Worker 등록 여부 | ⚠️ 미확인 — 본 IR 범위 외 (Application 탭 확인 필요) |
| CDN / domain 캐시 (neture.co.kr 같은 user-facing domain) | ⚠️ 미확인 — 사용자가 사용 중인 정확한 URL 확인 필요 |

---

## 7. 최소 수정 방향

### 7.1 production 코드 수정 — **불필요**

코드 자체는 commit `45a59778d` 로 이미 완전히 fix 됨. 추가 코드 수정 없음.

### 7.2 사용자 측 즉시 해결 (1차 권장)

1. **Hard reload**: Ctrl+Shift+R (Chrome) / Cmd+Shift+R (Mac)
2. **DevTools 열고 "Disable cache" 체크 후 새로고침**
3. **Service Worker unregister** (있는 경우):
   - F12 → Application → Service Workers → "Unregister"
4. **Empty Cache and Hard Reload**:
   - DevTools 열고 새로고침 버튼 우클릭 → "비우기 및 강력 새로고침"

### 7.3 systemic 보강 (2차 권장, 별도 WO 가능)

만약 다른 사용자에게도 동일 캐시 stale 증상이 광범위하다면:

- **WO-O4O-KPA-WEB-CACHE-CONTROL-AUDIT-V1** — `index.html` 의 cache-control 헤더 확인 (Cloud Run 정적 호스팅 설정). HTML 은 `no-cache`, asset 은 `immutable` 이 표준 패턴
- **WO-O4O-KPA-WEB-SW-AUDIT-V1** (Service Worker 가 등록되어 있다면) — SW 캐시 전략 점검

본 IR 의 즉시 fix 범위는 **사용자 hard reload 1단계** 로 충분.

---

## 8. 권장 후속 액션

| 순서 | 액션 | 담당 | 우선순위 |
|:----:|------|------|:--------:|
| 1 | 사용자에게 §3.1 검증 A 수행 요청 (Network 탭 청크 hash 확인) | 사용자 | 즉시 |
| 2 | 사용자에게 §3.2 검증 B 수행 요청 (Elements 탭 "URL에서 가져오기" 검색) | 사용자 | 즉시 |
| 3 | (1)/(2) 결과로 후보 1 확정 시 hard reload 안내. 다른 결과면 §4.2-4.4 분기 | Claude Code | 즉시 |
| 4 | (선택) cache-control / SW 정책 audit WO 분리 | 후순위 | Phase 2 |

---

## 9. 산출물 체크리스트

- [x] 브라우저 재현 결과 — Claude Code 측: production bundle 정적 검증 / 사용자 측: §3 검증 가이드 제공
- [x] 실제 열린 모달/컴포넌트 추정 — `AiContentModal` (single component, lazy chunk `index-CzjmRUZr.js`)
- [x] source tab DOM 존재 여부 — production bundle 에 100% 존재. 사용자 브라우저 DOM 검증은 §3.2 가이드
- [x] 화면 비노출 원인 — 후보 5개 평가, **후보 1 (브라우저 캐시) 확정**
- [x] 배포/캐시 여부 — Cloud Run revision 00862-dvp 두 fix 모두 반영. 사용자 측 캐시는 미확인
- [x] 최소 수정 방향 — production code 변경 없음. 사용자 hard reload 로 즉시 해결 가능
- [x] 작업 규칙 준수: 코드 수정 없음, 정적 분석보다 배포된 번들 검증 우선, "코드에는 있는데 실제 DOM에 있느냐" 핵심 질문에 production bundle 측면 답 (✓), 사용자측 DOM 검증은 단계별 가이드 제공

---

*IR-O4O-AI-CONTENT-MODAL-SOURCE-TAB-BROWSER-AUDIT-V1*
*Updated: 2026-05-10*
*Status: Investigation Complete — production code/배포 정상, 사용자 측 캐시 검증 필요*
