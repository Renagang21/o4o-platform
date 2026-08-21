# CHECK — WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1

- **상태**: ACTIVE (기록물 — `docs/checks/`)
- **기준 commit**: `146e08d1c` (작업 시작 시 `origin/main`)
- **결과 commit**: `e2d03b8d1`, `5bc8f0ba2`
- **작성일**: 2026-08-21

---

## §1. 목표 요약

PharmacyHub 에서 Community / Content / Resource 를 **PH 전용 복제 구현으로 만들지 않고**
현재 플랫폼의 공통 구조를 조사한 뒤 실제 PH 사용자 흐름에 채택한다.
세 영역의 관계를 확정하는 것이 핵심이며 화면 추가가 목적이 아니다.

---

## §2. 핵심 질문 판정

| # | 질문 | 판정 | 근거 |
|:-:|------|------|------|
| A | PH Community 가 공통 Community core 를 그대로 채택 가능한가 | **YES — 이미 채택 완료** | `createServiceForumRouter({ scope: 'community', requireActiveServiceMembership })` 마운트. 선행 WO 에서 backend 변경 0 으로 완료 |
| B | PH Content/Resource 가 shared table 을 쓰는가 / 별도 PH table 인가 | **축이 둘로 갈린다** — 매장 축은 공통 원장에 채택 완료, 회원 축은 전면 부재(GAP) 였다 | 매장 축: `kpa_store_contents` · `store_execution_assets` · `store_blog_posts`. 회원 축: `/content` · `/resources` route 0 |
| C | Community 게시물과 Content/Resource 는 동일 도메인인가 | **별도 도메인 · 별도 원장** | Community = `forum_post` / `forum_category_requests` (경계 `service_code`). Content/Resource = `cms_contents` 또는 `{service}_contents`. 교차 FK 없음 |
| D | PH 회원 자료실 부재가 NOT_IMPLEMENTED 인가 OUT_OF_SCOPE 인가 | **NOT_IMPLEMENTED (GAP)** | `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1` 상 일반 약사 회원은 membership active 만으로 커뮤니티·교육·콘텐츠를 이용한다 → 정책상 제외가 아니다 |

---

## §3. 작업공간

- 브랜치 `main` 직접 작업. **git worktree 미사용** — worktree 는 `main` 을 두 번 checkout 할 수 없고
  feature 브랜치는 `CLAUDE.md §1` 에서 금지된다. §3 의 취지(다른 세션 WIP 무접촉)는 **path-specific stage** 로 달성했다.
- 다른 세션 WIP 무접촉 확인: `packages/action-log-core/**`(D), `packages/ui/src/layout/GlobalHeader.tsx`(M),
  `apps/api-server/src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts`(M),
  `docs/checks/WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1-CHECK.md`(untracked)
  — **전부 미접촉**. `git add .` 미사용.

---

## §4. 전체 census — Community / Content / Resource

모집단은 기존 WO 목록이 아니라 **최신 main 의 실제 route 정의**에서 추출했다
(`services/*/src/App.tsx` 의 `path=` 전수 + backend router 전수).

### 4-1. 회원(Member) 축 route 보유 현황 — 5 서비스

| 항목 | KPA | K-Cosmetics | GlycoPharm | Neture | PharmacyHub |
|------|:---:|:---:|:---:|:---:|:---:|
| Community 홈 | `/community` | (홈 통합) | `community` | `/operator/community` | `/community` |
| Forum 목록·상세·작성 | O | O | O | O | O |
| 내 글 | `/forum/my-posts` | `forum/my-posts` | `forum/my-posts` | `/forum/my-posts` | `/forum/my-posts` |
| 내 포럼(소유자) | `/mypage/my-forums` | `forum/my-dashboard` | `forum/my-dashboard` | `/supplier/my-forum` | `/forum/my-dashboard` |
| 포럼 개설 신청 | `/forum/request` | `forum/request-category` | `forum/request-category` | `/forum/request` | `/forum/request` |
| 커뮤니티 검색 | (통합) | - | - | - | `/community/search` |
| **Content(공지·소식)** | `/content` | `content` | `content` | `/content` | **없음 → EXCLUDED (§10)** |
| **Resource(자료실)** | `/resources` | `resources` | `resources` | `/resources` | **없음 → 본 WO 에서 ADOPTED_NEW** |

> **PH 만 회원 자료실이 없었다 (4/5 보유).** 공통 View 가 이미 존재하므로 adapter 작업만으로 해소 가능했다.

### 4-2. 매장(Store) 축 — PH 는 이미 공통 원장에 채택 완료

| 화면 | PH route | 공통 원장 | 공통 패키지 |
|------|---------|----------|-----------|
| 매장 콘텐츠 | `/store-owner/content` | `kpa_store_contents` (legacy 물리명 · logical = Store Production Material) | `@o4o/content-editor` |
| 자료함 | `/store-owner/library` | `store_execution_assets` + `store_blog_posts` (merge) | `@o4o/store-ui-core` `StoreProductionMaterialsView` |
| 자료함 자산 | `/store-owner/library/resources` | `store_execution_assets` | - |

> 메모리에 남아 있던 "PH Content/Resources 는 `pharmacy_hub_*` 테이블 부재로 중지" 기록은
> **매장 축에 한해 STALE** 이다. 매장 축은 신규 테이블 없이 공통 원장으로 이미 해소됐다.

### 4-3. Community Hub 부가 축 (ads / sponsors / quick links)

KPA · K-Cosmetics · GlycoPharm · Neture 4서비스가 `CommunityHubService` 를 채택했고
**PharmacyHub 만 미채택** 이다. 판정은 **EXCLUDED** — PH operator 에는 광고·매장지원 축이 없고
(`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`), 프로덕션 3 테이블 모두 row 0 이다.

---

## §5. DB / Entity / API census

### 5-1. 테이블 family 실측 (프로덕션 read-only)

| 테이블 | service scope | org scope | write | read | prod rows |
|--------|--------------|:---------:|-------|------|:---------:|
| `cms_contents` | **`serviceKey`** | `organizationId` | `POST/PUT/PATCH /api/v1/cms/contents` — `platform:super_admin` 또는 `{serviceKey}:admin` / `{serviceKey}:operator` | `GET /api/v1/cms/contents` (optionalAuth) | 126 |
| `kpa_contents` | 없음 (물리 분리) | 없음 | `/api/v1/kpa/contents` | 동일 | 16 |
| `cosmetics_contents` | 없음 (물리 분리) | 없음 | cosmetics route | 동일 | 2 |
| `glycopharm_contents` | 없음 (물리 분리) | 없음 | glycopharm route | 동일 | 4 |
| `pharmacy_hub_contents` | - | - | - | - | **테이블 자체가 없음** |
| `forum_category_requests` | **`service_code`** | `organization_id` | 공통 신청·심사 API | `ForumControllerBase.applyServiceScope` | 5 |
| `forum_post` | 상위 forum 경유 | `organization_id` | service forum router | 동일 | 8 |
| `forum_comment` | 없음 | 없음 | 동일 | 동일 | 5 |
| `forum_category_members` | 없음 | 없음 | membership API | 동일 | 3 |
| `forum_join_requests` | 없음 | 없음 | membership API | 동일 | 1 |
| `community_ads` / `community_sponsors` / `community_quick_links` | **`service_code`** | 없음 | `CommunityHubService` (operator) | public GET | 0 / 0 / 0 |
| `store_execution_assets` | 없음 | `organization_id` | store-owner API | 동일 | 32 |
| `store_asset_derivations` | `service_key` | `organization_id` | asset-copy-core | 동일 | 28 |
| `media_assets` | `service_key` | 없음 | media API | 동일 | 35 |
| `kpa_store_contents` | 없음 | `organization_id` | store-owner API (4서비스 공유) | 동일 | 15 |

### 5-2. `cms_contents` serviceKey 분포 (프로덕션)

glycopharm 66 / kpa-society 53 / neture 6 / kpa 1 / **pharmacy-hub 0**.
`type='resource'` row 는 **전 서비스 통틀어 0** 이다.

### 5-3. 이름 유사 테이블 — 병합하지 않음 (§5 금지 조항)

- **`pharmacy_contents`** — `routes/signage/extensions/pharmacy/entities/PharmacyContent.entity.ts`.
  **사이니지 약국 extension** 이며 PharmacyHub 와 무관하다. 이름 유사성만으로 취급하지 않았다.
- **`kpa_store_contents`** — 물리명은 KPA prefix 지만 4서비스 공용 legacy 물리 테이블이다
  (`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`). rename 을 제안하지 않는다.

---

## §6·§7. Community canonical 계약 및 서비스 경계

### 6-1. 계약 체인

```
서비스 route (/api/v1/pharmacy-hub/forum/*)
  -> createServiceForumRouter({ context: { serviceCode: 'pharmacy-hub', scope: 'community' },
                                writeGuards: [requireActiveServiceMembership('pharmacy-hub')] })
  -> forumContextMiddleware -> ForumContext.serviceCode (RBAC prefix)
  -> ForumControllerBase.getCanonicalServiceKey() -> resolveCanonicalServiceKey()
  -> applyServiceScope():
       EXISTS (SELECT 1 FROM forum_category_requests _svc
                WHERE _svc.id = alias.forum_id AND _svc.service_code = :ctxServiceKey)
```

- `ForumCategory` 에는 **serviceKey 컬럼이 없다.** 포럼의 서비스 경계 SSOT 는
  `forum_category_requests.service_code` 하나다 (`CLAUDE.md §7`: Community 의 Primary Boundary 는
  `organizationId`, 서비스 축은 이 원장이 담당).
- `scope: 'community'` 는 `organization_id IS NULL` 게시물만 대상으로 한다. 조직 전용 글이 커뮤니티로 새지 않는다.

### 6-2. "forum empty 회귀" 유형 점검

`applyServiceScope` 는 `serviceCode` 가 없을 때만 무필터로 떨어진다. 이번 WO 는 forum 계약과
`forumContext` 를 **한 줄도 건드리지 않았다** — 기존 서비스 forum 이 비는 회귀 경로가 구조적으로 없다.

### 6-3. PH 와 KPA 경계 프로덕션 실측

| service_code | forum_category_requests | forum_post |
|--------------|:---:|:---:|
| kpa-society | completed 2 | publish 4 / archived 2 |
| neture | completed 1 · rejected 1 | archived 1 |
| **pharmacy-hub** | **rejected 1 · completed 0** | **0** |

PH 는 **활성(completed) 포럼이 0** 이다. 구조·권한은 살아 있으나 데이터가 없다 (§17 BLOCKED_DATA).
KPA 글 4건은 `service_code='kpa-society'` 조건에서만 조회되며 PH 컨텍스트로는 도달하지 않는다.

---

## §8. Content / Resource 모델 판정

### 판정: **B. SHARED_CORE_WITH_SERVICE_SCOPE**

원장은 공통 `cms_contents`, 서비스 격리는 `serviceKey` 컬럼이 담당한다.

- **A(FULLY_SHARED) 아님** — `serviceKey` 로 명시 분리된다. 무경계 공유가 아니다.
- **C / D 를 택하지 않은 이유** — `{service}_contents` 계열(Model A)을 따르면 `pharmacy_hub_contents`
  신규 테이블 + migration 이 필수가 되어 **§22 중지 조건**("PH 도입에 schema 변경이 필수")에 걸린다.
  그런데 §8 은 "기존 모델로 표현할 수 없다는 것이 증명될 때만" 신규 테이블을 검토하라고 한다.
  기존 모델로 표현 가능함이 증명됐으므로 신규 테이블 검토 자체가 성립하지 않는다.
- **E(NOT_REQUIRED) 아님** — PH Service Model Baseline 이 회원의 콘텐츠 이용을 명시한다 (§2-D).

### 증명 — 신규 backend / table / migration 이 모두 0 인 근거

| 축 | 사실 |
|----|------|
| 읽기 | `GET /api/v1/cms/contents` 가 `where.serviceKey = serviceKey` 로 필터한다. 비인증은 `status='published'` 강제. **service-neutral** |
| 쓰기 | `authorizeCmsMutation()` 이 `{serviceKey}:admin` / `{serviceKey}:operator` 를 **파생 생성**한다. 서비스명 하드코딩 allowlist 가 없다 → `pharmacy-hub:operator` 가 권한 모델 변경 없이 이미 인가된다 |
| 대조군 | 선행 LMS WO 를 막았던 `requireLmsOperator` 는 서비스명 하드코딩 allowlist 였다. CMS 는 그 실패 유형이 아니다 |
| 프로덕션 확인 | `GET /cms/contents?serviceKey=pharmacy-hub&type=resource` 가 200 + `pagination.total = 0` 을 반환한다 — 서비스 스코프 동작 확인 |

---

## §9·§10. Resource Table 채택 / Content 와 Resource 의 관계

### 9-1. 공통 View 채택 방식

| 축 | 결과 |
|----|------|
| View | `@o4o/shared-space-ui` `ResourcesHubTemplate` **그대로** — PH 전용 ResourceTable 복제 0 |
| 주입 | `ResourcesHubConfig` (serviceKey · tableId · hero 문구 · pageLimit · fetchItems · fetchDetail · empty 문구) |
| adapter | `services/web-pharmacy-hub/src/lib/api/pharmacyHubResources.ts` — 공통 CMS API 소비 |
| shared View 내부 분기 | **0** — `ResourcesHubTemplate` 안에 `pharmacy-hub` 문자열이 없다 (spec 고정) |
| 복붙 | 0 — KPA·KCos·GP 페이지를 복사하지 않았다 |

최소 기능 충족: 목록 · 제목 · 유형(source_type 파생) · 등록일 · 제공 주체 · 보기/다운로드 ·
검색 · empty / loading / error.

`cms_contents` 에 없는 값(조회수)은 **지어내지 않고** `view_count: 0` 으로 고정했다.

### 9-2. Content 와 Resource 의 관계 — 확정

| 축 | 판정 |
|----|------|
| 물리 원장 | **동일** (`cms_contents` 또는 `{service}_contents` 하나) |
| 구분자 | `cms_contents.type` / `{service}_contents.sub_type` |
| 도메인 의미 | **서로 다르다** — `ResourcesHubTemplate` 헤더가 SSOT: `/resources` 는 파일·문서·다운로드 자료, `/content` 는 HTML 콘텐츠. **읽는 것(콘텐츠) vs 받는 것(자료)** 이 기준 |
| 실측 (`kpa_contents`) | content/published 2 · content/draft 2 · resource/published 3 · resource/draft 1 · 미분류 8 |
| 결론 | **중복 모델을 만들지 않는다.** 하나의 원장 + 구분자로 두 화면을 서비스한다 |

**PH 적용 결과**

- **Resource** → 채택 (`/resources`, `type='resource'`).
- **Content(공지·소식)** → **EXCLUDED**. PH 공지의 canonical 은 이미 **forum pinned post** 다
  (`CommunityHomePage.loadNotices()` = `fetchPharmacyHubForumPosts()` 의 `isPinned` 필터).
  `cms_contents` 에 notice 를 추가하면 **공지 소스가 둘**이 되어 §10 이 금지하는 중복 모델이 된다.

---

## §11. Community 와 Content/Resource 연결

**연결 기능을 신설하지 않았다.** 두 도메인 간 relation(FK·조인)이 현재 구조에 없고,
§11 이 "새 추천/연결 기능 개발이 아니다 — 단순 링크로 충분한 경우만 채택" 으로 한정한다.
채택한 연결은 **커뮤니티 홈 진입 카드 + footer 링크** 뿐이다.

`/pharmacy-hub/home/latest` 최신 활동 탭에 자료 탭을 **추가하지 않았다** — 해당 handler 는
`forum` · `course` 두 타입만 공급하므로 탭만 추가하면 backend 변경 없이는 **항상 빈 탭**이 된다
(§14 신규 backend 0 / §4 placeholder 금지).

---

## §12. Route / Navigation adoption

| 항목 | 결과 |
|------|------|
| 신규 route | `/resources` — `App.tsx` 등재, **`MembershipGate` 뒤** (권한 모델 신설 0) |
| navigation 정의 | `PH_PUBLIC_NAV` 커뮤니티 children + `PH_FOOTER_SECTIONS` 서비스 섹션 + 커뮤니티 홈 진입 카드 |
| `/content` | route · 링크 모두 **만들지 않음** (§10 중복 모델 금지) |
| 기존 dead link | **0건** |

### 1차 smoke 에서 발견한 진입점 결함과 처리 (commit `5bc8f0ba2`)

프로덕션 1차 smoke 에서 `/resources` 앵커가 DOM 에 나타나지 않았다.
원인은 **공통 `packages/ui` GlobalHeader 가 nav item 의 `children` 을 렌더하지 않는다**는
플랫폼 공통 제약이다 (desktop `publicNav.map` · mobile `allNav.map` 어느 쪽도 `children` 을 쓰지 않는다).
기존 PH 하위 항목(내 포럼 / 포럼 개설 신청 / 검색 / 내 글 / 내 수강 / 내 수료증)도 같은 이유로
헤더에 보이지 않는다 — **이번 WO 가 만든 문제가 아니라 기존 공통 제약**이다.

공통 헤더 수정은 5서비스 영향 + 다른 세션 WIP 파일이라 §21·§22 상 범위 밖이므로,
PH 안에서 **실제로 렌더되는 진입점 두 곳**을 보강했다.

- `CommunityHomePage` `appEntryCards` 에 자료실 카드 추가
- `PH_FOOTER_SECTIONS` 서비스 섹션에 자료실 링크 추가
- spec 에 두 진입점을 계약으로 고정

---

## §13. 역할 / 권한 매트릭스

| 기능 | 비로그인 | member (active) | store_owner | operator / admin |
|------|:---:|:---:|:---:|:---:|
| `/resources` 목록·상세 | X (MembershipGate) | O 읽기 | O 읽기 | O 읽기 |
| 자료 등록·수정·상태변경 | X | X | X | O 공통 `/api/v1/cms/contents` |
| Community 포럼 읽기 | 공개 포럼 한정 | O | O | O |
| Community 글쓰기 | X | O (`requireActiveServiceMembership`) | O | O |

**learner / store-owner 화면에 operator 기능을 섞지 않았다** — `PharmacyHubResourcesPage` 는
`createAction` · `getEditHref` · `onDelete` · `onBulkDelete` 를 **일절 전달하지 않는다** (spec 고정).

---

## §14. Backend 재사용 — tier 판정

| tier | 검토 | 채택 |
|:----:|------|:---:|
| 1. 기존 API 재사용 | `GET /api/v1/cms/contents?serviceKey=pharmacy-hub` 가 이미 service-neutral | **채택** |
| 2. adapter | frontend `pharmacyHubResources.ts` | 채택 |
| 3. 얇은 service-specific route | tier 1 로 충족되어 불필요 | X |
| 4. 새 API | - | X |

**신규 backend endpoint 0 · 신규 table 0 · migration 0 · 권한 모델 변경 0.**

---

## §15. Capability 채택 분류 (미조사 0)

| # | capability | 분류 | 근거 |
|:-:|-----------|------|------|
| 1 | Community 목록 | ADOPTED_EXISTING | 공통 service forum router |
| 2 | Community 게시글 상세 | ADOPTED_EXISTING | 동일 |
| 3 | 글 작성·수정·삭제 | ADOPTED_EXISTING | write guard = `requireActiveServiceMembership` |
| 4 | 댓글 | ADOPTED_EXISTING | 공통 `ForumCommentController` |
| 5 | 좋아요 / 북마크 | ADOPTED_EXISTING | 공통 router |
| 6 | 내 글 (cross-service) | ADOPTED_EXISTING | 선행 WO |
| 7 | 포럼 개설 신청·심사 | ADOPTED_EXISTING | 공통 API + `serviceCode` |
| 8 | 비공개 포럼 가입 | ADOPTED_EXISTING | 공통 `ClosedForumJoinPanel` |
| 9 | 포럼 소유자 대시보드·회원관리 | ADOPTED_EXISTING | 공통 `ForumOwnerDashboard` |
| 10 | 커뮤니티 검색 | ADOPTED_EXISTING | 공통 `CommunityContentSearchBar` |
| 11 | 커뮤니티 홈 (공지·최신활동) | ADOPTED_EXISTING | 공통 `StandardHomeTemplate` |
| 12 | **Resource 목록** | **ADOPTED_NEW** | 공통 `ResourcesHubTemplate` + `cms_contents` adapter |
| 13 | **Resource 상세(drawer)** | **ADOPTED_NEW** | `fetchDetail` |
| 14 | **Resource 보기·다운로드·링크** | **ADOPTED_NEW** | `source_type` 파생 (file / external / view) |
| 15 | **Resource 검색** | **ADOPTED_NEW** | 공통 API `search` 파라미터 |
| 16 | **Resource empty / loading / error** | **ADOPTED_NEW** | config 문구 + load-error 계약 throw |
| 17 | Resource 첨부 | ADOPTED_EXISTING | `cms_contents.attachments` JSON |
| 18 | Resource 등록·수정 (운영자) | ADOPTED_EXISTING(backend) / **EXCLUDED(PH UI)** | 공통 쓰기 API 가 이미 `pharmacy-hub:operator` 인가. PH 운영자 UI 신설은 §13·§21 상 범위 밖 |
| 19 | Resource 카테고리 / 태그 | **GAP** | `cms_contents` 에 category 컬럼 없음. 4서비스 동일 — PH 고유 결손 아님 |
| 20 | Resource 조회수 / 좋아요 | **EXCLUDED** | 컬럼 없음. 값을 지어내지 않고 `view_count: 0` 고정 |
| 21 | Resource → 매장 자료함 복사 | **EXCLUDED** | `onCopyToStore` 는 store_owner 전용 액션. 회원 자료실 축과 분리 |
| 22 | Content(공지·소식) | **EXCLUDED** | §10 — PH 공지 canonical 은 forum pinned post |
| 23 | Community Hub 광고·스폰서·퀵링크 | **EXCLUDED** | §4-3 — PH operator 에 광고 축 없음. prod row 0 |
| 24 | 최신 활동 자료 탭 | **EXCLUDED** | §11 — backend 미공급. 빈 탭 금지 |
| 25 | 매장 콘텐츠·자료함 (store 축) | ADOPTED_EXISTING | 선행 WO 에서 공통 원장 채택 완료 |
| 26 | `/store/asset-derivations` 연동 | **GAP (기존)** | `requirePharmacyOwner` 가 KPA/GP/KCos 전용. 선행 WO 부채 |

---

## §16. NOT_IMPLEMENTED 처리 요약

- **GAP 2건**: #19 Resource 카테고리(4서비스 공통 결손), #26 asset-derivations guard(기존 부채).
- **EXCLUDED 6건**: #18(UI) · #20 · #21 · #22 · #23 · #24 — 전부 정책 또는 원장 구조 근거를 명시했다.
- **PARTIAL_ADOPTION 0 / MISSING_ADOPTION 0.**

---

## §17. Production 데이터 census (read-only)

| 대상 | 값 |
|------|----|
| `cms_contents` 총 rows | 126 |
| `cms_contents` serviceKey='pharmacy-hub' | **0** |
| `cms_contents` type='resource' (전 서비스) | **0** |
| PH forum (completed) | **0** (rejected 1) |
| PH forum_post | **0** |
| `pharmacy_hub_contents` 테이블 | **존재하지 않음** |

### fixture 판정 — **생성하지 않음** (BLOCKED_DATA)

§17 은 "안전하게 생성·정리 가능한 경우만" fixture 를 허용한다.
공통 CMS API 에는 `POST` · `PUT` · `PATCH /status` 만 있고 **`DELETE` 가 없다.**
생성한 fixture 를 원상 복구하려면 프로덕션 raw SQL `DELETE` 가 필요하며 이는
`CLAUDE.md §0`(데이터 변경은 사용자 승인 필요)에 해당한다.
→ **fixture 미생성. empty state 로 구조·권한을 검증**했다.

---

## §18·§19. 자동 테스트 / cross-service 회귀

| 항목 | 결과 |
|------|------|
| 신규 spec `pharmacy-hub-content-resource-adoption.spec.ts` | **18 tests PASS** (§7 · §8 · §9 · §12 · §13) |
| 관련 회귀 14 suite | **291 tests PASS** |
| `services/web-pharmacy-hub` `tsc --noEmit` | **PASS** |
| `services/web-pharmacy-hub` `vite build` | **PASS** |
| KPA / KCos / GP / Neture forum empty 회귀 | **0** — forum 계약 · `forumContext` 미변경 |
| 기존 resource · library route 404 | **0** — 공통 패키지 미변경 |
| service filtering 회귀 | **0** — `ResourcesHubTemplate` 내부에 `pharmacy-hub` 문자열 0 (spec 고정) |

### 갱신한 기존 spec 1건

`community-content-resource-frontend-view-commonization.spec.ts` 는
"PH 에 `/resources` route 가 존재하지 않는다" 를 고정하고 있었다. 이는 **본 WO 가 닫는 유예 상태의 스냅샷**이므로
`/content` 미구현(중복 모델 금지)은 유지하고 `/resources` 는 **공통 Template + serviceKey 채택**을 고정하도록 갱신했다.

---

## §20. Production browser smoke

대상 `https://pharmacyhub.co.kr` · 계정 `pharmacy-hub:store_owner` · Desktop 1440x900 + Mobile 390x844.
2차 실행(`5bc8f0ba2` 배포 후) 결과.

| 항목 | Desktop | Mobile |
|------|:---:|:---:|
| 로그인 | PASS | PASS |
| `/community` HTTP | 200 | 200 |
| `/forum` HTTP | 200 | 200 |
| `/resources` HTTP | 200 | 200 |
| white screen | 0 | 0 |
| JS exception | 0 | 0 |
| 4xx/5xx 응답 | 0 | 0 |
| 가로 overflow | 0 | 0 |
| `/resources` empty state 문구 | 표시됨 | 표시됨 |
| 검색(무결과) 동작 | PASS | PASS |
| navigation `/resources` 진입점 | **present** | **present** |
| `/resources` 내 타 서비스 문자열 | 0 | 0 |

### 판정 보류 없이 정리한 검출 1건 — `/community` 의 타 서비스 문자열

smoke 검출기가 `/community` 에서 `약사회` · `KPA` · `GlycoPharm` 을 잡았다. DOM leaf 단위로 추적한 결과
출처는 공통 `packages/shared-space-ui/src/O4OHelpSection.tsx` 의
`ALL_SERVICE_ITEMS` — **"다른 서비스 보기" 서비스 카탈로그(외부 도메인 링크)** 였다.

- 노출된 것은 **서비스 소개 문구와 외부 홈페이지 링크**이며, KPA/GP 의 포럼 글·카테고리·자료 등
  **서비스 경계 데이터는 단 한 건도 렌더되지 않았다.**
- 이 블록은 5서비스 공통으로 의도적으로 제공되는 cross-service 카탈로그다.
- 따라서 **§7 cross-service 데이터 노출 0 은 충족**이며, 검출기의 문자열 매칭 오탐으로 정리한다.

---

## §21. 변경 금지 준수

Community architecture 재설계 0 / LMS operator · instructor GAP 미접촉 / messaging · chat 0 /
recommendation 0 / DB 통합 0 / Store Hub · Operator 개편 0 / role hierarchy 변경 0.

---

## §22. 중지 조건 해당 여부

| 조건 | 해당 | 처리 |
|------|:---:|------|
| Community service scope SSOT 불명확 | 아니오 | `forum_category_requests.service_code` 로 단일 확정 (§6) |
| 기존 forum data model 충돌 | 아니오 | 없음 |
| **PH 도입에 schema 변경 필수** | 아니오 | `cms_contents.serviceKey` 로 해소 — migration 0 (§8) |
| cross-service 데이터 노출 위험 | **1건 발견** | `GET /cms/contents/:id` 가 serviceKey 무관 UUID 단독 조회. PH 측 클라이언트 방어(`PH_RESOURCE_SERVICE_MISMATCH`)를 적용하고 공통 route 수정은 별도 WO 로 분리 |
| operator 권한 정책 결정 필요 | 아니오 | 기존 파생 인가로 충족 |
| 다른 세션 WIP 충돌 | 아니오 | 무접촉 (§3) |

---

## §23. 완료 기준 대조

| 기준 | 결과 |
|------|:---:|
| census 미조사 0 | PASS |
| PH Community canonical 계약 확정 | PASS (§6) |
| PH Content / Resource 모델 확정 | PASS — **B. SHARED_CORE_WITH_SERVICE_SCOPE** |
| PARTIAL_ADOPTION 0 | PASS |
| MISSING_ADOPTION 0 | PASS |
| 필요 capability 전부 판정 (26건) | PASS |
| cross-service 노출 0 | PASS (§20 검출 1건은 의도된 서비스 카탈로그) |
| 기존 서비스 회귀 0 | PASS |
| 신규 backend API 0 | PASS |
| migration 0 | PASS |
| typecheck / tests / build PASS | PASS |
| production desktop · mobile smoke PASS | PASS |

---

## 잔존 기술부채 / 후속 WO 제안

| # | 항목 | 근거 | 제안 |
|:-:|------|------|------|
| 1 | `GET /api/v1/cms/contents/:id` 가 serviceKey 필터 없이 UUID 단독 조회 | `CLAUDE.md §7` Guard Rule #1 위반. 프로덕션에서 비인증으로 타 서비스 콘텐츠가 조회됨을 확인 | 별도 WO — 공통 CMS route 에 serviceKey 복합 조건 도입 (5서비스 소비처 영향 조사 선행) |
| 2 | 공통 `GlobalHeader` 가 nav item 의 `children` 을 렌더하지 않음 | `packages/ui/src/layout/GlobalHeader.tsx` 의 desktop · mobile 양쪽 map 이 `children` 미사용. 5서비스가 정의만 하고 노출되지 않는 하위 메뉴 다수 | 별도 WO — 공통 헤더 dropdown 렌더 도입 (전 서비스 IA 영향) |
| 3 | PH 회원 자료실 데이터 0 | 운영자 등록 UI 부재 (backend 는 이미 인가됨) | 별도 WO — PH operator 자료 등록 화면 (§15 #18) |
| 4 | Resource 카테고리 · 태그 부재 | `cms_contents` 컬럼 없음 (5서비스 공통) | 별도 WO — 공통 CMS 분류 축 |
| 5 | `/store/asset-derivations` 가 PH 미지원 | `requirePharmacyOwner` 가 KPA/GP/KCos 전용 | 선행 WO 부채 유지 |
| 6 | PH 활성 포럼 0 | 운영 데이터 문제 (rejected 1건만 존재) | 운영 과제 |

---

## 변경 파일

| 파일 | 구분 |
|------|:---:|
| `services/web-pharmacy-hub/src/lib/api/pharmacyHubResources.ts` | 신규 |
| `services/web-pharmacy-hub/src/pages/resources/PharmacyHubResourcesPage.tsx` | 신규 |
| `apps/api-server/src/__tests__/pharmacy-hub-content-resource-adoption.spec.ts` | 신규 |
| `services/web-pharmacy-hub/src/App.tsx` | 수정 (route 1) |
| `services/web-pharmacy-hub/src/config/navigation.ts` | 수정 (nav · footer) |
| `services/web-pharmacy-hub/src/pages/community/CommunityHomePage.tsx` | 수정 (진입 카드 · 주석) |
| `apps/api-server/src/__tests__/community-content-resource-frontend-view-commonization.spec.ts` | 수정 (유예 스냅샷 갱신) |

**backend 소스 · entity · migration · 공통 패키지 변경 0.**

---

## 문서 정합

`문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 6건`

- 발견 1 — 메모리 `wo-pharmacyhub-community-capability-adoption.md` 의 "PH Content/Resources 는
  `pharmacy_hub_*` 테이블 부재로 중지" 기록이 **매장 축에 한해 STALE** (§4-2).
- 발견 2 — 메모리 `ref_prod_db_readonly_access.md` 의 프로덕션 DB 사용자명이 `o4o_api` 로 기록돼 있으나
  실제는 `o4o_api_v2`.
- 기준 문서(`docs/baseline/**` · `docs/architecture/**`) 에서 Drift 발견 없음.
