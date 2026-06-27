# IR — AI 프롬프트·설정 정비 감사 V1

**IR:** `IR-O4O-AI-PROMPTS-SETTINGS-CLEANUP-AUDIT-V1`
**일자:** 2026-06-27
**성격:** read-only 사전 조사 (코드/DB/API 변경 없음)
**목적:** 페이지형 제작 AI 제거(`WO-O4O-KPA-CONTENT-CREATION-AI-ENTRY-REMOVE-V1` 및 선행 KPA POP/QR/Blog STEP-REMOVE) **이후**, 제작 전용 프롬프트·outputType·엔드포인트·운영자 설정 중 **프론트 호출이 사라진(orphan)** 것을 식별하고 유지/제거후보/RESERVED/판단보류로 분류.
**git status:** 조사 시점 다른 세션 WIP 2건(asset-snapshot 관련) 존재 — read-only라 미접촉.
**SSOT:** [`IR-O4O-CONTENT-CREATION-AI-ENTRY-AUDIT-V1`](./IR-O4O-CONTENT-CREATION-AI-ENTRY-AUDIT-V1.md)

---

## 0. 선행 전제 (현재 제거 완료 상태)

| 화면 | 서비스 | 상태 |
|---|---|---|
| POP / QR / Blog 페이지 진입 AI | **KPA만** | 제거 완료 (선행 STEP-REMOVE WO) |
| 상품설명(R1) · 자료함(R2) 페이지 진입 AI | KPA / GP / KCos | 제거 완료 (REMOVE WO) |
| 자료 등록(R3) 페이지 진입 AI | **KPA만**(ResourceWritePage) | 제거 완료 |

> ⚠️ **핵심: GP/KCos 의 POP/QR/Blog 페이지 진입 AI 는 아직 제거되지 않았다.** (KPA STEP-REMOVE 는 KPA 전용 파일만 처리했고, REMOVE WO 의 GP/KCos parity 는 R1/R2 에 한정.) 따라서 제작 outputType(`pop`/`blog`/`store_qr`) 은 **아직 orphan 이 아니다.**

---

## 1. 잔존 제작 AI 진입점 (parity gap — orphan 판정 차단 요인)

아래는 현재도 `AiContentModal` 을 페이지에서 직접 여는 곳. 제작 outputType 정리의 **선행 제거 대상**.

| 진입점 | file:line | 모드 | 성격 |
|---|---|---|---|
| GP StorePopPage | `web-glycopharm/.../StorePopPage.tsx:549` (`initialMode="pop"`) | pop | 제작 — **GP parity 미완** |
| KCos StorePopPage | `web-k-cosmetics/.../StorePopPage.tsx:505` (`initialMode="pop"`) | pop | 제작 — **KCos parity 미완** |
| GP PharmacyBlogPage | `web-glycopharm/.../PharmacyBlogPage.tsx:508` | flexible | blog 화면 제작 진입 — parity 미완 |
| KCos StoreBlogManagePage | `web-k-cosmetics/.../StoreBlogManagePage.tsx:483` | flexible | blog 화면 제작 진입 — parity 미완 |
| KPA ResourceWriteModal | `web-kpa-society/.../resources/ResourceWriteModal.tsx:431` | flexible | 자료 등록 **모달** — R3(Page) 와 별개, 미처리 |
| KPA StoreProductionMaterialsPage | `web-kpa-society/.../StoreProductionMaterialsPage.tsx:783` | flexible | 제작 자료 편집 진입 — 미평가 |
| GP OperatorResourcesPage | `web-glycopharm/.../operator/OperatorResourcesPage.tsx:24` | flexible | 운영자 자료 제작 진입 — 미평가 |
| KPA CourseEditPage / GP InstructorCourseEditPage | `.../CourseEditPage.tsx:477` · `.../InstructorCourseEditPage.tsx:299` | flexible + course-structure | **LMS — RESERVED** |

**Toolbar "AI 정리"**(`packages/content-editor/src/components/Toolbar.tsx`, flexible) = 유지(편집 보조 SSOT).

---

## 2. 즉시 ORPHAN (프론트 호출 0 — 제거 후보)

| 자산 | 확인 | 분류 |
|---|---|---|
| **`generateProductAiContent()`** (3 services `api/productAiContent.ts`) + 백엔드 **`POST /products/:id/ai-contents/generate[/:type]`** | 정의만 존재, **호출 0** (R1 "AI 재생성" 제거로 소멸). get/save/list/delete 는 유지 | **제거 후보** (generate 경로만 — entity/get/save 는 유지) |
| **`StoreUseModal` + `POST /api/ai/content-to-store-use`** (`store_sns` 등 useCase) | Toolbar 마운트 제거(`Toolbar.tsx:689`), 컴포넌트·API 코드만 잔존 | **기존 WO 존재** → `WO-O4O-STORE-USE-MODAL-DECISION-V1` (별도). 본 축 비포함 |

> `O4O-AI-CONTENT-AUTOMATION-V1.md:340` 도 StoreUseModal/content-to-store-use 를 "코드 유지, UI 비활성"으로 명시. 복원 옵션이 열려 있어 **삭제 아님 — 결정 WO 로 분리**.

---

## 3. 유지 (KEEP)

| 자산 | 사용처 |
|---|---|
| `/api/ai/content` outputType **`flexible`** | Toolbar "AI 정리" + CourseEdit + ResourceWriteModal + StoreProductionMaterials + OperatorResources + GP/KCos blog (편집 보조) |
| `/api/ai/url-to-blocks` | URL→블록 추출 (편집 보조) |
| product-ai-content **get/save/list/delete** (`GET/PUT/DELETE /products/:id/ai-contents`) + entity `ProductAiContent`(5 contentType) | StoreProductDescriptionsPage(조회/저장), ProductPopBuilderPage(pop_short/long 조회/저장) |
| **운영자/관리자 AI 설정** — `ai-admin.routes.ts`(policy/engines/usage/ops/quotas/billing) + `admin-dashboard/.../settings/AiQuerySettings.tsx`(model/quota/aiEnabled/defaultModel) + GP `operator/aiReportConfig.tsx`(read-only KPI) | 모델·쿼터·관측·과금 — **제작 프롬프트/outputType 설정 잔재 없음**(전수 확인) |
| ai-prompts **assist** — `store/`(product-tagging, store-insight, store-product-insight) + `admin/`(block-refine, section-refine, page-improver, conversational-ai) | 태깅·인사이트·블록/섹션/페이지 보조 |

> **중요 결론(운영자 설정):** 운영자/관리자 화면에 **제작 전용 프롬프트·outputType 편집 UI 는 존재하지 않는다.** 모든 AI 설정 = 모델/쿼터/관측/과금. 제작 프롬프트는 백엔드 코드 하드코딩(`packages/ai-prompts`, service config). → **운영자 설정 축은 정비 대상 없음(clean).**

---

## 4. RESERVED (이번 축 제외)

| 항목 | 사유 |
|---|---|
| `/api/ai/course-structure`, `/api/ai/lesson-body` (CourseEdit/InstructorCourseEdit, `CourseStructureAiModal`) | LMS 2단계 코스 생성 — 별도 설계 (`IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1`) |
| Signage AI | 생성 엔드포인트/모달 부재 — 별도 파이프라인 |
| ai-prompts `admin/` BUILDER (`simple-generator`, `block-code-generator`) | admin 빌더 — 편집 보조 아님, 별도 도메인 |
| `StoreUseModal` / `content-to-store-use` | `WO-O4O-STORE-USE-MODAL-DECISION-V1` |

---

## 5. 판단 보류 (외부/호환 확인 필요)

| 자산 | 보류 사유 |
|---|---|
| outputType **`pop`** | GP/KCos StorePopPage(`initialMode="pop"`)가 **여전히 호출** → parity 제거 선행 시 orphan |
| outputType **`store_qr`** | GP/KCos QR 화면 잔존 가능성 — parity 제거 선행 필요 |
| outputType **`blog`** | blog 화면(GP/KCos)이 `flexible` 로 진입하는지 `blog` 로 진입하는지 확정 필요 (Agent 분석상 flexible 우세하나 미확정) |
| outputType **`product_detail`·`store_sns`·`title_suggest`** | 페이지 진입 호출 미발견이나, 외부/운영 호환·기타 소비처 0 확정 후 제거 (백엔드 dispatcher 8종 중 일부) |
| outputType→prompt dispatcher | `apps/api-server/src/services/ai-prompts/index.ts` 8종(`OutputType`) — 제거 시 `EditingSurface`(`packages/types/src/editing-preset.ts`)·`ProductionTarget`(`packages/types/src/production.ts`) 동반 검토. **타입 제거는 사용처 0 확정 후** |

---

## 6. 타입·문서 touch-list (제거 시 동반 수정)

```
packages/ai-prompts/src/store/product-content.prompt.ts   ProductAiContentType(5) + PRODUCT_CONTENT_PROMPTS
apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts  ProductAiContentType(중복 정의)
apps/api-server/src/services/ai-prompts/index.ts          OutputType(8) + buildSystemPrompt dispatcher
packages/types/src/editing-preset.ts                      EditingSurface(7)
packages/types/src/production.ts                          ProductionTarget(4)
services/web-*/src/api/productAiContent.ts                generateProductAiContent(제거 후보) + 5 type literal
docs/architecture/O4O-CONTENT-TYPE-TAXONOMY-V1.md         product_ai_contents = draft/seed (canonical 아님) — 정책 기준
docs/architecture/O4O-AI-CONTENT-AUTOMATION-V1.md         StoreUseModal/content-to-store-use 비활성 명시
```

---

## 7. 권고 후속 WO (작게 분리)

```
1. WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1
   GP/KCos StorePopPage(pop)·PharmacyBlogPage·StoreBlogManagePage·QR 페이지 진입 AI 제거.
   (+ KPA ResourceWriteModal / StoreProductionMaterialsPage / GP OperatorResourcesPage 페이지 진입 평가)
   → 완료 시 pop/blog/store_qr outputType 의 프론트 호출이 비로소 0.

2. WO-O4O-PRODUCT-AI-CONTENT-GENERATE-ROUTE-RETIRE-V1
   generateProductAiContent 래퍼(3) + POST /products/:id/ai-contents/generate[/:type] 회수.
   (get/save/list/delete 및 entity 는 유지.)

3. WO-O4O-AI-OUTPUTTYPE-PROMPT-DIET-V1
   1·2 완료 후 orphan 확정된 제작 outputType(pop/blog/store_qr/product_detail/store_sns/title_suggest)
   및 ai-prompts 제작 프롬프트 정리. 타입/dispatcher 동반.

별도: WO-O4O-STORE-USE-MODAL-DECISION-V1 (기존), LMS/Signage/admin builder = RESERVED.
```

> **순서 원칙:** 프론트 진입 제거(1) → 라우트 회수(2) → 프롬프트/타입 다이어트(3). 역순 금지(호출 살아있는 outputType 선삭제 시 런타임 깨짐).

---

## 8. 검증 기준 (IR 종료 조건)

```
1. 제작 outputType/프롬프트/엔드포인트가 유지/제거후보/RESERVED/판단보류로 분류되었는가
2. "프론트 호출 0(orphan)" 이 실제 grep 으로 확인되었는가 (generateProductAiContent=0 확인)
3. GP/KCos POP/QR/Blog parity gap 이 outputType orphan 의 선행 차단 요인으로 명시되었는가
4. 운영자/관리자 AI 설정에 제작 프롬프트/outputType 잔재가 없음을 확인했는가 (clean)
5. RESERVED(LMS/Signage/admin builder/StoreUseModal) 가 제외로 고정되었는가
6. 후속 WO 가 "진입 제거 → 라우트 회수 → 프롬프트 다이어트" 순서로 분리되었는가
```

## 9. 결론

운영자/관리자 AI 설정 화면은 **모델·쿼터·관측·과금 전용**이며 제작 프롬프트/outputType 잔재가 없다(clean). 제작 AI 자산 중 **즉시 orphan = `generateProductAiContent` + `POST .../ai-contents/generate`** 와 (기존 WO 보유) **StoreUseModal/content-to-store-use** 뿐이다. 제작 outputType(`pop`/`blog`/`store_qr` 등) 은 **GP/KCos POP/QR/Blog 페이지 진입 AI 가 아직 남아 있어 orphan 이 아니며**, 따라서 정비는 `WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1`(진입 제거) → 라우트 회수 → 프롬프트/타입 다이어트 순으로 분리한다.
