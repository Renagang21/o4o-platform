# IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1

> 유형: 조사 (read-only) / 상태: 분류 완료, 후속 WO 결정 대기
> 작성일: 2026-06-26 / 범위: O4O 전 서비스(KPA / GlycoPharm / K-Cosmetics / Neture) + 공통 패키지
> 정책: **O4O는 초안을 생성하지 않는다. 사용자가 외부 LLM(ChatGPT/Claude/Gemini)에서 작성한 초안을 편집기에 붙여 활용한다. 단, 편집기 내부 AI 보조(기존 본문 다듬기)는 유지한다.**

---

## 0. 결론 요약 (가장 중요)

1. **백엔드 AI 엔드포인트는 전부 "원문 기반 재구성" 엔진**이다(빈 상태 순수 생성 엔드포인트 없음, COMMON_RULES 강제). → **분류는 백엔드가 아니라 "UI 진입점의 목적"으로 한다.** 같은 `/api/ai/content`라도 진입점에 따라 초안생성/편집보조가 갈린다.
2. **핵심 컴포넌트 `AiContentModal`(@o4o/content-editor)이 두 용도를 공유한다:**
   - **페이지 버튼**(예: "AI 문구 생성", "AI 작성", "AI 콘텐츠 생성")이 `initialMode='pop'|'store_qr'|...` 또는 `editor=null`로 열면 → **초안 생성**(제거 대상).
   - **편집기 Toolbar "AI 정리" 버튼**이 `editor`를 넘기고 "에디터에서 가져오기"로 기존 본문을 잡으면 → **편집 보조**(유지 대상).
   - ⚠️ **따라서 제거는 `AiContentModal` 컴포넌트 자체가 아니라 "페이지 진입점(버튼/모달 open)"을 대상으로 해야 한다.** 모달을 통째로 없애면 Toolbar 편집 보조까지 사라진다.
3. **제거 대상 진입점은 전부 store/instructor/operator 페이지의 "AI 생성" 버튼 + 전용 모달**(AiContentModal page-entry, CreateContentFromResourcesModal AI 생성, CourseStructureAiModal, signage AiContentGenerationModal). **공통 패키지(@o4o/content-editor) Toolbar AI는 유지.**
4. **서비스 공유**: store POP/블로그/상품설명/콘텐츠 제작 화면은 KPA/GP/KCos가 **거의 동일 미러**. 제거 시 3 서비스 동시 영향 — serviceKey 분기보다 **공통 정책 제거** 또는 서비스별 동일 WO 병행. **Neture는 AiContentModal 미사용**(RichTextEditor 편집 보조만) → 영향 작음.

---

## 1. 백엔드 AI 엔드포인트 (E 표)

| endpoint | method | outputType/입력 | 목적 | 주 caller | 분류(엔진관점) | 비고 |
|---|---|---|---|---|---|---|
| `/api/ai/content` | POST | 7종: product_detail / blog / pop / summary / title_suggest / store_qr / store_sns / flexible | 원문→형식별 재구성(title/summary/bullets/html) | AiContentModal, CreateContentFromResourcesModal | **엔진(공유)** | 초안생성·편집보조 둘 다 이 엔진 사용 |
| `/api/ai/url-to-blocks` | POST | url + length/tone/customInstruction | URL→O4O 블록 변환 | AiContentModal(URL 탭) | 엔진(공유) | URL 초안 vs 정리 둘 다 |
| `/api/ai/content-to-store-use` | POST | sourceHtml + useCase(qr/pop/sns/blog) | 기존 HTML→매장 활용 변환 | (store 흐름) | 편집보조성 | 원문 HTML 필수 |
| `/api/ai/course-structure` | POST | input + type(url/topic) | 주제/URL→5~8 레슨 목차 | CourseStructureAiModal | **초안생성(목차)** | 강의 목차 AI |
| `/api/ai/lesson-body` | POST | courseTitle+lessonTitle+summary | 레슨 본문 700~1200자 초안 | CourseEditPage 흐름 | **초안생성(본문)** | 강의 본문 AI |
| `/api/ai/query` | POST | query + context | 자유 Q&A | admin FloatingAiButton | 비-콘텐츠(Q&A) | 본 정책 범위 외 |
| `/api/ai/generate` | POST | provider/model/prompt | 로우레벨 프록시(COMMON_RULES 미강제) | (내부) | 판단필요 | 보안/용도 별도 검토 |
| `/api/ai/vision/analyze` | POST | image | 이미지 분석 | (내부) | 비-콘텐츠(분석) | 범위 외 |
| `ai-prompts` 패키지 | — | 위 7 outputType 템플릿 | 프롬프트 SSOT | `apps/api-server/src/services/ai-prompts/*`, `@o4o/ai-prompts` | 엔진 | 전부 "원문 재구성" 문구 |

> **백엔드는 본 정책에서 즉시 삭제하지 않는다.** UI 진입점 제거 후, 호출처 0이 된 outputType/endpoint만 후속 dead-code cleanup에서 정리.

---

## 2. 전체 AI 진입점 목록 (A 표)

| 영역 | 서비스 | 화면/route | component/file:line | 버튼/기능 | endpoint | outputType | 분류 |
|---|---|---|---|---|---|---|---|
| 편집기 | 공통(@o4o/content-editor) | 전 서비스 RichTextEditor(preset='full') | `Toolbar.tsx:573` "AI 정리" | 기존 본문 정리/요약/톤 | /api/ai/content | flexible | **B 유지** |
| 매장 POP | KPA | /store/marketing/pop | `StorePopPage.tsx:680` (initialMode='pop') | "AI 문구 생성" | /api/ai/content | pop | **A 제거** |
| 매장 QR | KPA | /store/marketing/qr | `StoreQRPage.tsx:1169` | "AI 작성" | /api/ai/content | store_qr | **A 제거** |
| 콘텐츠 제작 | KPA | /store/library/contents (콘텐츠 제작 모달) | `CreateContentFromResourcesModal.tsx:577` | "AI 콘텐츠 생성"(자료→본문) | /api/ai/content | product_detail | **A 제거** |
| 콘텐츠 제작 | KPA | /store/library/contents (제작 시작 모달) | `StoreLibraryContentsPage.tsx:197` | AI 초안 | /api/ai/content | flexible | **A 제거** |
| 제작 자료 | KPA | /store/library/production-materials | `StoreProductionMaterialsPage.tsx:783` | AI 생성 | /api/ai/content | flexible | **A 제거** |
| 상품 설명 | KPA | 상품 상세설명 | `StoreProductDescriptionsPage.tsx:425` | 상품설명 AI 보조 | /api/ai/content | product_detail | **A 제거** |
| 블로그 | KPA | /store blog | `PharmacyBlogPage.tsx:547` | 블로그 AI(페이지 진입) | /api/ai/content | flexible | **A 제거** (단 Toolbar AI는 유지) |
| 자료/자료실 | KPA | 자료 작성 | `ResourceWritePage.tsx:572`, `ResourceWriteModal.tsx:431` | 자료 AI 초안 | /api/ai/content+url-to-blocks | flexible | **A 제거** |
| 강의 | KPA | instructor course edit | `CourseEditPage.tsx:474` | 강의 본문 AI | /api/ai/content / lesson-body | flexible | **A 제거** |
| 강의 목차 | KPA | instructor course | `CourseStructureAiModal.tsx` | 강의 목차 AI 생성 | /api/ai/course-structure | (레슨배열) | **A 제거** |
| 사이니지 | KPA | operator signage | `operator/signage/AiContentGenerationModal.tsx:421` | "초안 생성하기"/"다시 생성" | (signage 생성 API) | — | **A 제거** |
| 운영자 콘텐츠 | KPA | /operator/content-hub | `OperatorContentHubPage.tsx:576` | placeholder "AI 생성 또는 직접 입력"(활성 버튼 없음) | — | — | **D 판단**(활성 진입점 미발견) |
| 매장 POP/블로그/상품설명/콘텐츠/강의 | **GP** | 동일 미러 | StorePopPage:549 / PharmacyBlogPage:508 / StoreLibraryContentsPage:175 / StoreProductDescriptionsPage:385 / InstructorCourseEditPage:299 / OperatorResourcesPage:24 | 동일 | /api/ai/content | pop/flexible 등 | **A 제거(서비스 병행)** |
| 매장 POP/블로그/상품설명/콘텐츠 | **KCos** | 동일 미러 | StorePopPage:505 / StoreBlogManagePage:483 / StoreLibraryContentsPage:175 / StoreProductDescriptionsPage:385 | 동일 | /api/ai/content | pop/flexible 등 | **A 제거(서비스 병행)** |
| 상품 등록 등 | **Neture** | supplier 화면 | RichTextEditor만(AiContentModal 미사용) | Toolbar AI만 | /api/ai/content | flexible | **B 유지** |
| Q&A | admin | 대시보드 | `FloatingAiButton.tsx` | 플로팅 질문 | /api/ai/query | — | 범위 외 |

---

## 3. B. 유지 대상 (편집기 내부 보조 AI)

| 서비스 | 화면 | 기능 | 유지 이유 | 주의 |
|---|---|---|---|---|
| 공통(@o4o/content-editor) | 전 서비스 RichTextEditor(preset='full') | **Toolbar "AI 정리"** | 기존 본문 대상 정리/요약/톤 변환(빈 본문 차단). 편집 보조 = 유지 정책 | AiContentModal을 `editor` + "에디터에서 가져오기"로 호출 → **모달 제거 금지**, 진입점만 구분 |
| Neture | supplier 등 | RichTextEditor 편집 보조 | AiContentModal 미사용, Toolbar AI만 | 영향 작음 |

> **핵심 제약**: Toolbar "AI 정리"와 페이지 "AI 생성"이 **같은 AiContentModal**을 연다. 제거 WO는 **페이지 측 모달 open(버튼/초안 모드)**만 제거하고, RichTextEditor Toolbar의 모달 open은 보존해야 한다.

---

## 4. A. 제거 대상 (초안 생성 AI) — 우선순위

| 우선 | 서비스 | 화면 | 진입점 | 제거 방식 | 영향 | 후속 WO |
|---|---|---|---|---|---|---|
| 1 | KPA | /store/marketing/qr | StoreQRPage AiContentModal "AI 작성" | 버튼+모달 open 제거(QR 생성은 콘텐츠 선택 기반 유지) | KPA 단독, 위험 낮음 | QR-AI-STEP-REMOVE |
| 2 | KPA | /store/marketing/pop | StorePopPage AiContentModal(initialMode='pop') "AI 문구 생성" | AI 문구 단계 제거(콘텐츠 본문 기반 POP 유지) | KPA(GP/KCos 미러) | POP-AI-STEP-REMOVE |
| 3 | KPA | /store/library/contents 제작 모달 | CreateContentFromResourcesModal "AI 콘텐츠 생성" | compose의 AI 생성 섹션 제거(빈 편집기 직접 작성 유지) | KPA 단독 | CONTENT-CREATE-AI-STEP-REMOVE |
| 4 | KPA | 블로그 | PharmacyBlogPage 페이지 AI(모달 진입) | 페이지 진입 AI 제거(Toolbar AI 유지) | KPA(GP/KCos 미러) | BLOG-AI-STEP-REMOVE |
| 5 | KPA | 상품 상세설명 | StoreProductDescriptionsPage AI 보조 버튼 | 버튼 제거 | KPA(GP/KCos 미러) | PRODUCT-DESC-AI-REMOVE |
| 6 | KPA | 제작 자료/콘텐츠 제작 시작 | StoreProductionMaterialsPage / StoreLibraryContentsPage AI 초안 | AI 초안 진입 제거 | KPA(GP/KCos 미러) | (3과 통합 가능) |
| 7 | KPA | 자료실/자료 작성 | ResourceWritePage / ResourceWriteModal AI | AI 초안 진입 제거 | KPA | RESOURCE-AI-REMOVE |
| 8 | KPA | 강의(본문/목차) | CourseEditPage AI + CourseStructureAiModal | 강의 본문/목차 AI 제거 | KPA(GP 미러) | COURSE-LECTURE-AI-REMOVE |
| 9 | KPA | operator signage | AiContentGenerationModal "초안 생성" | 사이니지 AI 생성 제거 | KPA operator | OPERATOR-SIGNAGE-AI-REMOVE |
| 10 | GP/KCos | store/instructor 미러 | 위와 동일 컴포넌트 | KPA와 동일 WO 병행 or 공통 제거 | 서비스 동시 | 서비스별 분리 |

---

## 5. D. 판단 필요

| 서비스 | 화면 | 기능 | 애매한 이유 | 확인 필요 |
|---|---|---|---|---|
| 공통 | content-editor URL 탭 | `/api/ai/url-to-blocks` | URL→블록은 "초안 생성"이지만 Toolbar(편집보조)에서도 URL 정리에 쓰일 수 있음 | Toolbar URL 탭이 보조인지 초안인지 화면별 확정 |
| 공통 | content-editor flexible | flexible outputType | Toolbar(보조) vs 페이지(초안) 둘 다 flexible | 진입점 기준으로만 분류(엔드포인트 공유) |
| KPA | /operator/content-hub | OperatorContentHubPage "AI 생성" placeholder | 활성 생성 버튼 미발견(placeholder만). CopilotEngine 요약 별도 가능 | 실제 운영자 콘텐츠 생성 AI 버튼 존재 여부 재확인 |
| 전역 | /api/ai/generate, /api/ai/vision/analyze | 로우레벨/이미지분석 | 콘텐츠 초안 생성 아님(프록시/분석) | 정책 범위 외로 둘지 확인 |
| 전역 | /api/ai/query | Q&A | 콘텐츠 생성 아님 | 유지(범위 외) |
| 커뮤니티 | community/forum | (AI 진입점 미발견) | 커뮤니티 글 AI 생성 코드 없음 | 제거 대상 없음(확인 완료) |

---

## 6. E. Backend endpoint 사용처 / 제거 가능 여부

| endpoint | caller(진입점) | 서비스 | UI 제거 후 dead 여부 | 비고 |
|---|---|---|---|---|
| /api/ai/content (pop) | StorePopPage | KPA/GP/KCos | POP AI 제거 시 pop outputType 호출 0 가능 | outputType별 후속 정리 |
| /api/ai/content (store_qr) | StoreQRPage | KPA/GP/KCos | QR AI 제거 시 store_qr 호출 0 가능 | |
| /api/ai/content (product_detail) | CreateContentFromResources / ProductDescriptions | KPA/GP/KCos | 제거 시 호출 0 가능 | |
| /api/ai/content (flexible) | Toolbar(유지) + 페이지(제거) | 전 서비스 | **Toolbar 유지로 flexible은 잔존** | 삭제 불가 |
| /api/ai/url-to-blocks | AiContentModal URL 탭 | 전 서비스 | Toolbar URL 탭 유지 시 잔존 | |
| /api/ai/course-structure, /lesson-body | Course 화면 | KPA/GP | 강의 AI 제거 시 0 가능 | |
| /api/ai/query, /generate, /vision | admin/내부 | — | 범위 외 | 유지 |

> **즉시 삭제 금지.** flexible/url-to-blocks는 Toolbar(편집 보조) 유지로 살아남으므로 절대 삭제하면 안 됨. pop/store_qr/product_detail/course-* 만 UI 제거 후 호출 0 확인 시 후속 cleanup 후보.

---

## 7. F. 서비스별 영향

| 서비스 | 제거 대상(초안생성) | 유지(편집보조) | 판단필요 | 공통 컴포넌트 영향 | 비고 |
|---|---:|---:|---:|---|---|
| KPA | 9 화면군 | Toolbar AI | operator content-hub | @o4o/content-editor Toolbar 유지 | 주 대상 |
| GP | 6 화면(미러) | Toolbar AI | operator resources | 동일 | KPA와 병행 |
| KCos | 4 화면(미러) | Toolbar AI | — | 동일 | KPA와 병행 |
| Neture | 0 | Toolbar AI(RichTextEditor) | — | AiContentModal 미사용 | 영향 작음 |
| 공통 패키지 | (직접 제거 0) | Toolbar "AI 정리" 유지 | url-to-blocks/flexible | **모달 통째 제거 금지** | 진입점 측 제거 |

---

## 8. G. 후속 WO 제안 (위험도 순)

```
1. WO-O4O-KPA-QR-AI-STEP-REMOVE-V1            (KPA 단독, 위험 낮음 — 첫 후보)
2. WO-O4O-KPA-CONTENT-CREATE-AI-STEP-REMOVE-V1 (KPA 콘텐츠 제작 모달 AI 생성)
3. WO-O4O-KPA-POP-AI-STEP-REMOVE-V1           (POP — GP/KCos 미러 영향 확인)
4. WO-O4O-KPA-BLOG-AI-STEP-REMOVE-V1          (블로그 페이지 AI — Toolbar AI 보존 주의)
5. WO-O4O-KPA-PRODUCT-DESC-AI-REMOVE-V1       (상품설명)
6. WO-O4O-KPA-RESOURCE-AI-REMOVE-V1           (자료실)
7. WO-O4O-COURSE-LECTURE-AI-GENERATION-REMOVE-V1 (강의 본문/목차 — LMS 공통 영향 검토)
8. WO-O4O-OPERATOR-SIGNAGE-AI-GENERATION-REMOVE-V1 (사이니지 AI 생성)
9. WO-O4O-GLYCOPHARM-KCOS-AI-STEP-REMOVE-PARITY-V1 (GP/KCos 미러 일괄 — KPA 검증 후)
10. WO-O4O-CONTENT-EXTERNAL-LLM-GUIDE-V1      (제거 자리 외부 LLM 안내 문구 — 마지막)
```

### 권장 제거 방식 (공통)
1. **페이지 측 진입점만 제거**(버튼/모달 open/AI 생성 탭) — `AiContentModal` 컴포넌트·RichTextEditor Toolbar AI는 **유지**.
2. 기존 저장 데이터(생성된 콘텐츠/제작자료) 유지.
3. backend endpoint/outputType은 즉시 삭제하지 않고, UI 제거 후 호출 0 확인된 것만(pop/store_qr/product_detail/course-*) 후속 dead-code WO에서 정리. **flexible/url-to-blocks는 Toolbar 유지로 삭제 금지.**
4. 제거 자리에 외부 LLM 안내 문구(별도 WO).
5. GP/KCos는 동일 컴포넌트 미러 → KPA 선검증 후 parity WO.

---

## 9. 외부 LLM 안내 필요 위치 (§8 후속 후보)

| 화면 | 현재 AI 생성 안내 | 대체 안내 후보 |
|---|---|---|
| /store/marketing/qr, /pop | "AI 작성/문구 생성" | "초안은 ChatGPT/Claude/Gemini에서 작성 후 붙여넣어 편집하세요" |
| /store/library/contents 제작 모달 | "AI 콘텐츠 생성" | 동상 + "빈 편집기에서 직접 작성/붙여넣기" |
| 블로그/상품설명/자료/강의 | 각 AI 생성 버튼 | 동상 |

> 본 IR은 안내 문구를 구현하지 않고 위치만 기록.

---

## 10. 완료 기준 점검

- [x] 전 서비스 AI 진입점 표로 정리(A) — read-only
- [x] 제거/유지/판단 분류(B/C/D) — **편집기 Toolbar AI = 유지로 별도 정리**
- [x] backend endpoint·outputType 사용처(E) — 즉시 삭제 금지 명시
- [x] 서비스별 영향(F) — KPA 주 대상, GP/KCos 미러, Neture 영향 작음
- [x] 후속 WO 위험도 순(G) — QR 제거 첫 후보
- [x] 코드/DB 무변경 (조사만)

## 부록 — 참조

| 항목 | 위치 |
|---|---|
| AI 엔진 | `apps/api-server/src/routes/ai-proxy.routes.ts`, `apps/api-server/src/services/ai-prompts/*`, `@o4o/ai-prompts` |
| 편집기 보조(유지) | `packages/content-editor/src/components/Toolbar.tsx:573`(AI 정리), `AiContentModal.tsx` |
| KPA 초안생성 진입 | StorePopPage:680 / StoreQRPage:1169 / CreateContentFromResourcesModal:577 / StoreProductDescriptionsPage:425 / StoreLibraryContentsPage:197 / StoreProductionMaterialsPage:783 / PharmacyBlogPage:547 / ResourceWritePage:572 / CourseEditPage:474 / CourseStructureAiModal / operator/signage/AiContentGenerationModal:421 |
| GP 미러 | services/web-glycopharm/src/pages/{store-management,instructor,operator}/* |
| KCos 미러 | services/web-k-cosmetics/src/pages/store/* |
| Neture | AiContentModal 미사용(RichTextEditor 편집보조만) |
