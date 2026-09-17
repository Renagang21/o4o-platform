# IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1 — 매장 콘텐츠 제작 · 외부 LLM 표준 제작환경 감사

> **WO**: `WO-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-REALIGNMENT-V1` · **일자**: 2026-09-14 · **성격**: AUDIT + BASELINE/DOCUMENT REALIGNMENT (기능 개발 없음)
> **시작 기준**: `origin/main` = `2464f2494` (fetch → status clean(본 WO 범위) → `pull --ff-only`). 다른 세션의 미추적/수정 파일(`docs/investigations/IR-O4O-MIGRATION-TIMESTAMP-…`, `services/web-kpa-society/src/pages/HandoffPage.tsx`) 미접촉.
> **선행 기록(승계, 현재로 간주하지 않고 재검사)**: [IR-O4O-CONTENT-CREATION-AI-ENTRY-AUDIT-V1](IR-O4O-CONTENT-CREATION-AI-ENTRY-AUDIT-V1.md)(2026-06-27) · [O4O-AI-USAGE-FLOW-BASELINE-V1](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md)(2026-09 정렬) · [IR-O4O-STORE-QR-CURRENT-CONTRACT-AND-LEGACY-CENSUS-V2](IR-O4O-STORE-QR-CURRENT-CONTRACT-AND-LEGACY-CENSUS-V2.md) #7
> **산출**: [O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)(신규 baseline) · [CHECK](../checks/CHECK-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-REALIGNMENT-V1.md)

---

## 1. 감사 대상 원칙

```text
사용자의 외부 AI(ChatGPT/Gemini/Claude …) = Creative / Strategy
O4O                                     = 사용자의 기획을 실제 매장 콘텐츠로 안정적으로 생산하는 표준 제작환경
O4O 자체 AI                              = Assist / Normalize / Check (선택적 보조, 필수 단계 아님)
```

판정 기준: ① 코드가 이 원칙과 **정반대**인가(O4O AI 를 필수 관문으로 강제 / 외부 LLM 반입 경로 차단) → 충돌. ② 원칙과 같은 방향이나 범위·문구·문서가 어긋남 → PARTIAL(정비). ③ 이미 부합 → PASS.

## 2. A — 콘텐츠 제작 안내 census

| 대상 | 위치 | 상태 | 판정 | 근거 |
|---|---|---|---|---|
| `ContentCreationGuideModal` | `services/web-kpa-society/src/pages/pharmacy/ContentCreationGuideModal.tsx` (mode `store` / `operator` / `communityContent` / `communityLecture`) | **ACTIVE** — 소비처 5: `StoreLibraryContentsPage`(store) · `OperatorContentHubPage`(operator) · `ContentWritePage`(communityContent) · `CourseNewPage`/`CourseEditPage`(communityLecture) | **PASS (KPA 한정)** | 부제 "ChatGPT, Gemini 같은 AI 도구로 만든 글을 O4O 콘텐츠로 활용" · 흐름 3단계 = **AI 와 대화 → 디자인 입힌 HTML 요청 → O4O 편집기 HTML 탭에 붙여넣기** · 요청문 예시에 Brief 축(주제·대상 고객·핵심 내용·피해야 할 표현·원하는 길이) 포함 · 이미지는 O4O 업로드 URL 권장. 원칙과 동일 방향. **KPA 전용 파일**(공통 패키지 아님) → KCos/PharmacyHub 매장 화면에는 없음 = 범위 GAP(후속 후보 §8-2) |
| `LlmAssistPanel` | `packages/content-editor/src/components/LlmAssistPanel.tsx` (export `@o4o/content-editor`) | **ACTIVE** — 소비처 1: `packages/tablet-screen-set-editor/src/index.tsx`(코너 설명, `onApplyHtml` 주입) | **PASS** | 헤더 명시: "어떤 LLM 이든 자기 계정으로 사용 … 결과 HTML 을 O4O 편집기에 붙여 넣는 흐름만 돕는다" · 하지 않는 것 = LLM API 호출 / 계정 연동 / 대화 저장 / 모델·서비스 지정. 4기능(현재 내용 복사 · 요청문 복사 · 붙여넣기 · HTML 수정 요청문). 원칙의 O4O Guide 역할 그대로. 채택은 태블릿 코너 1곳뿐 → 확대는 후속 후보 §8-1 |
| 두 컴포넌트의 철학 일치 | — | — | **PASS** | 둘 다 "사용자 자신의 LLM → O4O 로 가져오기 → 편집/실행". 차이는 **구현 수준**(Guide 모달=읽기 전용 안내+요청문 복사 / LlmAssistPanel=복사·붙여넣기 도구)이지 철학 불일치가 아님. 공통화는 후속 후보 §8-2 |
| 서비스별 외부 AI 안내 문구 | KCos `ContentWritePage`(`aiBanner:false`) · PharmacyHub `PharmacyHubContentWritePage`/`ResourceWritePage`(`aiBanner:false`) | ACTIVE | PARTIAL | 내부 AI 배너를 끈 상태이나 외부 LLM 안내(Guide 모달)도 없음 — 안내 부재. 충돌 아님 |
| 각 제작 화면 도움말/GuideBackLink | KPA store 화면 GuideBlock/GuideBackLink | ACTIVE | OUT_OF_SCOPE(문구 개별 감사는 본 WO 범위 밖) | 외부 LLM 원칙과 충돌하는 문구 발견 없음(grep `Sparkles`/`AI` 기준) |

## 3. B — 제작 진입 Core census

### 3.1 `StartProductionModal` (`@o4o/store-ui-core`)

| 항목 | 사실 |
|---|---|
| 정의 | `packages/store-ui-core/src/components/StartProductionModal.tsx` · export `index.ts:259` |
| 소비처 | ① KPA wrapper `services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx` → `StoreLibraryContentsPage.tsx:146` (targets/getTemplates 만 주입) ② 공통 `StoreLibraryContentsView.tsx:73` (`@o4o/store-ui-core/library`) → KCos `StoreLibraryContentsPage.tsx:119` |
| 역할 | 콘텐츠 선택 → 제작 대상(POP/QR/Blog/Product Description) → 템플릿 → route 진입. POP 은 `handoffToPopV2` 로 V2 계약. serviceKey 분기 없음(contract test) |
| 판정 | **PASS** — O4O Production Environment 의 "콘텐츠 선택 → 제작 대상 → 자료 연결" 진입점. AI 를 관문으로 두지 않음 |

### 3.2 `StartProductionModal.onAiAction` ("AI 제작 자료 초안 만들기" optional capability)

| 소비처 | `onAiAction` 전달 | 판정 |
|---|---|---|
| KPA wrapper → `StoreLibraryContentsPage` | **미전달** (`WO-O4O-KPA-CONTENT-CREATION-AI-ENTRY-REMOVE-V1` 로 의도적 숨김, 파일 헤더 명시) | DORMANT |
| `StoreLibraryContentsView`(공통) → KCos | **미전달** (props 인터페이스에 없음 → 전달 불가) | DORMANT |
| 기타 | grep `onAiAction` 결과 정의 파일 + KPA 헤더 주석뿐 | — |

- **종합: DORMANT** (prop·AI 카드 UI·`aiActionSelected` 분기는 존재, 프로덕션 소비처 0). DEAD 가 아닌 이유: 공개 API 이며 `@o4o/store-ui-core` 계약의 일부 — **필드 존재만으로 삭제하지 않는다**(WO §4-B). 코드 변경은 docblock 한 줄(아래 §7)만.
- 연관 DORMANT: `PRODUCTION_TARGET_TO_AI_MODE`(`productionTargets.tsx:210`) 소비처 0 · `ProductionMaterialEditorPage` 헤더의 "AiContentModal 이 생성한 HTML" 서술은 이력(현재 `AiContentModal` 미마운트, `generatedHtml` state 만 남음). 정리는 후속 후보 §8-3.

### 3.3 production target catalog / config

- KPA `productionTargets.tsx`(`PRODUCTION_TARGET_CATALOG`) · KCos `productionTemplates.ts` · 공통 `productionUtils.ts` — 대상은 `pop | qr | blog | product-description` 4종, 각 도메인 route 로 handoff. AI 를 대상 선택의 전제로 두는 코드 없음 → **PASS**.
- Production Materials 편집(`ProductionMaterialEditorShell`, KPA/KCos `ProductionMaterialEditorPage`) — RichTextEditor 기반 편집·저장. Toolbar `AI 정리` 는 편집 보조(KEEP) → **PASS**.

## 4. C — 페이지형 AI 진입 잔존 확인 (최신 main)

| 진입 | 위치 | 상태 | 판정 |
|---|---|---|---|
| KPA QR/POP/Blog/Content-Create 페이지 AI 단계 | (제거 완료 · `CHECK-O4O-KPA-{QR,POP,BLOG,CONTENT-CREATE}-AI-STEP-REMOVE-V1`) | 부재 확인 | PASS |
| KPA 상품설명(R1)·내 자료함 제작(R2)·자료 등록(R3) | `WO-O4O-KPA-CONTENT-CREATION-AI-ENTRY-REMOVE-V1` 이후 | `StoreLibraryContentsPage` in-page `AiContentModal` 부재 · `CreateContentFromResourcesModal` 헤더 "자료 기반 AI 본문 생성 제거" 확인 | PASS |
| KCos POP/Blog AI | KCos `pop-v2` 에 AI 호출 없음(grep) | 부재 | PASS |
| **KPA "AI 설명 QR 만들기"** | `StoreQRPage.tsx:694` → `/store/marketing/qr/ai-description` (`StoreQrAiDescriptionPage.tsx`, `App.tsx:964`) → `POST /api/ai/qr-description`(`ai-proxy.routes.ts:406`, Gemini) → 상품명+강조점 입력으로 **설명 HTML 전체 생성** → 편집 → `store-contents` 저장 + QR 생성 | **ACTIVE** (`WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1`, 2026-06-29 — 6/27 진입점 IR **이후** 추가. QR census V2 #7 도 `CANONICAL_NEEDS_ALIGNMENT` 로 기록) | **PARTIAL — 잔존 제작형 AI entry 1건.** 충돌로 판정하지 않는 이유: "QR 만들기"·"매장 HUB 에서 가져오기"·직접 작성 경로가 병존해 **O4O AI 가 필수 관문이 아니고**, 외부 LLM 결과 붙여넣기(HTML 탭)도 막지 않는다. 다만 O4O AI 가 "초안 전체 생성" 주체가 되는 화면이라 원칙 §2-D "NOT REQUIRED" 축과 방향이 다름 → 처분(유지·Guide 로 전환·제거)은 **별도 WO** §8-4 |
| KPA 커뮤니티 `ContentWritePage` AI 배너(`CommunityContentWriteShell aiBanner` 기본 true, URL→제목/본문 생성) | `packages/shared-space-ui` · KPA 만 켜짐 | ACTIVE | OUT_OF_SCOPE — 커뮤니티 콘텐츠 축(매장 콘텐츠 제작 아님). 같은 화면에 `ContentCreationGuideModal`(communityContent) 도 있어 외부 LLM 경로 병존 |
| LMS `CourseStructureAiModal`(`/api/ai/course-structure`, `/api/ai/lesson-body`) | instructor | ACTIVE | OUT_OF_SCOPE — 강의 축 |
| Neture supplier 상품 목록 "AI" 태그 재생성 | `SupplierProductsPage.tsx:1568` | ACTIVE | KEEP — Product/ProductMaster 내부 자동화 축(§2-D KEEP) |
| `AiSummaryButton/Modal`(`/api/ai/query`) | KCos platform/operator · Neture partner | ACTIVE | OUT_OF_SCOPE — 대시보드 요약 |
| 편집기 Toolbar `AI 정리` / `AiContentModal` / `/api/ai/content` | `@o4o/content-editor` | ACTIVE | KEEP (WO §4-C 명시) |
| Toolbar "매장 활용"(`StoreUseModal`, `/api/ai/content-to-store-use`) | Toolbar 미마운트(주석 605/789) | DORMANT | 후속 WO 판단 대상 — 본 WO 미접촉 |

**ACTIVE_CODE_CONTRADICTION = 0.** 프로덕션에서 O4O AI 를 필수 관문으로 강제하거나 외부 LLM 반입을 막는 코드는 없다. 잔존 제작형 AI entry 는 위 1건(PARTIAL).

## 5. Media Library V2 · VIDEO Job · Temporary Output 정합

| 축 | 코드 사실 | 원칙 대응 | 판정 |
|---|---|---|---|
| Media Library V2 | `media_assets`(`apps/api-server/src/modules/media/entities/MediaAsset.entity.ts`) catalog 필드 `usageType · originType · derivationType · generationProvider(자유 문자열) · qaStatus · productAccuracyLevel · rightsType` · 관리 화면 `/content-resource/media-assets`(admin-dashboard) · API `/platform/media-library/*` | §6 공통 제작자산 카탈로그 정본 · §5 provider 자유 문자열 | PASS |
| VIDEO Job | `AutomationJob` status `DRAFT/IN_PROGRESS/WAITING/COMPLETED/CANCELLED` · 자산 연결 purpose INPUT/INTERMEDIATE(`/platform/automation-jobs/:id/assets`) · `cleanupDecision`(KEEP_ALL/KEEP_OUTPUTS/KEEP_SELECTED/DECIDE_LATER, 제작 자료 정리 방침) | §7 흐름 | PASS |
| Temporary Output | `temp_output_*` 컬럼 · `video-temp-output.config.ts` TTL 기본 48h(`VIDEO_TEMP_OUTPUT_TTL_HOURS`) · `video-temp-output-expiry.job.ts` in-app 만료 삭제 · 엔티티 주석 "완성본은 항상 임시 TTL" | §7 "완성 영상 = 영구자산 전제 없음" | PASS |
| 파일럿 경계 | `scripts/media/minerock600-pilot/ep01/assemble_ep01.py`(특정 상품·FFmpeg·로컬 `C:/tmp`) · Runbook | §9 Pilot ≠ Canonical | PASS(문서로 명시) |

## 6. 기준 문서 정합 (drift)

| 문서 | 발견 | 처리 |
|---|---|---|
| `O4O-AI-USAGE-FLOW-BASELINE-V1` §1/§4.1/§10 | Entry 레이어가 Home AI 로만 서술되어 "Home AI = 콘텐츠 제작의 시작점" 으로 읽힐 여지 · 외부 LLM 은 §4.2 입력 데이터의 한 줄로만 존재 · §4.1 "POP 제작기 Step 3 / `PopCreatePage`" 는 저장소에 없음(POP V2 canonical, AI 단계 없음) | **정합(사용자 지시로 허용)**: 2026-09-14 정렬 요지 추가 · §1 에 External(사용자 AI) 행 · §4.1 stale 행 정정 · §10 문구 정정 · §15 신설(운영 원칙 문서 포인터) |
| `docs/CANONICAL-INDEX.md` §6 | 신규 baseline 미등재 · `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1`(architecture, Canonical SSOT 선언) 이 색인에 없음 | 신규 baseline 행 추가 · CONTENT-PRODUCTION-FLOW 행 추가(§2 Store 축) |
| `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1` §1 3단계 "편집기 / AI" | AI 를 제작 6단계 중 하나로 표기 — 원칙과 **정반대는 아님**(편집 보조) | 본문 무변경(§16-4). 운영 원칙 문서 §3 이 "필수 아님" 을 상위에서 명시 |
| `StartProductionModal.tsx` docblock | `onAiAction` "이번 단계에서 미연결" 이력 표현 | 코드 주석 정정(§7) |

## 7. 코드 변경 (WO §9 허용 범위 내)

| 파일 | 변경 | 동작 변경 |
|---|---|---|
| `packages/store-ui-core/src/components/StartProductionModal.tsx` | `onAiAction` 을 DORMANT capability 로 명시 + 운영 원칙 문서 링크 | 없음(주석만) |

그 외 코드 변경 0. `HandoffPage.tsx`(다른 세션 수정) 미접촉.

## 8. 후속 WO 후보 (본 WO 에서 실행하지 않음)

| # | 후보 | 구분 | 근거 |
|---|---|---|---|
| 8-1 | `LlmAssistPanel` 채택 확대 — Production Materials 편집 · 상품설명 · 블로그 편집 화면에 "LLM 으로 작업하기" 노출 | 선택 | 현재 태블릿 코너 1곳만(§2). 원칙 §2 O4O Guide 역할의 실제 표면 |
| 8-2 | `ContentCreationGuideModal` 공통화(`@o4o/store-ui-core` 또는 `content-editor`) → KCos/PharmacyHub 매장 화면 적용 | 선택 | KPA 전용 파일(§2) · KCos/PH 는 안내 부재 |
| 8-3 | DORMANT 정리 — `onAiAction` prop/AI 카드 · `PRODUCTION_TARGET_TO_AI_MODE` · `ProductionMaterialEditorPage` 이력 헤더 · Toolbar "매장 활용" | 선택 | 소비처 0(§3.2). 공통 모듈 변경 절차 필요 |
| 8-4 | KPA "AI 설명 QR 만들기" 처분 — 유지(내부 AI 선택 보조로 재정의) / Guide 기반 외부 LLM 흐름으로 전환 / 제거 | **필수(판정만)** | 잔존 제작형 AI entry 1건(§4). 사업 판단 필요 → 코드 변경은 판정 후 |
| 8-5 | 표준 Brief UI(누락 확인 · 요청문 생성) | 선택 | 원칙 §2 O4O Guide 축. 현재는 Guide 모달 요청문 템플릿으로 대체 |
| 8-6 | private production workspace(사용자별 제작 작업공간 · 중간 결과 보관) | 선택 | 원칙 §3 표준 반복의 "중간 결과" 저장처 부재(현재 로컬/임시) |
| 8-7 | video recipe engine(합성 레시피의 플랫폼 기능화) | 선택 | 원칙 §8 승격 규칙 충족 후에만 |
| 8-8 | `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1` §1 3단계 문구 정비("편집기 / AI(선택)") | 선택 | §16-4 로 본 WO 미수정 |

## 9. 결론

- 실제 코드 기준 현재 구조는 **이미 원칙과 같은 방향**이다: 외부 LLM 반입 경로(Guide 모달 · LlmAssistPanel · 편집기 HTML 탭)가 존재하고, 제작 진입 Core 는 AI 를 관문으로 두지 않으며, 페이지형 제작 AI 는 1건(KPA QR AI 설명) 외 제거·DORMANT 상태다. Media Library V2 · VIDEO Job · Temp Output 은 원칙 §6·§7 과 일치한다.
- 정반대 정책·기능 삭제 필요 충돌·DB/API/권한 신설 필요 = 없음 → WO §12 중지 조건 미해당.
- 부족한 것은 기능이 아니라 **문서상 위치**였다(Home AI 중심 서술 · 외부 AI 역할 미정의 · 파일럿과 canonical 경계 미선언) → baseline 신설과 정합으로 처리.
