# WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1

## 1. 작업명

WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1

---

## 2. 배경

[`IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1`](../investigations/IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1.md) 결과, TipTap 기반 `@o4o/content-editor` 는 장기 표준으로 유지하기로 확정되었다. 그러나 **P0 Gap으로 Table 지원 부재**가 확인되었다.

현재는:
- HTML Import 시 Table은 (raw HTML 보존 경로로) 보존될 수 있으나
- 편집 탭에서 수정하면 `wysiwygDirtyRef=true` 가 되어 `getHTML()` 이 authoritative가 되고
- TipTap이 Table Node를 인식하지 못하여
- **`getHTML()` 저장 시 Table 구조가 소실**될 수 있다.

이는 O4O 표준 편집기의 **Round-trip 원칙을 깨뜨리는 유일한 기능**이다.

이번 WO는 TipTap Table Extension을 표준 기능으로 도입하여, Table이 일반 편집기에서 정상적으로 **생성·수정·저장·재로드**될 수 있도록 한다.

---

## 3. 목적

모든 서비스에서 표(Table)를 일반 편집기에서 **Word 수준**으로 사용할 수 있도록 한다.

> **이번 WO의 목표는 "표 기능 추가"가 아니라 "Round-trip 완성"이다.**
> HTML(Table) → RichTextEditor → 사용자 수정 → HTML 저장 → 다시 열기 → **동일한 Table 유지** — 이것이 성공 기준이다.

---

## 4. 적용 범위

**공통** — `packages/content-editor` (`RichTextEditor`, `Toolbar`, `ContentRenderer`)

**필요 패키지** — `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell` (TipTap 표준 4종)

**서비스** — Neture / KPA / GlycoPharm / K-Cosmetics (별도 서비스 코드 변경 없이 공통 패키지 도입으로 전 서비스 적용)

---

## 5. 구현 원칙

### 5.1 TipTap 표준 Extension 사용

Table은 TipTap 표준 Extension을 사용한다. **별도 Table 구현을 만들지 않는다.**

### 5.2 Round-trip 보장

HTML → Editor → Save → Reload → **Table 구조 유지**.

### 5.3 HTML Import 시 계속 수정 가능

HTML Import된 기존 Table을 일반 편집기에서 계속 수정할 수 있어야 한다.

### 5.4 HTML Export 시 불필요 태그 미생성

HTML Export 시 불필요한 태그를 생성하지 않는다.

### 5.5 Table CSS는 편집기 + ContentRenderer 양쪽에 동일 적용 (중요)

기존 이미지 표시 스타일(`IMAGE_DISPLAY_STYLES`)이 편집기와 `ContentRenderer` 에 동일 적용되는 것과 같은 원칙으로, **Table 표시 CSS(테두리·헤더 배경·셀 패딩)를 편집기와 `ContentRenderer`(소비 측 read-only 렌더) 양쪽에 동일 적용**한다.

이유: POP/QR/사이니지/블로그/상품설명 등 소비 표면은 `ContentRenderer` 로 렌더된다. 편집기에만 표 CSS를 넣으면 **소비 화면에서 표가 테두리 없이 렌더**되어 사용자가 만든 표가 깨져 보인다.

---

## 6. Toolbar

다음을 지원한다. (Word 수준이면 충분)

- 표 삽입
- 행 추가 / 행 삭제
- 열 추가 / 열 삭제
- 셀 병합 / 셀 분할
- Header Row / Header Column

---

## 7. sanitize

`sanitizeRichHtml` 가 다음 태그·속성을 허용하는지 **확인**한다.

- `table` / `thead` / `tbody` / `tr` / `td` / `th` / `colgroup` / `col`
- 셀 속성: `colspan` / `rowspan` / `colwidth`

> 참고: 현재 sanitize는 DOMPurify 기반이며, DOMPurify **기본 allowlist에 위 table 태그·colspan·rowspan이 이미 포함**되어 있다. 따라서 §7은 대부분 **검증**이며, TipTap table이 생성하는 `colgroup`/`colwidth`(열 폭)만 누락되지 않는지 실측 후 필요 시 **최소 범위(additive)** 로 `ADD_ATTR` 에 `colwidth` 를 추가한다. iframe 처리 등 기존 정책은 변경하지 않는다.

---

## 8. HTML 정책

HTML은 Table 구조를 그대로 저장한다. **Table을 이미지로 변환하지 않는다.**

---

## 9. Import 실측

HTML → Editor → Save → Reload → 구조 유지를 실측한다.

**테스트 항목:**
- Header (thead/th)
- Merge Cell
- Colspan / Rowspan
- Caption — **지원 여부 확인 필요**

> **Caption 기대치 (사전 코드 근거):** `@tiptap/extension-table` 기본 구성에는 `<caption>` 노드가 없다. 따라서 caption이 포함된 HTML을 import 후 **편집 탭에서 수정하면 caption이 drop될 수 있다.** 이번 WO에서는 (a) caption을 수용 범위 밖으로 명시하거나 (b) caption 보존이 요구되면 별도 caption 노드 추가를 후속 WO로 분리한다 — CHECK에 실측 결과와 선택을 기록한다.

---

## 10. Excel

가능하면 **Excel 복사 → 붙여넣기** 동작을 확인한다. 단, 이번 WO에서 Excel Import 기능을 추가 개발하지 않는다. **TipTap 기본 지원 범위를 우선 사용**한다.

---

## 11. 이번 WO에서 하지 않는 것

- Spreadsheet / Formula / 계산
- CSV Import / Excel Parser
- PDF Table
- AI Table 생성
- Caption 전용 노드 (§9에서 필요 판정 시 후속 WO)

---

## 12. 검증

Neture / KPA / GlycoPharm / K-Cosmetics 모든 RichTextEditor 소비 화면에서:

- 표 생성 / 수정 / 저장 / 재로드 정상 동작
- **Round-trip 유지** (편집 후 저장·재로드 시 구조 보존)
- HTML Import 유지
- **소비 측(ContentRenderer) 렌더 정상** (POP/QR/사이니지/블로그에서 표 테두리·헤더 정상 표시)
- 기존 기능 회귀 없음

---

## 13. 완료 기준

- TipTap Table Extension(4종)이 표준 기능으로 적용된다.
- Toolbar에서 Table 생성 및 편집이 가능하다.
- **Round-trip이 유지된다** (편집 후에도 표 구조 보존).
- Table CSS가 편집기 + `ContentRenderer` 양쪽에 적용되어 소비 화면에서도 정상 렌더된다.
- sanitize가 Table을 허용한다(검증 완료, 필요 시 최소 additive).
- Caption 처리 방침(수용 제외 또는 후속 WO)을 CHECK에 기록한다.
- 기존 기능 회귀 없음.
- typecheck 통과 / build 통과.
- CHECK 작성 / commit·push 완료.

---

## 14. 산출물

CHECK — `CHECK-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1.md`

---

## 15. 작업 원칙

- TipTap 표준 Extension 사용 · 별도 Table Editor 구현 금지
- 최소 범위(additive)
- 기존 Round-trip 유지 · 기존 HTML Import 유지
- 기존 Media Library 구조 변경 금지
- **WO-1(Media Library)과 인터페이스 충돌 금지**
- **WO-3(Video)와 독립 구현**

---

## 16. 완료 후 상태

이 WO가 완료되면 O4O 표준 편집기는 **이미지 · 동영상(YouTube) · 표 · HTML Import/Export · Round-trip**을 모두 갖춘 안정적인 콘텐츠 편집 플랫폼으로 자리잡는다. 이후 WO-3(Video 표준화)는 이 기반 위에 독립적으로 확장한다.

---

*Status: 확정 (핸드오프 대기). 실행은 별도 지시로 착수.*
