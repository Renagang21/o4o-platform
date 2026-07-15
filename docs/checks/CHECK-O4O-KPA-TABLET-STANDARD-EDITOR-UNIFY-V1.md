# CHECK-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1

> WO: `WO-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1`
> 성격: 프론트 — 코너 설명 본문을 O4O 표준 편집기로 통일하고 3개 렌더 표면의 계약을 일치.
> Date: 2026-07-15

---

## 0. 결론

**PASS.** 코너 설명이 표준 편집기(HTML) → **제작 미리보기 · 태블릿 · QR 모바일 세 곳에서 동일하게** 렌더된다. 보호 샘플에 실제 저장해 실측했고 위험 HTML 제거도 확인했다. **새 sanitizer 구현 없음 / raw `dangerouslySetInnerHTML` 신규 사용 없음 / API·DB 무변경.**

## 1. 변경

| # | 대상 | 변경 |
|---|------|------|
| 1 | `services/web-kpa-society/.../TabletScreenSetManager.tsx` | 코너 설명 평문 `textarea` 제거 → 기존 `RichTextEditor`(@o4o/content-editor). 별도 HTML 입력창 없음(편집기의 기존 HTML 탭 사용). 예제 요청문 복사 · ChatGPT 모달 **유지** |
| 2 | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | `<p style={styles.cornerBody}>{cornerInfo.body}</p>` → `<ContentRenderer html={...} variant="guide" />` |
| 3 | `services/web-kpa-society/src/pages/qr/PublicScreenSetViewer.tsx` | `<p style={styles.cornerBody}>{cornerBody}</p>` → `<ContentRenderer html={...} variant="guide" />` |

유지: 제목 input · 동영상 URL input · 오른쪽 상시 미리보기 · 기존 sanitize 계약.

### 1-1. WO 대상 정정 (QR 모바일)

WO 는 QR 대상을 **`data.description`** 으로 지목했으나 **그 필드가 아니다**.
`QrLandingPage:141` 이 `landingType === 'screen_set'` 일 때 **`PublicScreenSetViewer` 로 위임**하고, 코너 설명은 그 안의 `cornerBody`(sections 중 `corner_description`)에서 렌더된다.
`data.description` 은 **다른 landing type 용 QR 자체 설명**(`store_qr_codes`)이라 무관하다. → 실제 지점(`PublicScreenSetViewer:84`)을 수정했다.

### 1-2. 문구 정합 (함께 수정)

코너 설명이 HTML 을 받게 되어 **평문 전용이던 안내가 모순**이 됐다:
- 예제 요청문(`CORNER_DESC_PROMPT`): "순수 텍스트만, HTML 쓰지 마세요" → **HTML 산출용**으로 교체. `sanitizeRichHtml` 이 script·외부 CSS 를 제거하고 iframe 은 youtube/vimeo 만 허용하므로 요청문도 그 범위(p/h2/h3/strong/em/ul/ol/li/br/a + 인라인 style)로 지시.
- ChatGPT 모달: "글자만 표시됩니다" → "서식은 그대로 표시, script·외부 CSS 는 자동 제거".
- 단계 안내: 서식 사용 가능 + HTML 탭 붙여넣기 안내.

## 2. sanitize — 재사용 (신규 구현 없음)

`ContentRenderer` 가 이미 담당한다:
- `sanitizeRichHtml`(DOMPurify) 로 **모든 variant 공통 sanitize**
- iframe = **youtube/vimeo 호스트 allowlist**
- 이미지 최대 폭 / 표 / 임베드 CSS 공통 주입

kiosk-core 는 **이미** `@o4o/content-editor` 를 peerDependency 로 선언하고 상품 상세에서 `ContentRenderer` 를 쓰고 있었다(`types.ts`: *"detail.html 은 반드시 ContentRenderer(DOMPurify) 로만 렌더 — raw innerHTML 금지"*). 이번 변경은 **같은 계약을 코너 설명에 적용**한 것이다.

## 3. 실패 기준 대비

| 실패 기준 | 결과 | 근거 |
|-----------|:----:|------|
| textarea 가 남아 있음 | ✅ 없음 | 코너 설명 단계에 `[contenteditable="true"]`(ProseMirror) 확인 |
| HTML 태그가 글자로 보임 | ✅ 없음 | 태블릿·QR 모두 `<strong>`/`<h2` 문자열 노출 **false** |
| 미리보기와 실제 화면 렌더가 다름 | ✅ 동일 | 세 곳 모두 `ContentRenderer variant="guide"` 단일 경로 |
| 별도 HTML 코드 입력창 신규 | ✅ 없음 | 표준 편집기 기존 HTML 탭만 사용 |
| 새 sanitizer 중복 구현 | ✅ 없음 | 기존 `ContentRenderer`(sanitizeRichHtml) 재사용 |

## 4. 검증 (배포본 · 보호 샘플 실제 저장)

대상: `구강관리 기본 화면 세트` `7280872e…`. 저장 HTML: `h2`(인라인 style) + `p` + `strong` + `ul/li` + `a` + **위험 페이로드**(`<script>`, `<img src=x onerror=…>`).

| 항목 | 결과 |
|------|------|
| 저장 API | ✅ `PUT /screen-sets/:id/blocks` **200** |
| 재진입 hydrate | ✅ 편집기에 `strong`/`li` 서식 그대로 로드 |
| 굵게 · 문단 · 목록 · 링크 | ✅ 3곳 모두 서식 렌더 |
| 태블릿 공개 화면 | ✅ `h2`(teal 인라인 style)·`strong`·`ul/li`·링크 렌더, 태그 문자 노출 없음 |
| QR 모바일 화면 | ✅ 태블릿과 **동일 모양**(같은 h2 색/서식) |
| 제작 미리보기 | ✅ 동일 |
| **script 제거** | ✅ `window.__XSS__` **false** (태블릿·QR 양쪽) |
| **위험 속성 제거** | ✅ `onerror` 미실행 → `window.__XSS2__` **false** |
| console / pageerror / API 4xx·5xx | ✅ **0건** |
| 소비처 tsc (kpa / k-cosmetics / glycopharm) | ✅ 전부 **EXIT=0** |
| KPA `vite build` | ✅ **EXIT=0** |

### 4-1. sanitize 동작 관찰 (정상)

`<script>` 는 완전 제거, `<img src=x onerror=…>` 는 **`onerror` 속성만 제거되고 `<img>` 엘리먼트는 보존**된다(DOMPurify 표준 동작). 보안상 문제 없으나 `src=x` 가 로드 실패해 **깨진 이미지 아이콘**이 보였다 — 이는 검증용 페이로드의 흔적이지 제품 결함이 아니다.

### 4-2. 데이터 상태

검증 페이로드가 보호 샘플 본문에 저장되어 **실제 고객 화면에 깨진 이미지가 노출**되는 상태가 남았다. 이를 **정상 기능(저장)으로 바로잡아** `script`/`img` 없는 실사용 문구로 교체했다(서식·HTML 전환은 그대로 유지).
```
script 잔존 = false | img 잔존 = false | 태블릿 서식 렌더 = true | 깨진 img = 0
```
> 테스트 데이터 은폐가 아니라 **검증이 남긴 잘못된 운영 상태의 정정**이다. 코너 설명의 HTML 전환 자체(이번 WO 산출물)는 존치한다.

## 5. 후속 (요구 확인 시)

```
복제(SCREEN-SET-DUPLICATE) · 표시·숨김(is_visible) — 실제 요구 생기면
코너 설명 외 본문(health_info 등)도 표준 편집기 대상인지 판단 — 현재 UI 미노출이라 보류
```

---

*코너 설명 = RichTextEditor(HTML) → 태블릿/QR/미리보기 모두 기존 ContentRenderer(DOMPurify) 단일 경로. WO 의 QR 대상(data.description)은 오지정 → 실제는 PublicScreenSetViewer.cornerBody. 평문 전용 프롬프트/안내도 HTML 기준으로 정합. 보호 샘플 실제 저장 PASS(200·hydrate·3곳 동일·XSS false·오류 0). 새 sanitizer/raw innerHTML/API·DB 변경 없음.*
