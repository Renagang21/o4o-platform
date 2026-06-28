# CHECK-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1

> 표준 편집기 이미지 표시 폭/정렬 기능 (삽입 모달 + 이미지 선택 툴바) 구현 + 라이브 회귀 검증.
>
> WO: `WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1`
> 선행: `WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1`(860px ProductDetailLayout node)
> 작성일: 2026-06-28 · 상태: **구현·tsc·빌드·배포·라이브 회귀 PASS (14/15 항목 + 콘솔 0). 라이브에서 실제 크래시 1건 발견·수정.**

---

## 1. 구현 — (C) 삽입 설정 모달 + 이미지 선택 툴바
- **DisplayImage 확장**(`extensions/displayImage.ts`): `@tiptap/extension-image` 확장.
  - `displayWidth`(full/75/50/25/original) + `align`(left/center/right) **정식 attribute** — parseHTML(`data-display-width`/`data-align`), renderHTML(data-attr + class `img-w-*`/`img-align-*`). 임의 width/style 입력 없음(고정 enum).
  - `legacyWidth`: 기존 `width="240"`·inline width **보존**(폭 변경 전 표시 유지) → 폭 변경 시 제거(정규화).
  - `IMAGE_DISPLAY_STYLES`: 본문폭=width/max-width100%, 75/50/25%, original=auto(max-width100%), 정렬=margin 기반, 비율유지/가로넘침 없음.
- **삽입 설정 모달**(`ImageInsertModal.tsx`): 라이브러리/URL/명시 업로드 → 미리보기 + 폭/정렬 선택 → 삽입(취소 시 미삽입). product 기본=본문폭+가운데, 그 외=원본+가운데.
- **공통 pending-insert 흐름**: Toolbar 4개 삽입 경로(URL/파일/라이브러리/기존이미지)를 `onRequestImageInsert`로 통합 → RichTextEditor가 모달 경유. **클립보드 붙여넣기는 모달 없이 기본값 즉시 삽입**(회귀 방지).
- **이미지 선택 툴바**(React-제어, `RichTextEditor.tsx`): 선택 이미지 위에 absolute 배치되는 폭/정렬/삭제 바. `onSelectionUpdate`/`onUpdate`로 위치 계산, `activeTab==='edit'` 게이트, `onMouseDown preventDefault`로 선택 유지. `updateAttributes`라 undo/redo 지원, legacy 이미지에도 표시.
  - ⚠️ **초기엔 `@tiptap/react` BubbleMenu(tippy) 사용 → 라이브에서 크래시(§4)** → tippy 제거하고 React-제어 툴바로 대체.
- **CSS 동일 적용**: 편집기(`<style>`) + ContentRenderer(`injectImageDisplayCss`) → 미리보기·공개 렌더 동일.
- **무변경**: ProductDetailLayout/템플릿/기존 이미지 콜백/DB/API.

## 2. 속성 저장 규약
```
data-display-width="full|75|50|25|original"  (+ class img-w-*)
data-align="left|center|right"               (+ class img-align-*)
legacy: displayWidth 없을 때만 width 속성 보존 → 본문폭 선택 시 제거(정규화)
```

## 3. 라이브 회귀 (neture.co.kr 공급자 상품 상세 편집기, headless Playwright) — PASS
disposable private 초안 offer(기존 [E2E_TEST] master 재사용) 기준. 소비자 상세(`.content-editor` nth1) 스코프.

| # | 항목 | 관측 | 결과 |
|---|------|------|:--:|
| 1 | URL 이미지 → 삽입 설정 모달 표시 | `이미지 삽입` 모달 노출 | ✅ |
| 2 | product 기본값 = 본문 폭·가운데 | 모달 active=본문 폭, 삽입 결과 align=center | ✅ |
| 3 | 취소 → 미삽입 | present=false | ✅ |
| 4 | 본문 폭 삽입 | `img-w-full` dw=full, w=364 | ✅ |
| 5 | 선택 툴바 표시 | 폭/정렬/삭제 바 노출 | ✅ |
| 6 | 50% 변경 → 실제 폭 변화 | `img-w-50`, w 364→**182** | ✅ |
| 7 | 정렬 좌/가운데 | `img-align-left` / `-center` | ✅ |
| 8 | undo / redo | align left↔center 정확 복귀 | ✅ |
| 9 | HTML 탭 직렬화 | `data-display-width="50"` + `img-align-left` 존재 | ✅ |
| 10 | legacy width=240 보존 | 파싱 후 width=240, w=240, dw=null | ✅ |
| 11 | legacy → 본문 폭 정규화 | width 제거, `img-w-full`, w=240→364 | ✅ |
| 12 | 미리보기(ContentRenderer) 일치 | `guide-rich-content img.editor-image.img-w-full` 가시, w=364 | ✅ |
| 13 | 모바일(390px) 가로 넘침 없음 | img-w-full w=364 ≤ viewport | ✅ |
| 14 | 이미지 삭제 | present=false | ✅ |
| 15 | 콘솔 오류 0 | consoleErrors=[] (크래시 수정 후) | ✅ |
| (보류) | 저장 후 재진입(DB 영속) | §5 참조 — 본 WO 범위 외 | ⚠️ |

## 4. ⚠️ 라이브에서 발견·수정한 실제 크래시 (이 회귀의 핵심 성과)
- 초기 구현은 `@tiptap/react` **BubbleMenu(tippy)** 사용. 이미지 선택(버블 활성) 상태로 **HTML/미리보기 탭 전환** 시 tippy가 버블 DOM을 `document.body`로 이동시킨 상태에서 React가 탭 전환을 reconcile → **`insertBefore`/`removeChild` NotFoundError → ErrorBoundary 발동**(편집 영역 크래시).
- 조건부 마운트·`shouldShow(activeTab)`·`blur`·NodeSelection collapse 모두 부분 회피에 그침(크래시 위치만 이동).
- **최종 수정**: tippy BubbleMenu 제거 → 선택 이미지 위에 absolute 배치되는 **React-완전제어 툴바**로 대체. 재실행 시 **콘솔 0 + 전 항목 PASS**.
- 교훈: typecheck/build/배포 + "동일 패턴" 만으로는 이 클래스의 런타임 DOM 크래시를 못 잡는다. **라이브 회귀가 실제 결함을 발견**(사용자 요구의 정당성 입증).

## 5. 저장 후 재진입(DB 영속) — 후속 IR로 규명 완료 (결함 아님)
- 회귀 자동화에서 저장→재진입 시 텍스트조차 영속 안 된 현상을 `IR-O4O-NETURE-PRODUCT-DRAWER-B2C-DESCRIPTION-SAVE-PERSISTENCE-AUDIT-V1` 로 규명.
- **원인 = 테스트 데이터 아티팩트**: disposable offer 가 **PRIVATE + seller 없음** → `offer.service.ts:1160` `PRIVATE_REQUIRES_SELLER_IDS` 가드가 `offer.save()` 직전 success:false 반환(프론트 toast.error라 console 수집 미포착). **드로어 저장 경로·에디터 직렬화에는 결함 없음** — 정상 offer 에선 폭/정렬 속성이 실린 HTML 이 정상 영속.
- 편집기 레벨 직렬화(§3-9)·역파싱(§3-10)·렌더(§3-12) 이미 라이브 검증됨 → 영속 HTML 에 속성이 실린다는 점 독립 증명.
- 부수: create/update distribution 검증 비대칭(PRIVATE-no-seller 고착 가능)은 IR §5 에서 별도 WO 후보로 분리.

## 6. 검증 (빌드/배포)
| 항목 | 결과 |
|---|---|
| content-editor + web-neture `tsc --noEmit` | ✅ 0 errors |
| content-editor 빌드(tsup dts) | ✅ |
| 배포 Deploy Web Services (neture, 크래시 수정 포함) | ✅ success |

## 7. 테스트 데이터 (조건 준수)
- 기존 [E2E_TEST] master(barcode 2003871659580) 재사용 → private 초안 offer 2건 생성(검증·저장테스트, isActive:false/isPublic:false/serviceKeys 없음/승인 미제출).
- 정리: 각각 `bulkDelete` deleted:1 → 목록 0개 복구, master 보존. **내 생성 데이터 완전 정리, orphan 0.**

## 8. 커밋
- `cad2eb06f` 초기 구현(모달+버블) · `94c5b9089`/`468f97511`/`9398823c2` 크래시 부분수정 시도 · **`3c1d8d085` tippy→React 툴바 대체(크래시 해소)**.

---

**작성:** O4O Platform Team · 2026-06-28
**상태:** 이미지 표시 폭/정렬 구현·라이브 회귀 14/15 PASS(콘솔 0). 라이브에서 tippy BubbleMenu 크래시 발견·수정(React 툴바 대체). 저장→재진입 DB 영속은 드로어 plumbing(본 WO 범위 외)로 보류·별도 확인 권장. 테스트 데이터 완전 정리.
