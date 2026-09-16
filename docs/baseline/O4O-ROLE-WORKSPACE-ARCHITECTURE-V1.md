# O4O-ROLE-WORKSPACE-ARCHITECTURE-V1

> **상태**: ACTIVE
> **작성일**: 2026-09-15 · **최종 갱신**: 2026-09-16 (§4 Service Identity ≠ Service Workspace · §7 물리 정리 완료 · §9-1 Service Tenant Foundation 반영)
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

---

## 4. My Services / Service Workspace

```text
My Services
├─ All
├─ Service A
├─ Service B
└─ Service C
```

Service 내부:

```text
Service Operation           Business Operation
├─ Notice                   ├─ Products
├─ Content                  ├─ Group Buy
├─ Forum / Board            ├─ Special Deal
├─ Resources                ├─ Event
└─ Education                └─ Promotion
```

- **Content 와 사업 프로그램(Business Operation)은 별도 도메인**으로 유지하며, 필요할 때 관계만 연결한다. 한쪽을 다른 쪽의 하위로 만들지 않는다.
- Service Operator 는 자기 Service 의 Service Operation · Business Operation 을 운영한다. 한 운영자가 여러 Service 를 운영할 수 있다 (1 Operator : N Services — IR §A).

### 4-1. Service Identity ≠ Service Workspace

`WO-O4O-SERVICE-TENANT-FOUNDATION-V1`(2026-09-16) 이 고정한 용어.

- **Service Identity** — "어떤 서비스가 존재하는가". 정본은 `platform_services` 의 canonical `code` 와 `apps/api-server/src/config/service-catalog.ts` `O4O_SERVICES` (같은 집합). role prefix 별칭 행(`kpa` → `kpa-society`, `cosmetics` → `k-cosmetics`)은 **독립 서비스가 아니라** canonical 의 alias 이며, 정규화는 `@o4o/security-core` 의 기존 매핑 하나만 쓴다. 제품 도메인 키(`kpa-groupbuy` · `*-event-offer`)는 서비스 identity 가 아니다.
- **Service Workspace** — "그 서비스가 My Services 항목(매장 화면) · 운영자 화면으로 노출되는가". Identity 와 **별도 metadata** 로 catalog 에 붙인다: `workspace.workspaceMode`(`standard | special | none | undecided`) · `storeWorkspaceEnabled` · `operatorWorkspaceEnabled`. `PlatformService.service_type`(`community | tool | extension`)은 **다른 축**이며 Workspace 판정에 쓰지 않는다.
- **모든 platform service 가 My Services 항목이 되는 것은 아니다.** 노출 조건은 `Store 의 enrollment 가 active` **AND** `해당 서비스의 storeWorkspaceEnabled` 이다. 근거 없는 서비스는 `undecided` 로 두고 노출하지 않는다 — 코드가 사업 결정을 대신 내리지 않는다.
- 세 관계는 물리적으로 분리 유지한다 (합치지 않는다): Store ↔ Service = `organization_service_enrollments` · Operator ↔ Service = `role_assignments` + `service_memberships`(membership guard 와 동일 정책) · 사용자 ↔ 조직 = `organization_members`. 읽기 계약은 `/api/v1/work-scope/store-services` · `/operator-services` (`utils/service-tenant.resolver.ts`) 하나로 두며 UI 노출 ≠ 권한이다 — Workspace metadata 는 권한 SSOT 가 아니다.
- **Industry(업종) 는 아직 정의하지 않았다.** Community §5 의 Industry Community 와 Service Identity 의 관계는 별도 단계에서 정한다.

---

## 5. Community

일반 사용자 공간은 서비스별 Community 가 아니라 장기적으로 **Industry Community** 축으로 정리한다.

```text
Industry Community
├─ Forum
├─ Content
├─ Resources
└─ Education
```

- 현행 `serviceKey` 격리 기반 Community/Content 구조([`o4o-common-structure`](../o4o-common-structure.md) · [`PLATFORM-CONTENT-POLICY-V1`](PLATFORM-CONTENT-POLICY-V1.md) F4)는 Community 리팩터링 단계 전까지 **그대로 유효**하다. 이 절은 방향을 정할 뿐 현행 격리를 해제하지 않는다.
- "Industry" 의 단위(업종 · 직능 · 지역 등)는 **이 문서가 정하지 않는다.** Community 단계 WO 의 업무분석에서 정한다.

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
- 현행 출처 4종(`operator_hub` / `community_snapshot` / `store_direct` / `library_self`)과 이 절의 3+1 경로의 대응은 Store 리팩터링 단계에서 정한다. `My Services` 출처는 신설 후보다.

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
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md) | §2 Canonical Flow(공급자 → 운영자 → 매장 단선) · §6 Drift 금지(공급자 HUB 직접 게시 금지, 매장→공급자 직접 요청 금지) 가 §2-1 · §6 과 충돌 | **판정 대기**. 책임 매트릭스 §3 · 원천/실행 자산 §4 · AI 기준 §5 는 참고 가능하나 근거로 승격하지 않는다 |
| [`PLATFORM-CONTENT-POLICY-V1`](PLATFORM-CONTENT-POLICY-V1.md) (F4) | 3축 모델(Producer / Visibility / ServiceScope)은 유지. `producer='supplier'` 를 "legacy 예외" 로 둔 §3.1 · §6.3 · §10-5 가 §2-1 과 충돌 | FROZEN 유지, 해당 절 UPDATE_REQUIRED (Supplier / Store Hub 단계) |
| [`O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`](O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) | §6 첫 항목(공급자 HUB 직접 제작·게시 금지)이 §2-1 과 충돌 | ACTIVE 유지, §6 UPDATE_REQUIRED |
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
3. Content Boundary Alignment
4. Supplier Workspace
5. Store Workspace (Home · My Store · Store Hub · My Services)
6. Service Operator Workspace
7. Community (Industry Community)
```

순서는 권장이며, 각 단계 WO 가 착수 시점의 fresh census 로 확정한다.

---

## 10. 변경 절차

- 이 문서의 §1~§7 결정을 바꾸는 것은 사업 모델 변경이다. 사용자 명시 지시 + 후속 버전(V2) 으로만 바꾼다.
- 각 단계 WO 는 이 문서를 **상세화**할 수 있으나 **모순되는 결정을 만들 수 없다.** 모순이 필요하면 이 문서를 먼저 개정한다.
- "현재 하지 않는다"(§2-2 제외 경로 · §7 Partner 은퇴)를 "앞으로도 절대 하지 않는다" 로 읽지 않는다 (`CLAUDE.md` Source of Truth 절의 원칙과 동일).

---

*작성: 2026-09-15 · WO-O4O-ROLE-WORKSPACE-REFACTOR-BASELINE-AND-PREFLIGHT-V1*
