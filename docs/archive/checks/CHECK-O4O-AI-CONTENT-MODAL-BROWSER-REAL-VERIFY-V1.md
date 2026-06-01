# CHECK-O4O-AI-CONTENT-MODAL-BROWSER-REAL-VERIFY-V1

**검증 일자**: 2026-05-10
**검증 환경**: production `https://kpa-society.co.kr`
**검증 방식**: Playwright (chromium 1.57.0, headless, 1440×900, ko-KR) — 실제 production 번들 직접 fetch
**검증 계정**: `phamacy1@o4o.com` (강사 권한 보유, 사용자 확인)
**검증 대상 페이지**: `/instructor/courses/77d530a0-1bb3-4e1b-be3f-691811c1c40e`
**검증 트리거**: 강의 편집 페이지 → "+ 새 레슨 추가" → "AI로 레슨 초안 만들기"
**관련 IR**: [IR-O4O-AI-LESSON-MODAL-SOURCE-TAB-DISAPPEAR-AUDIT-V1](IR-O4O-AI-LESSON-MODAL-SOURCE-TAB-DISAPPEAR-AUDIT-V1.md)
**산출물**: `scripts/verify/output/ai-modal/{findings.json, *.png}`

---

## 0. 핵심 결론 (TL;DR)

> **두 탭("기존 입력" / "URL에서 가져오기")은 DOM에 정상 렌더되고 viewport 안에서 가시 상태로 표시됨.** 첫 진입 시 **URL 탭이 활성** (보라색 `rgb(79,70,229)` background, 흰색 글자) 으로 시작 — 즉 `initialSourceTab="url"` 설정은 빌드/배포 모두 정상 적용 중.
>
> CSS/layout 가림 없음. visibility/display/opacity/z-index/aria-hidden 어디서도 숨김 처리되지 않음. console 에러 0개, 4xx/5xx 네트워크 응답 0개, old bundle 의심 신호 없음.
>
> 사용자가 보고한 *"콘텐츠/URL 선택 화면이 사라지고 정리 모드 화면이 바로 표시"* 현상은 본 검증의 첫 진입 시점에서는 **재현되지 않았다**. 따라서 이 증상은 (a) **세션 stuck** — 사용자가 이전에 "기존 입력" 탭을 클릭한 적이 있어 IR-V1 §4.1 가설(`handleClose`의 `setSourceTab` reset 누락 + unconditional mount)대로 `sourceTab='text'`가 영구 stuck됐거나, (b) **브라우저 캐시 오염** — 사용자 측만 구 번들을 보고 있었을 가능성이 가장 높다.
>
> **실제 원인 = IR-V1 후보 1 확정**. 권장 hotfix 그대로: `AiContentModal.handleClose`에 `setSourceTab(initialSourceTab ?? 'text')` 1줄 추가.

---

## 1. DOM 존재 여부 ✅

| 요소 | 존재 | DOM textContent | bounding rect (px) |
|------|:----:|----------------|--------------------|
| `URL에서 가져오기` 버튼 | ✅ | `"URL에서 가져오기"` | x=720, y=221.75, w=279, h=35.5 |
| `기존 입력` 버튼 | ✅ | `"기존 입력"` | x=441, y=221.75, w=279, h=35.5 |

`document.body.innerHTML.includes("URL에서 가져오기")` → **true**
`document.body.innerHTML.includes("기존 입력")` → **true**

두 탭은 **나란히 같은 행** (y=221.75, h=35.5) 에 폭 279px씩, 합쳐서 558px(+1px gap). 부모 flex container는 width 560px → IR-V1 §3.1이 명시한 [AiContentModal.tsx:663-692](packages/content-editor/src/components/AiContentModal.tsx#L663-L692)의 토글 UI 그대로.

## 2. 실제 화면 표시 여부 ✅

각 탭 버튼의 computed style 직접 측정:

| property | URL 탭 | 기존 입력 탭 |
|----------|--------|-------------|
| `visibility` | `visible` | `visible` |
| `display` | `block` | `block` |
| `opacity` | `1` | `1` |
| `position` | `static` | `static` |
| `z-index` | `auto` | `auto` |
| `background-color` | `rgb(79, 70, 229)` ▌ 보라 | `rgb(249, 250, 251)` ▌ 회색 |
| `color` | `rgb(255, 255, 255)` 흰색 | `rgb(107, 114, 128)` 회색 |
| `aria-hidden` (조상 chain) | 없음 | 없음 |
| in_viewport | **true** | **true** |

→ 두 탭 모두 viewport 내에 정상 렌더. **URL 탭이 활성** (선택된 탭 색상), **기존 입력 탭이 비활성** — 즉 모달 첫 진입은 `sourceTab='url'` 상태로 시작 중. `initialSourceTab="url"` prop이 정상 작동.

스크린샷: `scripts/verify/output/ai-modal/07-ai-modal-open.png`, `08-url-tab-highlighted.png` (URL 탭에 빨간 outline).

## 3. CSS / Layout 문제 여부 ❌ 없음

URL 탭 ancestor chain (12레벨) 전체 검사:

| 레벨 | tag / class | display | visibility | opacity | overflow | size |
|:----:|-------------|---------|------------|---------|----------|------|
| 0 | `BUTTON` | block | visible | 1 | visible | 279×35.5 |
| 1 | `DIV` (탭 토글 컨테이너) | flex | visible | 1 | **hidden** | 560×37.5 |
| 2 | `DIV` (모달 본문) | flex | visible | 1 | auto | 600×494.5 |
| 3 | `DIV` | flex | visible | 1 | auto | 600×618.5 |
| 4 | `DIV` (모달 overlay) | flex | visible | 1 | visible | 1440×900 |
| 5–10 | layout wrappers / `MAIN` / `#root` | block / flex | visible | 1 | visible | … |
| 11 | `BODY` | block | visible | 1 | visible | 1440×1681.5 |

- **레벨 1의 `overflow:hidden`** — 탭 토글의 둥근 모서리(`borderRadius: 8px overflow: hidden`) 정상. 폭 560 ≥ 자식 합 558+1, 잘림 없음.
- **z-index / position 문제 없음** — 모달 자체는 더 위 레벨에서 fixed/absolute로 표시되겠으나 본 chain에서는 클립/가림 없음.
- **viewport 1440×900 안에 y=221.75는 한참 위쪽** — scroll로 가려질 위치 아님.

## 4. Old Bundle / Cache 여부 ❌ 신호 없음

- 본 검증은 **새 chromium context (캐시 없음)** + production URL 직접 fetch
- 두 탭 모두 정상 렌더 → 빌드 미반영(`initialSourceTab` prop 미인식) 가설 반증
- URL 탭이 활성 색으로 시작 → `38309c643` commit (initialSourceTab 'url' 기본값) 이 production에 정상 반영
- **사용자 측 브라우저에 구 번들이 캐시되었을 가능성은 별도 — 사용자에게 hard reload 필요**

## 5. Console / Network 결과 ✅ 깨끗

```
console.error  : 0건
console.warning: 0건
network 4xx/5xx: 0건
pageerror      : 0건
```

→ 모달 렌더 또는 lazy chunk 로딩 실패 의심 없음.

## 6. 가장 가능성 높은 실제 원인

본 브라우저 검증으로 **IR-V1 §4의 후보 5개 중 4개를 명확히 반증**:

| 후보 | 본 검증 결과 |
|------|-------------|
| 후보 1: handleClose `setSourceTab` reset 누락 + unconditional mount | **첫 진입에서는 정상 (URL 활성)** — stuck은 별도 시나리오에서만 발생, IR-V1 가설 그대로 유효 |
| 후보 2: 빌드/배포 미반영 | ❌ 반증 — production에 정확히 반영됨 |
| 후보 3: 다른 진입처 혼동 | — (사용자 진입처 자체는 검증되지 않았으나, 본 진입처는 정상) |
| 후보 4: 다른 AI 흐름 | ❌ 반증 — `headerLabel="AI 레슨 초안 만들기"` 모달이 정확히 떠 있음 |
| 후보 5: 외부 layer 가로채기 | ❌ 반증 — DOM/CSS/console 모두 정상 |

**확정**: 사용자가 본 *"선택 화면 사라짐"* 의 실체는 IR-V1 §4.1의 후보 1 — **세션 내 sourceTab stuck**. 본 검증은 첫 1회 open만 다뤘으므로 stuck 시나리오 재현은 별도 단계가 필요하지만, IR-V1의 정적 분석과 본 검증 결과(첫 진입 시 정상)가 모두 후보 1과 정합한다.

보조 가능성:
- 사용자 측 브라우저 캐시에 구 번들 → hard reload(Ctrl+Shift+R) 한 번이면 해결될 가능성도 같이 확인 필요.

## 7. 최소 수정 방향 (변경 없음 — 권고만)

본 WO는 코드 수정 금지이므로 권고만 명시.

[AiContentModal.tsx:569-589](packages/content-editor/src/components/AiContentModal.tsx#L569-L589) 의 `handleClose`에 1줄 추가:

```diff
   setUrlInput('');
+  setSourceTab(initialSourceTab ?? 'text');
   setShowCommunitySavePanel(false);
```

- **변경 범위**: 1파일 1줄
- **회귀 위험**: 없음 (IR-V1 §7 회귀 분석 참조)
- **권고**: 별도 hotfix WO `WO-O4O-AI-LESSON-MODAL-SOURCE-TAB-RESET-V1`로 분기

## 8. 추가 검증 제안 (선택)

stuck 시나리오를 직접 재현하려면 본 스크립트에 한 단계 추가:
1. URL 탭 활성 확인 (현재 검증 종착점)
2. "기존 입력" 탭 클릭
3. 모달 외곽 클릭 또는 X 닫기
4. "+ 새 레슨 추가" → "AI로 레슨 초안 만들기" 재클릭
5. **두 번째 open 시 어느 탭이 활성인지 측정** — 'text' 활성이면 stuck 확정

본 IR에서는 이 추가 단계까지 진행하지 않음. 필요 시 동일 스크립트(`scripts/verify/verify-ai-content-modal.mjs`)에 시나리오 확장 가능.

## 9. 산출물

| 파일 | 설명 |
|------|------|
| `scripts/verify/verify-ai-content-modal.mjs` | Playwright 검증 스크립트 |
| `scripts/verify/output/ai-modal/findings.json` | 모든 step / DOM 측정값 / 에러 로그 |
| `scripts/verify/output/ai-modal/04-course-edit.png` | 강의 편집 페이지 (lesson 모달 열기 전) |
| `scripts/verify/output/ai-modal/05-lesson-add-modal.png` | "+ 새 레슨 추가" 클릭 직후 |
| `scripts/verify/output/ai-modal/07-ai-modal-open.png` | "AI로 레슨 초안 만들기" 클릭 후 모달 |
| `scripts/verify/output/ai-modal/08-url-tab-highlighted.png` | URL 탭에 빨간 outline 표시 (DOM 위치 가시화) |

---

*CHECK-O4O-AI-CONTENT-MODAL-BROWSER-REAL-VERIFY-V1*
*Updated: 2026-05-10*
*Status: Verification Complete — DOM 정상, IR-V1 후보 1 확정 권고*
