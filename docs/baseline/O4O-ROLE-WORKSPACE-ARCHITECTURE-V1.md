# O4O-ROLE-WORKSPACE-ARCHITECTURE-V1

> **2026-10-10 용어 정비**: 현행 사업 명칭은 **약국 협력사업**이다. 내부 식별자·가입/승인·주문 계약과 과거 실행 결과는 유지한다. 대표 홈의 탐색 분류·준비 중 노출은 [서비스 탐색 정본](O4O-HOME-SERVICE-DISCOVERY-V1.md)을 따른다. 이 갱신은 화면 구현·배포 완료를 뜻하지 않는다.

> **상태**: ACTIVE
> **작성일**: 2026-09-15 · **최종 갱신**: 2026-10-08 (§0 · §2 · §3 · §4 · §5 · §6 현재 서비스 재배치 정책·사용자 결정·재대조 작업안) · 2026-10-05 (§3 · §5 · §6 Neture 약국 매장 — Store Hub 단계 없음 · 약국 협력사업 = 데이터 행 · 약국 협력사업 커뮤니티 판정) · 2026-09-17 (§8 PHILOSOPHY · STORE-MENU-CANONICAL-TREE 정정 완료 · §9-1 8단계 Final Census 완료 — `ROLE_WORKSPACE_REFACTOR = CLOSED`) · 2026-09-16 (§2-1 제공 경로 구현 계약 상세화 · §4 Service Identity ≠ Service Workspace · §7 물리 정리 완료 · §9-1 4단계 Supplier Workspace 반영 · §3-1 Store Workspace 구현 상태 · §6 출처 4종↔3+1 경로 대응 · §9-1 5단계 반영 · §4-2 Service Operator Workspace 구현 상태 · §9-1 6단계 반영 · §5 Community Workspace(Community Identity ≠ Service Identity · Industry Community 폐기) · §9-1 7단계 반영)
> **근거 WO/IR**: `WO-O4O-ROLE-WORKSPACE-REFACTOR-BASELINE-AND-PREFLIGHT-V1` · [`IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1`](../ir/IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1.md)
> **위치**: 사업·정책 정본(우선순위 2). [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) 과 동급이며, **역할 경계 · 업무공간 구조 · 콘텐츠 유입 경로 · Legacy Partner** 에 관해 두 문서가 충돌하면 **이 문서가 우선**한다 (§8).

---

## 0. 이 문서가 정하는 것 · 정하지 않는 것

**2026-10-08 사용자 정정 — 현재 Neture 서비스 재배치 기준** ([전체 작업 ToDo](../work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)):

- 약국 경영자의 약국과 내 매장은 하나다. 한 약국이 여러 약국 협력사업 서비스를 이용하며 그 제공 기능을 같은 내 매장에 적용한다. 서비스별 구획은 탭 등으로 표현한다. 별개 내 매장은 권한·자료·장바구니·주문을 독립적으로 관리한다.
- 각 약국 협력사업은 독립된 약국 지원 사업자다. 혈당관리·협동조합 등 사업별 업무는 해당 사업에 맞게 개발한다. 공통 가입 식별과 권한 격리는 업무 표준화나 범용 개설 기능의 근거가 아니다.
- 각 서브도메인에는 해당 서비스의 관리자(=운영자)가 있고 자기 공간에서 업무를 관리한다. 공급자·펀딩·커뮤니티 관리도 각각 해당 호스트에 배치한다. 전체관리자는 admin.neture.co.kr에만 두며 서비스 관리 주체와 구분한다. 기존 role 문자열을 주소나 용어 변경 때문에 일괄 바꾸지 않는다.
- 매장 HUB의 필요한 기능은 내 매장 공급 화면·자료함과 약국 협력사업 회원 커뮤니티에 배치한다. HUB는 이용 중간 단계로 두지 않는다. 과거 구현 기록의 HUB 화면 보존은 현재 완료 기준이 아니다.
- community 공간은 독립 가입 커뮤니티와 사업 참여자 전용 커뮤니티를 함께 제공한다. 기존 약사 커뮤니티는 독립 가입으로 유지하고 pharmacy 사업 회원 포럼은 별도로 둔다. 두 공간의 식별·가입·게시글을 합치지 않는다. 사업자별 포럼 등은 해당 사업 참여 회원만 이용한다. 가입 정지·종료 시 제품 공급·회원 커뮤니티 참여를 차단하며 이미 가져온 사본은 매장 소유로 남는다.
- 강좌는 커뮤니티에서 완전히 제거하고 독립 서비스 study.neture.co.kr로 이전한다. 강좌와 펀딩은 내 매장과 독립이며 Neture 메인에서 접근한다. 분회 연수 이력·학점은 강좌 서비스와 구분한다.
- 전체 작업안은 초안 ToDo → 코드·문서 점검 → ToDo 수정 → 필요한 결정 논의 → 수정 ToDo 재점검 → 최종안 순서로 만든다. 문서 정비를 먼저 실행해 계획을 확정한 것으로 간주하지 않는다. 아래 역사적 구현 상태와 현행 정책은 구분한다.

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
Supplier → 내 매장 자료함       (이용 가능한 공개 자료 목록)
Supplier → Service Operator   (서비스 운영자에게 제공)
```

### 2-2. 제외 경로

```text
Supplier → 특정 Store 직접 온라인 전달   ✕
Supplier → Community 직접 게시           ✕
```

- 특정 매장에 직접 자료를 줄 필요가 있으면 **O4O 밖에서** 전달하고, Store 가 필요 시 **직접 등록**한다 (§5 Store Direct Authoring).
- 이 절은 `O4O-BUSINESS-PHILOSOPHY-V1` §3 의 "공급자는 O4O 내부에서 콘텐츠를 직접 제작·등록하는 주체가 아니다" 와 `O4O-3-ROLE-FLOW-BASELINE-V1` §6 의 "공급자가 O4O 시스템에서 직접 HUB 콘텐츠를 제작·게시 금지" 를 **대체**한다. 공급자는 Content 를 가지며, 매장에서 이용 가능한 자료 목록과 Service Operator 에 온라인으로 제공한다. 특정 매장을 대상으로 직접 전송하는 경로와는 구분한다.
- 공급자 콘텐츠의 운영자 검수·승인은 현행 서비스별 정책을 따른다. 내 매장으로 화면을 옮긴다는 이유로 열람·사본 권한을 확대하지 않는다. 아래 adapter 계약을 대조하고 필요한 기능을 재배치한다.
- **구현 계약 상세화 (2026-09-16, `WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1`)** — 공급자 콘텐츠의 canonical 원장은 `neture_supplier_library_items` 하나다(새 원장 없음).
  · 당시 `Supplier → Store Hub` = Hub source adapter `sourceDomain=supplier-library` (`is_public=true` 행 노출 · 사본 없음 · 특정 매장 대상 없음). 현재는 이 열람 계약을 유지하며 내 매장으로 화면을 재배치한다. adapter 이름이 남았다는 이유로 중간 HUB 화면을 유지하지 않는다.
  · `Supplier → Service Operator` = `POST /neture/library/:id/handoff {serviceKey}` — 대상은 canonical catalog(`operatorWorkspaceEnabled=true` + `workspaceMode=standard`)에서만 파생, 수신은 기존 `cms_contents(authorRole=supplier, status=pending)` 계약 재사용. 제공 후 검토·수정·발행은 운영자 업무이며 **공급자 책임은 제공에서 끝난다** (상태 기계 · 전송 엔진 · lineage 없음).

---

## 3. Store

```text
Store Workspace
├─ Home
├─ My Store
└─ My Services
```

- **한 Store 는 여러 Service 에 가입할 수 있어야 한다** (1 Store : N Services). 데이터 모델 판정은 IR §A — `organizations` 는 서비스 중립이며 `organization_service_enrollments`(UNIQUE(organization_id, service_code)) 가 이미 1:N 을 표현한다. 신규 Store-Service 테이블을 만들지 않는다.
- **My Store 와 Store Hub 의 기존 공통 Core 는 재작성하지 않고 최대한 유지**한다 (`store-core` · `store-ui-core` · `hub-core` · `asset-copy-core` · [`STORE-LAYER-ARCHITECTURE`](../architecture/STORE-LAYER-ARCHITECTURE.md) F3).
- My Store 는 **Store 소유** 공간이다. Store 자산의 경계는 `organizationId` 이며 서비스로 나뉘지 않는다. 같은 약국이 가입한 서비스의 기능은 내 매장 안에서 탭 등으로 구획하며, 서비스별 조건·출처·접근 권한을 유지한다. My Services (§4)는 가입 상태와 진입을 정리한다.
- **주소 정합 (2026-10-08)**: 공통 주소는 `store.neture.co.kr`이며 현재 신규 가입은 약국 전용이다. 약국 경영자의 내 매장과 각 독립 사업자의 운영 공간을 구분한다 — [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) §3. 아래 §3-1 은 서비스 앱 안 `/store` 기준의 2026-09-16 구현 기록이다. 현재 전체 이전 작업은 §0의 ToDo가 관리하며, 기존 주소 전환 근거는 `CHECK-O4O-URL-FIRST-CENSUS-V1` §21에서 대조한다.

- **Neture 약국 매장 (2026-10-05, WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1)**: 약국 매장 이용자에게는 **Store Hub 단계가 없다** — 내 매장이 이용 권한이 있는 상품 · 이벤트 · 모집 · 콘텐츠를 직접 판정해 보여주며, "Hub 진열 → 가져오기 → 취급 등록 → 주문" 을 주문 전제로 두지 않는다. 약국 매장 기본 게이트 = 내 매장(약국) 신청 · 승인 원장(`neture_pharmacy_memberships`, 2026-10-07 명칭 정정 — 과거 "Neture 기본 가입". Neture 메인 가입 `service_memberships('neture')` 과 다른 원장이며 신청 · 승인 전제로만 읽는다), 약국 협력사업(pharmacy 포함) = Service 가 아니라 **데이터 행**(`semi_franchises` · 약국 조직 단위 `semi_franchise_memberships`)이며 My Services 의 `organization_service_enrollments` 로 표현하지 않는다. 2026-10-08 재배치 branch에서 내 매장 자료함으로 기능을 이전하고 중복 HUB 화면을 제거했다. 옛 HUB 주소는 기능별 목적지로 연결하며 공통 API·Core는 유지한다. 기준: [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §1 · §5 · §6.

### 3-1. 구현 상태 (WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 · 2026-09-16)

- **기존 서비스 연결 helper (현재 주소 adapter의 기반)** (`@o4o/store-ui-core` `workspace/`) — `resolveStoreWorkspacePaths(config)` 가 서비스 `basePath` 에서 `Home = <base>/workspace` · `My Store = <base>` · `Store Hub = /store-hub`(공통) · `My Services = <base>/services` 를 파생한다 (KPA · KCos `/store`, Pharmacy Hub `/store-owner` — PG callback 경로 불변). 서비스는 `StoreWorkspaceNav` 를 `MyStoreShell.banner` 슬롯과 Store Hub 레이아웃 위에 조립만 하고, Home / My Services 는 `StoreWorkspaceShell` + `StoreWorkspaceHomeView` / `MyServicesView` 조립만 한다. `MyStoreShell` · `StoreHubShell` · `store-core` · `hub-core` · `asset-copy-core` 는 재작성하지 않았다.
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

기존 Service Operator의 메뉴 분류 (2026-09-16 확정):

각 약국 협력사업의 실제 업무·화면은 독립 사업에 맞게 개발한다. 아래 분류나 공통 UI를 재사용한다는 이유로 신규 사업의 기능과 운영 절차를 동일하게 만들지 않는다.

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

> **2026-10-10 사용자 정책 갱신 — 구현 대기**: 커뮤니티와 강의는 서비스 진입을 공개하고 각 항목에서 이용 자격을 정한다. 서비스 전체에 일괄 로그인·가입·승인을 요구하는 종전 정책은 이 범위에서 대체한다. 공개로 정한 콘텐츠는 비로그인 탐색·열람이 가능하며 회원 전용 자료·글쓰기·수강·사업 회원 공간은 해당 항목의 자격을 확인한다. 어떤 항목이 공개인지는 명시적으로 구분하고 기존 회원 전용 데이터가 일괄 공개되지 않도록 한다. 현재 middleware의 서비스 입구 401/403은 기존 구현이며 후속 변경 대상이다. 아래는 종전 구현·개별 승인·운영 권한 계약의 기록으로, 새 서비스 입구 정책의 근거로 사용하지 않는다. 강의 앱 분리와 사업별 회원 경계는 유지한다. [서비스 진입·문의 정책](O4O-HOME-SERVICE-DISCOVERY-V1.md) §5를 함께 적용한다.

2026-10-08 사용자 결정과 [전체 재배치 WO](../work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)를 적용한다. 초기 Industry Community 방향은 **RETIRED**이며 범용 policy engine·workflow engine을 만들지 않는다.

```text
Community Identity ≠ Service Identity
community.neture.co.kr
├─ 독립 약사 커뮤니티 (pharmacy) — 개별 가입·승인 유지
├─ O4O 공통·개설 승인 커뮤니티 — 개별 가입·승인
└─ 각 약국 협력사업 회원용 공간 — 해당 사업의 활성 가입
```

- 독립 커뮤니티는 `communities`·`community_memberships`를 사용한다. 정상 메인 계정·커뮤니티 active·개별 승인·해당 카탈로그 정책을 함께 확인한다. 약사 커뮤니티는 KPA/PH 서비스 가입을 추가로 요구하지 않는다. 기존 화장품 identity는 퇴역 잔여 계약에 따른 현재 scope를 유지하며 서비스를 복구하지 않는다.
- 사업 회원 커뮤니티는 `semi_franchises.community_key`로 식별한다. 독립 커뮤니티 행이나 가입 원장을 생성·동기화하지 않는다. 활성 약국 승인·같은 조직의 owner/admin/manager·활성 사업 가입을 확인한다. 담당 지정과 현재 운영 역할을 가진 사업자는 약국 소유 없이 자기 공간을 관리한다. 폐쇄·정지·종료는 같은 판정에서 차단한다.
- 독립 약사 커뮤니티와 pharmacy 사업 포럼은 다른 공간이다. 카탈로그·독립 커뮤니티·개설 신청·다른 사업 간 주소 충돌을 공통 transaction advisory lock 아래 차단한다.
- 목록·access·게시판 경계는 `resolveCommunityWorkspace`가 현재 DB 상태를 읽어 판정한다. 카탈로그(`community-catalog.ts`)는 기존 공간의 표시·정책·저장 코드 adapter를 제공한다. 새 독립 DB 커뮤니티 개설을 고정 카탈로그에 등록해야 이용할 수 있는 구조로 만들지 않는다.
- **Forum Core는 하나다.** 기존 약사 게시판은 `kpa-society`·`pharmacy-hub`, 공통 게시판은 `neture` 코드를 보존한다. 신규 공간은 `community:<UUID>`·`sf:<UUID>`를 사용한다. 기존 저장 범위와 역할 이름을 변경하거나 백필하지 않는다.
- `/communities/:key/forum`는 기존 Forum router/controller를 재사용해 글·댓글·좋아요·게시판 개설/심사·소유 게시판 회원 관리·담당 운영자의 중재를 제공한다. 서버가 저장 범위와 관리 가능 여부를 정하며 클라이언트 serviceCode를 권한으로 신뢰하지 않는다. 일반 공개 Forum API에서 신규 회원 공간을 열람할 수 없다.
- **참여 자격과 운영 권한은 구분한다.** 독립 커뮤니티 가입 심사는 기존 개체 운영자, 사업 포럼 관리는 해당 사업 담당자가 수행한다. 사용자 결정(2026-10-09)에 따라 community 서비스 역할을 `community:admin`(Admin)과 `community:operator`(Operator)로 분리한다. admin.neture.co.kr에서 두 역할을 지정하며 개설 신청 심사는 Admin/Operator 모두, 개별 커뮤니티 운영자 지정·해제는 Admin만 수행한다. 사용자 결정에 따라 중앙에서 지정한 활성 community Admin/Operator는 해당 서비스의 활성 독립 커뮤니티 가입 승인·중재를 수행한다. 매 요청 DB 역할과 활성 서비스 소속·정상 메인 계정을 확인하며 개별 운영자 지정 없이 적용한다. 일반 회원의 개별 승인과 세미프랜차이즈 담당 권한은 변경하지 않는다. 다른 사업이나 플랫폼 전체 권한을 합성하지 않는다.
- **개별 커뮤니티 회원 관리 정비 정책(2026-10-10 확정 · main 반영 · API/Neture 배포 완료)**: 개별 역할을 admin/operator/member로 분리한다. 개별 operator는 조회·승인·반려, admin은 정지·해제·커뮤니티 탈퇴까지 담당한다. 기존 개별 operator는 admin으로 전환하며 개별 admin/operator 지정·회수는 community 서비스 admin만 담당한다. 서비스 operator의 개별 가입 심사 권한은 유지하되 새 제재는 허용하지 않는다. 제재는 해당 community_memberships에만 적용하고 서비스 가입·공통 계정·다른 커뮤니티를 바꾸지 않는다. 개별 admin/operator/member 및 제재·이력 구현은 [PR #412](https://github.com/Renagang21/o4o-platform/pull/412)로 main에 반영됐고 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38052764012)의 API/Neture 배포가 성공했다. [개별 회원 관리 설계](../design/DESIGN-O4O-INDIVIDUAL-COMMUNITY-MEMBER-ADMIN-V1.md)의 배포 전 기록과 현재 적용 상태를 구분한다. 자기 탈퇴는 아래 2026-10-11 확정 정책을 따르며 이력 보존 기간·자동 삭제 정책은 후속 결정 사항이다.
- **자기 탈퇴·이력 정책(2026-10-11 사용자 확정)**: 본인의 활성 개별 커뮤니티 가입만 탈퇴할 수 있다. 마지막 유효 admin은 후임 지정 전 탈퇴를 막고, 정지·반려·신청 상태는 자기 탈퇴로 우회하지 않는다. 해당 개별 가입은 withdrawn·member로 변경하며 공통 계정·서비스 가입·다른 커뮤니티·게시물·별도 중앙 운영 권한은 유지한다. actor와 변경 전후 상태를 기존 변경 이력에 같은 트랜잭션으로 기록하고 이력은 보존한다. 이력 조회는 기존 같은 커뮤니티 admin/서비스 admin 경계를 유지한다. 보존 기간·자동 삭제는 미확정으로 남기며 이번 정책에서 자동 삭제를 도입하지 않는다. 구현·검증·운영 반영 단계는 [후속 TODO](../work-orders/WO-O4O-COMMUNITY-REMAINING-TODO-V1.md)에서 구분한다.
- 콘텐츠·자료는 현행 출처·Copy 계약을 유지한다. 강좌·학습·강사·강좌 문의는 study의 독립 서비스이며 커뮤니티 capability에 넣지 않는다. 분회 연수 이력·학점·자격 업무는 분회에 남긴다.
- Community → My Store는 §6의 독립 사본 계약을 사용한다. 사업 가입 정지 후 기존 사본을 회수하지 않고 신규 원본·공급·포럼만 차단한다.
- 현재 branch의 구현·로컬 검증과 운영 배포·업무 확인은 [CHECK](../checks/CHECK-O4O-NETURE-SERVICE-REALIGNMENT-V1.md)에 각각 기록한다.

## 6. Store 콘텐츠 유입 경로

**현재 재배치 기준(2026-10-08)**: 아래 도식은 기존 출처·사본 계약의 기록이다. 이용 가능한 콘텐츠는 내 매장 자료함에서 출처별로 직접 이용하며 Store Hub를 거치지 않는다. 공급자 공개 자료는 §2-1의 열람 계약을 따른다. 자료 열람과 사본 생성 권한은 같다고 가정하지 않는다.

공식 경로는 세 개만 둔다.

```text
Community ────┐
Store Hub ────┼→ My Store Content
My Services ──┘

+ Store Direct Authoring (매장 직접 작성)
```

- 가져오기는 **Store 소유 독립 사본** 원칙을 유지한다 ([`O4O-STORE-MENU-CANONICAL-TREE-V1`](O4O-STORE-MENU-CANONICAL-TREE-V1.md) §4 · `asset-copy-core`). 원본 변경이 사본에 전파되지 않는다.
- 위 세 경로 밖의 유입(예: Supplier → 특정 Store 직접 전달)은 §2-2 로 제외한다.
- **Neture 약국 매장 (2026-10-05)**: "Store Hub → My Store" 는 Hub 진열 화면을 거치지 않는다. 내 매장 자료함이 접근 가능한 콘텐츠(자체 · 일반 커뮤니티 · 가입 약국 협력사업 · 공급자)를 출처별로 직접 보여주고 기존 사본 API 를 그대로 호출한다(사본 · provenance 원칙 동일) — [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §6.
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
| [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) | 동급 상위 정본. §1 · §2 · §5 · §6 은 그대로 유효. **§3(공급자 = 직접 제작 주체 아님) · §4 (3자 구조) · §7 (3자 경계 Drift) · 주의사항(Neture 내 매장 기능 추가 금지)** 은 이 문서와 충돌 | 충돌 절은 **이 문서가 우선**. **본문 정정 완료 (2026-09-17, Final Census)** — 적용 범위 · §3 · §4 · §6 · §7 · 주의사항 · 후속 문서 표를 §1 · §2-1 · §3 · §4 · §5 기준으로 정렬 (사업 결정 변경 없음) |
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md) | §2 Canonical Flow(공급자 → 운영자 → 매장 단선) · §6 첫 항목(공급자 HUB 직접 게시 금지) · §3 공급자 직접 제작 ❌ 가 §2-1 · §6 과 충돌 | **판정 확정 (2026-09-16, Content Boundary Alignment)** — 충돌 절 SUPERSEDED (헤더 표기, 본문 보존). §4 · §5 는 참고 가능하나 근거로 승격하지 않는다 |
| [`PLATFORM-CONTENT-POLICY-V1`](PLATFORM-CONTENT-POLICY-V1.md) (F4) | 3축 모델(Producer / Visibility / ServiceScope)은 유지. `producer='supplier'` 를 "legacy 예외" 로 둔 §3.1 · §6.3 · §10-5 가 §2-1 과 충돌 | FROZEN 유지. **§3.1 · §3.2 · §6.3 · §10-5 정정 완료 (2026-09-16, Content Boundary Alignment)** — supplier = Canonical. Hub 축 축소는 Store Hub 단계 |
| [`O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`](O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) | §6 첫 항목(공급자 HUB 직접 제작·게시 금지)이 §2-1 과 충돌 | ACTIVE 유지. **§6 첫 항목 삭제 완료 (2026-09-16, Content Boundary Alignment)** |
| [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) · [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) | §4-2-A~E "8 Group (6 Workspace A~F) Sidebar" 가 §4 3도메인 IA 와 충돌 (미구현). 5-Block 대시보드 · KPI · Guard · Route · Non-Approval UX 원칙은 무관 | **§4-2-A~E SUPERSEDED 표기 완료 (2026-09-17, Final Census)** · NON-APPROVAL §5 에 "A~F ≠ Sidebar IA" 1줄 |
| [`KPA-SOCIETY-SERVICE-STRUCTURE`](KPA-SOCIETY-SERVICE-STRUCTURE.md) | §3.1 "Forum = 커뮤니티 서비스 기능" 이 §5 Community Identity(pharmacy, KPA+PH 합집합) 와 충돌 · 데모 서비스 제거 완료 미반영 | **v1.1 정정 완료 (2026-09-17, Final Census)** — 3개 서비스 = 화면 영역 구분, Identity 아님 |
| [`O4O-STORE-MENU-CANONICAL-TREE-V1`](O4O-STORE-MENU-CANONICAL-TREE-V1.md) | §1.3(Neture 제외) · §5.1(출처 4종)이 §1 · §6 과 부분 충돌. 6 항목 축 · 사본화 원칙은 유지 | ACTIVE 유지. **§1.3 · §5.1 · SMT-G8 정정 완료 (2026-09-17, Final Census)** — 적용 서비스 = catalog `storeWorkspaceEnabled` · 출처 4종 ↔ §6 3+1 경로 대응 · SMT-G8 = §2-2 제외 경로 재등장 |
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
8. Final Role Workspace Census ← Supplier / Store / Service Operator / Community 4축의 코드 · 문서 · 권한 · route 일치 최종 검증 (2026-09-17 완료 — Fresh Global Census · 잔여 drift 정리 · 최신 API 기준 Community smoke PASS · 5 active doc 정렬 · `ROLE_WORKSPACE_REFACTOR = CLOSED`, CHECK-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1)
```

순서는 권장이며, 각 단계 WO 가 착수 시점의 fresh census 로 확정한다.

---

## 10. 변경 절차

- 이 문서의 §1~§7 결정을 바꾸는 것은 사업 모델 변경이다. 사용자 명시 지시 + 후속 버전(V2) 으로만 바꾼다.
- 각 단계 WO 는 이 문서를 **상세화**할 수 있으나 **모순되는 결정을 만들 수 없다.** 모순이 필요하면 이 문서를 먼저 개정한다.
- "현재 하지 않는다"(§2-2 제외 경로 · §7 Partner 은퇴)를 "앞으로도 절대 하지 않는다" 로 읽지 않는다 (`CLAUDE.md` Source of Truth 절의 원칙과 동일).

---

*작성: 2026-09-15 · WO-O4O-ROLE-WORKSPACE-REFACTOR-BASELINE-AND-PREFLIGHT-V1*
