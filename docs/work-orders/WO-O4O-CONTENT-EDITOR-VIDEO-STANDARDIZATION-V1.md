# WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1

## 1. 작업명

WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1

---

## 2. 배경

[`IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1`](../investigations/IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1.md) 결과, TipTap 기반 `@o4o/content-editor` 는 O4O 콘텐츠 플랫폼의 표준 편집기로 유지하기로 확정하였다.

- **WO-1** — Media Library 표준 인터페이스 구축 ([`WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1`](WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1.md))
- **WO-2** — Table 표준 기능 추가 ([`WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1`](WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1.md))

이번 WO는 **동영상(Video)을 O4O 콘텐츠 플랫폼의 표준 기능으로 완성**한다.

> **선행 조건:** 본 WO는 WO-1에서 정의한 **Media Type 인지형 삽입 계약**(`insertMedia({type,url,title?,thumbnailUrl?,sourceType?})`) 위에서 동작한다. WO-1이 먼저 확정·구현되어 있어야 한다.

---

## 3. 목적

모든 콘텐츠 제작 화면에서 동영상을 동일한 방식으로 **삽입·저장·재로드·재사용**할 수 있도록 한다.

이번 WO의 목적은 **동영상 업로드 기능이 아니라 동영상 표준 구조를 만드는 것**이다.

> **한 문장 원칙:** Media Library는 동영상을 관리하고, RichTextEditor는 동영상의 **URL만 저장**하며, ContentRenderer는 **동일한 방식으로 이를 렌더링**한다.

---

## 4. 적용 범위

**공통** — `packages/content-editor` (`RichTextEditor`, `ContentRenderer`, `Toolbar`), `packages/store-ui-core`

**서비스** — Neture / KPA / GlycoPharm / K-Cosmetics

---

## 5. 구현 원칙

### 5.1 Media Library 역할 재사용

WO-1에서 정의한 Media Library 역할(§5.4)을 그대로 사용한다. RichTextEditor는 동영상을 관리하지 않고, **URL만 저장**한다. 동영상 생명주기는 Media Library가 관리한다.

### 5.2 동영상 = 하나의 개념

동영상은 Media Type `video` **하나의 개념**으로 취급한다. YouTube를 특별한 기능으로 구현하지 않는다.

### 5.3 Video Node = TipTap 표준 방식

Video Node를 TipTap 표준 Extension 방식(`Node.create`)으로 구현한다. 별도 HTML Parser를 만들지 않는다.

### 5.4 기존 저장 콘텐츠 하위호환 (중요)

현재 편집기는 `@tiptap/extension-youtube` 로 YouTube를 삽입하며, 이미 저장된 콘텐츠에는 **해당 확장이 생성한 HTML(`<div data-youtube-video>...<iframe>`)** 이 들어 있다. 또한 현재 Vimeo도 이 확장을 우회 사용한다(`Toolbar.tsx` 참고).

→ 신규 Video Node 도입 시, **이미 저장된 YouTube/Vimeo 콘텐츠가 계속 렌더·편집되도록** 다음 중 하나를 보장한다.
- (a) `@tiptap/extension-youtube` 를 유지하고 신규 Video Node는 `o4o_storage`/`external` 만 담당, 또는
- (b) 신규 Video Node가 기존 youtube-extension HTML 포맷을 `parseHTML` 로 흡수.

**어느 경로든 기존 저장 YouTube 콘텐츠의 round-trip이 깨지지 않아야 한다.** CHECK에 선택·실측을 기록한다.

---

## 6. SourceType 정책 (최종 확정)

| sourceType | 저장/렌더 |
|---|---|
| `youtube` | URL 저장 + iframe 삽입 (기존 동작 유지) |
| `o4o_storage` | Media Library URL 저장 + HTML5 `<video>` |
| `external` | 외부 URL 저장 + HTML5 `<video>` **우선**, 필요 시 iframe (§11 보안 게이트 준수) |

자동 다운로드 / 자동 업로드 / 자동 변환은 지원하지 않는다.

> Vimeo 등 기존 iframe 임베드는 `external`(또는 유지되는 youtube-extension 경로)로 매핑되어 보존된다.

---

## 7. Media 삽입 계약

WO-1에서 정의한 Media Type 계약을 **그대로 사용**한다.

```ts
insertMedia({ type, url, title?, thumbnailUrl?, sourceType? })
```

**시그니처 변경 금지.** 이번 WO는 `type='video'` 의 `sourceType` 분기(o4o_storage/external)를 채우는 작업이다.

---

## 8. HTML 정책

HTML에는 **URL만 저장**한다. 저장/렌더 형태:
- `youtube` → iframe
- `o4o_storage` → `<video>`
- `external` → `<video>` 또는 (게이트 통과 시) iframe

---

## 9. Video Node 속성

**지원 (필요 최소):** `controls`, `poster`, `width`, `height`, responsive(반응형).

**기본 미지원:** `autoplay`, `loop`, `muted`. (사이니지/태블릿 등에서 autoplay가 필요하면 별도 WO로 정책 결정 — 소비 표면별 요구가 다름)

---

## 10. Poster

Media Library가 `thumbnailUrl` 을 제공하면 poster로 사용한다. 없으면 poster를 생성하지 않는다. (자동 썸네일 생성은 §16 비목표)

---

## 11. sanitize (보안 게이트 — 중요)

`sanitizeRichHtml` 가 다음을 허용하는지 확인하고, 필요 시 **최소 범위(additive)** 로 수정한다.

- `<video>` / `<source>` + 속성 `poster` / `controls` / `preload` / `width` / `height`

> 참고: DOMPurify 기본 allowlist에 `video`/`source`가 이미 포함. 다만 TipTap 노드가 렌더하는 속성이 누락되지 않는지 실측 후 필요 시 `ADD_ATTR` 최소 추가.

**iframe 보안 불변식 유지 (필수):** 현재 `sanitizeRichHtml` 는 iframe src를 **YouTube/Vimeo embed 호스트만 허용**하고 나머지는 제거한다. `external` sourceType이라 해서 **임의 iframe src를 허용하지 않는다** (XSS/클릭재킹 방지).
- `external` 동영상은 **`<video>` 태그를 우선** 사용한다.
- iframe이 불가피한 external 임베드는 **명시적 호스트 allowlist**에만 추가한다(현재 youtube/vimeo). allowlist 없는 임의 iframe src 허용은 금지.

→ 이 게이트를 깨지 않는 것이 §6 `external` 처리의 전제다.

---

## 12. ContentRenderer

RichTextEditor와 동일하게 `video` / `iframe` 를 정상 렌더한다. **편집기와 ContentRenderer 출력이 동일해야 한다.** (WO-2의 §5.5 원칙과 동일 — 소비 측 렌더 CSS/태그 허용 동반)

---

## 13. Round-trip

HTML → Editor → Save → Reload → **동일한 Video 유지** (기존 저장 YouTube 콘텐츠 포함, §5.4).

---

## 14. Import 실측

다음 HTML을 Import → Edit → Save → Reload 로 실측한다.

- youtube iframe (기존 저장 포맷 포함)
- `<video>` + poster
- `<video>` + controls
- external iframe (허용 호스트)
- external video

---

## 15. Media Library 연계

Media Picker에서 동영상 선택 → `insertMedia()` → Video Node 생성 → HTML 저장.

---

## 16. 이번 WO에서 하지 않는 것

- YouTube 업로드 / 외부 URL 다운로드
- 동영상 인코딩 / 변환 / 스트리밍 서버
- 권한 관리 / 재생 통계 / 자동 썸네일 생성
- 재생목록 / 라이브 방송
- autoplay/loop/muted 정책 (필요 시 별도 WO)

---

## 17. 검증

Neture / KPA / GlycoPharm / K-Cosmetics 모든 RichTextEditor 소비 화면에서:

- 동영상 삽입 / 저장 / 재로드 정상
- **ContentRenderer 동일 출력**
- Media Library 연동
- **기존 저장 YouTube/Vimeo 콘텐츠 회귀 없음** (§5.4)
- 기존 기능 회귀 없음

---

## 18. 완료 기준

- Video Node가 표준 기능으로 적용된다.
- **Media Type 계약 변경 없음** (WO-1 시그니처 유지).
- SourceType `youtube` / `o4o_storage` / `external` 지원.
- ContentRenderer 동일 렌더.
- **iframe 보안 불변식(호스트 allowlist) 유지.**
- Round-trip 유지 (기존 저장 콘텐츠 포함).
- 기존 기능 회귀 없음.
- typecheck 통과 / build 통과.
- CHECK 작성 / commit·push 완료.

---

## 19. 산출물

CHECK — `CHECK-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1.md`

---

## 20. 작업 원칙

- TipTap 표준 유지 · Media Library 재사용
- RichTextEditor는 URL만 관리 · 동영상 생명주기는 Media Library가 관리
- 서비스별 구현 금지 · 공통 컴포넌트 우선 · 최소 범위(additive)
- **WO-1 인터페이스 유지 · WO-2와 충돌 금지**
- **iframe 보안 불변식(호스트 allowlist) 유지**

---

## 21. 완료 후 구조

```text
RichTextEditor
      ↓
 Media Picker
      ↓
Media Library
      ↓
  Video Node
      ↓
  HTML 저장
      ↓
ContentRenderer
      ↓
POP / QR / 블로그 / 사이니지 / 태블릿 / 상품설명  (동일 출력)
```

---

## 목표

이번 WO가 완료되면 O4O 표준 편집기는 **이미지 · 동영상 · Table · HTML Import · HTML Export · Round-trip**을 모두 지원하는 콘텐츠 플랫폼으로 완성된다.

이후 HTML Snippet, Template, AI 콘텐츠 자산은 기존 인터페이스를 변경하지 않고 확장할 수 있어야 한다.

---

*Status: 확정 (핸드오프 대기). 선행: WO-1 확정·구현. 실행은 별도 지시로 착수.*
