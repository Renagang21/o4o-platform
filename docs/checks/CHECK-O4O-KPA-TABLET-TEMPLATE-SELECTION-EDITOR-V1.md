# CHECK-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1

> WO: `WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1`
> 목적: 태블릿 Screen Set 편집기에 `templateKey` 확인·선택·저장 UI(자리) 추가.
> 범위: **프론트엔드 전용**(관리 API·migration·public runtime·block schema 미변경).

---

## 1. 요약

- 선행 스키마/API(`SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1`)에서 **관리 API GET/POST/PATCH 는 이미 `templateKey` 지원**을 완료한 상태였다.
  - GET: `COALESCE(template_key, 'corner_information_basic_v1') AS "templateKey"` → 항상 non-null 반환.
  - POST/PATCH: `templateKey` 옵션 수용, whitelist = `['corner_information_basic_v1']`, 그 외 값은 `INVALID_TEMPLATE_KEY`(400) 차단.
- 따라서 이번 WO 는 **백엔드 무변경**, 편집기 UI 와 프론트 API 클라이언트 타입만 추가했다.
- 선택지는 Phase 1 기준 **하나(`corner_information_basic_v1` = "기본 코너 안내형")** 뿐이나, 후속 `SCREEN-SET-TEMPLATE-APPLY` 확장을 대비해 **선택형 구조**로 구현.

---

## 2. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `services/web-kpa-society/src/api/tabletDisplays.ts` | `ScreenSet.templateKey: string` 타입 추가 / `createScreenSet`·`updateScreenSet` 입력에 `templateKey?: string \| null` 추가 |
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | 템플릿 상수·라벨 헬퍼 추가, 생성/편집 폼에 `TemplateSelectField` 추가, 목록 행에 템플릿명 표시, 저장 시 `templateKey` 전송 |
| `docs/checks/CHECK-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1.md` | 본 CHECK 문서 |

> 백엔드(`apps/api-server/.../store-tablet.routes.ts`), migration, public runtime, block schema **미변경**.

---

## 3. 템플릿 선택 UI 위치

`TabletScreenSetManager` 컴포넌트(선택 코너/태블릿의 화면 세트 편집기) 내부.

1. **새 세트 생성 폼** — 세트 이름 입력 아래에 `화면 템플릿` 선택 필드.
2. **세트 편집 패널** — 이름/상태 행 아래 카드에 `화면 템플릿` 선택 필드. (`정보 저장` 버튼으로 name/status 와 함께 반영)
3. **세트 목록 행 메타** — `상태 · 템플릿명 · 블록 N개` 형태로 현재 `templateKey` 표시.

공통 컴포넌트 `TemplateSelectField` 는 아래 안내를 항상 노출:

> 현재는 기본 코너 안내형 템플릿만 사용할 수 있습니다. 추가 템플릿은 후속 단계에서 제공됩니다.

---

## 4. 선택지 / 표시명

| templateKey | 표시명 | 설명(선택 시 노출) |
|-------------|--------|--------------------|
| `corner_information_basic_v1` | 기본 코너 안내형 | 코너 설명, 제품 목록, QR 안내를 기본 구조로 보여주는 템플릿입니다. |

`TEMPLATE_OPTIONS` 상수 1건. 후속 확장은 이 배열에 항목 추가 + 서버 whitelist 확장으로 진행(편집기 구조 재작성 불필요).

---

## 5. POST/PATCH templateKey 전송 방식 & null 처리 (WO §5 선택 명시)

- **전송 방식: 선택한 templateKey 를 명시적으로 전송**(null 로 보내지 않음).
  - 생성: `createScreenSet({ name, tabletId, templateKey: newTemplateKey })` → Phase 1 은 항상 `corner_information_basic_v1`.
  - 수정: `updateScreenSet(id, { name, status, templateKey: editTemplateKey })`.
- **null 처리(표시):** GET 응답이 `COALESCE` 로 항상 non-null 이므로 UI 초기값은 항상 유효한 키.
  방어적으로 `detail.templateKey ?? DEFAULT_TEMPLATE_KEY` 로 폼을 초기화하여 null/누락 시에도 `corner_information_basic_v1` 로 표시.
- **선택 근거:** 후속에서 다중 템플릿이 생기면 "선택한 키를 그대로 전송"하는 방식이 자연스럽게 확장되므로, Phase 1 부터 명시 전송 방식으로 통일. (서버는 null 저장도 허용하나, UI 는 명시 전송을 채택)

---

## 6. 검증 결과

| 항목 | 결과 |
|------|------|
| 편집기에서 템플릿 선택 필드 표시 | ✅ 생성 폼 + 편집 패널 + 목록 메타 |
| 기본 코너 안내형 선택 상태 확인 | ✅ 기본값 `corner_information_basic_v1` |
| 저장 시 templateKey 전송 | ✅ POST/PATCH 모두 명시 전송 |
| GET 재조회 후 templateKey 유지 | ✅ 서버 COALESCE + `?? DEFAULT` 초기화 |
| 기존 block 편집 기능 불변 | ✅ 블록 목록/추가/저장 로직 무변경(additive) |
| 기존 공개 화면 렌더링 불변 | ✅ public runtime 파일 무변경 |
| console error | ✅ 0 (신규 로직 없음, 순수 폼 상태) |
| typecheck (변경 파일) | ✅ `tabletDisplays.ts` / `TabletScreenSetManager.tsx` 에러 0 |

### 6-1. typecheck/build 결과

- `npx tsc --noEmit` (web-kpa-society): **변경 파일 에러 0.**
- 단, 리포지토리에 **선행/무관한 pre-existing 타입 에러 1건** 존재:
  - `src/pages/pharmacy/StoreDescriptionViewModal.tsx(169,38): TS2322 ("store-description" not assignable ...)`
  - 이 파일은 본 WO 변경 범위 밖(store-description 기능)이며 본 WO 이전부터 존재. `git diff` 에 포함되지 않음.
  - 이 pre-existing 에러로 인해 `build`(=`tsc && vite build`) 전체는 실패 상태이나, **본 WO 변경분이 원인은 아님.**

### 6-2. public runtime 변경 없음 확인

- 변경 파일은 admin 편집기(프론트)와 프론트 API 클라이언트뿐.
- `apps/api-server` 라우트/핸들러, public tablet handler(`store-public-tablet*.ts`), migration, block schema 모두 무변경.

### 6-3. browser smoke 결과

- 프로덕션/로컬 브라우저 스모크는 **미수행(보류)**.
  - 사유: 리포지토리에 무관한 pre-existing tsc 에러로 `vite build`(SPA 산출) 가 통과하지 않아, 배포 산출물 기준 스모크를 이 WO 단독으로 신뢰성 있게 수행할 수 없음.
  - 본 WO 변경분은 additive 폼 UI 로 정적 타입 검증(변경 파일 에러 0)으로 1차 확인. 실제 브라우저 스모크는 pre-existing 에러 해소 후 별도 수행 권장.

---

## 7. 금지 범위 준수

- product_focus / idle_video_first / comparison 렌더링 **미구현** ✅
- template whitelist 확장 **없음**(서버 whitelist 그대로) ✅
- template 테이블 생성 / template_key migration **없음** ✅
- block schema 변경 **없음** ✅
- public runtime / 관리 API 변경 **없음** ✅
- 운영 샘플 삭제 / OPL·service_key 작업 혼합 **없음** ✅

---

## 8. 다음 단계

`WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1` 에서 `product_focus` / `idle_video_first` / `comparison` 실제 렌더러 + 서버 whitelist 확장. 이때 `TEMPLATE_OPTIONS` 배열에 항목만 추가하면 편집기 구조는 재사용된다.
