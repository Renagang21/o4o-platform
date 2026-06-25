# CHECK-O4O-KPA-STORE-LIBRARY-CONTENTS-BLANK-EDITOR-ENTRY-RESTORE-V1

> 작업: **KPA 내 자료함 콘텐츠 제작 — "편집기에서 바로 제작" 진입점 복원**
> 대상: `/store/library/contents` "콘텐츠 제작" 모달
> 작업일: 2026-06-25 / 상태: **코드 완료 · typecheck PASS · 운영 브라우저 smoke PASS** (배포본 `12526fc8f`)

---

## 1. 원인 (회귀 확정)

`/store/library/contents` "콘텐츠 제작" 버튼은 [`CreateContentFromResourcesModal`](services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx)(2단계: 자료 선택 → AI 작성)을 연다. 이 모달은 **자료 선택을 강제**("다음" 버튼이 0개 선택 시 disabled)하여, 자료 없이 빈 편집기로 바로 진입하는 경로가 사라진 회귀 상태였다.

---

## 2. 수정 내역

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx` | 자료 선택(select) 단계 footer 좌측에 **"빈 편집기에서 바로 작성"** 보조 버튼 추가(항상 노출). 클릭 시 모달 닫고 `navigate('/store/library/production-materials/new')`(빈 상태) → `ProductionMaterialEditorPage`(빈 편집기). canonical 빈 제작 흐름 재사용 |

- 저장 시 `createStoreExecutionAsset`(sourceType='generated', assetType='content') = **내 매장 제작자료** 생성. **source asset/derivation 없음.** POP/QR/블로그/사이니지 활용 대상.
- 기존 자료 선택 → 다음 → AI 제작 흐름 **무변경**(additive — 버튼만 추가, goCompose/ComposeStep 미변경).
- 신규 API/migration 없음. KPA 전용.

---

## 3. 수용 기준 점검 (운영 브라우저 smoke, 배포본 `12526fc8f`)

| 요구사항 | 결과 |
|------|------|
| 1·3. 자료 선택 없이 빈 편집기 진입 버튼, 항상 노출(자료 0건/0개 선택이어도 클릭 가능) | ✅ 모달에 "빈 편집기에서 바로 작성" 노출, "다음 →"은 0개 disabled 유지 |
| 2. 버튼 문구 | ✅ "빈 편집기에서 바로 작성" |
| 4. 기존 흐름 유지(자료 선택→다음→제작) | ✅ 다음 버튼/2단계 흐름 무변경(additive) |
| 5. 빈 작성 = source 없이 새 제작 화면 | ✅ `/store/library/production-materials/new` 빈 상태("새 제작 자료 작성"), 출처 없음 |
| 6. 저장 후 제작자료 생성 + 활용 대상 | ✅ `/store/library/production-materials` 목록에 새 제작자료 "빈편집기 복원 스모크 250625"(완성, 활용하기) 표시 |

### smoke 절차

1. `/store/library/contents` → "콘텐츠 제작" → 모달 "빈 편집기에서 바로 작성" 노출 확인(자료 0건 상태)
2. 클릭 → 빈 편집기(`/store/library/production-materials/new`) 진입 확인
3. 제목·본문 입력 → "매장 제작 자료로 저장" → `/store/library/production-materials` 목록에 새 항목 생성 확인
4. 테스트 항목 삭제(원복)

---

## 4. 검증

| 검증 | 결과 |
|------|------|
| `services/web-kpa-society` `tsc` (변경 파일) | ✅ 오류 0 |
| 운영 브라우저 smoke | ✅ PASS |
| 테스트 데이터 정리 | ✅ 생성 제작자료 삭제 |

---

## 5. 최종 판정

> `/store/library/contents` "콘텐츠 제작" 모달에서 자료 선택 없이도 빈 편집기로 바로 진입할 수 있으며, 저장 시 내 매장 제작자료로 생성되어 POP/QR/블로그/사이니지 활용 대상이 된다. 기존 자료 선택 기반 제작 흐름은 그대로 유지된다.

→ **충족.**
