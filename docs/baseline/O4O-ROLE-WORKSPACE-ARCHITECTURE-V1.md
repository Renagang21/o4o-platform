# O4O-ROLE-WORKSPACE-ARCHITECTURE-V1

> **상태**: ACTIVE
> **작성일**: 2026-09-15 · **최종 갱신**: 2026-09-16 (§2-1 제공 경로 구현 계약 상세화 · §4 Service Identity ≠ Service Workspace · §7 물리 정리 완료 · §9-1 4단계 Supplier Workspace 반영 · §3-1 Store Workspace 구현 상태 · §6 출처 4종↔3+1 경로 대응 · §9-1 5단계 반영 · §4-2 Service Operator Workspace 구현 상태 · §9-1 6단계 반영 · §5 Community Workspace(Community Identity ≠ Service Identity · Industry Community 폐기) · §9-1 7단계 반영)
> **근거 WO/IR**: `WO-O4O-ROLE-WORKSPACE-REFACTOR-BASELINE-AND-PREFLIGHT-V1` · [`IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1`](../ir/IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1.md)
> **위치**: 사업·정책 정본(우선순위 2). [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) 과 동급이며, **역할 경계 · 업무공간 구조 · 콘텐츠 유입 경로 · Legacy Partner** 에 관해 두 문서가 충돌하면 **이 문서가 우선**한다 (§8).

---

## 0. 이 문서가 정하는 것 · 정하지 않는 것

**정한다** — O4O 전체를 "서비스별 애플리케이션 구조" 에서 **"사용자 역할별 업무공간 구조"** 로 리팩터링하기 위한 최상위 기준. 업무공간의 구성, 역할 간 콘텐츠 제공 경로, Store ↔ Service 관계의 기대 모델, Legacy Partner 의 처분, 리팩터링 전 단계에 적용할 실행 규칙.

**정하지 않는다** — 화면 설계, 메뉴 순서, API 계약, 테이블 설계, 각 도메인의 세부 규칙. 이것들은 각 단계 WO 와 해당 도메인 정본이 정한다. 이 문서는 **runtime 구현 지시가 아니다.**

**용어** — 이 문서의 *Service* 는 `platform_services` 카탈로그에 등재된 O4O 서비스(kpa-society · k-cosmetics · pharmacy-hub · neture · kpa-branch · cafe24-b2b …)를 뜻한다. *Store* 는 `organizations` 로 표현되는 매장 조직이다.

---

## 1. 사용자 업무공간 (최상위)

```text
O4O / Neture
│
├─ Community          일반 사용자(업계 구성원) 공간
├─ Store              매장 경영자 공간
├─ Supplier           공급자 공간
└─ Service Operator   서비스 운영자 공간
```

- **Platform Admin** 은 사용자 업무공간이 아니라 **내부 관리 영역**으로 별도 유지한다. 이 문서의 4 업무공간에 포함하지 않는다.
- 한 사용자는 복수 업무공간에 동시에 속할 수 있다 (예: 매장 경영자이면서 Community 구성원). 업무공간은 **역할**로 구분되며 **서비스**로 구분되지 않는다.
- 기존 정본이 말하는 "3자(공급자 / 운영사업자 / 매장 경영자)" 는 이 4 업무공간 가운데 Supplier / Service Operator / Store 에 해당한다. Community 는 3자 구조에 없던 축이며 이 문서로 신설한다.

---

## 2. Supplier

```text
Supplier
├─ Products
├─ Orders
└─ Content
```

### 2-1. 공급자 콘텐츠의 공식 온라인 제공 경로

```text
Supplier → Store Hub          (매장 HUB 로 제공)
Supplier → Service Operator   (서비스 운영자에게 제공)
```

### 2-2. 제외 경로

```text
Supplier → 특정 Store 직접 온라인 전달   ✕
Supplier → Community 직접 게시           ✕
```

- 특정 매장에 직접 자료를 줄 필요가 있으면 **O4O 밖에서** 전달하고, Store 가 필요 시 **직접 등록**한다 (§5 Store Direct Authoring).
- 이 절은 `O4O-BUSINESS-PHILOSOPHY-V1` §3 의 "공급자는 O4O 내부에서 콘텐츠를 직접 제작·등록하는 주체가 아니다" 와 `O4O-3-ROLE-FLOW-BASELINE-V1` §6 의 "공급자가 O4O 시스템에서 직접 HUB 콘텐츠를 제작·게시 금지" 를 **대체**한다. 공급자는 Content 를 가지며, Store Hub 와 Service Operator 에 온라인으로 제공한다.
- Store Hub 에 도달한 공급자 콘텐츠에 운영자 검수·승인이 개입하는지는 **이 문서가 정하지 않는다.** 현행 서비스별 정책(예: [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 원칙 4 = 운영자 승인 없이 유입)이 각자 유지되며, 통일은 Supplier / Store Hub 리팩터링 단계 WO 가 정한다.
- **구현 계약 상세화 (2026-09-16, `WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1`)** — 공급자 콘텐츠의 canonical 원장은 `neture_supplier_library_items` 하나다(새 원장 없음).
  · `Supplier → Store Hub` = Hub source adapter `sourceDomain=supplier-library` (`is_public=true` 행을 `storeWorkspaceEnabled` 서비스의 Store Hub 에 노출 · 사본 없음 · 특정 매장 대상 없음 · Hub UI 편입은 Store Workspace 단계).
  · `Supplier → Service Operator` = `POST /neture/library/:id/handoff {serviceKey}` — 대상은 canonical catalog(`operatorWorkspaceEnabled=true` + `workspaceMode=standard`)에서만 파생, 수신은 기존 `cms_contents(authorRole=supplier, status=pending)` 계약 재사용. 제공 후 검토·수정·발행은 운영자 업무이며 **공급자 책임은 제공에서 끝난다** (상태 기계 · 전송 엔진 · lineage 없음).

---

## 3. Store

```text
Store Workspace
├─ Home
├─ My Store
├─ Store Hub
└─ My Services
```

- **한 Store 는 여러 Service 에 가입할 수 있어야 한다** (1 Store : N Services). 데이터 모델 판정은 IR §A — `organizations` 는 서비스 중립이며 `organization_service_enrollments`(UNIQUE(organization_id, service_code)) 가 이미 1:N 을 표현한다. 신규 Store-Service 테이블을 만들지 않는다.
- **My Store 와 Store Hub 의 기존 공통 Core 는 재작성하지 않고 최대한 유지**한다 (`store-core` · `store-ui-core` · `hub-core` · `asset-copy-core` · [`STORE-LAYER-ARCHITECTURE`](../architecture/STORE-LAYER-ARCHITECTURE.md) F3).
- My Store 는 **Store 소유** 공간이다. Store 자산의 경계는 `organizationId` 이며 서비스로 나뉘지 않는다. 서비스별로 달라지는 것은 My Services (§4) 안에서만 표현한다.

### 3-1. 구현 상태 (WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 · 2026-09-16)

- **상위 구조 구현 = 1 (`@o4o/store-ui-core` `workspace/`)** — `resolveStoreWorkspacePaths(config)` 가 서비스 `basePath` 에서 `Home = <base>/workspace` · `My Store = <base>` · `Store Hub = /store-hub`(공통) · `My Services = <base>/services` 를 파생한다 (KPA · KCos `/store`, Pharmacy Hub `/store-owner` — PG callback 경로 불변). 서비스는 `StoreWorkspaceNav` 를 `MyStoreShell.banner` 슬롯과 Store Hub 레이아웃 위에 조립만 하고, Home / My Services 는 `StoreWorkspaceShell` + `StoreWorkspaceHomeView` / `MyServicesView` 조립만 한다. `MyStoreShell` · `StoreHubShell` · `store-core` · `hub-core` · `asset-copy-core` 는 재작성하지 않았다.
- **My Store canonical = KPA 기반 공통 `MyStoreShell` 1개.** 세 서비스 모두 공통 `StoreOwnerGuard(serviceKey)` + 서비스 `MembershipGate` 로 진입하며 매장 자산 경계는 `organizationId` 다. 서비스별 메뉴 집합 차이는 `StoreDashboardConfig` 의 실제 capability 차이(REAL_STORE_CAPABILITY_DIFFERENCE) 또는 구현 시점 차이이지, My Store 구현이 복수라는 뜻이 아니다.
- **My Services 출처 = `GET /api/v1/work-scope/store-services` 하나.** 표시 조건 `enrollmentStatus=active AND workspaceAvailable=true`(= §4-1). 다른 서비스 진입은 기존 `POST /auth/handoff` → 대상 서비스 My Store. 새 membership 테이블 0 · 권한 판정 0.
- **대표 홈(Neture) "내 매장" 진입 = 각 서비스 Store Workspace Home.** 대상 서비스 목록은 하드코딩이 아니라 catalog `storeWorkspaceEnabled` ∩ store_owner role registry 파생(`listStoreCapableServices`) — 권한 SSOT 는 그대로다.
- KPA 모바일 전용 `/mobile/pharmacy`(`MobilePharmacyPage`) 는 RETIRE — `/store/workspace` 로 COMPAT_REDIRECT. 모바일도 같은 상위 구조를 쓴다(별도 모바일 정보구조 없음).

---

## 4. My Services / Service Workspace

```text
My Services
├─ All
├─ Service A
├─ Service B
└─ Service C
```

Service 내부 (표준 Service Operator 최상위 IA — 2026-09-16 확정):

```text
Home
├─ Service Operation   (서비스 운영)   회원 · 가맹점(매장 = 회원 관리) · 공지 · 서비스 콘텐츠 · 포럼 · 자료 ·
│                                      교육/LMS · 설문 · 안내 · 문의/협업 · 매장 지원 콘텐츠 · 사이니지/태블릿 자료 ·
│                                      공급자가 제공한 콘텐츠 수신
├─ Business Operation  (사업 운영)     상품 · 상품 신청/취급 승인 · 공동구매 · 특가 · Event Offer · 프로모션 ·
│                                      캠페인 · 판매자 모집 노출 승인 · 주문 · 사업 프로그램 승인
└─ Operations Management (운영 관리)   분석 · 서비스/시스템 설정 · 감사 로그 · 운영 정책 (Platform Admin 업무 아님)
```

- **Content 와 사업 프로그램(Business Operation)은 별도 도메인**으로 유지하며, 필요할 때 관계만 연결한다. 한쪽을 다른 쪽의 하위로 만들지 않는다.
- Service Operator 는 자기 Service 의 Service Operation · Business Operation · Operations Management 를 운영한다. 한 운영자가 여러 Service 를 운영할 수 있다 (1 Operator : N Services — IR §A).
- 종전 표준 서비스 운영자 최상위 IA "커뮤니티 운영 / 매장 HUB 운영 / 운영 공통" 은 **RETIRED** (2026-09-16). "매장 HUB 운영 = Service Operator 사업 전체" 라는 의미도 함께 은퇴한다 — 매장 지원 콘텐츠(HUB 블로그 · POP · QR · 사이니지 · 태블릿)는 서비스 운영이고, 상품 · 주문 · 승인형 사업 프로그램은 사업 운영이다.
- **분류 단위는 메뉴 항목(route/page)이다.** 그룹 키(approvals 등)로 일괄 이동하지 않는다 — 예: `approvals` 안의 공급자 콘텐츠 승인은 서비스 운영, 상품 신청 · 이벤트 오퍼 · 판매자 모집 노출 승인은 사업 운영.

### 4-1. Service Identity ≠ Service Workspace

`WO-O4O-SERVICE-TENANT-FOUNDATION-V1`(2026-09-16) 이 고정한 용어.

- **Service Identity** — "어떤 서비스가 존재하는가". 정본은 `platform_services` 의 canonical `code` 와 `apps/api-server/src/config/service-catalog.ts` `O4O_SERVICES` (같은 집합). role prefix 별칭 행(`kpa` → `kpa-society`, `cosmetics` → `k-cosmetics`)은 **독립 서비스가 아니라** canonical 의 alias 이며, 정규화는 `@o4o/security-core` 의 기존 매핑 하나만 쓴다. 제품 도메인 키(`kpa-groupbuy` · `*-event-offer`)는 서비스 identity 가 아니다.
- **Service Workspace** — "그 서비스가 My Services 항목(매장 화면) · 운영자 화면으로 노출되는가". Identity 와 **별도 metadata** 로 catalog 에 붙인다: `workspace.workspaceMode`(`standard | special | none | undecided`) · `storeWorkspaceEnabled` · `operatorWorkspaceEnabled`. `PlatformService.service_type`(`community | tool | extension`)은 **다른 축**이며 Workspace 판정에 쓰지 않는다.
- **모든 platform service 가 My Services 항목이 되는 것은 아니다.** 노출 조건은 `Store 의 enrollment 가 active` **AND** `해당 서비스의 storeWorkspaceEnabled` 이다. 근거 없는 서비스는 `undecided` 로 두고 노출하지 않는다 — 코드가 사업 결정을 대신 내리지 않는다.
- 세 관계는 물리적으로 분리 유지한다 (합치지 않는다): Store ↔ Service = `organization_service_enrollments` · Operator ↔ Service = `role_assignments` + `service_memberships`(membership guard 와 동일 정책) · 사용자 ↔ 조직 = `organization_members`. 읽기 계약은 `/api/v1/work-scope/store-services` · `/operator-services` (`utils/service-tenant.resolver.ts`) 하나로 두며 UI 노출 ≠ 권한이다 — Workspace metadata 는 권한 SSOT 가 아니다.
- **Community Identity 도 Service Identity 와 별도 축이다** (§5). Industry(업종) 모델은 만들지 않는다 — Community + participation policy 로 충분하다.

### 4-2. Service Operator Workspace 구현 상태 (WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 · 2026-09-16)

- **공통 셸 재작성 0.** `OperatorAreaShell` · `DomainIASidebar` · `OperatorDashboardLayout` · `DataTable` 은 보존. 바뀐 것은 IA 메타데이터(`@o4o/operator-ux-core` `DEFAULT_OPERATOR_DOMAIN_IA` = `service_operation / business_operation / operations_management`), 서비스 `operatorMenuGroups.ts` 의 항목 단위 `domain` override(`OperatorMenuItem.domain`, additive · 표시 전용), 대시보드 축 재편(3도메인), 최소 공통 컴포넌트 2개다. 셸 안에 서비스별 if 분기는 없다.
- **표준 Service Operator = KPA Society · K-Cosmetics · Pharmacy-Hub** (STANDARD_CANDIDATE, 서비스 전용 도메인 IA config 없음 — PH 의 전용 config 는 은퇴). **Neture = SPECIAL** (자체 `NETURE_OPERATOR_DOMAIN_IA` 유지). kpa-branch = NO_STORE_WORKSPACE/특수(분회 slug 아래 운영 화면) · cafe24-b2b = UNDECIDED.
- **운영 가능 서비스 목록 출처 = `GET /api/v1/work-scope/operator-services` 하나.** 다중 서비스 운영자는 공통 `OperatorServiceSwitcher`(운영 화면 header 슬롯, 2개 이상일 때만 표시) 와 대표 홈 "서비스 운영자 화면"(1개 = 바로 진입 · 여러 개 = 선택)으로 전환하며, 이동은 기존 `POST /auth/handoff` → 대상 `/operator`. 프런트는 role 문자열을 파싱해 서비스를 추측하지 않는다. 새 membership 테이블 0 · 새 role 시스템 0 · 실제 게이트는 role_assignments + active service_memberships + security-core scope guard 그대로.
- **Supplier → Service Operator 수신(§2-1 두 번째 경로).** 공급자 제공 = 기존 `SupplierContentService.submit`(cms_contents `authorRole='supplier'`, serviceKey 경계). 수신 진입은 서비스 운영 › 제공받은 콘텐츠 — KPA 는 자체 승인 정책(`kpa_approval_requests`, `/operator/approvals`) 유지, K-Cosmetics · Pharmacy-Hub 는 공통 `SupplierContentInbox`(`/operator/supplier-contents`, 공통 CMS read + 기존 상태 전이만). 새 원장 · 전송 엔진 · 통일 승인 state machine 없음 — 수신 ≠ 승인 강제.
- **Service Content = `cms_contents` serviceKey 스코프 재사용** (서비스 운영 아래). 사업 프로그램(상품 신청 · 이벤트 오퍼 · 공동구매 · 판매자 모집)은 Content 하위가 아니다.
- `/operator/*` route 는 전부 KEEP_CANONICAL (RETIRE · COMPAT_REDIRECT 0). 모바일은 `DomainIASidebar` drawer 재사용(별도 모바일 IA 없음). 권한 · capability 판정 무변경.

---

## 5. Community Workspace

> `WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1` (2026-09-16) 이 확정. 종전 "Industry Community" 방향은 **폐기(RETIRED)** — Industry / IndustryMembership / IndustryCommunity / Industry-Service mapping 을 만들지 않는다.

```text
Community Identity ≠ Service Identity

O4O Community Workspace
├─ 약사 커뮤니티      (pharmacy)      참여 = kpa-society OR pharmacy-hub active membership
├─ 화장품 커뮤니티    (cosmetics)     참여 = k-cosmetics active membership
└─ O4O 공통 커뮤니티  (o4o-general)   참여 = authenticated O4O user (Neture membership · role 불요)
```

- **Community 는 Service 와 독립된 별도 Identity 다.** Service 는 Community 의 소유자가 아니며, Service membership 은 특정 Community 의 **참여 자격 조건 중 하나**일 뿐이다. `Community = Service` · `Community isolation = serviceKey 자체` 는 현행 구조가 아니다.
- **Community Catalog SSOT = `apps/api-server/src/config/community-catalog.ts` (`O4O_COMMUNITIES`).** 초기 3개는 고정 enum 이 아니라 등록값이다 — 새 Community = Catalog 등록 + participation policy + capabilities(forum/content/resources/education) + UI metadata(entries). Forum / Content / Resources / LMS 공통 Core 는 수정하지 않는다. `key` 는 string 이며 고정 union 을 복제하지 않는다.
- **Participation policy 는 두 가지뿐**: `authenticated` · `service_membership_any(serviceKeys)`. 범용 policy engine · rule builder · workflow engine 없음. 새 Service 가 약사 커뮤니티에 참여하려면 `pharmacy.participationPolicy.serviceKeys` 에 추가하는 것으로 끝난다.
- **참여 판정 = `resolveCommunityAccess(user, communityKey)` 한 곳** (`utils/community-access.resolver.ts`, 기존 service_memberships 를 **읽기만**). Community 접근을 위해 membership · role · enrollment 를 만들지 않는다 (PH 만 가입한 회원 → 약사 커뮤니티 O, KPA My Services X, KPA membership 생성 0). 읽기 계약은 `GET /api/v1/communities`(목록 + canParticipate) · `/communities/:key/access`. 프런트가 `if (hasKpaMembership)` 를 반복하지 않는다.
- **참여 자격 ≠ 운영 권한 ≠ 공개 read.** 운영자 권한(승인·중재)은 각 forum 원장의 `service_code` 서비스 운영자가 그대로 맡는다(다중 운영 governance engine 없음). 비로그인 read 정책은 기존 route 계약 그대로다.
- **약사 커뮤니티는 하나다.** KPA `/kpa/forum` 과 Pharmacy-Hub `/pharmacy-hub/forum` 은 같은 `communityKey=pharmacy` context(원장 코드 kpa-society + pharmacy-hub 합집합)를 소비한다 — URL 이 여러 개여도 데이터 · Identity 는 하나 (PH 별도 약사 Community = 0). O4O 공통 커뮤니티는 종전 Neture 커뮤니티 구현을 **seed** 로 재사용하지만 identity 는 `o4o-general` 이며 "Neture Community" 라는 business identity 는 없다.
- **Forum Core 는 하나** (`createServiceForumRouter` · `ForumControllerBase` · `ForumQueryService`). `ForumContext.communityKey` 가 논리 경계이고, 물리 원장 `forum_category_requests.service_code` 는 (a) 파티션 (b) 운영 governance 를 겸하는 실제 Service scope 라 rename 하지 않는다 — Catalog `forumStorageCodes` 가 `논리 communityKey → 물리 코드 집합` adapter 다(dual-read · bridge table · lineage 없음). 새 business logic 은 `community == serviceKey` 를 가정하지 않는다.
- **Content · Resources · Education** 은 Content Boundary Alignment 의 `Community Content ≠ Service Content` 를 유지한다. 현재 물리 원장(`cms_contents.serviceKey` · `lms_courses.service_key`)은 실제 Service scope(운영자 승인 · course scope · points)와 공유되므로 rename 하지 않고 EXISTING_BOUNDARY_REUSED 로 둔다 — 논리 귀속은 Catalog `capabilities` 와 participation policy 로 표현하며 Core 재작성은 하지 않는다.
- Community → My Store 는 §6 의 Copy 계약(독립 사본 · auto sync 0)을 그대로 쓴다. Community 가 늘어나도 같다.

---

## 6. Store 콘텐츠 유입 경로

공식 경로는 세 개만 둔다.

```text
Community ────┐
Store Hub ────┼→ My Store Content
My Services ──┘

+ Store Direct Authoring (매장 직접 작성)
```

- 가져오기는 **Store 소유 독립 사본** 원칙을 유지한다 ([`O4O-STORE-MENU-CANONICAL-TREE-V1`](O4O-STORE-MENU-CANONICAL-TREE-V1.md) §4 · `asset-copy-core`). 원본 변경이 사본에 전파되지 않는다.
- 위 세 경로 밖의 유입(예: Supplier → 특정 Store 직접 전달)은 §2-2 로 제외한다.
- 현행 출처 4종과 이 절의 3+1 경로의 대응 (WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 §15 · 2026-09-16 확정, 코드 변경 없음 · 문서 판정만):

  | 3+1 경로 | 현행 출처 (`O4O-STORE-MENU-CANONICAL-TREE-V1` §5.1) | 물리 근거 (프로덕션 read-only, 2026-09-16) | 판정 |
  |---|---|---|---|
  | Community → My Store | `community_snapshot` (= `snapshot`) | `asset_snapshots` content/kpa · cms/kpa · `kpa_store_contents` snapshot_edit | PASS |
  | Store Hub → My Store | `operator_hub` (= `library`) | `store_execution_assets` generated/uploaded · Hub adapter(operator/supplier-library) 가져오기 | PASS |
  | My Services → My Store | (출처 값 없음) | enrollment 읽기 계약(`/work-scope/store-services`)만 존재 · 서비스 기원 콘텐츠 producer 없음 | FOUNDATION_ONLY — 출처 값 신설은 Service Operator Workspace 단계(§9-1 6) 에서 |
  | Store Direct Authoring | `store_direct` (= `direct`) · `library_self` | `kpa_store_contents` direct/store·operator | PASS |

  Copy 불변식(Store 소유 독립 사본 · 원본 변경 비전파 · provenance 보존)은 네 경로 모두 `asset-copy-core` 그대로다.

---

## 7. Legacy Partner

```text
CURRENT PARTNER = FULL RETIREMENT
FUTURE PARTNER  = GREENFIELD
```

- 현재 저장소의 Partner(제휴 링크 · 클릭/전환 추적 · 커미션 · 정산 · 파트너 대시보드 · `neture:partner` 역할 · `partner_*` / `neture_partner*` 테이블 · `/partner/*` · `/account/partner/*`)는 **과거 제휴마케팅 모델**이다. 신규 인플루언서 / SNS Partner 설계의 **기반으로 사용하지 않는다.**
- 현재 리팩터링에서 Partner 기능을 새 구조에 **호환시키지 않는다.** 모집단과 분류는 IR §B 가 기록했고, runtime 삭제는 `WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1`(2026-09-15), 물리 schema · dead package 제거는 `WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1`(2026-09-16) 로 완료됐다. **Partner 트랙은 CLOSED** 이며 이후 단계의 범위에 들어오지 않는다.
- 향후 Partner 는 다음 순서로 **별도** 진행한다.

```text
업무분석 → 사업모델 → 데이터모델 → UX → 신규개발
```

- **이름 충돌 주의** — `foreign_visitor_partners`(매장 소유 외국인 방문객 유입 파트너, Store Ops) · HFF 데이터의 "partner 성분" · `neture_partner_recruitments`(공급자의 **판매자(매장) 모집** 공고) 등은 이름에 partner 가 있어도 제휴마케팅 Partner 가 아니다. 분류는 IR §B 의 `KEEP_SHARED_NOT_PARTNER` 를 따르며, 은퇴 WO 는 이름만으로 삭제하지 않는다.
- [`NETURE-PARTNER-CONTRACT-FREEZE-V1`](../archive/obsolete/partner/NETURE-PARTNER-CONTRACT-FREEZE-V1.md)(구 F7) 은 2026-09-15 `WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1` 로 runtime 은퇴가 완료되어 **SUPERSEDED** 로 표기됐고, 2026-09-16 `WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1` 로 물리 테이블·enum·컬럼·dead package(`@o4o/partner-core` · `@o4o/financial-core`)·비활성 partner role row 까지 제거되어 `docs/archive/obsolete/partner/` 로 이동했다. Seller Recruitment 물리 명칭은 `seller_recruitments` · `seller_recruitment_applications`(`applicant_id` · `applicant_name`) 로 정리됐다.
- **판매자 모집(Seller Recruitment)** 은 Partner 가 아니다 — `SellerRecruitment` / `SellerRecruitmentApplication` 도메인으로 분리 보존됐다(물리 테이블명 `neture_partner_*` 는 엔티티 seam 으로 격리, rename 은 physical cleanup).

---

## 8. 기존 정본과의 관계

| 문서 | 관계 | 처리 |
|---|---|---|
| [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) | 동급 상위 정본. §1 · §2 · §5 · §6 은 그대로 유효. **§3(공급자 = 직접 제작 주체 아님) · §4 (3자 구조) · §7 (3자 경계 Drift) · 주의사항(Neture 내 매장 기능 추가 금지)** 은 이 문서와 충돌 | 충돌 절은 **이 문서가 우선**. 본문 정정은 후속 WO(UPDATE_REQUIRED) |
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md) | §2 Canonical Flow(공급자 → 운영자 → 매장 단선) · §6 첫 항목(공급자 HUB 직접 게시 금지) · §3 공급자 직접 제작 ❌ 가 §2-1 · §6 과 충돌 | **판정 확정 (2026-09-16, Content Boundary Alignment)** — 충돌 절 SUPERSEDED (헤더 표기, 본문 보존). §4 · §5 는 참고 가능하나 근거로 승격하지 않는다 |
| [`PLATFORM-CONTENT-POLICY-V1`](PLATFORM-CONTENT-POLICY-V1.md) (F4) | 3축 모델(Producer / Visibility / ServiceScope)은 유지. `producer='supplier'` 를 "legacy 예외" 로 둔 §3.1 · §6.3 · §10-5 가 §2-1 과 충돌 | FROZEN 유지. **§3.1 · §3.2 · §6.3 · §10-5 정정 완료 (2026-09-16, Content Boundary Alignment)** — supplier = Canonical. Hub 축 축소는 Store Hub 단계 |
| [`O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`](O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) | §6 첫 항목(공급자 HUB 직접 제작·게시 금지)이 §2-1 과 충돌 | ACTIVE 유지. **§6 첫 항목 삭제 완료 (2026-09-16, Content Boundary Alignment)** |
| [`O4O-STORE-MENU-CANONICAL-TREE-V1`](O4O-STORE-MENU-CANONICAL-TREE-V1.md) | §1.3(Neture 제외) · §5.1(출처 4종)이 §1 · §6 과 부분 충돌. 6 항목 축 · 사본화 원칙은 유지 | ACTIVE 유지, 해당 절 UPDATE_REQUIRED (Store 단계) |
| [`NETURE-PARTNER-CONTRACT-FREEZE-V1`](../archive/obsolete/partner/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) (구 F7) | §7 은퇴 대상 | **SUPERSEDED (2026-09-15) · ARCHIVED (2026-09-16)** — runtime · 물리 스키마 · dependency 정리 모두 완료 |
| [`NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`](NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) (F8) | 공급자 제품 → 조직 진열 흐름. Partner 무관. §2-1 의 Supplier → Store Hub 제품 축 근거 | KEEP |
| [`O4O-STORE-COMMERCE-BOUNDARY-V1`](O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) | commerce 경계 · B2B 주문 계약. 이 문서는 commerce 를 바꾸지 않는다 | KEEP (Supplier › Orders · Business Operation › Products 의 주문 축 근거) |
| [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) | "공통 매장경영 구조 − operator capability" 모델은 이 문서의 Store / My Services 와 정합 | KEEP |
| Frozen F1 · F3 · F6 · F9 · F10 · F11 · F12 | 기술 계약. 이 문서는 구조를 바꾸지 않는다 | KEEP — 각 단계 WO 가 필요한 경우에만 명시적 변경 |

전체 판정 목록은 IR §C.

---

## 9. 리팩터링 실행 규칙 (모든 단계 공통)

각 단계는 항상 다음 순서로 진행한다.

```text
latest main sync
→ fresh census
→ decision
→ implementation
→ tests/build
→ same-scope re-census
→ independent verification
→ CHECK
→ active docs alignment
→ commit/push
```

- **이전 IR 의 파일 목록을 다음 WO 의 모집단으로 그대로 쓰지 않는다. 매 단계 시작 시 현재 `origin/main` 코드에서 모집단을 다시 만든다.** 이 문서의 근거 IR 도 예외가 아니다 — Partner Retirement 는 착수 시 Partner 모집단을 다시 산출한다.
- 기준점은 `origin/main` HEAD 다. 과거 commit · 작업공간 경로 · 문서의 목록을 기준점으로 고정하지 않는다.
- 이름(문자열)만으로 소비처 0 · 삭제 대상을 선언하지 않는다. 역방향 소비처(route mount · entity 등록 · FK · 테스트 가드 · appsCatalog · 문서 링크)까지 확인한다.
- DB 제거는 **forward migration** 으로만 한다. 과거 migration 파일을 삭제·수정해 이력을 재작성하지 않는다.
- 각 단계의 중지 조건 · Git · DB · 검증 규칙은 `CLAUDE.md` / `AGENTS.md` 의 실행 안전 규칙을 그대로 따른다.

### 9-1. 단계 순서 (권장)

```text
0. Baseline + Preflight      ← 이 문서 · IR (완료)
1. Legacy Partner Retirement ← A. runtime 은퇴(2026-09-15) · B. physical cleanup(2026-09-16) 완료 · CLOSED
2. Service Tenant Foundation ← Service Identity · Store↔Service · Operator↔Service · Workspace metadata 읽기 계약 (2026-09-16 완료, UI 없음)
3. Content Boundary Alignment ← 논리 도메인 4종 · canonical producer(adapter 정규화) · KPA producer drift FIX · F4/게시 표준/3자 흐름 문서 정합 (2026-09-16 완료, 물리 schema 변경 없음)
4. Supplier Workspace        ← Products / Orders / Content 3축 IA · Supplier 전용 Community 진입 은퇴 · §2-1 두 경로 구현(Hub adapter · handoff) (2026-09-16 완료, schema 변경 없음)
5. Store Workspace        ← Home · My Store · Store Hub · My Services 상위 구조(store-ui-core `workspace/`) · My Services(`/work-scope/store-services`) · 대표 홈 진입 정렬 · KPA 모바일 전용 화면 RETIRE (2026-09-16 완료, schema 변경 없음)
6. Service Operator Workspace ← 표준 최상위 IA 서비스 운영 / 사업 운영 / 운영 관리 (항목 단위 분류) · operator-services 기반 다중 서비스 전환 · Supplier → Service Operator 수신함 · Neture SPECIAL 보존 (2026-09-16 완료, schema 변경 없음 — §4-2)
7. Community Workspace        ← Community Catalog(SSOT 1) · Community Identity / Service Identity 분리 · 초기 3 Community(pharmacy · cosmetics · o4o-general) · access policy(authenticated / service_membership_any) · 공통 Forum Core adoption(communityKey 컨텍스트) · Industry Community 폐기 (2026-09-16 완료, schema 변경 없음 — §5)
8. Final Role Workspace Census ← Supplier / Store / Service Operator / Community 4축의 코드 · 문서 · 권한 · route 일치 최종 검증
```

순서는 권장이며, 각 단계 WO 가 착수 시점의 fresh census 로 확정한다.

---

## 10. 변경 절차

- 이 문서의 §1~§7 결정을 바꾸는 것은 사업 모델 변경이다. 사용자 명시 지시 + 후속 버전(V2) 으로만 바꾼다.
- 각 단계 WO 는 이 문서를 **상세화**할 수 있으나 **모순되는 결정을 만들 수 없다.** 모순이 필요하면 이 문서를 먼저 개정한다.
- "현재 하지 않는다"(§2-2 제외 경로 · §7 Partner 은퇴)를 "앞으로도 절대 하지 않는다" 로 읽지 않는다 (`CLAUDE.md` Source of Truth 절의 원칙과 동일).

---

*작성: 2026-09-15 · WO-O4O-ROLE-WORKSPACE-REFACTOR-BASELINE-AND-PREFLIGHT-V1*
