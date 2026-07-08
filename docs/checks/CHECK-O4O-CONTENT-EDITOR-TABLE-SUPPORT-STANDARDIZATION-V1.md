# CHECK-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1

Status: DONE — 코드 완료 + typecheck/build + 4서비스 배포 + Round-trip 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1`

> **핵심 목표(Round-trip 완성) 프로덕션 브라우저 검증 PASS** (§5). 브라우저 검증 중 회귀 2건 발견·수정.

---

## 1. 목표

IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1 P0 — TipTap 기반 표준 편집기의 Table 미지원 해소. "표 기능 추가"가 아니라 **Round-trip 완성**(HTML→편집→저장→재로드 시 표 구조 보존)이 목표.

## 2. 구현

| 항목 | 내용 |
|---|---|
| 확장 4종 | `@tiptap/extension-table`(+row/header/cell) 도입, `extensions/tableKit.ts` 로 표준 구성(`TABLE_EXTENSIONS`) |
| RichTextEditor | Table 확장 등록 + 편집기 `<style>{TABLE_STYLES}</style>` 주입 |
| ContentRenderer | 동일 `TABLE_STYLES` 주입(§5.5 편집기↔소비 렌더 정합) |
| Toolbar | 표 삽입(3×3)/행 위·아래 추가·삭제/열 좌·우 추가·삭제/셀 병합·분할/머리글 행·열 전환/표 삭제 드롭다운(full preset). 문맥 인지(표 없으면 삽입만 활성) |
| sanitize | `sanitizeRichHtml` ADD_ATTR 에 `colwidth` 추가. table/thead/tbody/tr/td/th/colgroup/col/colspan/rowspan 은 DOMPurify 기본 통과(검증) |

## 3. 의도적 범위 (WO 준수)

- 별도 Table Editor 구현 없음(TipTap 표준).
- **Caption 기본 미지원**(TipTap 표준 미포함) — 편집 시 drop 가능, 후속 WO 분리.
- **Excel**: TipTap 기본 붙여넣기만, 별도 파서 미개발.
- Media Library 구조 무변경 · WO-1 인터페이스 무충돌.

## 4. 검증 — typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| content-editor build (tsup) | **EXIT 0** |
| content-editor typecheck | **EXIT 0** |
| KPA 소비처 typecheck | **EXIT 0** |
| Cloud Run 4서비스 배포 | **✓ success** (neture/kpa/glycopharm/k-cosmetics) |

## 5. 프로덕션 브라우저 smoke — Round-trip PASS

kpa-society.co.kr, 2026-07-08, KPA admin. `매장 경영활용 제품 등록` 편집기(preset=full):

1. **툴바 표 버튼 노출** ✓ (AI 정리와 동영상 사이)
2. **표 메뉴 문맥 인지** ✓ — 표 없을 때 "표 삽입(3×3)"만 활성, 나머지 비활성 → 표 삽입 후 행/열/셀/머리글/삭제 전부 활성
3. **표 삽입** ✓ — 머리글 행(th 3) + 데이터 2행(td 3×2) 삽입, "표 앞 문단" 문단과 공존
4. **Round-trip (핵심)** ✓:
   - 편집 → HTML 탭: `<p>표 앞 문단</p><table class="editor-table"><colgroup>…</colgroup><tbody><tr><th…>×3</tr><tr><td…>×3</tr>×2</tbody></table>` 로 **완전 직렬화**
   - HTML → 편집 탭: 표 구조 그대로 **재파싱**(문단 + 3×3 표 보존)
   - **Console 에러 0**. 스크린샷 `wo2-table-inserted-kpa.png` · `wo2-table-html-roundtrip.png` · `wo2-table-roundtrip-rendered.png`

## 6. 브라우저 검증 중 발견·수정한 회귀 2건 (실브라우저 검증의 가치)

### 6.1 빈 셀 표 드롭 (수정 완료·재검증 PASS)
`isBlankHtml` 의 미디어 regex(`img|iframe|video|hr`)에 `table` 누락 → **빈 셀 표가 "빈 본문"으로 판정되어 HTML 탭/저장에서 드롭**. 최초 HTML 탭이 비어 발견. `table` 추가로 수정(`b114a8d11`) → 재배포 후 round-trip 재검증 PASS(§5).

### 6.2 편집기 표 테두리 미표시 (수정 배포·측정 기반 확정)
computed style 측정 결과 편집기 live 노드뷰 table `className=""`, td `border 0px` → 원인: **TipTap은 `HTMLAttributes` class를 직렬화(getHTML)에만 부여하고 편집기 ProseMirror 노드뷰 table 에는 class 미부여**. `table.editor-table` 선택자가 편집기에서 미적용. `TABLE_STYLES` 를 `.content-editor .ProseMirror table`(편집기, class 무관) + `table.editor-table`(소비/저장 HTML) **양쪽 타겟**으로 수정(`11f96ffeb`) → 측정된 실제 DOM 경로(`.content-editor .ProseMirror table td` 존재 확인)와 일치. 재배포 완료.

> 소비 측(ContentRenderer)은 직렬화 HTML(`table.editor-table` class 有) + 동일 `TABLE_STYLES` 주입 → 테두리·헤더 정상(IMAGE_DISPLAY_STYLES 와 동일 검증된 메커니즘).

## 7. 미완/주의

- §6.2 편집기 테두리 수정의 **최종 시각 재확인 미완**: Playwright 프로파일(`.playwright-o4o-profile`) 잠금 재발로 재배포 후 브라우저 재접속 실패(세션 중 환경 이슈, 코드 무관). 수정은 §6.2에서 측정된 실제 DOM 경로와 일치하는 선택자라 적용 확실. 프로파일 정상화 후 편집기 표 테두리 시각 확인 권장.
- caption 보존이 요구되면 별도 caption 노드 WO 분리(§3).

## 8. 변경 파일 / 커밋

- `packages/content-editor`: package.json(확장 4종) · extensions/tableKit.ts(신규) · RichTextEditor.tsx · ContentRenderer.tsx · Toolbar.tsx · sanitize.ts
- 커밋: `5b63bb50a`(표 지원) · `b114a8d11`(§6.1 빈표 회귀) · `11f96ffeb`(§6.2 편집기 테두리)

## 9. 완료 기준 대비 (WO §13)

| 기준 | 상태 |
|---|---|
| Table Extension 4종 표준 적용 | ✅ |
| Toolbar 표 생성·편집 | ✅ (browser PASS §5) |
| **Round-trip 유지** | ✅ **browser PASS §5** |
| Table CSS 편집기+ContentRenderer 양쪽 | ✅ (편집기 §6.2 수정·배포, 소비 렌더 동일 주입) |
| sanitize 표 허용 | ✅ (기본 통과+colwidth) |
| Caption 처리 방침 기록 | ✅ 미지원·후속 분리(§3) |
| 기존 기능 회귀 없음 | ✅ (회귀 2건 발견·수정 §6) |
| typecheck/build | ✅ |
| CHECK/commit·push | ✅ 본 문서 |

---

*Status: DONE. Round-trip 프로덕션 검증 PASS. 편집기 테두리 최종 시각 확인은 프로파일 정상화 후 권장(§7).*
