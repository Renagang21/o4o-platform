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
- ✅ Cloud Run 내부 / Admin API / Google Cloud Console
- ❌ 로컬 psql / 로컬 scripts — **절대 금지** (방화벽 차단)

**마이그레이션:** main 배포 → CI/CD 자동 실행 (권장) | 긴급 시 Admin API 또는 Cloud Console SQL Editor

> 📄 상세: `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md`

---

## 1. 개발 기본 규칙

### 브랜치 전략

`main`(프로덕션) / `develop`(통합) / `feature/*`(모든 기능 개발 필수)
- develop 직접 개발 금지. 모든 작업은 `feature/*`에서 시작

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
- 모든 주문은 `checkoutService.createOrder()`
- 독립 주문 테이블 생성 금지
- 3중 방어: 런타임 Guard + OrderType 계약 + 스키마 검사

> 📄 상세: `docs/architecture/O4O-STORE-RULES.md`

---

## 6. 인프라 (GCP Cloud Run)

| 서비스 | 역할 |
|--------|------|
| `o4o-core-api` | API 서버 |
| `neture-web` | 네처 메인 |
| `glycopharm-web` | 글라이코팜 |
| `glucoseview-web` | 글루코스뷰 |
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
| 브라우저 자동화 (Playwright 등) | ⚠️ | 로컬 환경에서만, 명시적 WO 승인 필요 |

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
| **Design Core** | 모든 신규 화면은 Design Core v1.0, 독자적 디자인 시스템 금지 | `docs/rules/design-core-governance.md` |

---

## 10. KPA Society 구조

> 📄 기준: `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`

3개 서비스 공존: **커뮤니티**(유지) / **분회 서비스**(유지) / **데모**(제거 예정)

- 라우트 위치 ≠ 서비스 소속 (Forum은 커뮤니티 서비스의 기능)
- Account와 Service Membership 분리 원칙

---

## 11. 플랫폼 개발 참조

Content / LMS / Signage / CMS / Extension 개발 시 선행 참조:

| 영역 | 문서 |
|------|------|
| Content Core | `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` |
| LMS Core | `docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md` |
| Navigation | `docs/platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md` |
| Extension | `docs/platform/extensions/EXTENSION-GENERAL-GUIDE.md` |

핵심: Content 단일 출처 / Core 불변 / 데이터 소유권 분리 / 이벤트 기반 통신

---

## 12. APP 표준화 (Baseline Lock)

모든 APP = `@o4o/types/{app}` + `{App}QueryService` + 표준 UI 패턴

| APP | 상태 |
|-----|------|
| APP-CONTENT | Frozen |
| APP-SIGNAGE | Frozen |
| APP-FORUM | Frozen |

서비스 코드는 QueryService 호출 + 설정만. Raw SQL/중복 로직/서비스별 UI 분기 금지.

---

## 13. Frozen Baselines

모든 Freeze 항목 공통: **버그 수정·성능 개선·문서·테스트는 허용. 구조 변경은 명시적 WO 필수.**

| # | 대상 | Freeze 일자 | 상세 문서 |
|---|------|-----------|----------|
| F1 | **Operator OS** — security-core, hub-core, ai-core, action-log-core, asset-copy-core, operator-ux-core, admin-ux-core | 2026-02-16 | `docs/baseline/BASELINE-OPERATOR-OS-V1.md` |
| F2 | **KPA UX** — 3개 서비스 영역 5-Block/4-Block 통합 UX | 2026-02-17 | `docs/baseline/KPA_UX_BASELINE_V1.md` |
| F3 | **Store Layer** — store-ui-core, store-asset-policy-core, store-core, asset-copy-core, hub-core 의존 방향 | 2026-02-22 | `docs/architecture/STORE-LAYER-ARCHITECTURE.md` |
| F4 | **Platform Content Policy** — HUB 3축 모델 (Producer/Visibility/ServiceScope) | 2026-02-23 | `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` |
| F5 | **Content Stable** — HUB 콘텐츠 타입·매핑·병합 로직·API 계약 | 2026-02-23 | `docs/baseline/CONTENT-STABLE-DECLARATION-V1.md` |
| F6 | **Boundary Policy** — Domain Boundary Matrix + Guard Rules 5개 | 2026-02-24 | `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` |
| F7 | **Neture Partner Contract** — 계약 테이블·ENUM·트랜잭션·Commission 불변 | 2026-02-24 | `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` |
| F8 | **Neture Distribution Engine** — Distribution Tier 3단계·SERVICE 상태 머신·Checkout Guard 3계층·Listing 캐스케이드 | 2026-02-27 | `docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` |
| F9 | **RBAC SSOT** — role_assignments 단일 소스, users.role/roles/user_roles 제거, write-path 통일 | 2026-02-27 | `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` |

---

## 상세 규칙 문서 목록

| 영역 | 문서 |
|------|------|
| Cosmetics 도메인 | `docs/architecture/COSMETICS-DOMAIN-RULES.md` |
| Business 서비스 | `docs/architecture/BUSINESS-SERVICE-RULES.md` |
| O4O Store/Order | `docs/architecture/O4O-STORE-RULES.md` |
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
| KPA UX Baseline | `docs/baseline/KPA_UX_BASELINE_V1.md` |
| Store Layer Architecture | `docs/architecture/STORE-LAYER-ARCHITECTURE.md` |
| Platform Content Policy | `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` |
| Content Stable | `docs/baseline/CONTENT-STABLE-DECLARATION-V1.md` |
| Boundary Policy | `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` |
| Neture Partner Contract | `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` |
| Design Core | `docs/rules/design-core-governance.md` |
| Production Migration | `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` |
| Channel Execution Console | `docs/baseline/CHANNEL-EXECUTION-CONSOLE-V1.md` |
| Channel Creation Flow | `docs/baseline/CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1.md` |
| Neture Distribution Engine | `docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` |
| RBAC Freeze Declaration | `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` |
| RBAC Runbook | `docs/rbac/RBAC-RUNBOOK-V1.md` |
| RBAC Role Catalog | `docs/rbac/RBAC-ROLE-CATALOG-V1.md` |

---

*Updated: 2026-02-27*
*Version: 6.4*
*Status: Active Constitution*
