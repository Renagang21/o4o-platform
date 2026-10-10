# O4O Canonical Document Index

> **역할**: AI 도구와 무관한 **정본(canonical) 문서 지도**. [`CLAUDE.md`](../CLAUDE.md) 와 [`AGENTS.md`](../AGENTS.md) 는 규칙을 복사하지 않고 이 색인과 각 정본을 가리킨다.
> **작성일**: 2026-09-12 · **최종 갱신**: 2026-10-10 (§1 대표 홈 운영 반영·회원 초기화면 구현 상태 정합 — `WO-O4O-PHARMACY-MEMBER-HOME-V1`) · 2026-10-07 (§9 잔여 판정 대기 3건 최종 판정 — RETAIL-STABLE · E-COMMERCE-ORDER-CONTRACT SUPERSEDED · COSMETICS-DOMAIN-RULES SUPERSEDED → 새 K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1(§5 ACTIVE), 판정 대기 0건 — `WO-O4O-CANONICAL-INDEX-S9-REMAINING-3-FINAL-DISPOSITION-V1`) · 2026-10-06 (§9 판정 6건 반영 — `WO-O4O-CANONICAL-INDEX-S9-POLICY-DECISION-ALIGNMENT-V1`) · 2026-10-05 (§1 DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 등재 · STORE-ACCESS 약국 예외 표기) · 2026-10-04 (정본 최종 정합 — 본문 전수 검증 · 정합 후 20건 ACTIVE 등재 · §9 는 결정이 필요한 문서만 남김 · `WO-O4O-CANONICAL-DOC-FINAL-ALIGNMENT-V1`) · **출처**: 구 `CLAUDE.md` v8 "상세 규칙 문서 목록" + 본문 링크의 합집합

## 0. 이 색인의 규칙

- **기록물은 등재하지 않는다** — `docs/checks/` · `docs/investigations/` · `docs/ir/` · `docs/work-orders/` · `docs/archive/**` 는 과거 시점의 실행 기록이며 현재 정책을 이기지 않는다.
- **등재 ≠ 정본 승격.** 각 행의 상태 열이 사실을 말한다. 문서 본문은 여기 복사하지 않는다.
- **새 `ACTIVE` 등재는 본문 전수 검증 뒤에만 한다** — 상위 정본(이 색인 §1 사업 · 정책 · §2 구조 계약 — 진입점 `CLAUDE.md` / `AGENTS.md` 의 우선순위와 같다) · 같은 주제의 더 최신 문서 · 실제 코드와 충돌하지 않음을 확인한다. 확인 전이거나 충돌 · stale 절이 있으면 §9 `판정 대기`(행에 "등재 후보 — 본문 검증 전" 또는 유효/stale 절 명시)로 둔다.
- 상태 어휘는 4개뿐:

  | 상태 | 뜻 |
  |---|---|
  | `FROZEN` | 구조 변경은 명시적 WO 필수 (버그 수정·문서·테스트는 허용) |
  | `ACTIVE` | 현행 기준 문서 |
  | `ASPIRATIONAL` | 지향 표준 — 신규 화면에 적용, 기존 화면 소급 강제 아님 |
  | `판정 대기` | 현행 사업 경계와 충돌 후보이거나 일부 절이 stale — **기능 복구·확장 금지**, 판정은 별도 WO |

- 행 추가·제거·상태 변경은 별도 WO 로 한다 (`CLAUDE.md` §16-4 준용). 깨진 링크 교정만 인라인 허용.
- 우선순위(충돌 시)는 아래 절 번호 순이 아니라 `CLAUDE.md` / `AGENTS.md` 의 Source of Truth 절이 정한다. 요지: **1절(사업·정책) > 2절(구조 계약) > 나머지 도메인 정본 > 기록물**.
- **역할별 업무공간 리팩터링**(2026-09-15 ~ 2026-09-17)은 8단계 전부 완료되어 `ROLE_WORKSPACE_REFACTOR = CLOSED` 다 ([CHECK](checks/CHECK-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1.md)). 상위 기준은 1절 [O4O-ROLE-WORKSPACE-ARCHITECTURE-V1](baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) 이며 이후 변경은 동 문서 §9 규칙을 따르는 명시적 WO 로만 한다. 아래 행에 `UPDATE_REQUIRED` 잔여는 없다.

---

## 1. 사업 · 정책 (최상위)

| 문서 | 역할 | 상태 |
|---|---|---|
| [O4O-HOME-SERVICE-DISCOVERY-V1](baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md) | 대표 홈 탐색 정책 · 약국 협력사업 표준 용어 · AI 우선 · 용도별 전체 서비스 · Partner 소개 · 준비 중 안내 · Contact Us (2026-10-10, 대표 홈 PR #402 운영 반영·회원 초기화면 PR #414 구현/운영 미반영) | ACTIVE |
| [O4O-ROLE-WORKSPACE-ARCHITECTURE-V1](baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) | **사용자 역할별 업무공간 Architecture SSOT** (2026-09-15) — Community / Store / Supplier / Service Operator 4 업무공간 · 공급·자료의 내 매장 직접 이용(HUB 제거) · Service Operator 공식 경로 · 1 Store : N Services · My Services · Community Workspace(Community Identity ≠ Service Identity · 카탈로그/DB 커뮤니티와 별도 사업 회원 포럼 · Industry Community 폐기) · Store 콘텐츠 유입 3+1 경로 · **Legacy Partner = FULL RETIREMENT** · 리팩터링 실행 규칙(§9). 역할 경계 · 업무공간 · 콘텐츠 유입 · Partner 에 관해 아래 PHILOSOPHY 와 충돌하면 **이 문서가 우선** (§8). Preflight: [IR](ir/IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1.md) | ACTIVE |
| [O4O-BUSINESS-PHILOSOPHY-V1](baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) | 사업 철학 SSOT — 공급자 / 운영사업자 / 매장 정의, HUB 철학, AI 역할, Drift 방지. ROLE-WORKSPACE-ARCHITECTURE 와 동급(역할 경계 · 업무공간 · 콘텐츠 유입 경로는 그 문서 우선). 종전 충돌 절(§3 · §4 · §7 · 주의사항) 은 2026-09-17 Final Census 로 본문 정렬 완료 | ACTIVE |
| [O4O-STORE-COMMERCE-BOUNDARY-V1](baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) | 매장 commerce 경계 SSOT — 소비자→매장 O4O commerce 없음 · 판매 실행 = 외부 POS·외부 채널 · legacy commerce 판정 규칙 · 개발 금지선 · **§15 사업 모델 변경 절차**. cart · checkout · orders · payments · refund · PG · POS · tablet · QR 작업 전 **코드보다 먼저 읽는다** | ACTIVE |
| [O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1](baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) | 공급자→매장 B2B 주문 정본 — `store_cart_items → checkout_orders` 수렴, actor · ownership · serviceKey · lifecycle · 취소 계약. 위 문서의 B2B 축 쌍 | ACTIVE |
| [DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1](design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) | **Neture 약국 매장 commerce 구현 기준** (2026-10-05) — 약국 1 = 내 매장(약국) 신청 · 승인 원장(`neture_pharmacy_memberships`) 1 = 내 매장 1 · 매장 게이트 = 그 원장(Neture 가입 `service_memberships(neture)` 과 별도 — 신청 · 승인 전제로만 읽고 서로 만들거나 바꾸지 않는다) · 약국 협력사업 = 데이터 행(가입 · 담당 운영자) · SPO 하위 복수 공급 제안 · 이용 판정 SSOT · 선택 제안 주문 · 수취 주체별 테스트 결제(실 PG 대기) · §13 인증·가입 트랙 인계 계약 · 사업 회원 Forum·자료함 직접 이용 · 수동 이벤트 2단계 전환 준비 · §15 구현/운영 대기. 위 B2B 계약의 Axis D | ACTIVE |
| [O4O-SUPPLIER-DOMAIN-BOUNDARY-V1](baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) | **Supplier Domain 정본 · FROZEN** (2026-09-26) — Supplier 정의 · 5업무축(Business · Products · Orders · Content · Programs) · Workspace IA · ownership matrix · **Distribution 판정 SSOT**(입력 = `is_public`/`service_keys`/`allowed_seller_ids` + 서비스 승인 · `distribution_type` 은 파생) · Content handoff 계약(멱등성) · Programs 3종 경계 · Identity(`organization_members` canonical) · Business Profile SSOT · 금지선 · DEFERRED(기능 미완성 ≠ architecture 미완성) · 잔재 4분류. 새 Supplier 기능은 이 5축 통과가 선행. 소스 계약 `supplier-domain-boundary.spec.ts` | ACTIVE (FROZEN) |

현재 서비스 재배치 전체 작업: [WO-O4O-NETURE-SERVICE-REALIGNMENT-V1](work-orders/WO-O4O-NETURE-SERVICE-REALIGNMENT-V1.md) — 사용자 확정 기준·반복 대조·T01~T13. 실제 검증·통합·운영 대기: [CHECK](checks/CHECK-O4O-NETURE-SERVICE-REALIGNMENT-V1.md). 과거 역할 리팩터링 CLOSED는 당시 결과이며 이번 재배치 전체 완료를 뜻하지 않는다.

## 2. 구조 계약 · Frozen Baselines

`CLAUDE.md` §14 의 F1~F12 와 그 주변 구조 계약.

| # | 문서 | 역할 | 상태 |
|---|---|---|---|
| F1 | [BASELINE-OPERATOR-OS-V1](baseline/BASELINE-OPERATOR-OS-V1.md) | Operator OS 기술 baseline — security / hub / ai / action-log / asset-copy / operator-ux / admin-ux core | FROZEN |
| F2 | [KPA-UX-BASELINE-V1](baseline/KPA-UX-BASELINE-V1.md) | KPA 3개 서비스 영역 5-Block / 4-Block 통합 UX | FROZEN |
| F3 | [STORE-LAYER-ARCHITECTURE](architecture/STORE-LAYER-ARCHITECTURE.md) | Store Layer 의존 방향 (store-ui-core · store-asset-policy-core · store-core · asset-copy-core · hub-core) | FROZEN |
| F4 | [PLATFORM-CONTENT-POLICY-V1](baseline/PLATFORM-CONTENT-POLICY-V1.md) | HUB 3축 모델 (Producer / Visibility / ServiceScope). §3.1 · §3.2 · §6.3 · §10-5 는 2026-09-16 `WO-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1` 로 정정 — `producer='supplier'` = Canonical (Supplier → Store Hub). HubProducer 는 Store Hub 노출 축, 논리 도메인은 `@o4o/types` `ContentDomain` | FROZEN |
| F5 | [CONTENT-STABLE-DECLARATION-V1](baseline/CONTENT-STABLE-DECLARATION-V1.md) | HUB 콘텐츠 타입 · 매핑 · 병합 로직 · API 계약 | FROZEN |
| F6 | [O4O-BOUNDARY-POLICY-V1](architecture/O4O-BOUNDARY-POLICY-V1.md) | Domain Boundary Matrix + Guard Rules 5개 | FROZEN |
| F7 | ~~NETURE-PARTNER-CONTRACT-FREEZE-V1~~ | **은퇴 — SUPERSEDED (2026-09-15)**. Legacy Partner runtime 전면 은퇴 (`WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1`). 대체: [ROLE-WORKSPACE-ARCHITECTURE](baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7. 물리 스키마·dead package 까지 `WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1`(2026-09-16) 로 정리 완료. 원문은 [archive/obsolete](archive/obsolete/partner/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) 에 보존(현행 계약 아님). F7 번호는 재사용하지 않는다 | — |
| F8 | [NETURE-DISTRIBUTION-ENGINE-FREEZE-V1](baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) | Distribution Tier 3단계 · SERVICE 상태 머신 · Checkout Guard 3계층 | FROZEN |
| F9 | [RBAC-FREEZE-DECLARATION-V1](rbac/RBAC-FREEZE-DECLARATION-V1.md) | RBAC SSOT — `role_assignments` 단일 소스, write-path 통일 | FROZEN |
| F10 | [O4O-CORE-FREEZE-V1](architecture/O4O-CORE-FREEZE-V1.md) | O4O Core — Auth · Membership · Approval · RBAC 4모듈 Core Layer 고정 | FROZEN |
| F11 | [USER-OPERATOR-FREEZE-V1](architecture/USER-OPERATOR-FREEZE-V1.md) | users · service_memberships · role_assignments 3테이블 고정, Operator = membership 기반 | FROZEN |
| F12 | [O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1](baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) | 2계층(Product Resource / Store Production Material) + 6불변식. 상세 설계: [IR](architecture/IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md) · [Persistence Design](architecture/WO-O4O-PRODUCT-CONTENT-RESOURCE-PERSISTENCE-DESIGN-V1.md) | FROZEN |
| — | [UX-CORE-FREEZE-V1](baseline/UX-CORE-FREEZE-V1.md) | UX Core 동결 | FROZEN |
| — | [O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1](baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) | 공통 모듈 · config · sidebar · capability map 변경 시 전 소비처 식별 절차 (raw-source spec 포함) | ACTIVE |
| — | [O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1](architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) | Store Production Material 논리 canonical (`kpa_store_contents` = legacy 물리명) | ACTIVE |
| — | [O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1](architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md) | 매장 콘텐츠 제작 6단계 흐름(대상 선택 → 자료 투입 → 편집기/AI → 용도별 저장 → 템플릿 → 산출물) — AI 단계는 선택(운영 원칙 문서 §3) | ACTIVE |
| — | [STORE-PRODUCTS-CANONICAL-V1](architecture/STORE-PRODUCTS-CANONICAL-V1.md) | Store Products canonical | ACTIVE |
| — | [STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1](baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md) | 매장 자체 상품의 Commerce 연결 금지 경계 | ACTIVE |
| — | [O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1](baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md) | Signage Store Playlist 모델 경계 (KEEP-LEGACY 판정) | ACTIVE |
| — | [O4O-STORE-RULES](architecture/O4O-STORE-RULES.md) | O4O Store & Order 가드레일 — Store Template · 주문 생성은 `checkoutService.createOrder()` 단일 지점 · 독립 주문/결제 테이블 금지. 2026-10-04 본문 정합(Tourism 은퇴 · 런타임 Guard/OrderType 계약 부재 · 소비자 주문 410 표기) | ACTIVE |
| — | [CHECKOUT-STABLE-DECLARATION-V2](baseline/CHECKOUT-STABLE-DECLARATION-V2.md) | B2B checkout · PaymentCore Stable 범위 — `createOrder()` 단일 지점 · payment-first · 서버 기준 금액 검증 · 결제 상태 전이 · `paymentKey` 유일성 · 결제 이벤트 처리 · 매장 서비스 구독 결제. QR 상품 조회는 정보 표시(checkout 아님). V1(B2C closed loop)은 SUPERSEDED (2026-10-06 판정 확정) | ACTIVE |
| — | [DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1](design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md) | `product_ai_contents` = 플랫폼 소유 전역 초안 · 매장 쓰기 금지 · 매장 설명 = `store_local_products.detail_html`. 2026-10-04 정합(매장 내부 AI 은퇴 · POP V2 canonical) | ACTIVE |
| — | [DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1](design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md) | 매장 자료함 · 실행 자산 canonical 축(3서비스 공통) — Hub 복사본 `o4o_asset_snapshots` 도 Store 소유 독립 사본(ROLE-WORKSPACE §6) | ACTIVE |

## 3. Operator · Store UX

| 문서 | 역할 | 상태 |
|---|---|---|
| [OPERATOR-DASHBOARD-STANDARD-V1](platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) | 5-Block 대시보드 · KPI 분류 · Guard · Route 표준. §4-2-A~E(8 Group / 6 Workspace A~F Sidebar)는 SUPERSEDED (2026-09-17) → Sidebar IA 는 ROLE-WORKSPACE-ARCHITECTURE §4 3도메인 | ACTIVE |
| [O4O-OPERATOR-CANONICAL-WORKFLOW-V1](architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md) | 검수·승인 UX | ACTIVE |
| [O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1](baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) | 검수 외 5 Workspace UX (자료 등록 / AI 작업 / 큐레이션 / 매장 지원 / 운영 수익) | ACTIVE |
| [O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1](baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) | 매장 HUB 콘텐츠 게시 표준 (RichTextEditor 기반 항목별 게시 · Source Ingestion 보류). §6 첫 항목(공급자 HUB 직접 게시 금지)은 2026-09-16 삭제 — 공급자 유입은 ROLE-WORKSPACE-ARCHITECTURE §2-1 | ACTIVE |
| [O4O-STORE-MENU-CANONICAL-TREE-V1](baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) | 매장 HUB ↔ 내 매장 메뉴 같은 축 정렬 (6 항목). §1.3(적용 서비스 = catalog `storeWorkspaceEnabled`) · §5.1(출처 4종 ↔ ROLE-WORKSPACE §6 3+1 경로) · SMT-G8 은 2026-09-17 Final Census 로 정정 완료 | ACTIVE |
| [OPERATOR-DATATABLE-POLICY-V1](architecture/OPERATOR-DATATABLE-POLICY-V1.md) | Operator DataTable 정책 | ACTIVE |
| [O4O-OPERATOR-TABLE-CANONICAL-V1](architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md) | Operator Table canonical | ACTIVE |
| [OPERATOR-INTEGRATION-STATE-V1](architecture/OPERATOR-INTEGRATION-STATE-V1.md) | Operator 통합 상태 | ACTIVE |
| [OPERATOR-CORE-DESIGN-V1](architecture/OPERATOR-CORE-DESIGN-V1.md) | Operator Core 설계 (1세대 `@o4o/operator-core` superseded 기록 포함) | ACTIVE |
| [OPERATOR-DASHBOARD-NAVIGATION](platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md) | Operator Dashboard 내비게이션 | ACTIVE |
| [DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1](design/DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1.md) | 매장 실행 관리 — 코너 축 · Placement 모델 (내 매장 playlist 원장 = `store_playlists`) | ACTIVE |
| [DESIGN-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1](design/DESIGN-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1.md) | 매장 상품 상세 정보의 역할 — 2026-10-04 정합(매장 자체 설명 = `detail_html` · `product_ai_contents` 는 전역 초안) | ACTIVE |
| [O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1](platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md) | 운영자 회원 관리 표준 (`/operator/members`) — 운영자 비밀번호 변경 항목은 password 은퇴로 무효 처리(2026-10-04) | ACTIVE |

## 4. 사용자 · 권한

| 문서 | 역할 | 상태 |
|---|---|---|
| [USER-DOMAIN-SSOT-V1](baseline/USER-DOMAIN-SSOT-V1.md) | User 도메인 SSOT — §0 에 현행 identity 축(정본 `users.id` · Google 은 `sub` → `linked_accounts` → `users.id` · `users.email` 은 **이메일·비밀번호 방식에서만** 로그인 ID 이며 Google 조회 키가 아니다 · 이메일 동일성 자동 병합 금지). 레거시 password 축(`service_credentials`·`users.password`) 물리 제거 반영(2026-09-24) · 이메일·비밀번호 병행(`user_password_credentials` users.id 1:1, 2026-09-29 정책 `WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1`) | ACTIVE |
| [O4O-IDENTITY-ARCHITECTURE-V3](architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) | **Identity · 개인정보 Architecture SSOT** (2026-09-17 채택, `WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-CANONICALIZATION-V1`) — 로그인 = **Google + 이메일·비밀번호 병행** · 카카오 추가 정책(2026-10-08, 후속 구현)(Google 은 `sub` → `linked_accounts` → `users.id` · 이메일 방식은 `users.email` + `user_password_credentials` → 같은 `users.id` · 이메일 자동 병합 금지 · 전체관리자(Admin / `platform:*`)는 Google 전용 — password 세션 서버 거부 · 가입은 계정만 생성(membership·role 없음)) · 공통 이름·모바일(2026-10-07 가입 정책 갱신) · Professional Credential 논리/물리(`kpa_pharmacist_profiles` 초기) · `Business ≠ Store ≠ User` 별도 row · Relationship ≠ Authorization(`role_assignments` SSOT · 접근 = Role ∧ Credential ∧ Relationship) · Claim · Public Contact ≠ Connected Channel · Consent · 사업자증빙 예외 · `refresh_tokens = DEAD_RETIRE`. [V2](architecture/O4O-IDENTITY-ARCHITECTURE-V2.md)(서비스별 password L2) · [V1](architecture/O4O-IDENTITY-ARCHITECTURE-V1.md) 은 SUPERSEDED(본문 보존). **2026-09-24**: password 축이 런타임·스키마 양쪽에서 제거돼(`WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`) V3 의 전환 서술을 완료 시제로 정정 — `service_credentials`·`users.password` DROP 완료, REVIEW-8 은 `users.email NOT NULL UNIQUE` 만 잔존. **2026-09-29**: 이메일·비밀번호 로그인 병행 정책 승인(`WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1` §5) — 신규 `user_password_credentials`(bcrypt) · `email_verification_tokens` · `password_reset_tokens` 는 `service_credentials`·`users.password`·서비스별 password 의 부활이 아니다 | ACTIVE |
| [ROLE-POLICY-AND-GUARD-V1](baseline/ROLE-POLICY-AND-GUARD-V1.md) | Role 정책 · Guard baseline (`requireAuth` → `require{Service}Scope`) | ACTIVE |
| [RBAC-CANONICAL-STATE-V1](rbac/RBAC-CANONICAL-STATE-V1.md) | RBAC 현행 canonical 상태 | ACTIVE |
| [RBAC-ROLE-CATALOG-V1](rbac/RBAC-ROLE-CATALOG-V1.md) | 역할 카탈로그 | ACTIVE |
| [RBAC-RUNBOOK-V1](rbac/RBAC-RUNBOOK-V1.md) | RBAC 운영 runbook | ACTIVE |
| [O4O-STORE-OWNER-RBAC-STANDARD-V1](architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md) | 매장 경영자 RBAC 표준 — 권한 원천 = `role_assignments`, 접근 판정 = Role ∧ Relationship([STORE-ACCESS-AND-MEMBERSHIP](baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) 와 정합, 2026-10-04) | ACTIVE |
| [KPA-ROLE-MATRIX-V1](baseline/KPA-ROLE-MATRIX-V1.md) | **KPA Society(`kpa:*`) 역할 문서로 범위 축소** (2026-10-06 판정 확정). `kpa:*` 와 `kpa-branch:*` 는 독립 권한 경계 — "`kpa:admin` · `kpa:operator` 전체 branch 접근" 폐기. KPA-b · KPA-c 절은 과거 기록 | ACTIVE |
| [KPA-BRANCH-ROLE-MATRIX-V1](baseline/KPA-BRANCH-ROLE-MATRIX-V1.md) | **약사 분회 서비스(`kpa-branch:*`) 역할 · 접근 행렬** (2026-10-06) — 서비스 축(`requireKpaBranchScope`) × 분회 축(`branch_memberships` → `requireBranchScope`), 분회 축 우회는 `kpa-branch:admin` · `platform:super_admin` 뿐. 현행 코드 정본화 | ACTIVE |

## 5. 도메인 · 서비스

| 문서 | 역할 | 상태 |
|---|---|---|
| [O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1](baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md) | 메인 이메일 확인 · 공통 로그인과 서비스별 가입/역할 분리 · 모바일/닉네임 · 약국 전용 Store 신청 · 사업자등록증과 면허번호 · 약국 협력사업 개별 조건 · 모든 사용자 서비스 Demo 버튼 · 테스트 데이터 재사용/정리 · 사용자용 전체 로그아웃 제외 · 비밀번호 변경/reset 세션 폐기 · 카카오 추가 · 전체관리자 용어 (2026-10-08 갱신, 단계별 WO에서 구현 상태 확인) | ACTIVE |
| [O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1](baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) | **`*.neture.co.kr` 주소별 사업 의미 SSOT** (2026-10-03) — `kpa` = 약사 대상 분회 · `pharmacy` = 독립 약국 지원 사업자 · `retail`/K-Cosmetics 퇴역 잔여 계약 · `store` = 약국 Store Workspace(serviceKey 없음 · 별도 약국 승인 · Owner/Member 접근 모델) · role prefix(`kpa:*` 등) ≠ 주소 의미. 서비스 목록 · 도메인 기술 정본은 `service-catalog.ts` | ACTIVE |
| [O4O-STORE-ACCESS-AND-MEMBERSHIP-V1](baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) | **공통 Store Workspace 접근 자격 SSOT** (2026-10-03 · 약국 예외 2026-10-05: 약국 매장은 자가 가입 없이 내 매장(약국) 신청 원장 판정) — Owner(기존 `{prefix}:store_owner` 판정 그대로) / Member(`organization_members.role='staff'`) 두 단계 · 초대는 기존 가입자 조회(메일 0 · 토큰 0) · 'invited' 는 접근 0 · 결정 순서(세션→조직→자격→업종 경계) · 새 테이블 0. 한계: 미가입자 초대 · 사업자 신규 가입 제외 | ACTIVE |
| [KPA-SOCIETY-SERVICE-STRUCTURE](baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md) | KPA 3개 화면 영역 공존 구조 (커뮤니티 / 분회 / 데모=제거 완료) — 라우트 위치 ≠ 서비스 소속. v1.1(2026-09-17): Forum = 약사 커뮤니티(communityKey=pharmacy, ROLE-WORKSPACE §5) | ACTIVE |
| [KPA-SIGNAGE-STRUCTURE-V1](baseline/KPA-SIGNAGE-STRUCTURE-V1.md) | KPA Signage 구조 baseline | ACTIVE |
| [SIGNAGE-APPROVAL-ARCHITECTURE-V1](architecture/SIGNAGE-APPROVAL-ARCHITECTURE-V1.md) | Signage 상태 모델 — **Operator 직접 게시가 정본**(2026-10-06 판정 확정): `draft → active` · `active` 로 생성 허용, Admin 승인 불필요. `pending` 승인 흐름은 서비스별 선택 정책. 상태 전이 SSOT = 코드 `ALLOWED_STATUS_TRANSITIONS` | ACTIVE |
| [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3](baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md) | Neture 도메인 아키텍처 (공급자 화면 canonical) | FROZEN |
| [K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1](architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md) | **K-Cosmetics 퇴역 잔여 계약** (2026-10-07) — 퇴역 결정(2026-10-05) · 운영 runtime 제거 완료(1차-A 웹 앱 · 1차-B `/api/v1/cosmetics` · web-store 화면 · admin) 뒤 남은 잔여(catalog identity · `SERVICE_KEYS` · `cosmetics:*` roles · DB 스키마 · migration · Event Offer/B2B · 공통 구조 identity)에만 적용. 규칙 4개: 제거된 runtime 재생성 금지 · 잔여 구조 고정(새 테이블 · Core FK · 개인정보 필드 · 전용 기능 추가 금지) · 정리 승인 경계 · 주문 데이터는 B2B 원장. 구 COSMETICS-DOMAIN-RULES 를 대체. 잔여 정리 완료 시 OBSOLETE | ACTIVE |
| [O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1](baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) | PharmacyHub = KPA류 공통 매장경영 구조 − 공급 승인/매장지원 capability · supplier 역할 없음 | ACTIVE |
| [EVENT-OFFER-COMMON-DOMAIN-V1](baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md) | Event Offer 공통 도메인 | ACTIVE |
| [EVENT-OFFER-STORE-INTEGRATION-V1](baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md) | Event Offer Store 통합 | ACTIVE |
| [EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1](baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md) | Event Offer 에서의 Neture 역할 구분 | ACTIVE |
| [EventOffer-Operation-Policy](event-offer/EventOffer-Operation-Policy.md) | Event Offer 운영 기준 — 승인 계약은 EVENT-OFFER-COMMON-DOMAIN(`pending → approved`) 기준으로 정합(2026-10-04) | ACTIVE |
| [DESIGN-CORE-GOVERNANCE](rules/DESIGN-CORE-GOVERNANCE.md) | 모든 신규 화면은 Design Core v1.0 — 독자 디자인 시스템 금지 | ACTIVE |
| [GLOBAL-HEADER-STANDARD-V1](architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) | 글로벌 헤더 표준 | ACTIVE |
| [O4O-TABLE-STANDARD-BASELINE-V1](baseline/O4O-TABLE-STANDARD-BASELINE-V1.md) | 테이블 지향 표준 | ASPIRATIONAL |
| [O4O-STANDARD-LIST-PHASE1-BASELINE-V1](baseline/O4O-STANDARD-LIST-PHASE1-BASELINE-V1.md) | 리스트 6 유형 분류 · URL 규약 — 리스트 정비 시 유형 분류 선행 | ACTIVE |
| [O4O-SHARED-SPACE-FRAME-PRINCIPLE-V1](architecture/ui-ux/O4O-SHARED-SPACE-FRAME-PRINCIPLE-V1.md) | 공유 공간(홈 등) 프레임 구조 원칙 — `packages/shared-space-ui` | ACTIVE |
| [O4O-SHARED-SPACE-STANDARD-BLOCKS-V1](architecture/ui-ux/O4O-SHARED-SPACE-STANDARD-BLOCKS-V1.md) | 공유 공간 표준 블록 | ACTIVE |
| [O4O-TEMPLATE-PRESETS](design/O4O-TEMPLATE-PRESETS.md) | 서비스 Template Preset — 값의 기준은 registry(`packages/shared-space-ui/src/templates.ts`) | ACTIVE |
| [O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1](baseline/O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1.md) | 공공데이터 seed 상위 원칙 — 규제 존재 ≠ 유통 정보 | ACTIVE |
| [O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1](architecture/O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1.md) | **유통참여형 펀딩(Market Trial) 도메인 경계 SSOT** (2026-06-19) — content-only: 콘텐츠 편집 · 게시 · 참여 신청 · 현황까지. O4O 주문 · 결제 · 정산 · 발송 연결은 폐기 | ACTIVE |
| [O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1](architecture/O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1.md) | 유통참여형 펀딩 settlement/payment 기록 정책 (2026-06-19, content-only 경계 기준) — O4O 정식 결제 · 정산 이력이 아니라 **오프라인 입금 확인 · 참여 처리 상태 기록이며 삭제 대상이 아니다** | ACTIVE |
| [O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1](architecture/O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1.md) | 위 정책의 하위 — 오프라인 입금 확인일(`paidAt`) 보존 · 감사 정책 | ACTIVE |
| [O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1](baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md) | 유통참여형 펀딩 초기 운영 모델 — 제품 정산 · 매장 랜딩 · 첫 주문 추적 절은 content-only 경계로 폐기 표기(2026-10-04), 사람 중심 운영 · 오프라인 입금 확인은 유효 | ACTIVE |
| [O4O-FORM-STANDARD-BASELINE-V1](baseline/O4O-FORM-STANDARD-BASELINE-V1.md) | 폼 지향 표준 | ASPIRATIONAL |

## 6. 플랫폼 공통 구조 · 콘텐츠 · APP

| 문서 | 역할 | 상태 |
|---|---|---|
| [o4o-common-structure](o4o-common-structure.md) | forum · lms · signage 는 플랫폼 공통 구조 — KPA 가 reference implementation, 데이터는 serviceKey 격리 | ACTIVE |
| [CONTENT-CORE-OVERVIEW](platform/content-core/CONTENT-CORE-OVERVIEW.md) | Content Core — 단일 출처 · Core 불변 · 이벤트 기반 통신 | ACTIVE |
| [CONTENT-META-PRODUCTION-READY-V1](platform/content/CONTENT-META-PRODUCTION-READY-V1.md) | Content meta 계약 — working copy = `kpa_store_contents` · `o4o_asset_snapshots`(`@o4o/types` content-meta) | ACTIVE |
| [O4O-HUB-TEMPLATE-STANDARD-V1](platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md) | HUB Template 표준 | ACTIVE |
| [HUB-UX-GUIDELINES-V1](platform/hub/HUB-UX-GUIDELINES-V1.md) | Hub UX 규칙 | ACTIVE |
| [EXTENSION-GENERAL-GUIDE](platform/extensions/EXTENSION-GENERAL-GUIDE.md) | Extension 개발 일반 가이드 | ACTIVE |
| [APP-CONTENT-STANDARD-SPEC](architecture/APP-CONTENT-STANDARD-SPEC.md) | APP-CONTENT 표준 UI 스펙 (`CLAUDE.md` §13-A) — 색상 SSOT = `CONTENT_SOURCE_COLORS` 상수 | ACTIVE |
| [APP-STANDARD-LIST-AND-MATRIX](architecture/APP-STANDARD-LIST-AND-MATRIX.md) | 앱 단위 표준 목록 · 서비스 매트릭스 — Neture Signage = 미채택(2026-06-13 결정) | ACTIVE |
| [APP-LMS-BASELINE](architecture/APP-LMS-BASELINE.md) | APP-LMS baseline — 백엔드 공통, 프론트 공통화는 후속 (APP-CONTENT / SIGNAGE / FORUM 은 Frozen) | ACTIVE |
| [LMS-CORE-EXTENSION-PRINCIPLES](platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md) | LMS Core / Extension 원칙 | ACTIVE |
| [LMS-SCOPE-GUARD](architecture/LMS-SCOPE-GUARD.md) | LMS Scope Guard 설계 | ACTIVE |
| [LMS-CLIENT-CONVENTION-V1](architecture/LMS-CLIENT-CONVENTION-V1.md) | LMS Client 규약 | ACTIVE |
| [O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1](architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md) | Guide sectionKey 충돌 정책 | ACTIVE |
| [O4O-GUIDE-SCHEMA-VALIDATION-V1](architecture/O4O-GUIDE-SCHEMA-VALIDATION-V1.md) | Guide Schema Validation | ACTIVE |
| [O4O-GUIDE-PAGE-KEY-CATALOG-V1](architecture/O4O-GUIDE-PAGE-KEY-CATALOG-V1.md) | Guide pageKey 카탈로그 | ACTIVE |
| [O4O-AI-USAGE-FLOW-BASELINE-V1](baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) | O4O AI 활용 흐름 baseline (Home AI · 편집기 AI 계약 · §15 매장 콘텐츠 AI 위치) | ACTIVE |
| [O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1](baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md) | **매장 콘텐츠 제작 운영 원칙 SSOT** — 사용자 외부 AI(ChatGPT/Gemini/Claude)=Creative/Strategy · O4O=표준 제작환경(Execute/Manage/Reuse) · 내부 AI=선택적 보조(필수 단계 아님) · provider 중립 · Media Library/VIDEO Job/Temp Output 재사용 · 파일럿 ≠ Canonical | ACTIVE |
| [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) | **AI 자동화 진화 원칙 SSOT** — 사용자 행동은 학습 자료 · 목적/결과가 기준 · 완전 자동화가 아닌 시간 절감 · takeover 는 학습 신호 · 사이트별 업무 사전 정의 금지 · AI=발견/판단, Runtime=검증된 실행. Local Agent · Browser DOM · Computer Use · Site Adapter · Workflow · 주문/회계 자동화 등 **모든 자동화 WO 의 상위 기준** (§25 현행 정렬 상태) | ACTIVE |
| [O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2](baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) | **O4O Personal Work Assistant 구조 정본** — EVOLUTION-PRINCIPLES 의 하위(왜 → 어떤 구조로). 최상위 제품 = Personal Work Assistant · ONE Assistant · 구조의 중심 = Assistant / 자산의 중심 = Experience · Assistant Planning ≠ Execution Planning · Task 1급 객체(완료 계약 ≠ KPI) · Skill = 검증된 Experience 의 승격(사전 정의 금지) · **개인화 P3 — 표준 Workflow 를 만들지 않는다(Shared = 추천 후보 · 강제 아님, §0-1)** · Strong Discovery = 하위 Discovery capability · **Memory Ownership-first(organization/user/run/node)** · PC = Execution Node · Request Device ≠ Execution Device · 발주 확정 = 사용자 직접 승인 · Cloud Browser 인증 세션 불허 · §17 Compliance Gate(실사용 확대 전 점검 · 개발 차단 조건 아님) · **개발 순서 §18(A Assistant+Task → …)**. ARCHITECTURE-V1 대체(§21 승계표) | ACTIVE |
| [O4O-AUTOMATION-EXPERIENCE-MODEL-V1](baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) | **Automation Experience 개념 모델 · 저장 계약** — V2 의 하위(Experience 상세). Task type · Target · Run · Step(Observation → Decision → Action → Result, **stage 중심**) · User Assistance(구조만 · 원문 미저장) · Knowledge ≠ Experience ≠ Skill · Outcome 근거 3등급 · Failure 원인 층(runtime 실패는 절차 신뢰도 불감소) · 최소 저장 집합 · 민감정보 분류. **2026-10-03 V2 정합 개정**(§0-1 — D1 범위 축소 · 저장 위치는 V2 §9 · Phase 동결) | ACTIVE |
| [O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1](baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md) | **Assistant Memory 배치 · 보존 정책** — V2 §9 · §17 의 세부. 기억 종류별 소유 · 배치(Cloud 후보 M3 검증된 방법 · M4 절차 · M5 재개 구조 / Node 유지 / 저장 금지) · 보존 · 삭제 · 조직 이탈 원칙 · 처리방침/이용계약 Gap · 사용자 결정 D1~D5 · 구현 범위(§9 — Cloud Continuity 구현 상태 표) | DRAFT (D1·D2·D4 결정 · D3·D5 법률 확인 대기 · Compliance Gate PENDING = 실사용 확대 전 점검 · §9 구현 진행) |

## 7. 운영 · 환경 · 절차

| 문서 | 역할 | 상태 |
|---|---|---|
| [SETUP.md](../SETUP.md) | 개발환경 · 설치 · 검증 명령 · CI 게이트 · Cloud SQL Proxy · 포트 — **환경 관련 유일 정본** | ACTIVE |
| [COLLABORATOR-START-HERE](development/COLLABORATOR-START-HERE.md) | 새 공동개발자(사람) 진입점 — O4O 관점 · 저장소 읽는 법 · 첫 대상(neture.co.kr Main O4O Agent) · Production 경계. 규칙 원문은 정본을 가리키기만 한다 | ACTIVE |
| [refactoring/status](refactoring/status.md) | 리팩토링 현황 요약(임시) — 정리 완료 · 진행 중 · 판정 대기 · 알려진 legacy. 정본을 대체하지 않고 근거로 링크만 한다. 리팩토링 종료 시 은퇴 (`WO-O4O-DOCS-ONBOARDING-ENTRY-V1`) | ACTIVE |
| [O4O-GIT-PARALLEL-WORK-SAFETY-V1](baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) | 다중 PC · 다중 세션 Git 안전 — path-specific stage · Safe Commit · PC 이동 · 완료 조건 | ACTIVE |
| [PRODUCTION-MIGRATION-STANDARD](baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) | 프로덕션 마이그레이션 표준 (CI/CD 자동 실행 원칙) | ACTIVE |
| [O4O-API-SERVER-SCRIPTS-INVENTORY-V1](baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md) | `apps/api-server/src/scripts/**` 상태 분류(ACTIVE · PAUSED · LEGACY) · DB 로그인 identity fail-fast 규칙 | ACTIVE |
| [O4O-API-OPERATIONS-RUNBOOK-V1](baseline/operations/O4O-API-OPERATIONS-RUNBOOK-V1.md) | `o4o-core-api` 상시 운영 점검 최소 기준 — health · 배포 반영 · 인증 · API 오류/지연 · DB · 읽기 캐시(in-process — `o4o-core-api` 는 Redis 를 쓰지 않는다). Internal Beta 종료(2026-10-06 판정 확정)로 INTERNAL-BETA-RUNBOOK-V1 을 대체 | ACTIVE |
| [DEBUG-SSR-TEST-PAGE-GUIDE-V1](platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md) | JSON 디버그 SSR 테스트 페이지 — 비프로덕션 · 읽기 전용, 상태 변경은 CLI(`CLAUDE.md` §8) | ACTIVE |
| [O4O-DATA-CLEANUP-IDENTIFICATION-SAFETY-V1](baseline/operations/O4O-DATA-CLEANUP-IDENTIFICATION-SAFETY-V1.md) | 데이터 정비 대상 식별 안전 규칙 — UUID prefix 삭제 금지 · 운영 DB 는 read-only 확인만 | ACTIVE |
| [PLAYWRIGHT-MCP](platform/development/PLAYWRIGHT-MCP.md) | Playwright MCP 개발 환경 설정 (config 템플릿 기준) | ACTIVE |
| [DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1](rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) | 문서 상태 · archive · 헤더 형식 정본 | ACTIVE |
| [ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01](reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md) | TypeORM Entity ESM 규칙(type-only import + 문자열 관계)의 근거 분석 | ACTIVE |
| [O4O-PRIVACY-DATA-RETENTION-POLICY-V1](baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) | 개인정보 보유기간 정책 SSOT (2026-09-17 확정) — 문의 1년 · 이메일 로그 1년 · 로그인 시도 30일 · 접속·감사기록 1년(민감정보 시스템 2년) · AI 메타 1년 · 백업 7일 · 수동 export 30일 · 전자상거래 기록은 거래 개시 시. 처리방침 v1.0 보유기간 항목과 집행 WO 의 단일 기준 | ACTIVE |
| [O4O-PRIVACY-POLICY-V1.0](baseline/O4O-PRIVACY-POLICY-V1.0.md) | 개인정보 처리방침 v1.0 게시 원문 SSOT (시행 2026-09-17 · 15개 조 · 보호책임자 서철환) — 활성 4 서비스(neture · kpa-society · k-cosmetics · pharmacy-hub) 공통 · 런타임 본문은 `service_policy_documents`(privacy/published) · Footer 책임자는 `service_legal_profiles`. 관련: [RETENTION-POLICY-V1](baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) · [IR RUNTIME-DATA-FLOW-CENSUS](investigations/IR-O4O-PRIVACY-POLICY-RUNTIME-DATA-FLOW-CENSUS-V1.md) · [CHECK RETENTION-ENFORCEMENT](checks/CHECK-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1.md) · 게시 검증 [CHECK PUBLISH-AND-CROSSSERVICE-SMOKE](checks/CHECK-O4O-PRIVACY-POLICY-V1-PUBLISH-AND-CROSSSERVICE-SMOKE.md) | ACTIVE |
| [O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0](baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md) | O4O 통합 서비스 이용약관 v1.0 게시 원문 SSOT (시행·공고 2026-09-17 · 5장 23조 + 부칙 3조 · 정책결정 10/10 확정) — 활성 4 서비스(neture · kpa-society · k-cosmetics · pharmacy-hub) 공통 · 런타임 본문은 `service_policy_documents`(terms/published · 서비스별 row · 4/4 v1 published 2026-09-18) · 약관 페이지 Neture·KCos·PH `/terms` · KPA `/policy` · 동의 이력은 `user_policy_acceptances`(기존 회원 명시적 재동의 428 게이트 · 가입 시 저장). 관련: [IR RUNTIME-CONTRACT-CENSUS](investigations/IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1.md) · [WO ACCEPTANCE-AND-SIGNUP-ALIGNMENT](work-orders/WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1.md) · [CHECK ACCEPTANCE](checks/CHECK-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1.md) · 게시 검증 [CHECK PUBLISH-AND-ACCEPTANCE-SMOKE](checks/CHECK-O4O-INTEGRATED-TERMS-V1-PUBLISH-AND-ACCEPTANCE-SMOKE-V1.md) | ACTIVE |
| `docs/local/TEST-ACCOUNTS.local.md` | 검증용 테스트 계정 SSOT — **로컬 전용 · git 미추적** · 자격증명 하드코딩 금지 | ACTIVE |

## 8. 콘텐츠 저작 진입점

| 문서 | 역할 | 상태 |
|---|---|---|
| [guides/common/DOCUMENT-INDEX](guides/common/DOCUMENT-INDEX.md) | 설명서 · QR · POP · 블로그 · 동영상 등 콘텐츠 규칙의 **단일 진입점** (common / content-authoring / ai / products / services 5축, Rule Registry CR/DR/AR). 하위 규칙(예: [STORE-PRODUCT-DESCRIPTION-POLICY](guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md) → [DRUG-WRITING](guides/products/drug/DRUG-WRITING.md))은 그 문서가 관리한다 — 여기 복제하지 않는다 | ACTIVE |

## 9. 판정 대기 · 상태 주의

| 문서 | 상황 | 상태 |
|---|---|---|
| [O4O-3-ROLE-FLOW-BASELINE-V1](baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) | 3자 Canonical Flow (책임 매트릭스 · 원천 자료 vs 실행 자산 · AI 개입 지점). **§2 단선 흐름 · §6 첫 항목(공급자 HUB 직접 게시 금지) · §3 공급자 직접 제작 ❌ 는 2026-09-16 판정 확정 → [ROLE-WORKSPACE-ARCHITECTURE](baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §2-1 · §6 으로 SUPERSEDED** (헤더 표기, 본문 보존). §4 · §5 는 참고만, 근거로 승격하지 않는다 | 부분 SUPERSEDED (판정 확정) |

현재 `판정 대기` 문서는 **0건**이다(2026-10-07). 위 행은 판정이 끝난 부분 SUPERSEDED 문서의 상태 주의 표기다.

**판정 해제 기록 (2026-10-07, `WO-O4O-CANONICAL-INDEX-S9-REMAINING-3-FINAL-DISPOSITION-V1`)** — 아래 3건을 현재 main 의 코드 · 상위 정본과 본문 전체를 대조해 판정하고 §9 에서 뺐다. 세 문서 모두 기록물이 되어 색인에 등재하지 않는다(§0) — Cosmetics 잔여 규칙은 새 문서로 분리해 §5 에 등재했다. 각 문서 상단에 상태 줄을 달았고 본문은 보존했다.

| 문서 | 판정 근거 | 결과 |
|---|---|---|
| [O4O-RETAIL-STABLE-V1](platform/architecture/O4O-RETAIL-STABLE-V1.md) | COMMERCE-BOUNDARY §8 판정 = `LEGACY_COMMERCE`, 은퇴 완료 — 자체 storefront 목록 철거 · 결제 `410` · 주문 생성 `POST /checkout` `410 STORE_CONSUMER_ORDER_RETIRED`. §3 판매 한도 · §5 TTL cleanup 은 코드에 없다. 남는 B2C visibility 조건은 QR 제품 랜딩 상세의 read-only 노출 필터(정보 표시, COMMERCE-BOUNDARY §4) | SUPERSEDED → [COMMERCE-BOUNDARY](baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) (§1) · PaymentCore 는 [CHECKOUT-STABLE-V2](baseline/CHECKOUT-STABLE-DECLARATION-V2.md) §2-2 (§2). FROZEN 해제 |
| [E-COMMERCE-ORDER-CONTRACT](baseline/E-COMMERCE-ORDER-CONTRACT.md) | 유효했던 두 규칙(`checkoutService.createOrder()` 단일 지점 · 독립 `*_orders` / `*_payments` 금지)은 CHECKOUT-STABLE-V2 §2 · `CLAUDE.md` §4 가 그대로 정한다 — **규칙은 유지, 문서만 교체**. `OrderType` 열거 · 서비스별 정책 · `/checkout/initiate` 예시는 stale | SUPERSEDED → [CHECKOUT-STABLE-V2](baseline/CHECKOUT-STABLE-DECLARATION-V2.md) §2 · [B2B 계약](baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) (§1) |
| [COSMETICS-DOMAIN-RULES](architecture/COSMETICS-DOMAIN-RULES.md) | K-Cosmetics 는 퇴역 **결정**(사용자 결정 2026-10-05, [DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1](design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §14)됐고 운영 runtime 은 제거 완료 — 1차-A 가 독립 웹 앱, 1차-B(PR #339)가 `/api/v1/cosmetics` · web-store 화면 · admin 을 삭제. 그러나 1차-B DEFER 잔여(catalog identity · serviceKey · `cosmetics:*` roles · DB 스키마 · migration · Event Offer/B2B)가 남아 OBSOLETE(전제 소멸) 아님. 본문(독립 API · DB · 웹 전제)은 전부 stale 이라 ACTIVE 로 둘 수 없어(§0) 잔여 규칙만 새 문서로 분리. `cosmetics_members` FK · 매장 신청 연락처 · 사업자번호 필드 = **현행 구조를 기준선으로 인정**, 새 테이블 · Core FK · 개인정보 필드 · 전용 기능 추가 금지, 기존 처리는 퇴역 작업 | SUPERSEDED → [K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1](architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md) (§5 ACTIVE · 잔여 정리 완료 시 OBSOLETE). `CLAUDE.md` §9 문구 정리 |

**판정 해제 기록 (2026-10-06, `WO-O4O-CANONICAL-INDEX-S9-POLICY-DECISION-ALIGNMENT-V1`)** — 아래 6건은 사용자 판정이 확정되어 §9 에서 뺐다. 기록물이 된 문서는 색인에 등재하지 않는다(§0).

| 문서 | 판정 | 결과 |
|---|---|---|
| SIGNAGE-APPROVAL-ARCHITECTURE-V1 | Operator 직접 게시 정본 · `pending` 은 서비스별 선택 | ACTIVE — §6 |
| KPA-ROLE-MATRIX-V1 | `kpa:*` / `kpa-branch:*` 분리 유지 · KPA Society 로 범위 축소 | ACTIVE — §4 (+ 새 KPA-BRANCH-ROLE-MATRIX-V1) |
| [CHECKOUT-STABLE-DECLARATION-V1](baseline/CHECKOUT-STABLE-DECLARATION-V1.md) | Stable 범위를 B2B checkout · PaymentCore 로 축소 | SUPERSEDED → V2 (§2) |
| [INTERNAL-BETA-RUNBOOK-V1](baseline/operations/INTERNAL-BETA-RUNBOOK-V1.md) | Internal Beta 종료 | SUPERSEDED → O4O-API-OPERATIONS-RUNBOOK-V1 (§7). `BETA_MODE` · 미계측 `OPS` 상수 정리는 후속 코드 WO |
| [ALPHA-STATUS-DISPLAY-STANDARD](platform/ALPHA-STATUS-DISPLAY-STANDARD.md) | 운영형 알파 표시 의무 종료 | OBSOLETE(대체 문서 없음 — 전제 폐기). F4 §12 의 "0.80 운영형 알파" 는 시점 기록으로 정정 |
| [BUSINESS-SERVICE-RULES](architecture/BUSINESS-SERVICE-RULES.md) | "OpenAPI 계약 우선" 폐기 | OBSOLETE. `CLAUDE.md` §9 문구 삭제 |

---

*이 색인은 `docs/README.md`(폴더 구조 안내) 와 `docs/baseline/README.md` 를 대체하지 않는다. 세 문서의 관계 정리는 후속 docs 정비 범위.*
