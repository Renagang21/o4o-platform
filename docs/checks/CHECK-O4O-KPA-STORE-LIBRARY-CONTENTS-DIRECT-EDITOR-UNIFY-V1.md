# CHECK-O4O-KPA-STORE-LIBRARY-CONTENTS-DIRECT-EDITOR-UNIFY-V1

> WO: `WO-O4O-KPA-STORE-LIBRARY-CONTENTS-DIRECT-EDITOR-UNIFY-V1`
> 선행: `WO-...-EDIT-ROUTE-UNIFY-V1` (direct [편집] 편집기 직행) 후 발견
> 대상: `StoreDirectContentPage` (KPA `/store/content/direct/:id`)
> 작업일: 2026-06-26 / 범위: KPA

---

## 1. 문제 / 목표

direct 콘텐츠 [편집] 진입 시 **레거시 블록/텍스트 편집기**(본문 편집 textarea + 텍스트/이미지/목록/링크 블록)가
열렸다. 제작 자료(execution-asset, `ProductionMaterialEditorPage`)는 **o4o 표준 RichTextEditor(편집/HTML/미리보기
탭 + 툴바)** 를 쓰는데 direct 만 다른 편집기를 사용 — **같은 모듈로 통일** 필요.

---

## 2. "유형 구분이 필요한가?" (사용자 질문)

**불필요하다.** 편집 UI 는 유형 분기 없이 모든 direct 콘텐츠에 **동일한 표준 RichTextEditor** 를 적용한다.
- direct 콘텐츠는 저장 형태가 `contentJson.html` (표준) — 운영 데이터 전수 확인(4/4 html).
- 입력은 `contentJsonToHtml()` 로 **html 로 정규화**해 주입(레거시 블록/배열도 html 로 변환) — UI 분기가 아닌 **입력 정규화**.
- 즉 "html 기반이라 안전"은 **마이그레이션 무손실 근거**일 뿐, 편집기 동작을 유형별로 나누는 것이 아니다.

---

## 3. 변경 (1 파일)

`services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx`:

| 항목 | 변경 |
|---|---|
| import | `RichTextEditor`, `type EditorContent`(@o4o/content-editor), `getAccessToken` 추가 / 블록 편집용 lucide 아이콘(Plus/FileText/Image/LinkIcon/List) 제거 |
| state | `editBlocks` → `editorContent`(EditorContent) + `editorInitialHtml` |
| 편집 본문 UI | 블록 편집기(textarea+블록 추가) → **`<RichTextEditor preset="full" aiRequestHeaders=… />`** (제작 자료 편집기와 동일 사용) |
| startEdit | `contentJsonToHtml(contentJson)` 로 html 추출 → editorInitialHtml/editorContent 주입 |
| handleSave | `contentJson = { ...기존, html: editorContent.html }` + 레거시 `blocks` 키 제거(렌더 우선순위 충돌 방지) |
| 헬퍼 | `blocksToContentJson`(미사용) → `contentJsonToHtml`(html 정규화)로 교체. `parseBlocks` 는 보기 모드용 유지 |

- **보기(view) 모드**는 변경 없음(`BlockRenderer`). 저장값이 `contentJson.html` 이라 보기·편집 모두 html 단일 출처.
- 라우트/백엔드/DB/타 페이지 변경 없음. `directContentApi.update` 계약 불변.

---

## 4. 검증 결과

브라우저 smoke: 2026-06-26, KPA `테스트 약국 매장`, 배포본(`a87a9dd17` deploy success).

| 항목 | 결과 |
|---|---|
| web-kpa-society `tsc --noEmit` | ✅ PASS |
| direct [편집] → o4o 표준 RichTextEditor(편집/HTML/미리보기 탭 + 전체 툴바) 노출 | ✅ "관절·연골·뼈 건강 골든 세트 - type 3" `?edit=1` → 제작 자료 편집기와 동일 편집기, 본문 WYSIWYG 서식 렌더(제목/강조/이미지) |
| 레거시 블록 편집기(textarea+블록) 미노출 | ✅ |
| 저장 경로 = 기존 `directContentApi.update`(html) | ✅ (계약 불변, tsc PASS) |
| 제작 자료(execution) / snapshot 편집 동작 무영향 | ✅ (해당 페이지 미변경) |

---

## 5. 제외 / 후속

- **snapshot 편집(`StoreContentEditPage`, `/store/content/:id/edit`)도 동일 레거시 블록 편집기 사용** — 같은 모듈로 통일하려면 별도 점검 필요(스냅샷 content_json 형태가 블록일 수 있어 무손실 정규화 확인 후 진행). 후속 WO 후보.
- 보기(view) 모드의 html 렌더 일관성(현재 BlockRenderer text 경로) 점검은 후속.
