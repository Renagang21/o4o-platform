# CLAUDE.md – O4O Platform Development Constitution

> **이 문서는 O4O Platform에서 모든 개발(사람/AI)을 지배하는 최상위 규칙이다.**
> 충돌 시 항상 CLAUDE.md가 우선한다.

---

## 0. 환경 원칙 (CRITICAL)

> **기본 환경은 프로덕션이다.** (2026-01-29~)

| 항목 | 값 |
|------|------|
| Instance | `o4o-platform-db` |
| Host | `34.64.96.252` |
| Database | `o4o_platform` |

**DB 접근 정책:**
- ✅ Cloud Run 내부 / Admin API / Google Cloud Console / `gcloud sql` CLI
- ✅ **Claude Code 직접 검증 허용** — `gcloud` CLI 또는 Google Cloud Console을 통해 배포 후 SQL 검증, 마이그레이션 확인, 테이블/row 상태 확인 등을 직접 수행할 수 있음
- ✅ 로컬 `psql` 클라이언트 설치 허용 — `gcloud sql connect` 인터랙티브 모드 사용을 위해 필요. 단, **프로덕션 DB는 방화벽으로 차단**되므로 직접 TCP 접속은 불가하며, 반드시 `gcloud sql connect`를 통해서만 사용

**Claude Code가 활용 가능한 검증 채널:**
- `gcloud run services describe o4o-core-api --region asia-northeast3` — 리비전/상태
- `gcloud run revisions list` — 배포 이력
- `gcloud logging read 'resource.type=cloud_run_revision AND ...'` — 로그 조회 (마이그레이션/에러/특정 키워드)
- `gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform` — 인터랙티브 psql (단, psql 클라이언트 미설치 시 사용 불가)
- **권장**: `gcloud sql` 대신 Cloud SQL Admin API 또는 `gcloud` 래퍼 스크립트로 SQL 실행
- DB 접속 정보 (host/user/password/database) 는 로컬 `.env.apiserver` 및 `apps/api-server/.env`에 존재하나, **프로덕션 DB 방화벽은 Cloud Run/Console/CLI 외 차단**되므로 값을 알아도 로컬 접속은 불가. Claude Code는 필요 시 env 파일에서 값을 읽어 `gcloud sql` 계열 CLI에 전달할 수 있음

**SQL 검증 원칙:**
- read-only 검증(SELECT, 마이그레이션 이력 확인 등)은 Claude Code가 직접 수행 가능
- 데이터 변경(UPDATE/DELETE/DROP/ALTER)은 **반드시 사용자 승인 필요**. 마이그레이션은 CI/CD 자동 실행이 원칙
- 검증 결과에 의미 있는 운영 데이터(개인정보/비밀 등)가 포함될 수 있으므로 보고 시 민감 데이터는 요약/마스킹

**마이그레이션:** main 배포 → CI/CD 자동 실행 (권장) | 긴급 시 Admin API 또는 Cloud Console SQL Editor 또는 `gcloud sql connect`

> 📄 상세: `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md`

**로컬 도구:**
- ✅ `gcloud` CLI 설치됨 — Cloud Run 로그 조회, 리비전 확인, Cloud SQL 접근, 로깅 API 등 디버깅/운영/검증에 활용 가능
- ✅ `gh` CLI 설치됨 — GitHub PR/이슈 관리
- ✅ `psql` 로컬 클라이언트 설치 허용 — `gcloud sql connect` 인터랙티브 모드 지원 목적. 직접 TCP 접속은 방화벽으로 차단됨

---

## 1. 개발 기본 규칙

### 브랜치 전략

현재 운영 단계에서는 **main 직접 작업**이 기본이다.

- 작업 전 `git pull origin main` (sync first) 필수
- 작업 완료 후 main에 직접 commit → push
- feature 브랜치는 명시적 요청 또는 특수 작업(대규모 리팩토링·실험적 변경)에서만 사용
- 작업 범위 외 수정 금지 / smoke test 후 결과 보고

### App 계층 (절대 규칙)

```
Core → Extension → Feature → Service
```
역방향 의존 금지

### Work Order 필수 구조

```
조사 → 문제확정 → 최소 수정 → 검증 → 종료
```

### API 호출 규칙

- `authClient.api.get()` / `authClient.api.post()` 필수
- 환경변수 직접 사용 금지, 하드코딩 URL 금지

---

## 2. TypeORM Entity – ESM Rules (FROZEN)

> 위반 시 API 서버 기동 실패

```typescript
// ❌ FORBIDDEN
import { RelatedEntity } from './related.entity.js';
@ManyToOne(() => RelatedEntity, (e) => e.property)

// ✅ REQUIRED
import type { RelatedEntity } from './related.entity.js';
@ManyToOne('RelatedEntity', 'property')
```

---

## 3. Core 동결 정책

동결 Core: `cms-core`, `auth-core`, `platform-core`, `organization-core`

구조/테이블 변경 금지. 명시적 WO 승인 필요.

---

## 4. E-commerce Core 규칙

| 원칙 | 설명 |
|------|------|
| 주문 생성 | `checkoutService.createOrder()` 필수 |
| OrderType 불변 | 생성 시 결정, 이후 변경 금지 |
| 금지 테이블 | `*_orders`, `*_payments` 생성 금지 |

**OrderType**: DROPSHIPPING ✅ / COSMETICS ✅ / TOURISM ✅ / GLYCOPHARM ❌ BLOCKED

> 📄 상세: `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`

---

## 5. O4O Store & Order

- 모든 매장은 O4O Store Template 사용
- 주문 생성 규칙: §4 E-commerce Core 참조 (`checkoutService.createOrder()`)
- 독립 주문 테이블 생성 금지
- 3중 방어: 런타임 Guard + OrderType 계약 + 스키마 검사

> 📄 상세: `docs/architecture/O4O-STORE-RULES.md`

### Store Production Material (Canonical)

- **Store Production Material 관련 작업 전 `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md` 를 우선 참조한다.**
- `kpa_store_contents` 는 현재 **legacy physical table name** 으로 간주한다 (KPA / GlycoPharm / Cosmetics 3 서비스 공통 사용 중).
- logical canonical 개념은 service-neutral **Store Production Material** 이다.
- 단순 prefix 제거 또는 성급한 table rename 제안 금지. rename 판단은 canonical 문서 기준으로 수행한다.

> 📄 상세: `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md`

---

## 6. 인프라 (GCP Cloud Run)

| 서비스 | 역할 |
|--------|------|
| `o4o-core-api` | API 서버 |
| `neture-web` | 네처 메인 |
| `glycopharm-web` | 글라이코팜 |
| `k-cosmetics-web` | K-화장품 |
| `kpa-society-web` | 약사회 SaaS |

금지: Source 배포, PM2, AWS EC2, `43.202.242.215` 참조

---

## 7. Boundary Policy (FROZEN)

> 📄 상세: `docs/architecture/O4O-BOUNDARY-POLICY-V1.md`

| Domain | Primary Boundary | HUB 소비 |
|--------|:----------------:|:---------:|
| **Broadcast** (CMS, Signage) | `serviceKey` | YES |
| **Community** (Forum) | `organizationId` | NO |
| **Store Ops** (LocalProduct, Tablet, KPI) | `organizationId` | NO |
| **Commerce** (Order, Payment) | `storeId` | NO |

### Guard Rules — 모든 신규 개발 필수

1. **UUID 단독 조회 금지** — Domain Primary Boundary 복합 조건 필수
2. **Raw SQL Parameter Binding 필수** — String Interpolation 금지
3. **Domain Primary Boundary 필터 필수** — 모든 쿼리에 적용
4. **serviceKey 스푸핑 금지** — URL 경로 파라미터에서만 추출
5. **Cross-domain JOIN 금지** — 명시적 WO 예외 외

---

## 8. 화면 디버깅 & 배포 후 검증

### 검증 방식

| 방식 | 허용 | 설명 |
|------|------|------|
| API 직접 호출 (curl/httpie) | ✅ | 배포된 엔드포인트에 직접 요청하여 응답 검증 |
| 코드 경로 정적 분석 | ✅ | 코드 흐름 추적으로 논리 정합성 검증 |
| Health/Debug 엔드포인트 | ✅ | 진단용 API로 상태 확인 |
| 사람 관측 → AI JSON 분석 | ✅ | 사람이 스크린샷/네트워크 로그 제공 → AI가 분석 |
| 브라우저 직접 접속 | ✅ | 배포된 서비스에 브라우저로 직접 접속하여 테스트 |
| 브라우저 자동화 (Playwright 등) | ✅ | 로컬 환경에서 자동화 테스트 |

### 버그 디버깅 표준 절차

**버그 발견 시 반드시 아래 순서를 따른다:**

1. **JSON 디버그 테스트 페이지 생성** — 의심되는 API/데이터를 Raw JSON으로 출력하는 SSR 페이지를 만든다
2. **브라우저로 접속하여 원인 파악** — 배포 후 브라우저에서 JSON 응답을 직접 확인한다
3. **원인 확정 후 최소 수정** — JSON 결과를 근거로 코드를 수정한다

> 📄 **JSON 테스트 페이지 작성 가이드: `docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md`**
>
> 이 문서를 반드시 읽고 참고하여 디버그 페이지를 작성할 것.

### 진단 Entry Point

`/__debug__/auth-bootstrap` / `/health/detailed` / `/health/database` / `/api/v1/auth/status`

### JSON 응답 표준

`{ success: true, data: T }` 또는 `{ success: false, error: "msg", code: "ERROR_CODE" }`

---

## 9. 도메인별 규칙 (참조)

| 도메인 | 핵심 제약 | 상세 문서 |
|--------|----------|----------|
| **Cosmetics** | 독립 스키마 (`cosmetics_` prefix), E-commerce Core 통해 주문 | `docs/architecture/COSMETICS-DOMAIN-RULES.md` |
| **Business Service** | OpenAPI 계약 우선, 서비스 간 직접 호출/DB 접근 금지 | `docs/architecture/BUSINESS-SERVICE-RULES.md` |
| **Retail Stable** | Visibility Gate 4중 정의, Payment atomic transition | `docs/platform/architecture/O4O-RETAIL-STABLE-V1.md` |
| **Design Core** | 모든 신규 화면은 Design Core v1.0, 독자적 디자인 시스템 금지 | `docs/rules/DESIGN-CORE-GOVERNANCE.md` |

---

## 10. KPA Society 구조

> 📄 기준: `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`

3개 서비스 공존: **커뮤니티**(유지) / **분회 서비스**(유지) / **데모**(제거 예정)

- 라우트 위치 ≠ 서비스 소속 (Forum은 커뮤니티 서비스의 기능)

---

## 11. Operator Dashboard 표준

> 📄 상세: `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`
> 📄 DataTable 정책: `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`

### Admin / Operator 역할 구분

| 역할 | 범위 |
|------|------|
| **Admin** | 구조 + 정책 + 거버넌스 + 금융 |
| **Operator** | 운영 + 콘텐츠 + 모니터링 |

### 핵심 규칙

1. **Guard**: `requireAuth` → `require{Service}Scope('{service}:{role}')` — 레거시 `requireAdmin` 서비스 레벨 사용 금지
2. **Dashboard**: 5-Block 구조 (`KPI` + `AI Summary` + `Action Queue` + `Activity Log` + `Quick Actions`) — `OperatorDashboardLayout` 컴포넌트 사용
3. **AI Summary**: Backend `CopilotEngineService.generateInsights()` 사용 — Frontend client-side 생성 금지
4. **Route**: Backend `/api/v1/{service}/operator/*` · `/api/v1/{service}/admin/*` — Frontend `/operator/*` · `/admin/*`

레이아웃·Sidebar 순서·KPI 분류·DataTable 정책 등 상세 규칙은 canonical 문서 참조.

---

## 12. 플랫폼 개발 참조

Content / LMS / Signage / CMS / Extension 개발 시 선행 참조:

| 영역 | 문서 |
|------|------|
| Content Core | `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` |
| LMS Core | `docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md` |
| Navigation | `docs/platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md` |
| Extension | `docs/platform/extensions/EXTENSION-GENERAL-GUIDE.md` |
| Operator Dashboard | §11 참조 |
| **HUB Template Standard** | `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md` |

핵심: Content 단일 출처 / Core 불변 / 데이터 소유권 분리 / 이벤트 기반 통신

---

## 13. O4O 공통 구조 원칙

> O4O의 **forum, lms, signage는 서비스별 기능이 아니라 플랫폼 공통 구조**이며,
> 각 서비스는 동일한 구조 위에서 자신의 데이터를 노출한다.

- KPA-Society는 공통 구조의 **reference implementation** — 구조 관련 작업 시 KPA 기준으로 먼저 조사
- 서비스별로 Forum/LMS/Signage를 재구현하거나 독립 테이블 생성 금지
- 구조는 공유, 데이터는 serviceKey 기반으로 격리

> 📄 상세: `docs/o4o-common-structure.md`

모든 Forum/LMS/Signage 관련 구조 작업(IR, WO, 구현)은 해당 문서를 기준으로 판단한다.

---

## 13-A. APP 표준화 (Baseline Lock)

모든 APP = `@o4o/types/{app}` + `{App}QueryService` + 표준 UI 패턴

| APP | 상태 |
|-----|------|
| APP-CONTENT | Frozen |
| APP-SIGNAGE | Frozen |
| APP-FORUM | Frozen |
| APP-LMS | Baseline Defined (Phase 1) — 백엔드 공통, frontend 공통화는 후속. 상세: `docs/architecture/APP-LMS-BASELINE.md` |

서비스 코드는 QueryService 호출 + 설정만. Raw SQL/중복 로직/서비스별 UI 분기 금지.

---

## 14. Frozen Baselines

모든 Freeze 항목 공통: **버그 수정·성능 개선·문서·테스트는 허용. 구조 변경은 명시적 WO 필수.**

| # | 대상 | Freeze 일자 | 상세 문서 |
|---|------|-----------|----------|
| F1 | **Operator OS** — security-core, hub-core, ai-core, action-log-core, asset-copy-core, operator-ux-core, admin-ux-core | 2026-02-16 | `docs/baseline/BASELINE-OPERATOR-OS-V1.md` |
| F2 | **KPA UX** — 3개 서비스 영역 5-Block/4-Block 통합 UX | 2026-02-17 | `docs/baseline/KPA-UX-BASELINE-V1.md` |
| F3 | **Store Layer** — store-ui-core, store-asset-policy-core, store-core, asset-copy-core, hub-core 의존 방향 | 2026-02-22 | `docs/architecture/STORE-LAYER-ARCHITECTURE.md` |
| F4 | **Platform Content Policy** — HUB 3축 모델 (Producer/Visibility/ServiceScope) | 2026-02-23 | `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` |
| F5 | **Content Stable** — HUB 콘텐츠 타입·매핑·병합 로직·API 계약 | 2026-02-23 | `docs/baseline/CONTENT-STABLE-DECLARATION-V1.md` |
| F6 | **Boundary Policy** — Domain Boundary Matrix + Guard Rules 5개 | 2026-02-24 | `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` |
| F7 | **Neture Partner Contract** — 계약 테이블·ENUM·트랜잭션·Commission 불변 | 2026-02-24 | `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` |
| F8 | **Neture Distribution Engine** — Distribution Tier 3단계·SERVICE 상태 머신·Checkout Guard 3계층·Listing 캐스케이드 | 2026-02-27 | `docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` |
| F9 | **RBAC SSOT** — role_assignments 단일 소스, users.role/roles/user_roles 제거, write-path 통일 | 2026-02-27 | `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` |
| F10 | **O4O Core** — Auth, Membership, Approval, RBAC 4개 모듈 Core Layer 고정 | 2026-03-11 | `docs/architecture/O4O-CORE-FREEZE-V1.md` |
| F11 | **User/Operator** — users·service_memberships·role_assignments 3테이블 고정, Operator=membership 기반, user.role 사용 금지. **KPA-a 예외**: OperatorRoute 대신 RoleGuard+allowedRoles 사용 (role은 membership에서 파생, 구조 동등) | 2026-03-19 | `docs/architecture/USER-OPERATOR-FREEZE-V1.md` |

---

## 상세 규칙 문서 목록

| 영역 | 문서 |
|------|------|
| Cosmetics 도메인 | `docs/architecture/COSMETICS-DOMAIN-RULES.md` |
| Business 서비스 | `docs/architecture/BUSINESS-SERVICE-RULES.md` |
| O4O Store/Order | `docs/architecture/O4O-STORE-RULES.md` |
| **Store Production Material Canonical** | `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md` |
| E-commerce 계약 | `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md` |
| GlycoPharm Legacy | `docs/baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md` |
| ESM Entity 규칙 | `docs/reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md` |
| Content Core | `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` |
| LMS Core | `docs/platform/lms/` |
| Navigation | `docs/platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md` |
| Extension | `docs/platform/extensions/` |
| KPA Society 구조 | `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md` |
| KPA 권한 매트릭스 | `docs/baseline/KPA-ROLE-MATRIX-V1.md` |
| Hub UX 규칙 | `docs/platform/hub/HUB-UX-GUIDELINES-V1.md` |
| Retail Stable v1.0 | `docs/platform/architecture/O4O-RETAIL-STABLE-V1.md` |
| Operator OS Baseline | `docs/baseline/BASELINE-OPERATOR-OS-V1.md` |
| UX Core Freeze | `docs/baseline/UX-CORE-FREEZE-V1.md` |
| KPA UX Baseline | `docs/baseline/KPA-UX-BASELINE-V1.md` |
| Store Layer Architecture | `docs/architecture/STORE-LAYER-ARCHITECTURE.md` |
| Platform Content Policy | `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` |
| Content Stable | `docs/baseline/CONTENT-STABLE-DECLARATION-V1.md` |
| Boundary Policy | `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` |
| Neture Partner Contract | `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` |
| Design Core | `docs/rules/DESIGN-CORE-GOVERNANCE.md` |
| Production Migration | `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` |
| Channel Execution Console | `docs/work-orders/WO-CHANNEL-EXECUTION-CONSOLE-V1.md` |
| Channel Creation Flow | `docs/work-orders/WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md` |
| Neture Distribution Engine | `docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` |
| **Neture Domain Architecture** | `docs/baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md` |
| RBAC Freeze Declaration | `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` |
| RBAC Runbook | `docs/rbac/RBAC-RUNBOOK-V1.md` |
| RBAC Role Catalog | `docs/rbac/RBAC-ROLE-CATALOG-V1.md` |
| **O4O Core Freeze** | `docs/architecture/O4O-CORE-FREEZE-V1.md` |
| Operator Dashboard 표준 | §11 참조 |
| **디버그 SSR 테스트 페이지** | `docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md` |
| **User/Operator Freeze** | `docs/architecture/USER-OPERATOR-FREEZE-V1.md` |
| **O4O 공통 구조 원칙** | `docs/o4o-common-structure.md` |
| **HUB Template Standard** | `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md` |
| **Event Offer 공통 도메인** | `docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md` |
| **Event Offer Store 통합** | `docs/baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md` |
| **Event Offer Neture 역할 구분** | `docs/baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md` |
| **O4O Table Standard (Aspirational)** | `docs/baseline/O4O-TABLE-STANDARD-BASELINE-V1.md` |
| **O4O Form Standard (Aspirational)** | `docs/baseline/O4O-FORM-STANDARD-BASELINE-V1.md` |
| **APP-LMS Baseline** | `docs/architecture/APP-LMS-BASELINE.md` |
| **LMS Scope Guard 설계** | `docs/architecture/LMS-SCOPE-GUARD.md` |
| **LMS Client Convention V1** | `docs/architecture/LMS-CLIENT-CONVENTION-V1.md` |
| **Operator Integration State V1** | `docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md` |
| **Operator DataTable Policy V1** | `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md` |
| **Operator Table Canonical V1** | `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md` |
| **Operator Canonical Workflow V1** | `docs/architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md` |
| **Operator Core Design V1** | `docs/architecture/OPERATOR-CORE-DESIGN-V1.md` |
| **Guide sectionKey 충돌 정책** | `docs/architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md` |
| **Guide Schema Validation** | `docs/architecture/O4O-GUIDE-SCHEMA-VALIDATION-V1.md` |
| **Guide sectionKey Migration** | `docs/architecture/O4O-GUIDE-SECTIONKEY-MIGRATION-V1.md` |
| **Guide Content Reseed** | `docs/architecture/O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1.md` |
| **Store Local Product 경계 정책** | `docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md` |
| **User Domain SSOT** | `docs/baseline/USER-DOMAIN-SSOT-V1.md` |
| **Role Policy & Guard Baseline** | `docs/baseline/ROLE-POLICY-AND-GUARD-V1.md` |
| **Global Header Standard** | `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md` |
| **KPA Signage Structure Baseline** | `docs/baseline/KPA-SIGNAGE-STRUCTURE-V1.md` |
| **O4O AI Usage Flow Baseline** | `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md` |
| **Store Products Canonical** | `docs/architecture/STORE-PRODUCTS-CANONICAL-V1.md` |
| **RBAC Canonical State** | `docs/rbac/RBAC-CANONICAL-STATE-V1.md` |

---

## 15. Browser Verification Test Accounts

> 📄 **테스트시 사용하는 아이디/비밀번호 — `docs/local/TEST-ACCOUNTS.local.md`**
>
> 이 문서가 모든 검증·테스트용 자격증명의 **단일 출처(SSOT)**이다.
> 브라우저 검증(Playwright / MCP / Claude Code / 수동 smoke test) 전 반드시 이 문서를 참조한다.

**원칙:**
- 로컬/검증 환경 전용 — 실제 운영 계정 사용 금지
- Git commit 금지 (`.gitignore`로 추적 제외)
- 서비스별·역할별 테스트 계정 중앙 관리
- 계정 변경(비밀번호/역할/조직) 시 로컬 문서만 업데이트
- **자격증명 하드코딩 금지** — 시드 스크립트·테스트 코드·CI 어디에도 이 문서의 비밀번호를 박지 말 것. 발견 시 즉시 제거.

---

*Updated: 2026-05-07*
*Version: 8.10*
*Status: Active Constitution*
