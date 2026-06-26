# CHECK-O4O-KPA-POP-AI-STEP-REMOVE-V1

> 작업: **KPA POP 제작 흐름 AI 문구 생성 단계 제거**
> 대상: `/store/marketing/pop`(StorePopPage) — POP 문구 AI 생성 진입점
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `9e05a8dd5` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

KPA POP 제작 화면에서 **POP 문구를 AI로 생성하는 페이지 진입점만 제거**(초안 생성 AI 제거 정책, IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1). **frontend 1파일(StorePopPage.tsx) · backend/migration 없음.**

### 제거한 POP AI 진입점 (StorePopPage.tsx)
- "AI 문구 생성" 패널의 **"AI 문구 만들기"/"재생성" 버튼**(`setAiOpen(true)`).
- `<AiContentModal open={aiOpen} initialMode="pop" onInsert={handleAiInsert}>` render.
- `aiOpen` state, `handleAiInsert` 콜백, `buildAiInputText` 헬퍼, `AiContentModal`·`Sparkles` import.
- AI 미생성 시 안내 hint("AI 문구를 생성하면…").

→ POP 문구는 **선택한 자료의 제목·설명을 그대로 사용**(generate 시 aiContent optional).

### 보존 — 가져온 POP(prefill) 경로
- `popAiContent`는 이제 **가져온 POP(prefillPop, router state) 경로에서만** 설정됨.
- 그 경우에만 **"가져온 POP 문구" 패널**(미리보기 + **"POP 콘텐츠로 저장"** handleSaveAsContent + 문구 제거) 노출. popAiContent 없으면 패널 미표시.

## 2. 보존 (제거 금지 — 정책상 유지)
| 항목 | 보존 |
|------|------|
| `AiContentModal` 컴포넌트(@o4o/content-editor) / `/api/ai/content` / ai-prompts / outputType='pop' | **무변경** |
| RichTextEditor Toolbar **"AI 정리"**(편집 보조) | **@o4o/content-editor 패키지 무변경** → 구조적 보존 |
| POP 생성(handleGenerate, `/pharmacy/pop/generate`) / PDF / 생성된 POP 목록(getStoreExecutionAssets usageType='pop') / 삭제(deleteStoreExecutionAsset) | **무변경** |

## 3. inline POP(콘텐츠 목록) 흐름
- `/store/library/contents` → 콘텐츠 선택 → POP 만들기 = `StorePopCreateModal`(WO-...-INLINE-POP-CREATE-V1)은 **원래 AI 진입점 없음** → 본 WO 영향 없이 이미 AI-free.

## 4. 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `9e05a8dd5`)

| 검증 | 결과 |
|------|------|
| `/store/marketing/pop`에 "AI 문구 만들기"/"AI 문구 생성"/"재생성" 버튼·패널 없음 | ✅ |
| "생성된 POP" 목록 섹션 + "콘텐츠에서 새 POP 만들기" 링크 보존 | ✅ |
| inline POP 모달(콘텐츠 선택→POP 만들기) AI 버튼 없음 | ✅ |
| **POP 생성 성공**(프리미엄 간 건강 direct, PDF fileUrl) | ✅ |
| 생성 POP가 `/store/marketing/pop` 목록에 표시 | ✅ |
| POP 삭제(store/assets DELETE 200) | ✅ |
| 콘텐츠 목록 8건 | ✅ |
| 기존 QR `/qr/3`(역노화) 정상 | ✅ |
| 편집기 Toolbar "AI 정리" 보존 | ✅ (코드 보장 — content-editor 무변경) |

> **참고(세션 이슈)**: smoke 중 `o4o_accessToken`이 renagang21→sohae2100으로 드리프트(테스트 환경 기존 토큰 불안정) → renagang21 재인증(POST /auth/login, accessToken body) 후 검증. 본 WO 회귀 아님.

## 5. 검증 기타
- `web-kpa-society` 전체 tsc --noEmit 오류 0(StorePopPage 0). Web Cloud Run 배포 success(backend 무변경 → api 배포 불필요).

## 6. GP/KCos 영향
- 변경 파일 = `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx` 단일(KPA 전용).
- GP/KCos의 POP 화면(`services/web-glycopharm/*/StorePopPage.tsx`, `services/web-k-cosmetics/*/StorePopPage.tsx`)은 **별도 파일 → 무변경**. 공통 컴포넌트(AiContentModal) 미변경.
- → **KPA POP만 AI 진입점 제거, GP/KCos 무영향.**

## 7. 범위/안전
- AiContentModal/api·ai-prompts·outputType='pop'/Toolbar AI 삭제 0. POP 생성 API·저장소·데이터·migration 0. QR/콘텐츠 제작 AI 제거 상태 회귀 0. 블로그/강의/상품설명/사이니지 AI는 본 WO 미포함.

## 8. 후속
- **`WO-O4O-KPA-BLOG-AI-STEP-REMOVE-V1`**(다음 — PharmacyBlogPage 페이지 AI 진입, Toolbar AI 보존 주의).
- 이후 PRODUCT-DESC / RESOURCE / COURSE-LECTURE / SIGNAGE → GP/KCos parity → 외부 LLM 안내(IR §G 순).

---

## 9. 최종 판정

> KPA `/store/marketing/pop`의 POP 만들기 흐름에서 "AI 문구 생성/만들기" 진입점이 제거되고, POP 생성은 선택 자료 기반으로 정상 동작한다(PDF 생성·목록·삭제 회귀 없음). AiContentModal/`/api/ai/content`/편집기 Toolbar AI는 보존되며, inline POP·QR·콘텐츠 목록이 회귀하지 않는다. 가져온 POP(prefill) 문구 패널은 유지. GP/KCos 무영향.

→ **충족.**
