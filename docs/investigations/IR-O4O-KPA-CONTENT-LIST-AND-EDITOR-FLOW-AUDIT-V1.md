# IR-O4O-KPA-CONTENT-LIST-AND-EDITOR-FLOW-AUDIT-V1

> **유형:** 조사 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** KPA Society 콘텐츠 리스트·편집기 흐름·제품 연결·복사 구조를 확인하고, 운영자/내 매장/매장 허브 공통화 기준형 가능성을 판단한다.
> **작성:** 2026-06-13

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **콘텐츠 제작 흐름은 "아직 공통화 안 됨"이 아니라, 이미 KPA 내부에서 상당히 통합·공유되어 있다.** POP/QR/블로그/상품상세 4종 제작이 **shared `StartProductionModal`(@o4o/store-ui-core) + `productionTargets.tsx`(SSOT 카탈로그)** 로 통합되어 있고, 편집은 **shared `RichTextEditor`/`AiContentModal`(@o4o/content-editor)**, 복사는 **`o4o_asset_snapshots` full-copy detach** 로 동작한다. 사용자가 가정한 기준 흐름(제작유형 선택→내용준비→템플릿→편집기→저장)이 **이미 구현**되어 있다.
>
> **판정: A안 (KPA 콘텐츠 구조가 기준형으로 적합, KPA 정비 후 공통화 가능).** 단 2개 별도 과제: ① **"제품 콘텐츠" 리스트/탭 presentation 미존재**(product_marketing_assets junction 은 있으나 "전체/일반/제품" 뷰 없음) → **제품 콘텐츠 설계 IR 분리 권장(D-성)**, ② 콘텐츠 리스트 display 패턴이 3 surface 별로 상이(split-tab/unified-badge/category-remap) → 경미 정렬(B-성).

## 1. 조사 개요

KPA 콘텐츠 리스트(내매장/허브/운영자)·POP/QR/블로그/안내문 제작 흐름·편집기·제품 연결·복사 원칙을 read-only 2-에이전트(프론트 / 백엔드) 병렬 조사.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `1b5cd3d72` |
| origin ahead/behind | **0 / 2** (로컬이 origin 보다 2 커밋 앞섬 — 다른 세션 미push) |
| git status --short | `M pnpm-lock.yaml` · `?? CHECK-CODEX-ENV-SETUP-V1.md` (다른 세션 — 미접촉) |
| 조사 기준 commit | `1b5cd3d72` |

## 3. 현재 콘텐츠 리스트 구조

| route | component | 제목 | 표시 유형 | 구조 |
|-------|-----------|------|----------|------|
| `/store/library/contents` | StoreLibraryContentsPage | 콘텐츠 | 콘텐츠(문서형/코스형) + 강의(LMS) | **split tab**(콘텐츠/강의 + 서브탭) |
| `/store/library/production-materials` | StoreProductionMaterialsPage | 매장 제작 자료 | material/qr/blog | **unified + kind badge**(행별) |
| `/store-hub/content` | HubContentLibraryPage | 플랫폼 콘텐츠 | notice/news/guide/knowledge/promo/event | unified + category remap 필터 |
| `/operator/resources` | OperatorResourcesPage | 자료 관리 | 운영자 자료/콘텐츠 | OperatorResourcesConsolePage(공유) |

- **kind badge**: `ResultKind = 'material'|'qr'|'blog'` (StoreProductionMaterialsPage), purpose 라벨(pop/qr/blog/product_description/summary…).
- **표시 패턴 상이**: production-materials=통합배지, library/contents=분할탭, hub=카테고리 remap. → 같은 "콘텐츠 리스트"인데 display 규칙이 surface 별로 다름(경미 drift).

## 4. 콘텐츠 유형별 구현 현황 (제작 흐름)

| 유형 | route | component | 흐름 | 편집기 |
|------|-------|-----------|------|--------|
| POP | `/store/marketing/pop` | StorePopPage | 선택→StartProductionModal→템플릿→(AI)→레이아웃→PDF | 템플릿/AI |
| QR | `/store/marketing/qr` | StoreQRPage | 선택→StartProductionModal→폼(title/slug/landing/link)→(AI) | 폼 + AI optional |
| 블로그 | `/store/content/blog` | PharmacyBlogPage | 선택→StartProductionModal→RichTextEditor+AI→저장 | **RichTextEditor** |
| 상품상세 | `/store/marketing/product-descriptions` | StoreProductDescriptionsPage | 선택→StartProductionModal→편집기 | RichTextEditor |
| 제작자료(AI) | `/store/library/production-materials/new` | ProductionMaterialEditorPage | AiContentModal→insert→편집→저장 | **RichTextEditor**(AI 프리필) |

> **통합 진입점 = `StartProductionModal`(@o4o/store-ui-core) + `productionTargets.tsx` SSOT.** 4 target whitelist(pop/qr/blog/product-description), 각 templateCategory·defaultTemplateId·supportsTemplates·onAiAction. **2 진입(자료 선택 후 / 자료 없이 ProductionTypeSelectorModal)** 공유.

## 5. 제품 연결 콘텐츠 처리

| 항목 | 결과 |
|------|------|
| 제품 연결 구조 | **있음** — `product_marketing_assets` junction(product_id ↔ asset_type[qr/library/signage…]+asset_id, organizationId, UQ) |
| 콘텐츠 entity 의 productId 컬럼 | **없음** — kpa_content/store_execution_assets/store_pops 모두 productId 직접 컬럼 없음. **polymorphic junction** 으로 연결 |
| B2B/B2C/공통 구분 | **콘텐츠에 없음** — 세그먼트는 Product 측, 콘텐츠 측엔 b2b/b2c 필드 부재 |
| 별도 "제품 콘텐츠" 리스트/탭 | **없음** — junction 은 있으나 "전체/일반/제품 콘텐츠" presentation 미구현 |
| "전체/일반/제품 콘텐츠" 탭 정리 가능? | 가능하나 **신규 설계 필요**(junction 기반 뷰/필터 + B2B/B2C 표현 설계) |

> ⚠️ **제품 콘텐츠는 데이터 연결(junction)은 되나 사용자-facing 뷰가 없다.** "제품 콘텐츠 탭" 은 본 IR 범위 밖 신규 설계 → **별도 IR 권장**.

## 6. 검색·필터 가능성

| 필터 | 현황 |
|------|------|
| 제목 검색 | ✅ 대부분 surface 제공 |
| 태그 검색 | ✅ kpa_content tags JSONB `@>` (자료실), 콘텐츠 리스트는 부분 |
| 제품명 검색 | ❌ — product junction 기반 필터 UI 없음(최소 수정 가능: junction join) |
| 콘텐츠 유형 필터 | △ production-materials=배지 표시(필터 약), hub=category 필터 |
| 용도 필터 | △ usage_type/purpose 저장되나 필터 UI 약함 |
| 연결 제품 필터 | ❌ — 미구현(junction 있어 추가 가능) |

> 제품명·연결제품 필터는 junction(`product_marketing_assets`) 기반으로 **최소 수정 추가 가능** 하나 현재 미구현.

## 7. 편집기 구조와 재사용

- **편집기 = shared** `RichTextEditor`(@o4o/content-editor) — ProductionMaterialEditorPage·PharmacyBlogPage 등 재사용.
- **AI = shared** `AiContentModal`(@o4o/content-editor) — library/production/pop/qr/blog 5 surface 재사용. mode(pop/qr/blog/customer_rewrite), initialText, onInsert(html,title).
- **capability**: 신규 작성 ✅ / 기존 복사 편집 ✅(StartProductionModal source.items) / 자료실 자료 불러오기 ✅(StoreContentsSelector sourceType cms/content/direct) / 템플릿 적용 ✅(getTemplatesForTarget) / AI 초안 ✅.
- **저장→리스트**: ProductionMaterialEditorPage→`createStoreExecutionAsset()`→`/store/library/production-materials` 복귀→getStoreExecutionAssets 로 표시.

> 편집기/AI/템플릿/저장→리스트 흐름이 **이미 공유·완결**. 사용자가 가정한 기준 흐름과 일치.

## 8. 매장 허브 가져오기 / 복사 구조

| 흐름 | 방식 | 원칙 정합 |
|------|------|:--:|
| **HUB → 내 매장 복사** | `AssetCopyService.copyResolved()` → `o4o_asset_snapshots.content_json` **full copy**, `source_asset_id`=메타데이터(FK 없음) | ✅ **detach** — 원본 수정/삭제가 복사본에 영향 없음(immutable snapshot, no sync) |
| 매장 로컬 편집 | `kpa_store_contents.content_json`(COALESCE override), snapshot 불변 | ✅ 원본 동결, 로컬 편집 분리 |
| **운영자 → HUB 게시** | `content-approval.service` — **참조 + status 전이**(원본 status→published), snapshot 미생성 | ⚠️ **예외** — HUB 게시 후 원본 편집 가능(복사 아님) |
| 파생 추적 | `store_asset_derivations` — lineage 메타데이터(FK 없음) | ✅ 참조 아님 |

> **"가져오기=복사, 원본 분리" 원칙은 store 복사 경로에서 충족.** 단 **운영자→HUB 게시는 복사가 아닌 참조+status 전이**(원본 편집 가능) — 의도된 별도 흐름이나 원칙과 다름. 명문화 필요.

## 9. 콘텐츠 유형 taxonomy (backend)

| 필드 | 값 | 강제 |
|------|-----|:--:|
| `store_execution_assets.usage_type` | pop/qr/signage/banner/notice | app-level |
| `kpa_content.usage_type` | READ/LINK/DOWNLOAD/COPY | app-level |
| `kpa_store_contents.source_type` | snapshot_edit/direct | app |
| `kpa_store_contents.author_role` | operator/store | **DB CHECK**(supplier 차단) |
| `kpa_store_contents.visibility_scope` | organization | **DB CHECK**(HUB 직접노출 차단) |
| `kpa_store_contents.workspace_status` | draft/pending_ai/ai_processed/ready_curation/archived | **DB CHECK** |
| `o4o_asset_snapshots.asset_type` | cms/signage/lesson/content/resource/blog/pop/qr | app whitelist |

## 10. 운영자/내 매장/매장 허브 공통화 가능성

| 레이어 | 공통화 현황 |
|--------|------------|
| 제작 진입(StartProductionModal) | ✅ **shared SSOT**(store-ui-core + productionTargets) |
| 편집기/AI | ✅ shared(content-editor) |
| 복사(snapshot) | ✅ shared(asset-copy-core, o4o_asset_snapshots) |
| 운영자 콘솔 | ✅ OperatorResourcesConsolePage(operator-core-ui) |
| 콘텐츠 리스트 display | △ surface 별 패턴 상이(통합배지/분할탭/remap) — 경미 정렬 여지 |
| 제품 콘텐츠 뷰 | ❌ 미설계 |
| GP/KCos 동형 여부 | 본 IR KPA 범위 — cross-service 확인은 후속 |

## 11. 후속 WO 제안

| 후보 | 내용 | 권장도 |
|------|------|:--:|
| `IR-O4O-PRODUCT-CONTENT-PRESENTATION-DESIGN-V1` | 제품 연결 콘텐츠의 "전체/일반/제품" 리스트·탭·필터·B2B/B2C 표현 설계(junction 기반) | **권장(다음)** |
| `WO-O4O-CONTENT-LIST-DISPLAY-ALIGNMENT-V1` | 3 surface 콘텐츠 리스트 display 패턴 정렬(통합배지 기준) | 선택(경미) |
| `IR-O4O-OPERATOR-HUB-PUBLISH-COPY-VS-REFERENCE-POLICY-V1` | 운영자→HUB 게시의 참조 vs 복사 원칙 명문화 | 선택 |
| `IR-O4O-CONTENT-PRODUCTION-CROSSSERVICE-PARITY-V1` | GP/KCos 가 KPA StartProductionModal/편집기 동형인지 확인 | 선택(확산 전) |

## 12. 최종 판단 (A/B/C/D/E)

**A안 (KPA 콘텐츠 구조가 기준형으로 적합, KPA 정비 후 공통화 가능) — 단 제품 콘텐츠는 D-성으로 분리.**

- 제작 진입·편집기·AI·복사(snapshot)·운영자 콘솔이 **이미 shared/완결** → KPA 가 좋은 기준형. (A 명확)
- 분산(B)은 경미(리스트 display 패턴 차이뿐, 핵심 흐름은 통합).
- 유형별 구현 차이(C)는 작음(StartProductionModal 카탈로그로 통합).
- **제품 콘텐츠(D)** 는 데이터 junction 만 있고 presentation 미설계 → **별도 설계 IR 분리가 맞음**.
- 경계 불명확(E) 아님 — 자료실(원본)/콘텐츠(제작 원천)/제작 자료(결과물=execution asset)/snapshot(복사본) 경계가 taxonomy·테이블로 구분됨.

## 13. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 콘텐츠 리스트 위치/분산 | 3 surface(내매장/허브/운영자) + 제작자료 통합리스트 — 핵심 흐름 통합, display 경미 분산 |
| 제품 = 매장 경영 핵심 ↔ 콘텐츠 연결 | junction(`product_marketing_assets`) 있음, 단 사용자-facing 제품 콘텐츠 뷰 미설계 |
| 가져오기=복사 원칙 | store 복사 경로 충족(snapshot detach). 운영자→HUB 게시는 참조(예외, 명문화 필요) |
| 단순 다운로드 vs 매장 실행 자산 vs 콘텐츠 경계 | taxonomy 로 구분(자료실/콘텐츠/execution asset/snapshot) |
| 편집기 재사용 | ✅ RichTextEditor/AiContentModal shared |
| KPA 기준형 적합 | ✅ 제작 흐름 통합·공유 — 적합 |
| 1인 유지보수성 | 높음(SSOT 카탈로그 + shared 편집기). 제품 콘텐츠 뷰 추가 시 junction 재사용 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-KPA-CONTENT-LIST-AND-EDITOR-FLOW-AUDIT-V1.md` |
| 조사 기준 commit | `1b5cd3d72` |
| 콘텐츠 리스트 | 3 surface + 제작자료 통합리스트(kind badge). display 패턴 surface 별 상이 |
| 제작 흐름 | **shared StartProductionModal SSOT + 편집기/AI 공유** — 이미 통합 |
| 제품 연결 | junction(`product_marketing_assets`) 있음, **제품 콘텐츠 뷰/탭 미설계** |
| 편집기 | RichTextEditor/AiContentModal shared, 신규/복사/자료실/템플릿/AI 모두 지원 |
| 복사 구조 | snapshot full-copy detach(✅). 운영자→HUB 게시는 참조(예외) |
| 판정 | **A안** — KPA 기준형 적합. 제품 콘텐츠는 별도 설계 IR(D) 분리 |
| 다음 단계 | `IR-O4O-PRODUCT-CONTENT-PRESENTATION-DESIGN-V1`(제품 콘텐츠) 권장 |
| git status | 로컬 2 커밋 ahead(다른 세션) + WIP(미접촉), 본 IR 문서만 신규 |
