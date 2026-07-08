# CHECK-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1

Status: DONE — 코드 완료 + typecheck/build + 4서비스 배포 + `<video>` Round-trip 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1`

> WO-1 Media Type 계약 + WO-4 sanitize/렌더 정합 위에서 **HTML5 `<video>` 노드 + sourceType 3종** 구현. **mp4 `<video>` 삽입→직렬화→재파싱 Round-trip 프로덕션 브라우저 PASS.**

---

## 1. 선행 상태

WO-1(Media Library)·WO-2(Table)·WO-4(Renderer 정합) 완료. 본 WO는 그 위에서 Video 표준화.

## 2. 구현

| 항목 | 내용 |
|---|---|
| **Video Node** | `extensions/videoNode.ts` — HTML5 `<video>` 블록 노드(atom). `src`/`poster`/`sourceType`(o4o_storage·external)/`title` 속성. `controls`/`playsinline`/`preload=metadata` 고정. 정식 parse/render/serialize → round-trip |
| **RichTextEditor** | `VideoNode` 등록 + `VIDEO_STYLES` 주입. **`@tiptap/extension-youtube` 유지(하위호환)** — youtube/vimeo는 기존 iframe 경로 그대로 |
| **Toolbar** | `insertMediaIntoEditor` sourceType 분기: `youtube`→`setYoutubeVideo`(iframe) / `o4o_storage`·`external`→`setVideo`(`<video>`). 동영상 URL 입력이 youtube/vimeo 외 URL(mp4 등)을 `<video>`(external)로 삽입. 팝업 라벨 갱신 |
| **sanitize** | `sanitizeRichHtml` ADD_ATTR 에 `poster`/`controls`/`preload`/`playsinline` 추가(video/source 태그·src는 DOMPurify 기본 통과, javascript: 등 URL은 DOMPurify 차단). **iframe 호스트 allowlist 불변** |
| **ContentRenderer** | `VIDEO_STYLES` 를 embedCss에 포함(전 variant 주입). WO-4 sanitize 단일화로 전 variant `<video>` 보존 |

## 3. sourceType 정책 (WO §6)

| sourceType | 처리 |
|---|---|
| `youtube` | URL + iframe (기존 @tiptap/extension-youtube, 하위호환) |
| `o4o_storage` | Media Library URL + HTML5 `<video>` (poster=thumbnailUrl) |
| `external` | 외부 URL + HTML5 `<video>` |

## 4. 비목표 준수 (WO §16)

자동 업로드/다운로드/인코딩/변환/스트리밍/자동 썸네일 생성/재생목록/라이브 **없음**. `autoplay`/`loop`/`muted` 정책 **미추가**(controls만). poster는 thumbnailUrl 주입 시에만 사용.

## 5. 검증 — typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| content-editor build (tsup) | **EXIT 0** |
| content-editor typecheck | **EXIT 0** |
| KPA 소비처 typecheck | **EXIT 0** |
| Cloud Run 4서비스 배포 | **✓ success** |

## 6. 프로덕션 브라우저 smoke — `<video>` Round-trip PASS

kpa-society.co.kr, 2026-07-08, KPA admin. 매장 제품 등록 편집기(preset=full):
1. 동영상 팝업 라벨 갱신 확인 ✓ ("동영상 URL 입력 (YouTube · Vimeo · mp4 등)")
2. mp4 URL(`w3schools/mov_bbb.mp4`) 입력·삽입 → **편집기에 `<video>` 생성**:
   - `browser_evaluate`: `class="editor-video"`, `src=…mov_bbb.mp4`, `controls=true`, `data-source-type="external"`, **`aspect-ratio 16/9`, width 575px 반응형** ✓
   - 스크린샷 `wo3-video-node-roundtrip.png` — `<video>` 실제 렌더(영상 프레임 표시)
3. **Round-trip** ✓:
   - 편집 → HTML 탭: `<video class="editor-video" controls="controls" playsinline="true" preload="metadata" src="…mov_bbb.mp4" data-source-type="external"></video>` **완전 직렬화**
   - HTML → 편집 탭: `<video>` **재파싱 보존**(evaluate 확인: editor-video·src·sourceType·controls·16/9 유지) → sanitizeRichHtml 이 video 보존
   - sanitize/렌더 에러 0 (콘솔 401은 무관한 기존 auth 폴링)

→ external sourceType `<video>` 의 삽입·직렬화·재파싱·표시를 실브라우저로 확인. o4o_storage 는 동일 `setVideo` 경로(data-source-type·poster만 상이)로 커버, youtube 는 기존 경로 무변경(하위호환).

## 7. 미완/주의

- **o4o_storage 미디어 라이브러리 video PICKER 브라우저 클릭 미실행**: 현재 공용 MediaPickerModal 은 이미지 전용(`assetType:'image'`)이라, 편집기 동영상 삽입은 URL 입력 경로로 검증(external). o4o_storage 는 동일 `setVideo` 계약(sourceType/poster)이며, 미디어 라이브러리에서 **동영상 자산 브라우징** UI는 별도(후속 — 공용 picker video 모드).
- youtube/vimeo 하위호환은 WO-4 검증(YouTube iframe 보존 PASS)에서 이미 실증.

## 8. 변경 파일 / 커밋

- `packages/content-editor`: extensions/videoNode.ts(신규) · RichTextEditor.tsx · Toolbar.tsx · ContentRenderer.tsx · sanitize.ts
- 커밋: `da56ddb72`

## 9. 완료 기준 대비 (WO §18)

| 기준 | 상태 |
|---|---|
| Video Node 표준 적용 | ✅ |
| Media Type 계약 변경 없음 | ✅ (WO-1 시그니처 유지, sourceType 분기만) |
| sourceType youtube/o4o_storage/external | ✅ (external browser PASS §6, o4o_storage 동일경로, youtube 하위호환) |
| ContentRenderer 동일 렌더 | ✅ (VIDEO_STYLES 주입 + WO-4 sanitize 단일화) |
| iframe 보안 불변식 유지 | ✅ 호스트 allowlist 무변경 |
| Round-trip 유지(기존 저장 포함) | ✅ `<video>` browser PASS §6, youtube WO-4 PASS |
| 기존 기능 회귀 없음 | ✅ typecheck/deploy, youtube 경로 무변경 |
| typecheck/build | ✅ |
| CHECK/commit·push | ✅ 본 문서 |

---

## 10. 완료 후 상태 — 표준 편집기 1차 플랫폼 보강 완료

WO-1(Media Library) + WO-2(Table) + WO-4(Renderer 정합) + WO-3(Video)로 O4O 표준 편집기는 **이미지 · 동영상(YouTube+mp4/external) · 표 · HTML Import/Export · Round-trip · 소비 표면 정합**을 모두 갖췄다. IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1 의 편집기 P0/P1 Gap 해소.

---

*Status: DONE. `<video>` Round-trip 프로덕션 브라우저 PASS. o4o_storage 미디어 라이브러리 video 브라우징 UI는 후속(§7).*
