# IR-O4O-KPA-OPERATOR-STORE-SHARED-FUNCTION-PARITY-AUDIT-V1

> **유형:** Read-only 조사 + 개선 설계 IR. 코드/DB/API/메뉴/UI **무변경**. 본 문서 1개만 산출.
> **작성일:** 2026-06-27
> **검증 방식:** 정적 코드 추적(메뉴 config → route → page component → API client → backend controller/entity/table). **운영 브라우저 육안 확인은 미수행**(§11). 확인하지 않은 항목을 PASS 로 쓰지 않음.
> **결론 요약:** 운영자와 내 매장은 "비슷한 화면"이 아니라 **3개 영역**(운영자 작성 / 매장 HUB 가져오기 선반 / 내 매장 자체 콘텐츠)으로 나뉜다. 편집기(RichTextEditor)는 **이미 공통**, 리스트 테이블은 **운영자 + 매장 HUB = 공통(ListColumnDef)** 인데 **내 매장 자체 콘텐츠만 다른 API(@o4o/ui Column)** 를 쓰는 비대칭이 핵심. POP/동영상/블로그는 **operator/store 가 같은 물리 테이블**(author_role 분기), QR 은 **별도 테이블**(operator_qr_templates vs store_qr_codes, import 시 slug 발급). 가져오기는 **항상 독립 값 복사**(공유 FK 아님). → 사용자 노출 명칭/흐름 통일은 가능하나, **데이터 소유권·org 스코프·author_role 읽기 필터·copy-on-import 불변식**은 절대 훼손 금지.

---

## 1. 조사 개요

### 1.1 목적
KPA 운영자 대시보드와 내 매장 영역의 콘텐츠/QR/POP/동영상/블로그 기능을 메뉴→라우트→컴포넌트→API→데이터 소유권→공개 랜딩까지 하나의 흐름으로 연결해 비교하고, (1) 동일 기능, (2) 동일 목적·역할 차이, (3) 이름만 비슷한 별도 기능을 구분한다. 구현은 하지 않는다.

### 1.2 조사 방법
4개 병렬 read-only 추적: ① 내 매장 FE, ② 운영자 FE, ③ 백엔드 데이터 소유권, ④ FE 컴포넌트 재사용. 모든 근거는 `path:line` 인용.

### 1.3 핵심 발견 — "2영역"이 아니라 "3영역"
| 영역 | 위치 | 라우트 | 역할 |
|---|---|---|---|
| **운영자 작성** | `pages/operator/**` | `/operator/*` | 서비스 범위 원본 작성·발행 (HUB 게시) |
| **매장 HUB(가져오기 선반)** | `pages/pharmacy/Hub*LibraryPage` | `/store-hub/*` | 운영자 게시물을 매장이 **가져가기(복사)** |
| **내 매장(자체 콘텐츠)** | `pages/pharmacy/**` | `/store/*` | 매장 소유 콘텐츠·사본 작성·발행·QR |

> 운영자↔내 매장을 1:1로 맞추려는 시도는 **매장 HUB(중간 가져오기 계층)** 를 누락하면 틀린다. 가져오기 선반은 이미 운영자와 같은 테이블 스택(`@o4o/operator-ux-core`)을 쓰고 있어 **부분적으로 이미 parity** 다.

---

## 2. 결론 요약 (분류)

| 기능 | 분류 | 근거 한 줄 |
|---|---|---|
| RichTextEditor(본문 편집기) | **A. 완전 동일(이미 공통)** | `@o4o/content-editor` `preset="full"` 양쪽 동일, `{html,json}` 계약 (`packages/content-editor/src/types.ts:6-9`) |
| POP / 동영상 / 블로그 (원본·사본) | **B. 동일 목적·역할 차이** | 같은 물리 테이블 `store_pops`/`store_videos`/`store_blog_posts`, `author_role`+`store_id` 분기 (`store-pop.entity.ts:56-60`) |
| 콘텐츠 리스트 테이블 | **C. 부분 유사(테이블 API 비대칭)** | 운영자·매장HUB=`operator-ux-core ListColumnDef`, 내매장 자체=`@o4o/ui Column<T>` (다른 API) |
| QR 만들기 흐름 | **C/B. 부분 유사·역할 차이** | 별도 테이블(operator_qr_templates vs store_qr_codes), picker·form 중복 |
| 가져오기(import) | **B. 동일 목적·역할 차이** | 항상 독립 값 복사, `copied_from_id` 추적용 (`store-video.entity.ts:86-91`) |
| 콘텐츠 허브(kpa_contents) vs 운영자 발행(blog/pop/...) | **D. 별도(상태 어휘 다름)** | `ready/draft` vs `draft/published/archived` |
| 제품 상세설명→콘텐츠 | **D. 별도(운영자 측 부재)** | 매장 전용(`StoreProductDescriptionsPage.tsx`), 운영자 대응 없음 |
| 다국어 상품 콘텐츠 | **B. 동일 목적·역할 차이** | 운영자 group/locale 작성 → 매장 import 사본 |
| QR 대상 picker (ContentHubPickerModal vs StoreAssetSelectorModal) | **C/E. 중복 후보** | 소스 범위 다름(1 vs 5), org 경계 다름 |

---

## 3. 운영자 전체 메뉴 트리

Source: `services/web-kpa-society/src/config/operatorMenuGroups.ts` `UNIFIED_MENU`(`:29`), `filterMenuByRole`(`:127`), wrapper `KpaOperatorLayoutWrapper.tsx:28-31`. 라우트: `routes/OperatorRoutes.tsx`, 가드 `RoleGuard allowedRoles=PLATFORM_ROLES`(`:79`, = `kpa:admin/kpa:operator/platform:super_admin`).

**콘텐츠 관련 핵심 (group=stores/content):**
| 메뉴명 | path | component | 모델 |
|---|---|---|---|
| 매장 HUB 블로그 | `/operator/blog` | `OperatorBlogListPage`/`OperatorBlogWritePage` | `store_blog_posts`(author_role=operator) |
| 매장 HUB POP | `/operator/pop` | `OperatorPopListPage`/`OperatorPopWritePage` | `store_pops`(operator) |
| 매장 HUB QR-code | `/operator/qr` | `OperatorQrListPage`/`OperatorQrWritePage` | `operator_qr_templates` |
| 매장 HUB 동영상 | `/operator/video` | `OperatorVideoListPage`/`OperatorVideoWritePage` | `store_videos`(operator) |
| 매장 HUB 다국어 상품 콘텐츠 | `/operator/multilingual-product-contents` | `OperatorMultilingualContent*` | mlc group/locale |
| 콘텐츠 허브 | `/operator/docs` | `OperatorContentHubPage`(모달) | `kpa_contents` |
| 자료실 관리 | `/operator/resources` | `OperatorResourcesPage`(콘텐츠 허브 재사용) | — |
| 공지사항/뉴스 | `/operator/content` | `ContentManagementPage`(CMS) | cms |
| Home 편집 | `/operator/community` | `CommunityManagementPage` | — |

> 비콘텐츠(회원/승인/주문/포럼/LMS/사이니지/분석/시스템)는 §16 파일 경로 참조. `OPERATOR_MENU_ITEMS`(`:149`)는 `@deprecated` 미사용 배열.

---

## 4. 내 매장 전체 메뉴 트리

**A. 매장 HUB(가져오기 선반)** — `HUB_MENU_ITEMS` 하드코딩 `components/pharmacy/PharmacyHubLayout.tsx:43-60`, 가드 `HubGuard`:
홈/상품카탈로그(b2b)/디지털사이니지/이벤트·특가/내장바구니/**콘텐츠·자료**(`/store-hub/content`)/**블로그**/**POP**/**QR-code**/**동영상**. (다국어 상품 콘텐츠 route `:727-728` 는 메뉴 부재 = orphan.)

**B. 내 매장(자체 콘텐츠)** — `KPA_SOCIETY_STORE_CONFIG` `packages/store-ui-core/src/config/storeMenuConfig.ts:253-348`, 가드 `PharmacyGuard`, `resolveStoreMenu`+`useStoreCapabilities`(capability map 거의 주석처리 `menuCapabilityMap.ts:17-34` → 대부분 항상 노출):
- 약국 경영지원: **상품 설명**(`/marketing/product-descriptions`)/**블로그**(`/content/blog`)/**POP**(`/marketing/pop`)/**QR-code**(`/marketing/qr`)/타블렛 구성
- 약국 자료함: **콘텐츠**(`/library/contents`)/**자료**(`/library/resources`)
- 디지털 사이니지(SIGNAGE cap)/온라인 판매/판매 채널 확장/분석/설정

**메뉴 없는 라우트(orphan, URL/딥링크/알림 전용):** `/store/content`(StoreAssetsPage), `/store/content/pop`(PharmacyPopPage), `/store/content/video`(PharmacyVideoPage), `/store/library/production-materials*`(의도적 숨김 `storeMenuConfig.ts:300-303`), `/store/requests`, `/store/execution/product-info`. (App.tsx:1037-1042 등)

---

## 5. 동일·유사 기능 매핑 (메뉴 비교표 §6.1)

| 기능 | 내 매장(자체) 메뉴/경로 | 매장 HUB(가져오기) 경로 | 운영자 메뉴/경로 | 동일 기능 여부 | 권고 |
|---|---|---|---|---|---|
| 블로그 | 블로그 `/store/content/blog` (`PharmacyBlogPage`) | `/store-hub/blog` (`HubBlogLibraryPage`) | 매장 HUB 블로그 `/operator/blog` | 같은 테이블(author_role 분기) | **B** 흐름·명칭 통일, 권한·설명 구분 |
| POP | POP `/store/marketing/pop` (생성) + `/store/content/pop`(사본) | `/store-hub/pop` | 매장 HUB POP `/operator/pop` | 같은 테이블 | **B** |
| 동영상 | (자체 생성 없음) `/store/content/video`(사본) | `/store-hub/video` | 매장 HUB 동영상 `/operator/video` | 같은 테이블 | **B** |
| QR-code | QR-code `/store/marketing/qr` (`StoreQRPage`) | `/store-hub/qr` | 매장 HUB QR-code `/operator/qr` | **별도 테이블** | **C/B** picker·form 중복, import 경계 보존 |
| 다국어 상품 콘텐츠 | `/store-hub/multilingual-product-contents/my`(사본) | `/store-hub/multilingual-product-contents` | `/operator/multilingual-product-contents` | 사본 모델 | **B** |
| 콘텐츠(일반) | 콘텐츠 `/store/library/contents`, 자체 `/store/content/*` | `/store-hub/content` | 콘텐츠 허브 `/operator/docs`(kpa_contents) | **다른 모델** | **D** 상태 어휘 다름, 명칭 통일 시 혼동 주의 |
| 자료 | 자료 `/store/library/resources` | (콘텐츠·자료에 포함) | 자료실 관리 `/operator/resources` | 유사 | **C** |
| 상품 설명→콘텐츠 | 상품 설명 `/store/marketing/product-descriptions` | — | **없음** | 운영자 측 부재 | **D** 별도(gap) |

> 명칭 관찰: 운영자 측은 일관되게 **"매장 HUB " 접두**(매장 HUB 블로그/POP/QR-code/동영상) → 운영자가 "매장용 HUB 콘텐츠를 만든다"는 의미. 내 매장·매장HUB 선반은 접두 없이 "블로그/POP/QR-code/동영상". → 같은 어근 유지(좋음), 접두 의미 차이는 역할 차이로 보존 가능.

---

## 6. 명칭 불일치 (§6.4 명칭 변경 후보)

| 현재 운영자 명칭 | 대응 내 매장 명칭 | 실제 기능 | 권장 | 변경 범위 | 확신도 |
|---|---|---|---|---|---|
| 콘텐츠 허브(`/operator/docs`) | 콘텐츠/자료함 | `kpa_contents` 작성(모달) | 모델이 달라 **명칭 통일 비권장** | — | 높음(D) |
| 매장 HUB QR-code | QR-code | QR 템플릿 작성(slug 미발급) | 어근 유지, 접두 보존 가능 | 사이드바만 | 중 |
| 자료실 관리 ↔ 콘텐츠 허브(`resources/new`가 ContentHub 재사용) | 자료/콘텐츠 | 같은 컴포넌트 2용도 | **혼동 위험** 명확화 필요 | 페이지 제목/breadcrumb | 중 |
| `news`→ContentManagementPage, `community-management`→community 등 redirect | — | redirect-only | 내부 라우트, 사용자 무관 | 없음(내부) | 높음 |

> 내부 코드명(`OperatorProductsPage`=`ProductsPage.tsx` 등 별칭)은 사용자 비노출 → **변경 불요**.

---

## 7. 사용자 흐름 불일치 (§6.2)

### 7.1 QR 만들기 (가장 큰 흐름 차이)
| 단계 | 운영자 | 내 매장 |
|---|---|---|
| 진입 | `/operator/qr` 리스트 → "새 QR 템플릿" → **별도 페이지** `OperatorQrWritePage` | `/store/marketing/qr` → "QR 만들기" → **인페이지 모달** `StoreAssetSelectorModal` |
| 대상 유형 | radio `url`/`content` → kind `content_hub/blog/cms/pop` | 소스 탭(execution/content-hub/blog/mlc/direct) → landingType 매핑 |
| 대상 picker | `ContentHubPickerModal`(단일 소스, `status='ready'`만) | `StoreAssetSelectorModal`(5 소스, org 자산 포함) |
| 발급 | slug/PNG **미발급**(import 시 발급) | `store_qr_codes` 즉시 생성, `/qr/{slug}` |
| 완료 후 | `/operator/qr/:id/edit` redirect | 네비 없음, 인페이지 리스트 prepend |
| 공개 랜딩 | (템플릿은 랜딩 없음) | `/qr/:slug` `QrLandingPage` |

→ **흐름 통일 가능 범위**: 진입(별도페이지 vs 모달) 일관화, 버튼명 통일은 가능. 단 **대상 모델/발급 시점이 본질적으로 달라** form 자체 통합은 어려움(§9 위험).

### 7.2 콘텐츠 작성·발행
| | 운영자 콘텐츠 허브 | 운영자 발행(blog/pop/...) | 내 매장 |
|---|---|---|---|
| 작성 UI | **모달** | **별도 페이지** | 별도 페이지 |
| 상태 | `ready`/`draft` (저장=즉시사용) | `draft`/`published`/`archived` | (envelope `contentJson`) |
| 발행 | 별도 endpoint 없음(`status='ready'`=발행) | `PATCH .../publish` 별도 | snapshot/published |

→ **상태 어휘 2종 공존**이 가장 큰 정합성 이슈. 통일 시 기존 발행물 누락 위험(§10).

### 7.3 편집기 — 이미 동일
운영자·내 매장 모두 `@o4o/content-editor RichTextEditor preset="full"`, `{html,json}` 저장 (`OperatorBlogWritePage.tsx:23,245` ↔ `StoreContentEditPage.tsx:39,336`). **본 감사 최강 parity 지점.**

---

## 8. 프론트엔드 구현 비교 (§6.3)

| 빌딩블록 | 운영자 | 매장 HUB(가져오기) | 내 매장(자체) | 공통? |
|---|---|---|---|---|
| 본문 편집기 | `@o4o/content-editor` | — | `@o4o/content-editor` | **YES(이미 공통)** |
| 리스트 테이블 | `@o4o/operator-ux-core` `ListColumnDef` | **`@o4o/operator-ux-core` `ListColumnDef`** | **`@o4o/ui` `Column<T>`**(다름) | **부분** — 내 매장 자체만 비대칭 |
| 상태 배지/액션 | `RowActionMenu`+policy(`@o4o/ui`) | `ActionBar`/`BulkResultModal`(`@o4o/ui`) | 인라인 `kindBadge`/`stageBadge`(로컬) | 내 매장 자체만 분산 |
| QR 대상 picker | `ContentHubPickerModal`(로컬) | — | `StoreAssetSelectorModal`(로컬) | **NO(중복)** |
| QR 생성 form | `OperatorQrWritePage`(template) | — | `StoreQrCreateModal`/`StoreQRPage`(row) | **NO(중복)** |

> **핵심 비대칭**: 운영자 + 매장 HUB 선반은 이미 `operator-ux-core ListColumnDef` 스택. **내 매장 자체 콘텐츠(StoreQRPage/PharmacyVideoPage/StoreContentsSelector)만 `@o4o/ui Column<T>`** 사용. (두 DataTable 은 `system`/`onCellClick` 유무가 다른 별개 API — MEMORY 기록.) → 가장 가치 높은 정비 = 내 매장 자체 테이블을 ListColumnDef 로 수렴(KPA 로컬, 공통 패키지 무변경, GP/KCos 무영향).

---

## 9. API·데이터 소유권 비교

| 기능 | 내 매장 테이블 | 운영자 테이블 | 동일? | 소유 컬럼 | 스코프 필터 |
|---|---|---|---|---|---|
| 매장 콘텐츠(legacy) | `kpa_store_contents` | 없음(operator rows=Workspace A 오프라인 소스) | 매장 전용 | `organization_id` | org + source_type |
| POP | `store_pops`(store) | `store_pops`(operator, store_id NULL) | **YES** | `store_id` | author_role+serviceKey |
| 동영상 | `store_videos`(store) | `store_videos`(operator) | **YES** | `store_id` | 동일 분기 |
| 블로그 | `store_blog_posts`(store) | `store_blog_posts`(operator) | **YES** | `store_id`/service_key | author_role |
| QR | `store_qr_codes` | `operator_qr_templates` | **NO** | `organization_id` / service_key | 별도 |
| CMS/사이니지 | — | `cms_contents`/`signage_*` | operator 전용 | — | serviceKey+visibilityScope |

**소유 가드 차이(중요):**
- 매장 staff CRUD(POP/동영상/QR): `created_by_user_id === userId` (`video.controller.ts:53-55`) — org 멤버라도 생성자 아니면 403 (MEMORY 일치).
- 매장 콘텐츠(`kpa_store_contents`) 직접 쓰기: RBAC `isStoreOwner()` + org 이중 해석.
- 운영자: **role 기반**(ownership 아님), `author_role='operator'`/`store_id=null`/`status='draft'` 강제.

**가져오기 = 독립 값 복사(불변):** 모든 import 핸들러가 새 row INSERT, `copied_from_id`는 추적용. 원본 수정/삭제가 사본에 **영향 없음**(`store-video.entity.ts:86-91`). source metadata 보존.

**QR 공개 랜딩:** `GET /api/v1/kpa/qr/public/:slug`(무인증, `store-qr-landing.controller.ts:110`). `landing_target_id`는 `landing_type`에 따라 **다른 테이블 ID 참조**(product=offer/listing, video=store_videos 사본, page=kpa_store_contents direct). **copy-on-import 불변식**: page QR 이 운영자 원본(`kpa_contents.id`)을 가리키면 매장 소유 사본(`store_execution_assets`)으로 **재작성**(`qr-content-hub-copy.service.ts:101-131`) → 공개 랜딩은 운영자 원본을 직접 읽지 않음.

---

## 10. 공통화 가능 범위 / 11. 유지해야 할 차이

### 공통화 가능 (사용자 노출 + KPA 로컬)
- **명칭/문구**: 같은 작업 같은 이름(블로그/POP/QR-code/동영상 어근 유지). 기술 구현명 비노출.
- **리스트 테이블**: 내 매장 자체 콘텐츠를 `operator-ux-core ListColumnDef` 로 수렴(운영자·HUB와 동일). **공통 패키지 무변경, GP/KCos 무영향.**
- **상태 배지**: 공유 StatusBadge 추출(additive).
- **편집기**: 이미 공통 — 문서화만.

### 차이 유지 필수 (§6.5)
| 기능 | 차이 유지 이유 | 운영자 | 매장 |
|---|---|---|---|
| 데이터 소유 | 원본 vs 사본 | service 범위, store_id NULL | org/store 범위 |
| 권한 가드 | role vs ownership | role 기반 | created_by/isStoreOwner |
| QR 발급 시점 | 템플릿 vs 실물 | import 시 slug | 즉시 slug |
| 상태 어휘 | 발행 의미 다름 | ready / published | snapshot/published |
| 가져오기 | 독립 사본 보장 | 게시 | 복사(FK 아님) |

---

## 12. 위험 요소 (§10)

| # | 위험 | 근거 |
|---|---|---|
| R1 | POP/동영상/블로그 **공유 테이블** 읽기 필터에서 `author_role`/`store_id IS NULL` 누락 시 매장 사본이 HUB 에 노출(역방향도) | `hub-content.service.ts:497-503` |
| R2 | 소유 가드 혼동(`created_by_user_id` vs `isStoreOwner` vs role) — 통합 시 잘못된 게이트 선택 | `video.controller.ts:53-55` |
| R3 | 운영자 콘텐츠는 `organization_id` **부재** — store 식 org WHERE 가정 시 빈 결과/에러 | `operator-qr-template.entity.ts:14-18` |
| R4 | QR form 통합이 import 경로 우회 → `ensureStoreCopyForPageTarget` 우회 → 운영자 원본 참조 불변식 위반 | `qr-content-hub-copy.service.ts:1-15` |
| R5 | `landingTargetId` 타입 혼선(product/video/page 다른 테이블) → 공개 URL 깨짐 | `store-qr-landing.controller.ts:184-243` |
| R6 | 상태 어휘 통일 중 기존 발행물(`ready` vs `published`) 목록 누락 | §7.2 |
| R7 | `@o4o/content-editor` 등 **공통 패키지 변경 시 GP/KCos 동시 영향**(3서비스) — Shared-Module 프로토콜 필수, GP tsc 는 `tsc -b` 로 검증 | CLAUDE.md §1, MEMORY |
| R8 | `kpa_store_contents` 이중 용도(매장 자료 + Workspace A) DB CHECK(`visibility_scope='organization'`) 위반 위험 | `kpa-store-content.entity.ts:89-142` |

---

## 13. 권장 구현 단계 (Phase)

| Phase | 범위 | 변경 | 위험 |
|---|---|---|---|
| **P1 명칭/문구 통일** | 사이드바·페이지 제목·버튼·모달·빈화면 문구. 기능/라우트 무변경 | KPA FE only | 낮음 |
| **P2 흐름 통일** | QR 진입 방식·버튼명, 콘텐츠 목록 액션, 빈/오류 처리. **상태 어휘는 P5 전 보류** | KPA FE only | 중(상태 제외) |
| **P3 내 매장 테이블 → ListColumnDef 수렴** | StoreQRPage/PharmacyVideoPage/StoreContentsSelector 를 operator-ux-core 로(운영자·HUB와 동일) | KPA 로컬 | 낮음(패키지 무변경) |
| **P4 중복 정리** | StatusBadge 공유 추출, redirect/legacy 라우트 정리, resources↔contenthub 재사용 명확화 | KPA 로컬+additive | 낮음 |
| **P5 상태 어휘·QR picker/form 통합 검토** | `ready/draft` vs `published` 정합, QR target value-object 설계 후 picker 통합 | 별도 IR/WO, API 영향 검토 | 높음 — 본 IR 에서 구현 확정 안 함 |

---

## 14. 권장 구현 단계 우선순위 근거
- **즉시 가치·저위험**: P1(명칭) + P3(테이블 수렴, GP/KCos 무영향). 
- **편집기**는 이미 공통 → 작업 불요, 문서화만.
- **QR form/picker, 상태 어휘**는 데이터 모델 차이가 본질 → 설계 선행(P5), 무검증 통합 금지.

---

## 15. 후속 WO 후보

| WO | 목적 | 예상 변경 | 선행 | 위험 | 순서 |
|---|---|---|---|---|---|
| `WO-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1` | 명칭/문구 통일 | KPA FE 메뉴·제목·버튼 | — | 낮음 | 1 |
| `WO-O4O-KPA-STORE-OWN-CONTENT-LIST-LISTCOLUMNDEF-PARITY-V1` | 내 매장 자체 테이블을 ListColumnDef 로 | KPA 로컬 FE | — | 낮음 | 2 |
| `WO-O4O-KPA-OPERATOR-CONTENT-EDITOR-FLOW-PARITY-V1` | 작성 진입(모달/페이지)·발행 흐름 통일(상태 제외) | KPA FE | 1 | 중 | 3 |
| `WO-O4O-KPA-QR-CREATION-FLOW-PARITY-V1` | QR 진입/버튼/완료 동선 통일(테이블 분리 유지) | KPA FE | 2 | 중 | 4 |
| `WO-O4O-KPA-STATUS-VOCAB-NORMALIZATION-IR-V1` | ready/draft↔published 정합 설계 | 조사(IR) | — | 높음 | 5 |
| `WO-O4O-KPA-QR-TARGET-PICKER-SHARED-COMPONENT-IR-V1` | QR target value-object + picker 통합 설계 | 조사(IR) | 4 | 높음 | 6 |
| `IR-O4O-KPA-OPERATOR-STORE-LEGACY-DUPLICATE-CLEANUP-AUDIT-V1` | orphan 라우트·deprecated 메뉴·redirect 정리 후보 | 조사 | — | 낮음 | 병행 |

---

## 16. 조사 근거 및 주요 파일 경로

**FE 메뉴/라우트:** `config/operatorMenuGroups.ts`, `routes/OperatorRoutes.tsx`, `App.tsx`(store routes 671-1083), `components/pharmacy/PharmacyHubLayout.tsx:43-60`, `packages/store-ui-core/src/config/storeMenuConfig.ts:253-348`, `menuCapabilityMap.ts:17-34`.
**FE 페이지:** operator `pages/operator/{OperatorContentHubPage,blog,pop,qr,video,multilingual-product-content}/*`; store `pages/pharmacy/{StoreQRPage,PharmacyVideoPage,PharmacyPopPage,PharmacyBlogPage,StoreProductDescriptionsPage,Hub*LibraryPage}.tsx`, `components/store/StoreAssetSelectorModal.tsx`, `pages/operator/qr/ContentHubPickerModal.tsx`.
**FE 공통:** `@o4o/content-editor`(types.ts:6-16), `@o4o/operator-ux-core`(DataTable/ListColumnDef), `@o4o/ui`(DataTable/Column), `@o4o/store-ui-core`.
**Backend:** `apps/api-server/src/.../entities/{store-pop,store-video,store-qr-code,operator-qr-template,kpa-store-content}.entity.ts`, controllers `{store-content,video,pop,qr,operator-video,store-qr-landing}.controller.ts`, `services/{hub-content,qr-content-hub-copy}.service.ts`, `dashboard-assets.copy-handlers.ts`, `kpa.routes.ts:413`.
**참조 문서:** CLAUDE.md §5(Store Production Material), `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`, `PLATFORM-CONTENT-POLICY-V1`, `O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`, `O4O-STORE-MENU-CANONICAL-TREE-V1`.

---

## 17. 검증·미수행 명시 (정직성)

| 항목 | 상태 |
|---|---|
| 정적 코드 추적(메뉴→route→component→API→entity) | ✅ 4영역 병렬 완료, `path:line` 인용 |
| 운영 브라우저 read-only 육안 확인(§11) | ⛔ **미수행** — 후속 WO 에서 운영자/매장 계정으로 명칭·흐름 실화면 확인 권장(`sohae2100`=multi-role, `/store-hub`=약국 계정 필요, MEMORY 참조) |
| 일부 endpoint 문자열(assetSnapshot copy 등) | △ sub-agent 보고 기반, 직접 line 미인용 항목은 §5/§9 에 "approximate" 로 표기 |
| 코드/DB/API/UI 변경 | ✅ 없음 — 본 문서만 산출 |

---

*Date: 2026-06-27 · read-only parity audit · 코드 무변경 · 3영역(운영자/매장HUB/내매장) 모델 · 편집기 이미 공통 · 테이블 비대칭(내매장 자체만 @o4o/ui) · POP/동영상/블로그 공유테이블 · QR 별도테이블 · import=독립복사 · 첫 후속=TERMINOLOGY-ALIGNMENT.*
