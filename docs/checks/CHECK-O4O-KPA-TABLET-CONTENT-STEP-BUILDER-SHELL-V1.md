# CHECK-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1

> 목적: 한 화면에 펼쳐진 태블릿 콘텐츠 생성·편집 UI를 **단계형 제작 셸**로 분리.
> 선행: [`CHECK-...-STANDARD-LIST-V1`](CHECK-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1.md)(WO-1) · [`IR-...-CURRENT-STATE-AUDIT-V1`](../investigations/IR-O4O-KPA-TABLET-CONTENT-CREATION-CURRENT-STATE-AUDIT-V1.md)
> Work Order: `WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1`
> 원칙: API/DB/runtime/kiosk-core/template 무변경. 셸·화면 전환 구현(템플릿별 세부 단계·draft 미리보기는 후속 WO).

---

## 1. 실제 원인 / 현재 구조

- 기존 `TabletScreenSetManager`(library)는 **인라인 생성 폼 + 인라인 편집 패널**(세트 정보 저장 + 블록 저장 2버튼)을 리스트와 같은 화면에 동시에 펼쳤다.
- 하위 편집기(`TemplateSelectField`/`BlockConfigForm`/`ContentListEditor`/`ContentPickerModal`/`CustomMediaItems`)와 저장 API(`createScreenSet`/`updateScreenSet`/`saveScreenSetBlocks`)는 이미 존재 → **재사용만으로 단계화 가능**(신규 API 불필요).

---

## 2. 변경 파일 (1개, KPA 한정)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | ① 인라인 생성 폼 + 편집 패널 제거. ② 신규 in-file 컴포넌트 **`TabletContentStepBuilder`**(5단계 wizard) 추가 — 기존 하위 편집기·저장 API·dirty guard 재사용. ③ library render를 3-상태(builder / 리스트 / corner)로 분기. ④ corner 모드 렌더를 corner 전용으로 정리(dead `isLibrary` 분기 제거) — 동작 동일. |

> 하위 편집기가 같은 파일에 있어 **동일 파일 내 컴포넌트**로 추가(별도 export/이동 없이 재사용). corner/library 공용 컴포넌트라 신규 파일 분리보다 in-file 이 저위험.

---

## 3. 변경 내용

### 3.1 단계형 제작 셸 (`TabletContentStepBuilder`)

신규·수정 **공통 셸**. 상단 스텝 인디케이터(클릭 이동) + 하단 `[이전] [다음]`.

| 단계 | 내용 | 재사용 |
|---|---|---|
| 1. 템플릿 | 템플릿 선택(별도 단계로 이동) | `TemplateSelectField` |
| 2. 기본 정보 | 콘텐츠 이름 + 상태(draft/active, 수정 시 archived) | — |
| 3. 화면 구성 | 구조 블록(코너 설명·건강정보·QR·대기화면·직원문의) 추가·순서·표시 + config. 콘텐츠/제품 블록은 힌트만(다음 단계 안내) | `BlockConfigForm` |
| 4. 콘텐츠·제품 | content_list·product_list·product_content 블록 설정 | `BlockConfigForm`→`ContentListEditor`/`ContentPickerModal` |
| 5. 미리보기·저장 | 요약(이름/템플릿/상태/블록 수) + draft 미리보기 후속 안내 + **[태블릿 콘텐츠 저장]** | — |

- **저장**: 신규 = `createScreenSet`(tabletId=null 재사용 세트) → `saveScreenSetBlocks`. 수정 = `updateScreenSet` → `saveScreenSetBlocks`. **저장 성공 후 표준 리스트 복귀**(`onSaved` → `reload`).
- **dirty guard 유지**: baseline(초기값) 대비 이름/상태/템플릿/블록 비교 + `beforeunload` 경고 + 목록 이탈 시 `window.confirm`(`DISCARD_MSG`) 재사용.
- **draft 실미리보기 미구현**(후속 WO): 5단계는 요약 + 안내 문구 + 저장만.

### 3.2 신규·수정 동일 셸

- 리스트 `[+ 태블릿 화면 만들기]`(`onCreate`) → `builder.detail=null`(신규 셸). 리스트 kebab `수정`(`onEdit`) → 상세 hydrate 후 `builder.detail=존재`(수정 셸). **두 경로 모두 동일 컴포넌트**.
- library render: `isLibrary && builder ? <StepBuilder/> : isLibrary ? <info+표준리스트/> : <corner/>` (제작 시 화면 takeover).

### 3.3 제작과 적용 분리

- 제작 셸에 **코너 적용 / 적용 해제 / 코너 변경 / 태블릿 교체 미노출**. 코너 적용은 `코너별 운영` 탭(corner 모드)에서만.

---

## 4. 보존 사항 / 금지선 준수

| 항목 | 상태 |
|---|---|
| corner(코너별 운영) 모드 | ✅ 렌더를 corner 전용으로 정리(dead 분기 제거) — 적용/해제 동작 동일 |
| 기존 하위 편집기 재사용 | ✅ TemplateSelectField/BlockConfigForm/ContentListEditor/ContentPickerModal/CustomMediaItems |
| 기존 Screen Set 생성·수정·블록 저장 API | ✅ createScreenSet/updateScreenSet/saveScreenSetBlocks 무변경 |
| dirty guard | ✅ 셸로 이전(baseline·beforeunload·confirm) |
| 저장 후 리스트 복귀 | ✅ onSaved → setBuilder(null) + reload |
| API / DB migration / runtime / kiosk-core / template / 운영 샘플 / QR 생성 | ✅ **무변경** |
| 템플릿별 requiredBlocks/steps / draft preview API / 복제 API / 코너×콘텐츠 배정 | ✅ 미구현(후속 WO) |

---

## 5. 정적 검증

| 항목 | 결과 |
|---|---|
| `pnpm --filter @o4o/web-kpa-society run build` (`tsc && vite build`) | ✅ **✓ built in 17.89s** (타입체크 통과, noUnusedLocals 정리 포함) |

---

## 6. 배포 / Browser Smoke

| 항목 | 값 |
|---|---|
| commit | (본 커밋) |
| 배포 | Deploy Web Services (Cloud Run) — kpa-society-web |
| Browser smoke | **Deferred** — 인증 세션 미보유 시 자동 로그인 금지(WO). |

> 후속 smoke 항목: 리스트→만들기 진입 / 5단계 표시·이전·다음 이동 / 신규 생성 저장 후 리스트 복귀 / kebab 수정 → hydrate → 저장 / 블록 저장(전체 교체) / dirty guard(이탈 경고) / 코너 적용 기능 미노출 / 성공·실패 toast.

---

## 7. 완료 기준 대조

| 완료 기준 | 결과 |
|---|---|
| 인라인 제작 UI가 단계형 제작 화면으로 분리 | ✅ TabletContentStepBuilder 5단계 |
| 기존 하위 편집기 재사용 | ✅ |
| 신규·수정 모두 동일 셸 | ✅ builder.detail null/존재 분기 |
| 저장 후 표준 리스트 복귀 | ✅ onSaved → reload |
| 제작과 코너 적용 분리 유지 | ✅ 셸에 적용 기능 미노출 |
| API·DB·runtime 변경 없음 | ✅ |
| commit/push | 본 커밋 |
| build | ✅ |
| Browser smoke | Deferred(인증 세션 없음) |

---

*작성: 2026-07-14 · Status: 구현 완료(빌드 통과) · Browser smoke Deferred*
