# CHECK-O4O-KPA-BLOG-AI-STEP-REMOVE-V1

> 작업: **KPA 블로그 작성 흐름 AI 초안 생성 단계 제거**
> 대상: `/store/content/blog`(PharmacyBlogPage) — 블로그 초안 AI 생성 진입점
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `f2ab228c6` · 운영 브라우저 smoke PASS(편집 화면) / 저장 persistence는 store slug 정비 후 별도 검증**

---

## 1. 변경 요약

KPA 블로그 작성/수정 화면에서 **블로그 초안을 AI로 생성하는 페이지 진입점만 제거**(초안 생성 AI 제거 정책, IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1). **frontend 1파일(PharmacyBlogPage.tsx) · backend/migration 없음.**

### 제거한 블로그 AI 진입점 (PharmacyBlogPage.tsx)
- **"✨ AI 콘텐츠 보조" 배너 + "AI로 정리하기" 버튼**(`setAiOpen(true)`).
- `<AiContentModal open={aiOpen} editor={null} onInsert={handleAiInsert}>` render.
- `aiOpen` state, `handleAiInsert` 콜백, AI 전용 helper `extractTitleFromHtml`/`htmlToPlain`, dead `aiBanner*` 스타일 4개, `AiContentModal` import(→ `RichTextEditor`만 유지).

→ 블로그 본문은 **외부 LLM 초안 붙여넣기 + 직접 작성**. 배너 자리에 짧은 안내("외부 AI 도구(ChatGPT·Claude·Gemini 등)나 문서에서 작성한 글을 아래 본문에 붙여넣고 편집하세요.")로 대체.

## 2. 보존 (제거 금지 — 정책상 유지)
| 항목 | 보존 |
|------|------|
| `AiContentModal` 컴포넌트(@o4o/content-editor) / `/api/ai/content` / ai-prompts | **무변경** |
| 본문 **RichTextEditor**(`preset='full'`) Toolbar **"AI 정리"**(편집 보조) | **유지** — `RichTextEditor` import 보존, content-editor 패키지 무변경 |
| 블로그 작성/수정/저장(handleSave)/삭제/발행/목록/설정 | **무변경**(blogStaff API 미변경) |

## 3. 운영 브라우저 smoke (renagang21, 배포 `f2ab228c6`)

| 검증 | 결과 |
|------|------|
| `/store/content/blog` → "블로그 글 만들기" → 편집 화면 "새 게시글" 렌더 | ✅ |
| **"AI 콘텐츠 보조" 배너 / "AI로 정리하기" 버튼 없음** | ✅ |
| 외부 LLM 붙여넣기 안내 문구 표시 | ✅ |
| 제목 / 슬러그 / 요약 입력 + 본문 RichTextEditor 정상 | ✅ |
| **본문 편집기 Toolbar "AI 정리" 버튼 보존** | ✅ (스냅샷 ref 확인 — 편집 보조 AI 유지) |
| 제목+본문 입력 시 "임시 저장" 버튼 활성화 | ✅ |
| 블로그 저장/목록 persistence(blog/staff, store slug 의존) | ⏸ **store slug 정비 후 별도 검증으로 분리**(사용자 지시). handleSave·blogStaff API 미변경이므로 회귀 위험 없음 |

> **참고**: 블로그 목록/저장 API는 `/stores/{slug}/blog/staff`(store-owner 권한·store slug 의존). 테스트 환경에서 slug 해석/세션 ownership 이슈로 live persistence 확인은 보류. 본 WO는 **AI 배너·모달·handleAiInsert·helper·스타일만 제거**했고 저장 경로(handleSave)는 손대지 않음 → 저장 회귀 없음.

## 4. 검증 기타
- `web-kpa-society` 전체 tsc --noEmit 오류 0(PharmacyBlogPage 0). Web Cloud Run 배포 success(backend 무변경 → api 배포 불필요).

## 5. GP/KCos 영향
- 변경 파일 = `services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx` 단일(KPA 전용).
- GP/KCos 블로그 화면은 별도 파일 → **무변경**. 공통 컴포넌트(AiContentModal·content-editor) 미변경. → **KPA 블로그만 AI 진입점 제거, GP/KCos 무영향.**

## 6. 범위/안전
- AiContentModal/api·ai-prompts·Toolbar AI 삭제 0. 블로그 저장 API·데이터·migration 0. 기존 블로그 글 변경/삭제 0. QR/POP/콘텐츠 제작 AI 제거 상태 회귀 0. 상품설명/자료실/강의/사이니지 AI는 본 WO 미포함. 외부 LLM 안내 공통화는 후속.

## 7. 후속
- 블로그 저장/목록 persistence 검증(store slug 정비 후).
- AI 제거 잔여: **PRODUCT-DESC / RESOURCE / COURSE-LECTURE / SIGNAGE** (사용자 노출 큰 쪽 우선) → GP/KCos parity → 외부 LLM 안내(`WO-O4O-CONTENT-EXTERNAL-LLM-GUIDE-V1`).

---

## 8. 최종 판정

> KPA `/store/content/blog` 블로그 작성/수정 흐름에서 "AI 콘텐츠 보조 / AI로 정리하기" 초안 생성 진입점이 제거되고, 외부 LLM 붙여넣기·직접 작성 중심으로 단순화된다. AiContentModal/`/api/ai/content`/본문 편집기 Toolbar "AI 정리"는 보존되며, 블로그 저장 경로(handleSave)·blogStaff API는 미변경이다. GP/KCos 무영향. (저장 persistence live 검증은 store slug 정비 후로 분리.)

→ **충족(편집 화면 검증 완료, 저장 persistence 후속 분리).**
