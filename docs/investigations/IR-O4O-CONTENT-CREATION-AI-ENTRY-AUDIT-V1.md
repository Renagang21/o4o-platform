# IR — 콘텐츠 제작 AI 진입점 전수 조사 V1

**IR:** `IR-O4O-CONTENT-CREATION-AI-ENTRY-AUDIT-V1`
**일자:** 2026-06-27
**성격:** read-only 사전 조사 (코드/DB/API 변경 없음)
**목적:** 콘텐츠 제작에서 AI를 **제작 주체에서 배제**하고, AI를 **편집기 보조(문장 정리·요약·번역) 수준**으로 축소하기 위한 진입점 전수 조사 및 A/B/C 분류.
**git status:** clean (조사 시점 WIP 없음, 동시 세션 작업 미접촉)

---

## 0. 선행 결정 (재litigation 금지)

본 조사는 빈 상태에서 시작하지 않는다. 아래 선행 결정을 **기준선으로 승계**한다.

| 축 | 결정 | 출처 |
|---|---|---|
| **AI 역할 SSOT** | AI는 "따로 쓰는 기능"이 아니라 **선택(HUB)→복사(텍스트)→정리(AI)→실행(POP/QR/콘텐츠)** 흐름의 일부. 빈 콘텐츠 생성 주체 아님. | `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md §10` |
| **선행 진입점 감사** | 제거 대상 = store/instructor/operator 페이지의 "AI 생성" 버튼 + 전용 모달 진입. | `docs/ir/IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1.md` |
| **편집 보조 KEEP** | RichTextEditor Toolbar "AI 정리"(flexible outputType)는 보존. | `docs/archive/reports/IR-O4O-AI-ASSISTANCE-CANONICAL-AUDIT-V1.md`, `docs/investigations/IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1.md` |
| **KPA 제거 배포 완료** | QR / POP / Blog / Content-Create(CreateContentFromResourcesModal) 페이지 진입 AI 제거·배포 완료. | `docs/checks/CHECK-O4O-KPA-{QR,POP,BLOG,CONTENT-CREATE}-AI-STEP-REMOVE-V1.md` |

### ⚠️ 가장 중요한 구조 제약 (제거 작업의 전제)

> **`AiContentModal`(packages/content-editor) 은 두 경로로 열린다:**
> 1. **페이지 진입** ("AI로 작성/생성/초안" 버튼) → **제거/축소 대상**
> 2. **RichTextEditor Toolbar "AI 정리"** (기존 본문 → 정리/요약/번역) → **유지 대상**
>
> 따라서 제거는 **`AiContentModal` 컴포넌트 자체가 아니라 "페이지 진입점(버튼 + 모달 open)"** 만 대상으로 한다. 컴포넌트를 없애면 Toolbar 편집 보조까지 사라진다.

---

## 1. 분류 기준 (고정)

```
A. 제거 대상 — 제작 화면에서 AI가 "제작 주체"로 보이는 진입
   (소스 선택 → AI가 콘텐츠를 작성/초안 생성. "AI로 작성/생성/초안")
B. 축소 대상 — 현재 제작처럼 보이나 편집기 보조로 이름·위치·역할 변경 가능
C. 유지 대상 — 편집기 안에서 문장 정리/요약/번역/표현 보조 수준
```

---

## 2. 프론트엔드 진입점 현황 (조사 결과)

`AiContentModal` 소비처 + 인라인 AI 진입을 KPA 우선으로 정리. 라인은 조사 시점 기준.

### 2.1 이미 제거·배포 완료 (KPA)

| 화면 | 파일 | 상태 |
|---|---|---|
| POP | `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx:272,623` | ✅ 페이지 진입 AI 제거 (컴포넌트 유지) |
| QR | `…/pharmacy/StoreQRPage.tsx:756,1131` | ✅ 제거 |
| 블로그 | `…/pharmacy/PharmacyBlogPage.tsx:404,461,496` | ✅ 제거 |
| 콘텐츠 제작(자료→콘텐츠) | `…/pharmacy/CreateContentFromResourcesModal.tsx` | ✅ 제거 |

> KPA POP/QR/Blog/Content-Create 는 **페이지 진입만 제거, AiContentModal·Toolbar AI 정리는 보존**. GP/KCos 동일 화면은 **별도 파일 → 미변경(parity 대기)**.

### 2.2 잔존 AI 제작 진입점 (A/B 후보)

| # | 화면 | 서비스 / 파일:line | 진입 형태 | 분류 |
|---|---|---|---|---|
| R1 | 상품 상세설명 | **KPA** `pharmacy/StoreProductDescriptionsPage.tsx:350,367,425` | 페이지 "AI로 작성" 배너 버튼 + AiContentModal("상품설명 AI 보조") | **A** |
| | | **GP** `store-management/StoreProductDescriptionsPage.tsx:331,385` | 동일("약국 상품설명 AI 보조") | **A** (parity) |
| | | **KCos** `store/StoreProductDescriptionsPage.tsx:331,385` | 동일("매장 상품설명 AI 보조") | **A** (parity) |
| R2 | 내 자료함(제작 자료 생성) | **KPA** `pharmacy/StoreLibraryContentsPage.tsx:52,65,152,167` | 선택 → StartProductionModal "AI 카드" → AiContentModal "AI 매장 제작 자료 초안" 생성 | **A** |
| | | **GP/KCos** `…/StoreLibraryContentsPage.tsx` | 동일 패턴(별도 파일) | **A** (parity) |
| R3 | 자료 등록/수정 | **KPA** `resources/ResourceWritePage.tsx:16,572` | 편집 흐름 내 AiContentModal 진입(onInsert) | **B** (편집 보조로 재배치 가능 vs 제거) |
| R4 | 강의(레슨) 편집 | **KPA** `instructor/courses/CourseEditPage.tsx:477` · **GP** `instructor/InstructorCourseEditPage.tsx` | "AI 레슨 초안 만들기"(URL-first 생성) | **A** but **RESERVED** — 별도 LMS 코스 구조 설계 축(아래 §5) |

### 2.3 유지 대상 (C)

| 대상 | 위치 | 사유 |
|---|---|---|
| RichTextEditor Toolbar "AI 정리" | `packages/content-editor/src/components/Toolbar.tsx` (flexible outputType) | 기존 본문 → 정리/톤/길이/번역. 편집 보조 SSOT. **전 화면·전 서비스 보존** |
| `AiContentModal` 컴포넌트 자체 | `packages/content-editor/src/components/AiContentModal.tsx` | Toolbar 가 의존. **삭제 금지** — 페이지 진입만 제거 |
| 백엔드 `/api/ai/content` (flexible/summary/title_suggest) | `apps/api-server/src/routes/ai-proxy.routes.ts` | Toolbar 편집 보조가 호출. **유지** |

---

## 3. 백엔드 AI 엔드포인트 분류 (3순위 settings 정비용)

> 프론트 페이지 진입 제거 **이후** 호출자가 사라지는지 확인하고 다이어트한다. `/api/ai/content` 자체는 Toolbar(flexible)가 쓰므로 **엔드포인트 유지** — 제작 전용 outputType/프롬프트만 정리 대상.

| 분류 | 엔드포인트 / 자산 | 비고 |
|---|---|---|
| **제작 actor (정리 후보)** | `/api/ai/content` outputType: `pop`·`blog`·`product_detail`·`store_qr`·`store_sns` | 페이지 진입 제거 시 호출 소멸 → 프롬프트/프리셋 정리 |
| | `/products/:id/ai-contents/generate[/:type]` (product_description·pop_short·pop_long·qr_description·signage_text) | `modules/store-ai/*` 제품 AI 일괄 생성 |
| | `/api/ai/course-structure`, `/api/ai/lesson-body` | LMS 생성 — **RESERVED**(코스 설계 축) |
| **편집 보조 (유지)** | `/api/ai/content` (`flexible`·`summary`·`title_suggest`), `/api/ai/url-to-blocks`, `/api/ai/content-to-store-use`, `/api/ai/generate`, `/api/ai/query` | Toolbar/편집 의존 |
| **설정 (3순위 검토)** | `/api/ai/admin/*` (policy·engines·usage·ops), `ai-editing-model-resolver`, `AiQueryPolicy.defaultModel` | 모델/쿼터/관측 — 제작 제거와 별도 커밋 |

**ai-prompts 패키지** (`packages/ai-prompts/src`):
- `store/` `PRODUCT_CONTENT_PROMPTS` (product_description / pop_short / pop_long / qr_description / signage_text) = **제작 프롬프트** → 정리 후보
- `admin/` (block-refine / section-refine / page-improver 등) = 편집·빌더 보조 (별도 축)

**outputType / EditingSurface SSOT:** `packages/types/src/editing-preset.ts`, `packages/types/src/production-template.ts` — 제작 outputType 정리 시 동반 검토(타입 제거 아님, 사용처 정리 우선).

---

## 4. 운영자/설정 화면 AI (3순위 입력)

- Admin AI: `apps/api-server/src/routes/ai-admin.routes.ts` — dashboard / engines(activate) / policy / usage / ops. 엔진·쿼터·관측 설정으로 **유지하되 "제작 설정" 잔재 분리**가 3순위 과제.
- 제작 전용 설정(제작 프롬프트·outputType 노출)이 운영자 화면에 남아있는지 = `WO-O4O-AI-PROMPTS-SETTINGS-CLEANUP-AUDIT-V1`에서 별도 확인(제작 화면 제거와 한 커밋에 묶지 않음).

---

## 5. RESERVED (이번 제거 축에서 제외)

| 항목 | 사유 | 출처 |
|---|---|---|
| `CourseStructureAiModal` / 레슨 AI 초안 (R4) | 2단계 코스 구조 생성 — 일반 편집 보조에 흡수 불가, 별도 설계 | `IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1` |
| Signage AI 생성 | 별도 파이프라인(자산/미디어) | `CHECK-O4O-AI-EDITING-COMMONIZATION-CYCLE1-CLOSURE-V1 §10` |
| Admin builder generator (block/page/section) | admin 도메인, 편집 보조 성격 아님 | 동상 |
| 비-Gemini provider(Qwen 등) | provider abstraction + 데이터 거버넌스 선행 | `WO-O4O-AI-PROVIDER-ABSTRACTION-…`, `IR-O4O-AI-DATA-GOVERNANCE-…` |

---

## 6. 후속 WO 권고 (조사 이후)

```
2순위  WO-O4O-KPA-CONTENT-CREATION-AI-ENTRY-REMOVE-V1
       대상: R1(상품설명) · R2(내 자료함 제작) · R3(자료 등록) 의 KPA 페이지 진입 AI 제거.
       원칙: 페이지 진입(버튼/모달 open)만 제거, RichTextEditor Toolbar "AI 정리" 보존.
       R4(강의)·Signage 는 제외(RESERVED).
       GP/KCos 는 별도 parity WO(KPA 선검증 후).

3순위  WO-O4O-AI-PROMPTS-SETTINGS-CLEANUP-AUDIT-V1
       대상: 제작 전용 outputType/프롬프트 orphan 여부, 운영자 화면 제작 설정 잔재,
            편집 보조용으로 유지할 프롬프트 선별. (read-only 우선)
```

**중요:** 2순위는 **서비스별 별도 파일**(R1/R2/R3 가 KPA/GP/KCos 각각 존재) → 공통 컴포넌트(`AiContentModal`/Toolbar) 미변경. 공통 모듈 변경 없음 → 동시 세션 충돌 위험 낮음.

---

## 7. 검증 기준 (IR 종료 조건)

```
1. AI 제작 진입점이 제거/축소/유지(A/B/C)로 분류되었는가
2. "페이지 진입 제거, Toolbar AI 정리 유지" 제약이 명시되었는가
3. KPA 기 제거(QR/POP/Blog/Content-Create) 와 잔존(R1~R4) 이 구분되었는가
4. GP/KCos parity 가 항목별로 표시되었는가
5. 백엔드 제작-actor / 편집-보조 / 설정 이 분리되었는가
6. RESERVED(코스/Signage/admin builder/비-Gemini) 가 제외로 고정되었는가
7. 2·3순위 WO 순서가 충돌 위험 낮은 순서인가
```

## 8. 결론

콘텐츠 제작 화면의 AI는 **페이지 진입형 "AI로 작성/생성/초안"** 으로 잔존한다 — KPA는 POP/QR/Blog/Content-Create 가 제거 완료, **상품설명(R1)·내 자료함 제작(R2)·자료 등록(R3)** 이 잔존하며 GP/KCos 는 전 항목 미변경(parity 대기). 편집기 Toolbar "AI 정리"(flexible)와 `AiContentModal` 컴포넌트·`/api/ai/content` 는 편집 보조로 **유지**한다. 다음 작업은 `WO-O4O-KPA-CONTENT-CREATION-AI-ENTRY-REMOVE-V1`(R1~R3, KPA 페이지 진입만 제거)로 진행한다.
