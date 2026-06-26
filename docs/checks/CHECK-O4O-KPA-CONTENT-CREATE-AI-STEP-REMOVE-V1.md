# CHECK-O4O-KPA-CONTENT-CREATE-AI-STEP-REMOVE-V1

> 작업: **KPA 콘텐츠 제작 AI 본문 생성 단계 제거 — 빈 편집기 직접 작성 전용**
> 대상: `CreateContentFromResourcesModal`(/store/library/contents 콘텐츠 제작)
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `af4c451cf` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

콘텐츠 제작 모달에서 **"자료 선택 → AI 본문 생성" 진입점 제거**, **빈 편집기 직접 작성·외부 LLM 붙여넣기 중심**으로 단순화(초안 생성 AI 제거 정책, IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1). **frontend 1파일 · backend/migration 없음.**

### 제거한 콘텐츠 제작 AI 진입점 (CreateContentFromResourcesModal.tsx)
- **2단계(select 자료선택 → compose AI생성)** 구조 → **빈 편집기 단일 단계**로 단순화.
- 자료 multi-select 단계(SelectStep) + 검색 + 자료 로딩.
- `/api/ai/content` 직접 호출(handleGenerate, outputType='product_detail') + AI 생성 버튼.
- 제작 요청(userIntent) + 보조 옵션 preset(분량/톤/방향/이미지/URL) + PresetChipGroup.
- 관련 AI state/import(Sparkles/Search/getStoreExecutionAssets/assetSnapshotApi 등).

### 유지한 직접 작성 흐름
- 제목 / 태그(TagInput) / **RichTextEditor(`preset='full'` → Toolbar "AI 정리" 편집 보조)** / 저장.
- 외부 LLM 붙여넣기 안내 문구("외부 AI 도구…에서 작성한 초안을 붙여넣고 편집하세요").

## 2. 저장 payload/경로 (유지)
`POST /store-contents { title, tags, contentJson: { html, sourceResources: [], generatedBy: 'manual-direct' } }` → **direct content** 저장 → `/store/library/contents` 문서형 목록 '내 콘텐츠'(origin='direct')로 노출. 저장 후 `/store/content/direct/:id` 이동.

## 3. 보존 (제거 금지 — 정책상 유지)
| 항목 | 보존 |
|------|------|
| `AiContentModal` 컴포넌트 / `/api/ai/content` / ai-prompts | **무변경** |
| RichTextEditor Toolbar **"AI 정리"**(편집 보조) | 모달이 `RichTextEditor preset='full'` 사용 → Toolbar AI **그대로 노출**(content-editor 패키지 무변경) |

## 4. 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `af4c451cf`)

| 검증 | 결과 |
|------|------|
| "콘텐츠 제작" → 모달 제목 "콘텐츠 작성", **자료 선택 단계 없음**(1/2 없음) | ✅ |
| **"AI 콘텐츠 생성"/"AI 작성" 버튼 없음** | ✅ |
| 제목/태그/RichTextEditor + 외부 LLM 안내 문구 표시 | ✅ |
| **편집기 Toolbar "AI 정리"(편집 보조) 존재** | ✅ (브라우저 관측 toolbarAiPresent=true) |
| 제목+태그+본문 작성 → 저장 → **direct content 생성**(origin='direct', tags=['스모크']), `/store/content/direct/:id` 이동 | ✅ |
| 신규 콘텐츠 `/store/library/contents` 목록 노출(검색 매칭) | ✅ |
| store_execution_assets content 신규 0(origin=direct 확인, exec 아님) | ✅ |
| 콘텐츠 목록 8건 + 출처 탭 4개 + QR/POP inline 버튼(선택 시) | ✅ |
| 테스트 콘텐츠 정리(DELETE /store-contents/direct/:id 200) | ✅ |

> **참고(세션 이슈)**: smoke 중 브라우저 `o4o_accessToken`이 renagang21→sohae2100(Sohae 약국, 콘텐츠 0)으로 드리프트해 일시적으로 목록 0건 관측 → renagang21 재인증 후 feed total=8 복구 확인. **본 WO 회귀 아님**(0건은 빈 org 세션, 콘텐츠 생성/목록은 renagang21 세션에서 정상 검증됨). 토큰 불안정은 테스트 환경 기존 이슈.

## 5. 검증 기타
- `web-kpa-society` 전체 tsc --noEmit 오류 0(모달+소비처 0). Web Cloud Run 배포 success(backend 무변경 → api 배포 불필요).

## 6. GP/KCos 영향
- 변경 파일 = `services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx` 단일(KPA 전용).
- GP/KCos는 자체 `StoreLibraryContentsPage`에서 `AiContentModal`을 직접 사용(별도 파일) → **무변경**. → **KPA 콘텐츠 제작만 AI 제거, GP/KCos 무영향.**

## 7. 범위/안전
- AiContentModal/api·ai-prompts/Toolbar AI 삭제 0. direct 저장 경로·콘텐츠 데이터·migration 0. store_execution_assets/production-materials 신규 생성 0(direct만). 콘텐츠 목록 검색/태그/출처 탭·QR/POP inline 무변경.

## 8. 후속
- **`WO-O4O-KPA-POP-AI-STEP-REMOVE-V1`**(다음 — StorePopPage AiContentModal initialMode='pop' "AI 문구 생성").
- 이후 BLOG-AI / PRODUCT-DESC / RESOURCE / COURSE-LECTURE / SIGNAGE → GP/KCos parity → 외부 LLM 안내(IR §G).

---

## 9. 최종 판정

> KPA 콘텐츠 제작 흐름에서 "자료 선택 → AI 본문 생성" 단계가 제거되고, 빈 편집기 직접 작성·외부 LLM 붙여넣기 중심으로 단순화된다. 신규 콘텐츠는 direct content로 저장되어 콘텐츠 목록에 노출되고, store_execution_assets 신규 생성은 없다. AiContentModal/`/api/ai/content`/편집기 Toolbar AI는 보존되며, 콘텐츠 목록·QR/POP inline이 회귀하지 않는다. GP/KCos 무영향.

→ **충족.**
