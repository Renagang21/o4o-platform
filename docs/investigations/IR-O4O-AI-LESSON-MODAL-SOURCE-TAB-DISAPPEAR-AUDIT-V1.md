# IR-O4O-AI-LESSON-MODAL-SOURCE-TAB-DISAPPEAR-AUDIT-V1

**조사 일자**: 2026-05-10
**조사 기준**: main (`38309c643` 시점)
**조사 범위**: AI 레슨 초안 만들기 모달에서 "콘텐츠 / URL 선택 화면"이 사라지고 정리 모드 화면이 바로 표시되는 원인 조사
**조사 전제**: 직전까지 "콘텐츠/URL 선택 화면"이 정상적으로 보였음. 따라서 컴포넌트 자체 삭제가 아니라 **최근 변경으로 인한 props/상태/조건부 렌더링 격차**를 우선 의심한다.
**조사 방식**: 정적 분석 only, 코드 수정 없음
**관련 commit**: `38309c643 fix(lms): WO-O4O-AI-LESSON-INITIAL-URL-TAB-UX-FIX-V1` (5/10 09:40, 직전 commit)
**관련 IR**: 없음 (신규)

---

## 0. 핵심 결론 (TL;DR)

> **"콘텐츠/URL 선택 화면"은 별도 step screen이 아니라 [AiContentModal.tsx:663-692](packages/content-editor/src/components/AiContentModal.tsx#L663-L692)의 `text` / `url` 두 탭 토글 UI다. 코드상 두 탭은 항상 렌더되고 있으며 삭제된 적 없다.**
>
> 사용자가 보고한 증상("선택 화면이 사라지고 정리 모드가 바로 표시")의 가장 강력한 원인은 **`AiContentModal`이 mount 상태로 유지되는 unconditional 렌더 + `handleClose`가 `sourceTab`을 reset 하지 않음** 의 조합이다. 사용자가 한 번 "기존 입력" 탭을 클릭하면 그 이후 모달을 닫고 다시 열어도 `sourceTab='text'`가 stuck되어 첫 화면이 정리 모드로 표시된다.
>
> 직전 commit `38309c643` 의 의도("URL 탭으로 시작")는 코드상 정확하지만, 그 commit message가 명시한 *"re-mount 시점에만 적용"* 이라는 가정이 실제 호출 사이트에서 성립하지 않는다. `<AiContentModal open={aiOpen} ... />`은 unconditional 렌더이므로 modal close 시에도 component는 unmount되지 않고, `useState<SourceTab>(initialSourceTab ?? 'text')`의 초기값은 첫 mount 한 번만 평가된다.
>
> **권장 최소 수정**: `AiContentModal.handleClose` 에 `setSourceTab(initialSourceTab ?? 'text')` 한 줄 추가. 다른 진입처(default 'text')에는 영향 없음.

**핵심 사실 6가지**:

1. **공용 모달 단일 구조** — `AiContentModal`은 `packages/content-editor` 의 단일 컴포넌트. 별도 `AiLessonDraftModal` / `AiLessonModal` / `AiTransformModal` **존재하지 않음**. LMS 진입은 [CourseEditPage.tsx:478-491](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L478-L491)에서 동일 모달을 props로 LMS 문맥화하여 재사용.
2. **두 탭 UI는 코드상 항상 렌더** — [AiContentModal.tsx:663-692](packages/content-editor/src/components/AiContentModal.tsx#L663-L692)의 source tab 토글은 `sourceTab` 상태와 무관하게 매번 그려진다. "선택 UI 컴포넌트가 삭제됨" 가설은 **부정**.
3. **`initialSourceTab` prop은 직전 commit에서 새로 추가됨** — `38309c643`. default 'text'. LMS 진입처만 'url' 명시 전달.
4. **`AiContentModal`은 항상 mount 상태로 유지** — [CourseEditPage.tsx:478](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L478) 의 `<AiContentModal open={aiOpen} ... />` 패턴은 conditional `{aiOpen && <... />}`이 아니므로 close 시 unmount 되지 않는다. AiContentModal 내부 [`if (!open) return null`](packages/content-editor/src/components/AiContentModal.tsx#L273)은 DOM만 비울 뿐 hooks state는 유지.
5. **`handleClose`가 `sourceTab`을 reset하지 않음** — [AiContentModal.tsx:569-589](packages/content-editor/src/components/AiContentModal.tsx#L569-L589)에 `setInput`, `setUrlInput`, `setResult`, `setCustomPrompt` 등은 reset되지만 **`setSourceTab` 호출 부재**.
6. **commit message 의도와 실제 동작의 mismatch** — commit message: *"사용자가 탭을 전환하면 그 이후로는 사용자 선택을 유지 (re-mount 시점에만 적용)"*. 그러나 호출 사이트가 unmount되지 않으므로 "re-mount 시점"이 실질적으로 발생하지 않음 → 한 번 'text' 전환 시 영구 stuck.

---

## 1. 현재 실제 렌더링 경로

### 1.1 진입 흐름

[CourseEditPage.tsx:478-491](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L478-L491):

```tsx
<AiContentModal
  open={aiOpen}
  onClose={() => setAiOpen(false)}
  editor={null}
  onInsert={handleAiInsert}
  showCommunitySave={true}
  ...
  headerLabel="AI 레슨 초안 만들기"
  urlPlaceholder="https://www.youtube.com/watch?v=..."
  initialSourceTab="url"
/>
```

- "AI 레슨 초안 만들기" 버튼 클릭 → `setAiOpen(true)` → 같은 `<AiContentModal>` 인스턴스의 `open` prop이 `false → true` 로 변경.
- AiContentModal 컴포넌트는 처음부터 mount되어 있고 `open=false`일 때 [`if (!open) return null`](packages/content-editor/src/components/AiContentModal.tsx#L273) 으로 화면만 비움 → hooks state(`sourceTab` 포함) 유지.

### 1.2 `sourceTab` 상태의 생애주기

| 시점 | sourceTab 값 | 이유 |
|------|-------------|------|
| AiContentModal 첫 mount (CourseEditPage 첫 진입) | `'url'` | `useState<SourceTab>(initialSourceTab ?? 'text')`, initialSourceTab='url' |
| 사용자 모달 open → 'url' 화면 보임 | `'url'` | 의도된 동작 |
| 사용자가 "기존 입력" 탭 클릭 | `'text'` | `handleSourceTabChange('text')` → `setSourceTab('text')` |
| 사용자가 모달 닫음 | `'text'` (유지) | handleClose에 setSourceTab 미포함, 컴포넌트 unmount 안 됨 |
| 사용자가 모달 다시 열음 | `'text'` (stuck) | useState 초기값 재평가 안 됨 → '정리 모드 화면이 바로 표시됨' |

### 1.3 실제 보이는 화면 = `sourceTab === 'text'` 분기

[AiContentModal.tsx:730-893](packages/content-editor/src/components/AiContentModal.tsx#L730-L893):
- **모드 선택**: 고객용 정리 / 짧게 요약 / POP용 정리 / 제목 추천 (pill 버튼 4개)
- **원본 텍스트** textarea + "에디터에서 가져오기"
- **톤** (친근함/전문적/간결함) + **분량** (짧게/보통/길게)
- "✨ {모드} 시작" 보라색 버튼

→ 사용자가 묘사한 "정리 모드 화면"과 정확히 일치.

---

## 2. 기대 렌더링 경로

직전 commit `38309c643` 의 의도:

| 시점 | sourceTab 값 | 이유 |
|------|-------------|------|
| 모달 open (매번) | `'url'` | initialSourceTab='url' 적용 |
| 사용자 'text' 전환 | `'text'` | 사용자 선택 |
| 모달 close 후 reopen | `'url'` | **(의도)** initial로 reset |

→ 그러나 현재 코드는 **마지막 단계에서 reset되지 않음**.

---

## 3. 콘텐츠/URL 선택 UI 존재 여부

### 3.1 코드상 위치

[AiContentModal.tsx:663-692](packages/content-editor/src/components/AiContentModal.tsx#L663-L692):

```tsx
{/* Source Tab — 기존 입력 / URL에서 가져오기 */}
<div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
  {(['text', 'url'] as SourceTab[]).map((tab) => (
    <button
      key={tab}
      type="button"
      onClick={() => handleSourceTabChange(tab)}
      style={{ ... }}
    >
      {tab === 'text' ? '기존 입력' : 'URL에서 가져오기'}
    </button>
  ))}
</div>
```

- 두 버튼 ("기존 입력" / "URL에서 가져오기")이 modal body 최상단에 항상 렌더
- 토글 UI는 `sourceTab` 상태와 무관하게 매번 표시

### 3.2 즉, 사용자가 "사라졌다"고 보고한 화면

**가설 A (가장 유력)**: 사용자는 "선택 UI"를 *별도의 첫 step screen* (예: "콘텐츠 가져오기 / URL 가져오기" 두 큰 버튼이 보이는 picker) 로 인식하고 있었다 → 그러나 그런 step screen은 코드 history에 한 번도 존재한 적 없음. 사용자가 본 것은 **`sourceTab='url'`로 시작하던 화면(URL 입력 + 콘텐츠 유형/톤 옵션)** 이었을 가능성이 높음. 즉 "URL 입력 화면을 다시 보게 해주세요" 가 본질 요청.

**가설 B**: 사용자는 두 탭 UI 자체가 보였으나 현재는 안 보인다고 느낀다. 그러나 코드상 두 탭은 sourceTab=text/url 모두에서 동일하게 렌더 → 만약 정말 안 보인다면 빌드 미반영.

→ 두 가설 모두에서 **사용자 입장에서 문제 증상은 동일**: "AI 레슨 초안 만들기" 버튼을 누르면 첫 화면이 'text'(정리 모드)로 보임. 따라서 원인 진단은 동일하게 진행.

---

## 4. 사라진 원인 후보별 근거

### 4.1 후보 1: handleClose에서 sourceTab reset 누락 + unconditional mount (★★★ 매우 유력)

**근거**:
- [AiContentModal.tsx:569-589](packages/content-editor/src/components/AiContentModal.tsx#L569-L589) `handleClose` 본문에 `setSourceTab` 호출 없음:
  ```tsx
  const handleClose = () => {
    setInput('');
    setResult(null);
    setError('');
    setLoading(false);
    setCopied(false);
    setChannelSaveStatus(null);
    setChannelSaving(false);
    setUrlInput('');                  // ← URL 입력은 reset
    setShowCommunitySavePanel(false);
    setCommunityTitle('');
    setCommunityForumId('');
    setCommunitySaveStatus(null);
    setCommunitySaving(false);
    setShowStoreSavePanel(false);
    setStoreTitle('');
    setStoreSaveStatus(null);
    setStoreSaving(false);
    setCustomPrompt('');
    onClose();
    // ← setSourceTab 미포함
  };
  ```
- [CourseEditPage.tsx:478](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L478) 가 `{aiOpen && <AiContentModal ... />}` 가 아닌 unconditional `<AiContentModal open={aiOpen} ... />` 패턴 → React reconciliation으로 컴포넌트는 항상 동일 위치에 유지됨
- [AiContentModal.tsx:273](packages/content-editor/src/components/AiContentModal.tsx#L273) `if (!open) return null` 은 hooks 호출 이후의 early return이므로 useState state는 cleanup되지 않음 → 다음 open=true 시점에 그대로 복원

**결과**: 한 번 사용자가 "기존 입력" 탭을 클릭한 적이 있으면 그 세션 동안 영구히 'text' 모드로 시작.

**일치하는 증상**:
- "조금 전까지 보였는데 지금은 사라짐" — 첫 1회 open 시는 'url'로 시작했으나 이후 stuck
- "정리 모드 화면이 바로 표시" — `sourceTab='text'` 분기 화면

### 4.2 후보 2: 빌드/배포 미반영 (★★ 가능)

**근거**:
- 직전 commit `38309c643` 은 5/10 09:40 작성. 사용자가 보고한 시점이 그 이전이라면 이 commit의 effect가 적용되지 않음.
- 만약 frontend 빌드/Cloud Run 배포가 반영되지 않았다면 `initialSourceTab` prop 자체가 무시됨 → modal은 default 'text'로 시작.
- production에 배포되었더라도 브라우저 CDN 캐시로 구 번들 사용 가능.

**확인 방법**:
- Cloud Run 리비전 배포 시간과 사용자 보고 시간 비교
- 사용자에게 hard reload (Ctrl+Shift+R) 후 재현 요청

### 4.3 후보 3: 사용자가 다른 진입처에서 보고 있음 (★ 가능성 낮음)

**근거**:
- `AiContentModal` 진입처는 6곳: [CourseEditPage](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx) / [ResourceWritePage](services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx) / [ContentWritePage](services/web-kpa-society/src/pages/contents/ContentWritePage.tsx) / [PharmacyBlogPage (KPA)](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) / [PharmacyBlogPage (glycopharm)](services/web-glycopharm/src/pages/store-management/PharmacyBlogPage.tsx) / [Toolbar.tsx](packages/content-editor/src/components/Toolbar.tsx).
- 이 중 `CourseEditPage`만 `initialSourceTab="url"` 명시. 나머지 5곳은 default 'text'.
- 사용자가 "AI 레슨 초안 만들기"라는 LMS 진입처 어휘를 사용했으므로 다른 진입처와 혼동 가능성은 낮음.
- 그러나 어휘만으로는 확실하지 않으므로 사용자에게 어떤 페이지에서 버튼을 눌렀는지 재확인 필요.

### 4.4 후보 4: AiContentModal의 source tab 자체가 우회된 다른 흐름이 있음 (★ 가능성 낮음)

**근거**:
- LMS lesson editor 흐름에는 `lesson body AI 생성`, `lesson 구조 AI 생성` 등 다른 AI 흐름이 존재 (commit history: `WO-O4O-LMS-LESSON-BODY-AI-GENERATION-V3`, `WO-O4O-LMS-COURSE-STRUCTURE-AI-V2`).
- 그러나 이들은 모달 내부 동작이 아닌 별도 inline 액션으로 보이며, "AI 레슨 초안 만들기" 라는 어휘는 `CourseEditPage` 의 `headerLabel="AI 레슨 초안 만들기"` 와 정확히 일치.
- 별도 흐름 가설은 코드 근거 부족.

### 4.5 후보 5: ContentEditor / Toolbar 등 다른 layer가 source tab을 가로챔 (★ 가능성 매우 낮음)

**근거**:
- [Toolbar.tsx](packages/content-editor/src/components/Toolbar.tsx) 도 AiContentModal을 호출하지만 LMS 진입과는 무관.
- AiContentModal은 자기 내부에서 `sourceTab`을 직접 관리. 외부 가로채기 구조 없음.

---

## 5. 가장 가능성 높은 원인

**확정 진단**: **후보 1 (handleClose 누락 + unconditional mount)**

**확신 근거**:
1. 코드 정적 분석으로 직접 증명됨 (line numbers 명시).
2. 사용자 증상("바로 정리 모드 화면 표시")과 정확히 일치하는 시나리오가 코드상 발생 가능.
3. commit message가 명시한 *"re-mount 시점에만 적용"* 가정이 호출 사이트의 실제 패턴과 mismatch.
4. 후보 2(빌드 미반영)는 시간적 정황으로만 가능하고, 후보 3·4·5는 코드 근거 부족.

**검증 방법** (수정 전 사용자에게 확인 가능):
- (a) **세션 리셋 테스트**: 브라우저 hard reload 후 LMS 강의 편집 페이지 재진입 → "AI 레슨 초안 만들기" 클릭 시 'url' 화면이 보이는지 확인. 보이면 후보 1 확정.
- (b) **탭 전환 후 재시도**: 'url' 화면에서 "기존 입력" 탭 클릭 → 모달 닫음 → 다시 열음. 두 번째 open 시 'text' 화면이면 후보 1 확정.

---

## 6. 수정이 필요하다면 최소 수정 방향

### 6.1 옵션 A: `handleClose` 에 `setSourceTab` reset 추가 (권장)

[AiContentModal.tsx:569-589](packages/content-editor/src/components/AiContentModal.tsx#L569-L589):

```diff
  const handleClose = () => {
    setInput('');
    setResult(null);
    setError('');
    setLoading(false);
    setCopied(false);
    setChannelSaveStatus(null);
    setChannelSaving(false);
    setUrlInput('');
+   setSourceTab(initialSourceTab ?? 'text');
    setShowCommunitySavePanel(false);
    ...
    setCustomPrompt('');
    onClose();
  };
```

- **변경 범위**: 1줄 추가, 1개 파일
- **다른 진입처 영향**: 없음. initialSourceTab 미전달 시 default 'text'로 reset되므로 기존 동작과 동일.
- **장점**: 모달 자기 책임으로 처리, caller 변경 불요
- **단점**: 사용자가 모달을 닫지 않고 탭만 전환했다가 다시 처음으로 돌아가고 싶은 경우는 처리 안 됨 (이는 별도 UX 결정 필요)

### 6.2 옵션 B: `useEffect` 로 `open` 변화 감지 후 reset

[AiContentModal.tsx:262](packages/content-editor/src/components/AiContentModal.tsx#L262) 부근에 추가:

```tsx
useEffect(() => {
  if (open) {
    setSourceTab(initialSourceTab ?? 'text');
  }
}, [open, initialSourceTab]);
```

- **장점**: open 시점마다 명시적으로 initial 적용 → 의도가 코드로 표현됨
- **단점**: A보다 미세하게 더 많은 코드, 그리고 사용자가 modal 안에서 'text'로 전환하고 그대로 모달을 유지하는 동안에는 동일 동작 (open이 toggle되어야 reset)

### 6.3 옵션 C: caller 측 conditional mount

[CourseEditPage.tsx:478](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L478):

```diff
- <AiContentModal open={aiOpen} ... initialSourceTab="url" />
+ {aiOpen && <AiContentModal open={aiOpen} ... initialSourceTab="url" />}
```

- **장점**: open 시마다 unmount/remount → useState 초기값이 매번 재평가됨 → commit message가 명시한 "re-mount 시점에만 적용" 가정이 실제로 성립
- **단점**: caller 6곳 모두를 일관되게 변경해야 패턴 통일됨 (지금은 caller가 6곳, conditional/unconditional 혼재 가능성)
- **권장 우선순위 낮음**: 모달 자체의 invariant이 있는 게 더 견고

### 6.4 권장 조합

**옵션 A 단독** 적용 권장. 1줄 변경으로 commit message가 의도한 동작이 정확히 구현됨.

옵션 B는 옵션 A와 동일 효과지만 useEffect 추가로 코드량 증가. 옵션 C는 모달 외부의 6개 caller에 일관성 부담.

---

## 7. 수정 전 확인해야 할 위험 요소

### 7.1 다른 진입처 영향

| 진입처 | initialSourceTab | 옵션 A 적용 시 동작 |
|--------|:----------------:|--------------------|
| CourseEditPage (LMS) | `'url'` | close 후 reopen 시 'url'로 reset (의도) |
| ResourceWritePage | (미전달) → 'text' | close 후 reopen 시 'text'로 reset (기존 동작과 동일) |
| ContentWritePage | (미전달) → 'text' | 동일 |
| PharmacyBlogPage (KPA) | (미전달) → 'text' | 동일 |
| PharmacyBlogPage (glycopharm) | (미전달) → 'text' | 동일 |
| Toolbar.tsx | (미전달) → 'text' | 동일 |

→ **모든 진입처에서 회귀 없음**. LMS만 의도된 reset, 나머지는 'text' default로 reset이지만 어차피 close되면 입력도 지워지므로 사용자 영향 동일.

### 7.2 modal 안에서 작업 중인 상태와의 상호작용

- `handleClose`는 input / urlInput / result / customPrompt 등을 모두 reset함. sourceTab도 동일 시점에 reset되는 것은 일관성 측면에서 자연스러움.
- 단, 사용자가 'text' 모드에서 입력 중에 cancel 버튼을 누르면 입력이 지워지는 것은 기존 동작과 동일. sourceTab reset이 이 행동을 깨뜨리지 않음.

### 7.3 commit message와 코드의 invariant 정렬

- commit message: *"사용자가 탭을 전환하면 그 이후로는 사용자 선택을 유지 (re-mount 시점에만 적용)"*
- 옵션 A 적용 후: *모달이 열려 있는 동안에는 사용자 선택을 유지, 모달을 닫으면 initial로 reset*
- 의미가 약간 다르지만 사용자 경험은 commit message가 의도한 것과 거의 동일 (modal close = 작업 종료, 다음 open은 새 작업이므로 initial로 시작이 자연스러움).

### 7.4 회귀 위험: AiContentModal 호출자가 prop을 동적으로 변경하는 경우

- 현재 6개 caller 모두 `initialSourceTab` prop을 정적 string literal 또는 미전달로 사용.
- 만약 prop을 런타임에 동적으로 바꾸는 caller가 추가되면 옵션 A의 reset 동작이 마지막으로 받은 prop 값을 따름 → 이는 정상.

### 7.5 빌드/배포 검증

- 옵션 A 적용 후 production 배포 시 동일 commit이 frontend 번들에 포함되는지 Cloud Run 리비전으로 확인 필요 ([§0 환경 원칙](CLAUDE.md) — `gcloud run revisions list` 활용).
- CDN 캐시 정책에 따라 사용자가 hard reload 또는 cache-bust가 필요할 수 있음.

### 7.6 다른 useState도 reset 누락 여부

- handleClose가 reset하지 않는 다른 state: `mode`, `tone`, `length`, `urlTone`, `urlContentType`, `resultTab`, `communityForums`, `communityForumsLoading`.
- 이들 중 사용자가 수동 변경한 후 재진입 시 stuck되는 것이 UX 문제인지는 별도 판단 필요. **본 IR 범위는 sourceTab 한정**이므로 별도 WO로 분리 권장.

---

## 8. 권장 후속 액션

| 순서 | 액션 | 우선순위 |
|:----:|------|:--------:|
| 1 | 사용자에게 § 5 검증 방법 (a)/(b) 시나리오 재현 요청 → 후보 1 확정 | 즉시 |
| 2 | 옵션 A 1줄 패치를 별도 hotfix WO로 진행: **WO-O4O-AI-LESSON-MODAL-SOURCE-TAB-RESET-V1** | 검증 후 |
| 3 | (선택) handleClose의 다른 state reset 일관성 검토를 별도 WO로 분리 | 후순위 |
| 4 | (선택) AiContentModal의 호출 패턴(`{open && <... />}` vs `<... open={open} />`)을 표준 정의 → 다른 모달 컴포넌트에도 적용 가능 | Phase 2 |

---

## 9. 산출물 체크리스트

- [x] 현재 실제 렌더링 경로 (§1)
- [x] 기대 렌더링 경로 (§2)
- [x] 콘텐츠/URL 선택 UI 존재 여부 (§3) — 존재함, 항상 렌더
- [x] 사라진 원인 후보별 근거 (§4) — 5개 후보
- [x] 가장 가능성 높은 원인 (§5) — 후보 1 확정 (handleClose 누락 + unconditional mount)
- [x] 수정이 필요하다면 최소 수정 방향 (§6) — 옵션 A 권장 (1줄 추가)
- [x] 수정 전 확인해야 할 위험 요소 (§7) — 회귀 없음 확인
- [x] 작업 규칙 준수: 조사만 수행, 코드 수정 없음, 컴포넌트 자체 삭제 단정 회피, props/상태/조건부 렌더링 격차 우선 조사

---

*IR-O4O-AI-LESSON-MODAL-SOURCE-TAB-DISAPPEAR-AUDIT-V1*
*Updated: 2026-05-10*
*Status: Investigation Complete — 검증 후 hotfix WO 분기 권장*
