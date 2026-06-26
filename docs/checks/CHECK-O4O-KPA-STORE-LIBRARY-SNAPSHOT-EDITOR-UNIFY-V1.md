# CHECK-O4O-KPA-STORE-LIBRARY-SNAPSHOT-EDITOR-UNIFY-V1

> WO: `WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-EDITOR-UNIFY-V1`
> 선행: `WO-...-DIRECT-EDITOR-UNIFY-V1` (direct 표준 편집기 통일)
> 대상: `StoreContentEditPage` (KPA `/store/content/:snapshotId/edit`)
> 작업일: 2026-06-26 / 범위: KPA

---

## 1. 목표

자료함의 snapshot 콘텐츠 편집도 direct/제작 자료처럼 **@o4o/content-editor RichTextEditor** 로 통일.
자료함 콘텐츠 유형(direct / execution-asset / snapshot)과 무관하게 [편집] 시 동일 편집기 경험.

---

## 2. 조사 — content_json 형태 (1·2단계)

데모 snapshot(`해양 심층수 효능`, source=store)의 content_json:
- `body`(string, **html 2530자**) = 본문 권위 출처. `blocks`(array) = **빈 배열**. `usage`(활용 설정) + tags/summary/category 등.
- 이 포맷(body=html + blocks=[])이 **공개에서 정상 렌더** → body 가 권위, blocks 비어도 무방함이 실증됨.
- 기존 블록 편집기는 `blocks` 우선 파싱이라 빈 화면(본문 body 미표시) — 오히려 깨진 UX였다.

→ **무손실 정규화 경로 확정**: 편집은 `contentJsonToHtml`(body→html→content→blocks 변환)로 html 추출,
저장은 `body=html + blocks=[]`(데모 작동 포맷) + **usage·기타 키 보존**. 블록형 snapshot 도 blocks→html 변환(무손실).

---

## 3. 변경 (1 파일)

`services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx`:

| 항목 | 변경 |
|---|---|
| import | `RichTextEditor`, `type EditorContent`, `getAccessToken` 추가 / `BlockRenderer`·`kpaBlocksToRendererBlocks`·블록 lucide 아이콘 제거 |
| state | `blocks`/`showPreview` → `editorContent`(EditorContent) + `editorInitialHtml`. `usage`/`rawJson`/`orgId`/`source` 유지 |
| 본문 UI | 블록 편집기(text/image/link/list) + 페이지 미리보기 토글 → **`<RichTextEditor preset="full" aiRequestHeaders=… />`**(편집/HTML/미리보기 탭은 편집기 내장) |
| fetchContent | `contentJsonToHtml(contentJson)` 로 html 추출 → editor 주입. `parseContentJson` 은 `usage`/`raw` 파싱에 유지 |
| handleSave | `contentJson = { ...rawJson, body: html, blocks: [], usage }` → `storeContentApi.save` (override 레이어 그대로) |
| 헬퍼 | `blocksToContentJson`(미사용) → `contentJsonToHtml`. 블록 helpers(update/add/remove) 제거 |

- **활용 설정(displayMode/CTA/QR/print)** UI·저장 보존(direct 에 없는 snapshot 전용 기능).
- 저장 경로(`storeContentApi.save` → kpa_store_contents override) 불변 → **원본 o4o_asset_snapshots(F1 동결) 무변경.**
- 라우트/백엔드/타 페이지 변경 없음.

---

## 4. 검증 결과

브라우저 smoke: 2026-06-26, KPA `테스트 약국 매장`, 배포본(`3c485977e` deploy success), `해양 심층수 효능`(source=store).

| 항목 | 결과 |
|---|---|
| web-kpa-society `tsc --noEmit` | ✅ PASS |
| snapshot [편집] → o4o 표준 RichTextEditor(편집/HTML/미리보기 + 툴바) 노출 | ✅ |
| 레거시 블록 textarea 미노출 | ✅ |
| 기존 snapshot 본문(body html) 손실 없이 표시 | ✅ 링크/마크/목록/구분선/주의사항 전부 서식 렌더 |
| 저장 후 본문 유지(무손실) | ✅ 저장 후 API 재확인 — `body` 2530자 동일(editor-link·`<mark>` 보존), `blocks=[]`, `usage` 보존(keys=15), source=store |
| HTML 탭 inline style 보존 | ✅ (편집기 = HTML탭 raw 보존 WO 반영) |
| 활용 설정(usage: 디스플레이/CTA/QR/인쇄) 보존 | ✅ |
| direct / 제작 자료 편집 회귀 없음 | ✅ (해당 페이지 미변경) |

→ **자료함 콘텐츠 3종(direct / execution-asset / snapshot) 편집기 모두 o4o 표준 RichTextEditor 로 통일 완료.**

---

## 5. 제외 (WO 범위)

- snapshot 데이터 모델 변경 / 원본 snapshot row 직접 수정 정책 변경 / 삭제 정책 변경 / PDF 추가 수정 / TipTap 스키마 style 전역 허용.
- 운영 인지: 블록형(구조화) snapshot 은 저장 시 body(html) 단일 출처로 정규화(blocks 비움) — 공개 소비처가 body 우선이라 무손실. 만약 blocks 전용 소비처가 발견되면 별도 점검.
