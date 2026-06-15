# IR-O4O-STORE-CONTENT-PRODUCTION-AND-MANAGEMENT-SUPPORT-FLOW-V1

> **유형**: Investigation (read-only) — 콘텐츠 제작·보관·가져가기·활용이 약국/매장 경영 지원 환경에서 어떻게 연결되는지 흐름 조사.
> **성격**: 코드/DB/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **현재 구조는 O4O 철학과 대체로 일치(A)** — 운영자 발행(`cms_contents` status='published')→`/store-hub/content` browse→`assetSnapshotApi.copy('/assets/copy')`→**불변 스냅샷**(`o4o_asset_snapshots`, source FK 없음)→내 매장 편집 레이어(`kpa_store_contents`, snapshot_id nullable·독립 content_json)→제작 결과물. **가져오기=복사+원본 단절+출처 메타 = 구현됨**. 복사 의미 UX 명시(`내 매장에 복사`/`복사 완료`). 잔여: **B**(GP `내 약국` vs `내 매장` 용어·Download 아이콘 polish), **D-대부분완료**(3서비스 route/table parity 존재 — 컴포넌트 near-identical dedup 기회), **E-경미**(다중 테이블/3 라이브러리 경계는 문서로 정의됨 — 안내 보강 여지). **C/F 아님**(발행↔복사 혼동 없음, 원본-사본 단절 DB 충돌 없음).
> **선행/근거**: `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` · `O4O-STORE-MENU-CANONICAL-TREE-V1` · `O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1` · `PLATFORM-CONTENT-POLICY-V1` · `O4O-BUSINESS-PHILOSOPHY-V1` · `O4O-3-ROLE-FLOW-BASELINE-V1`.
> **작성일**: 2026-06-15

---

## 1. 목적

운영자 콘텐츠 제작·공개 → 매장 허브 browse → 내 매장 가져가기(복사) → 보관·편집 → POP/QR/블로그/안내문/상품설명/사이니지 제작 → 경영 지원 화면 연결의 **전체 흐름**을 확인하고, 현재 구현이 O4O 철학과 충돌하는지 판정하며, 후속 WO 범위를 확정한다. (AI 모델/프롬프트/provider 는 범위 밖 — 별도 작업공간.)

## 2. 대상 서비스

KPA Society / GlycoPharm / K-Cosmetics. (Neture 는 매장 기능 부재로 제외 — 운영자 발행 참고만. `O4O-STORE-MENU-CANONICAL-TREE-V1 §1.3`.)

## 3. 기준 원칙 (doctrine digest)

| # | 원칙 | 근거 |
|---|------|------|
| P1 | 운영자가 **유일한 HUB 발행 주체**. 공급자는 직접 게시 안 함(원천 자료만 전달) | `O4O-BUSINESS-PHILOSOPHY-V1 §3,§5` · `O4O-3-ROLE-FLOW-BASELINE-V1 §3` |
| P2 | **가져오기 = 복사(snapshot)**, 링크 아님. 원본 변경 ≠ 사본 변경 | `O4O-STORE-MENU-CANONICAL-TREE-V1 §4.2`, `BUSINESS-PHILOSOPHY §5` |
| P3 | 사본은 매장 소유 → 자유 편집·삭제·재사용. 원본은 HUB(운영자만 수정) | `STORE-MENU-CANONICAL-TREE §4.2` |
| P4 | 사본은 **출처 메타 보존**. `assetSnapshotApi.copy({sourceService,sourceAssetId,assetType})` | `STORE-MENU-CANONICAL-TREE §4.3` |
| P5 | 원천 자료(raw) ≠ 실행 자산(POP/QR/블로그/사이니지). O4O 는 실행 환경, **원본 저장소·전문 디자인 도구 아님** | `O4O-3-ROLE-FLOW-BASELINE-V1 §4`, `BUSINESS-PHILOSOPHY §1` |
| P6 | HUB 6항목 ↔ 내 매장 메뉴 **1:1 동일 축** (상품상세/POP/QR/블로그/사이니지/고객안내문) | `STORE-MENU-CANONICAL-TREE §1.1,§2.1,§3` |
| P7 | 콘텐츠 격리 3축 = Producer / Visibility / ServiceScope. 회원 작성형 `/content` ≠ 운영자 발행 `/store-hub/content` ≠ 자료실 `/resources` | `PLATFORM-CONTENT-POLICY-V1 §2~§6` |
| P8 | Store 콘텐츠는 HUB 탭에 노출 안 됨. `serviceKey=current` 격리 필수 | `PLATFORM-CONTENT-POLICY-V1 §5,§6.4` |

---

## 4. Phase 1 — 운영자 콘텐츠 제작·공개 흐름

| 서비스 | 발행 route | 컴포넌트 | 상태 | API | 테이블 |
|--------|-----------|---------|------|-----|--------|
| **KPA** | `/operator/content` | `ContentManagementPage`(`@o4o/operator-core-ui CmsContentManager`) | draft/published/archived | `/api/v1/kpa/news/*` | `cms_contents` (serviceKey=`kpa`) |
| **GP** | `/operator/content-management` | `OperatorContentPage`(동 CmsContentManager) | 동 | `/api/v1/glycopharm/news/*` | `cms_contents` (`glycopharm`) |
| **KCos** | `/operator/content-management` | `OperatorContentPage`(동) | 동 | `/api/v1/cosmetics/news/*` | `cms_contents` (`cosmetics`) |

- 발행 UI 는 **`CmsContentManager`(operator-core-ui)로 공통화**. status `published`='게시', `draft`='임시저장', `archived`='보관' (`packages/operator-core-ui/src/modules/cms-content/CmsContentManager.tsx`).
- backend `news.controller.ts`(`apps/api-server/src/routes/o4o-store/controllers/`) 파라미터화 컨트롤러 — `cms_contents` 단일 테이블 + `serviceKey` 필터.
- `cms_contents` 가시성 컬럼: `authorRole`(admin|operator), `visibilityScope`(platform|service|organization) — `PLATFORM-CONTENT-POLICY §7` 서버 강제(P7).
- **차이**: KPA 발행 route 명 `/operator/content` vs GP/KCos `/operator/content-management` (컴포넌트 wrapper 명만 상이, 내부 CmsContentManager 동일).

## 5. Phase 2 — `/store-hub/content` browse 흐름

| 서비스 | route | 컴포넌트 | 공통 베이스 | 필터 |
|--------|-------|---------|------------|------|
| **KPA** | `/store-hub/content` | `HubContentLibraryPage`(`pages/pharmacy/`) | `@o4o/shared-space-ui ContentHubTemplate` | status='published' |
| **GP** | `/store-hub/content` | `HubContentListPage`(`pages/hub/`) | 동 ContentHubTemplate | 동 |
| **KCos** | `/store-hub/content` | `HubContentPage`(`pages/hub/`) | 동 | 동 |

- 3서비스 모두 **shared `ContentHubTemplate`** 기반(`packages/shared-space-ui/src/ContentHubTemplate.tsx`) — 서비스별 차이는 config/adapter(fetch·필터·문구·테마)로 주입. 탭(전체/공지/가이드/지식/프로모션/뉴스 등) + 검색.
- **운영자 발행만 노출**: `status='published'` + 운영자 producer 기준 조회 → 회원 작성형 `/content`(커뮤니티) 와 분리(P7). serviceKey 격리(P8).
- **복사 동선 명시**(P2/P4): card 별 복사 버튼 + 복사 후 안내. ContentHubTemplate 기본 `copyLabel='내 매장에 복사'` / `copiedLabel='복사 완료'`(`ContentHubTemplate.tsx:244-245`).

## 6. Phase 3 — 가져가기 = 복사 흐름 + 데이터 모델 (핵심)

### 6.1 복사 메커니즘
- frontend: `assetSnapshot.ts:62-63` → `apiClient.post('/assets/copy', {sourceService, sourceAssetId, assetType})` (서비스 base 접두 → `POST /api/v1/{svc}/assets/copy`). 목록 `GET /assets`(`:73`).
- backend: `createAssetSnapshotController`(`apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts`) → `@o4o/asset-copy-core AssetCopyService.copyWithResolver()`(`packages/asset-copy-core/src/services/asset-copy.service.ts:85-136`). 각 서비스 routes 에 mount(kpa/glycopharm/cosmetics `*/assets/copy`).
- service-specific resolver(`KpaAssetResolver` 등)가 source 유형별 표준 `ResolvedContent` 반환: `cms / signage / lesson / content / resource / blog / pop / qr`.

### 6.2 데이터 모델 — 원본/사본 단절 (P2/P3/P4 검증)

| 레이어 | 테이블 | 성격 | source 추적 | FK |
|--------|--------|------|------------|----|
| 스냅샷(복사) | `o4o_asset_snapshots`(`packages/asset-copy-core/src/entities/asset-snapshot.entity.ts`) | **불변 자기완결 복사**. `contentJson` 전체 복사 | `sourceService`+`sourceAssetId`+`assetType` (메타만) | **원본 FK 없음** |
| 편집 레이어 | `kpa_store_contents`(`apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts`) | 매장 작업 사본(lazy, 첫 편집 시 생성) | `snapshot_id`(nullable uuid, `:44-45`), `source_type`('snapshot_edit'|'direct', `:48-49`), `source_metadata` jsonb(`:124-125`) | **snapshot FK 없음**(plain uuid 컬럼) |

**검증 결론(P2/P3/P4 = 충족):**
1. 원본 source 와 스냅샷은 **다른 저장**(스냅샷 = `contentJson` 전체 복사, source row 참조 FK 없음) → 원본 수정/삭제가 사본에 영향 없음.
2. 사본↔편집도 분리: `kpa_store_contents` 는 `snapshot_id` 를 nullable uuid 컬럼으로만 보유(@ManyToOne/JoinColumn 없음=cascade 없음). 첫 편집 시 별도 row 생성, 스냅샷은 불변.
3. 출처 메타 보존: 스냅샷에 `sourceService/sourceAssetId/assetType`, 편집 레이어에 `source_metadata`(공급사/채널/일자) + `author_role`(default operator)/`visibility_scope`(default organization).
4. **중복 가져오기**: backend dedup 가드 **없음**(unique constraint 제거 — `WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1`). 동일 항목 N회 복사 시 N개 스냅샷. UI 는 `복사 완료` 상태(client-side `sourceAssetId` 대조)로만 표시 → **의도된 독립 복사 정책**(versioning 허용)이나 사용자 혼동 여지(관찰 §10).

### 6.3 복사 액션 라벨 (UX 명시성)
| 서비스 | copyLabel | copiedLabel | 복사 후 안내(infoLinks) |
|--------|-----------|-------------|------------------------|
| KPA | `내 매장에 복사`(`HubContentLibraryPage.tsx:149`) | `복사 완료`(`:150`) | — |
| GP | **`내 약국에 복사`**(`HubContentListPage.tsx:185`) | `복사 완료`(`:186`) | `내 약국 > 자산 관리`→`/store/library/contents`(`:193`) |
| KCos | `내 매장에 복사`(`HubContentPage.tsx:180`) | `복사 완료`(`:181`) | `내 매장 > 자산 관리`→`/store/library/contents`(`:188`) |

> "복사" 의미는 **명확히 노출**됨(P2 UX 충족). `다운로드` 라벨 없음. **잔여(B)**: GP `내 약국` vs KPA/KCos `내 매장` 용어 변이, GP 복사 버튼이 `Download` 아이콘 사용(`HubContentListPage.tsx:102`, 라벨은 정상) — 경미 polish.

## 7. Phase 4 — 내 매장 보관·편집 흐름

3서비스 **route·테이블 parity 존재**(컴포넌트 동일명, 서비스별 디렉터리). 내 자료함 = 3구획:

| 구획 | route | 컴포넌트 | 데이터 |
|------|-------|---------|--------|
| 콘텐츠 | `/store/library/contents` | `StoreLibraryContentsPage` | 직접: `kpa_store_contents`(source_type='direct') · 복사: `o4o_asset_snapshots`(assetType=content) · 강의: LMS lesson |
| 자료(자료실) | `/store/library/resources` | `StoreLibraryResourcesPage` | 직접: `store_execution_assets`(library) · 복사: `o4o_asset_snapshots`(assetType=resource). **편집 없음, 보관/관리 전용** |
| 제작 자료(결과물) | `/store/library/production-materials` | `StoreProductionMaterialsPage` | `kpa_store_contents`(direct) + `store_execution_assets`(generated) + `store_blog_posts` + `store_qr_codes` 통합 조회(읽기) |

- **편집 진입**: 콘텐츠 선택 → `StartProductionModal` → AI/직접 → `ProductionMaterialEditorPage`(`/store/library/production-materials/new`) — `@o4o/content-editor RichTextEditor`. 스냅샷 편집은 `/store/content/:snapshotId/edit`(`StoreContentEditPage`) → `storeContentApi.upsert()` → `kpa_store_contents`.
- 상태: 임시저장(draft) / 공개(published) / 수정 / 삭제.
- **콘텐츠 ≠ 자료실 ≠ 제작 결과물** 3구획 분리 = 철학(P5/P7) 정합. 단 다중 테이블 + 3페이지 인지 복잡성(E).

## 8. Phase 5 — 제작 결과물 흐름표 (6항목, P6)

| 유형 | 제작 시작 | 편집기 | 저장(테이블) | 결과물 목록 | 상품 연결 |
|------|----------|:------:|------------|------------|:--------:|
| **상품 상세** | `/store/commerce/products/:id/*` | RTE | (상품/실행자산) | 상품 화면 | ✅ |
| **POP** | `/store/marketing/pop` (`StorePopPage`) | RTE(`ProductionMaterialEditorPage`) | `store_pops`(author_role=store) | ProductionMaterials + POP 화면 | ✅(`/commerce/products/:id/pop`) |
| **QR-code** | `/store/marketing/qr` (`StoreQRPage`) | 메타 편집(landing) | `store_qr_codes` | ProductionMaterials(Kind=qr) | ✅(landing=product) |
| **블로그** | `/store/content/blog` (`PharmacyBlogPage`) | RTE | `store_blog_posts`(staff API) | ProductionMaterials(Kind=blog) | 선택(sourceItems) |
| **사이니지** | `/store/marketing/signage/*` (`StoreSignagePage`) | 미디어/플레이리스트 | 사이니지 테이블 | 사이니지 화면(별도) | 제한적 |
| **고객 안내문/상품설명** | `/store/marketing/product-descriptions` (`StoreProductDescriptionsPage`) | RTE | `store_execution_assets`(category) | ProductionMaterials(material) | ✅ |

- HUB 가져가기 대응: `/store-hub/{pop,qr,blog,signage,content}` 각 `Hub*LibraryPage` → 동일 `assetSnapshotApi.copy(assetType)`(P6 동일 축 충족).
- KPA = reference. **GP/KCos route+table parity 확인됨**(Agent 조사: `/store/library/*`, `/store/marketing/*`, `/store-hub/*` 전 항목 3서비스 동일).

## 9. Phase 6 — route / API / table 인벤토리

**Route(공통, 3서비스)**: `/operator/content[-management]` · `/store-hub/content(,/pop,/qr,/blog,/signage)` · `/store/library/{contents,resources,production-materials,production-materials/new}` · `/store/content/{:snapshotId/edit,direct/:id,blog}` · `/store/marketing/{pop,qr,signage,product-descriptions}`.

**API**: 발행 `/{svc}/news/*` · 복사 `/{svc}/assets/copy`·`/{svc}/assets` · 편집 `/{svc}/store-contents/*` · 결과물 `/{svc}/store/assets`·`/{svc}/stores/:slug/{blog,pop}/staff`·`/{svc}/pharmacy/qr`.

**Table**: `cms_contents`(발행) · `o4o_asset_snapshots`(복사 스냅샷) · `kpa_store_contents`(편집 레이어=Store Production Material canonical) · `store_execution_assets`(결과물/자료) · `store_blog_posts` · `store_pops` · `store_qr_codes` · 사이니지.

> `kpa_store_contents` = **legacy 물리명, logical canonical = service-neutral "Store Production Material"** (`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1 §1`). 성급한 rename 금지(CLAUDE.md §5).

## 10. Phase 7 — 철학 충돌 체크 (Drift Guard)

| Drift 항목 | 기준 | 결과 |
|-----------|------|------|
| 공급자 HUB 직접 발행 | P1 | ✅ 없음(발행=운영자 cms_contents) |
| 복사가 snapshot API 미경유 | P2/P4 | ✅ 전부 `assetSnapshotApi.copy(assetType)` |
| 원본-사본 링크(FK) 결합 | P2/P3 | ✅ 단절(스냅샷 source FK 없음, 편집 레이어 snapshot FK 없음) |
| 출처 메타 누락 | P4 | ✅ sourceService/AssetId/assetType + source_metadata |
| HUB↔매장 메뉴 축 불일치 | P6 | ✅ 6항목 동일 축 |
| Store 콘텐츠 HUB 노출 | P8 | ✅ /store-hub/content = published operator only |
| 회원 /content ↔ 운영자 /store-hub/content 혼입 | P7 | ✅ producer/status 분리 |
| serviceKey cross-service | P8 | ✅ serviceKey 필터 |
| 중복 복사 dedup | — | ⚠️ backend 가드 없음(의도된 독립 복사) — UX 안내 여지 |
| 용어/아이콘 일관성 | — | ⚠️ GP `내 약국` vs `내 매장`, GP Download 아이콘 |

**중대한 철학 충돌 없음.** 가져오기=복사·원본 단절·발행↔복사 구분·콘텐츠/자료실 분리 모두 구현. → **C/F 해당 없음.**

## 11. Phase 8 — 이미 공통화된 부분 / 서비스 차이

**공통화 완료:**
- 발행: `CmsContentManager`(operator-core-ui) + `cms_contents` 단일 테이블.
- browse: `ContentHubTemplate`(shared-space-ui) + config 주입.
- 복사: `asset-copy-core` + `createAssetSnapshotController` + `o4o_asset_snapshots`(전 서비스 동일).
- 내 매장 보관/편집/결과물: route+table parity 3서비스 동일, `RichTextEditor` 편집기 공통.

**서비스 차이(잔여):**
- KPA browse `HubContentLibraryPage`(custom tab remap) vs GP/KCos `HubContentListPage`/`HubContentPage` — 모두 ContentHubTemplate 기반이나 wrapper near-identical 중복(dedup 기회, b2b IR 동형 패턴).
- 발행 route 명 KPA `/operator/content` vs GP/KCos `/operator/content-management`.
- 복사 라벨 GP `내 약국` vs `내 매장`, GP Download 아이콘.

## 12. 결과 판정

| 안 | 해당 | 근거 |
|----|:---:|------|
| **A** 철학 대체로 일치, 문구/안내 보강 | **주** | 복사·단절·발행↔복사 구분·격리 전부 구현 |
| **B** 복사=구현됨, UX 안내 일부 보강 | **부분** | 라벨/아이콘/용어 변이(GP 내 약국/Download), 중복 복사 안내 |
| **C** 발행↔복사 혼동, route/UI 정리 | ❌ | 발행(cms_contents)·복사(snapshot) 명확 분리 |
| **D** 내 매장 제작자료 KPA 정리·GP/KCos parity 필요 | **대부분 완료** | route/table parity **존재** — 남은 건 컴포넌트 dedup |
| **E** 콘텐츠/자료실/제작자료 경계 불명확 | **경미** | 경계는 canonical 문서로 정의됨 — 다중 테이블 인지 복잡성/안내 여지 |
| **F** 원본-사본 단절 DB 충돌 | ❌ | 단절 정상 구현(FK 없음, 자기완결 스냅샷) |

→ **종합 = A(주) + B(부분) + D(대부분완료, 컴포넌트 dedup) + E(경미, 안내).**

## 13. 후속 WO 후보 / 우선순위

**저위험 정렬 (우선)**
1. `WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1` — 복사 라벨/아이콘/용어 정렬(GP `내 약국`↔`내 매장` 정책 결정, GP Download→Copy 아이콘), "가져오기=복사·원본 단절" 안내 문구 보강, 중복 복사 안내. **(B/E)**
2. `WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1`(후보) — KPA `HubContentLibraryPage` vs GP/KCos near-identical browse wrapper 공통 추출(ContentHubTemplate config 정렬). **(D 컴포넌트 dedup, b2b IR 동형)**

**평가 후**
3. `WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1`(후보) — 중복 복사 정책(허용 유지 + UX 명시 vs soft-dedup) 결정. **(중복 복사 §6.2-4)**
4. `WO-O4O-OPERATOR-CONTENT-ROUTE-NAME-ALIGNMENT-V1`(후보) — `/operator/content` vs `/operator/content-management` 명 정렬(저위험, 선택).

**조사**
5. `IR-O4O-STORE-PRODUCTION-MATERIAL-TABLE-CONSOLIDATION-AUDIT-V1`(후보) — `o4o_asset_snapshots`/`kpa_store_contents`/`store_execution_assets`/`store_blog_posts`/`store_pops`/`store_qr_codes` 다중 테이블 경계·중복 audit(E 구조 정비 판단 — 성급한 rename/통합 금지, canonical 기준).

> **권장 순서**: ① 용어/안내 정렬(B/E, 저위험) → ② browse 컴포넌트 dedup(D) → ③ 중복 복사 UX 정책 → ④ 테이블 consolidation audit.

---

## 14. 결론

- **운영자 발행 → 허브 browse → 복사 → 보관/편집 → 제작 결과물 → 경영 지원** 전 흐름이 **O4O 철학과 대체로 정합(A)**. 핵심 원칙(가져오기=복사·원본 단절·출처 메타·발행↔복사 구분·콘텐츠/자료실/허브 분리·6항목 동일 축)이 **코드·DB·UX 에 구현**되어 있다.
- 데이터 모델은 **자기완결 스냅샷(`o4o_asset_snapshots`, source FK 없음) + 독립 편집 레이어(`kpa_store_contents`, snapshot FK 없음)** 로 원본-사본 단절을 구조적으로 보장 → **F(DB 충돌) 없음**.
- 발행(`cms_contents`)과 복사(snapshot)가 명확히 분리되어 **C(혼동) 없음**.
- 내 매장 제작자료는 KPA reference + **GP/KCos route/table parity 존재(D 대부분 완료)** — 잔여는 컴포넌트 near-identical dedup.
- 보강 여지는 **B(복사 라벨/아이콘/용어 polish·중복 복사 안내)** 와 **E(다중 테이블 경계 안내)** 로 모두 **저위험 후속**.
- **권고**: 구조 정비가 아니라 **용어/안내 정렬(B/E) → browse 컴포넌트 dedup(D)** 순으로 진행. 계약/데이터 모델은 추가 정렬 불요(이미 A).

---

*Date: 2026-06-15 · read-only IR · 코드 무변경 · 콘텐츠 제작·복사·활용·경영지원 흐름 = O4O 철학 정합(A) + B(용어/안내) + D(컴포넌트 dedup, parity 존재) + E(경계 안내). 가져오기=복사·원본 단절·발행↔복사 구분 구현 확인. C/F 해당 없음.*
