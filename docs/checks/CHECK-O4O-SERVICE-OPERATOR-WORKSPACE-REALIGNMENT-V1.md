# CHECK-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1

> **WO**: `WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1` (실행본 §1–§30, 사용자 확정 · 2026-09-16)
> **일자**: 2026-09-16 · **기준 main**: `7f4f6eb26` (Store Workspace CLOSED `fb08c0dd1`/`052855eb6` 이후 — 과거 SHA 재사용 없이 fresh census)
> **성격**: 표준 Service Operator 최상위 IA 재정렬(서비스 운영 / 사업 운영 / 운영 관리, **메뉴 항목 단위** 분류) + operator-services 기반 다중 서비스 전환 + Supplier → Service Operator 수신함 + 대시보드 3도메인 재편 + Neture SPECIAL 보존. 새 테이블 0 · migration 0 · schema 변경 0 · RBAC/Membership Core 변경 0 · 공통 셸 재작성 0 · package.json/lockfile 변경 0 · 프로덕션 write 0.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §2-1 · §4 · §4-1 · §4-2(신설) · §9-1(6단계) · 선행 [`CHECK-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1`](CHECK-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1.md) · [`CHECK-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1`](CHECK-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1.md) · [`CHECK-O4O-SERVICE-TENANT-FOUNDATION-V1`](CHECK-O4O-SERVICE-TENANT-FOUNDATION-V1.md)
> **구현 commit**: `5e8e137a3` (2026-09-16 · Deploy Web Services 6/6 success · **Deploy API Server = failure** — `7f4f6eb26` 부터 이어지는 migration Job(`expected-schema-states` 5번째 미등록, 타 세션 PHASE 1) 실패로 프로덕션 API 는 `fb08c0dd1` 에 머묾. 본 WO 는 backend runtime 변경 0(테스트 spec 만)이라 smoke 에 영향 없음 — `operator-services` 는 Service Tenant Foundation 때 이미 배포됨. 정정 2026-09-16: 최초 기록의 "Deploy API Server success" 는 오기 · CI Pipeline 은 직후 타 세션 push `c01bd80f1` 의 concurrency 로 cancelled)

---

## 0. 한 줄 결론

`OperatorAreaShell` · `DomainIASidebar` · `OperatorDashboardLayout` · `DataTable` 은 한 줄도 재작성하지 않고, **IA 메타데이터**(`@o4o/operator-ux-core` `DEFAULT_OPERATOR_DOMAIN_IA` = `service_operation / business_operation / operations_management`)와 **서비스 메뉴 config 의 항목 단위 `domain` override**(`OperatorMenuItem.domain`, additive · 표시 전용)만으로 KPA Society · K-Cosmetics · Pharmacy-Hub 운영자 화면의 최상위 IA 를 **서비스 운영 / 사업 운영 / 운영 관리** 로 재정렬했다. 그룹 키로 일괄 이동하지 않았다 — KPA `approvals` 안의 공급자 콘텐츠 승인은 서비스 운영, 상품 신청 · 이벤트 오퍼 · 판매자 모집 노출 승인은 사업 운영으로 **항목 단위 분리**했다(K-Cos 매장 가입 신청 · PH 가입 신청도 서비스 운영). 다중 서비스 운영자는 기존 `GET /api/v1/work-scope/operator-services` 하나를 출처로 공통 `OperatorServiceSwitcher`(header 슬롯, 2개 이상일 때만) + 대표 홈 "서비스 운영자 화면"(role 파싱 제거) 으로 전환한다 — 새 membership 테이블 0 · role 시스템 0. Supplier → Service Operator 제공 콘텐츠는 **서비스 운영 › 제공받은 콘텐츠**(KPA = 기존 `/operator/approvals` 자체 승인 유지, K-Cos · PH = 공통 `SupplierContentInbox` `/operator/supplier-contents`, 공통 CMS serviceKey 경계 + 기존 상태 전이만)로 받는다 — 새 원장 · 통일 state machine 없음. 구 "커뮤니티 운영 / 매장 HUB 운영 / 운영 공통" 은 표준 서비스에서 RETIRED, Neture 는 SPECIAL(자체 IA) 보존.

---

## 1. Fresh Census (§4) — origin/main `7f4f6eb26`

### 1-1. Operator 표면 판정표

| 표면 | 서비스 | 현행(착수 시점) | 판정 | 처리 |
|---|---|---|---|---|
| `OperatorAreaShell` (`@o4o/operator-ux-core/layout`) | 공통 | header 슬롯 + `DomainIASidebar` + Outlet | **KEEP (무수정)** | 서비스 wrapper 가 header 슬롯에 `OperatorServiceSwitcher` 를 합성 |
| `DomainIASidebar` | 공통 | `groupToDomain[group] === domain` 으로 그룹 단위 배치 · 구 default IA(community/store_hub/common) | **KEEP + 최소 수정** | 항목 단위 해석 `item.domain ?? groupToDomain[group]` (규칙은 `operatorDomainIA.resolveDomainGroupItems` 한 곳) · collapsible/React key 를 `${domain}:${group}` 로 · 표준 3도메인 헤딩 아이콘 3종 추가. 서비스별 if 0 |
| `operatorDomainIA.ts` `DEFAULT_OPERATOR_DOMAIN_IA` | 공통 | 커뮤니티 운영 / 매장 HUB 운영 / 운영 공통 | **REPLACE (표준 IA)** | 서비스 운영 / 사업 운영 / 운영 관리 · 그룹 기본값 + `groupOrder` 에 approvals 가 두 도메인 |
| `OperatorMenuItem` (`@o4o/ui` operator-shell) | 공통 | `label/path/exact/sectionLabel` | **EXTEND (additive)** | `domain?: string` |
| `OperatorDashboardLayout` · 5-Block · `DataTable` | 공통 | — | **KEEP (무수정)** | — |
| `AxisNavigationSection` (`@o4o/operator-core-ui`) | 공통 | 2축 카드(md 2열) | **KEEP + 최소 수정** | 3축 이상 xl 3열 · 아이콘 compass/briefcase/sliders-horizontal |
| KPA `operatorMenuGroups.ts` · `KpaOperatorLayoutWrapper` · `KpaOperatorDashboard` | KPA | default IA · 2축 대시보드(커뮤니티 운영 / 매장 HUB 운영) | **STANDARD_CANDIDATE** | approvals 항목 override · 3도메인 축 · switcher |
| K-Cos `operatorMenuGroups.ts` · `OperatorLayoutWrapper` · `KCosmeticsOperatorDashboard` | KCos | default IA · 2축(매장 HUB 운영 / 콘텐츠 운영) | **STANDARD_CANDIDATE** | approvals 항목 override · 수신함 진입 · 3도메인 축 · switcher |
| PH `operatorMenuGroups.ts`(`PHARMACY_HUB_OPERATOR_DOMAIN_IA`) · `OperatorLayoutWrapper` · `OperatorDashboardPage` | PH | 서비스 전용 IA(가입·회원 운영 / 커뮤니티 운영 / 운영 공통) | **STANDARD_CANDIDATE — 전용 config RETIRE** | 기본 IA 채택 · approvals 항목 override · 수신함 진입 · quick action 정렬 · switcher |
| Neture `operatorMenuGroups.ts`(`NETURE_OPERATOR_DOMAIN_IA`) · `OperatorLayoutWrapper` | Neture | 공급·유통 / 커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통 | **SPECIAL — KEEP** | IA 무변경 · switcher 만 합성 |
| kpa-branch 운영 화면(`/{slug}/operator/*`) | kpa-branch | 분회 slug 아래 · workspaceMode `none` | **NO_STORE_WORKSPACE/특수 — 무변경** | switcher 는 이름만 표시(경로 추측 금지) · 대표 홈은 내 분회 slug 있을 때만 |
| cafe24-b2b | — | `undecided` · operator role 없음 | **UNDECIDED — 무변경** | 노출 0 |
| `GET /api/v1/work-scope/operator-services` (`service-tenant.resolver.ts`) | 공통 | role_assignments(`{prefix}:admin|operator`, active) ∧ service_memberships(active) · catalog workspace metadata | **KEEP — 유일 출처** | 프런트 소비 2곳 신설(switcher · 대표 홈) |
| 대표 홈 `home-entry.ts` 운영자 그룹 | Neture | `user.roles` 를 프런트에서 파싱(`ROLE_PREFIX_TO_SERVICE`) | **REPLACE** | `/work-scope/operator-services` 만 사용 · role 파싱 상수 제거 |
| Supplier 제공 측(`SupplierContentService.submit` · `supplier-library-handoff.service`) | 공통 | cms_contents `authorRole='supplier'` · KPA 만 `kpa_approval_requests` | **KEEP (무수정)** | — |
| Supplier 수신 측 | KPA | `/operator/approvals`(SupplierContentApprovalPage · kpa_approval_requests) | **KEEP — KPA 고유 승인 정책** | 라벨 `제공받은 콘텐츠 승인` · 서비스 운영 배치 |
| Supplier 수신 측 | KCos · PH | **없음** (cms 행은 생기지만 운영자 화면 부재 — `CmsContentManager` 는 notice/news 탭만) | **MISSING_IMPLEMENTATION → 최소 공통 inbox** | `SupplierContentInbox` + `/operator/supplier-contents` |

### 1-2. 메뉴 항목(route/page) 단위 분류표 (§9 · §10)

라벨 = 현재 사이드바 라벨 · 판정 근거 = route 의 업무 의미(그룹 키 아님). `domain` 열은 그룹 기본값과 다를 때만 override 를 명시.

| 서비스 | 그룹 | 항목 (path) | 업무 의미 | 도메인 | override |
|---|---|---|---|---|---|
| KPA | users | 회원 관리 `/operator/members` | 회원 | 서비스 운영 | — |
| KPA | approvals | 공급 상품 신청 승인 `/operator/product-applications` | 상품 취급 승인 | 사업 운영 | (그룹 기본) |
| KPA | approvals | **제공받은 콘텐츠 승인** `/operator/approvals` | 공급자 제공 콘텐츠 수신·승인 | **서비스 운영** | `domain:'service_operation'` |
| KPA | approvals | 이벤트 오퍼 승인 `/operator/event-offers` | 사업 프로그램 승인 | 사업 운영 | — |
| KPA | approvals | 판매자 모집 노출 승인 `/operator/recruitment-exposure` | 사업 프로그램 승인 | 사업 운영 | — |
| KPA | products / orders | 상품 현황 · 주문 현황 | 상품 · 주문 | 사업 운영 | — |
| KPA | stores | 매장 관리 · 채널 관리 | 가맹점(매장) 관리 = 회원 관리 축 | 서비스 운영 | — |
| KPA | stores | 매장 HUB 블로그 · POP · QR-code · 동영상 · 다국어 상품 콘텐츠 · 태블릿 화면 | 매장 지원 콘텐츠 | 서비스 운영 | — |
| KPA | content | 공지사항/뉴스 · Home 편집 · 콘텐츠 허브 · 설문조사 · 협업 문의 | 공지 · 서비스 콘텐츠 · 설문 · 문의/협업 | 서비스 운영 | — |
| KPA | resources / lms / signage / forum | 자료실 · 강의/강사 승인/안내 문구 · HQ 미디어/플레이리스트/템플릿/강제 콘텐츠 · 포럼 5 | 자료 · 교육 · 사이니지 자료 · 포럼 | 서비스 운영 | — |
| KPA | analytics / system | AI 리포트 · 운영 분석 · 감사 로그 · 역할 관리 | 분석 · 감사 · 운영 정책 | 운영 관리 | — |
| KCos | approvals | **매장 가입 신청 관리** `/operator/applications` | 가맹점 가입 = 회원 관리 축 | **서비스 운영** | `domain:'service_operation'` |
| KCos | approvals | 공급 상품 신청 승인 · 이벤트 오퍼 승인 · 판매자 모집 노출 승인 | 사업 프로그램 승인 | 사업 운영 | — |
| KCos | stores | 내 매장(store-cockpit) · 매장 관리 · 채널 관리 · HUB 블로그/POP/QR | 가맹점 관리 · 매장 지원 콘텐츠 | 서비스 운영 | — |
| KCos | content | 공지사항/뉴스 · Home 편집 · 설문조사 · 문의 관리 · **제공받은 콘텐츠**(신설 `/operator/supplier-contents`) | 서비스 콘텐츠 · 문의 · 공급자 제공 수신 | 서비스 운영 | — |
| KCos | products / orders | 상품 현황 · 주문 현황 | | 사업 운영 | — |
| KCos | resources / lms / signage / forum | (KPA 와 동일) | | 서비스 운영 | — |
| KCos | analytics | AI 리포트 · 운영 분석 | | 운영 관리 | — |
| PH | approvals | **가입 신청 관리** `/operator/memberships` | 회원 가입 승인 | **서비스 운영** | `domain:'service_operation'` |
| PH | users / forum / content / resources / lms | 회원 관리 · 포럼 5 · 공지·뉴스 · 커뮤니티 콘텐츠 · 설문 · **제공받은 콘텐츠**(신설) · 자료실 · 강의 · 안내 문구 | | 서비스 운영 | — |
| PH | analytics / system | 운영 분석 · 역할 관리(adminOnly) | | 운영 관리 | — |
| PH | — | (사업 운영 항목 0) | 운영자는 거래 무개입 | — | REAL_SERVICE_DIFFERENCE |
| Neture | (전 항목) | 자체 `NETURE_OPERATOR_DOMAIN_IA` | | SPECIAL | override 0 |

### 1-3. 서비스 간 capability 차이 판정 (§16)

| 항목 | KPA | KCos | PH | 판정 |
|---|---|---|---|---|
| 회원 · 포럼 · 콘텐츠 · 자료 · 강의 · 분석 | ✅ | ✅ | ✅ | COMMON_OPERATOR_CAPABILITY |
| 가맹점(매장) 관리 · 매장 지원 콘텐츠 · 사이니지 | ✅ | ✅ | ❌ | REAL_SERVICE_DIFFERENCE (PH 운영자는 매장 자산 운영 축 없음 — PH 서비스 모델 원칙) |
| 상품 · 주문 · 상품 신청 · 이벤트 오퍼 · 판매자 모집 노출 (사업 운영) | ✅ | ✅ | ❌ | REAL_SERVICE_DIFFERENCE (PH 운영자 거래 무개입) |
| 공급자 제공 콘텐츠 수신 | ✅(자체 승인) | 신설 | 신설 | MISSING_IMPLEMENTATION → CLOSED (공통 inbox) · KPA 승인 정책 = 서비스별 유지 |
| 강사 승인 · 콘텐츠 허브 · 협업 문의 | ✅ | ❌ | ❌ | IMPLEMENTATION_TIMING_DIFFERENCE (backend guard KPA 전용 / route 부재 — 본 WO 미개발) |
| 감사 로그 | ✅(adminOnly) | ❌ | ❌ | IMPLEMENTATION_TIMING_DIFFERENCE |
| 다중 서비스 전환 바 | ✅ | ✅ | ✅ | COMMON_OPERATOR_CAPABILITY (Neture 포함) |
| 공급·유통 / 커머스·정산 IA | — | — | — | SPECIAL_SERVICE_ONLY (Neture) |

### 1-4. 프로덕션 read-only census (§20 · 2026-09-16 · 집계만 · Cloud SQL Auth Proxy)

- 운영자 role 보유(active): `cosmetics:admin` 1 · `cosmetics:operator` 1 · `kpa:admin` 1 · `kpa:operator` 2 · `kpa-branch:operator` 1 · `neture:admin` 1 · `neture:operator` 1 · `pharmacy-hub:admin` 2 · `pharmacy-hub:operator` 2.
- operator-services 관점(role ∧ active membership): kpa-society 2 · k-cosmetics 1 · pharmacy-hub 3 · neture 1 · kpa-branch 1 (role 보유자 전원 membership active — 차이 0).
- **다중 서비스 운영자**: 1 서비스 3명 · **5 서비스 1명**(= 테스트 계정 축) → 전환 바가 실제로 그려지는 계정이 프로덕션에 존재.
- Supplier → Service Operator 제공 행(`cms_contents authorRole='supplier'`): `neture` draft 2 (Neture 자체 공급자 작성분) · **kpa/k-cosmetics/pharmacy-hub 0** → 수신함은 empty state 가 정상. KPA `kpa_approval_requests hub_content_submission` 0.
- cms_contents 분포: kpa-society/admin 53 · kpa/admin 1 · neture admin 3 · service_admin 1 · supplier 2 · pharmacy-hub community 2 · service_admin 1.

---

## 2. 결정 (§5 ~ §19)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 표준 IA 키 = `service_operation / business_operation / operations_management`, 라벨 = 서비스 운영 / 사업 운영 / 운영 관리. `OperatorDomainKey` 타입 교체, 구 키 export 0 | ROLE-WORKSPACE §4 · 기존 snake_case 컨벤션(community_content 등) |
| D2 | 항목 단위 override 는 `OperatorDomainIAConfig` 가 아니라 **`OperatorMenuItem.domain`** 에 둔다 | 분류 사실이 서비스 메뉴 config 옆에 있어야 route 와 같이 유지된다 · `filterMenuByRole` 은 rest spread 라 그대로 통과 · Neture · admin 메뉴는 미지정=기존 렌더 |
| D3 | `groupOrder` 에 한 그룹이 여러 도메인에 나타날 수 있다(approvals). 노출은 그 도메인으로 해석된 항목 ≥1 일 때만 | 항목 단위 분리의 필연 · 빈 그룹 헤딩 0 |
| D4 | stores 그룹 전체 = 서비스 운영 (가맹점 관리 + 매장 지원 콘텐츠) · signage = 서비스 운영 | WO §9 정의 ("stores as member mgmt" · 사이니지·태블릿 자료) |
| D5 | PH 전용 도메인 IA config RETIRE → 기본 IA. 사업 운영 도메인은 비어 있어 미노출 | STANDARD_CANDIDATE · 가짜 카드 금지 |
| D6 | 다중 서비스 전환 = `OperatorServiceSwitcher` 를 wrapper 의 header 슬롯에 합성 (Shell props 무변경) · 2개 이상일 때만 렌더 · standard/special → `/operator`, none/undecided → 링크 없음 | Shell 재작성 금지 · dead link 0 · 경로 추측 금지 |
| D7 | 대표 홈 운영자 그룹 = `/work-scope/operator-services` 만. `ROLE_PREFIX_TO_SERVICE` · `OPERATOR_OR_ABOVE_ROLES` 사용 제거. 조회 실패 = 전체 error(부분 데이터 금지 원칙 유지) · `platform:super_admin` = Neture 관리자 진입 별도 | WO §13 프런트 하드코딩 금지 |
| D8 | 수신함: KPA 는 기존 `/operator/approvals` 유지(라벨만 `제공받은 콘텐츠 승인`) · KCos/PH 는 공통 `SupplierContentInbox`(`GET /cms/contents?serviceKey&authorRole=supplier` + `PATCH /cms/contents/:id/status` 기존 전이 pending→published/draft · published→archived) | 서비스별 승인 정책 유지 · 새 원장/workflow 0 · 수신 ≠ 승인 강제 |
| D9 | Service Content = cms_contents serviceKey 스코프(기존 CmsContentManager) · 사업 프로그램은 Content 하위 아님 | WO §17 · §18 |
| D10 | `/operator/*` 전 route = KEEP_CANONICAL. COMPAT_REDIRECT 0 · RETIRE_LATER 0 | 라벨·배치만 바뀌었고 route 의미 불변 |
| D11 | 모바일 = `DomainIASidebar` drawer 재사용 (`aria-hidden` 토글 · ESC 닫힘, desktop 과 같은 트리) | WO §20 |
| D12 | 권한 · capability 판정 무변경. `domain` 은 표시 전용 | WO §21 |
| D13 | 대시보드: KPA 4 KPI + 12 링크 · KCos 15 링크 · PH quick action 6 을 3도메인으로 재배치. 새 KPI/route 0 | WO §15 |
| D14 | KPA vitest 설정에 `resolve.dedupe(react/react-dom/react-router/react-router-dom)` 추가 — 공통 패키지와 서비스가 서로 다른 react-router 사본을 쓰면 `Link` 가 MemoryRouter 컨텍스트를 못 찾음. 의존성 추가 아님 | 테스트 인프라 · package.json/lockfile 무변경 |

### 2-1. 라우트 판정

| route | 판정 |
|---|---|
| KPA · KCos · PH `/operator/*` 기존 전부 | KEEP_CANONICAL |
| KCos `/operator/supplier-contents` · PH `/operator/supplier-contents` | 신설 (공통 inbox) |
| Neture `/operator/*` · `/admin/*` | KEEP_CANONICAL (SPECIAL) |
| kpa-branch `/{slug}/operator/*` | KEEP (무변경) |

---

## 3. 변경 파일

**공통 (최소)**
- `packages/ui/src/operator-shell/types.ts` — `OperatorMenuItem.domain?` (+8)
- `packages/operator-ux-core/src/sidebar/operatorDomainIA.ts` — 표준 IA + `resolveDomainGroupItems` (재작성)
- `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` — 항목 단위 해석 · 복합 key · 헤딩 아이콘 3종 (+34/−28)
- `packages/operator-ux-core/src/sidebar/index.ts` · `src/index.ts` — export
- `packages/operator-ux-core/src/service-switcher/{createOperatorServicesApi.ts, OperatorServiceSwitcher.tsx, index.ts}` — 신설
- `packages/operator-core-ui/src/modules/supplier-content-inbox/{SupplierContentInbox.tsx, index.ts}` · `src/index.ts` — 신설 (package.json `exports` 무변경 — 루트 export)
- `packages/operator-core-ui/src/dashboard/AxisNavigationSection.tsx` — 3축 xl 3열 · 아이콘 (+11/−3)

**KPA** — `config/operatorMenuGroups.ts`(approvals override · 라벨) · `components/kpa-operator/KpaOperatorLayoutWrapper.tsx`(switcher) · `pages/operator/KpaOperatorDashboard.tsx`(3도메인 축) · `vitest.config.mjs`(dedupe) · `config/__tests__/operatorDomainIA.render.test.tsx`(신설)

**K-Cos** — `config/operatorMenuGroups.ts` · `components/layouts/OperatorLayoutWrapper.tsx` · `pages/operator/KCosmeticsOperatorDashboard.tsx` · `pages/operator/OperatorSupplierContentsPage.tsx`(신설) · `App.tsx`(+route)

**PH** — `config/operatorMenuGroups.ts`(전용 IA 제거 · override · 수신함) · `layouts/OperatorLayoutWrapper.tsx` · `pages/operator/OperatorDashboardPage.tsx` · `pages/operator/SupplierContentsPage.tsx`(신설) · `App.tsx`(+route)

**Neture** — `components/layouts/OperatorLayoutWrapper.tsx`(switcher 만) · `lib/home-entry.ts`(operator-services) · `lib/__tests__/home-entry.operator-services.test.ts`(신설)

**api-server** — `src/__tests__/service-operator-workspace-realignment.spec.ts`(신설 · 34) — backend runtime 변경 0

**docs** — `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md`(§4 표준 IA · §4-2 신설 · §9-1 6단계) · 본 CHECK

**무변경(명시)**: `OperatorAreaShell.tsx` · `OperatorDashboardLayout.tsx` · `DataTable` · `service-tenant.resolver.ts` · `work-scope.routes.ts` · `SupplierContentService` · `supplier-library-handoff.service.ts` · security-core · RBAC · migrations · package.json · lockfile · Neture `operatorMenuGroups.ts`.

---

## 4. 검증 (§22)

| 검증 | 결과 |
|---|---|
| `pnpm run build:packages` | PASS |
| `@o4o/operator-ux-core` · `@o4o/operator-core-ui` tsc | PASS |
| KPA · K-Cos · PH · Neture `tsc --noEmit` | PASS ×4 |
| KPA · K-Cos · PH · Neture `vite build` | PASS ×4 |
| api-server jest `service-operator-workspace-realignment.spec.ts` | **34/34 PASS** — 표준 IA(4) · 항목 단위 분류(11 — KPA/KCos/PH approvals 분리 · 누락 0/중복 0 · 셸 if 0 · PH 전용 config 0) · dead link 0(7 — 사이드바 3서비스 + 대시보드 3서비스 route 대조) · 합성 Operator X(6 — KPA+KCos 2건 · PH 미노출 · membership 비active 제외 · none/undecided · 하드코딩 0 · 새 테이블/migration 0) · 수신함(4) · Neture SPECIAL(2) |
| api-server jest 회귀 (`service-tenant-foundation` · `supplier-workspace-realignment` · `store-workspace-integration` · `final-code-only-retirement-closure`) | 88/88 PASS (신규 포함) |
| KPA vitest `operatorDomainIA.render.test.tsx` | **7/7 PASS** — desktop aside 3헤딩·구 헤딩 0·순서 · approvals item 분리 렌더 · 그룹 배치 · **모바일 drawer**(햄버거 → aria-hidden false · desktop 과 동일 링크 집합 · ESC) · switcher 2건(현재=내부 링크 · 타 서비스=handoff→`window.location.assign`) · 1건 미렌더 · kpa-branch 링크 없음 (기존 worktableCart 14 회귀 PASS) |
| Neture vitest `home-entry.operator-services.test.ts` | **6/6 PASS** — Operator X 2건 선택 · 1건 바로 진입 · 목록 비면 role 있어도 그룹 없음 · admin scope→/admin · undecided 제외 · kpa-branch slug · super_admin (기존 home-entry 9 · HomeEntryPanel 8 · unified-request 9 회귀 PASS) |
| `node scripts/lint-ratchet.mjs` | 본 WO 파일 오류 0. 전체 47 > baseline 46 — 초과 1건은 **본 WO 무관 파일**(목록 47건 전부 미수정 파일: `ai-orchestration.spec.ts` 4 등) → 현재 변경과 무관한 실패로 보고만 (CLAUDE.md 중지 조건 "무관한 build·test 실패") |
| 프로덕션 read-only census | §1-4 (write 0) |

### 4-1. Production smoke (§23)

**실행**: 2026-09-16, `5e8e137a3` 배포 성공 후 Playwright(headless chromium) · desktop 1280×900 + mobile 400×800 · 프로덕션 read-only(write 0) · 자격정보 미기록.
**로그인 채널(숨기지 않음)**: 서비스 웹 폼 L2 credential 미확보(TEST-ACCOUNTS §2 unknown)라 `sohae2100`(5서비스 admin/operator 계정) **L1 토큰 주입 우회(§4-2)** 로 O4O Home 진입 → 이후 각 서비스는 **실제 `POST /auth/handoff` → 대상 `/operator`** 로 이동(canonical 경로). "로그인 200" 검증이 아니다.

| # | 항목 | 결과 | 확인 내용 |
|---|---|---|---|
| S1 | `GET /work-scope/operator-services` | PASS | 200 · 5건 = k-cosmetics:admin:standard · kpa-branch:operator:none · kpa-society:admin:standard · neture:admin:special · pharmacy-hub:admin:standard (§1-4 census 의 5서비스 운영자 1명과 일치) |
| S2 | O4O Home(neture.co.kr) "서비스 운영자 화면" | PASS | 5행 = Neture 관리자 · K-Cosmetics 관리자 · O4O 파일럿 테스트분회 운영자(kpa-branch = 내 분회 slug) · KPA Society 관리자 · 파머시 허브 관리자 — 목록 출처 = operator-services (admin scope → 관리자 라벨/`/admin`) · telemetry clean |
| S3 | O4O Home → KPA 버튼 클릭 | PASS | `POST /auth/handoff` → `kpa-society.co.kr/admin/kpa-dashboard` 도착 (admin scope 의 returnPath=`/admin`, 기존 규칙) |
| S4 | KPA `/operator` desktop | PASS | 헤딩 서비스 운영 / 사업 운영 / 운영 관리 · 구 헤딩 0 · **approvals 분리**: 서비스 운영 › `제공받은 콘텐츠 승인`(단독 링크) / 사업 운영 › 승인 › 공급 상품 신청 승인 · 이벤트 오퍼 승인 · 판매자 모집 노출 승인 · 매장(HUB 자료 포함)·콘텐츠·포럼·자료실·강의·사이니지 = 서비스 운영 · 상품/주문 = 사업 운영 · 분석/시스템 = 운영 관리 · **전환 바** `운영 중인 서비스: K-Cosmetics(button) · 약사회 분회(span, 링크 없음) · KPA Society(현재) · Neture(button) · 파머시 허브(button)` · **대시보드 3축**(서비스 운영 4 KPI + 6 링크 / 사업 운영 2 KPI + 4 링크 / 운영 관리 2 링크, 축·5-block 링크 20개 전부 `/operator/*` 실 route) · telemetry: KPA `/admin` 경유 시 `public/services/kpa-society/policies/{terms,privacy}` · `kpa/legal/documents/published/*` 404 4건 — 푸터 법정정보 조회의 기존 동작(본 WO 무관, 운영자 화면 자체는 clean) |
| S5 | KPA `/operator` mobile 400×800 | PASS | `운영자 메뉴 열기` → drawer `aria-hidden=false` · 헤딩 서비스 운영/사업 운영/운영 관리 (desktop 과 동일 트리) · telemetry clean |
| S6 | K-Cos `/operator` desktop | PASS | 3헤딩 · 서비스 운영 › `매장 가입 신청 관리`(override) · 콘텐츠 › `제공받은 콘텐츠` · 사업 운영 › 승인 3 + 상품/주문 · 전환 바 5 · 대시보드 3축 17 링크 실 route · telemetry clean |
| S7 | K-Cos `/operator/supplier-contents` | PASS | 제목 "제공받은 콘텐츠" · empty state "검토 대기 중인 제공 콘텐츠가 없습니다" (`GET /cms/contents?serviceKey=k-cosmetics&authorRole=supplier&status=pending` 200 · §1-4 제공 행 0 — WO 허용) · telemetry clean |
| S8 | K-Cos mobile | PASS | drawer 3헤딩 · clean |
| S9 | PH `/operator` desktop | PASS | 헤딩 서비스 운영 / 운영 관리 — **사업 운영 미노출**(항목 0, REAL_SERVICE_DIFFERENCE) · 서비스 운영 › `가입 신청 관리`(override) · 콘텐츠 › `제공받은 콘텐츠` · 운영 관리 › 운영 분석 · 역할 관리 · 전환 바 5 · quick action 6(가입 신청·회원·포럼·공지·뉴스·제공받은 콘텐츠·운영 분석) 실 route · telemetry clean |
| S10 | PH `/operator/supplier-contents` | PASS | 제목 ok · empty state ok · clean |
| S11 | PH mobile | PASS | drawer 헤딩 서비스 운영/운영 관리 · clean |
| S12 | Neture `/operator` (SPECIAL) | PASS | 자체 헤딩 `공급·유통 운영` present · 표준 3헤딩 none · 전환 바 present (IA 무변경 + 전환 바만) |
| S13 | 누출 | PASS | 전환 바 · 대표 홈 모두 operator-services 5건 밖 서비스 0 · cafe24-b2b 0 |

**한계(숨기지 않음)**
- 검증 계정이 5서비스 전부 admin scope 라 **순수 operator-only 화면**(adminOnly 항목 제외 상태)은 프로덕션에서 확인 못 함 — 항목 분류는 spec/render test 로 고정. PH 미노출 케이스(합성 Operator X 의 "PH 없음")도 프로덕션 계정으로는 재현 불가(unit 3층으로만).
- 서비스 웹 폼 로그인은 L2 미확보로 실행하지 않았다(우회 채널 명시). 수신함은 제공 행 0 이라 empty state 까지만(전이 write 는 안전한 테스트 데이터 없음 → 미실행, WO §24).
- KPA `/admin` 경유 404 4건은 법정정보 조회의 기존 동작(§7 F6).

---

## 5. Re-census (§28)

| 기준 | 결과 |
|---|---|
| 표준 서비스(KPA · KCos · PH) 운영자 화면 최상위 = 서비스 운영 / 사업 운영 / 운영 관리 | ✅ `DEFAULT_OPERATOR_DOMAIN_IA` · 서비스 config 미주입 · 대시보드 3축 |
| 구 "커뮤니티 운영 / 매장 HUB 운영 / 운영 공통" runtime 라벨 | 0 (주석의 은퇴 경위만 잔존) |
| 항목 단위 분류 · approvals 분리 | ✅ KPA 1 · KCos 1 · PH 1 override, 나머지 그룹 기본 |
| `OperatorAreaShell` · `DomainIASidebar` 서비스별 if | 0 |
| operator-services 소비처 | switcher(4 wrapper) · 대표 홈 — 프런트 role 파싱 0 |
| 새 membership 테이블 · role 시스템 · migration | 0 |
| Supplier → Service Operator 수신 진입 | KPA `/operator/approvals` · KCos/PH `/operator/supplier-contents` (제공 대상 3 = catalog 파생과 일치) |
| cross-service 누출 | inbox 는 `serviceKey` 경계 + 클라이언트 `authorRole` 방어선 · switcher 는 서버 목록만 · handoff 가 membership 재검증 |
| Neture SPECIAL | `NETURE_OPERATOR_DOMAIN_IA` 무변경 · override 0 |
| `/operator/*` dead link | 0 (spec 대조) |
| 모바일 | drawer 재사용 (render test) |
| 권한 | 무변경 |

---

## 6. 문서 정합 (§29 · CLAUDE.md §16)

| 문서 | 발견 | 처리 |
|---|---|---|
| `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` §4 · §9-1 | 2축(Service Operation / Business Operation) 트리 · 6단계 미완 | **UPDATE** — §4 3도메인 트리 + RETIRED 문장 + 항목 단위 원칙 · §4-2 구현 상태 신설 · §9-1 6단계 완료 (WO 명시 대상) |
| `packages/operator-ux-core/src/sidebar/operatorDomainIA.ts` · `DomainIASidebar.tsx` 주석 | 구 IA 설명 | **UPDATE** (코드 주석) |
| `OPERATOR-DASHBOARD-STANDARD-V1` | "커뮤니티 운영 / 매장 HUB 운영 = 최상위" 서술 **없음**. 단, §4-2-B "Sidebar Group 헤더 = 6 Workspace(A~F)" 매핑은 현행 runtime(도메인 3 + STANDARD_GROUPS 13)과 다른 **선행 drift**(본 WO 이전부터) | 보고 — 별도 WO 제안(§7 F2) · 본문 무수정(§16-4) |
| `O4O-OPERATOR-CANONICAL-WORKFLOW-V1` · `O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1` · `OPERATOR-INTEGRATION-STATE-V1` · `OPERATOR-DASHBOARD-NAVIGATION` | 구 IA 의미 서술 없음 (검색: 커뮤니티 운영 · 매장 HUB 운영 · 운영 공통 · Store Hub · 2축) | 해당 없음 |
| 과거 WO/CHECK/IR(`WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1` 등) | 구 IA 기록 | 기록물 — 무수정 |

**문서 정합: 발견 3건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건**

---

## 7. 후속 (FOLLOWUP)

| # | 항목 | 성격 |
|---|---|---|
| F1 | KCos 강사 승인 · 콘텐츠 허브 · 협업 문의, KCos/PH 감사 로그 — IMPLEMENTATION_TIMING_DIFFERENCE 로 남김 | 각 서비스 기능 WO |
| F2 | `OPERATOR-DASHBOARD-STANDARD-V1` §4-2-B 6-Workspace 사이드바 매핑 ↔ 현행 3도메인 IA 정합 판정 | 문서 WO |
| F3 | KPA `SupplierContentApprovalPage`(kpa_approval_requests) 와 공통 `SupplierContentInbox` 의 UI 통일 여부 — 승인 정책은 서비스별 유지가 원칙이므로 사업 판단 후 | 판정 대기 |
| F4 | lint-ratchet 47 > 46 (본 WO 무관 파일) | 별도 정리 |
| F5 | 다음 단계 = Community (Industry Community) — ROLE-WORKSPACE §9-1 7단계 | 다음 WO |
| F6 | KPA 푸터 법정정보 조회 `public/services/kpa-society/policies/*` · `kpa/legal/documents/published/*` 404 (기존 동작, 본 WO 무관) | 별도 조사 |

---

## 8. 최종 판정

```
SERVICE_OPERATOR_WORKSPACE = CLOSED_STANDARD_IA
SERVICE_OPERATION          = 회원·가맹점·공지·서비스 콘텐츠·포럼·자료·교육·설문·안내·문의/협업·매장 지원 콘텐츠·사이니지·제공받은 콘텐츠 (항목 단위)
BUSINESS_OPERATION         = 상품·상품 신청/취급 승인·이벤트 오퍼·판매자 모집 노출 승인·주문 (KPA·KCos) / PH 0 (REAL_SERVICE_DIFFERENCE)
OPERATIONS_MANAGEMENT      = 분석·AI 리포트·감사 로그·역할 관리
OPERATOR_SERVICE_SOURCE    = GET /api/v1/work-scope/operator-services (단일)
MULTI_SERVICE_OPERATOR     = OperatorServiceSwitcher(header 슬롯, ≥2) + 대표 홈 선택 · handoff 재사용
NEW_MEMBERSHIP_TABLE       = 0
NEW_ROLE_SYSTEM            = 0
SUPPLIER_HANDOFF_RECEIVER  = KPA /operator/approvals(자체 승인 유지) · KCos·PH /operator/supplier-contents(공통 inbox, cms serviceKey 경계, 기존 전이만)
SERVICE_CONTENT            = cms_contents serviceKey 스코프 재사용 (서비스 운영)
BUSINESS_PROGRAM_BOUNDARY  = Content 하위 아님 (사업 운영)
NETURE_SPECIAL             = PRESERVED (자체 IA 무변경 · switcher 만)
LEGACY_STORE_HUB_IA        = RETIRED
PRODUCTION_SMOKE           = PASS (S1~S13 · read-only · L1 우회 + 실제 handoff · empty-state 허용 · §4-1 한계 명시)
NEXT                       = GO_COMMUNITY_INDUSTRY_ALIGNMENT
```
