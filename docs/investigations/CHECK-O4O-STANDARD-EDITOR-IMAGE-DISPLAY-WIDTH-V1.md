# CHECK-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1

> 표준 편집기 이미지 표시 폭/정렬 기능 (삽입 모달 + 버블 메뉴) 구현 검증.
>
> WO: `WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1`
> 선행: `WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1`(860px ProductDetailLayout node)
> 작성일: 2026-06-28 · 상태: 구현·tsc·빌드·배포 완료 · **라이브 회귀 미완(하네스 제약, §6)**

---

## 1. 구현 (commit cad2eb06f) — (C) 삽입 모달 + 버블 메뉴
- **DisplayImage 확장**(`extensions/displayImage.ts`): `@tiptap/extension-image` 확장.
  - `displayWidth`(full/75/50/25/original) + `align`(left/center/right) **정식 attribute** — parseHTML(`data-display-width`/`data-align`), renderHTML(data-attr + class `img-w-*`/`img-align-*`). 임의 width/style 입력 없음(고정 enum).
  - `legacyWidth`: 기존 `width="240"`·inline width **보존**(폭 변경 전 표시 유지) → 폭 변경 시 제거(정규화).
  - `IMAGE_DISPLAY_STYLES`: 본문폭=width/max-width100%, 75/50/25%, original=auto(max-width100%), 정렬=margin 기반, 비율유지/가로넘침 없음.
- **삽입 설정 모달**(`ImageInsertModal.tsx`): 라이브러리/URL/명시 업로드 → 미리보기 + 폭/정렬 선택 → 삽입(취소 시 미삽입). product 기본=본문폭+가운데, 그 외=원본+가운데.
- **공통 pending-insert 흐름**: Toolbar 4개 삽입 경로(URL/파일/라이브러리/기존이미지)를 `onRequestImageInsert`로 통합 → RichTextEditor가 모달 경유. **클립보드 붙여넣기는 모달 없이 기본값 즉시 삽입**(회귀 방지) → 버블 메뉴로 변경.
- **선택 버블 메뉴**(`@tiptap/react` BubbleMenu): 선택 이미지 폭/정렬 즉시 변경 + 삭제. `updateAttributes`라 undo/redo 지원. legacy 이미지에도 표시.
- **CSS 동일 적용**: 편집기(`<style>`) + ContentRenderer(`injectImageDisplayCss`, 높은 specificity로 variant 위에 적용) → 미리보기·공개 렌더 동일.
- **무변경**: ProductDetailLayout/템플릿/기존 이미지 URL·업로드·라이브러리 콜백 회귀 없음. DB/API 무변경.

## 2. 속성 저장 규약
```
data-display-width="full|75|50|25|original"  (+ class img-w-*)
data-align="left|center|right"               (+ class img-align-*)
legacy: displayWidth 없을 때만 width 속성 보존 → 본문폭 선택 시 제거
```

## 3. 검증 (완료)
| 항목 | 결과 |
|---|---|
| content-editor `tsc --noEmit` | ✅ 0 errors |
| web-neture `tsc --noEmit` (소비처) | ✅ 0 errors |
| content-editor 빌드(tsup dts) | ✅ 성공 |
| 배포 Deploy Web Services `all` | ✅ neture/kpa/glyco/k-cosmetics success |

## 4. 테스트 데이터 (조건 준수)
- Phase 2와 동일 안전 패턴: 기존 [E2E_TEST] master(barcode 2003871659580) 재사용 → private 초안 offer `1ed727fb-…` 생성(isActive:false/isPublic:false/serviceKeys 없음/승인 미제출).
- 정리: `bulkDelete` deleted:1 → 목록 0개 복구, master 보존. **내 생성 데이터 완전 정리, orphan 0.**

## 5. 설계 근거
- 폭은 **콘텐츠와 함께 이동**(data-attr+class) — 선행 WO의 ProductDetailLayout(860px)과 동일 철학. ProductDetailLayout 내부 본문폭 이미지는 부모 max-width(860px)에 자연 종속.
- BubbleMenu/DisplayImage/CSS injection은 **이미 브라우저 검증된 Phase 2 node 패턴과 동일 메커니즘**(addAttributes/parseHTML/renderHTML + sanitizeRichHtml 왕복 + ContentRenderer 주입).

## 6. ⚠️ 라이브 회귀 — 미완(정직 보고)
- 이미지 기능 편집기는 web-neture 공급자 `ProductDetailDrawer`의 상세 편집기뿐이며, **다중 에디터 + 드로어 편집모드 구조**라 Playwright로 **해당 에디터의 HTML 탭/textarea에 안정적으로 도달하지 못함**(템플릿 에디터 스코프에서 textarea 미노출 — 하네스 selector 제약). 따라서 §검증 필수 항목(삽입 모달→본문폭/취소/75·50·25·원본, 버블 재변경, legacy 240 전환, 정렬, 삭제, undo/redo, HTML 왕복, 저장·재진입, 미리보기·ContentRenderer, 860px 조합, 모바일, 클립보드 회귀)을 **라이브로 관측·PASS 선언하지 못함.**
- 이는 **하네스 제약**이지 구현 결함 근거 아님(tsc/빌드/배포 OK, Phase 2 동일 패턴 검증됨).
- **권고**: 운영 환경에서 사람이 1회 육안 smoke(공급자 상품 상세 편집기 → 이미지 라이브러리/URL 삽입 → 폭/정렬 모달 → 버블 메뉴 재변경 → legacy width 전환 → HTML 왕복/저장·재진입 → 공개 렌더 → 모바일). 또는 별도 테스트 상품을 둔 상태에서 재시도.

## 7. 후속/범위 외
- 공개 상품 상세페이지 live 렌더 육안은 공개 상품 1건에서 후속 권장.
- §13 교체/아래 추가/취소(이전 WO)는 별도 후속.

---

**작성:** O4O Platform Team · 2026-06-28
**상태:** 이미지 표시 폭/정렬 구현·tsc·빌드·배포 완료, 테스트 데이터 정리. **라이브 회귀는 드로어 하네스 제약으로 미완 — 사람 육안 smoke 권장(PASS 미선언).**
