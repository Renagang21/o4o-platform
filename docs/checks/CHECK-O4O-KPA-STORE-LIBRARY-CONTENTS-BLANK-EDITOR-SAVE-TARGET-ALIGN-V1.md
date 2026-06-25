# CHECK-O4O-KPA-STORE-LIBRARY-CONTENTS-BLANK-EDITOR-SAVE-TARGET-ALIGN-V1

> 작업: **KPA 내 자료함 콘텐츠 제작 "빈 편집기" 저장 위치 정합**
> 대상: `/store/library/contents` "콘텐츠 제작" 모달(`CreateContentFromResourcesModal`)
> 작업일: 2026-06-25 / 상태: **코드 완료 · typecheck PASS · 운영 브라우저 smoke PASS** (배포본 `dc22dfb1d`)

---

## 1. 원인

직전 작업(`WO-O4O-KPA-STORE-LIBRARY-CONTENTS-BLANK-EDITOR-ENTRY-RESTORE-V1`)에서 "빈 편집기에서 바로 작성"을 복원했으나, 저장 대상이 어긋났다:

- 시작: `/store/library/contents` "콘텐츠 제작" 모달
- 빈 작성 클릭 → `navigate('/store/library/production-materials/new')` → `ProductionMaterialEditorPage` → `createStoreExecutionAsset`(store_execution_assets) → **매장 제작 자료 목록**에 저장
- → 사용자가 시작한 `/store/library/contents` 목록에는 **표시되지 않음**(저장소가 다름).

`/store/library/contents` 문서형 목록은 `storeLibraryApi.listContents({type:'document'})`(snapshot + direct 통합 feed)를 읽고, 직접 작성 콘텐츠는 `/store-contents` POST(origin='direct')로 생성된 것이 표시되는 구조.

---

## 2. 수정 내역

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx` | `handleCreateBlank`: navigate 제거 → **같은 모달 compose 단계 진입**(원소스 0개=직접 작성). 저장은 기존 `handleSave`의 `/store-contents` POST(direct 콘텐츠) 재사용. `ComposeStep`에 `isBlankMode` 추가 — 0개일 때 원소스/제작 요청/보조 옵션/AI 생성 섹션 숨김 + 빈 RichTextEditor 즉시 노출. footer 안내 "본문을 직접 작성한 뒤 저장하세요". 저장 payload `generatedBy`=manual-direct(0개)/create-from-resources(자료 기반) |

- 신규 API/migration 없음. KPA 전용. 기존 자료 선택→AI→저장 흐름 무변경(isBlankMode는 0개에서만 발동).
- `production-materials/new`(매장 제작 자료 빈 작성) 기능은 **삭제하지 않음** — 매장 제작 자료 화면에서 별도 유지.

---

## 3. 운영 브라우저 smoke (배포본 `dc22dfb1d`)

| 검증 | 결과 |
|------|------|
| 콘텐츠 제작 → "빈 편집기에서 바로 작성" → **같은 모달 compose 단계(2/2)** 진입 | ✅ (production-materials로 이탈 안 함) |
| blank 모드 UI(원소스/AI 섹션 숨김, 빈 편집기 즉시, "자료 없이 직접 작성합니다") | ✅ |
| footer "본문을 직접 작성한 뒤 저장하세요" | ✅ |
| 제목/본문 작성 → 저장 → `/store/content/direct/:id`(배지 "내 매장 콘텐츠") | ✅ |
| **`/store/library/contents` 문서형 목록에 표시** (배지 "내 콘텐츠", 원본 유형 "매장 직접 작성") | ✅ (0건 → 1건) |
| 테스트 데이터 정리(상세 삭제) | ✅ |

### smoke 절차 (요약)

1. `/store/library/contents` → 콘텐츠 제작 → "빈 편집기에서 바로 작성"
2. 제목 `빈편집기 저장정합 스모크 250625` + 본문 marker → "내 자료함 콘텐츠로 저장"
3. `/store/content/direct/492b672d…` 이동(내 매장 콘텐츠) 확인
4. "내 자료함 콘텐츠로 돌아가기" → 목록에 "매장 직접 작성 / 내 콘텐츠"로 표시 확인
5. 상세 → 삭제 → 목록 0건 복귀

> 자료 선택→AI 흐름(Smoke 2): 본 매장에 자료 0건이라 전체 재현은 불가하나, 변경은 additive(`isBlankMode`=원소스 0개에서만 발동)이며 자료 선택 시 `goCompose`로 selectedRows>0 → 기존 AI 흐름 그대로 렌더. production-materials 빈 작성(Smoke 3)은 본 WO 미변경(코드 보존).

---

## 4. 검증

| 검증 | 결과 |
|------|------|
| `services/web-kpa-society` `tsc` (변경 파일) | ✅ 오류 0 |
| 운영 브라우저 smoke | ✅ PASS |
| 테스트 데이터 정리 | ✅ |

---

## 5. 최종 판정

> `/store/library/contents`에서 `콘텐츠 제작 → 빈 편집기에서 바로 작성 → 저장`한 콘텐츠가 같은 `/store/library/contents` 목록에 "내 콘텐츠(매장 직접 작성)"로 표시된다. 기존 자료 선택 기반 제작 흐름과 `/store/library/production-materials` 제작자료 기능은 유지된다.

→ **충족.**
