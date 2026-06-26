# CHECK-O4O-COMMON-EDITOR-HTML-TAB-SAVE-RAW-PRESERVE-V1

> WO: `WO-O4O-COMMON-EDITOR-HTML-TAB-SAVE-RAW-PRESERVE-V1`
> 선행 조사: `IR-O4O-COMMON-EDITOR-INLINE-STYLE-PRESERVATION-AUDIT-V1`
> 대상: 공통 편집기 `@o4o/content-editor` (`packages/content-editor`)
> 작업일: 2026-06-26 / 범위: 공통 모듈(Shared Module)

---

## 1. 목표 / 문제

HTML 탭으로 작성·수정한 본문은 저장 시 **TipTap `editor.getHTML()` 라운드트립을 거치지 않고
raw `htmlSource` 그대로** 부모로 전달되게 한다 → 임의 inline style(배경색·글자색·padding·border·
border-radius·font-size·`<div>` 카드 박스)이 저장값에 보존된다.

원인(IR): strip 주체는 백엔드·PDF 가 아니라 `RichTextEditor` 의 **`switchTab` 에서 HTML 탭을 떠날 때
`setContent(clean, true)`(emitUpdate=true)** 가 발생시키는 `onUpdate → onChange(getHTML())`. TipTap
스키마에 없는 노드/속성이 제거된 결과가 부모 저장값이 됨.

---

## 2. 변경 (단일 파일)

`packages/content-editor/src/components/RichTextEditor.tsx`:

1. **htmlSource 초기화** — `useState(() => value)` 로 외부 value(원문) 로 초기화(재오픈 시 HTML 탭·미리보기에 raw 노출).
2. **`wysiwygDirtyRef`** — 사용자가 실제 WYSIWYG(편집) 탭에서 편집했는지 추적. `onUpdate` 진입 시 true.
   (`switchTab`/value-sync 의 `setContent` 는 모두 `emit=false` 라 `onUpdate` 는 실제 사용자 편집에서만 발생.)
3. **switchTab — HTML 탭 이탈**: `setContent(clean, false)`(편집 탭 준비용 동기화, **emit 없음**) +
   `onChange({ html: raw htmlSource })`. → 부모 저장값 = 원문(디자인 보존). sanitize 는 editor 동기화에만 사용.
4. **switchTab — 편집 탭 이탈**: `wysiwygDirtyRef` 가 true(실제 WYSIWYG 편집)일 때만 `htmlSource = getHTML()` 스냅샷.
   편집하지 않았으면 htmlSource(원문) 유지.
5. **HTML textarea 입력**: `wysiwygDirtyRef=false`(원문 authoritative) + 기존 raw onChange 유지.
6. **value↔htmlSource 동기화 effect**: WYSIWYG 편집 중/HTML 탭 입력 중이 아닐 때만 htmlSource 를 value 로 동기화.
7. **autosave / Ctrl+S**: `resolveSaveHtml()`(WYSIWYG 편집 시 getHTML, 아니면 원문) 사용 — `htmlSourceRef` 미러로 최신값 참조.

TipTap 스키마는 **변경하지 않음**(방안 B 최소 수정). 백엔드/PDF/타 패키지 변경 없음.

---

## 3. 동작 매트릭스

| 시나리오 | 저장값(부모 onChange) | 비고 |
|---|---|---|
| HTML 탭 작성 → 저장(탭 이동 없음) | 원문(raw) | 기존에도 raw (line: textarea onChange) |
| HTML 탭 작성 → 미리보기 → 저장 | **원문(raw)** ✅ | 기존엔 stripped(이번 수정 핵심) |
| HTML 탭 작성 → 편집 탭(편집 안 함) → 저장 | 원문(raw) ✅ | 편집 안 했으면 원문 유지 |
| HTML 탭 → 편집 탭에서 실제 편집 → 저장 | getHTML(stripped) | WYSIWYG authoritative(운영상 인지, WO 주의사항) |
| WYSIWYG 만 사용(편집 탭) | getHTML | **기존과 동일**(회귀 없음) |
| 재오픈(저장된 raw 로딩) → HTML/미리보기 | 원문(raw) 노출 | htmlSource value 초기화 |

---

## 4. 영향 범위 (Shared Module Change Protocol)

`@o4o/content-editor` 소비처(서비스별 파일 수, node_modules 제외):
`web-kpa-society 27 / web-neture 14 / web-glycopharm 14 / admin-dashboard 13 / web-k-cosmetics 11 /
main-site 7 / shared-space-ui 6 …` — 전 서비스 admin·operator·store·forum 편집 화면.

**회귀 안전성 근거:**
- WYSIWYG 전용 사용 흐름은 **동작 불변**(onUpdate→onChange(getHTML), 편집 탭 이탈 스냅샷). §3 마지막 행.
- 변경은 **HTML 탭 경유 저장값을 원문으로** 바꾸는 것에 한정. 빈 본문 판정(isBlankHtml)·sanitize·이미지/유튜브·color/align 동작 불변.
- `setContent` emit=false 전환은 TipTap 기본값(emitUpdate 기본 false)과 동일 계열 — 불필요한 onChange 발생만 제거.
- 컨트롤러/스키마/DTO/타 패키지 변경 없음. 타입 계약(ContentEditorProps) 불변 → 소비처 빌드 영향 없음(web-kpa-society tsc PASS).

**검증 필요 소비처(대표):** KPA 콘텐츠 직접 작성/제작 자료, Operator 콘텐츠 허브/블로그/POP/QR/다국어, admin-dashboard 콘텐츠, GP/KCos/Neture 편집 화면. → 우선 KPA smoke, 이후 서비스별 점검(후속).

---

## 5. 검증 결과

브라우저 smoke: 2026-06-26, KPA `테스트 약국 매장`, 배포본(`83cbd1c08`), 제작 자료 편집기
(`/store/library/production-materials/new`, RichTextEditor 탭 사용).

| 항목 | 결과 |
|---|---|
| content-editor `tsc --noEmit` | ✅ PASS |
| content-editor build(tsup) | ✅ PASS |
| web-kpa-society `tsc --noEmit` (소비처 계약) | ✅ PASS |
| HTML 탭 디자인 입력 → 미리보기 디자인 렌더 | ✅ (청록 배경 카드 + 민트 테두리 카드 스크린샷) |
| HTML 탭 → 미리보기 → 저장 시 저장값 raw 보존 | ✅ 저장 htmlContent 에 `background:#0f766e`/`color:#ffffff`/`border:2px solid`/`border-radius`/`background:#ecfdf5`/`font-size:28px` 전수 보존(464자, API 확인) |
| WYSIWYG(편집 탭) 저장 회귀 없음 | ✅ 저장값 `<p>위지윅 본문 테스트입니다</p>`(정상 직렬화) |
| 인쇄용 PDF 에서 디자인 보존(PDF WO 연계) | ✅ (PDF WO 에서 raw 본문 주입 + print-color-adjust 로 확인 완료) |

### 5-1. 배포 중 발견·수정한 회귀 (clobber)

1차 배포(`ff472c759`) smoke 에서 **HTML 탭 입력 → 미리보기 전환 시 미리보기가 비는** 회귀 발견.
원인: htmlSource↔value 동기화 effect 의 deps 에 `activeTab` 이 포함되어, 탭 전환 시점(부모 value 가
onChange(raw)를 아직 반영하기 전, 빈값)에 stale value 로 htmlSource 를 덮어씀.
수정(`83cbd1c08`): effect deps 를 `[value]` 로 한정하고 activeTab 은 `activeTabRef` 로 참조 →
탭 전환만으로는 동기화가 재실행되지 않음. 재배포 후 위 표 전 항목 PASS.

---

## 6. 제외 / 후속 (WO 범위 그대로)

- 제외: 편집 탭 전환 경고 모달 / HTML 모드 잠금 / 편집 탭 전환 차단 / TipTap 스키마 style 전역 허용 / div·card·callout 구조화 블록 / PDF 추가 수정.
- 운영 인지: 사용자가 편집(WYSIWYG) 탭으로 직접 전환 후 편집하면 TipTap 직렬화로 일부 스타일 유실될 수 있음(설계상 수용).
- 후속: 서비스별(GP/KCos/Neture/admin) 편집 화면 회귀 점검. 필요 시 방안 A(스키마 보존)/C(블록 확장) 별도 WO.
