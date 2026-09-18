# CHECK-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1

> **WO**: [`WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1`](../work-orders/WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1.md)
> **작업일**: 2026-09-18 · **작업 기준**: `origin/main` `1af2abdc4` (WO 조사 시점 HEAD `acb449b4c` 이후 5 커밋 진행 — 작업 시점 최신 사용)
> **판정**: COMPLETE_WITH_SMOKE_PENDING (source-contract·build·배포 PASS · 브라우저 smoke 는 테스트 계정 로그인 불가로 PENDING_USER_VERIFICATION — §6-1)

## 1. 요약

공통 `RichTextEditor` 에 내부 AI capability 스위치 `showInternalAi`(기본 `true`)를 추가하고, 활성 Store-facing 소비처 전부에 `showInternalAi={false}` 를 명시했다. `showInternalAi=false` 이면 "AI 정리" 버튼과 `AiContentModal` 이 모두 렌더되지 않는다(Toolbar 경로 `/api/ai/content` 진입 0). 비Store 소비처는 prop 미지정 → 기존 동작 그대로. backend·DB 변경 0.

## 2. 공통 변경 (packages)

| 파일 | 변경 |
|---|---|
| `packages/content-editor/src/types.ts` | `showInternalAi?: boolean` 추가 · preset 주석 정정(`full` = 전체 편집 기능, AI 는 별도 스위치) |
| `packages/content-editor/src/components/RichTextEditor.tsx` | `showInternalAi = true` 수신 → `<Toolbar showInternalAi={showInternalAi}>` |
| `packages/content-editor/src/components/Toolbar.tsx` | prop 기본 `true` · AI 정리 버튼 `preset === 'full' && showInternalAi` · `AiContentModal` 은 `{showInternalAi && (...)}` 로 mount 자체 제어 |
| `packages/store-ui-core/src/components/ProductionMaterialEditorShell.tsx` | `InjectedEditorProps.showInternalAi` 추가 · `<EditorComponent showInternalAi={false}>` 고정 (Store 전용 셸 · 소비처 = KCos `ProductionMaterialEditorPage` 1) |
| `packages/tablet-screen-set-editor/src/index.tsx` | `TabletContentStepBuilder` 에 `showInternalAi?` passthrough(미주입 = 편집기 기본 true) → 코너 설명 `RichTextEditor` 로 전달 |

## 3. Fresh Census (`<RichTextEditor` JSX 소비처 42 파일 · main `1af2abdc4`)

### 3-1 STORE — 적용 (`showInternalAi={false}`) — 직접 19 + 태블릿 셸 소비처 2

| 서비스 | 파일 | 활성 route |
|---|---|---|
| KPA | `pages/pharmacy/CreateContentFromResourcesModal.tsx` | `StoreLibraryContentsPage` 모달 (`/store/library/contents`) |
| KPA | `pages/pharmacy/PharmacyBlogPage.tsx` | `/store/content/blog` |
| KPA | `pages/pharmacy/PharmacyPopPage.tsx` | `/store/content/pop` |
| KPA | `pages/pharmacy/ProductionMaterialEditorPage.tsx` | `/store/library/production-materials/:id/edit` |
| KPA | `pages/pharmacy/StoreContentEditPage.tsx` | `/store/content/:snapshotId/edit` |
| KPA | `pages/pharmacy/StoreDirectContentPage.tsx` | `/store/content/direct/:id` |
| KPA | `pages/pharmacy/StoreLocalProductsPage.tsx` | `/store/commerce/local-products` |
| KPA | `pages/pharmacy/StoreProductDescriptionsPage.tsx` | `/store/marketing/product-descriptions` |
| KPA | `pages/pharmacy/StoreProductMultilingualContentPage.tsx` | `/store/products/multilingual/:targetKind/:targetId` |
| KPA | `pages/pharmacy/StoreQrAiDescriptionPage.tsx` | `/store/marketing/qr/ai-description` — **Toolbar 경로만 OFF, page-level QR AI 는 유지(§5)** |
| KPA | `pages/pharmacy/TabletScreenSetManager.tsx` | `TabletContentStepBuilder showInternalAi={false}` (`/store/commerce/tablet-displays`) |
| KCos | `pages/store/StoreBlogManagePage.tsx` | `/store/content/blog` |
| KCos | `pages/store/StorePopStaffPage.tsx` | `/store/marketing/pop/library` |
| KCos | `pages/store/StoreProductDescriptionsPage.tsx` | `/store/library/product-descriptions` |
| KCos | `pages/store/ProductionMaterialEditorPage.tsx` | `/store/library/production-materials/new` — 셸(`ProductionMaterialEditorShell`) 내부 고정으로 OFF (파일 자체 무변경) |
| PH | `pages/store-owner/BlogEditorPage.tsx` | `/store-owner/blog/new`·`/:id/edit` |
| PH | `pages/store-owner/ContentPage.tsx` | `/store-owner/content` |
| PH | `pages/store-owner/LibraryResourcesPage.tsx` | `/store-owner/library/resources` |
| PH | `pages/store-owner/PopPage.tsx` | `/store-owner/pop` |
| PH | `pages/store-owner/ProductDescriptionsPage.tsx` | `/store-owner/product-descriptions` |
| PH | `pages/store-owner/StoreProductMultilingualContentPage.tsx` | `/store-owner/products/multilingual/...` |
| PH | `pages/store-owner/TabletsPage.tsx` | `TabletContentStepBuilder showInternalAi={false}` |

`web-pharmacy-hub`(package `pharmacy-hub-web`)는 `deploy-web-services.yml` 의 활성 배포 대상(Cloud Run `pharmacy-hub-web`)이며 `/store-owner/*` 가 현행 Store Workspace → 적용 대상으로 확정. 과거 서비스 명칭 기반 매핑 없음.

### 3-2 미적용 분류 (이번 WO 범위 밖 · 기본 true 유지)

| 분류 | 파일 |
|---|---|
| COMMUNITY | `packages/shared-space-ui/src/community/CommunityContentWriteShell.tsx`(직접 `AiContentModal` 포함) · `packages/shared-space-ui/src/ForumWriteForm.tsx` · `packages/forum-core/src/admin-ui/pages/ForumPostForm.tsx` · `web-kpa-society/pages/resources/ResourceWriteModal.tsx`·`ResourceWritePage.tsx` |
| SUPPLIER | `web-neture/components/supplier/B2BContentDrawer.tsx` · `pages/supplier/ProductDetailDrawer.tsx`·`SupplierLibraryFormPage.tsx`(compact)·`SupplierProductCreatePage.tsx`·`SupplierProductImportPage.tsx`·`SupplierStoreDescriptionEditorDrawer.tsx`·`SupplierTrialCreatePage.tsx`(compact)·`SupplierTabletScreenSetsPage.tsx`(TabletContentStepBuilder 미지정) |
| OPERATOR_ADMIN | `packages/operator-core-ui`(`CmsContentManager`·`OperatorHubContentWritePage`·`OperatorContentHubConsole`) · `web-kpa-society/pages/operator/multilingual-product-content/OperatorMultilingualContentWritePage.tsx`·`pages/operator/tablet/OperatorTabletScreenSetsPage.tsx` · `apps/admin-dashboard`(`ContentFormModal`·`PopCreatePage`(compact)) |
| LECTURE | `web-kpa-society/pages/instructor/courses/CourseEditPage.tsx`(직접 `AiContentModal` 포함) · `web-pharmacy-hub/pages/instructor/InstructorCourseEditPage.tsx`(직접 `AiContentModal` 포함) |
| OTHER | `packages/shared-space-ui/src/guide-client/GuideEditableSection.tsx`(운영자 가이드 인라인 편집 — Store 페이지에 노출되어도 매장 콘텐츠 작성이 아님) · `web-kpa-society/pages/storefront/StorefrontProductDetailPage.tsx`(compact · 소비자 storefront) |

### 3-3 집계

```text
STORE_RICHTEXT_CONSUMERS(direct)          = 19
STORE_SHOWINTERNALAI_FALSE(direct)         = 19
STORE_SHARED_SHELL_OFF                     = 2 (ProductionMaterialEditorShell 고정 · TabletContentStepBuilder × Store 소비처 2)
STORE_EDITOR_INTERNAL_AI (Toolbar 경로)    = 0
STORE_OTHER_INTERNAL_AI (page-level)       = 1 (StoreQrAiDescriptionPage → POST /api/ai/qr-description · §5 보고만)
NON_STORE_CONSUMERS (prop 미지정)          = 23 파일 · 기본 true 유지
```

## 4. 검증 결과

| 항목 | 결과 |
|---|---|
| `apps/api-server` jest `store-ai-first-editor-boundary-contract.spec.ts` | **34/34 PASS** — (A) 공통 5 · (B) Store 직접 19 + 셸 2 + census drift 가드 1 · (C) 비Store 대표 5 + 태블릿 비Store 2 |
| `pnpm --filter @o4o/content-editor typecheck` / `build` | PASS (dist 187.81 KB · dts OK) |
| `pnpm --filter @o4o/web-kpa-society build` (`tsc && vite build`) | PASS 32.68s |
| `pnpm --filter @o4o/web-k-cosmetics build` (`tsc && vite build`) | PASS 13.91s |
| `pnpm --filter pharmacy-hub-web build` (`tsc -b && vite build`) | PASS 16.75s |
| `web-neture` `tsc --noEmit` (tablet editor 시그니처 변경 소비처) | PASS |
| `@o4o/store-ui-core` · `@o4o/tablet-screen-set-editor` | build script 없음(source 소비) → 위 web 서비스 tsc 로 검증 |
| Backend runtime 변경 | 0 (spec 파일 1 추가만) |
| DB migration | 0 |

## 5. 보고 (수정하지 않음)

- **Store page-level 내부 AI 잔존 1**: `/store/marketing/qr/ai-description`(`StoreQrAiDescriptionPage`) → `POST /api/ai/qr-description`. Toolbar 와 무관한 독립 생성 AI. 후속 `STORE INTERNAL AI RETIREMENT`(WO 4) 대상.
- **직접 `AiContentModal` mount 3**: `CommunityContentWriteShell`(COMMUNITY) · `CourseEditPage`·`InstructorCourseEditPage`(LECTURE). Store 아님 → 각 트랙 별도 WO.
- **`aiRequestHeaders` 유지**: KPA 6(`CreateContentFromResourcesModal`·`PharmacyBlogPage`·`ProductionMaterialEditorPage`·`StoreContentEditPage`·`StoreDirectContentPage`·`StoreProductDescriptionsPage`) · KCos 2 · PH 1 · `ProductionMaterialEditorShell` 1. `showInternalAi=false` 이후 Toolbar 경로에서는 dead 이나 §15 원칙(불명확 시 제거 금지)에 따라 이번 WO 에서 제거하지 않음. WO 4 에서 정리.
- `ProductionMaterialEditorShell` placeholder 문구 "AI가 정리한 내용을 편집하거나…" 잔존 — 문구는 WO 2(외부 LLM 제작 흐름)에서 함께 정정 권장.
- 이미 존재하는 외부 LLM 패턴: `@o4o/content-editor` `LlmAssistPanel`(태블릿 코너 편집기 "LLM으로 작업하기") — WO 2 의 재사용 후보.

## 6. 브라우저 Smoke

배포(`deploy-web-services.yml` · 3 서비스) 후 수행. 결과는 §6-1 에 기록.

### 6-1 결과

**배포**: `deploy-web-services.yml` run `35299320733`(commit `6d5494f8f`) — `deploy-kpa-society` · `deploy-k-cosmetics` · `deploy-pharmacy-hub` 모두 success. 배포 bundle 확인(cache-bust fetch): `kpa-society.co.kr` `index-BsJhBpw2.js` · `k-cosmetics.site` `index-CvedLMsr.js` · `pharmacyhub.co.kr` `index-BTU3r-HL.js` 모두 `showInternalAi` 식별자 포함 → 본 WO 변경이 운영에 반영됨.

**판정: `PENDING_USER_VERIFICATION` — 테스트 계정 로그인 불가로 Store 편집 화면 smoke 미수행.**

| 시도 | 계정(SSOT `docs/local/TEST-ACCOUNTS.local.md`) | 결과 |
|---|---|---|
| `kpa-society.co.kr/login` | `kpa-society:store_owner` `renagang21@gmail.com` | `POST /api/v1/auth/login` **401** `INVALID_USER`("User account not found or has been deactivated" · UI "등록되지 않은 이메일입니다") |
| `kpa-society.co.kr/login` | `sohae2100@gmail.com`(KPA 행) | **403** "로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다"(lockout) — 추가 시도 중단 |
| `pharmacyhub.co.kr/login` | `pharmacy-hub:store_owner` `renagang21@gmail.com` | **401** `INVALID_USER`(동일) |

- `renagang21@gmail.com` 이 두 서비스 모두 `INVALID_USER` → 계정 상태(비활성/삭제) 또는 최근 배포된 auth 변경(WO-2A/2B email+password 로그인 경로 — 메모 상 "운영 email/password 200 login smoke" 가 WO-2C 게이트로 PENDING) 의 영향으로 추정. **본 WO 변경(프론트 prop 추가)과 무관한 실패 → 중지 조건(현재 변경과 무관한 실패) 적용, 보고만.**
- 미수행 항목: Store 편집 화면 "AI 정리" 버튼 부재 · 편집 가능 · HTML 탭 · 미리보기 · 템플릿 · 저장 성공 / 비Store 화면 "AI 정리" 유지. 이 항목들은 source-contract 34/34 + 3 서비스 tsc/vite build 로만 보증된 상태.
- 재개 방법: 운영 로그인 정상화("운영 로그인 정상 확인" 통보) 후 `/store/blog`(KPA) 또는 `/store-owner/blog`(PH) 에서 위 항목 확인 → 본 절과 §7 갱신.

## 7. 완료 기준 판정

```text
CONTENT_EDITOR_AI_BOUNDARY   = PASS
STORE_RICHTEXT_INTERNAL_AI   = 0
STORE_EDITOR_SAVE_REGRESSION = PENDING (§6-1 로그인 불가 · 정적 계약상 Save 경로 미변경)
STORE_EDITOR_HTML_TAB        = PENDING (§6-1 · Toolbar HTML 탭 코드 미변경)
STORE_EDITOR_PREVIEW         = PENDING (§6-1 · Preview 코드 미변경)
STORE_EDITOR_TEMPLATE        = PENDING (§6-1 · Template 코드 미변경)
NON_STORE_DEFAULT_BEHAVIOR   = PRESERVED (contract C 7/7 + 기본값 true)
BACKEND_CHANGE               = 0
DB_MIGRATION                 = 0
```

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (후속 WO 2~5 는 본 WO 계획의 일부).
