# IR-O4O-CONTENT-SURFACE-COMMONIZATION-MAP-V1

> **유형:** read-only 전수조사 지도 (코드/DB/dependency 변경 없음)
> **판정: PASS.** O4O 4서비스(KPA/GlycoPharm/K-Cosmetics/Neture) + 공통 packages + api-server 의 content surface 를 route/page/API/component/table 로 지도화. 역할(원본/복사본/출력물/템플릿/AI draft/Hub publish/상품설명) 분류, "가져오기=복사" 정책·상품설명 분리·중복/drift·공통화 후보·후속 WO 우선순위 정리.
> 방법: 6개 read-only Explore 에이전트 병렬 조사(서비스 4 + packages + backend) → 종합. 일부 table 명/세부는 에이전트 추론으로 **(미검증)** 표기.
> 선행: SANITIZE-ON-WRITE-V2 · KPA-CONTENT-BODY-SANITIZE-ON-WRITE-V1 · FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1 · CROSSSERVICE-OPERATOR-FORUM-HUB(HOLD) — 2026-06-16

---

## 1. Summary

- O4O 4서비스의 content surface 는 **store/operator 영역이 강하게 공통화**되어 있다. 핵심 컴포넌트(editor/renderer/AI modal/production modal/hub template/asset copy)는 이미 공통 package 로 추출됨.
- **가져오기=복사** 는 일관된 모델: store services 는 `assetSnapshotApi.copy()` → asset snapshot(원본 분리, source metadata 보존). Neture 만 별도 `dashboardCopy` → DashboardAsset.
- **상품설명**은 일반 content 와 데이터/페이지가 분리. 단 **"상품설명"이 2개 축으로 분기**: Neture **canonical** `shared_product_descriptions`(ProductDescriptionCurationModal) vs store services **per-store** `product_ai_contents(contentType='product_description')`. 이 둘의 관계가 명확히 연결되어 있지 않음 → 주요 정렬 포인트.
- **AI 흐름**: 공통 `AiContentModal`(@o4o/content-editor) 결과는 **draft** → editor 경유 저장(production material / product_ai_contents / content body). KPA `AiContentGenerationModal`(signage 전용)은 별도 custom.
- **sanitize-on-write drift**: `kpa_contents` ✅ / `shared_product_descriptions` ✅ 외 **cms_contents·product_ai_contents·cosmetics_contents·glycopharm_contents·kpa_store_contents·signage blocks 는 raw 저장** → 보안 후속 연결점.
- 주요 중복: `ProductionMaterialEditorPage`(GP/KCos 동일, 미추출), KPA `StartProductionModal` local copy 잔존 가능성, `content-core` package = skeleton(미사용).

## 2. Scope

| 영역 | 대상 | 상태 |
|------|------|------|
| Frontend | web-kpa-society / web-glycopharm / web-k-cosmetics / web-neture | 조사 완료 |
| Packages | content-editor, store-ui-core, shared-space-ui, block-renderer, asset-copy-core, tablet-kiosk-core, operator-ux-core, operator-core-ui, hub-core, forum-core, content-core(skeleton) | 조사 완료 |
| Backend | apps/api-server (kpa.routes content / cms-content / o4o-store / hub-content / neture shared-product-description / store-ai / signage / guide) | 조사 완료 |
| 제외 | 실제 코드 수정·DB·dependency. legacy/hidden route 일부 = PARTIAL 가능 | — |

## 3. Search Commands

```bash
rg "dangerouslySetInnerHTML|ContentRenderer|RichTextEditor|AiContentModal|StartProductionModal" services packages
rg "content|contents|store-hub|library|resources|production|signage|playlist|copy|publish|template" services/*/src/App.tsx
rg "assetSnapshot|copy-to-store|dashboard/assets/copy|asset_snapshot" services packages apps/api-server
rg "shared_product_descriptions|product_ai_contents|kpa_contents|cms_content|kpa_store_contents" apps/api-server
```
(6 Explore 에이전트가 서비스별/package/backend 로 분담 실행)

## 4. Global Content Policy Baseline (기존 SSOT)

- `O4O-BUSINESS-PHILOSOPHY-V1` / `O4O-3-ROLE-FLOW-BASELINE-V1`: 공급자→운영사업자→매장. 가져오기=복사 후 분리.
- `PLATFORM-CONTENT-POLICY-V1`(F4): HUB 3축(Producer/Visibility/ServiceScope).
- `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`: Store Production Material(legacy table `kpa_store_contents`).
- `O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`: RichTextEditor 기반 항목별 게시.
- 상품설명: `shared_product_descriptions` canonical(IR-...-SHARED-ASSET-AND-CANONICAL).

## 5. Surface Map by Service

> 표기: Surface(public/member/store/operator/admin/supplier/hub/tablet), Role(원본/복사/출력물/템플릿/AI draft/hub-published/상품설명/community/resource/signage).

### 5.1 KPA Society (reference)

| Route/Page | Surface | Role | API | Table | Common comp | Status |
|---|---|---|---|---|---|---|
| `/content`·`/content/documents`·`/content/:id`(edit) | member | 원본 content | contentApi.* | kpa_contents | ContentRenderer/RichTextEditor | active |
| `/content/resources`·`/resources` | member | resource | resourcesApi | kpa_contents(sub_type=resource) | ContentHubTemplate | active |
| `/content/surveys`·`/content/courses` | member | 원본(survey/course) | participationApi/lmsApi | kpa_participations/lms | RichTextEditor | active |
| `/store-hub/{content,blog,pop,qr,signage}` | store/hub | hub-published→복사 | hubContentApi + assetSnapshotApi.copy / import{Blog,Pop,Qr} | cms_contents·operator_*_posts·signage_media | DataTable+Drawer | active |
| `/store/library/{contents,resources,production-materials}` | store | 복사/출력물 | storeAssetControlApi + assetSnapshotApi | store_asset_control/store_contents | StartProductionModal+AiContentModal | active |
| `/store/library/production-materials/new` | store | 출력물 | assetSnapshotApi.copy+storeContentApi.save | store_contents | RichTextEditor+AiContentModal | active |
| `/store/marketing/product-descriptions`·`/store/commerce/products/:id/marketing` | store | **상품설명(per-store)** | productAiContent.* | product_ai_contents | RichTextEditor+AiContentModal | active |
| `/store/content/{blog,pop,direct/:id}`·`/store/marketing/{pop,qr,signage/*}` | store | 출력물/POP/QR/signage | blogStaff/popStaff/qrStaff/signage* | store_blog_posts/store_pops/signage_* | RichTextEditor+AiContentModal | active |
| `/operator/{content,docs,resources,working-content,blog,pop,qr,signage/*}` | operator | 원본/hub-published/template | contentApi/operator{Blog,Pop,Qr}/signage* | kpa_contents/operator_*_posts/signage_* | DataTable+RichTextEditor+AiContentGenerationModal | active |
| `/view/:snapshotId`·`/store/:slug/blog/*` | public | hub-published/community | publishedAssetsApi/blogStaff(public) | store_asset_control/store_blog_posts | ContentRenderer | active |

KPA-only: operator HUB blog/pop/qr write(`operator_*_posts`), direct content(`store_contents source=direct`), tablet requests, ProductionMaterialEditorPage(unified).

### 5.2 GlycoPharm

| Route/Page | Surface | Role | API | Table | Common comp | Status |
|---|---|---|---|---|---|---|
| `/content`·`/content/documents/new`·`/content/:id` | member | 원본 content | contentApi.* | glycopharm_contents | RichTextEditor | active |
| `/resources` | public | resource | glycoResourcesApi | glycopharm_contents(sub_type=resource) | ResourcesHubTemplate | active |
| `/store-hub/{content,blog,pop,qr,signage}` | store/hub | hub-published→복사 | hubContentApi+assetSnapshotApi.copy / import* | cms·store_blog_posts·signage_media | ContentHubTemplate | active |
| `/store/library/{contents,resources,production-materials,product-descriptions}` | store | 복사/출력물/**상품설명** | assetSnapshotApi/productAiContent | asset_snapshots/product_ai_contents | StartProductionModal+AiContentModal+RichTextEditor | active |
| `/store/marketing/{pop,qr,signage/*}`·`/store/content/blog` | store | 출력물/POP/QR/signage | popStaff/qrStaff/storePlaylist/signageSchedule | store_pops/store_qr_codes/store_playlists | AiContentModal+RichTextEditor | active |
| `/operator/{content,guide-contents,resources,blog,pop,qr,signage/*,lms}` | operator | CMS/원본/hub-published/template | CmsContentManager/operator*/guideContentApi | news/operator_*_posts/guide_pages | CmsContentManager+RichTextEditor | active |
| `/lms/course/:id`·`/lms/.../lesson/:id`·`/instructor/courses/*` | member/instructor | 원본/상품성 콘텐츠 | lmsApi/lmsInstructorClient | lms_* | sanitizeHtml(CourseDetail)+RichTextEditor | active |
| `/store/:slug/blog/*` | public | community | blogStaff(public) | store_blog_posts | sanitizeHtml | active |

GP 특이: 라벨 "내 약국에 복사"(가드됨), patient/care surface 제거, operator blog/pop/qr write 보유. signage module은 KPA와 drift(별도 IR 존재).

### 5.3 K-Cosmetics

| Route/Page | Surface | Role | API | Table | Common comp | Status |
|---|---|---|---|---|---|---|
| `/content`·`/content/:id`(edit)·`/library/content/:id` | member | 원본/hub-published | contentApi/hubContentApi | contents/cms_contents | RichTextEditor/ContentRenderer | active |
| `/store-hub`·`/store-hub/{content,blog,pop,qr}` | store/hub | hub-published→복사 | hubContentApi+assetSnapshotApi.copy / import* | cms·operator_*_posts | ContentHubTemplate+DataTable | active |
| `/store/{content}`·`/store/library/{contents,resources,production-materials,product-descriptions}` | store | 복사/출력물/**상품설명** | storeAssetControlApi/assetSnapshotApi/productAiContent | store_asset_snapshots/store_execution_assets/product_ai_contents | StartProductionModal+AiContentModal | active |
| `/store/content/blog`·`/store/marketing/{pop,qr,signage/*}` | store | 출력물/POP/QR/signage | blog/pop/qr/storePlaylist | staff_*_posts/store_qr_codes/store_playlists | RichTextEditor+AiContentModal | active |
| `/operator/{blog,pop,qr,content-management,signage/*,guide-contents,resources}` | operator | 원본/CMS/template | operator*/cosmetics news/guide/resources | operator_*_posts/news/guide_contents | DataTable+CmsContentManager+RichTextEditor | active |
| `/store/:slug/blog/*`·`/signage/content-hub` | public/tablet | community/signage | blogStaff(public)/publicContentApi | staff_blog_posts/media_items | BlogPostRenderer | active |

KCos 특이: 라벨 "내 매장에 복사". **KPA 대비 부재**: 멤버 community 게시글, member→hub publish(=operator-only), supplier 연동.

### 5.4 Neture (supplier/B2B + CMS/Guide hub)

| Route/Page | Surface | Role | API | Table | Common comp | Status |
|---|---|---|---|---|---|---|
| `/content`·`/content/:id`·`/resources` | public/member | cms/hub-published | /hub/contents·/neture/content | cms_content | ContentHubTemplate/ContentRenderer | active |
| `/guide`·`/guide/features/*`(13) | public | guide | guideClient(fetchGuidePageContent) | guide_pages(공유) | GuideEditableSection | active |
| `/supplier/b2b-content` | supplier | **상품설명(B2B)** | /neture/supplier/products/:id/business-content | SupplierProduct | B2BContentDrawer+RichTextEditor | active |
| `/supplier/library(/new,/:id/edit)` | supplier | 원본/template | /neture/library | SupplierLibraryItem | DataTable+RichTextEditor | active |
| `/supplier/products/import-assistant` | supplier | 원본/상품설명 | parseProductHtml/saveDraft | ImportDraft | RichTextEditor | active |
| `/admin/shared-product-descriptions`(ProductDescriptionCurationModal) | admin | **상품설명 canonical** | /admin/shared-product-descriptions/by-master/:id(seed/canonical/status) | **shared_product_descriptions** | Modal | active |
| `/partner/contents(/:id)`·`/workspace/my-content` | partner/member | cms/복사/출력물 | /neture/content + /dashboard/assets/copy·publish·archive | CmsContent/DashboardAsset | ContentRenderer | active |
| `/admin/homepage-cms`·`/operator/guide-contents` | admin/operator | cms/guide | /neture/admin/homepage-contents·guideClient | cms_content/guide_pages | Form/GuideConsole | active |
| `/account/partner/contents`·`/admin/ai-admin/context-assets/*` | partner/admin | 원본/AI draft | **Mock(WIP)** | context_assets(WIP) | Form | WIP |

Neture 특이: **B2C/B2B 이중 설명**(consumer* vs business*), **shared_product_descriptions canonical 권위(seed: supplier/ai/drug_extension)**, dashboardCopy(별도 copy 모델), context-assets(AI, WIP).

## 6. Backend / API / Data Map

| Handler | Route | Mutation | Table | sanitize-on-write | 권한/scope |
|---|---|---|---|---|---|
| KPA content (kpa.routes inline contentRouter) | /kpa/contents | create/update/delete | **kpa_contents** | ✅ body(sanitizeDescriptionHtml) | member(owner)/operator |
| CMS content (cms-content-mutation.handler) | /cms/contents | create/update/status | cms_content(per-serviceKey) | ❌ raw(body/bodyBlocks) | platform/service admin·operator |
| Store content (o4o-store store-content.controller) | /store-contents | create/update | **kpa_store_contents**(Store Production Material) | ❌ raw(content_json) | store_owner(orgId) |
| Asset snapshot (asset-snapshot.controller, @o4o/asset-copy-core) | /assets/copy·list | copy | o4o_asset_snapshots | raw copy(source meta 보존) | admin/operator/store_owner |
| Hub content (hub-content.service) | /hub/contents | read-only | cms_content·signage_media·store_blog_posts | — | public(serviceKey filter) |
| Shared product desc (neture shared-product-description) | /admin/shared-product-descriptions/* | create/canonical/status/seed | **shared_product_descriptions** | ✅ content/summary(sanitizeDescriptionHtml, 빈값 400) | platform/service admin·operator |
| Product AI content (store-ai product-ai-content) | /products/:id/ai-contents | generate/save | product_ai_contents | ❌ raw(AI 출력) | product org owner |
| Signage content (signage content.controller) | /signage/:svc/content-blocks | create/update/delete | signage_content_blocks(미검증) | ❌ raw(blockData) | service admin |
| Cosmetics/Glycopharm content (service routes) | /cosmetics·/glycopharm contents | create/update/delete | cosmetics_contents/glycopharm_contents | ❌ raw(body) | service admin·operator |
| Supplier content submission | /supplier/content-submissions | submit→cms+approval | cms_content + approval_requests | ❌ raw | supplier org |

**content table 권위 요약:** cms_content(O4O CMS, per-service) · kpa_contents/cosmetics_contents/glycopharm_contents(per-service 원본) · kpa_store_contents(store-local Production Material) · shared_product_descriptions(상품설명 canonical, per-master) · product_ai_contents(per-product AI) · o4o_asset_snapshots(복사본) · guide_pages(공유, service-scoped).

## 7. Common Package Map

| 관심사 | 공통 package export | 소비 | 상태 |
|---|---|---|---|
| Editor | `@o4o/content-editor` RichTextEditor / ContentPreview / Toolbar / Template(Save)Modal | KPA/GP/KCos/tablet | ✅ 공통 |
| Renderer | `@o4o/content-editor` ContentRenderer (+variant product-detail/guide) / `@o4o/block-renderer` BlockRenderer | 전 서비스/signage-player | ✅ 공통 |
| Sanitize | `@o4o/content-editor` sanitizeHtml/sanitizeRichHtml (`src/sanitize.ts` canonical) | 전 서비스 + backend util 동일 정책 | ✅ canonical |
| AI modal | `@o4o/content-editor` AiContentModal / StoreUseModal | store/operator content | ✅ 공통(단 KPA signage용 AiContentGenerationModal은 별도 custom) |
| Production modal | `@o4o/store-ui-core` StartProductionModal / StoreProductionMaterialsView / StoreAssetDerivationViewer | KPA/GP/KCos | ✅ 공통(KPA local copy 잔존 의심) |
| Copy/import | `@o4o/asset-copy-core` AssetSnapshot/AssetCopyService/createAssetCopyController | backend resolver + 서비스 HTTP | ✅ 공통 |
| Community write/detail | `@o4o/shared-space-ui` CommunityContentWriteShell / CommunityContentDetailView / SearchBar | KPA/GP/KCos | ✅ 공통(상세는 W1 sanitize 계약 미확정) |
| Hub/Forum template | `@o4o/shared-space-ui`·`@o4o/hub-core`·`@o4o/forum-core` *HubTemplate / Forum* | 전 서비스 | ✅ 공통 |
| Operator console | `@o4o/operator-ux-core` DataTable/5-block · `@o4o/operator-core-ui` CmsContentManager/Guide | 전 서비스 operator | ✅ 공통 |
| (미완) Content base | `@o4o/content-core` | — | ⚠️ **skeleton, 미사용** |

## 8. Copy / Publish / Production Contract

- **Copy(가져오기=복사)**: store services = `assetSnapshotApi.copy({sourceAssetId, assetType})` → `o4o_asset_snapshots`(원본 분리, source metadata 보존). UI 문구: KPA "내 매장에 복사" / GP "내 약국에 복사"(가드) / KCos "내 매장에 복사·가져가기". KCos 는 "원본 수정·삭제되어도 사본 영향 없음" 문구 명시. → **정책 구현 일치, 문구만 서비스별 상이**.
- **Neture copy 분기**: Neture 는 `dashboardCopy` → `DashboardAsset`(draft→publish→archive, exposure 추적)로 **store services 와 다른 copy 모델**. 통합 contract 정렬 후보.
- **Publish(HUB)**: `hub-content.service` 3축(Producer/SourceDomain/serviceKey). operator 가 blog/pop/qr/cms 를 published→HUB 노출, store 가 import(copy). store→community share 흐름은 제거됨(WO-...-REMOVE-STORE-TO-COMMUNITY-SHARE).
- **Production**: `StartProductionModal`(store-ui-core) → POP/QR(+서비스별 template registry) → AiContentModal(draft) → ProductionMaterialEditorPage → 저장. blog/signage/notice 는 production modal 외 별도 경로(서비스별 약간 상이).

## 9. Duplications and Drift

| 항목 | 현재 중복/drift | 위험 |
|---|---|---|
| ProductionMaterialEditorPage | KPA/GP/KCos 각자 구현(GP/KCos 거의 동일, 미추출) | 중복 유지보수 |
| StartProductionModal | store-ui-core canonical 존재하나 KPA `pages/pharmacy/StartProductionModal.tsx` local copy 잔존 의심(+KPA-only Select/TypeSelector modal) | 분기 drift |
| 상품설명 2축 | Neture `shared_product_descriptions`(canonical) ↔ store `product_ai_contents(product_description)` 연결 불명확 | taxonomy 혼동 |
| AI modal | 공통 `AiContentModal` vs KPA signage `AiContentGenerationModal`(custom) | 패턴 분기 |
| 라벨 | 내 약국(GP) vs 내 매장(KPA/KCos) | 의도적(가드)이나 문구 정렬 여지 |
| sanitize-on-write | kpa_contents/shared_product_descriptions ✅ vs cms_content·product_ai_contents·cosmetics/glycopharm_contents·kpa_store_contents·signage blocks ❌ | 저장 XSS 잔여(보안) |
| ContentWritePage | 서비스별 wrapper(thin, shell 공유) | 허용 패턴(과한 추출 불요) |
| content-core | skeleton, 미연결 | 의존 전 평가 필요 |
| Neture context-assets / partner-contents | Mock(WIP) | 미완 — 향후 정렬 |

## 10. Commonization Candidates

| Candidate | 현재 중복 | Risk | 권장 조치 | 우선 |
|---|---|---|---|---|
| ProductionMaterialEditorPage 추출 | GP/KCos 동일 | 중(상태/AI 결합) | store-ui-core 로 추출(GP/KCos 먼저, KPA 후) | 2 |
| StartProductionModal canonical 단일화 | KPA local copy | 중 | KPA 가 store-ui-core import 확인/교체 | 2 |
| 상품설명 taxonomy 정렬 | shared_product_descriptions ↔ product_ai_contents | 고(데이터 권위) | canonical↔per-store 관계/명칭 contract 문서화 | 1 |
| copy contract 통합 | assetSnapshot ↔ dashboardCopy(Neture) | 중 | Hub publish/My Store copy API contract 명문화 | 3 |
| sanitize-on-write 확장 | raw 저장 6+ table | 고(보안) | cms_content/product_ai_contents/cosmetics·glycopharm_contents 등 write sanitize | 1 |
| copy 문구 정렬 | 내 약국/내 매장 | 저 | UI label 정렬(가드 유지) | 4 |
| ContentRenderer/sanitize 사용 기준 | 일부 직접 dangerouslySetInnerHTML(IR-AUDIT WARNING) | 중 | 사용 기준 가이드 + 잔여 WARNING 정리 | 3 |

## 11. Recommended WO Sequence

1. **WO-O4O-CONTENT-TYPE-TAXONOMY-AND-NAMING-ALIGNMENT-V1** — 상품설명(canonical vs per-store)·콘텐츠·자료실·출력물·템플릿·AI draft 명칭/관계 정렬(지도 기반 문서 우선). [§9 상품설명 2축]
2. **WO-O4O-CONTENT-BODY-SANITIZE-ON-WRITE-CROSSSERVICE-V1** — 보안: cms_content / product_ai_contents / cosmetics·glycopharm_contents / kpa_store_contents 등 raw 저장 경로에 backend sanitize 확장(상품설명 V2·KPA body V1 패턴 재사용 + COMMONIZATION util). [§6 sanitize drift]
3. **WO-O4O-CONTENT-PRODUCTION-FLOW-UI-COMMONIZATION-V1** — ProductionMaterialEditorPage 추출 + StartProductionModal canonical 단일화(KPA local copy 정리). [§10-1,2]
4. **WO-O4O-CONTENT-HUB-MY-STORE-COPY-CONTRACT-V1** — assetSnapshot ↔ Neture dashboardCopy copy/publish contract 정렬. [§8]
5. **WO-O4O-CONTENT-COPY-POLICY-UI-LABEL-ALIGNMENT-V1** — 가져오기=복사·원본/사본 분리·삭제 영향 문구 정렬(내 약국/내 매장 포함). [§8]
6. **WO-O4O-CONTENT-EDITOR-RENDERER-USAGE-ALIGNMENT-V1** — ContentRenderer/RichTextEditor/sanitizeHtml 사용 기준 + 잔여 WARNING(W1/W5/W6) 정리. [IR-AUDIT 연계]
7. (선택) `@o4o/backend-safe-html-sanitizer` 공통화(`WO-O4O-BACKEND-SAFE-HTML-SANITIZER-COMMONIZATION-V1`) — #2 전제.

> 보안(#2)과 taxonomy(#1)를 먼저, UI 공통화(#3~6)는 그 위에서 단계화. 한 번에 이식 금지(FORUM-HUB HOLD 교훈).

## 12. Non-goals / Unchanged

- 코드 / DB / migration / route / menu / UI 문구 / API contract / 공통 package 추출 / 대량 리팩터 **없음**.
- 보안 잔여 WARNING(W1/W5/W6) 수정·기존 데이터 cleanup **안 함**.
- 일부 table 명/세부(예: signage_content_blocks, KPA local StartProductionModal 분기 여부)는 **(미검증)** — 후속 WO 착수 시 확정 필요.

## 13. Commit Hygiene

- 본 IR 문서 **단독** path-specific stage → 단일 shell call 로 `add → diff --cached → commit → push` 체인.
- 다른 세션 WIP 미접촉(스테이지 제외).

---

*Date: 2026-06-16 · O4O content surface 공통화 지도 · read-only · 4서비스+packages+backend · 가져오기=복사(assetSnapshot, Neture=dashboardCopy 분기) · 상품설명 2축(shared_product_descriptions canonical ↔ product_ai_contents per-store) · AiContentModal draft 흐름 · sanitize-on-write drift(kpa_contents/shared ✅, 그 외 raw) · ProductionMaterialEditor/StartProductionModal 중복 · 후속 WO 7 우선순위(taxonomy+보안 우선) · 코드/DB/dep 무변경.*
